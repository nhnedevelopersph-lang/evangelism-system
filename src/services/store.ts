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
} from '../types';
import { SEED_PROFILES, SEED_PROSPECTS, SEED_BB_LESSONS } from '../data/constants';
import {
  supabase,
  IS_SUPABASE_CONFIGURED,
  upsertMembersToSupabase,
  fetchMembersFromSupabase,
  subscribeToMembersRealtime
} from './supabase';

const STORAGE_KEYS = {
  CURRENT_USER: 'zcmc_current_user_v2',
  PROFILES: 'zcmc_profiles_v2',
  PROSPECTS: 'zcmc_prospects_v2',
  BB_LESSONS: 'zcmc_lessons_v2',
  FOLLOW_UPS: 'zcmc_follow_ups_v2',
  MEMBER_IMPORTS: 'zcmc_member_imports_v2',
};

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

    // Set initial user if none
    const savedUser = getStored<Profile | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (savedUser) {
      const live = this.profiles.find((p) => p.id === savedUser.id);
      this.currentUser = live || savedUser;
    } else {
      this.currentUser = this.profiles[0];
      setStored(STORAGE_KEYS.CURRENT_USER, this.currentUser);
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

  public loginWithSerialNumber(
    serialNumber: string,
    passwordAttempt: string
  ): { success: boolean; message?: string; user?: Profile } {
    // Allows logging in with Serial Number or Referral Code
    const profile =
      this.getProfileBySerialNumber(serialNumber) || this.getProfileByReferralCode(serialNumber);

    if (!profile) {
      return { success: false, message: 'Invalid Serial Number or Referral Code.' };
    }

    if (profile.must_change_password) {
      if (passwordAttempt !== 'default123') {
        return { success: false, message: 'First login requires default password: "default123".' };
      }
    }

    this.setCurrentUser(profile);
    return { success: true, user: profile };
  }

  public updatePassword(userId: string, newPassword: string): boolean {
    const index = this.profiles.findIndex((p) => p.id === userId);
    if (index === -1) return false;

    this.profiles[index] = {
      ...this.profiles[index],
      must_change_password: false,
    };
    if (this.currentUser && this.currentUser.id === userId) {
      this.currentUser = this.profiles[index];
    }
    this.notify();
    return true;
  }

  public addNewProfile(profileData: Omit<Profile, 'id' | 'created_at'>): Profile {
    const newProfile: Profile = {
      ...profileData,
      id: `u-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      created_at: new Date().toISOString(),
    };
    this.profiles.unshift(newProfile);
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
  // FILTERING PROSPECTS BY ROLE
  // ---------------------------------------------------------------------------
  public getVisibleProspects(startDate?: Date | null, endDate?: Date | null): Prospect[] {
    const user = this.currentUser;
    if (!user) return [];

    let list = this.prospects;

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
        return ref && ref.region === user.region;
      });
    }

    const isAreaLevelRole = user.role.some((r) =>
      ['Area Leader', 'Area Somu', 'Gwajang', 'Somu', 'Jeondo Gyo-gwan', 'BB Gyo-gwan'].includes(r)
    );
    if (isAreaLevelRole) {
      return list.filter((p) => {
        const ref = this.getProfileById(p.referred_by_member_id);
        const isRefArea = ref && ref.area === user.area;
        const isAssignedTeacher = p.assigned_bb_teacher_id === user.id;
        return isRefArea || isAssignedTeacher;
      });
    }

    if (user.role.includes('Banjang')) {
      return list.filter((p) => {
        const ref = this.getProfileById(p.referred_by_member_id);
        return ref && ref.ban === user.ban && ref.area === user.area;
      });
    }

    if (user.role.includes('Department TJN')) {
      return list.filter((p) => {
        const ref = this.getProfileById(p.referred_by_member_id);
        return ref && ref.department === user.department;
      });
    }

    if (user.role.includes('Section Leader')) {
      return list.filter((p) => {
        const ref = this.getProfileById(p.referred_by_member_id);
        return ref && ref.section === user.section && ref.area === user.area;
      });
    }

    if (user.role.includes('Member')) {
      return list.filter(
        (p) => p.referred_by_member_id === user.id || p.assigned_bb_teacher_id === user.id
      );
    }

    return list.filter((p) => p.referred_by_member_id === user.id);
  }

  public getProspectsReferredBy(memberId: string): Prospect[] {
    return this.prospects.filter((p) => p.referred_by_member_id === memberId);
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

  // ---------------------------------------------------------------------------
  // PUBLIC REGISTRATION WITH AREA REFERRAL TRACKING
  // ---------------------------------------------------------------------------
  public registerPublicProspect(data: {
    name: string;
    contact_number: string;
    email?: string;
    gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
    province: string;
    city?: string;
    ref_code?: string;
  }): Prospect {
    // Resolve referral code or serial number to actual Profile record
    let referrer: Profile | undefined;
    let remarks: string | undefined;

    // If valid referral code provided, attribute to member; otherwise set to null (Unassigned / Direct Registration)
    const finalReferrerId = referrer ? referrer.id : null;
    const finalRemarks = remarks || (referrer ? undefined : 'Direct Registration (Unassigned)');

    const newProspect: Prospect = {
      id: `p-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      created_at: new Date().toISOString(),
      name: data.name.trim(),
      contact_number: data.contact_number.trim(),
      email: data.email?.trim() || undefined,
      gender: data.gender,
      province: data.province.trim(),
      city: data.city?.trim() || undefined,
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

    return newProspect;
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
  // PIPELINE TRANSITIONS
  // ---------------------------------------------------------------------------
  public upgradeToBBHapdang(
    prospectId: string,
    program: ProgramType,
    nextSchedule: string,
    meetingRemarks?: string
  ): { success: boolean; message?: string } {
    if (!this.canUpgradeToBBHapdang()) {
      return { success: false, message: 'Permission denied: Only Section Leaders and above can upgrade to BB Hapdang.' };
    }

    const idx = this.prospects.findIndex((p) => p.id === prospectId);
    if (idx === -1) return { success: false, message: 'Prospect not found.' };

    this.prospects[idx] = {
      ...this.prospects[idx],
      prospect_level: 'BB Hapdang',
      program,
      next_meeting_schedule: nextSchedule,
      meeting_remarks: meetingRemarks || this.prospects[idx].meeting_remarks,
      updated_at: new Date().toISOString(),
    };

    this.notify();
    return { success: true };
  }

  public upgradeToTtagi(
    prospectId: string,
    meetingRemarks: string,
    nextMeetingSchedule: string,
    assignedBBTeacherId: string
  ): { success: boolean; message?: string } {
    if (!this.canUpgradeToTtagi()) {
      return { success: false, message: 'Permission denied: Section Leaders and Members cannot upgrade directly to Ttagi.' };
    }

    const idx = this.prospects.findIndex((p) => p.id === prospectId);
    if (idx === -1) return { success: false, message: 'Prospect not found.' };

    this.prospects[idx] = {
      ...this.prospects[idx],
      prospect_level: 'Ttagi',
      meeting_remarks: meetingRemarks,
      next_meeting_schedule: nextMeetingSchedule,
      assigned_bb_teacher_id: assignedBBTeacherId,
      updated_at: new Date().toISOString(),
    };

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
    notes?: string
  ): { success: boolean; message?: string } {
    const prospect = this.prospects.find((p) => p.id === prospectId);
    if (!prospect) return { success: false, message: 'Prospect not found.' };

    if (!this.canUpdateLesson(prospect)) {
      return {
        success: false,
        message: 'Permission denied: Only the Assigned BB Teacher (or Admin) can update lessons for this student.',
      };
    }

    const newLesson: BBLesson = {
      id: `l-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      prospect_id: prospectId,
      lesson_title: lessonTitle.trim(),
      date_completed: dateCompleted,
      updated_by: this.currentUser?.id || 'system',
      notes,
      created_at: new Date().toISOString(),
    };

    this.bbLessons.push(newLesson);
    this.recalculateProspectLevel(prospectId);
    this.notify();

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

  public setCenterRegistrationCompleted(prospectId: string, completed: boolean): boolean {
    const idx = this.prospects.findIndex((p) => p.id === prospectId);
    if (idx === -1) return false;

    this.prospects[idx] = {
      ...this.prospects[idx],
      center_registration_completed: completed,
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

    if (count >= 9 && current.center_registration_completed) {
      newLevel = 'Center Hapdang';
    } else if (count >= 3) {
      newLevel = 'BB';
    } else if (count >= 1) {
      newLevel = 'Soebweh';
    }

    if (newLevel !== current.prospect_level) {
      this.prospects[idx] = {
        ...current,
        prospect_level: newLevel,
        updated_at: new Date().toISOString(),
      };
    }
  }

  public approveCenter(prospectId: string): { success: boolean; message?: string } {
    if (!this.canApproveCenter()) {
      return { success: false, message: 'Permission denied: Only the Area Leader (or Super Admin/Admin) can approve students for Center.' };
    }

    const idx = this.prospects.findIndex((p) => p.id === prospectId);
    if (idx === -1) return { success: false, message: 'Prospect not found.' };

    this.prospects[idx] = {
      ...this.prospects[idx],
      prospect_level: 'Center',
      updated_at: new Date().toISOString(),
    };

    this.notify();
    return { success: true };
  }

  public dropProspect(prospectId: string, droppingReason: string, remarks?: string): { success: boolean; message?: string } {
    const idx = this.prospects.findIndex((p) => p.id === prospectId);
    if (idx === -1) return { success: false, message: 'Prospect not found.' };

    this.prospects[idx] = {
      ...this.prospects[idx],
      prospect_level: 'BB Dropped',
      dropping_reason: droppingReason,
      meeting_remarks: remarks || this.prospects[idx].meeting_remarks,
      updated_at: new Date().toISOString(),
    };

    this.notify();
    return { success: true };
  }

  public restoreProspect(prospectId: string, targetLevel: ProspectLevel = 'Chatgi'): boolean {
    const idx = this.prospects.findIndex((p) => p.id === prospectId);
    if (idx === -1) return false;

    this.prospects[idx] = {
      ...this.prospects[idx],
      prospect_level: targetLevel,
      dropping_reason: undefined,
      updated_at: new Date().toISOString(),
    };

    this.recalculateProspectLevel(prospectId);
    this.notify();
    return true;
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
    this.currentUser = this.profiles[0];
    this.notify();
  }
}

export const appStore = Store.getInstance();
