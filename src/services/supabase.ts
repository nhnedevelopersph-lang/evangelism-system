import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Profile } from '../types';

// Read from Vite environment variables or localStorage override
const getSupabaseConfig = () => {
  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('zcmc_supabase_url') : null;
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem('zcmc_supabase_key') : null;

  const url = storedUrl || (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const key = storedKey || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  return { url, key, isConfigured: Boolean(url && key) };
};

export const { url: SUPABASE_URL, key: SUPABASE_ANON_KEY, isConfigured: IS_SUPABASE_CONFIGURED } = getSupabaseConfig();

let clientInstance: SupabaseClient | null = null;

if (IS_SUPABASE_CONFIGURED) {
  try {
    clientInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
  }
}

export const supabase = clientInstance;

export const saveSupabaseCredentials = (url: string, key: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('zcmc_supabase_url', url);
    localStorage.setItem('zcmc_supabase_key', key);
    window.location.reload();
  }
};

export const clearSupabaseCredentials = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('zcmc_supabase_url');
    localStorage.removeItem('zcmc_supabase_key');
    window.location.reload();
  }
};

/**
 * Direct Supabase Upsert for Members matching on serial_number.
 * Upserts to 'members' table (and mirrors to 'profiles' if configured).
 */
export async function upsertMembersToSupabase(members: Profile[]): Promise<{
  success: boolean;
  insertedCount: number;
  error?: string;
}> {
  if (!supabase || !IS_SUPABASE_CONFIGURED) {
    return {
      success: true,
      insertedCount: members.length,
    };
  }

  try {
    // Format payload with exact columns: serial_number, name, department, section, area, region, ban, duty, role
    const payload = members.map((m) => ({
      serial_number: m.serial_number,
      referral_code: m.referral_code,
      name: m.name,
      department: m.department || 'Evangelism Dept',
      section: m.section || 'Section Alpha',
      area: m.area || 'Manila',
      region: m.region || 'NCR & Luzon',
      ban: m.ban || 'Ban 1',
      duty: m.duty || 'Evangelism Worker',
      team_leader: m.team_leader || 'Leader Timothy',
      role: Array.isArray(m.role) ? m.role : [m.role || 'Member'],
      must_change_password: m.must_change_password !== undefined ? m.must_change_password : true,
      phone: m.phone || null,
      email: m.email || null,
      updated_at: new Date().toISOString(),
    }));

    // 1. Primary Upsert on 'members' table matching on serial_number
    let primarySuccess = false;
    let primaryError: any = null;

    try {
      const { data, error } = await supabase
        .from('members')
        .upsert(payload, { onConflict: 'serial_number' })
        .select('id, serial_number');

      if (!error) {
        primarySuccess = true;
      } else {
        primaryError = error;
      }
    } catch (e: any) {
      primaryError = e;
    }

    // 2. Secondary fallback/mirror on 'profiles' table if available
    try {
      await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'serial_number' });
    } catch (_) {
      // Non-blocking mirror
    }

    if (!primarySuccess && primaryError) {
      console.warn('Supabase members upsert returned error (falling back to store):', primaryError.message);
      return {
        success: false,
        insertedCount: 0,
        error: primaryError.message || 'Supabase upsert encountered an error.',
      };
    }

    return {
      success: true,
      insertedCount: members.length,
    };
  } catch (err: any) {
    console.error('Error during Supabase upsert:', err);
    return {
      success: false,
      insertedCount: 0,
      error: err.message || 'Network or Supabase error during upsert',
    };
  }
}

/**
 * Fetches all members from Supabase ('members' or 'profiles' table)
 */
export async function fetchMembersFromSupabase(): Promise<Profile[] | null> {
  if (!supabase || !IS_SUPABASE_CONFIGURED) return null;

  try {
    // Try 'members' first
    let { data, error } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false });

    // Fallback to 'profiles' if 'members' table not found
    if (error || !data) {
      const profileRes = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!profileRes.error && profileRes.data) {
        data = profileRes.data;
      } else {
        return null;
      }
    }

    return (data || []).map((row: any) => ({
      id: row.id || `u-${row.serial_number}`,
      serial_number: row.serial_number,
      referral_code: row.referral_code,
      name: row.name,
      department: row.department || 'Evangelism Dept',
      area: row.area || 'Manila',
      region: row.region || 'NCR & Luzon',
      duty: row.duty || 'Evangelism Worker',
      section: row.section || 'Section Alpha',
      team_leader: row.team_leader || 'Leader Timothy',
      ban: row.ban || 'Ban 1',
      role: Array.isArray(row.role) ? row.role : [row.role || 'Member'],
      must_change_password: Boolean(row.must_change_password),
      phone: row.phone || undefined,
      email: row.email || undefined,
      created_at: row.created_at || new Date().toISOString(),
    }));
  } catch (err) {
    console.warn('Could not fetch members from Supabase:', err);
    return null;
  }
}

/**
 * Subscribes to Supabase Realtime changes on 'members' (and 'profiles') table
 */
export function subscribeToMembersRealtime(
  onUpsert: (member: Profile) => void,
  onDelete?: (id: string) => void
): () => void {
  if (!supabase || !IS_SUPABASE_CONFIGURED) {
    return () => {};
  }

  try {
    const channel = supabase
      .channel('public:members_realtime_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'members' },
        (payload: any) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new;
            if (row && row.serial_number) {
              const mapped: Profile = {
                id: row.id || `u-${row.serial_number}`,
                serial_number: row.serial_number,
                referral_code: row.referral_code,
                name: row.name,
                department: row.department || 'Evangelism Dept',
                area: row.area || 'Manila',
                region: row.region || 'NCR & Luzon',
                duty: row.duty || 'Evangelism Worker',
                section: row.section || 'Section Alpha',
                team_leader: row.team_leader || 'Leader Timothy',
                ban: row.ban || 'Ban 1',
                role: Array.isArray(row.role) ? row.role : [row.role || 'Member'],
                must_change_password: Boolean(row.must_change_password),
                phone: row.phone || undefined,
                email: row.email || undefined,
                created_at: row.created_at || new Date().toISOString(),
              };
              onUpsert(mapped);
            }
          } else if (payload.eventType === 'DELETE' && onDelete) {
            onDelete(payload.old?.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Realtime subscription failed:', err);
    return () => {};
  }
}
