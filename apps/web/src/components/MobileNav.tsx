import React from 'react';
import { Home, Search, Bookmark, User, DownloadCloud } from 'lucide-react';
import { useThemeLanguage } from '../context/ThemeLanguageContext';

export interface MobileNavProps {
  activeNav: string;
  user?: any;
  onNavigate: (nav: string) => void;
  onOpenSearch: () => void;
  onOpenAuth: () => void;
}

export function MobileNav({
  activeNav,
  user,
  onNavigate,
  onOpenSearch,
  onOpenAuth,
}: MobileNavProps) {
  const { language } = useThemeLanguage();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-bottom">
      <div className="bg-[#121214]/95 backdrop-blur-xl border-t border-white/10 shadow-2xl">
        <div className="flex items-center justify-around py-2 px-2">
          <MobileNavItem
            icon={Home}
            label={language === 'he' ? 'בית' : 'Home'}
            active={activeNav === 'home'}
            onClick={() => onNavigate('home')}
          />
          <MobileNavItem
            icon={DownloadCloud}
            label={language === 'he' ? 'הורדות' : 'Downloads'}
            active={activeNav === 'downloads'}
            onClick={() => onNavigate('downloads')}
          />
          <MobileNavItem
            icon={Search}
            label={language === 'he' ? 'חיפוש' : 'Search'}
            active={false}
            onClick={onOpenSearch}
          />
          <MobileNavItem
            icon={Bookmark}
            label={language === 'he' ? 'רשימה' : 'My List'}
            active={activeNav === 'watchlist'}
            onClick={() => onNavigate('watchlist')}
          />
          <MobileNavItem
            icon={User}
            label={user ? (user.displayName || user.username) : (language === 'he' ? 'התחבר' : 'Sign In')}
            active={activeNav === 'history'}
            onClick={() => {
              if (user) {
                onNavigate('history');
              } else {
                onOpenAuth();
              }
            }}
          />
        </div>
      </div>
    </nav>
  );
}

function MobileNavItem({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-3 py-1.5 transition-all duration-200 cursor-pointer ${
        active ? 'text-[#E50914] font-bold scale-105' : 'text-neutral-400 hover:text-white'
      }`}
      aria-label={label}
    >
      <Icon className={`h-5 w-5 ${active ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
      <span className="text-[10px]">{label}</span>
    </button>
  );
}
