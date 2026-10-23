import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { appStore } from '../services/store';
import { UserPlus, Shield, X, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { generateNextAreaReferralCode } from '../utils/areaCodeGenerator';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ALL_ROLES: UserRole[] = [
  'Super Admin',
  'Admin',
  'Regional Leader',
  'Area Leader',
  'Area Somu',
  'Gwajang',
  'Somu',
  'Banjang',
  'Jeondo Gyo-gwan',
  'BB Gyo-gwan',
  'Department TJN',
  'Section Leader',
  'Member',
];

export const AddMemberModal: React.FC<AddMemberModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [serialNumber, setSerialNumber] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [area, setArea] = useState('');
  const [region, setRegion] = useState('');
  const [duty, setDuty] = useState('');
  const [section, setSection] = useState('');
  const [teamLeader, setTeamLeader] = useState('');
  const [ban, setBan] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleToggleRole = (role: UserRole) => {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter((r) => r !== role));
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!serialNumber.trim()) {
      setError('Serial number is required.');
      return;
    }
    if (!name.trim()) {
      setError('Full name is required.');
      return;
    }
    if (selectedRoles.length === 0) {
      setError('Access Based on Role is required (select at least 1 role).');
      return;
    }

    const existing = appStore.getProfileBySerialNumber(serialNumber.trim());
    if (existing) {
      setError('An account with this Serial Number already exists.');
      return;
    }

    setLoading(true);
    try {
      const result = await appStore.registerLeaderOrMemberAccount({
        serial_number: serialNumber.trim().toUpperCase(),
        name: name.trim(),
        department: department.trim(),
        area: area.trim(),
        region: region.trim(),
        duty: duty.trim(),
        section: section.trim(),
        team_leader: teamLeader.trim(),
        ban: ban.trim(),
        role: selectedRoles,
      });

      if (!result.success) {
        setError(result.error || 'Failed to create account.');
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 text-slate-900 max-h-[90vh] flex flex-col relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-900">
              Register Leader / Member Account
            </h3>
            <p className="text-xs text-slate-500">
              Generates unique login credentials (default password: <code>default43</code> with first-login change requirement).
            </p>
          </div>
        </div>

        {error && (
          <div className="my-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 flex-shrink-0">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto py-3 space-y-4 flex-grow pr-1 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Serial Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value.toUpperCase())}
                placeholder="e.g. MEM-905, AL-302"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Brother Joel Bautista"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Department
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Area
              </label>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Region
              </label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Duty
              </label>
              <input
                type="text"
                value={duty}
                onChange={(e) => setDuty(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Section
              </label>
              <input
                type="text"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Ban
              </label>
              <input
                type="text"
                value={ban}
                onChange={(e) => setBan(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Team Leader
            </label>
            <input
              type="text"
              value={teamLeader}
              onChange={(e) => setTeamLeader(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
            />
          </div>

          {/* Access Roles Multi-select */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Access Based on Role (1 or more) <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ALL_ROLES.map((r) => {
                const isSelected = selectedRoles.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleToggleRole(r)}
                    className={`p-2 rounded-xl text-xs font-medium text-left transition-all border ${
                      isSelected
                        ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{r}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md text-xs sm:text-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
