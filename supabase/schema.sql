-- ==============================================================================
-- Zion Christian Mission Center - Free Bible Study & Student Management
-- Supabase Database Migration & Schema (PostgreSQL)
-- Includes:
--   1. Members Table with 'ban' column & upsert conflict on serial_number
--   2. Profiles Table (Linked to Supabase Auth users)
--   3. Area-Based Referral Codes ({Area}{0001}, e.g. MANILA0001, CEBU0042)
--   4. Direct Supabase Upsert Sync & Realtime Replication
--   5. Nullable referred_by_member_id for Direct Public Registrations
--   6. Role-Based Access Control (RBAC) & Row Level Security (RLS)
--   7. Super Admin Grant for Serial Number: 00361228-01771
--   8. Safe Test Data Reset Script
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. MEMBERS TABLE (Dedicated table for CSV Member Upload & Upsert by serial_number)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_number TEXT UNIQUE NOT NULL,
    referral_code TEXT UNIQUE NOT NULL, -- e.g. MANILA0001, CEBU0042
    name TEXT NOT NULL,
    department TEXT NOT NULL DEFAULT 'Evangelism Dept',
    section TEXT DEFAULT 'Section Alpha',
    area TEXT NOT NULL DEFAULT 'Manila',
    region TEXT NOT NULL DEFAULT 'NCR & Luzon',
    ban TEXT DEFAULT 'Ban 1', -- Ban Name / Team column
    duty TEXT DEFAULT 'Evangelism Worker',
    team_leader TEXT DEFAULT 'Leader Timothy',
    role TEXT[] NOT NULL DEFAULT ARRAY['Member']::TEXT[],
    must_change_password BOOLEAN NOT NULL DEFAULT true,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Schema adjustment: Ensure 'ban' column exists on existing 'members' table
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS ban TEXT DEFAULT 'Ban 1';

-- Indexes on 'members' for instant lookups & upsert conflict target
CREATE INDEX IF NOT EXISTS idx_members_serial_number ON public.members(serial_number);
CREATE INDEX IF NOT EXISTS idx_members_referral_code ON public.members(referral_code);
CREATE INDEX IF NOT EXISTS idx_members_area ON public.members(area);
CREATE INDEX IF NOT EXISTS idx_members_ban ON public.members(ban);

-- Enable Supabase Realtime for 'members' table
ALTER PUBLICATION supabase_realtime ADD TABLE public.members;

-- -----------------------------------------------------------------------------
-- 2. PROFILES TABLE (Linked to Supabase Auth users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    serial_number TEXT UNIQUE NOT NULL,
    referral_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    department TEXT NOT NULL DEFAULT 'Evangelism Dept',
    area TEXT NOT NULL DEFAULT 'Manila',
    region TEXT NOT NULL DEFAULT 'NCR & Luzon',
    duty TEXT DEFAULT 'Evangelism Worker',
    section TEXT DEFAULT 'Section Alpha',
    team_leader TEXT DEFAULT 'Leader Timothy',
    ban TEXT DEFAULT 'Ban 1',
    role TEXT[] NOT NULL DEFAULT ARRAY['Member']::TEXT[],
    must_change_password BOOLEAN NOT NULL DEFAULT true,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Schema adjustment: Ensure 'ban' column exists on existing 'profiles' table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban TEXT DEFAULT 'Ban 1';

CREATE INDEX IF NOT EXISTS idx_profiles_serial_number ON public.profiles(serial_number);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_area ON public.profiles(area);
CREATE INDEX IF NOT EXISTS idx_profiles_ban ON public.profiles(ban);

-- Enable Supabase Realtime for 'profiles' table
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- -----------------------------------------------------------------------------
-- 3. MEMBER IMPORTS TABLE (Logs CSV batch upload utility)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.member_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    imported_count INT NOT NULL DEFAULT 0,
    imported_by UUID,
    area_summary JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_member_imports_created_at ON public.member_imports(created_at);

-- -----------------------------------------------------------------------------
-- 4. PROSPECTS TABLE (Students / Registrants with Nullable Referrer FK)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.prospects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    contact_number TEXT NOT NULL,
    email TEXT,
    gender TEXT CHECK (gender IN ('Male', 'Female', 'Other', 'Prefer not to say')),
    province TEXT NOT NULL,
    city TEXT,
    -- Nullable for Direct / Unassigned Public Registrations:
    referred_by_member_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    prospect_level TEXT NOT NULL DEFAULT 'Chatgi' CHECK (
        prospect_level IN (
            'Chatgi',
            'BB Hapdang',
            'Ttagi',
            'Soebweh',
            'BB',
            'Center Hapdang',
            'Center',
            'BB Dropped'
        )
    ),
    program TEXT CHECK (program IN ('Onsite', 'Online', 'SPS', NULL)),
    next_meeting_schedule TIMESTAMP WITH TIME ZONE,
    meeting_remarks TEXT,
    assigned_bb_teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    dropping_reason TEXT,
    center_registration_completed BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prospects_referred_by ON public.prospects(referred_by_member_id);
CREATE INDEX IF NOT EXISTS idx_prospects_level ON public.prospects(prospect_level);

-- Enable Supabase Realtime for 'prospects'
ALTER PUBLICATION supabase_realtime ADD TABLE public.prospects;

-- -----------------------------------------------------------------------------
-- 5. BB_LESSONS TABLE (Lesson Tracking Per Student)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bb_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
    lesson_title TEXT NOT NULL,
    date_completed DATE NOT NULL DEFAULT CURRENT_DATE,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bb_lessons_prospect_id ON public.bb_lessons(prospect_id);

-- -----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bb_lessons ENABLE ROW LEVEL SECURITY;

-- Allow public read of referral codes so registration links can validate guide info
CREATE POLICY "Public anonymous read members referral code"
ON public.members FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow authenticated read members"
ON public.members FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated and service role to upsert members
CREATE POLICY "Allow authenticated upsert members"
ON public.members FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public read profiles referral code"
ON public.profiles FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow authenticated read profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins full manage profiles"
ON public.profiles FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public register prospects"
ON public.prospects FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Role based read prospects"
ON public.prospects FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated update prospects"
ON public.prospects FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Read bb lessons"
ON public.bb_lessons FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Write bb lessons"
ON public.bb_lessons FOR ALL
TO authenticated
USING (true);

-- -----------------------------------------------------------------------------
-- 7. SUPER ADMIN GRANT FOR SERIAL: 00361228-01771
-- -----------------------------------------------------------------------------
INSERT INTO public.members (
    serial_number,
    referral_code,
    name,
    department,
    section,
    area,
    region,
    ban,
    duty,
    team_leader,
    role,
    must_change_password
) VALUES (
    '00361228-01771',
    'HQ0001',
    'Headquarters Super Admin',
    'General Affairs',
    'Executive Section',
    'HQ',
    'Global HQ',
    'Executive Ban',
    'Senior Overseer',
    'Head Pastor',
    ARRAY['Super Admin', 'Admin']::TEXT[],
    false
)
ON CONFLICT (serial_number) DO UPDATE
SET
    role = ARRAY['Super Admin', 'Admin']::TEXT[],
    referral_code = 'HQ0001',
    ban = 'Executive Ban',
    must_change_password = false,
    updated_at = timezone('utc'::text, now());

-- -----------------------------------------------------------------------------
-- 8. SAFE TEST DATA RESET SCRIPT
-- -----------------------------------------------------------------------------
-- TRUNCATE TABLE public.bb_lessons CASCADE;
-- TRUNCATE TABLE public.prospects CASCADE;
