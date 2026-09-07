import { Home, Search, Bookmark, User } from 'lucide-react';

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-bottom">
      <div className="glass-heavy border-t border-omflix-border/30">
        <div className="flex items-center justify-around py-2 px-4">
          <MobileNavItem icon={Home} label="Home" active />
          <MobileNavItem icon={Search} label="Search" />
          <MobileNavItem icon={Bookmark} label="My List" />
          <MobileNavItem icon={User} label="Profile" />
        </div>
      </div>
    </nav>
  );
}

function MobileNavItem({
  icon: Icon,
  label,
  active,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      className={`flex flex-col items-center gap-1 px-4 py-1.5 transition-colors duration-200 ${
        active ? 'text-omflix-white' : 'text-omflix-muted'
      }`}
      aria-label={label}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
