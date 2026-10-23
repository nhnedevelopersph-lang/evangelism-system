import React, { useState, useEffect } from 'react';
import { Profile, PipelineSummary, Prospect } from '../types';
import { appStore } from '../services/store';
import {
  Calendar,
  Clock,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Users,
  Shield,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Share2,
  FileSpreadsheet,
  QrCode,
  MapPin,
  CheckCircle2,
  Download,
  Trash2,
  AlertTriangle
} from 'lucide-react';

interface DashboardViewProps {
  currentUser: Profile;
  onNavigateToProspects: (filterLevel?: string) => void;
  onNavigateToRegister: (refCode?: string) => void;
  onOpenCsvImport?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  onNavigateToProspects,
  onNavigateToRegister,
  onOpenCsvImport,
}) => {
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [asOfTimestamp, setAsOfTimestamp] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [sharedToast, setSharedToast] = useState(false);

  // Compute live timestamp
  const updateTimestamp = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    const dateStr = now.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
    setAsOfTimestamp(`${dateStr} • As of ${timeStr}`);
  };

  useEffect(() => {
    updateTimestamp();
  }, [dateFilter, customStart, customEnd]);

  const getDateRange = () => {
    const now = new Date();
    if (dateFilter === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      return { start, end };
    }
    if (dateFilter === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
      const end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
      return { start, end };
    }
    if (dateFilter === 'week') {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      return { start: sevenDaysAgo, end: now };
    }
    if (dateFilter === 'month') {
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      return { start: thirtyDaysAgo, end: now };
    }
    if (dateFilter === 'custom' && customStart && customEnd) {
      return {
        start: new Date(`${customStart}T00:00:00`),
        end: new Date(`${customEnd}T23:59:59`),
      };
    }
    return { start: undefined, end: undefined };
  };

  const { start, end } = getDateRange();
  const summary: PipelineSummary = appStore.getPipelineSummary(start, end);
  const visibleProspects = appStore.getVisibleProspects(start, end);
  const myReferredProspects = appStore.getProspectsReferredBy(currentUser.id);

  // Structured Area Referral Link
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://zionchristianmissioncenter.org';
  const effectiveRefCode = currentUser.referral_code || currentUser.serial_number;
  const referralLink = `${origin}/register/${effectiveRefCode}`;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(referralLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleShareLink = () => {
    const shareData = {
      title: 'Zion Christian Mission Center - Free Bible Study',
      text: `Hello! Discover the mysteries of the Holy Scriptures through Zion Christian Mission Center's Free Bible Study. Register using my guide link:`,
      url: referralLink,
    };

    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
    } else {
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
        `${shareData.text} ${shareData.url}`
      )}`;
      window.open(whatsappUrl, '_blank');
      setSharedToast(true);
      setTimeout(() => setSharedToast(false), 2000);
    }
  };

  const handleExportMemberLinks = () => {
    const csvContent = appStore.exportMemberLinksCsv(origin);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zion_member_referral_links_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetTestData = () => {
    const confirmMsg =
      'Are you sure you want to clear all test student prospects and BB lessons?\n\nThis will safely reset prospect pipeline records while keeping all worker member profiles, serial numbers, and authentication passwords intact.';
    if (window.confirm(confirmMsg)) {
      const result = appStore.clearTestProspects();
      alert(`Safe Data Reset: Removed ${result.removedCount} test student prospects. All member profiles remain intact.`);
      updateTimestamp();
    }
  };

  const getRoleScopeDescription = () => {
    if (currentUser.role.includes('Super Admin') || currentUser.role.includes('Admin')) {
      return 'Global HQ Scope • Viewing entire worldwide missionary data across all regions and areas.';
    }
    if (currentUser.role.includes('Regional Leader')) {
      return `Regional Scope • Viewing all areas under Region: "${currentUser.region}".`;
    }
    if (
      currentUser.role.some((r) =>
        ['Area Leader', 'Area Somu', 'Gwajang', 'Somu', 'Jeondo Gyo-gwan', 'BB Gyo-gwan'].includes(r)
      )
    ) {
      return `Area Scope • Viewing all statistics under Area: "${currentUser.area}" (${currentUser.region}).`;
    }
    if (currentUser.role.includes('Banjang')) {
      return `Ban Scope • Viewing Ban: "${currentUser.ban}" under Area: "${currentUser.area}".`;
    }
    if (currentUser.role.includes('Department TJN')) {
      return `Department Scope • Viewing department: "${currentUser.department}".`;
    }
    if (currentUser.role.includes('Section Leader')) {
      return `Section Scope • Viewing Section: "${currentUser.section}" under Ban: "${currentUser.ban}".`;
    }
    return `Personal Evangelism Scope • Viewing students registered through your unique referral code (${effectiveRefCode}).`;
  };

  const pipelineStages = [
    {
      level: 'Chatgi',
      count: summary.chatgi,
      label: 'Chatgi',
      sub: 'Newly Registered',
      color: 'bg-amber-500/10 text-amber-800 border-amber-300 hover:border-amber-400',
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      level: 'BB Hapdang',
      count: summary.bb_hapdang,
      label: 'BB Hapdang',
      sub: 'Program & Sched Set',
      color: 'bg-blue-500/10 text-blue-800 border-blue-300 hover:border-blue-400',
      badgeColor: 'bg-blue-600 text-white',
    },
    {
      level: 'Ttagi',
      count: summary.ttagi,
      label: 'Ttagi',
      sub: 'BB Teacher Assigned',
      color: 'bg-purple-500/10 text-purple-800 border-purple-300 hover:border-purple-400',
      badgeColor: 'bg-purple-600 text-white',
    },
    {
      level: 'Soebweh',
      count: summary.soebweh,
      label: 'Soebweh',
      sub: '1-2 BB Lessons',
      color: 'bg-teal-500/10 text-teal-800 border-teal-300 hover:border-teal-400',
      badgeColor: 'bg-teal-600 text-white',
    },
    {
      level: 'BB',
      count: summary.bb,
      label: 'BB',
      sub: '3+ BB Lessons',
      color: 'bg-indigo-500/10 text-indigo-800 border-indigo-300 hover:border-indigo-400',
      badgeColor: 'bg-indigo-600 text-white',
    },
    {
      level: 'Center Hapdang',
      count: summary.center_hapdang,
      label: 'Center Hapdang',
      sub: '9+ Lessons & Form',
      color: 'bg-emerald-500/10 text-emerald-800 border-emerald-300 hover:border-emerald-400',
      badgeColor: 'bg-emerald-600 text-white',
    },
    {
      level: 'Center',
      count: summary.center,
      label: 'Center',
      sub: 'Approved by Area Leader',
      color: 'bg-green-600/10 text-green-900 border-green-400 hover:border-green-500',
      badgeColor: 'bg-green-700 text-white',
    },
  ];

  const isAdmin = currentUser.role.includes('Super Admin') || currentUser.role.includes('Admin');

  return (
    <div className="space-y-6">
      {/* Scope & Date Filter Header Card */}
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wider rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                {currentUser.role.join(' / ')}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-mono font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-blue-600" />
                {currentUser.area}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-mono font-medium text-slate-600">
                Code: {effectiveRefCode}
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Evangelism Pipeline Dashboard
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              {getRoleScopeDescription()}
            </p>
          </div>

          {/* Action Tools */}
          <div className="flex flex-wrap items-center gap-2.5">
            {isAdmin && onOpenCsvImport && (
              <button
                onClick={onOpenCsvImport}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>CSV Member Import</span>
              </button>
            )}

            <button
              onClick={handleExportMemberLinks}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs rounded-xl transition-colors"
              title="Download CSV containing all member referral URLs"
            >
              <Download className="w-4 h-4" />
              <span>Export Links (.CSV)</span>
            </button>

            {isAdmin && (
              <button
                onClick={handleResetTestData}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl transition-colors"
                title="Safely reset test prospects while keeping member profiles"
              >
                <Trash2 className="w-4 h-4" />
                <span>Reset Test Data</span>
              </button>
            )}
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-slate-600 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date Range:
            </span>
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'week', label: 'Last 7 Days' },
              { id: 'month', label: 'Last 30 Days' },
              { id: 'custom', label: 'Custom Range' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setDateFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  dateFilter === f.id
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
          )}
        </div>
      </div>

      {/* Member Area-Based Referral Link Hub */}
      <div className="bg-gradient-to-r from-blue-900 via-sky-800 to-indigo-900 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full bg-white/5 skew-x-12 pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-400/20 text-sky-200 text-xs font-semibold mb-2 border border-sky-400/30">
              <Sparkles className="w-3.5 h-3.5" />
              Area-Based Referral Code: <strong className="text-white">{effectiveRefCode}</strong>
            </div>
            <h3 className="text-xl font-extrabold text-white">
              Your Public Student Referral Link
            </h3>
            <p className="text-xs text-sky-100 mt-1 leading-relaxed">
              Share this standalone public link with prospective seekers. When submitted, the student is attributed directly to your record (<span className="text-amber-300">{currentUser.name}</span> • {currentUser.area}) in the database.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="bg-slate-900/60 border border-white/20 rounded-xl px-3 py-2 text-xs font-mono text-sky-200 truncate max-w-md select-all">
                {referralLink}
              </div>
              <button
                onClick={handleCopyLink}
                className="px-3.5 py-2 bg-white text-blue-900 hover:bg-sky-50 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all flex-shrink-0"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
              <button
                onClick={handleShareLink}
                className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors flex-shrink-0"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{sharedToast ? 'Opened!' : 'Share Link'}</span>
              </button>
              <button
                onClick={() => onNavigateToRegister(effectiveRefCode)}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors flex-shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Form</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics / Stats Box */}
          <div className="flex gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
            <div className="text-center">
              <span className="text-2xl font-black text-white">{visibleProspects.length}</span>
              <p className="text-[10px] text-sky-200 font-medium">In Role Scope</p>
            </div>
            <div className="w-px bg-white/20" />
            <div className="text-center">
              <span className="text-2xl font-black text-amber-300">{myReferredProspects.length}</span>
              <p className="text-[10px] text-sky-200 font-medium">My Registrants</p>
            </div>
            <div className="w-px bg-white/20" />
            <div className="text-center">
              <span className="text-2xl font-black text-emerald-300">{summary.center}</span>
              <p className="text-[10px] text-sky-200 font-medium">In Center</p>
            </div>
          </div>
        </div>
      </div>

      {/* 7 Pipeline Stages Counter Cards (Main Dashboard Results & Metrics Summary) */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              Prospect Pipeline Status (7 Stages)
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Total active students in role scope: <strong className="text-slate-800">{visibleProspects.length}</strong>
            </p>
          </div>

          {/* Live Snapshot Timestamp Badge directly beside/above Main Results Card */}
          <div className="bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-2xl flex items-center gap-2 text-xs shadow-2xs self-start sm:self-auto">
            <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <div className="text-left">
              <span className="text-slate-500 font-bold block text-[10px] uppercase tracking-wider leading-none">
                Live Snapshot
              </span>
              <span className="font-bold text-slate-800 text-[11px] leading-tight">{asOfTimestamp}</span>
            </div>
            <button
              onClick={updateTimestamp}
              title="Refresh snapshot timestamp"
              className="ml-1 text-slate-400 hover:text-blue-600 p-1 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {pipelineStages.map((stage) => (
            <div
              key={stage.level}
              onClick={() => onNavigateToProspects(stage.level)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md transform hover:-translate-y-0.5 text-center flex flex-col justify-between ${stage.color}`}
            >
              <div>
                <span className={`inline-block px-2 py-0.5 text-[10px] font-extrabold rounded-full mb-2 ${stage.badgeColor}`}>
                  {stage.label}
                </span>
                <div className="text-3xl font-black tracking-tight">{stage.count}</div>
              </div>
              <p className="text-[11px] font-semibold text-slate-600 mt-2 truncate">
                {stage.sub}
              </p>
            </div>
          ))}
        </div>

        {/* Dropped Category Card */}
        <div className="mt-3 flex items-center justify-between p-3.5 bg-rose-50 border border-rose-200 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-200 text-rose-800 flex items-center justify-center font-bold text-sm">
              {summary.bb_dropped}
            </div>
            <div>
              <p className="text-xs font-bold text-rose-900">
                BB Dropped Students ({summary.bb_dropped})
              </p>
              <p className="text-[11px] text-rose-700">
                Students discontinued with categorized reasons (Work, Family Matters, etc.).
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateToProspects('BB Dropped')}
            className="px-3.5 py-1.5 bg-white text-rose-700 hover:bg-rose-100 font-bold text-xs rounded-xl border border-rose-300 transition-colors"
          >
            View Dropped List
          </button>
        </div>
      </div>

      {/* Grid: My Referred Students & Recent Scoped Registrations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Referred Students Card */}
        <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                My Direct Referrals ({myReferredProspects.length})
              </h3>
              <p className="text-xs text-slate-500">
                Students who registered through your code: <strong>{effectiveRefCode}</strong>
              </p>
            </div>
            <button
              onClick={() => onNavigateToProspects()}
              className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1"
            >
              <span>Manage Pipeline</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {myReferredProspects.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
              No students registered through your referral link yet. Click "Copy Link" above and share it with seekers!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold">
                    <th className="pb-2">Student</th>
                    <th className="pb-2">Level</th>
                    <th className="pb-2">Location</th>
                    <th className="pb-2 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {myReferredProspects.slice(0, 5).map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 font-bold text-slate-900">{p.name}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                          {p.prospect_level}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-500">
                        {p.city ? `${p.city}, ` : ''}{p.province}
                      </td>
                      <td className="py-2.5 text-right text-slate-400 font-mono text-[11px]">
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Scoped Registrations */}
        <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Recent Scoped Registrations
              </h3>
              <p className="text-xs text-slate-500">
                Latest students recognized under your role jurisdiction
              </p>
            </div>
            <button
              onClick={() => onNavigateToProspects()}
              className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {visibleProspects.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
              No students recorded in this date range.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold">
                    <th className="pb-2">Student</th>
                    <th className="pb-2">Level</th>
                    <th className="pb-2">Referrer</th>
                    <th className="pb-2 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {visibleProspects.slice(0, 5).map((p) => {
                    const ref = appStore.getProfileById(p.referred_by_member_id);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 font-bold text-slate-900">{p.name}</td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {p.prospect_level}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-600">
                          {ref ? ref.name : 'Unknown'}
                        </td>
                        <td className="py-2.5 text-right text-slate-400 font-mono text-[11px]">
                          {new Date(p.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
