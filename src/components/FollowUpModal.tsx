import React, { useState } from 'react';
import { Prospect, Profile } from '../types';
import { appStore } from '../services/store';
import { Phone, MessageSquare, Clock, Plus, X, User, ShieldCheck } from 'lucide-react';

interface FollowUpModalProps {
  prospect: Prospect;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const FollowUpModal: React.FC<FollowUpModalProps> = ({
  prospect,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [logType, setLogType] = useState<'call' | 'sms' | 'meeting' | 'note'>('call');
  const [logNotes, setLogNotes] = useState('');

  if (!isOpen) return null;

  const logs = appStore.getFollowUpsForProspect(prospect.id);
  const referrer = appStore.getProfileById(prospect.referred_by_member_id);
  const currentUser = appStore.getCurrentUser();
  const canContact = appStore.canCallOrTextProspect(prospect);

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logNotes.trim()) return;

    appStore.addFollowUpLog(prospect.id, logType, logNotes);
    setLogNotes('');
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 text-slate-900 max-h-[90vh] flex flex-col relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Phone className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider">
              Student Communication & Follow-up
            </span>
            <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">
              {prospect.name}
            </h3>
            <p className="text-xs text-slate-500">
              Referred by:{' '}
              <strong className="text-slate-800">
                {referrer ? `${referrer.name} (${referrer.serial_number})` : 'General'}
              </strong>{' '}
              • Section: {referrer?.section || 'N/A'}
            </p>
          </div>
        </div>

        {/* Quick Contact Action Buttons */}
        <div className="py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <a
              href={`tel:${prospect.contact_number}`}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-colors text-xs sm:text-sm"
            >
              <Phone className="w-4 h-4" />
              <span>Call ({prospect.contact_number})</span>
            </a>
            <a
              href={`sms:${prospect.contact_number}`}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-xs transition-colors text-xs sm:text-sm"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Send SMS Text</span>
            </a>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 text-center">
            Per guidelines, calling and texting is authorized for the registering Member, their Section Leader, and Area overseers.
          </p>
        </div>

        {/* Scrollable Log History */}
        <div className="overflow-y-auto py-3 space-y-3 flex-grow pr-1 custom-scrollbar">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Communication History ({logs.length})
          </h4>

          {logs.length === 0 ? (
            <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
              No follow-up notes logged yet. Record your conversation or SMS exchange below.
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => {
                const performer = appStore.getProfileById(log.performed_by_id);
                return (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                        {log.type === 'call' && <Phone className="w-3 h-3 text-emerald-600" />}
                        {log.type === 'sms' && <MessageSquare className="w-3 h-3 text-sky-600" />}
                        {log.type.toUpperCase()} by {performer?.name || 'Worker'}
                      </span>
                      <span>{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-800">{log.notes}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* New Log Form */}
          <form onSubmit={handleAddLog} className="pt-3 border-t border-slate-100 space-y-2">
            <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Log Follow-Up Activity
            </h5>
            <div className="flex gap-2">
              <select
                value={logType}
                onChange={(e) => setLogType(e.target.value as any)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
              >
                <option value="call">Phone Call</option>
                <option value="sms">SMS Text</option>
                <option value="meeting">Personal Visit</option>
                <option value="note">General Note</option>
              </select>
              <input
                type="text"
                required
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                placeholder="Log follow-up details (e.g. Confirmed attendance for Lesson 1)..."
                className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:border-blue-600"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Save
              </button>
            </div>
          </form>
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
