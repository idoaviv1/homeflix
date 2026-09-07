import React, { useState } from 'react';
import { X, User, Lock, ArrowRight } from 'lucide-react';
import { api } from '../lib/api';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let res;
      if (isRegister) {
        res = await api.register(username, password, displayName || undefined);
      } else {
        res = await api.login(username, password);
      }
      onSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="relative w-full max-w-md bg-[#181818] border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl text-white">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-neutral-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <span className="text-xs font-bold uppercase tracking-widest text-[#E50914]">OMFLIX</span>
          <h2 className="text-2xl font-black mt-1">
            {isRegister ? 'Create Your Account' : 'Sign In to Omflix'}
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            {isRegister
              ? 'Save your watch history, continue watching, and favorites across all devices.'
              : 'Sign in to access your personal continue watching and watchlists.'}
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400 text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 uppercase mb-1">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. idan"
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-900 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#E50914]"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase mb-1">
                Display Name (Optional)
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Idan Dodi"
                className="w-full px-4 py-2.5 bg-neutral-900 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#E50914]"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-300 uppercase mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-900 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#E50914]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-[#E50914] text-white font-bold text-sm hover:bg-[#b80710] transition-colors shadow-lg shadow-[#E50914]/30 flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            {loading ? 'Processing...' : isRegister ? 'Register' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-white/10 text-center">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-xs text-neutral-400 hover:text-white transition-colors"
          >
            {isRegister
              ? 'Already have an account? Sign in'
              : "Don't have an account? Create one"}
          </button>
        </div>
      </div>
    </div>
  );
}
