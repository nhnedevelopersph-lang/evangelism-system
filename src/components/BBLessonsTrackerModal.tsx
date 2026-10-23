import React, { useState } from 'react';
import { Prospect, BBLesson } from '../types';
import { FOUNDATIONAL_BB_LESSONS } from '../data/constants';
import { appStore } from '../services/store';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Plus,
  Trash2,
  X,
  AlertCircle,
  FileCheck2,
  Award,
  Sparkles,
  Lock
} from 'lucide-react';

interface BBLessonsTrackerModalProps {
  prospect: Prospect;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BBLessonsTrackerModal: React.FC<BBLessonsTrackerModalProps> = ({
  prospect,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedPresetTitle, setSelectedPresetTitle] = useState(FOUNDATIONAL_BB_LESSONS[0]);
  const [customTitle, setCustomTitle] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [completionDate, setCompletionDate] = useState(new Date().toISOString().split('T')[0]);
  const [lessonNotes, setLessonNotes] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const lessons = appStore.getLessonsForProspect(prospect.id);
  const canUpdate = appStore.canUpdateLesson(prospect);
  const canApproveCenter = appStore.canApproveCenter();
  const assignedTeacher = prospect.assigned_bb_teacher_id
    ? appStore.getProfileById(prospect.assigned_bb_teacher_id)
    : null;

  const handleAddLesson = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const titleToAdd = isCustomMode ? customTitle.trim() : selectedPresetTitle;
    if (!titleToAdd) {
      setError('Please provide or select a lesson title.');
      return;
    }
    if (!completionDate) {
      setError('Please select a completion date.');
      return;
    }

    const res = appStore.recordBBLesson(prospect.id, titleToAdd, completionDate, lessonNotes);
    if (res.success) {
      setCustomTitle('');
      setLessonNotes('');
      onSuccess();
    } else {
      setError(res.message || 'Failed to record lesson.');
    }
  };

  const handleDeleteLesson = (lessonId: string) => {
    if (window.confirm('Are you sure you want to remove this completed lesson?')) {
      appStore.deleteBBLesson(lessonId);
      onSuccess();
    }
  };

  const handleToggleCenterRegistration = (e: React.ChangeEvent<HTMLInputElement>) => {
    appStore.setCenterRegistrationCompleted(prospect.id, e.target.checked);
    onSuccess();
  };

  const handleApproveCenter = () => {
    const res = appStore.approveCenter(prospect.id);
    if (res.success) {
      onSuccess();
    } else {
      setError(res.message || 'Failed to approve Center enrollment.');
    }
  };

  // Determine stage progression requirements
  const lessonCount = lessons.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 text-slate-900 max-h-[90vh] flex flex-col relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200 uppercase tracking-wider">
                Current Level: {prospect.prospect_level}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-semibold text-slate-600">
                {lessonCount} Lesson{lessonCount === 1 ? '' : 's'} Completed
              </span>
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">
              BB Lesson Tracker & Progression
            </h3>
            <p className="text-xs text-slate-500">
              Student: <strong>{prospect.name}</strong> • Assigned BB Teacher:{' '}
              <strong className="text-teal-700">
                {assignedTeacher ? `${assignedTeacher.name} (${assignedTeacher.serial_number})` : 'Unassigned'}
              </strong>
            </p>
          </div>
        </div>

