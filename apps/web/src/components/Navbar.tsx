import React, { useState } from 'react';
import { Search, User as UserIcon, Shield, LogIn, LogOut } from 'lucide-react';
import type { User } from '../lib/api';

export interface NavbarProps {
  user: User | null;
  activeNav: string;
  onNavigate: (page: string) => void;
  onOpenSearch: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export function Navbar({
  user,
  activeNav,
  onNavigate,
  onOpenSearch,
  onOpenAuth,
  onLogout,
}: NavbarProps) {
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 safe-top">
      <div className="glass-heavy border-b border-white/5">
        <nav className="mx-auto flex h-16 max-w-[1920px] items-center justify-between px-4 md:px-8">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <button
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2 shrink-0 cursor-pointer"
              aria-label="Omflix Home"
            >
              <img src="/omflix-logo.svg" alt="Omflix" className="h-8 w-auto" />
            </button>

            {/* Center navigation — hidden on mobile */}
            <div className="hidden md:flex items-center gap-6">
              <button
                onClick={() => onNavigate('home')}
                className={`text-sm font-semibold transition-colors ${
                  activeNav === 'home' ? 'text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Home
              </button>
              <button
                onClick={() => onNavigate('movies')}
                className={`text-sm font-semibold transition-colors ${
                  activeNav === 'movies' ? 'text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Movies
              </button>
              <button
                onClick={() => onNavigate('shows')}
                className={`text-sm font-semibold transition-colors ${
                  activeNav === 'shows' ? 'text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                TV Shows
              </button>
              <button
                onClick={() => onNavigate('watchlist')}
                className={`text-sm font-semibold transition-colors ${
                  activeNav === 'watchlist' ? 'text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                My List
              </button>
              <button
                onClick={() => onNavigate('admin')}
                className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded border transition-colors ${
                  activeNav === 'admin'
                    ? 'bg-[#E50914] text-white border-[#E50914]'
                    : 'bg-white/5 text-neutral-300 border-white/10 hover:bg-white/15'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-[#E50914]" />
                Admin
              </button>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenSearch}
              className="rounded-full p-2 text-neutral-400 hover:text-white transition-colors"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* User Profile / Login */}
            <div className="relative">
              {user ? (
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-2 rounded-full p-1 text-neutral-300 hover:text-white transition-colors"
                  aria-label="Profile"
                >
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#E50914] to-red-950 flex items-center justify-center font-bold text-xs text-white uppercase shadow-md">
                    {user.displayName?.[0] || user.username[0]}
                  </div>
                </button>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E50914] hover:bg-[#b80710] text-xs font-bold text-white transition-colors shadow-md"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Sign In
                </button>
              )}

              {/* User Dropdown */}
              {showUserDropdown && user && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl bg-neutral-900 border border-white/10 shadow-2xl p-2 z-50 text-white animate-in fade-in">
                  <div className="p-3 border-b border-white/10">
                    <p className="text-sm font-bold truncate">{user.displayName || user.username}</p>
                    <p className="text-xs text-neutral-400 truncate">@{user.username}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-white/10 text-neutral-300">
                      {user.role}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      onNavigate('admin');
                      setShowUserDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-neutral-300 hover:text-white hover:bg-white/10 rounded-lg flex items-center gap-2 mt-1"
                  >
                    <Shield className="w-4 h-4 text-[#E50914]" />
                    Server Dashboard
                  </button>

                  <button
                    onClick={() => {
                      onLogout();
                      setShowUserDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 rounded-lg flex items-center gap-2 mt-1"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
