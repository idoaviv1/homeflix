import { Search, Bell, User, ChevronDown } from 'lucide-react';

export function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 safe-top">
      <div className="glass-heavy">
        <nav className="mx-auto flex h-16 max-w-[1920px] items-center justify-between px-4 md:px-8">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 shrink-0" aria-label="Omflix Home">
            <img
              src="/omflix-logo.svg"
              alt="Omflix"
              className="h-8 w-auto"
            />
          </a>

          {/* Center navigation — hidden on mobile */}
          <div className="hidden md:flex items-center gap-8">
            <NavLink href="/" active>Home</NavLink>
            <NavLink href="/movies">Movies</NavLink>
            <NavLink href="/shows">TV Shows</NavLink>
            <NavLink href="/my-list">My List</NavLink>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <button
              className="rounded-full p-2 text-omflix-muted hover:text-omflix-white transition-colors duration-200"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>
            <button
              className="hidden md:flex rounded-full p-2 text-omflix-muted hover:text-omflix-white transition-colors duration-200"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
            </button>
            <button
              className="flex items-center gap-1 rounded-full p-1.5 text-omflix-muted hover:text-omflix-white transition-colors duration-200"
              aria-label="Profile"
            >
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-omflix-red to-omflix-red-dark flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <ChevronDown className="hidden md:block h-3.5 w-3.5" />
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={`text-sm font-medium transition-colors duration-200 ${
        active
          ? 'text-omflix-white'
          : 'text-omflix-muted hover:text-omflix-text'
      }`}
    >
      {children}
    </a>
  );
}
