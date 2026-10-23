import React, { useState } from 'react';
import { Profile } from '../types';
import { appStore } from '../services/store';
import {
  UserCheck,
  Shield,
  KeyRound,
  Lock,
  RotateCcw,
  X,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  Share2,
  Link as LinkIcon
} from 'lucide-react';

interface ProfileModalProps {
  user: Profile;
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ user, isOpen, onClose }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  if (!isOpen) return null;

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);

    if (newPassword.length < 6) {
      setPwError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match.');
      return;
    }

    const res = await appStore.updatePassword(user.id, newPassword);
    if (res.success) {
      setPwSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwSuccess(false), 3000);
    } else {
      setPwError(res.message || 'Failed to update password.');
    }
  };

  const handleResetData = () => {
    if (window.confirm('Reset all demo data back to default initial seed records?')) {
      appStore.resetToSeeds();
      alert('System data reset to initial seed state.');
      onClose();
    }
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

        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-900">
              Worker Profile & Credentials
            </h3>
            <p className="text-xs text-slate-500">
              Serial Number: <span className="font-mono font-bold text-blue-700">{user.serial_number}</span>
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto py-4 space-y-5 flex-grow pr-1 custom-scrollbar">
          {/* Member Unique Registration Link */}
          <div className="bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-200 rounded-2xl p-4 text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-blue-950 text-sm flex items-center gap-1.5">
                <LinkIcon className="w-4 h-4 text-blue-700" />
                My Registration Link
              </h4>
              <span className="font-mono text-[11px] font-bold text-blue-800 bg-blue-100/80 px-2 py-0.5 rounded border border-blue-300">
                Code: {user.referral_code || user.serial_number}
              </span>
            </div>
            <p className="text-[11px] text-slate-600">
              Share your personal link with prospective students. Any prospect who registers through this link will be automatically attributed to you for follow-up and study coordination.
            </p>

            {/* Link Box */}
            <div className="flex items-center gap-2 bg-white border border-blue-200 rounded-xl p-1.5 shadow-xs">
              <input
                type="text"
                readOnly
                value={`${typeof window !== 'undefined' ? window.location.origin : 'https://zionchristianmissioncenter.org'}/register/${user.referral_code || user.serial_number}`}
                className="w-full bg-transparent px-2 text-xs font-mono text-slate-700 outline-none select-all"
              />
            </div>

            {/* Action Buttons: Copy Link, Open Link, Share */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  const link = `${typeof window !== 'undefined' ? window.location.origin : 'https://zionchristianmissioncenter.org'}/register/${user.referral_code || user.serial_number}`;
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(link);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }
                }}
                className="flex-1 min-w-[100px] py-2 px-3 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const link = `${typeof window !== 'undefined' ? window.location.origin : 'https://zionchristianmissioncenter.org'}/register/${user.referral_code || user.serial_number}`;
                  window.open(link, '_blank');
                }}
                className="py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-300 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                <span>Open Link</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const link = `${typeof window !== 'undefined' ? window.location.origin : 'https://zionchristianmissioncenter.org'}/register/${user.referral_code || user.serial_number}`;
                  if (navigator.share) {
                    navigator.share({
                      title: 'Zion Christian Mission Center - Free Bible Study',
                      text: `Hello! Discover the mysteries and fulfilled covenants of the Holy Scriptures. Register with Zion Christian Mission Center here:`,
                      url: link,
                    }).catch(() => {});
                  } else if (navigator.clipboard) {
                    navigator.clipboard.writeText(link);
                    setShareSuccess(true);
                    setTimeout(() => setShareSuccess(false), 2000);
                  }
                }}
                className="py-2 px-3 bg-sky-100 hover:bg-sky-200 text-sky-900 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-sky-200 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5 text-sky-700" />
                <span>{shareSuccess ? 'Link Copied!' : 'Share'}</span>
              </button>
            </div>
          </div>

          {/* Member Details Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2.5">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <span className="text-slate-500">Full Name</span>
              <span className="font-extrabold text-slate-900 text-sm">{user.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Assigned Roles</span>
              <span className="font-bold text-blue-700">{user.role.join(', ')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Duty</span>
              <span className="font-semibold text-slate-800">{user.duty}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Department</span>
              <span className="font-semibold text-slate-800">{user.department}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Area & Region</span>
              <span className="font-semibold text-slate-800">{user.area} ({user.region})</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Ban & Section</span>
              <span className="font-semibold text-slate-800">{user.ban} • {user.section}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Team Leader</span>
              <span className="font-semibold text-slate-800">{user.team_leader}</span>
            </div>
          </div>

          {/* Change Password Form */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-blue-600" />
              Update Account Password
            </h4>

            {pwError && (
              <div className="mb-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {pwError}
              </div>
            )}
            {pwSuccess && (
              <div className="mb-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Password updated successfully!
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                >
                  Save New Password
                </button>
              </div>
            </form>
          </div>

          {/* Reset Demo Data */}
          <div className="pt-2 flex justify-between items-center text-xs">
            <span className="text-slate-400">Need to restore clean demo database?</span>
            <button
              type="button"
              onClick={handleResetData}
              className="text-slate-500 hover:text-rose-600 flex items-center gap-1 font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Demo Records
            </button>
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
