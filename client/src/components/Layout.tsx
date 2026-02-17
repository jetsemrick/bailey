import { type ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import Settings from './Settings';
import Timer from './Timer';

interface Breadcrumb {
  label: string;
  to?: string;
}

interface LayoutProps {
  children: ReactNode;
  breadcrumbs?: Breadcrumb[];
  /** Extra action buttons rendered in the header (right side, before settings) */
  headerActions?: ReactNode;
}

export default function Layout({ children, breadcrumbs, headerActions }: LayoutProps) {
  const { user, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const location = useLocation();

  // Close menu on route change
  useEffect(() => {
    setShowUserMenu(false);
  }, [location.pathname]);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="bg-card border-b border-card-04 px-4 h-12 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            to="/"
            className="text-lg font-bold tracking-tight hover:opacity-80 transition-opacity shrink-0"
          >
            Bailey
          </Link>
          {breadcrumbs?.map((bc, i) => (
            <span key={i} className="flex items-center gap-2 min-w-0">
              <span className="text-foreground/20">/</span>
              {bc.to ? (
                <Link
                  to={bc.to}
                  className="text-sm font-medium hover:text-accent truncate transition-colors"
                >
                  {bc.label}
                </Link>
              ) : (
                <span className="text-sm font-medium truncate">{bc.label}</span>
              )}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {headerActions}
          {location.pathname.startsWith('/round/') && <Timer />}
          <Settings />
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu((v) => !v)}
                className="p-2 rounded hover:bg-card-02 transition-colors text-sm text-foreground/60"
                title={user.email ?? 'Account'}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </button>
              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-card-04 rounded-lg shadow-lg py-1 min-w-[180px]">
                    <div className="px-3 py-2 text-xs text-foreground/50 border-b border-card-04 truncate">
                      {user.email}
                    </div>
                    <button
                      onClick={signOut}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-card-02 transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>
      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col">{children}</main>
    </div>
  );
}
