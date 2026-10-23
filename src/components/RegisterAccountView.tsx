import React, { useState } from 'react';
import { Profile, UserRole, ALL_APPROVED_ROLES, AccountCsvRow } from '../types';
import { appStore } from '../services/store';
import {
  parseAccountRegistrationCsv,
  generateAccountCsvTemplate
} from '../utils/areaCodeGenerator';
import {
  UserPlus,
  FileSpreadsheet,
  Download,
  Upload,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  XCircle,
  Sparkles,
  Info
} from 'lucide-react';

interface RegisterAccountViewProps {
  currentUser: Profile | null;
  onNavigateToTab?: (tab: 'dashboard' | 'prospects' | 'register' | 'members' | 'login' | 'register-account') => void;
  onAccountCreated?: (newProfile: Profile) => void;
}

export const RegisterAccountView: React.FC<RegisterAccountViewProps> = ({
  currentUser,
  onNavigateToTab,
  onAccountCreated,
}) => {
  const isAuthorized = appStore.canManageAccounts(currentUser);

  const [activeSubTab, setActiveSubTab] = useState<'manual' | 'bulk'>('manual');

  // ---------------------------------------------------------------------------
  // MANUAL REGISTRATION FORM STATE (ALL INITIALLY EMPTY)
  // ---------------------------------------------------------------------------
  const [serialNumber, setSerialNumber] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [area, setArea] = useState('');
  const [region, setRegion] = useState('');
  const [duty, setDuty] = useState('');
  const [section, setSection] = useState('');
  const [ban, setBan] = useState('');
  const [teamLeader, setTeamLeader] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]); // empty initially!

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredProfile, setRegisteredProfile] = useState<Profile | null>(null);

  // ---------------------------------------------------------------------------
  // CSV BULK IMPORT STATE
  // ---------------------------------------------------------------------------
  const [csvText, setCsvText] = useState('');
  const [csvFileName, setCsvFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<AccountCsvRow[]>([]);
  const [csvSummary, setCsvSummary] = useState<{
    newCount: number;
    updateCount: number;
    errorCount: number;
    errors: string[];
  }>({ newCount: 0, updateCount: 0, errorCount: 0, errors: [] });
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    inserted: number;
    updated: number;
    failed: number;
    summary: string;
  } | null>(null);

  // If unauthorized, return 403 Forbidden screen
  if (!isAuthorized) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl border border-rose-200 shadow-xl text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
          403 Forbidden
        </span>
        <h2 className="text-2xl font-black text-slate-900 mt-3 mb-2">
          Access Restricted
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto mb-6">
          You do not have permission to register internal member or leader accounts.
          Only <strong className="text-slate-900">Super Admin</strong>, <strong className="text-slate-900">Admin</strong>, <strong className="text-slate-900">Regional Leader</strong>, <strong className="text-slate-900">Area Leader</strong>, and <strong className="text-slate-900">Area Somu</strong> are authorized.
        </p>
        {onNavigateToTab && (
          <button
            onClick={() => onNavigateToTab('dashboard')}
            className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-colors"
          >
            Return to Dashboard
          </button>
        )}
      </div>
    );
  }

  // Toggle role selection in manual form
  const handleToggleRole = (role: UserRole) => {
    setFieldErrors((prev) => ({ ...prev, role: '' }));
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter((r) => r !== role));
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  // Submit manual registration
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    const errors: Record<string, string> = {};

    if (!serialNumber.trim()) {
      errors.serial = 'Serial Number is required.';
    }
    if (!name.trim()) {
      errors.name = 'Full Name is required.';
    }
    if (selectedRoles.length === 0) {
      errors.role = 'Access Based on Role is required (select at least 1 role).';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await appStore.registerLeaderOrMemberAccount(
        {
          serial_number: serialNumber.trim(),
          name: name.trim(),
          department: department.trim(),
          area: area.trim(),
          region: region.trim(),
          duty: duty.trim(),
          section: section.trim(),
          ban: ban.trim(),
          team_leader: teamLeader.trim(),
          role: selectedRoles,
        },
        currentUser
      );

      if (result.success && result.profile) {
        setRegisteredProfile(result.profile);
        if (onAccountCreated) {
          onAccountCreated(result.profile);
        }
      } else {
        setGeneralError(result.error || 'Failed to register account.');
      }
    } catch (err: any) {
      setGeneralError(err.message || 'An error occurred during account registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetManualForm = () => {
    setSerialNumber('');
    setName('');
    setDepartment('');
    setArea('');
    setRegion('');
    setDuty('');
    setSection('');
    setBan('');
    setTeamLeader('');
    setSelectedRoles([]);
    setFieldErrors({});
    setGeneralError('');
    setRegisteredProfile(null);
  };

  // ---------------------------------------------------------------------------
  // CSV HANDLERS
  // ---------------------------------------------------------------------------
  const handleProcessCsvText = (text: string, filename: string = 'accounts.csv') => {
    setCsvText(text);
    setCsvFileName(filename);
    setImportResult(null);

    const existingProfiles = appStore.getAllProfiles();
    const result = parseAccountRegistrationCsv(text, existingProfiles);
    setParsedRows(result.rows);
    setCsvSummary({
      newCount: result.newCount,
      updateCount: result.updateCount,
      errorCount: result.errorCount,
      errors: result.errors,
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        handleProcessCsvText(content, file.name);
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const csvContent = generateAccountCsvTemplate();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'account_registration_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirmBulkImport = async () => {
    if (parsedRows.length === 0) return;
    setIsImporting(true);
    setImportResult(null);

    try {
      const res = await appStore.bulkImportAccountsAsync(parsedRows, currentUser);
      setImportResult({
        inserted: res.insertedCount,
        updated: res.updatedCount,
        failed: res.failedCount,
        summary: res.summary,
      });
      // Clear parsed preview after successful import
      setParsedRows([]);
      setCsvText('');
    } catch (err: any) {
      setCsvSummary((prev) => ({
        ...prev,
        errors: [...prev.errors, err.message || 'Import failed.'],
      }));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider">
              Internal Administration
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-semibold">
              Authorized Worker Access Only
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <UserPlus className="w-7 h-7 text-emerald-600" />
            <span>Register Leader / Member Account</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Create internal user accounts with automatic username generation from Serial Number, default password (<code className="font-mono text-blue-700 bg-blue-50 px-1 py-0.5 rounded">default43</code>), and mandatory first-login password change.
          </p>
        </div>

        {/* Tab Toggle between Manual and Bulk CSV */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-start md:self-center">
          <button
            onClick={() => setActiveSubTab('manual')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeSubTab === 'manual'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Manual Registration
          </button>
          <button
            onClick={() => setActiveSubTab('bulk')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeSubTab === 'bulk'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Bulk Register / Update (CSV)</span>
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* TAB 1: MANUAL REGISTRATION FORM                                      */}
      {/* -------------------------------------------------------------------- */}
      {activeSubTab === 'manual' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
          {registeredProfile ? (
            /* Successful Registration Screen */
            <div className="text-center py-6 max-w-md mx-auto space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                Account Successfully Created
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                The account has been created. The member can now log in manually using their Serial Number as username and the default password.
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs space-y-1.5 font-medium text-slate-700">
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500">Username:</span>
                  <span className="font-mono font-bold text-blue-700">{registeredProfile.serial_number}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500">Default Password:</span>
                  <span className="font-mono font-bold text-slate-800">default43</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500">First-Login Change:</span>
                  <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">Required</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500">Full Name:</span>
                  <span className="font-bold text-slate-900">{registeredProfile.name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500">Role(s):</span>
                  <span className="font-bold text-purple-700">{registeredProfile.role.join(', ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Area Referral Code:</span>
                  <span className="font-mono font-bold text-emerald-700">{registeredProfile.referral_code}</span>
                </div>
              </div>

              <button
                onClick={handleResetManualForm}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-colors"
              >
                Register Another Account
              </button>
            </div>
          ) : (
            /* Registration Form */
            <form onSubmit={handleManualSubmit} className="space-y-6">
              {generalError && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs sm:text-sm flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
                  <span>{generalError}</span>
                </div>
              )}

              {/* Information Notice */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold">Credential Rules:</span> The entered <strong>Serial Number</strong> will automatically become the new account's login username. Newly registered accounts receive the default password <code className="font-mono font-bold text-blue-800">default43</code> and are required to change their password on first login.
                </div>
              </div>

              {/* Row 1: Serial Number & Full Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Serial Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={serialNumber}
                    onChange={(e) => {
                      setSerialNumber(e.target.value.toUpperCase());
                      setFieldErrors((prev) => ({ ...prev, serial: '' }));
                    }}
                    placeholder="e.g. SN-2026-001, MEM-9042"
                    className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-100 transition-all ${
                      fieldErrors.serial ? 'border-rose-400 bg-rose-50/50' : 'border-slate-300 focus:border-emerald-600'
                    }`}
                  />
                  {fieldErrors.serial && (
                    <p className="text-rose-600 text-[11px] mt-1 font-medium">{fieldErrors.serial}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, name: '' }));
                    }}
                    placeholder="e.g. Brother Joel Bautista"
                    className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-100 transition-all ${
                      fieldErrors.name ? 'border-rose-400 bg-rose-50/50' : 'border-slate-300 focus:border-emerald-600'
                    }`}
                  />
                  {fieldErrors.name && (
                    <p className="text-rose-600 text-[11px] mt-1 font-medium">{fieldErrors.name}</p>
                  )}
                </div>
              </div>

              {/* Row 2: Department, Area, Region */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Department
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Evangelism Dept"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Area
                  </label>
                  <input
                    type="text"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="e.g. Manila, Cebu, Davao"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Region
                  </label>
                  <input
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="e.g. NCR & Luzon, Visayas"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Row 3: Duty, Section, Ban */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Duty
                  </label>
                  <input
                    type="text"
                    value={duty}
                    onChange={(e) => setDuty(e.target.value)}
                    placeholder="e.g. Evangelism Worker, BB Teacher"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Section
                  </label>
                  <input
                    type="text"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    placeholder="e.g. Section Alpha, Section Beta"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Ban
                  </label>
                  <input
                    type="text"
                    value={ban}
                    onChange={(e) => setBan(e.target.value)}
                    placeholder="e.g. Ban 1, Ban 2"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Row 4: Team Leader */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Team Leader
                </label>
                <input
                  type="text"
                  value={teamLeader}
                  onChange={(e) => setTeamLeader(e.target.value)}
                  placeholder="e.g. Leader Timothy"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-emerald-600"
                />
              </div>

              {/* Role Selection (1 or more required) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Access Based on Role (1 or more) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Selected: <strong>{selectedRoles.length}</strong>
                  </span>
                </div>

                {fieldErrors.role && (
                  <p className="text-rose-600 text-[11px] mb-2 font-medium">{fieldErrors.role}</p>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {ALL_APPROVED_ROLES.map((r) => {
                    const isSelected = selectedRoles.includes(r);
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => handleToggleRole(r)}
                        className={`p-2.5 rounded-xl text-xs font-semibold text-left transition-all border flex items-center justify-between gap-1.5 ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-2xs font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <span className="truncate">{r}</span>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleResetManualForm}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Clear Fields
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Internal Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 2: BULK REGISTER / UPDATE ACCOUNTS (CSV)                          */}
      {/* -------------------------------------------------------------------- */}
      {activeSubTab === 'bulk' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          {/* Header Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors">
                <Upload className="w-4 h-4" />
                <span>Upload CSV File</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-colors shadow-2xs"
              >
                <Download className="w-4 h-4 text-blue-600" />
                <span>Download CSV Template</span>
              </button>
            </div>

            <div className="text-xs text-slate-500">
              Columns: <code className="font-mono text-slate-700 font-bold">Serial Number, Full Name, Department, Area, Region, Duty, Section, Ban, Team Leader, Access Based on Role</code>
            </div>
          </div>

          {/* Paste CSV or Input Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Or Paste CSV Data Below:
              </label>
              <span className="text-[11px] text-slate-500">
                Multiple roles delimiter: <code className="font-mono font-bold text-blue-700">|</code> (e.g. <code className="font-mono">Regional Leader|Area Leader</code>)
              </span>
            </div>
            <textarea
              rows={4}
              value={csvText}
              onChange={(e) => handleProcessCsvText(e.target.value, 'pasted_data.csv')}
              placeholder="Serial Number,Full Name,Department,Area,Region,Duty,Section,Ban,Team Leader,Access Based on Role&#10;SN-2026-001,Brother Timothy Santos,Evangelism Dept,Manila,NCR & Luzon,Evangelism Worker,Section Alpha,Ban 1,Leader Timothy,Member"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-100"
            />
          </div>

          {/* Import Result Notification */}
          {importResult && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs sm:text-sm font-semibold flex items-center gap-3 animate-in fade-in duration-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <span>{importResult.summary}</span>
                <p className="text-[11px] text-emerald-700 font-normal mt-0.5">
                  New accounts received default password <code>default43</code> with first-login password change requirement. Existing accounts updated without modifying their credentials.
                </p>
              </div>
            </div>
          )}

          {/* CSV Summary Badges */}
          {parsedRows.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Validation Summary:</span>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-lg border border-emerald-200">
                    New Accounts: {csvSummary.newCount}
                  </span>
                  <span className="px-2.5 py-1 bg-blue-100 text-blue-800 font-bold text-xs rounded-lg border border-blue-200">
                    Accounts to Update: {csvSummary.updateCount}
                  </span>
                  {csvSummary.errorCount > 0 && (
                    <span className="px-2.5 py-1 bg-rose-100 text-rose-800 font-bold text-xs rounded-lg border border-rose-200">
                      Errors: {csvSummary.errorCount}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isImporting || parsedRows.filter((r) => r.status !== 'error').length === 0}
                  onClick={handleConfirmBulkImport}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing Bulk Import...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm Import ({parsedRows.filter((r) => r.status !== 'error').length} Valid Accounts)</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Error Callout if any */}
              {csvSummary.errors.length > 0 && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>Problematic Rows Detected (These rows will be skipped):</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {csvSummary.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="max-h-72 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">Row</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Serial Number</th>
                        <th className="py-2.5 px-3">Full Name</th>
                        <th className="py-2.5 px-3">Area</th>
                        <th className="py-2.5 px-3">Department</th>
                        <th className="py-2.5 px-3">Role(s)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedRows.map((row) => (
                        <tr
                          key={row.rowNumber}
                          className={`transition-colors ${
                            row.status === 'error'
                              ? 'bg-rose-50/60'
                              : row.status === 'update'
                              ? 'hover:bg-blue-50/40'
                              : 'hover:bg-emerald-50/40'
                          }`}
                        >
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                            #{row.rowNumber}
                          </td>
                          <td className="py-2 px-3">
                            {row.status === 'new' && (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md border border-emerald-200">
                                New Account
                              </span>
                            )}
                            {row.status === 'update' && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-md border border-blue-200">
                                Update Existing
                              </span>
                            )}
                            {row.status === 'error' && (
                              <span
                                className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-md border border-rose-200"
                                title={row.errorMessage}
                              >
                                Error: {row.errorMessage}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-800">
                            {row.serialNumber || '—'}
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-900">{row.fullName || '—'}</td>
                          <td className="py-2 px-3 text-slate-700">{row.area || '—'}</td>
                          <td className="py-2 px-3 text-slate-600">{row.department || '—'}</td>
                          <td className="py-2 px-3 font-medium text-purple-800">
                            {row.roles.length > 0 ? row.roles.join(', ') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
