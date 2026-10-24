import {
  Profile,
  Prospect,
  BBLesson,
  ProspectLevel,
  ProgramType,
  UserRole,
  PipelineSummary,
  FollowUpLog,
  MemberImportBatch,
  CsvMemberRow,
  AUTHORIZED_REGISTRATION_ROLES,
  ALL_APPROVED_ROLES,
  AccountCsvRow,
  StatusHistoryLog,
} from '../types';
import { SEED_PROFILES, SEED_PROSPECTS, SEED_BB_LESSONS, DROPPING_REASONS } from '../data/constants';
import { generateNextAreaReferralCode } from '../utils/areaCodeGenerator';
import {
  supabase,
  IS_SUPABASE_CONFIGURED,
  upsertMembersToSupabase,
  fetchMembersFromSupabase,
  subscribeToMembersRealtime
} from './supabase';

export function isAuthorizedToManageAccounts(user: Profile | null): boolean {
  if (!user || !user.role || !Array.isArray(user.role)) return false;
  return user.role.some((r) => AUTHORIZED_REGISTRATION_ROLES.includes(r));
}

const STORAGE_KEYS = {
  CURRENT_USER: 'zcmc_current_user_v2',
  PROFILES: 'zcmc_profiles_v2',
  PROSPECTS: 'zcmc_prospects_v2',
  BB_LESSONS: 'zcmc_lessons_v2',
  FOLLOW_UPS: 'zcmc_follow_ups_v2',
  MEMBER_IMPORTS: 'zcmc_member_imports_v2',
  CREDENTIALS: 'zcmc_auth_credentials_v2',
  STATUS_HISTORY: 'zcmc_status_history_v2',
};

export interface UserCredential {
  username: string;
  passwordHash: string;
  profileId: string;
}

export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`zcmc_secure_auth_v2:${password}`);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (_) {
      // Fallback below
    }
  }
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    hash = (hash << 5) - hash + password.charCodeAt(i);
    hash |= 0;
  }
  return `h_${Math.abs(hash)}`;
}

// Safe localStorage helper
const getStored = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error(`Error reading ${key} from storage:`, e);
    return defaultValue;
  }
};

