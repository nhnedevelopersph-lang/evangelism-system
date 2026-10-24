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
  Heart,
  ArrowRight,
  ShieldCheck,
  Check,
  Globe,
  AlertCircle,
  Lock,
  ChevronRight,
  XCircle,
  HelpCircle
} from 'lucide-react';

interface PublicRegistrationLayoutProps {
  referralCode?: string;
  onOpenPortalLogin?: () => void;
}

export const PublicRegistrationLayout: React.FC<PublicRegistrationLayoutProps> = ({
  referralCode = '',
  onOpenPortalLogin,
}) => {
  const [activeRefCode, setActiveRefCode] = useState(referralCode);
  const [referrerProfile, setReferrerProfile] = useState<Profile | null>(null);
  const [codeStatus, setCodeStatus] = useState<'valid' | 'invalid' | 'none'>('none');

  // Form Fields
  const [name, setName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | 'Prefer not to say'>('Male');
  const [province, setProvince] = useState('Metro Manila');
  const [city, setCity] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [submittedProspect, setSubmittedProspect] = useState<{
    name: string;
    contact: string;
    location: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Extract referral from URL if not provided via props
  useEffect(() => {
    let resolvedCode = referralCode;

    if (typeof window !== 'undefined') {
      // Check path: /register/MEMBER01 or /register/MANILA0008
      const pathname = window.location.pathname;
      const pathMatch = pathname.match(/^\/register\/([^/?#]+)/i);
      if (pathMatch && pathMatch[1]) {
        resolvedCode = decodeURIComponent(pathMatch[1]);
      } else {
        // Check query: ?ref=MEMBER01 or ?code=MEMBER01
        const params = new URLSearchParams(window.location.search);
        const queryRef = params.get('ref') || params.get('code');
        if (queryRef) {
          resolvedCode = queryRef;
        }
      }
    }

    if (resolvedCode) {
      setActiveRefCode(resolvedCode.trim());
    }
  }, [referralCode]);

  // Resolve referrer whenever activeRefCode changes
  useEffect(() => {
    if (!activeRefCode || !activeRefCode.trim()) {
      setReferrerProfile(null);
      setCodeStatus('none');
      return;
    }

    const trimmed = activeRefCode.trim();
    const matched =
      appStore.getProfileByReferralCode(trimmed) ||
      appStore.getProfileBySerialNumber(trimmed);

    if (matched) {
      setReferrerProfile(matched);
      setCodeStatus('valid');
    } else {
      setReferrerProfile(null);
      setCodeStatus('invalid');
    }
  }, [activeRefCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // If link is explicitly invalid, do NOT allow registration
    if (codeStatus === 'invalid') {
      setErrorMessage('Registration link is invalid or no longer available. Please check the link or request an updated link from your church guide.');
      return;
    }

    // Required fields per PDF requirements: Name, Contact Number, Province, City
    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!contactNumber.trim()) {
      setErrorMessage('Please provide a valid contact number (Phone or Viber).');
      return;
    }
    if (!province.trim()) {
      setErrorMessage('Please select your province or region.');
      return;
    }
    if (!city.trim()) {
      setErrorMessage('Please enter your city or municipality.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = appStore.registerPublicProspect({
        name: name.trim(),
        contact_number: contactNumber.trim(),
        email: email.trim() || undefined,
        gender,
        province: province.trim(),
        city: city.trim(),
        ref_code: activeRefCode.trim() || undefined,
      });

      if (result.isDuplicate) {
        setIsDuplicate(true);
      } else {
        setIsDuplicate(false);
        // Launch celebratory confetti for newly registered prospect
        confetti({
          particleCount: 110,
          spread: 80,
          origin: { y: 0.6 },
        });
      }

      setSubmittedProspect({
        name: result.prospect.name,
        contact: result.prospect.contact_number,
        location: `${result.prospect.city ? `${result.prospect.city}, ` : ''}${result.prospect.province}`,
      });
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration link is invalid or no longer available.');
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
    setIsDuplicate(false);
    setSubmittedProspect(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white relative overflow-hidden font-sans">
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-96 bg-gradient-to-b from-blue-600/20 via-sky-600/10 to-transparent blur-3xl pointer-events-none rounded-full" />
      <div className="absolute bottom-10 right-0 w-96 h-96 bg-emerald-600/10 blur-3xl pointer-events-none rounded-full" />

      {/* Main Content Container (No Internal Chrome) */}
      <main className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 relative z-10">
        {/* Public Header with Logo */}
        <div className="text-center mb-8">
          <div className="inline-block relative mb-3 group">
            <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto bg-white rounded-full p-2 shadow-2xl ring-4 ring-white/20 transition-transform group-hover:scale-105 duration-300">
              <img
                src="/assets/aistudio/Zion_Christian_Mission_Center_-_Logo_ab51933b.png"
                alt="Zion Christian Mission Center"
                className="w-full h-full object-contain rounded-full"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 p-1.5 rounded-full shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-1.5">
            Zion Christian Mission Center
          </h1>
          <p className="text-sm sm:text-base font-bold text-sky-300 tracking-wide uppercase">
            Zion Christian Mission Center • Free Bible Study Program
          </p>
          <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto mt-2 leading-relaxed">
            Discover the fulfilled prophecies and profound spiritual parables of the Holy Scriptures from Genesis to Revelation. Completely tuition-free.
          </p>
        </div>

        {/* Dynamic Referral Attribution & Validity Banner */}
        <div className="mb-6">
          {codeStatus === 'valid' && referrerProfile && (
            <div className="bg-white/10 backdrop-blur-md border border-emerald-400/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 flex-shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="text-left">
                  {/*<p className="text-xs text-sky-200 font-medium">Personal Invitation from Church Guide</p>*/}
                  <p className="text-sm font-bold text-white">
                    Invited by <span className="text-amber-300">{referrerProfile.name}</span>
                  </p>
                  {/*<p className="text-[11px] text-slate-300">
                    Area Chapter: <strong className="text-white">{referrerProfile.area}</strong> • Referral Code: <span className="font-mono text-sky-200 font-bold">{referrerProfile.referral_code || referrerProfile.serial_number}</span>
                  </p>*/}
                </div>
              </div>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-full font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                Verified Link
              </span>
            </div>
          )}

          {codeStatus === 'invalid' && (
            <div className="bg-rose-500/15 border border-rose-400/40 rounded-2xl p-4.5 flex items-start gap-3 text-xs text-rose-200 shadow-lg animate-in fade-in duration-200">
              <XCircle className="w-6 h-6 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-rose-300 text-sm">Registration link is invalid or no longer available.</p>
                <p className="mt-1 text-slate-300 leading-relaxed">
                  The referral identifier <span className="font-mono font-bold text-white bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800">"{activeRefCode}"</span> was not found in our active member directory.
                  Please verify the link provided by your church guide or contact them for an updated registration link.
                </p>
              </div>
            </div>
          )}

          {codeStatus === 'none' && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 text-center text-xs text-slate-300">
              <span className="text-sky-300 font-semibold">General Enrollment Portal:</span> Submit your basic contact details below and our staff will connect you with a dedicated Bible study teacher.
            </div>
          )}
        </div>

        {/* Success / Thank You Screen */}
        {isSuccess ? (
          <div className="bg-white rounded-3xl p-8 sm:p-12 text-slate-900 shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner ${
              isDuplicate ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-600'
            }`}>
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <span className={`text-xs font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full border inline-block mb-3 ${
              isDuplicate
                ? 'text-blue-800 bg-blue-50 border-blue-200'
                : 'text-emerald-700 bg-emerald-50 border-emerald-200'
            }`}>
              {isDuplicate ? 'Registration Already Received' : 'Application Received'}
            </span>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
              Thank You!
            </h2>

            <p className="text-slate-600 max-w-md mx-auto mb-6 text-sm sm:text-base leading-relaxed">
              {isDuplicate ? (
                <>
                  We already have your registration on file for the <strong>Zion Christian Mission Center Free Bible Study</strong>.
                  A mission teacher or evangelism counselor will be in touch with you shortly at{' '}
                  <span className="font-bold text-slate-900">{submittedProspect?.contact}</span>.
                  Please keep your contact line open.
                </>
              ) : (
                <>
                  Your registration has been received. We'll get in touch with you.
                  Please keep your contact line open.
                </>
              )}
            </p>

            {submittedProspect && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6 text-left max-w-md mx-auto space-y-2 text-xs text-slate-700">
                <p className="font-bold text-slate-500 uppercase tracking-wider text-[11px] mb-2">
                  Registration Details
                </p>
                <p>
                  <span className="text-slate-500">Student Name:</span> <strong>{submittedProspect.name}</strong>
                </p>
                <p>
                  <span className="text-slate-500">Contact Line:</span> <strong>{submittedProspect.contact}</strong>
                </p>
                <p>
                  <span className="text-slate-500">Location:</span> <strong>{submittedProspect.location}</strong>
                </p>
              </div>
            )}

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
                className="px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-md transition-all text-sm flex items-center justify-center gap-2"
              >
                <span>Register Another Person</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Public Registration Form Card */
          <div className="bg-white rounded-3xl p-6 sm:p-10 text-slate-900 shadow-2xl border border-slate-100">
            <div className="border-b border-slate-200 pb-5 mb-6">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                Bible Study Enrollment Form
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Please enter your information accurately so our missionary educators can coordinate your introductory class.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-medium flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
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
                    disabled={codeStatus === 'invalid'}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-50 disabled:bg-slate-100"
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
                      disabled={codeStatus === 'invalid'}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-50 disabled:bg-slate-100"
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
                      disabled={codeStatus === 'invalid'}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-50 disabled:bg-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Gender <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  disabled={codeStatus === 'invalid'}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-50 disabled:bg-slate-100"
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
                      disabled={codeStatus === 'invalid'}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-50 disabled:bg-slate-100"
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
                    City / Municipality <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Quezon City, Cebu City, Bacoor"
                    disabled={codeStatus === 'invalid'}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-50 disabled:bg-slate-100"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting || codeStatus === 'invalid'}
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-700 to-sky-600 hover:from-blue-800 hover:to-sky-700 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    'Submitting Application...'
                  ) : codeStatus === 'invalid' ? (
                    'Registration Link Unavailable'
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
                  By submitting, you agree to receive study scheduling communication from Zion Christian Mission Center.
                  Your personal information is kept strictly private.
                </p>
              </div>
            </form>
          </div>
        )}

        {/* Feature Highlights Grid */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-xs">
            <BookOpen className="w-6 h-6 text-sky-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-white">Systematic Course</h4>
            <p className="text-xs text-slate-300 mt-1">Foundational biblical covenants, parables, and fulfilled spiritual prophecies.</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-xs">
            <Globe className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-white">Global Fellowship</h4>
            <p className="text-xs text-slate-300 mt-1">Study with dedicated teachers online or at your nearest local center.</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-xs">
            <Heart className="w-6 h-6 text-amber-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-white">100% Free Always</h4>
            <p className="text-xs text-slate-300 mt-1">Without money and without price, according to Revelation 22:17.</p>
          </div>
        </div>
      </main>

      {/* Standalone Public Footer (No Internal Chrome) */}
      <footer className="w-full border-t border-slate-800 bg-slate-950/80 backdrop-blur-md py-6 text-xs text-slate-400 relative z-10">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <p className="font-semibold text-slate-300">
              Zion Christian Mission Center
            </p>
            <p className="text-[11px] text-slate-500">
              Free Bible Study • Student Education
            </p>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>Privacy Confidentiality Guaranteed</span>
            {/*{onOpenPortalLogin && (
              <button
                onClick={onOpenPortalLogin}
                className="text-slate-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
              >
                <Lock className="w-3 h-3" />
                <span>Worker Login</span>
              </button>
            )}*/}
          </div>
        </div>
      </footer>
    </div>
  );
};
