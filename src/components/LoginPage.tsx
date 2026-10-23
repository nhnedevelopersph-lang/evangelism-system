import React, { useState } from 'react';
import { appStore } from '../services/store';
import { Profile } from '../types';
import {
  User,
  Lock,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  BookOpen
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: Profile) => void;
  onNavigateToRegister?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onNavigateToRegister,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Invalid username or password.');
      return;
    }

    setLoading(true);
    try {
      const res = await appStore.login(username.trim(), password);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setError(res.message || 'Invalid username or password.');
      }
    } catch (_) {
      setError('Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-950 to-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 font-sans">
      <div className="flex-1 flex items-center justify-center py-10">
        <div className="bg-white rounded-3xl max-w-md w-full p-8 sm:p-10 shadow-2xl border border-slate-100 text-slate-900 animate-in fade-in zoom-in-95 duration-200">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 bg-white rounded-full p-1 shadow-lg ring-4 ring-blue-100">
              <img
                src="/assets/aistudio/Zion_Christian_Mission_Center_-_Logo_ab51933b.png"
                alt="Zion Christian Mission Center"
                className="w-full h-full object-contain rounded-full"
              />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Member Portal Login
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Zion Christian Mission Center • Evangelism & Student Management
            </p>
          </div>

          {/* Secure Error Alert */}
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  autoComplete="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
            </div>

            {/* Password Input with Show/Hide Toggle */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Developer Testing Credentials Helper Callout */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-left">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Developer Testing Credentials</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Username: <span className="font-mono font-bold text-blue-700">useradmin</span>
                <br />
                Password: <span className="font-mono font-bold text-blue-700">useradmin43</span>
              </p>
            </div>

            {onNavigateToRegister && (
              <button
                type="button"
                onClick={onNavigateToRegister}
                className="mt-4 text-xs text-blue-700 hover:text-blue-900 font-semibold inline-flex items-center gap-1.5 transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Go to Free Bible Study Registration</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <footer className="text-center text-xs text-slate-400 pb-2">
        Zion Christian Mission Center • Authorized Worker Access Only
      </footer>
    </div>
  );
};
