/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { appStore } from './services/store';
import { Profile, Prospect } from './types';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { ProspectsPipelineView } from './components/ProspectsPipelineView';
import { PublicRegistrationLayout } from './components/PublicRegistrationLayout';
import { LoginModal } from './components/LoginModal';
import { ForcePasswordChangeModal } from './components/ForcePasswordChangeModal';
import { UpgradeToBBHapdangModal } from './components/UpgradeToBBHapdangModal';
import { UpgradeToTtagiModal } from './components/UpgradeToTtagiModal';
import { BBLessonsTrackerModal } from './components/BBLessonsTrackerModal';
import { DropProspectModal } from './components/DropProspectModal';
import { FollowUpModal } from './components/FollowUpModal';
import { SupabaseSqlModal } from './components/SupabaseSqlModal';
import { ProfileModal } from './components/ProfileModal';
import { AddMemberModal } from './components/AddMemberModal';
import { CsvMemberImportModal } from './components/CsvMemberImportModal';
import { MembersListView } from './components/MembersListView';
import { LoginPage } from './components/LoginPage';
import { RegisterAccountView } from './components/RegisterAccountView';

export default function App() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(appStore.getCurrentUser());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'prospects' | 'register' | 'members' | 'login' | 'register-account'>('register');
  const [initialRegistrationRef, setInitialRegistrationRef] = useState<string>('');
  const [prospectsLevelFilter, setProspectsLevelFilter] = useState<string>('ALL');

  // Modal States
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showSqlModal, setShowSqlModal] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState<boolean>(false);
  const [showCsvImportModal, setShowCsvImportModal] = useState<boolean>(false);

  // Target prospect modals
  const [prospectForUpgradeBB, setProspectForUpgradeBB] = useState<Prospect | null>(null);
  const [prospectForUpgradeTtagi, setProspectForUpgradeTtagi] = useState<Prospect | null>(null);
  const [prospectForLessons, setProspectForLessons] = useState<Prospect | null>(null);
  const [prospectForDrop, setProspectForDrop] = useState<Prospect | null>(null);
  const [prospectForFollowUp, setProspectForFollowUp] = useState<Prospect | null>(null);

  // Re-render tick
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsubscribe = appStore.subscribe(() => {
      setCurrentUser(appStore.getCurrentUser());
      setTick((t) => t + 1);
    });
    return unsubscribe;
  }, []);

  // Detect URL path or query parameters (e.g. /register/MEMBER01 or ?ref=...)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const isRootPath = pathname === '/' || pathname === '';

      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref') || params.get('code');
      const tab = params.get('tab');

      // Priority 1: Redirect to /register route if / or homepage is accessed
      if (isRootPath) {
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, '', '/register');
        }
        setActiveTab('register');
        return;
      }

      // Priority 2: Internal Account Registration (/register-account) - Must not conflict with /register/:code
      const isAccountRegPath = pathname === '/register-account' || pathname.startsWith('/register-account');
      if (isAccountRegPath || tab === 'register-account') {
        if (!appStore.getCurrentUser()) {
          if (window.history && window.history.replaceState) {
            window.history.replaceState(null, '', '/login');
          }
          setActiveTab('login');
        } else {
          setActiveTab('register-account');
        }
        return;
      }

      // Priority 3: Public Prospect Registration (/register or /register/:referralCode)
      const pathMatch = pathname.match(/^\/register\/([^/?#]+)$/i);
      const isRegisterPath = pathname === '/register';

      if (pathMatch && pathMatch[1]) {
        setInitialRegistrationRef(decodeURIComponent(pathMatch[1]));
        setActiveTab('register');
      } else if (ref) {
        setInitialRegistrationRef(ref);
        setActiveTab('register');
      } else if (isRegisterPath || tab === 'register') {
        setActiveTab('register');
      } else if (pathname === '/login' || tab === 'login') {
        if (appStore.getCurrentUser()) {
          setActiveTab('dashboard');
        } else {
          setActiveTab('login');
        }
      } else if (pathname === '/prospects' || tab === 'prospects') {
        if (!appStore.getCurrentUser()) {
          if (window.history && window.history.replaceState) {
            window.history.replaceState(null, '', '/login');
          }
          setActiveTab('login');
        } else {
          setActiveTab('prospects');
        }
      } else if (pathname === '/members' || tab === 'members') {
        if (!appStore.getCurrentUser()) {
          if (window.history && window.history.replaceState) {
            window.history.replaceState(null, '', '/login');
          }
          setActiveTab('login');
        } else {
          setActiveTab('members');
        }
      } else if (pathname === '/dashboard' || tab === 'dashboard') {
        if (!appStore.getCurrentUser()) {
          if (window.history && window.history.replaceState) {
            window.history.replaceState(null, '', '/login');
          }
          setActiveTab('login');
        } else {
          setActiveTab('dashboard');
        }
      }
    }
  }, []);

  const handleNavigateToProspectsWithFilter = (level?: string) => {
    if (level) {
      setProspectsLevelFilter(level);
    } else {
      setProspectsLevelFilter('ALL');
    }
    setActiveTab('prospects');
  };

  const handleNavigateToRegister = (refCode?: string) => {
    if (refCode) {
      setInitialRegistrationRef(refCode);
    }
    setActiveTab('register');
  };

  // ---------------------------------------------------------------------------
  // TIER 1: STANDALONE PUBLIC REGISTRATION LAYOUT (Zero Internal Chrome)
  // ---------------------------------------------------------------------------
  if (activeTab === 'register') {
    return (
      <>
        <PublicRegistrationLayout
          referralCode={initialRegistrationRef}
          onOpenPortalLogin={() => {
            if (currentUser) {
              setActiveTab('dashboard');
            } else {
              if (typeof window !== 'undefined' && window.history?.pushState) {
                window.history.pushState(null, '', '/login');
              }
              setActiveTab('login');
            }
          }}
        />

        {/* Login Modal for Leaders clicking Worker Login on Public Page */}
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onSuccess={(user) => {
            setCurrentUser(user);
            setShowLoginModal(false);
            setActiveTab('dashboard');
          }}
        />
      </>
    );
  }

  // ---------------------------------------------------------------------------
  // TIER 1.5: STANDALONE AUTHENTICATION PAGE (Manual Username & Password)
  // ---------------------------------------------------------------------------
  if (activeTab === 'login') {
    return (
      <LoginPage
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setActiveTab('dashboard');
          if (typeof window !== 'undefined' && window.history?.pushState) {
            window.history.pushState(null, '', '/dashboard');
          }
        }}
        onNavigateToRegister={() => {
          setActiveTab('register');
          if (typeof window !== 'undefined' && window.history?.pushState) {
            window.history.pushState(null, '', '/register');
          }
        }}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // TIER 1.8: MANDATORY FIRST-LOGIN PASSWORD CHANGE GUARD (Blocking)
  // ---------------------------------------------------------------------------
  if (currentUser && currentUser.must_change_password) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-950 to-slate-950 flex flex-col items-center justify-center p-4">
        <ForcePasswordChangeModal
          user={currentUser}
          onPasswordChanged={() => {
            setCurrentUser(appStore.getCurrentUser());
          }}
          onLogout={() => {
            appStore.logout();
            setCurrentUser(null);
            if (typeof window !== 'undefined' && window.history?.pushState) {
              window.history.pushState(null, '', '/login');
            }
            setActiveTab('login');
          }}
        />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // TIER 2: INTERNAL AUTHENTICATED CHURCH SYSTEM & PIPELINE DASHBOARD
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Internal Navigation Bar */}
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSqlModal={() => setShowSqlModal(true)}
        onOpenProfileModal={() => setShowProfileModal(true)}
        onOpenLoginModal={() => setShowLoginModal(true)}
        onOpenAddMemberModal={() => setShowAddMemberModal(true)}
        onOpenCsvImport={() => setShowCsvImportModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          currentUser ? (
            <DashboardView
              currentUser={currentUser}
              onNavigateToProspects={handleNavigateToProspectsWithFilter}
              onNavigateToRegister={handleNavigateToRegister}
              onOpenCsvImport={() => setShowCsvImportModal(true)}
            />
          ) : (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm max-w-md mx-auto my-12">
              <div className="w-16 h-16 mx-auto mb-4">
                <img
                  src="/assets/aistudio/Zion_Christian_Mission_Center_-_Logo_ab51933b.png"
                  alt="Zion Logo"
                  className="w-full h-full object-contain rounded-full shadow-md"
                />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Worker Authentication Required</h2>
              <p className="text-xs text-slate-500 mb-6">
                Please enter your username and password to access the evangelism pipeline and student records.
              </p>
              <button
                onClick={() => {
                  if (typeof window !== 'undefined' && window.history?.pushState) {
                    window.history.pushState(null, '', '/login');
                  }
                  setActiveTab('login');
                }}
                className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-sm shadow-md transition-colors"
              >
                Sign In with Username & Password
              </button>
            </div>
          )
        )}

        {activeTab === 'prospects' && (
          currentUser ? (
            <ProspectsPipelineView
              currentUser={currentUser}
              initialLevelFilter={prospectsLevelFilter}
              onOpenUpgradeBBHapdang={(p) => setProspectForUpgradeBB(p)}
              onOpenUpgradeTtagi={(p) => setProspectForUpgradeTtagi(p)}
              onOpenLessonsTracker={(p) => setProspectForLessons(p)}
              onOpenDropModal={(p) => setProspectForDrop(p)}
              onOpenFollowUpModal={(p) => setProspectForFollowUp(p)}
            />
          ) : (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 max-w-md mx-auto my-12">
              <h2 className="text-xl font-bold text-slate-900 mb-2">Sign In Required</h2>
              <p className="text-xs text-slate-500 mb-6">
                Sign in with your username and password to manage prospective students and BB lessons.
              </p>
              <button
                onClick={() => {
                  if (typeof window !== 'undefined' && window.history?.pushState) {
                    window.history.pushState(null, '', '/login');
                  }
                  setActiveTab('login');
                }}
                className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-sm"
              >
                Sign In with Username & Password
              </button>
            </div>
          )
        )}

        {activeTab === 'members' && (
          currentUser ? (
            <MembersListView
              currentUser={currentUser}
              onOpenCsvImport={() => setShowCsvImportModal(true)}
              onNavigateToRegister={handleNavigateToRegister}
            />
          ) : (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 max-w-md mx-auto my-12">
              <h2 className="text-xl font-bold text-slate-900 mb-2">Sign In Required</h2>
              <p className="text-xs text-slate-500 mb-6">
                Sign in with your username and password to view the members and workers directory.
              </p>
              <button
                onClick={() => {
                  if (typeof window !== 'undefined' && window.history?.pushState) {
                    window.history.pushState(null, '', '/login');
                  }
                  setActiveTab('login');
                }}
                className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-sm"
              >
                Sign In with Username & Password
              </button>
            </div>
          )
        )}

        {activeTab === 'register-account' && (
          <RegisterAccountView
            currentUser={currentUser}
            onNavigateToTab={(tab) => {
              if (typeof window !== 'undefined' && window.history?.pushState) {
                window.history.pushState(null, '', `/${tab === 'dashboard' ? 'dashboard' : tab}`);
              }
              setActiveTab(tab);
            }}
            onAccountCreated={() => setTick((t) => t + 1)}
          />
        )}
      </main>

      {/* Internal System Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img
              src="/assets/aistudio/Zion_Christian_Mission_Center_-_Logo_ab51933b.png"
              alt="Logo"
              className="w-5 h-5 object-contain rounded-full"
            />
            <span className="font-bold text-slate-700">
              Zion Christian Mission Center (시온기독교선교센터)
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Free Bible Study Evangelism & Student Management System • Powered by Supabase PostgreSQL
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSqlModal(true)}
              className="text-emerald-700 hover:underline font-semibold"
            >
              SQL Migration
            </button>
            <span>•</span>
            <button
              onClick={() => setActiveTab('register')}
              className="text-blue-700 hover:underline font-semibold"
            >
              Open Public Form
            </button>
          </div>
        </div>
      </footer>

      {/* MODALS */}

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          setShowLoginModal(false);
        }}
      />

      {/* CSV Member Batch Import Modal */}
      {currentUser && (
        <CsvMemberImportModal
          currentUser={currentUser}
          isOpen={showCsvImportModal}
          onClose={() => setShowCsvImportModal(false)}
          onSuccess={() => {
            setTick((t) => t + 1);
          }}
        />
      )}

      {/* Supabase SQL Migration Modal */}
      <SupabaseSqlModal
        isOpen={showSqlModal}
        onClose={() => setShowSqlModal(false)}
      />

      {/* Worker Profile Modal */}
      {currentUser && (
        <ProfileModal
          user={currentUser}
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {/* Add Member / Leader Modal */}
      <AddMemberModal
        isOpen={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        onSuccess={() => {
          setTick((t) => t + 1);
        }}
      />

      {/* Upgrade to BB Hapdang Modal */}
      {prospectForUpgradeBB && (
        <UpgradeToBBHapdangModal
          prospect={prospectForUpgradeBB}
          isOpen={Boolean(prospectForUpgradeBB)}
          onClose={() => setProspectForUpgradeBB(null)}
          onSuccess={() => {
            setProspectForUpgradeBB(null);
            setTick((t) => t + 1);
          }}
        />
      )}

      {/* Upgrade to Ttagi Modal */}
      {prospectForUpgradeTtagi && (
        <UpgradeToTtagiModal
          prospect={prospectForUpgradeTtagi}
          isOpen={Boolean(prospectForUpgradeTtagi)}
          onClose={() => setProspectForUpgradeTtagi(null)}
          onSuccess={() => {
            setProspectForUpgradeTtagi(null);
            setTick((t) => t + 1);
          }}
        />
      )}

      {/* BB Lessons Tracker Modal */}
      {prospectForLessons && (
        <BBLessonsTrackerModal
          prospect={prospectForLessons}
          isOpen={Boolean(prospectForLessons)}
          onClose={() => setProspectForLessons(null)}
          onSuccess={() => {
            const updated = appStore.getVisibleProspects().find((p) => p.id === prospectForLessons.id);
            if (updated) {
              setProspectForLessons(updated);
            }
            setTick((t) => t + 1);
          }}
        />
      )}

      {/* Drop Student Modal */}
      {prospectForDrop && (
        <DropProspectModal
          prospect={prospectForDrop}
          isOpen={Boolean(prospectForDrop)}
          onClose={() => setProspectForDrop(null)}
          onSuccess={() => {
            setProspectForDrop(null);
            setTick((t) => t + 1);
          }}
        />
      )}

      {/* Follow-up Call/Text Modal */}
      {prospectForFollowUp && (
        <FollowUpModal
          prospect={prospectForFollowUp}
          isOpen={Boolean(prospectForFollowUp)}
          onClose={() => setProspectForFollowUp(null)}
          onSuccess={() => {
            setTick((t) => t + 1);
          }}
        />
      )}
    </div>
  );
}
