import React, { useState } from 'react';
import { Prospect } from '../types';
import { appStore } from '../services/store';
import { UserCheck, Calendar, Clock, MessageSquare, X, AlertCircle } from 'lucide-react';

interface UpgradeToTtagiModalProps {
  prospect: Prospect;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const UpgradeToTtagiModal: React.FC<UpgradeToTtagiModalProps> = ({
  prospect,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [meetingRemarks, setMeetingRemarks] = useState(
    prospect.meeting_remarks || 'Finished introductory meeting with BB Teacher. Ready to commence foundational lessons.'
  );
  const [meetingMode, setMeetingMode] = useState<'Online' | 'Onsite'>(
    prospect.meeting_mode || (prospect.program === 'Onsite' ? 'Onsite' : 'Online')
  );
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('18:00');
  const [assignedBBTeacherId, setAssignedBBTeacherId] = useState(
    prospect.assigned_bb_teacher_id || 'u-bbgyogwan-01'
  );
  const [error, setError] = useState('');

  const teachers = appStore.getBBTeachers();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!meetingRemarks.trim()) {
      setError('Please input meeting remarks from the introductory study.');
      return;
    }
    if (!scheduleDate) {
      setError('Please specify the next meeting schedule.');
      return;
    }
    if (!assignedBBTeacherId) {
      setError('Please assign a BB Teacher.');
      return;
    }

    const fullSchedule = `${scheduleDate}T${scheduleTime || '00:00'}:00Z`;
    const res = appStore.upgradeToTtagi(
      prospect.id,
      meetingRemarks.trim(),
      fullSchedule,
      assignedBBTeacherId,
      meetingMode
    );

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setError(res.message || 'Failed to upgrade to Ttagi.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 text-slate-900 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 uppercase tracking-wider">
              Pipeline Stage 3
            </span>
            <h3 className="text-lg font-extrabold text-slate-900">
              Upgrade to Ttagi
            </h3>
            <p className="text-xs text-slate-500">
              Student: <strong>{prospect.name}</strong> ({prospect.contact_number})
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-purple-50/60 border border-purple-100 rounded-2xl p-3.5 mb-5 text-xs text-purple-900 leading-relaxed">
          <p className="font-semibold mb-1">Ttagi Role Rule (Allowed for all except Section Leader & Member):</p>
          <p className="text-purple-800/90">
            Student has finished the introductory meeting with the BB Teacher. Record the meeting remarks, assign the official BB Teacher, and book their lesson schedule.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Meeting Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Meeting Remarks <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <textarea
                required
                rows={3}
                value={meetingRemarks}
                onChange={(e) => setMeetingRemarks(e.target.value)}
                placeholder="Details about student reception, initial impressions, topics introduced..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
              />
            </div>
          </div>

          {/* Next Meeting Schedule */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Next Meeting Schedule <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <input
                  type="date"
                  required
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Clock className="w-4 h-4" />
                </div>
                <input
                  type="time"
                  required
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
                />
              </div>
            </div>
          </div>

          {/* Meeting Mode */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Meeting Mode <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-bold transition-all ${
                  meetingMode === 'Online'
                    ? 'bg-purple-50 border-purple-400 text-purple-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <input
                  type="radio"
                  name="ttagi_mode"
                  value="Online"
                  checked={meetingMode === 'Online'}
                  onChange={() => setMeetingMode('Online')}
                  className="sr-only"
                />
                <span>Online (Zoom/Meet)</span>
              </label>

              <label
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-bold transition-all ${
                  meetingMode === 'Onsite'
                    ? 'bg-purple-50 border-purple-400 text-purple-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <input
                  type="radio"
                  name="ttagi_mode"
                  value="Onsite"
                  checked={meetingMode === 'Onsite'}
                  onChange={() => setMeetingMode('Onsite')}
                  className="sr-only"
                />
                <span>Onsite (In-Person)</span>
              </label>
            </div>
          </div>

          {/* Assign a BB Teacher */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Assign BB Teacher <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={assignedBBTeacherId}
              onChange={(e) => setAssignedBBTeacherId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
            >
              <option value="">Select a BB Teacher / Instructor</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.serial_number}) — {t.duty} [{t.area}]
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl shadow-md text-xs sm:text-sm transition-colors"
            >
              Confirm Ttagi Upgrade
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