const setStored = <T>(key: string, value: T): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving ${key} to storage:`, e);
  }
};

export class Store {
  private static instance: Store;
  private profiles: Profile[] = [];
  private prospects: Prospect[] = [];
  private bbLessons: BBLesson[] = [];
  private followUps: FollowUpLog[] = [];
  private memberImports: MemberImportBatch[] = [];
  private credentials: Record<string, UserCredential> = {};
  private statusHistory: StatusHistoryLog[] = [];
  private currentUser: Profile | null = null;
  private listeners: Array<() => void> = [];

  private constructor() {
    this.init();
  }

  public static getInstance(): Store {
    if (!Store.instance) {
      Store.instance = new Store();
    }
    return Store.instance;
  }

  private init() {
    this.profiles = getStored<Profile[]>(STORAGE_KEYS.PROFILES, SEED_PROFILES);
    this.prospects = getStored<Prospect[]>(STORAGE_KEYS.PROSPECTS, SEED_PROSPECTS);
    this.bbLessons = getStored<BBLesson[]>(STORAGE_KEYS.BB_LESSONS, SEED_BB_LESSONS);
    this.followUps = getStored<FollowUpLog[]>(STORAGE_KEYS.FOLLOW_UPS, []);
    this.memberImports = getStored<MemberImportBatch[]>(STORAGE_KEYS.MEMBER_IMPORTS, []);
    this.credentials = getStored<Record<string, UserCredential>>(STORAGE_KEYS.CREDENTIALS, {});
    this.statusHistory = getStored<StatusHistoryLog[]>(STORAGE_KEYS.STATUS_HISTORY, []);

    // Seed default credentials (including developer testing credentials and all serial numbers)
    this.seedCredentials();

    // Set initial user if none
    const savedUser = getStored<Profile | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (savedUser) {
      const live = this.profiles.find((p) => p.id === savedUser.id);
      this.currentUser = live || savedUser;
    } else {
      this.currentUser = null;
    }

    // Connect to Supabase & Realtime if configured
    if (IS_SUPABASE_CONFIGURED) {
      fetchMembersFromSupabase().then((remoteMembers) => {
        if (remoteMembers && remoteMembers.length > 0) {
          remoteMembers.forEach((rm) => this.syncMemberFromExternal(rm, false));
          this.notify();
        }
      });

      subscribeToMembersRealtime(
        (member) => {
          this.syncMemberFromExternal(member, true);
        },
        (deletedId) => {
          if (deletedId) {
            this.profiles = this.profiles.filter((p) => p.id !== deletedId);
            this.notify();
          }
        }
      );
    }
  }

  public async seedCredentials(): Promise<void> {
    let changed = false;

    // Developer testing credentials: username useradmin, password useradmin43
    if (!this.credentials['useradmin']) {
      this.credentials['useradmin'] = {
        username: 'useradmin',
        passwordHash: await hashPassword('useradmin43'),
        profileId: 'u-super-admin-00361228',
      };
      changed = true;
    }

    // Super Admin Serial Number mapping: 00361228-01771
    if (!this.credentials['00361228-01771']) {
      this.credentials['00361228-01771'] = {
        username: '00361228-01771',
        passwordHash: await hashPassword('useradmin43'),
        profileId: 'u-super-admin-00361228',
      };
      changed = true;
    }

    const defaultSeedHash = await hashPassword('dobetter123');

    // Seed each profile's unique Serial Number as primary username
    for (const p of this.profiles) {
      const serialKey = p.serial_number.toLowerCase().trim();
      if (!this.credentials[serialKey]) {
        this.credentials[serialKey] = {
          username: serialKey,
          passwordHash: defaultSeedHash,
          profileId: p.id,
        };
        changed = true;
      }

      if (p.username) {
        const userKey = p.username.toLowerCase().trim();
        if (!this.credentials[userKey]) {
          this.credentials[userKey] = {
            username: userKey,
            passwordHash: defaultSeedHash,
            profileId: p.id,
          };
          changed = true;
        }
      }
    }

    if (changed) {
      setStored(STORAGE_KEYS.CREDENTIALS, this.credentials);
    }
  }

  public syncMemberFromExternal(member: Profile, notifyImmediately = true): void {
    const existingIndex = this.profiles.findIndex(
      (p) => p.serial_number.toLowerCase().trim() === member.serial_number.toLowerCase().trim()
    );

    if (existingIndex !== -1) {
      this.profiles[existingIndex] = {
        ...this.profiles[existingIndex],
        ...member,
      };
    } else {
      this.profiles.unshift(member);
    }

    if (
      this.currentUser &&
      this.currentUser.serial_number.toLowerCase().trim() === member.serial_number.toLowerCase().trim()
    ) {
      this.currentUser = { ...this.currentUser, ...member };
    }

    if (notifyImmediately) {
      this.notify();
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    setStored(STORAGE_KEYS.PROFILES, this.profiles);
    setStored(STORAGE_KEYS.PROSPECTS, this.prospects);
    setStored(STORAGE_KEYS.BB_LESSONS, this.bbLessons);
    setStored(STORAGE_KEYS.FOLLOW_UPS, this.followUps);
    setStored(STORAGE_KEYS.MEMBER_IMPORTS, this.memberImports);
    setStored(STORAGE_KEYS.CREDENTIALS, this.credentials);
    setStored(STORAGE_KEYS.STATUS_HISTORY, this.statusHistory);
    if (this.currentUser) {
      setStored(STORAGE_KEYS.CURRENT_USER, this.currentUser);
    }
    this.listeners.forEach((fn) => fn());
  }

  // ---------------------------------------------------------------------------
  // AUTHENTICATION & PROFILES
  // ---------------------------------------------------------------------------
  public getCurrentUser(): Profile | null {
    return this.currentUser;
  }

  public setCurrentUser(user: Profile | null) {
    this.currentUser = user;
    if (user) {
      setStored(STORAGE_KEYS.CURRENT_USER, user);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
    this.notify();
  }

  public getAllProfiles(): Profile[] {
    return [...this.profiles];
  }

  public getAllReferralCodes(): string[] {
    const set = new Set<string>();
    this.profiles.forEach((p) => {
      if (p.referral_code) set.add(p.referral_code.toUpperCase());
      if (p.serial_number) set.add(p.serial_number.toUpperCase());
    });
    return Array.from(set);
  }

  public getBBTeachers(): Profile[] {
    return this.profiles.filter(
      (p) =>
        Boolean(p.has_bb_teacher_permission) ||
        p.role.includes('BB Teacher' as UserRole) ||
        p.role.includes('BB Gyo-gwan') ||
        p.role.includes('Super Admin') ||
        p.role.includes('Admin') ||
        p.department.toLowerCase().includes('education') ||
        p.duty.toLowerCase().includes('teacher') ||
        p.duty.toLowerCase().includes('gyo-gwan')
    );
  }

  public getProfileBySerialNumber(sn: string): Profile | undefined {
    if (!sn) return undefined;
    return this.profiles.find((p) => p.serial_number.toLowerCase().trim() === sn.toLowerCase().trim());
  }

  /**
   * Resolves a referral code (or serial number fallback) to the member record
   */
  public getProfileByReferralCode(code: string): Profile | undefined {
    if (!code) return undefined;
    const clean = code.trim().toLowerCase();
    return this.profiles.find(
      (p) =>
        (p.referral_code && p.referral_code.toLowerCase() === clean) ||
        (p.serial_number && p.serial_number.toLowerCase() === clean)
    );
  }

  public getProfileById(id?: string | null): Profile | undefined {
    if (!id) return undefined;
    return this.profiles.find((p) => p.id === id);
  }

  /**
   * Explicit credential-based authentication using Serial Number (or username).
   * Validates strictly against stored credential hashes.
   * If a user is on initial default password, accepts 'dobetter123' and prompts first-login change.
   */
  public async login(
    usernameAttempt: string,
    passwordAttempt: string
  ): Promise<{ success: boolean; message?: string; user?: Profile }> {
    const cleanInput = (usernameAttempt || '').trim().toLowerCase();
    const cleanPassword = passwordAttempt || '';

    if (!cleanInput || !cleanPassword) {
      return { success: false, message: 'Invalid Serial Number or password.' };
    }

    // Resolve profile by Serial Number or username
    let profile = this.profiles.find(
      (p) =>
        p.serial_number.toLowerCase().trim() === cleanInput ||
        (p.username && p.username.toLowerCase().trim() === cleanInput)
    );

    // Look for credential under cleanInput, or profile's serial_number, or profile's username
    let cred = this.credentials[cleanInput];
    if (!cred && profile) {
      cred =
        this.credentials[profile.serial_number.toLowerCase().trim()] ||
        (profile.username ? this.credentials[profile.username.toLowerCase().trim()] : undefined);
    }

    if (!cred) {
      await this.seedCredentials();
      cred = this.credentials[cleanInput];
      if (!cred && profile) {
        cred =
          this.credentials[profile.serial_number.toLowerCase().trim()] ||
          (profile.username ? this.credentials[profile.username.toLowerCase().trim()] : undefined);
      }
    }

    const attemptHash = await hashPassword(cleanPassword);

    // Check if this user is a member on initial default temporary password 'dobetter123'
    if (profile && profile.must_change_password) {
      const defaultHash = await hashPassword('dobetter123');
      if (attemptHash === defaultHash) {
        this.setCurrentUser(profile);
        return { success: true, user: profile };
      }
    }

    // Validate against stored credential hash
    if (cred && attemptHash === cred.passwordHash) {
      const liveProfile = profile || this.profiles.find((p) => p.id === cred!.profileId);
      if (liveProfile) {
        this.setCurrentUser(liveProfile);
        return { success: true, user: liveProfile };
      }
    }

    return { success: false, message: 'Invalid Serial Number or password.' };
  }

  public loginWithCredentials = this.login.bind(this);

  /**
   * Forgot / Reset Password Workflow with verification against registered record
   */
  public async resetPasswordWithVerification(
    serialNumber: string,
    contactVerification: string,
    newPassword: string
  ): Promise<{ success: boolean; message?: string }> {
    const cleanSerial = serialNumber.trim().toLowerCase();
    const cleanContact = contactVerification.trim().toLowerCase().replace(/\D/g, '');

    const profile = this.profiles.find(
      (p) =>
        p.serial_number.toLowerCase().trim() === cleanSerial ||
        (p.username && p.username.toLowerCase().trim() === cleanSerial)
    );

    if (!profile) {
      return { success: false, message: 'No member found matching this Serial Number.' };
    }

    // Verify contact (phone or email)
    const phoneNorm = (profile.phone || '').replace(/\D/g, '');
    const emailNorm = (profile.email || '').toLowerCase().trim();
    const contactInputRaw = contactVerification.trim().toLowerCase();

    const matchesPhone = phoneNorm.length > 5 && phoneNorm.includes(cleanContact);
    const matchesEmail = emailNorm.length > 3 && emailNorm === contactInputRaw;

    if (!matchesPhone && !matchesEmail) {
      return {
        success: false,
        message: 'Verification failed: Contact number or email does not match our records for this Serial Number.',
      };
    }

    if (newPassword.length < 6) {
      return { success: false, message: 'New password must be at least 6 characters long.' };
    }

    const newHash = await hashPassword(newPassword);
    const key = (profile.username || profile.serial_number).toLowerCase().trim();
    this.credentials[key] = {
      username: key,
      passwordHash: newHash,
      profileId: profile.id,
    };
    this.credentials[profile.serial_number.toLowerCase().trim()] = this.credentials[key];

    // Remove must_change_password
    const idx = this.profiles.findIndex((p) => p.id === profile.id);
    if (idx !== -1) {
      this.profiles[idx] = {
        ...this.profiles[idx],
        must_change_password: false,
      };
    }

    setStored(STORAGE_KEYS.CREDENTIALS, this.credentials);
    setStored(STORAGE_KEYS.PROFILES, this.profiles);
    this.notify();

    return { success: true, message: 'Password has been successfully reset! You can now log in.' };
  }

  public logout(): void {
    this.currentUser = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
    this.notify();
  }

  public async updatePassword(
    userId: string,
    newPassword: string,
    currentPasswordAttempt?: string
  ): Promise<{ success: boolean; message?: string }> {
    const index = this.profiles.findIndex((p) => p.id === userId);
    if (index === -1) {
      return { success: false, message: 'User profile not found.' };
    }

    // Find credential for this user
    let userCredKey: string | undefined;
    for (const uname in this.credentials) {
      if (this.credentials[uname].profileId === userId) {
        userCredKey = uname;
        break;
      }
    }

    if (currentPasswordAttempt && userCredKey) {
      const currentHash = await hashPassword(currentPasswordAttempt);
      if (this.credentials[userCredKey].passwordHash !== currentHash) {
        return { success: false, message: 'Current password is incorrect.' };
      }
    }

    const newHash = await hashPassword(newPassword);
    if (userCredKey) {
      this.credentials[userCredKey].passwordHash = newHash;
    } else {
      const profile = this.profiles[index];
      const uname = (profile.username || `user_${profile.serial_number}`).toLowerCase();
      this.credentials[uname] = {
        username: uname,
        passwordHash: newHash,
        profileId: userId,
      };
    }

    this.profiles[index] = {
      ...this.profiles[index],
      must_change_password: false,
    };

    if (this.currentUser && this.currentUser.id === userId) {
      this.currentUser = this.profiles[index];
    }

    this.notify();
    return { success: true };
  }

  public canManageAccounts(user?: Profile | null): boolean {
    return isAuthorizedToManageAccounts(user !== undefined ? user : this.currentUser);
  }

  /**
   * Internal Account Registration
   * - Restricted to Super Admin, Admin, Regional Leader, Area Leader, Area Somu
   * - Serial Number is the generated username
   * - Default password: 'dobetter123' (hashed via hashPassword)
   * - must_change_password = true
   * - Validates Serial Number uniqueness (no duplicates)
   * - Validates at least 1 role
   */
  public async registerLeaderOrMemberAccount(
    data: {
      serial_number: string;
      name: string;
      department?: string;
      area?: string;
      region?: string;
      duty?: string;
      section?: string;
      ban?: string;
      team_leader?: string;
      role: UserRole[];
      has_bb_teacher_permission?: boolean;
    },
    actor?: Profile | null
  ): Promise<{ success: boolean; profile?: Profile; error?: string }> {
    const actingUser = actor !== undefined ? actor : this.currentUser;
    if (!this.canManageAccounts(actingUser)) {
      return {
        success: false,
        error: 'Unauthorized: Only Super Admin, Admin, Regional Leader, Area Leader, and Area Somu may register accounts.',
      };
    }

    const cleanSerial = (data.serial_number || '').trim();
    if (!cleanSerial) {
      return { success: false, error: 'Serial Number is required.' };
    }

    const cleanName = (data.name || '').trim();
    if (!cleanName) {
      return { success: false, error: 'Full Name is required.' };
    }

    if (!data.role || !Array.isArray(data.role) || data.role.length === 0) {
      return { success: false, error: 'Access Based on Role is required (at least 1 role).' };
    }

    // Validate Serial Number uniqueness
    const lowerSerial = cleanSerial.toLowerCase();
    const existing = this.profiles.find(
      (p) => p.serial_number.toLowerCase().trim() === lowerSerial
    );
    if (existing) {
      return {
        success: false,
        error: 'An account with this Serial Number already exists.',
      };
    }

    const existingCodes = this.getAllReferralCodes();
    const area = (data.area || '').trim() || 'Manila';
    const generatedRefCode = generateNextAreaReferralCode(area, existingCodes);

    const newProfile: Profile = {
      id: `u-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      username: cleanSerial,
      serial_number: cleanSerial,
      referral_code: generatedRefCode,
      name: cleanName,
      department: (data.department || '').trim(),
      area,
      region: (data.region || '').trim(),
      duty: (data.duty || '').trim(),
      section: (data.section || '').trim(),
      ban: (data.ban || '').trim(),
      team_leader: (data.team_leader || '').trim(),
      role: [...data.role],
      has_bb_teacher_permission: Boolean(data.has_bb_teacher_permission),
      is_active: true,
      must_change_password: true,
      created_at: new Date().toISOString(),
    };

    // Generate credentials with username = Serial Number and password = dobetter123
    const cleanUsername = cleanSerial.toLowerCase();
    const passwordHash = await hashPassword('dobetter123');
    this.credentials[cleanUsername] = {
      username: cleanUsername,
      passwordHash,
      profileId: newProfile.id,
    };
    setStored(STORAGE_KEYS.CREDENTIALS, this.credentials);

    this.profiles.unshift(newProfile);
    setStored(STORAGE_KEYS.PROFILES, this.profiles);

    if (IS_SUPABASE_CONFIGURED) {
      upsertMembersToSupabase([newProfile]).catch((err) =>
        console.error('Failed to sync new member account to Supabase:', err)
      );
    }

    this.notify();
    return { success: true, profile: newProfile };
  }

  public toggleBBTeacherPermission(profileId: string): { success: boolean; message?: string } {
    if (!this.canManageAccounts()) {
      return { success: false, message: 'Permission denied: Only authorized administrators can manage BB Teacher permissions.' };
    }
    const idx = this.profiles.findIndex((p) => p.id === profileId);
    if (idx === -1) return { success: false, message: 'Member profile not found.' };

    const current = this.profiles[idx];
    const newVal = !current.has_bb_teacher_permission;
    this.profiles[idx] = {
      ...current,
      has_bb_teacher_permission: newVal,
    };
    setStored(STORAGE_KEYS.PROFILES, this.profiles);
    this.notify();

    if (IS_SUPABASE_CONFIGURED) {
      upsertMembersToSupabase([this.profiles[idx]]).catch((err) =>
        console.error('Failed to sync BB Teacher permission update to Supabase:', err)
      );
    }

    return {
      success: true,
      message: `BB Teacher permission ${newVal ? 'granted to' : 'revoked from'} ${current.name}.`,
    };
  }

  public updateMemberProfile(
    profileId: string,
    updates: Partial<Pick<Profile, 'name' | 'department' | 'section' | 'area' | 'region' | 'ban' | 'duty' | 'team_leader' | 'role' | 'has_bb_teacher_permission' | 'is_active'>>
  ): { success: boolean; message?: string } {
    if (!this.canManageAccounts()) {
      return { success: false, message: 'Permission denied: Only authorized administrators can update member accounts.' };
    }
    const idx = this.profiles.findIndex((p) => p.id === profileId);
    if (idx === -1) return { success: false, message: 'Member profile not found.' };

    this.profiles[idx] = {
      ...this.profiles[idx],
      ...updates,
    };
    setStored(STORAGE_KEYS.PROFILES, this.profiles);
    this.notify();

    if (IS_SUPABASE_CONFIGURED) {
      upsertMembersToSupabase([this.profiles[idx]]).catch((err) =>
        console.error('Failed to sync member profile update to Supabase:', err)
      );
    }

    return { success: true, message: 'Member details successfully updated.' };
  }

  /**
   * Bulk Account Registration & Updating through CSV
   * - Restricted to authorized roles
   * - New accounts: username = Serial Number, default password = 'dobetter123', must_change_password = true
   * - Existing accounts: update member/profile info and roles; do NOT reset password or must_change_password!
   */
  public async bulkImportAccountsAsync(
    rows: AccountCsvRow[],
    actor?: Profile | null
  ): Promise<{
    success: boolean;
    insertedCount: number;
    updatedCount: number;
    failedCount: number;
    summary: string;
    error?: string;
  }> {
    const actingUser = actor !== undefined ? actor : this.currentUser;
    if (!this.canManageAccounts(actingUser)) {
      return {
        success: false,
        insertedCount: 0,
        updatedCount: 0,
        failedCount: rows.length,
        summary: 'Unauthorized',
        error: 'Unauthorized: Only Super Admin, Admin, Regional Leader, Area Leader, and Area Somu may perform bulk import.',
      };
    }

    let insertedCount = 0;
    let updatedCount = 0;
    let failedCount = 0;
    const profilesToUpsert: Profile[] = [];
    const defaultPasswordHash = await hashPassword('dobetter123');

    for (const row of rows) {
      if (row.status === 'error' || !row.serialNumber || !row.fullName || row.roles.length === 0) {
        failedCount++;
        continue;
      }

      const lowerSerial = row.serialNumber.trim().toLowerCase();
      const existingIndex = this.profiles.findIndex(
        (p) => p.serial_number.toLowerCase().trim() === lowerSerial
      );

      if (existingIndex !== -1) {
        // UPDATE existing account
        const existing = this.profiles[existingIndex];
        const updatedProfile: Profile = {
          ...existing,
          name: row.fullName.trim(),
          department: row.department.trim() || existing.department,
          area: row.area.trim() || existing.area,
          region: row.region.trim() || existing.region,
          duty: row.duty.trim() || existing.duty,
          section: row.section.trim() || existing.section,
          ban: row.ban.trim() || existing.ban,
          team_leader: row.teamLeader.trim() || existing.team_leader,
          role: [...row.roles],
          // CRITICAL: Do NOT reset password, password hash, or must_change_password for existing accounts!
        };
        this.profiles[existingIndex] = updatedProfile;
        profilesToUpsert.push(updatedProfile);
        updatedCount++;
      } else {
        // CREATE NEW account
        const existingCodes = this.getAllReferralCodes();
        const area = row.area.trim() || 'Manila';
        const generatedRefCode = generateNextAreaReferralCode(area, existingCodes);

        const newProfile: Profile = {
          id: `u-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          username: row.serialNumber.trim(),
          serial_number: row.serialNumber.trim(),
          referral_code: generatedRefCode,
          name: row.fullName.trim(),
          department: row.department.trim(),
          area,
          region: row.region.trim(),
          duty: row.duty.trim(),
          section: row.section.trim(),
          ban: row.ban.trim(),
          team_leader: row.teamLeader.trim(),
          role: [...row.roles],
          must_change_password: true,
          created_at: new Date().toISOString(),
        };

        // Create credential with username = Serial Number, password = default43
        this.credentials[lowerSerial] = {
          username: lowerSerial,
          passwordHash: defaultPasswordHash,
          profileId: newProfile.id,
        };

        this.profiles.unshift(newProfile);
        profilesToUpsert.push(newProfile);
        insertedCount++;
      }
    }

    setStored(STORAGE_KEYS.PROFILES, this.profiles);
    setStored(STORAGE_KEYS.CREDENTIALS, this.credentials);

    // Record import batch history
    const batchRecord: MemberImportBatch = {
      id: `batch-${Date.now()}`,
      filename: `Bulk Account Import (${new Date().toLocaleDateString()})`,
      imported_count: insertedCount + updatedCount,
      imported_by_id: actingUser?.id || 'admin',
      imported_by_name: actingUser?.name || 'Administrator',
      area_summary: {},
      created_at: new Date().toISOString(),
    };
    this.memberImports.unshift(batchRecord);
    setStored(STORAGE_KEYS.MEMBER_IMPORTS, this.memberImports);

    if (IS_SUPABASE_CONFIGURED && profilesToUpsert.length > 0) {
      upsertMembersToSupabase(profilesToUpsert).catch((err) =>
        console.error('Supabase bulk upsert error:', err)
      );
    }

    this.notify();

    return {
      success: true,
      insertedCount,
      updatedCount,
      failedCount,
      summary: `Processed: ${insertedCount} new accounts created, ${updatedCount} existing accounts updated, ${failedCount} errors.`,
    };
  }

  public addNewProfile(profileData: Omit<Profile, 'id' | 'created_at'>): Profile {
    const cleanSerial = (profileData.serial_number || '').trim();
    const existing = this.profiles.find(
      (p) => p.serial_number.toLowerCase().trim() === cleanSerial.toLowerCase()
    );
    if (existing) {
      throw new Error('An account with this Serial Number already exists.');
    }

    const newProfile: Profile = {
      ...profileData,
      id: `u-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      username: profileData.username || cleanSerial,
      must_change_password: true,
      created_at: new Date().toISOString(),
    };
    this.profiles.unshift(newProfile);

    // Register initial credential with clean username and dobetter123
    const uname = (newProfile.username || cleanSerial).toLowerCase().trim();
    hashPassword('dobetter123').then((hash) => {
      this.credentials[uname] = {
        username: uname,
        passwordHash: hash,
        profileId: newProfile.id,
      };
      // Also map serial number
      this.credentials[cleanSerial.toLowerCase()] = this.credentials[uname];
      setStored(STORAGE_KEYS.CREDENTIALS, this.credentials);
    });

    setStored(STORAGE_KEYS.PROFILES, this.profiles);
    this.notify();
    return newProfile;
  }

  // ---------------------------------------------------------------------------
  // CSV MEMBER IMPORT UTILITY (UPSERT ON SERIAL_NUMBER)
  // ---------------------------------------------------------------------------
  public async importMembersFromCsvAsync(batch: {
    filename: string;
    rows: CsvMemberRow[];
    importedBy: Profile;
    areaSummary: Record<string, number>;
  }): Promise<{
    count: number;
    insertedCount: number;
    updatedCount: number;
    importedProfiles: Profile[];
    supabaseSynced: boolean;
    error?: string;
  }> {
    const processedProfiles: Profile[] = [];
    let insertedCount = 0;
    let updatedCount = 0;

    batch.rows.forEach((row) => {
      const targetSerial = (row.serial_number || `SN-${row.generated_referral_code}`).trim();
      const existingIndex = this.profiles.findIndex(
        (p) => p.serial_number.toLowerCase().trim() === targetSerial.toLowerCase()
      );

      if (existingIndex !== -1) {
        // Upsert existing member
        const existing = this.profiles[existingIndex];
        const updatedProf: Profile = {
          ...existing,
          name: row.name,
          department: row.department || existing.department || 'Evangelism Dept',
          section: row.section || existing.section || 'Section Alpha',
          area: row.area || existing.area || 'Manila',
          region: row.region || existing.region || 'NCR & Luzon',
          ban: row.ban || existing.ban || 'Ban 1',
          duty: row.duty || existing.duty || 'Evangelism Worker',
          role: [(row.role as UserRole) || existing.role[0] || 'Member'],
          must_change_password: true,
          phone: row.contact_number || existing.phone,
          email: row.email || existing.email,
        };
        this.profiles[existingIndex] = updatedProf;
        processedProfiles.push(updatedProf);
        updatedCount++;
      } else {
        // Insert new member with generated referral code
        const newProf: Profile = {
          id: `u-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          serial_number: targetSerial,
          referral_code: row.generated_referral_code || `AREA-${Date.now()}`,
          name: row.name,
          department: row.department || 'Evangelism Dept',
          section: row.section || 'Section Alpha',
          area: row.area || 'Manila',
          region: row.region || 'NCR & Luzon',
          ban: row.ban || 'Ban 1',
          duty: row.duty || 'Evangelism Worker',
          team_leader: row.team_leader || 'Leader Timothy',
          role: [(row.role as UserRole) || 'Member'],
          must_change_password: true,
          phone: row.contact_number,
          email: row.email,
          created_at: new Date().toISOString(),
        };
        this.profiles.unshift(newProf);
        processedProfiles.push(newProf);
        insertedCount++;
      }
    });

    const batchRecord: MemberImportBatch = {
      id: `imp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      filename: batch.filename,
      imported_count: processedProfiles.length,
      imported_by_id: batch.importedBy.id,
      imported_by_name: batch.importedBy.name,
      area_summary: batch.areaSummary,
      created_at: new Date().toISOString(),
    };

    this.memberImports.unshift(batchRecord);
    
    // Immediately notify all UI subscribers so changes reflect without manual page refresh
    this.notify();

    // Direct Supabase upsert
    let supabaseSynced = false;
    let syncError: string | undefined;

    if (IS_SUPABASE_CONFIGURED) {
      const res = await upsertMembersToSupabase(processedProfiles);
      supabaseSynced = res.success;
      syncError = res.error;

      if (supabase) {
        supabase
          .from('member_imports')
          .insert({
            filename: batchRecord.filename,
            imported_count: batchRecord.imported_count,
            imported_by: batchRecord.imported_by_id,
            area_summary: batchRecord.area_summary,
          })
          .then(() => {});
      }
    }

    return {
      count: processedProfiles.length,
      insertedCount,
      updatedCount,
      importedProfiles: processedProfiles,
      supabaseSynced,
      error: syncError,
    };
  }

  public importMembersFromCsv(batch: {
    filename: string;
    rows: CsvMemberRow[];
    importedBy: Profile;
    areaSummary: Record<string, number>;
  }): { count: number; importedProfiles: Profile[] } {
    const processedProfiles: Profile[] = [];
    batch.rows.forEach((row) => {
      const targetSerial = (row.serial_number || `SN-${row.generated_referral_code}`).trim();
      const existingIndex = this.profiles.findIndex(
        (p) => p.serial_number.toLowerCase().trim() === targetSerial.toLowerCase()
      );
      if (existingIndex !== -1) {
        const existing = this.profiles[existingIndex];
        const updatedProf: Profile = {
          ...existing,
          name: row.name,
          department: row.department || existing.department || 'Evangelism Dept',
          section: row.section || existing.section || 'Section Alpha',
          area: row.area || existing.area || 'Manila',
          region: row.region || existing.region || 'NCR & Luzon',
          ban: row.ban || existing.ban || 'Ban 1',
          duty: row.duty || existing.duty || 'Evangelism Worker',
          role: [(row.role as UserRole) || existing.role[0] || 'Member'],
          must_change_password: true,
          phone: row.contact_number || existing.phone,
          email: row.email || existing.email,
        };
        this.profiles[existingIndex] = updatedProf;
        processedProfiles.push(updatedProf);
      } else {
        const newProf: Profile = {
          id: `u-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          serial_number: targetSerial,
          referral_code: row.generated_referral_code || `AREA-${Date.now()}`,
          name: row.name,
          department: row.department || 'Evangelism Dept',
          section: row.section || 'Section Alpha',
          area: row.area || 'Manila',
          region: row.region || 'NCR & Luzon',
          ban: row.ban || 'Ban 1',
          duty: row.duty || 'Evangelism Worker',
          team_leader: row.team_leader || 'Leader Timothy',
          role: [(row.role as UserRole) || 'Member'],
          must_change_password: true,
          phone: row.contact_number,
          email: row.email,
          created_at: new Date().toISOString(),
        };
        this.profiles.unshift(newProf);
        processedProfiles.push(newProf);
      }
    });

    const batchRecord: MemberImportBatch = {
      id: `imp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      filename: batch.filename,
      imported_count: processedProfiles.length,
      imported_by_id: batch.importedBy.id,
      imported_by_name: batch.importedBy.name,
      area_summary: batch.areaSummary,
      created_at: new Date().toISOString(),
    };
    this.memberImports.unshift(batchRecord);
    this.notify();

    if (IS_SUPABASE_CONFIGURED) {
      upsertMembersToSupabase(processedProfiles);
    }

    return { count: processedProfiles.length, importedProfiles: processedProfiles };
  }

  public getMemberImports(): MemberImportBatch[] {
    return [...this.memberImports];
  }

  // ---------------------------------------------------------------------------
  // ROLE VISIBILITY & PERMISSIONS
  // ---------------------------------------------------------------------------
  public hasAnyRole(roles: UserRole[]): boolean {
    if (!this.currentUser) return false;
    return this.currentUser.role.some((r) => roles.includes(r));
  }

  public isSuperAdminOrAdmin(): boolean {
    return this.hasAnyRole(['Super Admin', 'Admin']);
  }

  public isAreaLeaderOrAbove(): boolean {
    return this.hasAnyRole(['Super Admin', 'Admin', 'Regional Leader', 'Area Leader']);
  }

  public isSectionLeaderOrAbove(): boolean {
    return (
      this.isSuperAdminOrAdmin() ||
      this.hasAnyRole([
        'Regional Leader',
        'Area Leader',
        'Area Somu',
        'Gwajang',
        'Somu',
        'Banjang',
        'Jeondo Gyo-gwan',
        'BB Gyo-gwan',
        'Department TJN',
        'Section Leader',
      ])
    );
  }

  public canUpgradeToBBHapdang(): boolean {
    return this.isSectionLeaderOrAbove();
  }

  public canUpgradeToTtagi(): boolean {
    if (!this.currentUser) return false;
    const roles = this.currentUser.role;
    const isOnlySectionOrMember = roles.every((r) => r === 'Section Leader' || r === 'Member');
    return !isOnlySectionOrMember;
  }

  public canApproveCenter(): boolean {
    return this.hasAnyRole(['Super Admin', 'Admin', 'Area Leader']);
  }

  public canUpdateLesson(prospect: Prospect): boolean {
    if (!this.currentUser) return false;
    if (this.isSuperAdminOrAdmin()) return true;
    return prospect.assigned_bb_teacher_id === this.currentUser.id;
  }

  public canCallOrTextProspect(prospect: Prospect): boolean {
    if (!this.currentUser) return false;
    if (this.isSuperAdminOrAdmin()) return true;
    if (prospect.referred_by_member_id === this.currentUser.id) return true;
    if (this.hasAnyRole(['Section Leader'])) {
      const referrer = this.getProfileById(prospect.referred_by_member_id);
      if (referrer && referrer.section === this.currentUser.section && referrer.area === this.currentUser.area) {
        return true;
      }
    }
    if (this.hasAnyRole(['Area Leader', 'Regional Leader', 'Banjang', 'Gwajang', 'Somu'])) {
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // FILTERING PROSPECTS AND MEMBERS BY ROLE SCOPE
  // ---------------------------------------------------------------------------
  public getVisibleProspects(startDate?: Date | null, endDate?: Date | null, includeDeleted = false): Prospect[] {
    const user = this.currentUser;
    if (!user) return [];

    let list = this.prospects;
    if (!includeDeleted) {
      list = list.filter((p) => !p.is_deleted);
    }

    if (startDate) {
      const startMs = startDate.getTime();
      list = list.filter((p) => new Date(p.created_at).getTime() >= startMs);
    }
    if (endDate) {
      const endMs = endDate.getTime();
      list = list.filter((p) => new Date(p.created_at).getTime() <= endMs);
    }

    if (user.role.includes('Super Admin') || user.role.includes('Admin')) {
      return list;
    }

    if (user.role.includes('Regional Leader')) {
      return list.filter((p) => {
        const ref = this.getProfileById(p.referred_by_member_id);
        const inRegion = ref && ref.region === user.region;
        const isAssigned = p.assigned_bb_teacher_id === user.id;
        return inRegion || isAssigned;
      });
    }

    const isAreaLevelRole = user.role.some((r) =>
      ['Area Leader', 'Area Somu', 'Gwajang', 'Somu', 'Jeondo Gyo-gwan', 'BB Gyo-gwan'].includes(r)
    );
    if (isAreaLevelRole) {
      return list.filter((p) => {
        const ref = this.getProfileById(p.referred_by_member_id);
        const isRefArea = ref && (ref.area === user.area || ref.region === user.region);
        const isAssignedTeacher = p.assigned_bb_teacher_id === user.id;
        return isRefArea || isAssignedTeacher;
      });
    }

    if (user.role.includes('Banjang')) {
      return list.filter((p) => {
        const ref = this.getProfileById(p.referred_by_member_id);
        const isBan = ref && ref.ban === user.ban && ref.area === user.area;
        const isAssignedTeacher = p.assigned_bb_teacher_id === user.id;
        return isBan || isAssignedTeacher;
      });
    }

    if (user.role.includes('Department TJN')) {
      return list.filter((p) => {
        const ref = this.getProfileById(p.referred_by_member_id);
        const isDept = ref && ref.department === user.department;
        const isAssignedTeacher = p.assigned_bb_teacher_id === user.id;
        return isDept || isAssignedTeacher;
      });
    }

    if (user.role.includes('Section Leader')) {
      return list.filter((p) => {
        const ref = this.getProfileById(p.referred_by_member_id);
        const isSec = ref && ref.section === user.section && ref.area === user.area;
        const isAssignedTeacher = p.assigned_bb_teacher_id === user.id;
        return isSec || isAssignedTeacher;
      });
    }

    // Member: attributed personal referrals or assigned students
    return list.filter(
      (p) => p.referred_by_member_id === user.id || p.assigned_bb_teacher_id === user.id
    );
  }

  /**
   * Scope-filtered members list respecting role jurisdictions
   */
  public getVisibleMembers(): Profile[] {
    const user = this.currentUser;
    if (!user) return [];

    if (this.isSuperAdminOrAdmin()) {
      return [...this.profiles];
    }

    if (user.role.includes('Regional Leader')) {
      return this.profiles.filter((p) => p.region === user.region);
    }

    const isAreaLevelRole = user.role.some((r) =>
      ['Area Leader', 'Area Somu', 'Gwajang', 'Somu', 'Jeondo Gyo-gwan', 'BB Gyo-gwan'].includes(r)
    );
    if (isAreaLevelRole) {
      return this.profiles.filter((p) => p.area === user.area || p.region === user.region);
    }

    if (user.role.includes('Banjang')) {
      return this.profiles.filter((p) => p.ban === user.ban && p.area === user.area);
    }

    if (user.role.includes('Department TJN')) {
      return this.profiles.filter((p) => p.department === user.department);
    }

    if (user.role.includes('Section Leader')) {
      return this.profiles.filter((p) => p.section === user.section && p.area === user.area);
    }

    // Member: only self
    return this.profiles.filter((p) => p.id === user.id);
  }

  public getProspectsReferredBy(memberId: string): Prospect[] {
    return this.prospects.filter((p) => p.referred_by_member_id === memberId && !p.is_deleted);
  }

  public getPipelineSummary(startDate?: Date | null, endDate?: Date | null): PipelineSummary {
    const visible = this.getVisibleProspects(startDate, endDate);

    const counts: PipelineSummary = {
      chatgi: 0,
      bb_hapdang: 0,
      ttagi: 0,
      soebweh: 0,
      bb: 0,
      center_hapdang: 0,
      center: 0,
      bb_dropped: 0,
      total: visible.length,
    };

    visible.forEach((p) => {
      switch (p.prospect_level) {
        case 'Chatgi':
          counts.chatgi++;
          break;
        case 'BB Hapdang':
          counts.bb_hapdang++;
          break;
        case 'Ttagi':
          counts.ttagi++;
          break;
        case 'Soebweh':
          counts.soebweh++;
          break;
        case 'BB':
          counts.bb++;
          break;
        case 'Center Hapdang':
          counts.center_hapdang++;
          break;
        case 'Center':
          counts.center++;
          break;
        case 'BB Dropped':
          counts.bb_dropped++;
          break;
      }
    });

    return counts;
  }

  /**
   * Calculate referral counts across all 7 stages + Dropped for a specific member
   */
  public getMemberReferralCounts(memberId: string): PipelineSummary {
    const referred = this.prospects.filter(
      (p) => p.referred_by_member_id === memberId && !p.is_deleted
    );

    const counts: PipelineSummary = {
      chatgi: 0,
      bb_hapdang: 0,
      ttagi: 0,
      soebweh: 0,
      bb: 0,
      center_hapdang: 0,
      center: 0,
      bb_dropped: 0,
      total: referred.length,
    };

    referred.forEach((p) => {
      switch (p.prospect_level) {
        case 'Chatgi':
          counts.chatgi++;
          break;
        case 'BB Hapdang':
          counts.bb_hapdang++;
          break;
        case 'Ttagi':
          counts.ttagi++;
          break;
        case 'Soebweh':
          counts.soebweh++;
          break;
        case 'BB':
          counts.bb++;
          break;
        case 'Center Hapdang':
          counts.center_hapdang++;
          break;
        case 'Center':
          counts.center++;
          break;
        case 'BB Dropped':
          counts.bb_dropped++;
          break;
      }
    });

    return counts;
  }

  // ---------------------------------------------------------------------------
  // PUBLIC REGISTRATION WITH AREA REFERRAL TRACKING
  // ---------------------------------------------------------------------------
  public registerPublicProspect(data: {
    name: string;
    contact_number: string;
    email?: string;
    gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
    province: string;
    city: string;
    ref_code?: string;
  }): { prospect: Prospect; isDuplicate: boolean } {
    let referrer: Profile | undefined;
    let remarks: string | undefined;

    const trimmedCode = data.ref_code?.trim();
    if (trimmedCode) {
      referrer =
        this.getProfileByReferralCode(trimmedCode) ||
        this.getProfileBySerialNumber(trimmedCode);
      if (!referrer) {
        throw new Error('Registration link is invalid or no longer available.');
      }
      remarks = `Referred by ${referrer.name} (${referrer.referral_code || referrer.serial_number})`;
    }

    // Duplicate Detection: Validate by normalized contact phone number
    const normalizedInputPhone = data.contact_number.replace(/\D/g, '');
    const existing = this.prospects.find((p) => {
      const pPhone = p.contact_number.replace(/\D/g, '');
      return pPhone.length >= 7 && pPhone === normalizedInputPhone;
    });

    if (existing) {
      // Preserve original record and referral attribution without modification
      return { prospect: existing, isDuplicate: true };
    }

    // If valid referral code provided, attribute to member; otherwise set to null (Unassigned / Direct Registration)
    const finalReferrerId = referrer ? referrer.id : null;
    const finalRemarks = remarks || 'Direct Registration (Unassigned)';

    const newProspect: Prospect = {
      id: `p-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      created_at: new Date().toISOString(),
      name: data.name.trim(),
      contact_number: data.contact_number.trim(),
      email: data.email?.trim() || undefined,
      gender: data.gender,
      province: data.province.trim(),
      city: data.city.trim(),
      referred_by_member_id: finalReferrerId,
      prospect_level: 'Chatgi',
      meeting_remarks: finalRemarks,
      updated_at: new Date().toISOString(),
    };

    this.prospects.unshift(newProspect);
    this.notify();

    if (supabase && IS_SUPABASE_CONFIGURED) {
      supabase.from('prospects').insert({
        name: newProspect.name,
        contact_number: newProspect.contact_number,
        email: newProspect.email,
        gender: newProspect.gender,
        province: newProspect.province,
        city: newProspect.city,
        referred_by_member_id: newProspect.referred_by_member_id,
        prospect_level: 'Chatgi',
        meeting_remarks: newProspect.meeting_remarks,
      }).then((res) => {
        if (res.error) console.error('Supabase prospect insert error:', res.error);
      });
    }

    return { prospect: newProspect, isDuplicate: false };
  }

  /**
   * Generates CSV containing all member links for distribution by leadership
   */
  public exportMemberLinksCsv(originUrl?: string): string {
    const baseUrl =
      originUrl ||
      (typeof window !== 'undefined' ? window.location.origin : 'https://zionchristianmissioncenter.org');

    const headers = [
      'Name',
      'Serial Number',
      'Area',
      'Region',
      'Department',
      'Duty',
      'Role',
      'Referral Code',
      'Unique Registration Link',
    ];

    const rows = this.profiles.map((p) => {
      const code = p.referral_code || p.serial_number;
      const link = `${baseUrl}/register/${code}`;
      return [
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.serial_number}"`,
        `"${p.area}"`,
        `"${p.region}"`,
        `"${p.department}"`,
        `"${p.duty}"`,
        `"${p.role.join(', ')}"`,
        `"${code}"`,
        `"${link}"`,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Safely clears all test prospect records while preserving imported member profiles
   */
  public clearTestProspects(): { removedCount: number } {
    const count = this.prospects.length;
    this.prospects = [];
    this.bbLessons = [];
    this.followUps = [];
    this.notify();
    return { removedCount: count };
  }

  // ---------------------------------------------------------------------------
  // PIPELINE TRANSITIONS & AUDIT HISTORY
  // ---------------------------------------------------------------------------
  public recordStatusHistory(
    prospectId: string,
    fromLevel: ProspectLevel,
    toLevel: ProspectLevel,
    remarks?: string
  ): void {
    const log: StatusHistoryLog = {
      id: `sh-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      prospect_id: prospectId,
      from_level: fromLevel,
      to_level: toLevel,
      changed_by_id: this.currentUser?.id || 'system',
      changed_by_name: this.currentUser?.name || 'System / Auto',
      remarks,
      timestamp: new Date().toISOString(),
    };
    this.statusHistory.unshift(log);
    setStored(STORAGE_KEYS.STATUS_HISTORY, this.statusHistory);
  }

  public getStatusHistoryForProspect(prospectId: string): StatusHistoryLog[] {
    return this.statusHistory.filter((sh) => sh.prospect_id === prospectId);
  }

  public upgradeToBBHapdang(
    prospectId: string,
    nextSchedule: string,
    meetingRemarks?: string
  ): { success: boolean; message?: string } {
    if (!this.canUpgradeToBBHapdang()) {
      return {
        success: false,
        message: 'Permission denied: Only Section Leaders and above can upgrade a prospect to BB Hapdang.',
      };
    }

    const idx = this.prospects.findIndex((p) => p.id === prospectId);
    if (idx === -1) return { success: false, message: 'Prospect not found.' };

    const previous = this.prospects[idx].prospect_level;
    this.prospects[idx] = {
      ...this.prospects[idx],
      prospect_level: 'BB Hapdang',
      next_meeting_schedule: nextSchedule,
      meeting_remarks: meetingRemarks || this.prospects[idx].meeting_remarks,
      upgraded_by_id: this.currentUser?.id,
      upgraded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.recordStatusHistory(
      prospectId,
      previous,
      'BB Hapdang',
      `Upgraded to BB Hapdang by ${this.currentUser?.name || 'Authorized Leader'}.`
    );

    this.notify();
    return { success: true };
  }

  public upgradeToTtagi(
    prospectId: string,
    meetingRemarks: string,
    nextMeetingSchedule: string,
    assignedBBTeacherId: string,
    meetingMode?: 'Online' | 'Onsite'
  ): { success: boolean; message?: string } {
    if (!this.canUpgradeToTtagi()) {
      return {
        success: false,
        message: 'Permission denied: Section Leaders and Members cannot upgrade directly to Ttagi.',
      };
    }

    if (!meetingRemarks.trim()) {
      return { success: false, message: 'Meeting remarks from introductory study are required.' };
    }
    if (!nextMeetingSchedule) {
      return { success: false, message: 'Next meeting date and time is required.' };
    }
    if (!assignedBBTeacherId) {
      return { success: false, message: 'An assigned BB Teacher is required.' };
    }

    const idx = this.prospects.findIndex((p) => p.id === prospectId);
    if (idx === -1) return { success: false, message: 'Prospect not found.' };

    const previous = this.prospects[idx].prospect_level;
    const teacher = this.getProfileById(assignedBBTeacherId);

    this.prospects[idx] = {
      ...this.prospects[idx],
      prospect_level: 'Ttagi',
      meeting_remarks: meetingRemarks.trim(),
      next_meeting_schedule: nextMeetingSchedule,
      meeting_mode: meetingMode || 'Online',
      assigned_bb_teacher_id: assignedBBTeacherId,
      upgraded_by_id: this.currentUser?.id,
      upgraded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.recordStatusHistory(
      prospectId,
      previous,
      'Ttagi',
      `Upgraded to Ttagi by ${this.currentUser?.name}. Teacher: ${teacher ? teacher.name : assignedBBTeacherId}. Mode: ${meetingMode || 'Online'}.`
    );

    this.notify();
    return { success: true };
  }

  public getLessonsForProspect(prospectId: string): BBLesson[] {
    return this.bbLessons
      .filter((l) => l.prospect_id === prospectId)
      .sort((a, b) => new Date(a.date_completed).getTime() - new Date(b.date_completed).getTime());
  }

  public recordBBLesson(
    prospectId: string,
    lessonTitle: string,
    dateCompleted: string,
    notesOrOptions?:
      | string
      | {
          mode?: 'Online' | 'Onsite';
          method?: '1-on-1' | 'Group';
          notes?: string;
          assignedTeacherId?: string;
        }
  ): { success: boolean; message?: string } {
    const prospect = this.prospects.find((p) => p.id === prospectId);
    if (!prospect) return { success: false, message: 'Student record not found.' };

    if (!this.canUpdateLesson(prospect)) {
      return {
        success: false,
        message: 'Permission denied: Only the Assigned BB Teacher (or Super Admin) can add or edit lessons for this student.',
      };
    }

    const cleanTitle = (lessonTitle || '').trim();
    if (!cleanTitle) {
      return { success: false, message: 'Lesson title is required.' };
    }
    if (!dateCompleted) {
      return { success: false, message: 'Completion date is required.' };
    }

    // Duplicate Prevention: Check if this lesson title has already been recorded for this student
    const existing = this.bbLessons.find(
      (l) =>
        l.prospect_id === prospectId &&
        l.lesson_title.toLowerCase().trim() === cleanTitle.toLowerCase()
    );
    if (existing) {
      return {
        success: false,
        message: `Lesson "${cleanTitle}" has already been completed and recorded for this student.`,
      };
    }

    const options = typeof notesOrOptions === 'string' ? { notes: notesOrOptions } : notesOrOptions;
    const assignedTeacher = options?.assignedTeacherId || prospect.assigned_bb_teacher_id || this.currentUser?.id;

    const newLesson: BBLesson = {
      id: `l-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      prospect_id: prospectId,
      lesson_title: cleanTitle,
      date_completed: dateCompleted,
      mode: options?.mode || (prospect.program === 'Onsite' ? 'Onsite' : 'Online'),
      method: options?.method || '1-on-1',
      assigned_teacher_id: assignedTeacher,
      updated_by: this.currentUser?.id || 'system',
      notes: options?.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.bbLessons.push(newLesson);
    this.recalculateProspectLevel(prospectId);
    this.notify();

    if (IS_SUPABASE_CONFIGURED && supabase) {
      supabase.from('bb_lessons').insert({
        prospect_id: newLesson.prospect_id,
        lesson_title: newLesson.lesson_title,
        date_completed: newLesson.date_completed,
        updated_by: newLesson.updated_by,
        notes: newLesson.notes,
      }).then(() => {});
    }

    return { success: true };
  }

  public deleteBBLesson(lessonId: string): boolean {
    const lesson = this.bbLessons.find((l) => l.id === lessonId);
    if (!lesson) return false;

    const prospect = this.prospects.find((p) => p.id === lesson.prospect_id);
    if (prospect && !this.canUpdateLesson(prospect)) {
      return false;
    }

    this.bbLessons = this.bbLessons.filter((l) => l.id !== lessonId);
    if (prospect) {
      this.recalculateProspectLevel(prospect.id);
    }
    this.notify();
    return true;
  }

  public setCenterRegistrationCompleted(
    prospectId: string,
    completed: boolean,
    verificationInfo?: string
  ): boolean {
    const idx = this.prospects.findIndex((p) => p.id === prospectId);
    if (idx === -1) return false;

    this.prospects[idx] = {
      ...this.prospects[idx],
      center_registration_completed: completed,
      center_form_completed_at: completed ? new Date().toISOString() : undefined,
      center_form_verification: verificationInfo || (completed ? 'Form verified' : undefined),
      updated_at: new Date().toISOString(),
    };

    this.recalculateProspectLevel(prospectId);
    this.notify();
    return true;
  }

  private recalculateProspectLevel(prospectId: string) {
    const idx = this.prospects.findIndex((p) => p.id === prospectId);
    if (idx === -1) return;

    const current = this.prospects[idx];
    if (current.prospect_level === 'BB Dropped' || current.prospect_level === 'Center') {
      return;
    }

    const lessons = this.getLessonsForProspect(prospectId);
    const count = lessons.length;

    let newLevel: ProspectLevel = current.prospect_level;

    // Center Hapdang requires at least 10 lessons AND verified Center Registration Form completion
    if (count >= 10 && current.center_registration_completed) {
      newLevel = 'Center Hapdang';
    } else if (count >= 3) {
      newLevel = 'BB';
    } else if (count >= 1) {
      newLevel = 'Soebweh';
    }

    if (newLevel !== current.prospect_level) {
      const from = current.prospect_level;
      this.prospects[idx] = {
        ...current,
        prospect_level: newLevel,
        updated_at: new Date().toISOString(),
      };
      this.recordStatusHistory(
        prospectId,
        from,
        newLevel,
        `Automatic progression based on lesson milestones (${count} lessons completed${current.center_registration_completed ? ', Form submitted' : ''}).`
      );
    }
  }

  public approveCenter(
    prospectId: string,
    learningMode?: ProgramType,
    registrationMonth?: string
  ): { success: boolean; message?: string } {
    if (!this.canApproveCenter()) {
      return {
        success: false,
        message: 'Permission denied: Only the Area Leader (or Super Admin/Admin) can approve students for Center.',
      };
    }

    const idx = this.prospects.findIndex((p) => p.id === prospectId);
    if (idx === -1) return { success: false, message: 'Prospect not found.' };

    const previous = this.prospects[idx].prospect_level;
    const now = new Date();
    const defaultMonth =
      registrationMonth || now.toLocaleDateString([], { month: 'long', year: 'numeric' });

    this.prospects[idx] = {
      ...this.prospects[idx],
      prospect_level: 'Center',
      program: learningMode || this.prospects[idx].program || 'Onsite',
      center_registration_month: defaultMonth,
      center_approved_by: this.currentUser?.id,
      center_approved_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    this.recordStatusHistory(
      prospectId,
      previous,
      'Center',
      `Approved for Center by Area Leader ${this.currentUser?.name} (${defaultMonth}, ${learningMode || 'Onsite'})`
    );

    this.notify();
    return { success: true };
  }

  public dropProspect(
    prospectId: string,
    droppingReason: string,
    remarks?: string
  ): { success: boolean; message?: string } {
    const idx = this.prospects.findIndex((p) => p.id === prospectId);
    if (idx === -1) return { success: false, message: 'Prospect not found.' };

    if (!DROPPING_REASONS.includes(droppingReason)) {
      return { success: false, message: 'Invalid dropping reason selected.' };
    }

    const current = this.prospects[idx];
    const previous = current.prospect_level;

    this.prospects[idx] = {
      ...current,
      previous_stage: previous !== 'BB Dropped' ? previous : current.previous_stage || 'Chatgi',
      prospect_level: 'BB Dropped',
      dropping_reason: droppingReason,
      dropped_by_id: this.currentUser?.id,
      dropped_at: new Date().toISOString(),
      meeting_remarks: remarks || current.meeting_remarks,
      updated_at: new Date().toISOString(),
    };

    this.recordStatusHistory(
      prospectId,
      previous,
      'BB Dropped',
      `Marked dropped by ${this.currentUser?.name || 'Leader'}. Reason: ${droppingReason}. Remarks: ${remarks || 'None'}`
    );

    this.notify();
    return { success: true };
  }

  public restoreProspect(prospectId: string, targetLevel: ProspectLevel = 'Chatgi'): boolean {
    const idx = this.prospects.findIndex((p) => p.id === prospectId);
    if (idx === -1) return false;

    const previous = this.prospects[idx].prospect_level;
    const restoredStage = this.prospects[idx].previous_stage || targetLevel;

    this.prospects[idx] = {
      ...this.prospects[idx],
      prospect_level: restoredStage,
      dropping_reason: undefined,
      updated_at: new Date().toISOString(),
    };

    this.recordStatusHistory(
      prospectId,
      previous,
      restoredStage,
      `Restored by ${this.currentUser?.name || 'Leader'} back to active pipeline (${restoredStage}).`
    );

    this.recalculateProspectLevel(prospectId);
    this.notify();
    return true;
  }

  /**
   * Soft Delete for Super Admin
   */
  public softDeleteProspect(prospectId: string): { success: boolean; message?: string } {
    if (!this.isSuperAdminOrAdmin()) {
      return { success: false, message: 'Permission denied: Only Super Admin can soft-delete student records.' };
    }
    const idx = this.prospects.findIndex((p) => p.id === prospectId);
    if (idx === -1) return { success: false, message: 'Student record not found.' };

    this.prospects[idx] = {
      ...this.prospects[idx],
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: this.currentUser?.id,
      updated_at: new Date().toISOString(),
    };

    this.recordStatusHistory(
      prospectId,
      this.prospects[idx].prospect_level,
      this.prospects[idx].prospect_level,
      `Soft-deleted by Super Admin ${this.currentUser?.name}`
    );

    this.notify();
    return { success: true };
  }

  public restoreDeletedProspect(prospectId: string): { success: boolean; message?: string } {
    if (!this.isSuperAdminOrAdmin()) {
      return { success: false, message: 'Permission denied: Only Super Admin can restore deleted records.' };
    }
    const idx = this.prospects.findIndex((p) => p.id === prospectId);
    if (idx === -1) return { success: false, message: 'Student record not found.' };

    this.prospects[idx] = {
      ...this.prospects[idx],
      is_deleted: false,
      deleted_at: undefined,
      deleted_by: undefined,
      updated_at: new Date().toISOString(),
    };

    this.notify();
    return { success: true };
  }

  /**
   * Export authorized student records to CSV
   */
  public exportAuthorizedStudentsCsv(startDate?: Date | null, endDate?: Date | null): string {
    const list = this.getVisibleProspects(startDate, endDate);
    const headers = [
      'Student ID',
      'Full Name',
      'Contact Number',
      'Email',
      'Gender',
      'Province',
      'City',
      'Current Stage',
      'Program Mode',
      'Registration Date',
      'Referring Member (Guide)',
      'Guide Serial Number',
      'Guide Area',
      'Guide Region',
      'Assigned BB Teacher',
      'Completed Lessons Count',
      'Center Reg Form Done',
      'Center Approval Month',
      'Dropping Reason',
      'Meeting Remarks',
    ];

    const rows = list.map((p) => {
      const ref = this.getProfileById(p.referred_by_member_id);
      const teacher = p.assigned_bb_teacher_id ? this.getProfileById(p.assigned_bb_teacher_id) : null;
      const lessons = this.getLessonsForProspect(p.id);

      return [
        `"${p.id}"`,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.contact_number}"`,
        `"${p.email || ''}"`,
        `"${p.gender || ''}"`,
        `"${p.province || ''}"`,
        `"${p.city || ''}"`,
        `"${p.prospect_level}"`,
        `"${p.program || ''}"`,
        `"${new Date(p.created_at).toISOString()}"`,
        `"${ref ? ref.name.replace(/"/g, '""') : 'Direct / Unassigned'}"`,
        `"${ref ? ref.serial_number : ''}"`,
        `"${ref ? ref.area : ''}"`,
        `"${ref ? ref.region : ''}"`,
        `"${teacher ? teacher.name.replace(/"/g, '""') : 'Unassigned'}"`,
        `"${lessons.length}"`,
        `"${p.center_registration_completed ? 'Yes' : 'No'}"`,
        `"${p.center_registration_month || ''}"`,
        `"${p.dropping_reason || ''}"`,
        `"${(p.meeting_remarks || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Update member roles and permissions (Admin management)
   */
  public updateMemberRolesAndPermissions(
    memberId: string,
    updates: {
      role?: UserRole[];
      has_bb_teacher_permission?: boolean;
      is_active?: boolean;
      department?: string;
      area?: string;
      region?: string;
      section?: string;
      ban?: string;
      duty?: string;
    }
  ): { success: boolean; message?: string } {
    if (!this.canManageAccounts()) {
      return {
        success: false,
        message: 'Permission denied: Only authorized administrators may update member assignments.',
      };
    }

    const idx = this.profiles.findIndex((p) => p.id === memberId);
    if (idx === -1) return { success: false, message: 'Member not found.' };

    this.profiles[idx] = {
      ...this.profiles[idx],
      ...updates,
      role: updates.role || this.profiles[idx].role,
      has_bb_teacher_permission:
        updates.has_bb_teacher_permission !== undefined
          ? updates.has_bb_teacher_permission
          : this.profiles[idx].has_bb_teacher_permission,
      is_active: updates.is_active !== undefined ? updates.is_active : this.profiles[idx].is_active,
    };

    setStored(STORAGE_KEYS.PROFILES, this.profiles);
    if (this.currentUser?.id === memberId) {
      this.currentUser = this.profiles[idx];
    }
    this.notify();

    if (IS_SUPABASE_CONFIGURED && supabase) {
      upsertMembersToSupabase([this.profiles[idx]]).catch(() => {});
    }

    return { success: true };
  }

  public getFollowUpsForProspect(prospectId: string): FollowUpLog[] {
    return this.followUps
      .filter((f) => f.prospect_id === prospectId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public addFollowUpLog(prospectId: string, type: 'call' | 'sms' | 'meeting' | 'note', notes: string): FollowUpLog {
    const log: FollowUpLog = {
      id: `fu-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      prospect_id: prospectId,
      performed_by_id: this.currentUser?.id || 'unknown',
      type,
      notes: notes.trim(),
      created_at: new Date().toISOString(),
    };
    this.followUps.unshift(log);
    this.notify();
    return log;
  }

  public resetToSeeds() {
    this.profiles = [...SEED_PROFILES];
    this.prospects = [...SEED_PROSPECTS];
    this.bbLessons = [...SEED_BB_LESSONS];
    this.followUps = [];
    this.memberImports = [];
    this.statusHistory = [];
    this.currentUser = this.profiles[0];
    this.notify();
  }
}

export const appStore = Store.getInstance();
