export type UserRole =
  | 'Super Admin'
  | 'Admin'
  | 'Regional Leader'
  | 'Area Leader'
  | 'Area Somu'
  | 'Gwajang'
  | 'Somu'
  | 'Banjang'
  | 'Jeondo Gyo-gwan'
  | 'BB Gyo-gwan'
  | 'Department TJN'
  | 'Section Leader'
  | 'Member';

export type ProspectLevel =
  | 'Chatgi'
  | 'BB Hapdang'
  | 'Ttagi'
  | 'Soebweh'
  | 'BB'
  | 'Center Hapdang'
  | 'Center'
  | 'BB Dropped';

export type ProgramType = 'Onsite' | 'Online' | 'SPS';

export interface Profile {
  id: string;
  username?: string;
  serial_number: string;
  referral_code: string; // Area-based unique referral code (e.g. MANILA-NORTH-001, CEBU-SOUTH-042)
  name: string;
  department: string;
  area: string;
  region: string;
  duty: string;
  section: string;
  team_leader: string;
  ban: string;
  role: UserRole[];
  has_bb_teacher_permission?: boolean; // Additional permission assignable to any member
  is_active?: boolean;
  must_change_password: boolean;
  phone?: string;
  email?: string;
  created_at: string;
}

export type Member = Profile;

export interface Prospect {
  id: string;
  created_at: string;
  name: string;
  contact_number: string;
  email?: string;
  gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  province: string;
  city?: string;
  referred_by_member_id?: string | null; // references Profile.id or null for Unassigned/Direct Registration
  prospect_level: ProspectLevel;
  program?: ProgramType;
  next_meeting_schedule?: string;
  meeting_mode?: 'Online' | 'Onsite';
  meeting_remarks?: string;
  assigned_bb_teacher_id?: string; // references Profile.id
  upgraded_by_id?: string;
  upgraded_at?: string;
  dropping_reason?: string;
  previous_stage?: ProspectLevel;
  dropped_by_id?: string;
  dropped_at?: string;
  center_registration_completed?: boolean;
  center_form_completed_at?: string;
  center_form_verification?: string;
  center_approved_by?: string;
  center_approved_at?: string;
  center_registration_month?: string;
  is_deleted?: boolean;
  deleted_at?: string;
  deleted_by?: string;
  updated_at: string;
}

export interface BBLesson {
  id: string;
  prospect_id: string;
  lesson_title: string;
  date_completed: string;
  mode?: 'Online' | 'Onsite';
  method?: '1-on-1' | 'Group';
  assigned_teacher_id?: string;
  updated_by: string; // references Profile.id
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface StatusHistoryLog {
  id: string;
  prospect_id: string;
  from_level: ProspectLevel;
  to_level: ProspectLevel;
  changed_by_id: string;
  changed_by_name: string;
  remarks?: string;
  timestamp: string;
}

export interface FollowUpLog {
  id: string;
  prospect_id: string;
  performed_by_id: string;
  type: 'call' | 'sms' | 'meeting' | 'note';
  notes: string;
  created_at: string;
}

export interface PipelineSummary {
  chatgi: number;
  bb_hapdang: number;
  ttagi: number;
  soebweh: number;
  bb: number;
  center_hapdang: number;
  center: number;
  bb_dropped: number;
  total: number;
}

export interface MemberImportBatch {
  id: string;
  filename: string;
  imported_count: number;
  imported_by_id: string;
  imported_by_name: string;
  area_summary: Record<string, number>;
  created_at: string;
}

export interface CsvMemberRow {
  name: string;
  email?: string;
  contact_number?: string;
  area: string;
  department?: string;
  region?: string;
  duty?: string;
  section?: string;
  team_leader?: string;
  ban?: string;
  role?: string;
  generated_referral_code?: string;
  serial_number?: string;
  isValid: boolean;
  errorMessage?: string;
}

export const AUTHORIZED_REGISTRATION_ROLES: UserRole[] = [
  'Super Admin',
  'Admin',
  'Regional Leader',
  'Area Leader',
  'Area Somu',
];

export const ALL_APPROVED_ROLES: UserRole[] = [
  'Super Admin',
  'Admin',
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
  'Member',
];

export interface AccountCsvRow {
  rowNumber: number;
  serialNumber: string;
  fullName: string;
  department: string;
  area: string;
  region: string;
  duty: string;
  section: string;
  ban: string;
  teamLeader: string;
  roles: UserRole[];
  status: 'new' | 'update' | 'error';
  errorMessage?: string;
  existingProfile?: Profile;
}
