import { useState, useEffect, useCallback } from 'react';
import { Profile } from '../types';
import { appStore } from '../services/store';
import {
  fetchMembersFromSupabase,
  subscribeToMembersRealtime,
  IS_SUPABASE_CONFIGURED,
} from '../services/supabase';

export interface UseMembersResult {
  members: Profile[];
  loading: boolean;
  error: string | null;
  refreshMembers: () => Promise<void>;
  isRealtimeActive: boolean;
  isSupabaseConfigured: boolean;
}

/**
 * Custom data-fetching hook that retrieves members from Supabase,
 * binds directly to appStore state, and listens to Supabase Realtime
 * subscriptions so updates reflect across the system immediately without manual refresh.
 */
export function useMembers(): UseMembersResult {
  const [members, setMembers] = useState<Profile[]>(appStore.getAllProfiles());
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(IS_SUPABASE_CONFIGURED);

  // Manual re-fetch function
  const refreshMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (IS_SUPABASE_CONFIGURED) {
        const remoteMembers = await fetchMembersFromSupabase();
        if (remoteMembers && remoteMembers.length > 0) {
          remoteMembers.forEach((rm) => {
            appStore.syncMemberFromExternal(rm, false);
          });
        }
      }
      setMembers([...appStore.getAllProfiles()]);
    } catch (err: any) {
      console.error('Failed to refresh members:', err);
      setError(err.message || 'Failed to fetch members.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. Subscribe to local in-memory store changes (CSV imports, edits, password updates)
    const unsubscribeStore = appStore.subscribe(() => {
      setMembers([...appStore.getAllProfiles()]);
    });

    // 2. Initial fetch if Supabase is configured
    if (IS_SUPABASE_CONFIGURED) {
      refreshMembers();

      // 3. Enable Supabase Realtime subscriptions on the 'members' table
      const unsubscribeRealtime = subscribeToMembersRealtime(
        (updatedMember) => {
          appStore.syncMemberFromExternal(updatedMember, true);
          setMembers([...appStore.getAllProfiles()]);
        },
        (deletedId) => {
          if (deletedId) {
            refreshMembers();
          }
        }
      );

      setIsRealtimeActive(true);

      return () => {
        unsubscribeStore();
        unsubscribeRealtime();
      };
    }

    return () => {
      unsubscribeStore();
    };
  }, [refreshMembers]);

  return {
    members,
    loading,
    error,
    refreshMembers,
    isRealtimeActive,
    isSupabaseConfigured: IS_SUPABASE_CONFIGURED,
  };
}
