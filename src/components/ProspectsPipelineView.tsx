import React, { useState } from 'react';
import { Prospect, Profile, ProspectLevel, ProgramType } from '../types';
import { appStore } from '../services/store';
import {
  Users,
  Search,
  Filter,
  Phone,
  MessageSquare,
  BookOpen,
  ArrowUpRight,
  UserCheck,
  UserMinus,
  CheckCircle2,
  Calendar,
  Clock,
  ExternalLink,
  RotateCcw,
  ShieldAlert,
  GraduationCap
} from 'lucide-react';

interface ProspectsPipelineViewProps {
  currentUser: Profile;
  initialLevelFilter?: string;
  onOpenUpgradeBBHapdang: (prospect: Prospect) => void;
  onOpenUpgradeTtagi: (prospect: Prospect) => void;
  onOpenLessonsTracker: (prospect: Prospect) => void;
  onOpenDropModal: (prospect: Prospect) => void;
  onOpenFollowUpModal: (prospect: Prospect) => void;
}

export const ProspectsPipelineView: React.FC<ProspectsPipelineViewProps> = ({
  currentUser,
  initialLevelFilter = 'ALL',
  onOpenUpgradeBBHapdang,
  onOpenUpgradeTtagi,
  onOpenLessonsTracker,
  onOpenDropModal,
  onOpenFollowUpModal,
}) => {
  const [levelFilter, setLevelFilter] = useState<string>(initialLevelFilter);
  const [programFilter, setProgramFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const visibleProspects = appStore.getVisibleProspects();

  // Filter prospects
  const filtered = visibleProspects.filter((p) => {
    if (levelFilter !== 'ALL' && p.prospect_level !== levelFilter) {
      return false;
    }
    if (programFilter !== 'ALL' && p.program !== programFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const ref = appStore.getProfileById(p.referred_by_member_id);
      const matchesName = p.name.toLowerCase().includes(q);
      const matchesPhone = p.contact_number.includes(q);
      const matchesCity = (p.city || '').toLowerCase().includes(q);
      const matchesProvince = p.province.toLowerCase().includes(q);
      const matchesRef = ref ? ref.name.toLowerCase().includes(q) || ref.serial_number.toLowerCase().includes(q) : false;
      return matchesName || matchesPhone || matchesCity || matchesProvince || matchesRef;
    }
    return true;
  });

  const getLevelBadge = (level: ProspectLevel) => {
    switch (level) {
      case 'Chatgi':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'BB Hapdang':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Ttagi':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'Soebweh':
        return 'bg-teal-100 text-teal-800 border-teal-300';
      case 'BB':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'Center Hapdang':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Center':
        return 'bg-green-100 text-green-900 border-green-400 font-extrabold';
      case 'BB Dropped':
        return 'bg-rose-100 text-rose-800 border-rose-300 line-through';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const handleRestore = (prospectId: string) => {
    if (window.confirm('Restore this dropped student back to the active pipeline?')) {
      appStore.restoreProspect(prospectId, 'Chatgi');
    }
  };

  return (
    <div className="space-y-5">
      {/* Search and Filters Header */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, contact, city, or referrer..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          {/* Level Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {[
              { id: 'ALL', label: 'All Levels' },
              { id: 'Chatgi', label: 'Chatgi' },
              { id: 'BB Hapdang', label: 'BB Hapdang' },
              { id: 'Ttagi', label: 'Ttagi' },
              { id: 'Soebweh', label: 'Soebweh' },
              { id: 'BB', label: 'BB' },
              { id: 'Center Hapdang', label: 'Center Hapdang' },
              { id: 'Center', label: 'Center' },
              { id: 'BB Dropped', label: 'Dropped' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setLevelFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  levelFilter === tab.id
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Filter: Program Mode */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Program Mode:</span>
            {['ALL', 'Online', 'Onsite', 'SPS'].map((prog) => (
              <button
                key={prog}
                onClick={() => setProgramFilter(prog)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  programFilter === prog
                    ? 'bg-slate-800 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {prog === 'ALL' ? 'All Modes' : prog}
              </button>
            ))}
          </div>

          <span className="font-medium">
            Showing <strong>{filtered.length}</strong> of {visibleProspects.length} students
          </span>
        </div>
      </div>

      {/* Prospects Data Table */}
      <div className="bg-white rounded-3xl shadow-xs border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="font-bold text-slate-600">No students found matching your criteria</p>
            <p className="text-xs text-slate-400 mt-1">
              Try adjusting your search query, level filters, or role jurisdiction.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-extrabold tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Student & Contact</th>
                  <th className="py-3.5 px-3">Level Status</th>
                  <th className="py-3.5 px-3">Program & Sched</th>
                  <th className="py-3.5 px-3">BB Teacher & Lessons</th>
                  <th className="py-3.5 px-3">Referrer (Member)</th>
                  <th className="py-3.5 px-4 text-right">Pipeline Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((prospect) => {
                  const ref = appStore.getProfileById(prospect.referred_by_member_id);
                  const teacher = prospect.assigned_bb_teacher_id
                    ? appStore.getProfileById(prospect.assigned_bb_teacher_id)
                    : null;
                  const lessons = appStore.getLessonsForProspect(prospect.id);
                  const canCall = appStore.canCallOrTextProspect(prospect);
                  const canUpgradeBB = appStore.canUpgradeToBBHapdang();
                  const canUpgradeTtagi = appStore.canUpgradeToTtagi();
                  const canApproveCenter = appStore.canApproveCenter();

                  return (
                    <tr
                      key={prospect.id}
                      className="hover:bg-blue-50/40 transition-colors group"
                    >
                      {/* Name, Phone, Location */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center flex-shrink-0 text-xs border border-slate-200">
                            {prospect.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-slate-900 text-sm">
                                {prospect.name}
                              </span>
                              {prospect.gender && (
                                <span className="text-[10px] text-slate-400 font-normal">
                                  ({prospect.gender})
                                </span>
                              )}
                            </div>
                            <p className="text-slate-500 font-mono text-[11px] mt-0.5">
                              {prospect.contact_number}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {prospect.city ? `${prospect.city}, ` : ''}{prospect.province}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Level Badge */}
                      <td className="py-3.5 px-3">
                        <div>
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getLevelBadge(
                              prospect.prospect_level
                            )}`}
                          >
                            {prospect.prospect_level}
                          </span>

                          {prospect.prospect_level === 'BB Dropped' && prospect.dropping_reason && (
                            <span className="block text-[10px] text-rose-600 font-semibold mt-1">
                              Reason: {prospect.dropping_reason}
                            </span>
                          )}

                          {prospect.center_registration_completed && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded mt-1 font-semibold">
                              <CheckCircle2 className="w-3 h-3" /> Form Done
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Program & Schedule */}
                      <td className="py-3.5 px-3">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-800">
                            {prospect.program ? `${prospect.program} Study` : 'Not Assigned'}
                          </span>
                          {prospect.next_meeting_schedule && (
                            <div className="flex items-center gap-1 text-[11px] text-blue-700 font-medium">
                              <Clock className="w-3 h-3 text-blue-500 flex-shrink-0" />
                              <span>{new Date(prospect.next_meeting_schedule).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Assigned BB Teacher & Lesson Count */}
                      <td className="py-3.5 px-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-800">
                              {teacher ? teacher.name : <span className="text-slate-400 italic">None</span>}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                              {lessons.length} Lesson{lessons.length === 1 ? '' : 's'} Done
                            </span>
                            <button
                              onClick={() => onOpenLessonsTracker(prospect)}
                              title="Open BB Lesson Tracker"
                              className="text-slate-400 hover:text-teal-700 p-0.5 hover:bg-slate-100 rounded"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Referrer Info */}
                      <td className="py-3.5 px-3">
                        <div>
                          <p className="font-bold text-slate-900">{ref ? ref.name : 'General Intake'}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                              {ref ? (ref.referral_code || ref.serial_number) : 'HQ-DIRECT'}
                            </span>
                            {ref?.area && (
                              <span className="text-[10px] text-slate-500 font-medium truncate max-w-[100px]">
                                • {ref.area}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Reg: {new Date(prospect.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Follow-up / Call / Text Button */}
                          <button
                            onClick={() => onOpenFollowUpModal(prospect)}
                            title={canCall ? 'Call / Text / Log Follow-up' : 'View Follow-up History'}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition-colors"
                          >
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>Contact</span>
                          </button>

                          {/* Upgrade to BB Hapdang (Chatgi -> BB Hapdang) */}
                          {prospect.prospect_level === 'Chatgi' && canUpgradeBB && (
                            <button
                              onClick={() => onOpenUpgradeBBHapdang(prospect)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-2xs transition-colors"
                            >
                              <ArrowUpRight className="w-3 h-3" />
                              <span>To BB Hapdang</span>
                            </button>
                          )}

                          {/* Upgrade to Ttagi (BB Hapdang -> Ttagi) */}
                          {prospect.prospect_level === 'BB Hapdang' && canUpgradeTtagi && (
                            <button
                              onClick={() => onOpenUpgradeTtagi(prospect)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-600 text-white hover:bg-purple-700 shadow-2xs transition-colors"
                            >
                              <UserCheck className="w-3 h-3" />
                              <span>To Ttagi</span>
                            </button>
                          )}

                          {/* BB Lessons Tracker Button */}
                          {prospect.prospect_level !== 'Chatgi' && prospect.prospect_level !== 'BB Dropped' && (
                            <button
                              onClick={() => onOpenLessonsTracker(prospect)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-teal-50 text-teal-800 border border-teal-300 hover:bg-teal-100 transition-colors"
                            >
                              <BookOpen className="w-3 h-3 text-teal-600" />
                              <span>Lessons</span>
                            </button>
                          )}

                          {/* Approve Center Button (Center Hapdang -> Center) */}
                          {prospect.prospect_level === 'Center Hapdang' && canApproveCenter && (
                            <button
                              onClick={() => onOpenLessonsTracker(prospect)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-green-700 text-white hover:bg-green-800 shadow-2xs transition-colors"
                            >
                              <GraduationCap className="w-3.5 h-3.5" />
                              <span>Approve Center</span>
                            </button>
                          )}

                          {/* Drop Student Button */}
                          {prospect.prospect_level !== 'BB Dropped' && prospect.prospect_level !== 'Center' && (
                            <button
                              onClick={() => onOpenDropModal(prospect)}
                              title="Record as Dropped"
                              className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          )}

                          {/* Restore Dropped Student */}
                          {prospect.prospect_level === 'BB Dropped' && (
                            <button
                              onClick={() => handleRestore(prospect.id)}
                              title="Restore to Active Pipeline"
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Restore</span>
                            </button>
                          )}
                        </div>
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
  );
};
