import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { appStore } from '../services/store';
import { PROVINCES_LIST } from '../data/constants';
import { Profile } from '../types';
import {
  BookOpen,
  CheckCircle2,
  Sparkles,
  User,
  Phone,
  Mail,
  MapPin,
  Clock,
  Heart,
  ArrowRight,
  ShieldCheck,
  Check,
  Globe,
  Share2
} from 'lucide-react';

interface PublicRegistrationProps {
  initialRef?: string;
  onNavigateToDashboard?: () => void;
}

export const PublicRegistration: React.FC<PublicRegistrationProps> = ({
  initialRef = '',
  onNavigateToDashboard,
}) => {
  const [refCode, setRefCode] = useState(initialRef);
  const [referrerProfile, setReferrerProfile] = useState<Profile | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | 'Prefer not to say'>('Male');
  const [province, setProvince] = useState('Metro Manila');
  const [city, setCity] = useState('');
  const [preferredMode, setPreferredMode] = useState<'Online' | 'Onsite' | 'SPS'>('Online');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Extract referral from URL if not given
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlRef = params.get('ref');
      if (urlRef) {
        setRefCode(urlRef);
      }
    }
  }, []);

  // Look up referrer profile whenever refCode changes
  useEffect(() => {
    if (refCode.trim()) {
      const match =
        appStore.getProfileByReferralCode(refCode.trim()) ||
        appStore.getProfileBySerialNumber(refCode.trim());
      setReferrerProfile(match || null);
    } else {
      setReferrerProfile(null);
    }
  }, [refCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!contactNumber.trim()) {
      setErrorMessage('Please provide a valid contact number so we can get in touch.');
      return;
    }
    if (!city.trim()) {
      setErrorMessage('Please enter your city or municipality.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Save prospect with Chatgi level
      appStore.registerPublicProspect({
        name: name.trim(),
        contact_number: contactNumber.trim(),
        email: email.trim() || undefined,
        gender,
        province: province.trim(),
        city: city.trim(),
        ref_code: refCode.trim() || undefined,
      });

      // Celebration
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      setIsSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while submitting your registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setName('');
    setContactNumber('');
    setEmail('');
    setCity('');
    setIsSuccess(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 via-sky-900 to-slate-900 text-slate-100 py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-blue-500/10 blur-3xl pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/10 blur-3xl pointer-events-none rounded-full" />

      <div className="max-w-3xl mx-auto relative z-10">
        {/* Top Header Card */}
        <div className="text-center mb-8">
          <div className="inline-block relative mb-4">
            <div className="w-24 h-24 mx-auto bg-white rounded-full p-1.5 shadow-2xl ring-4 ring-white/20">
              <img
                src="/assets/aistudio/Zion_Christian_Mission_Center_-_Logo_ab51933b.png"
                alt="Zion Christian Mission Center Emblem"
                className="w-full h-full object-contain rounded-full"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-amber-400 text-blue-950 p-1.5 rounded-full shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
            Zion Christian Mission Center
          </h1>
          <p className="text-base sm:text-lg font-semibold text-sky-200">
            Zion Christian Mission Center • Free Bible Study Program
          </p>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto mt-2">
            Discover the sealed mysteries and fulfilled covenant of the Holy Scriptures from Genesis to Revelation.
            Zero tuition, life-transforming biblical education.
          </p>
        </div>

        {/* Referrer Banner if available */}
        <div className="mb-6 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/60 border border-blue-400 flex items-center justify-center text-white">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-sky-200 font-medium">Evangelism Referral Invitation</p>
              <p className="text-sm font-bold text-white">
                {referrerProfile ? (
                  <>
                    Invited by <span className="text-amber-300">{referrerProfile.name}</span>{' '}
                    <span className="text-xs font-mono text-sky-200">({referrerProfile.serial_number})</span>
                  </>
                ) : refCode ? (
                  <>
                    Referral Code: <span className="font-mono text-amber-300 font-bold">{refCode}</span>
                  </>
                ) : (
                  'Direct General Registration'
                )}
              </p>
            </div>
          </div>
          {referrerProfile && (
            <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-full font-medium">
              Verified Member Link
            </span>
          )}
        </div>

        {/* Success Confirmation Modal/Screen */}
        {isSuccess ? (
          <div className="bg-white rounded-3xl p-8 sm:p-12 text-slate-900 shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Registration Confirmed
            </span>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-3 mb-2">
              Thank you! We'll get in touch.
            </h2>

            <p className="text-slate-600 max-w-md mx-auto mb-6 text-sm sm:text-base leading-relaxed">
              We have received your registration for the <strong>Zion Christian Mission Center Free Bible Study</strong>.
              A mission teacher or evangelism counselor will contact you at{' '}
              <span className="font-bold text-slate-900">{contactNumber}</span> via call or SMS shortly.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-8 text-left max-w-md mx-auto space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Registration Summary
              </h4>
              <div className="text-sm text-slate-700 space-y-1">
                <p>
                  <span className="text-slate-500">Name:</span> <strong>{name}</strong>
                </p>
                <p>
                  <span className="text-slate-500">Contact:</span> <strong>{contactNumber}</strong>
                </p>
                <p>
                  <span className="text-slate-500">Location:</span>{' '}
                  <strong>{city ? `${city}, ` : ''}{province}</strong>
                </p>
                {/*<p>
                  <span className="text-slate-500">Initial Level:</span>{' '}
                  <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded font-bold">
                    Chatgi (Registered)
                  </span>
                </p>*/}
              </div>
            </div>

            {/* Heartfelt Scripture Verse */}
            <div className="bg-gradient-to-br from-amber-50/90 via-sky-50/50 to-blue-50/80 border border-amber-200/90 rounded-2xl p-5 mb-8 text-center max-w-md mx-auto shadow-xs">
              <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-2.5 shadow-2xs">
                <BookOpen className="w-4 h-4 text-amber-700" />
              </div>
              <blockquote className="text-xs sm:text-sm font-serif italic text-slate-800 leading-relaxed">
                “Ask and it will be given to you; seek and you will find; knock and the door will be opened to you. For everyone who asks receives; the one who seeks finds; and to the one who knocks, the door will be opened.”
              </blockquote>
              <p className="text-[11px] font-bold text-amber-900 mt-2 tracking-wide uppercase not-italic">
                — Matthew 7:7-8
              </p>
              <div className="mt-3 pt-2.5 border-t border-amber-200/70 text-[11px] text-slate-600 font-serif italic">
                “Then you will know the truth, and the truth will set you free.” (John 8:32)
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleResetForm}
                className="px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-md transition-all text-sm"
              >
                Register Another Student
              </button>
              {onNavigateToDashboard && (
                <button
                  onClick={onNavigateToDashboard}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl border border-slate-300 transition-all text-sm"
                >
                  Return to Admin Portal
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Registration Form Card */
          <div className="bg-white rounded-3xl p-6 sm:p-10 text-slate-900 shadow-2xl border border-slate-100">
            <div className="border-b border-slate-200 pb-5 mb-6">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                Bible Study Application Form
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Please complete your contact details accurately so our educational guide can coordinate your study schedule.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Maria Santos"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>

              {/* Contact Number & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Contact Number (Phone / Viber) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      required
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      placeholder="+63 9XX XXX XXXX"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Email Address <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Gender & Learning Preference */}
              {/* Gender */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              {/* Province & City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Province / Region <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <select
                      required
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                    >
                      {PROVINCES_LIST.map((prov) => (
                        <option key={prov} value={prov}>
                          {prov}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    City / Municipality
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Quezon City, Bacoor"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-700 to-sky-600 hover:from-blue-800 hover:to-sky-700 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 text-base disabled:opacity-50"
                >
                  {isSubmitting ? (
                    'Submitting...'
                  ) : (
                    <>
                      <span>Submit Free Registration</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>

              <div className="text-center pt-2">
                <p className="text-[11px] text-slate-400">
                  By registering, you agree to receive biblical study coordination from Zion Christian Mission Center.
                  Your personal information is kept completely confidential.
                </p>
              </div>
            </form>
          </div>
        )}

        {/* Informational Cards Below */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-xs">
            <BookOpen className="w-6 h-6 text-sky-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-white">Systematic Course</h4>
            <p className="text-xs text-slate-300 mt-1">Foundational biblical covenants, parables, and fulfilled spiritual prophecies.</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-xs">
            <Globe className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-white">Flexible Schedules</h4>
            <p className="text-xs text-slate-300 mt-1">Online Zoom classes or local onsite study centers worldwide.</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-xs">
            <Heart className="w-6 h-6 text-amber-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-white">100% Free of Charge</h4>
            <p className="text-xs text-slate-300 mt-1">As commanded in Rev 22:17, taking the water of life without cost.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
