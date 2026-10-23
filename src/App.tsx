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

export default function App() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(appStore.getCurrentUser());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'prospects' | 'register' | 'members'>('dashboard');
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

  // Detect URL path or query parameters (e.g. /register/MANILA-NORTH-001 or ?ref=...)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const pathMatch = pathname.match(/^\/register\/([^/?#]+)/i);
      const isRegisterPath = pathname === '/register' || pathname.startsWith('/register/');

      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref') || params.get('code');
      const tab = params.get('tab');

      if (pathMatch && pathMatch[1]) {
        setInitialRegistrationRef(decodeURIComponent(pathMatch[1]));
        setActiveTab('register');
      } else if (ref) {
        setInitialRegistrationRef(ref);
        setActiveTab('register');
      } else if (isRegisterPath || tab === 'register') {
        setActiveTab('register');
      } else if (tab === 'prospects') {
        setActiveTab('prospects');
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
              setShowLoginModal(true);
            }
          }}
        />

        {/* Floating Quick Return to Internal Dashboard for Logged-In Workers */}
        {currentUser && (
          <div className="fixed bottom-4 right-4 z-50 animate-in fade-in duration-200">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="px-4 py-2 bg-slate-900/90 hover:bg-slate-950 text-white font-bold text-xs rounded-full border border-slate-700 shadow-2xl backdrop-blur-md flex items-center gap-2 transition-all hover:scale-105"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Worker Dashboard ({currentUser.serial_number})</span>
            </button>
          </div>
        )}

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
              <h2 className="text-xl font-bold text-slate-900 mb-2">Member Portal Authentication</h2>
              <p className="text-xs text-slate-500 mb-6">
                Please sign in with your Serial Number or Referral Code to view your evangelism pipeline results.
              </p>
              <button
                onClick={() => setShowLoginModal(true)}
                className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-sm shadow-md transition-colors"
              >
                Sign In with Serial Number
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
                Sign in to manage prospective students and BB lessons.
              </p>
              <button
                onClick={() => setShowLoginModal(true)}
                className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-sm"
              >
                Sign In with Serial Number
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
                Sign in to view the members and workers directory.
              </p>
              <button
                onClick={() => setShowLoginModal(true)}
                className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-sm"
              >
                Sign In with Serial Number
              </button>
            </div>
          )
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

      {/* Force Password Change on First Login */}
      {currentUser && currentUser.must_change_password && (
        <ForcePasswordChangeModal
          user={currentUser}
          onPasswordChanged={() => {
            setCurrentUser(appStore.getCurrentUser());
          }}
        />
      )}

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
