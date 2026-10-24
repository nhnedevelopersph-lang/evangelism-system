import React, { useState } from 'react';
import { Profile } from '../types';
import { useMembers } from '../hooks/useMembers';
import {
  Users,
  Search,
  Filter,
  Download,
  Upload,
  RefreshCw,
  Database,
  Radio,
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  MapPin,
  Sparkles
} from 'lucide-react';
import { appStore } from '../services/store';

interface MembersListViewProps {
  currentUser: Profile;
  onOpenCsvImport?: () => void;
  onNavigateToRegister?: (code: string) => void;
}

export const MembersListView: React.FC<MembersListViewProps> = ({
  currentUser,
  onOpenCsvImport,
  onNavigateToRegister,
}) => {
  const { members, loading, error, refreshMembers, isRealtimeActive } = useMembers();
  const [searchTerm, setSearchTerm] = useState('');
  const [areaFilter, setAreaFilter] = useState('ALL');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [permissionMsg, setPermissionMsg] = useState<string | null>(null);

  // Jurisdiction-filtered members based on current user's role and assignment
  const visibleMembers = appStore.getVisibleMembers();

  // Extract unique areas
  const areas = Array.from(new Set(visibleMembers.map((m) => m.area).filter(Boolean))).sort();

  const filteredMembers = visibleMembers.filter((m) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      m.name.toLowerCase().includes(term) ||
      m.serial_number.toLowerCase().includes(term) ||
      m.referral_code.toLowerCase().includes(term) ||
      m.department.toLowerCase().includes(term) ||
      (m.section && m.section.toLowerCase().includes(term)) ||
      (m.area && m.area.toLowerCase().includes(term)) ||
      (m.region && m.region.toLowerCase().includes(term)) ||
      (m.ban && m.ban.toLowerCase().includes(term)) ||
      (m.duty && m.duty.toLowerCase().includes(term)) ||
      (m.team_leader && m.team_leader.toLowerCase().includes(term)) ||
      (m.phone && m.phone.toLowerCase().includes(term)) ||
      (m.email && m.email.toLowerCase().includes(term)) ||
      m.role.some((r) => r.toLowerCase().includes(term));

    const matchesArea = areaFilter === 'ALL' || m.area === areaFilter;
    return matchesSearch && matchesArea;
  });

  const handleCopyCode = (code: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  const handleToggleBBTeacher = (memberId: string) => {
    const res = appStore.toggleBBTeacherPermission(memberId);
    if (res.message) {
      setPermissionMsg(res.message);
      setTimeout(() => setPermissionMsg(null), 3000);
    }
  };

  const handleExportLinks = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://zionchristianmissioncenter.org';
    const csvContent = appStore.exportMemberLinksCsv(origin);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zion_member_referral_links_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const canManageAccounts = appStore.canManageAccounts(currentUser);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Stats */}
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wider rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                Directory
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                {visibleMembers.length} Workers in Scope
              </span>
              {isRealtimeActive && (
                <>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Supabase Realtime Live Sync
                  </span>
                </>
              )}
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Member & Worker Directory
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Roster of church leaders, evangelists, and teachers with their referral statistics across all 7 pipeline stages and dropping counts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => refreshMembers()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
              title="Re-fetch members from Supabase"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Syncing...' : 'Sync Now'}</span>
            </button>

            <button
              onClick={handleExportLinks}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-xl transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Links (.CSV)</span>
            </button>

            {onOpenCsvImport && canManageAccounts && (
              <button
                onClick={onOpenCsvImport}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload CSV List</span>
              </button>
            )}
          </div>
        </div>

        {permissionMsg && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold animate-in fade-in">
            {permissionMsg}
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search across all fields (name, serial, code, area, ban, duty, role, email)..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-100 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600">Area:</span>
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:border-blue-600"
            >
              <option value="ALL">All Areas ({visibleMembers.length})</option>
              {areas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Members Table Card */}
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold">
                <th className="pb-3 px-3">Serial & Name</th>
                <th className="pb-3 px-3">Area & Ban</th>
                <th className="pb-3 px-3">Duty & Role</th>
                <th className="pb-3 px-3">BB Teacher</th>
                <th className="pb-3 px-3">Referrals Across All Stages</th>
                <th className="pb-3 px-3 text-right">Referral Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No members found matching your search.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => {
                  const counts = appStore.getMemberReferralCounts(m.id);

                  return (
                    <tr key={m.id || m.serial_number} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="font-mono text-[11px] font-bold text-blue-700">
                          {m.serial_number}
                        </div>
                        <div className="font-bold text-slate-900 text-sm mt-0.5">{m.name}</div>
                        <div className="text-[10px] text-slate-400">{m.department} • {m.section}</div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="text-slate-800 font-semibold flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-blue-600" />
                          {m.area}
                        </div>
                        <div className="text-[10px] text-slate-400">{m.region}</div>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {m.ban || 'Ban 1'}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="text-slate-700 font-medium">{m.duty}</div>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {m.role.map((r) => (
                            <span
                              key={r}
                              className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-blue-50 text-blue-800 border border-blue-100"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* BB Teacher Permission & Toggle */}
                      <td className="py-3.5 px-3">
                        {m.has_bb_teacher_permission ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-50 text-teal-800 border border-teal-200">
                              <Sparkles className="w-3 h-3 text-teal-600" />
                              BB Teacher
                            </span>
                            {canManageAccounts && (
                              <button
                                onClick={() => handleToggleBBTeacher(m.id)}
                                title="Revoke BB Teacher permission"
                                className="text-[10px] text-slate-400 hover:text-rose-600 underline font-semibold"
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span className="text-[10px] text-slate-400 italic">No permission</span>
                            {canManageAccounts && (
                              <button
                                onClick={() => handleToggleBBTeacher(m.id)}
                                title="Grant BB Teacher permission"
                                className="block text-[10px] text-teal-700 hover:text-teal-900 font-semibold underline mt-0.5"
                              >
                                + Grant BB Teacher
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Referral Counts Across All 7 Pipeline Stages + Dropped */}
                      <td className="py-3.5 px-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-slate-900 text-xs">
                              {counts.total} Total
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              (Code: {m.referral_code})
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1 max-w-xs text-[10px]">
                            <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200" title="Chatgi">
                              Chatgi: <strong>{counts.chatgi}</strong>
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-800 border border-blue-200" title="BB Hapdang">
                              BB Hapdang: <strong>{counts.bb_hapdang}</strong>
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-800 border border-purple-200" title="Ttagi">
                              Ttagi: <strong>{counts.ttagi}</strong>
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-teal-50 text-teal-800 border border-teal-200" title="Soebweh">
                              Soebweh: <strong>{counts.soebweh}</strong>
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-800 border border-indigo-200" title="BB">
                              BB: <strong>{counts.bb}</strong>
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200" title="Center Hapdang">
                              Center Hapdang: <strong>{counts.center_hapdang}</strong>
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-green-50 text-green-900 border border-green-300 font-bold" title="Center">
                              Center: <strong>{counts.center}</strong>
                            </span>
                            {counts.bb_dropped > 0 && (
                              <span className="px-1.5 py-0.2 rounded bg-rose-50 text-rose-800 border border-rose-200" title="BB Dropped">
                                Dropped: <strong>{counts.bb_dropped}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleCopyCode(m.referral_code)}
                            title="Copy referral code"
                            className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 transition-colors"
                          >
                            {copiedCode === m.referral_code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          {onNavigateToRegister && (
                            <button
                              onClick={() => onNavigateToRegister(m.referral_code)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors"
                            >
                              <span>Form</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
