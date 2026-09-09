import React, { useEffect } from 'react';
import {
  X,
  Home,
  Film,
  Tv,
  Bookmark,
  Clock,
  Download,
  Server,
  Shield,
  LogIn,
  LogOut,
  Sun,
  Moon,
  Globe,
  CheckCircle2,
} from 'lucide-react';
import { type User } from '../lib/api';
import { useThemeLanguage } from '../context/ThemeLanguageContext';

export interface MobileSideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  activeNav: string;
  onNavigate: (page: string) => void;
  onOpenAuth: () => void;
  onOpenDownloads: () => void;
  onOpenServerModal: () => void;
  onLogout: () => void;
  activeDownloadsCount: number;
}

export const MobileSideMenu: React.FC<MobileSideMenuProps> = ({
  isOpen,
  onClose,
  user,
  activeNav,
  onNavigate,
  onOpenAuth,
  onOpenDownloads,
  onOpenServerModal,
  onLogout,
  activeDownloadsCount,
}) => {
  const { theme, toggleTheme, language, toggleLanguage, t } = useThemeLanguage();
  const isRtl = language === 'he';

  // Prevent background scrolling when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNavClick = (page: string) => {
    onNavigate(page);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop with blur */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-md animate-modal-backdrop transition-opacity cursor-pointer"
        aria-hidden="true"
      />

      {/* Slide-over Menu Panel */}
      <div
        className={`fixed top-0 bottom-0 w-[84%] max-w-sm z-50 bg-[#121214] border-white/10 shadow-2xl flex flex-col safe-top safe-bottom ${
          isRtl
            ? 'right-0 border-l animate-drawer-right'
            : 'left-0 border-r animate-drawer-left'
        }`}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <img src="/homeflix-logo.svg" alt="Homeflix" className="h-7 w-auto object-contain" />
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* User Profile Card */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 shadow-lg">
            {user ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#E50914] to-red-950 flex items-center justify-center font-black text-sm text-white uppercase shadow-md shrink-0 border border-white/10">
                    {user.displayName?.[0] || user.username[0]}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-white truncate">
                      {user.displayName || user.username}
                    </p>
                    <p className="text-xs text-neutral-400 truncate">@{user.username}</p>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        user.role === 'admin'
                          ? 'bg-[#E50914]/20 text-[#E50914] border border-[#E50914]/30'
                          : 'bg-white/10 text-neutral-300'
                      }`}
                    >
                      {user.role === 'admin'
                        ? isRtl
                          ? 'מנהל מערכת'
                          : 'ADMIN'
                        : isRtl
                        ? 'משתמש רשום'
                        : 'MEMBER'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="p-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors shrink-0 cursor-pointer"
                  title={t('signOut')}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div>
                <p className="text-xs font-semibold text-neutral-300 mb-1">
                  {isRtl ? 'שלום אורח' : 'Welcome Guest'}
                </p>
                <p className="text-[11px] text-neutral-400 mb-3">
                  {isRtl
                    ? 'התחבר לחשבונך לשמירת רשימת צפייה והיסטוריה'
                    : 'Sign in to sync your watchlist and history'}
                </p>
                <button
                  onClick={() => {
                    onOpenAuth();
                    onClose();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#E50914] hover:bg-[#b80710] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#E50914]/30 active:scale-95 transition-all cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{t('signIn')}</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Settings: Language & Theme Controls */}
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
            {/* Language Switcher */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-neutral-300 font-medium">
                <Globe className="w-3.5 h-3.5 text-neutral-400" />
                <span>{isRtl ? 'שפת ממשק:' : 'Language:'}</span>
              </div>
              <div className="flex items-center bg-black/40 p-0.5 rounded-lg border border-white/10 text-xs">
                <button
                  onClick={() => {
                    if (language !== 'he') toggleLanguage();
                  }}
                  className={`px-2.5 py-1 rounded-md transition-all font-semibold cursor-pointer ${
                    language === 'he'
                      ? 'bg-[#E50914] text-white shadow-sm font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  עברית
                </button>
                <button
                  onClick={() => {
                    if (language !== 'en') toggleLanguage();
                  }}
                  className={`px-2.5 py-1 rounded-md transition-all font-semibold cursor-pointer ${
                    language === 'en'
                      ? 'bg-[#E50914] text-white shadow-sm font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            {/* Theme Switcher */}
            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <div className="flex items-center gap-2 text-xs text-neutral-300 font-medium">
                {theme === 'dark' ? (
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                ) : (
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>{isRtl ? 'ערכת נושא:' : 'Theme:'}</span>
              </div>
              <button
                onClick={toggleTheme}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/40 hover:bg-white/10 border border-white/10 text-xs font-semibold text-neutral-300 hover:text-white transition-all cursor-pointer"
              >
                {theme === 'dark' ? (
                  <>
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{isRtl ? 'מצב כהה' : 'Dark Mode'}</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isRtl ? 'מצב בהיר' : 'Light Mode'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-1">
            <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
              {isRtl ? 'ניווט ותכנים' : 'Navigation'}
            </p>

            <SideMenuItem
              icon={Home}
              label={t('home')}
              active={activeNav === 'home'}
              onClick={() => handleNavClick('home')}
            />

            <SideMenuItem
              icon={Film}
              label={t('movies')}
              active={activeNav === 'movies'}
              onClick={() => handleNavClick('movies')}
            />

            <SideMenuItem
              icon={Tv}
              label={t('shows')}
              active={activeNav === 'shows'}
              onClick={() => handleNavClick('shows')}
            />

            <SideMenuItem
              icon={Bookmark}
              label={t('watchlist')}
              active={activeNav === 'watchlist'}
              onClick={() => handleNavClick('watchlist')}
            />

            <SideMenuItem
              icon={Clock}
              label={t('watchHistory')}
              active={activeNav === 'history'}
              onClick={() => handleNavClick('history')}
            />

            <SideMenuItem
              icon={Download}
              label={isRtl ? 'הורדות במכשיר' : 'Downloads'}
              active={activeNav === 'downloads'}
              badge={activeDownloadsCount > 0 ? activeDownloadsCount : undefined}
              onClick={() => handleNavClick('downloads')}
            />

            {/* Server Settings Link */}
            <SideMenuItem
              icon={Server}
              label={isRtl ? 'הגדרות שרת ורשת' : 'Server Settings'}
              onClick={() => {
                onOpenServerModal();
                onClose();
              }}
            />

            {/* Admin Link (Only for admin) */}
            {user?.role === 'admin' && (
              <SideMenuItem
                icon={Shield}
                label={isRtl ? 'לוח בקרה לניהול' : 'Admin Panel'}
                active={activeNav === 'admin'}
                onClick={() => handleNavClick('admin')}
                highlight
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-white/10 bg-white/[0.02]">
          <div className="flex items-center justify-between text-[11px] text-neutral-400">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{isRtl ? 'מחובר לשרת Homeflix' : 'Connected to Homeflix'}</span>
            </span>
            <span className="font-mono text-neutral-500">v0.1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface SideMenuItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  badge?: number;
  highlight?: boolean;
  onClick: () => void;
}

const SideMenuItem: React.FC<SideMenuItemProps> = ({
  icon: Icon,
  label,
  active,
  badge,
  highlight,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
        active
          ? 'bg-[#E50914] text-white shadow-md shadow-[#E50914]/25 font-bold'
          : highlight
          ? 'bg-white/5 text-amber-300 hover:bg-white/10 border border-amber-400/20'
          : 'text-neutral-300 hover:text-white hover:bg-white/5'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-4 h-4 ${active ? 'text-white' : highlight ? 'text-amber-400' : 'text-neutral-400'}`} />
        <span>{label}</span>
      </div>
      {typeof badge === 'number' && badge > 0 && (
        <span className="px-2 py-0.5 rounded-full bg-[#E50914] text-white text-[10px] font-extrabold shadow-sm animate-pulse">
          {badge}
        </span>
      )}
    </button>
  );
};
