import React, { useState } from 'react';
import { Database, Copy, Check, Download, ExternalLink, X, ShieldCheck, Key, CheckCircle2 } from 'lucide-react';
import { saveSupabaseCredentials, clearSupabaseCredentials, SUPABASE_URL, SUPABASE_ANON_KEY, IS_SUPABASE_CONFIGURED } from '../services/supabase';

interface SupabaseSqlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseSqlModal: React.FC<SupabaseSqlModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [urlInput, setUrlInput] = useState(SUPABASE_URL || '');
  const [keyInput, setKeyInput] = useState(SUPABASE_ANON_KEY || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const sqlScript = `-- ==============================================================================
-- Zion Christian Mission Center - Free Bible Study & Student Management
-- Supabase Database Migration & Schema (PostgreSQL)
-- Includes: Area-Based Referral Codes, Nullable Referrer, Super Admin & Reset
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. MEMBERS TABLE (For direct CSV member upload & upsert by serial_number)
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_number TEXT UNIQUE NOT NULL,
    referral_code TEXT UNIQUE NOT NULL, -- e.g. MANILA0001, CEBU0042
    name TEXT NOT NULL,
    department TEXT NOT NULL DEFAULT 'Evangelism Dept',
    section TEXT DEFAULT 'Section Alpha',
    area TEXT NOT NULL DEFAULT 'Manila',
    region TEXT NOT NULL DEFAULT 'NCR & Luzon',
    ban TEXT DEFAULT 'Ban 1', -- Ban Name / Team Column
    duty TEXT DEFAULT 'Evangelism Worker',
    team_leader TEXT DEFAULT 'Leader Timothy',
    role TEXT[] NOT NULL DEFAULT ARRAY['Member']::TEXT[],
    must_change_password BOOLEAN NOT NULL DEFAULT true,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Schema adjustment: Ensure 'ban' column exists
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS ban TEXT DEFAULT 'Ban 1';

CREATE INDEX IF NOT EXISTS idx_members_serial_number ON public.members(serial_number);
CREATE INDEX IF NOT EXISTS idx_members_referral_code ON public.members(referral_code);
CREATE INDEX IF NOT EXISTS idx_members_ban ON public.members(ban);

-- Enable Supabase Realtime for 'members'
ALTER PUBLICATION supabase_realtime ADD TABLE public.members;

-- 2. PROFILES TABLE (Linked to Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    serial_number TEXT UNIQUE NOT NULL,
    referral_code TEXT UNIQUE NOT NULL, -- e.g. MANILA0001, CEBU0002
    name TEXT NOT NULL,
    department TEXT NOT NULL DEFAULT 'Evangelism Dept',
    area TEXT NOT NULL DEFAULT 'Area 1',
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

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban TEXT DEFAULT 'Ban 1';

CREATE INDEX IF NOT EXISTS idx_profiles_serial_number ON public.profiles(serial_number);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_area ON public.profiles(area);

-- 3. MEMBER IMPORTS TABLE (Logs CSV batch upload utility)
CREATE TABLE IF NOT EXISTS public.member_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    imported_count INT NOT NULL DEFAULT 0,
    imported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    area_summary JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. PROSPECTS TABLE (Students with Nullable Referrer FK for Direct Registrations)
CREATE TABLE IF NOT EXISTS public.prospects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    contact_number TEXT NOT NULL,
    email TEXT,
    gender TEXT CHECK (gender IN ('Male', 'Female', 'Other', 'Prefer not to say')),
    province TEXT NOT NULL,
    city TEXT,
    referred_by_member_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    prospect_level TEXT NOT NULL DEFAULT 'Chatgi' CHECK (
        prospect_level IN ('Chatgi', 'BB Hapdang', 'Ttagi', 'Soebweh', 'BB', 'Center Hapdang', 'Center', 'BB Dropped')
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

-- 4. BB_LESSONS TABLE (Lesson tracking per student)
CREATE TABLE IF NOT EXISTS public.bb_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
    lesson_title TEXT NOT NULL,
    date_completed DATE NOT NULL DEFAULT CURRENT_DATE,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bb_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read referral codes" ON public.profiles FOR SELECT TO anon USING (true);
CREATE POLICY "Allow auth read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow anon insert prospects" ON public.prospects FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Role based read prospects" ON public.prospects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow update prospects" ON public.prospects FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow manage bb lessons" ON public.bb_lessons FOR ALL TO authenticated USING (true);

-- 6. SUPER ADMIN GRANT (Serial Number: 00361228-01771)
INSERT INTO public.profiles (
    id, serial_number, referral_code, name, department, area, region, duty, section, team_leader, ban, role, must_change_password
) VALUES (
    gen_random_uuid(), '00361228-01771', 'HQ0001', 'Headquarters Super Admin', 'General Affairs', 'HQ', 'Global HQ', 'Senior Overseer', 'Executive Section', 'Head Pastor', 'Executive Ban', ARRAY['Super Admin', 'Admin']::TEXT[], false
)
ON CONFLICT (serial_number) DO UPDATE
SET role = ARRAY['Super Admin', 'Admin']::TEXT[], referral_code = 'HQ0001', must_change_password = false;

-- 7. SAFE TEST DATA RESET SCRIPT
-- TRUNCATE TABLE public.bb_lessons CASCADE;
-- TRUNCATE TABLE public.prospects CASCADE;
`;

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(sqlScript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([sqlScript], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'zion_student_management_schema.sql';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput && keyInput) {
      saveSupabaseCredentials(urlInput.trim(), keyInput.trim());
      setSaveSuccess(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 text-slate-900 max-h-[90vh] flex flex-col relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider">
                Supabase PostgreSQL Backend
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  IS_SUPABASE_CONFIGURED
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {IS_SUPABASE_CONFIGURED ? 'Remote Supabase Connected' : 'Local Storage Fallback Active'}
              </span>
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">
              Database Migration & Setup
            </h3>
            <p className="text-xs text-slate-500">
              Run this SQL script in your Supabase SQL Editor to provision tables, indexes, and RLS policies.
            </p>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto py-4 space-y-4 flex-grow pr-1 custom-scrollbar">
          {/* Quick Action Buttons */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              SQL Migration Script (PostgreSQL)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard' : 'Copy SQL'}</span>
              </button>
              <button
                onClick={handleDownload}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-blue-200 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .sql</span>
              </button>
            </div>
          </div>

          {/* SQL Code Block */}
          <div className="relative rounded-2xl bg-slate-950 p-4 border border-slate-800 text-slate-200 font-mono text-[11px] max-h-60 overflow-y-auto custom-scrollbar select-all">
            <pre className="whitespace-pre-wrap">{sqlScript}</pre>
          </div>

          {/* Live Supabase Connection Inputs */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-emerald-600" />
              Connect Live Supabase Project (Optional)
            </h4>
            <p className="text-xs text-slate-500 mb-3">
              The application works immediately out-of-the-box with persistent local storage. If you have an active Supabase project, enter your Project URL and Anon Public Key below:
            </p>

            <form onSubmit={handleSaveCredentials} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Supabase Project URL
                  </label>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://xyzcompany.supabase.co"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Supabase Anon Public API Key
                  </label>
                  <input
                    type="password"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                {IS_SUPABASE_CONFIGURED && (
                  <button
                    type="button"
                    onClick={clearSupabaseCredentials}
                    className="text-xs text-rose-600 hover:underline font-semibold"
                  >
                    Clear Credentials & Reset to Local
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors ml-auto"
                >
                  Save & Connect Supabase
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
