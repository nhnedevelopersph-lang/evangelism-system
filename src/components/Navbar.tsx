import React, { useState } from 'react';
import { Profile, UserRole } from '../types';
import { appStore } from '../services/store';
import {
  Users,
  Shield,
  Key,
  LogOut,
  ExternalLink,
  Database,
  UserCheck,
  ChevronDown,
  Layers,
  Sparkles,
  UserPlus
} from 'lucide-react';

interface NavbarProps {
  currentUser: Profile | null;
  activeTab: 'dashboard' | 'prospects' | 'register' | 'members';
  setActiveTab: (tab: 'dashboard' | 'prospects' | 'register' | 'members') => void;
  onOpenSqlModal: () => void;
  onOpenProfileModal: () => void;
  onOpenLoginModal: () => void;
  onOpenAddMemberModal: () => void;
  onOpenCsvImport?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onOpenSqlModal,
  onOpenProfileModal,
  onOpenLoginModal,
  onOpenAddMemberModal,
  onOpenCsvImport,
}) => {
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const profiles = appStore.getAllProfiles();

  const handleSwitchUser = (profile: Profile) => {
    appStore.setCurrentUser(profile);
    setShowRoleSwitcher(false);
  };

  const handleLogout = () => {
    appStore.setCurrentUser(null);
    onOpenLoginModal();
  };

  const getRoleBadgeColor = (roles: UserRole[]) => {
    if (roles.includes('Super Admin')) return 'bg-amber-100 text-amber-800 border-amber-300';
    if (roles.includes('Admin')) return 'bg-purple-100 text-purple-800 border-purple-300';
    if (roles.includes('Regional Leader')) return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    if (roles.includes('Area Leader')) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (roles.includes('BB Gyo-gwan')) return 'bg-teal-100 text-teal-800 border-teal-300';
    if (roles.includes('Section Leader')) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    return 'bg-slate-100 text-slate-700 border-slate-300';
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="relative w-12 h-12 flex-shrink-0">
              <img
                src="/assets/aistudio/Zion_Christian_Mission_Center_-_Logo_ab51933b.png"
                alt="Zion Christian Mission Center Logo"
                className="w-12 h-12 object-contain rounded-full shadow-xs hover:scale-105 transition-transform"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-xl text-[#034ea2] tracking-tight flex items-center gap-1.5">
                  Zion Christian Mission Center
                </span>
                <span className="hidden md:inline-flex px-2 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                  Free Bible Study
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                Evangelism Referral & Student Pipeline Management
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3.5 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-white text-[#034ea2] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                Pipeline Dashboard
              </span>
            </button>
            <button
              onClick={() => setActiveTab('prospects')}
              className={`px-3.5 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'prospects'
                  ? 'bg-white text-[#034ea2] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-600" />
                Students & BB Lessons
              </span>
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`px-3.5 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'members'
                  ? 'bg-white text-[#034ea2] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-purple-600" />
                Members & Workers
              </span>
            </button>
            <button
              onClick={() => setActiveTab('register')}
              className={`px-3.5 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'register'
                  ? 'bg-white text-[#034ea2] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <ExternalLink className="w-4 h-4 text-amber-500" />
                Public Registration Form
              </span>
            </button>
          </nav>

          {/* Right Action Tools & User Badge */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* CSV Member Import (Admin only) */}
            {currentUser && (currentUser.role.includes('Super Admin') || currentUser.role.includes('Admin')) && onOpenCsvImport && (
              <button
                onClick={onOpenCsvImport}
                title="CSV Member Import & Area Referral Codes"
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-300 transition-colors"
              >
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>CSV Import</span>
              </button>
            )}

            {/* Supabase Schema Modal Button */}
            <button
              onClick={onOpenSqlModal}
              title="Supabase Schema & Configuration"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors"
            >
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Supabase SQL</span>
            </button>

            {currentUser ? (
              <div className="relative">
                {/* User Role Card */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all text-left group"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                      {currentUser.name.charAt(currentUser.name.startsWith('Brother') || currentUser.name.startsWith('Sister') ? 8 : 0) || 'Z'}
                    </div>
                    <div className="hidden sm:block text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 max-w-[130px] truncate">
                          {currentUser.name}
                        </span>
                        <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-transform" />
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <span className="font-mono font-medium text-blue-700">{currentUser.serial_number}</span>
                        <span>•</span>
                        <span className="truncate max-w-[100px]">{currentUser.role[0]}</span>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Dropdown Menu for Switching Role / Profiles */}
                {showRoleSwitcher && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowRoleSwitcher(false)}
                    />
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/70 rounded-t-2xl">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Active Account
                        </p>
                        <p className="text-sm font-extrabold text-slate-900">{currentUser.name}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {currentUser.role.map((r) => (
                            <span
                              key={r}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRoleBadgeColor(
                                [r]
                              )}`}
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                        <div className="mt-2 text-[11px] text-slate-500 space-y-0.5">
                          <p>
                            <span className="font-semibold text-slate-700">Area:</span> {currentUser.area} |{' '}
                            <span className="font-semibold text-slate-700">Region:</span> {currentUser.region}
                          </p>
                          <p>
                            <span className="font-semibold text-slate-700">Ban:</span> {currentUser.ban} |{' '}
                            <span className="font-semibold text-slate-700">Section:</span> {currentUser.section}
                          </p>
                        </div>
                      </div>

                      {/* Fast Role Switcher Section */}
                      <div className="px-3 py-2 border-b border-slate-100">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs font-bold text-slate-700 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            Fast Switch Test Role:
                          </p>
                          <span className="text-[10px] text-slate-400">Instant RBAC preview</span>
                        </div>
                        <div className="max-h-52 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                          {profiles.map((p) => {
                            const isCurrent = p.id === currentUser.id;
                            return (
                              <button
                                key={p.id}
                                onClick={() => handleSwitchUser(p)}
                                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                                  isCurrent
                                    ? 'bg-blue-50 text-blue-900 font-bold border border-blue-200'
                                    : 'hover:bg-slate-100 text-slate-700'
                                }`}
                              >
                                <div className="truncate">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-[10px] text-slate-500 bg-slate-200 px-1 py-0.2 rounded">
                                      {p.serial_number}
                                    </span>
                                    <span className="truncate font-semibold">{p.name}</span>
                                  </div>
                                  <span className="text-[10px] text-slate-400 block truncate">
                                    {p.role.join(', ')} • {p.area}
                                  </span>
                                </div>
                                {isCurrent && (
                                  <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Add Member (Admin action) */}
                      {appStore.isSuperAdminOrAdmin() && (
                        <div className="px-3 py-1.5 border-b border-slate-100">
                          <button
                            onClick={() => {
                              setShowRoleSwitcher(false);
                              onOpenAddMemberModal();
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                            Register New Member / Staff
                          </button>
                        </div>
                      )}

                      {/* Account Actions */}
                      <div className="p-1 space-y-0.5">
                        <button
                          onClick={() => {
                            setShowRoleSwitcher(false);
                            onOpenProfileModal();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                          View My Profile & Credentials
                        </button>
                        <button
                          onClick={() => {
                            setShowRoleSwitcher(false);
                            handleLogout();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5 text-rose-500" />
                          Log Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenLoginModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors"
              >
                <Key className="w-3.5 h-3.5" />
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="lg:hidden flex items-center justify-around py-2 border-t border-slate-100 text-xs">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-1 px-2.5 rounded-lg font-semibold flex items-center gap-1 ${
              activeTab === 'dashboard' ? 'text-blue-700 bg-blue-50' : 'text-slate-600'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('prospects')}
            className={`py-1 px-2.5 rounded-lg font-semibold flex items-center gap-1 ${
              activeTab === 'prospects' ? 'text-blue-700 bg-blue-50' : 'text-slate-600'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Students
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={`py-1 px-2.5 rounded-lg font-semibold flex items-center gap-1 ${
              activeTab === 'register' ? 'text-blue-700 bg-blue-50' : 'text-slate-600'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Registration
          </button>
        </div>
      </div>
    </header>
  );
};
