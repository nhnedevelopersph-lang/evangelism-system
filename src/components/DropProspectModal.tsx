import React, { useState } from 'react';
import { Prospect } from '../types';
import { DROPPING_REASONS } from '../data/constants';
import { appStore } from '../services/store';
import { UserMinus, AlertTriangle, X } from 'lucide-react';

interface DropProspectModalProps {
  prospect: Prospect;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DropProspectModal: React.FC<DropProspectModalProps> = ({
  prospect,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState(DROPPING_REASONS[0]);
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!reason) {
      setError('Please select a valid dropping reason from the protocol list.');
      return;
    }

    const res = appStore.dropProspect(prospect.id, reason, remarks);
    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setError(res.message || 'Failed to update dropping status.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 text-slate-900 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center">
            <UserMinus className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 uppercase tracking-wider">
              Status Change: Dropped
            </span>
            <h3 className="text-lg font-extrabold text-slate-900">
              Record Student Dropping
            </h3>
            <p className="text-xs text-slate-500">
              Student: <strong>{prospect.name}</strong>
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Protocol Dropping Reason <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:bg-white focus:border-rose-600 focus:ring-2 focus:ring-rose-100"
            >
              {DROPPING_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
              Selected from the official 28 ZCMC validation categories.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Detailed Notes / Explanatory Remarks
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Relocated to another city for work; phone unanswered after 3 follow-ups..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:bg-white focus:border-rose-600 focus:ring-2 focus:ring-rose-100"
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
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md text-xs sm:text-sm transition-colors"
            >
              Confirm BB Dropped
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
