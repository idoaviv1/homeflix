import React, { useState, useEffect } from 'react';
import { Search, User as UserIcon, Shield, LogIn, LogOut, Download, Sun, Moon, Globe, Clock } from 'lucide-react';
import { api, type User } from '../lib/api';
import { DownloadsDrawer } from './DownloadsDrawer';
import { useThemeLanguage } from '../context/ThemeLanguageContext';

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
  const { theme, toggleTheme, language, toggleLanguage, t } = useThemeLanguage();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showDownloads, setShowDownloads] = useState(false);
  const [activeDownloadsCount, setActiveDownloadsCount] = useState(0);

  useEffect(() => {
    const checkActive = () => {
      api
        .getDownloads()
        .then((jobs) => {
          const active = jobs.filter((j) => j.status === 'downloading' || j.status === 'queued');
          setActiveDownloadsCount(active.length);
        })
        .catch(() => {});
    };

    checkActive();
    const interval = setInterval(checkActive, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 safe-top">
      <div className="glass-heavy border-b border-white/5">
        <nav className="mx-auto flex h-16 max-w-[1920px] items-center justify-between px-4 md:px-8">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <button
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2 shrink-0 cursor-pointer"
              aria-label="Homeflix Home"
            >
              <img src="/homeflix-logo.svg" alt="Homeflix" className="h-8 w-auto" />
            </button>

            {/* Center navigation — hidden on mobile */}
            <div className="hidden md:flex items-center gap-6">
              <button
                onClick={() => onNavigate('home')}
                className={`text-sm font-semibold transition-colors ${
                  activeNav === 'home' ? 'text-white font-bold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {t('home')}
              </button>
              <button
                onClick={() => onNavigate('movies')}
                className={`text-sm font-semibold transition-colors ${
                  activeNav === 'movies' ? 'text-white font-bold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {t('movies')}
              </button>
              <button
                onClick={() => onNavigate('shows')}
                className={`text-sm font-semibold transition-colors ${
                  activeNav === 'shows' ? 'text-white font-bold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {t('shows')}
              </button>
              <button
                onClick={() => onNavigate('watchlist')}
                className={`text-sm font-semibold transition-colors cursor-pointer ${
                  activeNav === 'watchlist' ? 'text-white font-bold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {t('watchlist')}
              </button>
              <button
                onClick={() => onNavigate('history')}
                className={`text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeNav === 'history' ? 'text-white font-bold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-[#E50914]" />
                <span>{t('watchHistory')}</span>
              </button>
              <button
                onClick={() => onNavigate('downloads')}
                className={`text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeNav === 'downloads' ? 'text-white font-bold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <span>{language === 'he' ? 'הורדות במכשיר' : 'Downloads'}</span>
              </button>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Language Switcher (Hebrew / English) */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-xs font-semibold transition-all border border-white/10 cursor-pointer select-none"
              title={language === 'en' ? 'Switch to Hebrew' : 'החלף לאנגלית'}
              aria-label="Toggle Language"
            >
              <Globe className="w-3.5 h-3.5 text-neutral-400" />
              <span className={language === 'he' ? 'text-[#E50914] font-bold' : 'text-neutral-400'}>עב</span>
              <span className="text-white/20">|</span>
              <span className={language === 'en' ? 'text-[#E50914] font-bold' : 'text-neutral-400'}>EN</span>
            </button>

            {/* Theme Switcher (Dark / Light) */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer border border-transparent hover:border-white/10"
              title={theme === 'dark' ? t('lightMode') : t('darkMode')}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400 transition-transform duration-300 hover:rotate-90 hover:scale-110" />
              ) : (
                <Moon className="h-4 w-4 text-indigo-400 transition-transform duration-300 hover:-rotate-45 hover:scale-110" />
              )}
            </button>

            {/* Admin Button - strictly visible ONLY to ADMIN role */}
            {user?.role === 'admin' && (
              <button
                onClick={() => onNavigate('admin')}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                  activeNav === 'admin'
                    ? 'bg-[#E50914] text-white border-[#E50914] shadow-md shadow-[#E50914]/30'
                    : 'bg-white/5 text-neutral-300 border-white/10 hover:bg-white/15'
                }`}
                title="Server Control Panel (127.0.0.1:8097)"
              >
                <Shield className="w-3.5 h-3.5 text-[#E50914]" />
                <span>{t('admin')}</span>
              </button>
            )}

            {/* Downloads Drawer Button */}
            <button
              onClick={() => setShowDownloads(true)}
              className="relative rounded-full p-2 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title={t('downloadsManager')}
              aria-label="Downloads"
            >
              <Download className="h-5 w-5" />
              {activeDownloadsCount > 0 && (
                <span className="absolute 0 top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#E50914] text-[10px] font-extrabold text-white animate-pulse">
                  {activeDownloadsCount}
                </span>
              )}
            </button>

            <button
              onClick={onOpenSearch}
              className="rounded-full p-2 text-neutral-400 hover:text-white transition-colors cursor-pointer"
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E50914] hover:bg-[#b80710] text-xs font-bold text-white transition-colors shadow-md cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  {t('signIn')}
                </button>
              )}

              {/* User Dropdown */}
              {showUserDropdown && user && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-neutral-900 border border-white/10 shadow-2xl p-2 z-50 text-white animate-in fade-in">
                  <div className="p-3 border-b border-white/10">
                    <p className="text-sm font-bold truncate">{user.displayName || user.username}</p>
                    <p className="text-xs text-neutral-400 truncate">@{user.username}</p>
                    <span className={`inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                      user.role === 'admin'
                        ? 'bg-[#E50914]/20 text-[#E50914] border border-[#E50914]/30'
                        : 'bg-white/10 text-neutral-300'
                    }`}>
                      {user.role === 'admin' ? (language === 'he' ? 'מנהל מערכת' : 'ADMINISTRATOR') : (language === 'he' ? 'משתמש רשום' : 'MEMBER')}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      onNavigate('history');
                      setShowUserDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-neutral-300 hover:text-white hover:bg-white/10 rounded-lg flex items-center gap-2 mt-1 cursor-pointer"
                  >
                    <Clock className="w-4 h-4 text-[#E50914]" />
                    <span>{t('watchHistory')}</span>
                  </button>

                  {user.role === 'admin' && (
                    <button
                      onClick={() => {
                        onNavigate('admin');
                        setShowUserDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-neutral-300 hover:text-white hover:bg-white/10 rounded-lg flex items-center gap-2 mt-1 cursor-pointer"
                    >
                      <Shield className="w-4 h-4 text-[#E50914]" />
                      <span>{language === 'he' ? 'לוח בקרה לניהול' : 'Server Dashboard'}</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      onLogout();
                      setShowUserDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 rounded-lg flex items-center gap-2 mt-1 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t('signOut')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>
      </div>

      {/* Downloads Slide-over Drawer */}
      <DownloadsDrawer isOpen={showDownloads} onClose={() => setShowDownloads(false)} />
    </header>
  );
}
