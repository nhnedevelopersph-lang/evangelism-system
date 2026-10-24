import React, { useState } from 'react';
import { Prospect } from '../types';
import { appStore } from '../services/store';
import { Calendar, Clock, BookMarked, X, AlertCircle } from 'lucide-react';

interface UpgradeToBBHapdangModalProps {
  prospect: Prospect;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const UpgradeToBBHapdangModal: React.FC<UpgradeToBBHapdangModalProps> = ({
  prospect,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('19:00');
  const [remarks, setRemarks] = useState(prospect.meeting_remarks || '');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!scheduleDate) {
      setError('Please select a date for the meeting with the BB Teacher.');
      return;
    }

    const fullSchedule = `${scheduleDate}T${scheduleTime || '00:00'}:00Z`;
    const res = appStore.upgradeToBBHapdang(prospect.id, fullSchedule, remarks);

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setError(res.message || 'Failed to upgrade to BB Hapdang.');
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
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <BookMarked className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 uppercase tracking-wider">
              Pipeline Stage 2
            </span>
            <h3 className="text-lg font-extrabold text-slate-900">
              Upgrade to BB Hapdang
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

        <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-3.5 mb-5 text-xs text-blue-900 leading-relaxed">
          <p className="font-semibold mb-1">BB Hapdang Requirement (Section Leader & Above):</p>
          <p className="text-blue-800/90">
            Qualifies the registered prospect to advance into BB study. Set the date and time for the introductory meeting with the assigned BB Teacher.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Schedule Date & Time */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Next Meeting Schedule with BB Teacher <span className="text-rose-500">*</span>
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
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
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
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>

          {/* Meeting Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Initial Remarks / Background Notes <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Student prefers evening classes; has background in Matthew 13..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
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
              className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-md text-xs sm:text-sm transition-colors"
            >
              Confirm BB Hapdang Upgrade
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
