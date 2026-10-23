import React, { useState } from 'react';
import { Profile, CsvMemberRow } from '../types';
import { appStore } from '../services/store';
import { parseMemberCsv, SAMPLE_MEMBER_CSV, generateAccountCsvTemplate } from '../utils/areaCodeGenerator';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  History,
  ArrowRight,
  Database,
  RefreshCw
} from 'lucide-react';

interface CsvMemberImportModalProps {
  currentUser: Profile;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CsvMemberImportModal: React.FC<CsvMemberImportModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload');
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<CsvMemberRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [areaSummary, setAreaSummary] = useState<Record<string, number>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState('');

  if (!isOpen) return null;
  if (!appStore.canManageAccounts(currentUser)) return null;

  const existingCodes = appStore.getAllReferralCodes();
  const pastBatches = appStore.getMemberImports();

  const handleProcessText = (text: string, name: string = 'members_upload.csv') => {
    setCsvText(text);
    setFileName(name);
    setImportSuccessMessage('');

    const result = parseMemberCsv(text, existingCodes);
    setParsedRows(result.rows);
    setParseErrors(result.errors);
    setAreaSummary(result.areaSummary);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        handleProcessText(content, file.name);
      }
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    handleProcessText(SAMPLE_MEMBER_CSV, 'sample_zion_members.csv');
  };

  const handleDownloadTemplate = () => {
    const csvContent = generateAccountCsvTemplate();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'zion_member_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportMemberLinks = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://zionchristianmissioncenter.org';
    const csvContent = appStore.exportMemberLinksCsv(origin);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zion_member_referral_links_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) return;

    setIsProcessing(true);
    setImportSuccessMessage('');
    setParseErrors([]);

    try {
      const result = await appStore.importMembersFromCsvAsync({
        filename: fileName || 'manual_paste.csv',
        rows: parsedRows,
        importedBy: currentUser,
        areaSummary,
      });

      const toastMsg = `Successfully imported ${result.count} members! (${result.insertedCount} inserted, ${result.updatedCount} updated in Supabase)`;
      setImportSuccessMessage(toastMsg);
      setParsedRows([]);
      setCsvText('');

      // Immediately trigger state refresh so the UI updates without requiring manual refresh
      onSuccess();
    } catch (err: any) {
      setParseErrors([err.message || 'An error occurred during import.']);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 text-slate-900 max-h-[92vh] flex flex-col relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
          title="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 uppercase tracking-wider">
                Admin Utility
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                Direct Supabase Upsert Sync
              </span>
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">
              CSV Member Batch Import
            </h3>
            <p className="text-xs text-slate-500">
              Upload or paste member lists (Serial, Name, Department, Section, Area, Region, Ban, Duty, Role). Records upsert directly to Supabase with auto-generated referral codes (e.g. <code>MANILA0001</code>).
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 pt-3 border-b border-slate-100">
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'upload'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Import Members
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Import History ({pastBatches.length})</span>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto py-4 space-y-4 flex-grow pr-1 custom-scrollbar">
          {activeTab === 'upload' ? (
            <>
              {/* Toast Notification */}
              {importSuccessMessage && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs sm:text-sm font-semibold flex items-center gap-2.5 shadow-xs animate-in fade-in duration-200">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <div className="flex-1">
                    <span>{importSuccessMessage}</span>
                    <p className="text-[11px] text-emerald-700 font-normal mt-0.5">
                      Data saved directly to Supabase and immediately active across all connected views.
                    </p>
                  </div>
                </div>
              )}

              {parseErrors.length > 0 && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>CSV Processing Notes:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {parseErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload CSV File</span>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    onClick={handleLoadSample}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Load Sample Data</span>
                  </button>

                  <button
                    onClick={handleExportMemberLinks}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-xl transition-colors"
                    title="Export full list of member referral links"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Member Links (.CSV)</span>
                  </button>
                </div>

                <button
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-1.5 text-xs text-blue-700 hover:underline font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Template</span>
                </button>
              </div>

              {/* CSV Text Input Area */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Or Paste CSV Data Directly (Serial, Name, Department, Section, Area, Region, Ban, Duty, Role):
                </label>
                <textarea
                  rows={4}
                  value={csvText}
                  onChange={(e) => handleProcessText(e.target.value, 'pasted_members.csv')}
                  placeholder="00361228-09991,Brother Gabriel Santos,Evangelism Dept,Section Alpha,Manila,NCR & Luzon,Ban 1,Evangelism Worker,Member"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-100 transition-all"
                />
              </div>

              {/* Parsed Preview Table */}
              {parsedRows.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-blue-600" />
                        Import Preview ({parsedRows.length} Members Ready for Upsert)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Area-based codes are pre-generated. Temporary password (<code>default123</code>) assigned.
                      </p>
                    </div>

                    {/* Area Summary Badges */}
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(areaSummary).map(([area, count]) => (
                        <span
                          key={area}
                          className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold rounded-lg"
                        >
                          {area}: {count}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold sticky top-0">
                          <tr>
                            <th className="py-2.5 px-3">Serial</th>
                            <th className="py-2.5 px-3">Member Name</th>
                            <th className="py-2.5 px-3">Area</th>
                            <th className="py-2.5 px-3">Ban (Team)</th>
                            <th className="py-2.5 px-3">Auto Referral Code</th>
                            <th className="py-2.5 px-3">Duty</th>
                            <th className="py-2.5 px-3">Role</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedRows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                                {row.serial_number || 'Auto-generated'}
                              </td>
                              <td className="py-2 px-3 font-bold text-slate-900">{row.name}</td>
                              <td className="py-2 px-3 text-slate-700">{row.area}</td>
                              <td className="py-2 px-3">
                                <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[10px] font-semibold border border-slate-200">
                                  {row.ban || 'Ban 1'}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                                  {row.generated_referral_code}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-slate-600 text-[11px]">{row.duty || 'Worker'}</td>
                              <td className="py-2 px-3 text-slate-700 font-medium">{row.role || 'Member'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-slate-500">
                      File: <strong>{fileName || 'data.csv'}</strong>
                    </span>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleConfirmImport}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Upserting to Supabase...</span>
                        </>
                      ) : (
                        <>
                          <span>Upsert & Save {parsedRows.length} Members</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* History Tab */
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Previous Batch Imports
              </h4>

              {pastBatches.length === 0 ? (
                <div className="p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                  No CSV batch imports logged yet. Upload your first member list to view history here.
                </div>
              ) : (
                <div className="space-y-2">
                  {pastBatches.map((b) => (
                    <div
                      key={b.id}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{b.filename}</span>
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {b.imported_count} imported
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Imported by {b.imported_by_name} • {new Date(b.created_at).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {Object.entries(b.area_summary || {}).map(([area, count]) => (
                          <span
                            key={area}
                            className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600"
                          >
                            {area}: {count}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-100 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Close Utility
          </button>
        </div>
      </div>
    </div>
  );
};