        {error && (
          <div className="my-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 flex-shrink-0">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto py-4 space-y-6 flex-grow pr-1 custom-scrollbar">
          {/* Progression Milestones Indicator */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Automated Pipeline Progression Stages:
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div
                className={`p-2.5 rounded-xl border ${
                  lessonCount >= 1
                    ? 'bg-teal-50 border-teal-300 text-teal-900 font-bold'
                    : 'bg-white border-slate-200 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span>1. Soebweh</span>
                  {lessonCount >= 1 && <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />}
                </div>
                <p className="text-[10px] font-normal">1-2 BB Lessons</p>
              </div>

              <div
                className={`p-2.5 rounded-xl border ${
                  lessonCount >= 3
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold'
                    : 'bg-white border-slate-200 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span>2. BB</span>
                  {lessonCount >= 3 && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                <p className="text-[10px] font-normal">3+ BB Lessons</p>
              </div>

              <div
                className={`p-2.5 rounded-xl border ${
                  lessonCount >= 9 && prospect.center_registration_completed
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                    : 'bg-white border-slate-200 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span>3. Center Hapdang</span>
                  {lessonCount >= 9 && prospect.center_registration_completed && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                </div>
                <p className="text-[10px] font-normal">9+ Lessons & Reg Form</p>
              </div>

              <div
                className={`p-2.5 rounded-xl border ${
                  prospect.prospect_level === 'Center'
                    ? 'bg-green-50 border-green-300 text-green-900 font-bold'
                    : 'bg-white border-slate-200 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span>4. Center</span>
                  {prospect.prospect_level === 'Center' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                  )}
                </div>
                <p className="text-[10px] font-normal">Approved by Area Leader</p>
              </div>
            </div>
          </div>

          {/* Form Checkbox: Center Registration Form */}
          <div className="flex items-center justify-between p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
            <div className="flex items-center gap-3">
              <FileCheck2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-emerald-950">
                  Center Registration Form Submitted
                </p>
                <p className="text-[11px] text-emerald-700">
                  Required along with 9+ completed BB lessons for Center Hapdang qualification.
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(prospect.center_registration_completed)}
                onChange={handleToggleCenterRegistration}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span className="ml-2 text-xs font-semibold text-emerald-900">Completed</span>
            </label>
          </div>

          {/* Area Leader Center Approval Action */}
          {prospect.prospect_level === 'Center Hapdang' && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-600" />
                  Student Qualified for Full Center Graduation!
                </p>
                <p className="text-[11px] text-amber-700">
                  {canApproveCenter
                    ? 'You have authority as Area Leader / Admin to approve this student for official Center enrollment.'
                    : 'Awaiting formal approval from Area Leader.'}
                </p>
              </div>
              {canApproveCenter && (
                <button
                  type="button"
                  onClick={handleApproveCenter}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex-shrink-0"
                >
                  Approve for Center
                </button>
              )}
            </div>
          )}

          {/* Lesson History List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Completed Lessons ({lessons.length})
              </h4>
              <span className="text-[10px] text-slate-400">Chronological order</span>
            </div>

            {lessons.length === 0 ? (
              <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-400">
                No BB lessons recorded yet. Use the form below to record completed lessons.
              </div>
            ) : (
              <div className="space-y-2">
                {lessons.map((lesson, idx) => (
                  <div
                    key={lesson.id}
                    className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-xs hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{lesson.lesson_title}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {lesson.date_completed}
                          </span>
                          {lesson.notes && (
                            <>
                              <span>•</span>
                              <span className="italic truncate max-w-xs">{lesson.notes}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {canUpdate && (
                      <button
                        onClick={() => handleDeleteLesson(lesson.id)}
                        title="Remove lesson record"
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Lesson Section */}
          {canUpdate ? (
            <div className="pt-4 border-t border-slate-200">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-teal-600" />
                Record New Completed Lesson
              </h4>

              <form onSubmit={handleAddLesson} className="space-y-3.5 bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
                {/* Title Selection or Custom */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Lesson Title <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomMode(!isCustomMode)}
                      className="text-[11px] font-medium text-teal-700 hover:underline"
                    >
                      {isCustomMode ? 'Choose from 13 Standard Lessons' : '+ Input Custom Lesson Title'}
                    </button>
                  </div>

                  {isCustomMode ? (
                    <input
                      type="text"
                      required
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="e.g. Special Lesson: Revelation Chapter 1 Introduction"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:border-teal-600 focus:ring-1 focus:ring-teal-200"
                    />
                  ) : (
                    <select
                      value={selectedPresetTitle}
                      onChange={(e) => setSelectedPresetTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:border-teal-600 focus:ring-1 focus:ring-teal-200"
                    >
                      {FOUNDATIONAL_BB_LESSONS.map((title, i) => (
                        <option key={title} value={title}>
                          Lesson {i + 1}: {title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Date Completed & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Date Completed <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={completionDate}
                      onChange={(e) => setCompletionDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:border-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Notes / Comprehension Feedback <span className="text-slate-400">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={lessonNotes}
                      onChange={(e) => setLessonNotes(e.target.value)}
                      placeholder="e.g. Memorized verses, asked questions on parables"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:border-teal-600"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Record Completed Lesson
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span>
                <strong>Read-Only Mode:</strong> Per protocol, only the Assigned BB Teacher (
                {assignedTeacher ? assignedTeacher.name : 'Teacher'}
                ) or Super Admin/Admin can log and update lessons for this student.
              </span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-100 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Close Tracker
          </button>
        </div>
      </div>
    </div>
  );
};
