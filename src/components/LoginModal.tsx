import React, { useState } from 'react';
import { appStore } from '../services/store';
import { Profile } from '../types';
import {
  User,
  Lock,
  ArrowRight,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: Profile) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

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
        onSuccess(res.user);
        onClose();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 text-slate-900 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Logo & Title */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-3 bg-white rounded-full p-1 shadow-md ring-2 ring-blue-100">
            <img
              src="/assets/aistudio/Zion_Christian_Mission_Center_-_Logo_ab51933b.png"
              alt="Zion Christian Mission Center"
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">
            Member Portal Login
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Sign in with your username and password
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 mt-2"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-5 text-center">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 text-left text-xs">
            <p className="font-bold text-slate-700 flex items-center gap-1 text-[11px] mb-0.5">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Testing Credentials
            </p>
            <p className="text-[11px] text-slate-500">
              Username: <strong className="text-blue-700 font-mono">useradmin</strong> • Password: <strong className="text-blue-700 font-mono">useradmin43</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
