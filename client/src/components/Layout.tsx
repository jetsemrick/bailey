import { type ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { KeyboardMacrosProvider } from '../contexts/KeyboardMacrosContext';
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
  const { user, role, isAdmin, signOut, requestPasswordReset } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetNotice, setResetNotice] = useState<string | null>(null);
  const location = useLocation();

  // Close menu on route change
  useEffect(() => {
    setShowUserMenu(false);
    setResetNotice(null);
  }, [location.pathname]);

  const handlePasswordResetRequest = async () => {
    setResetNotice(null);
    setResetSubmitting(true);
    const { error } = await requestPasswordReset();
    setResetSubmitting(false);

    if (error) {
      setResetNotice(error);
      return;
    }

    setResetNotice('Password reset email sent. Check your inbox.');
  };

  return (
    <KeyboardMacrosProvider>
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
          {isAdmin && (
            <Link
              to="/admin"
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                location.pathname === '/admin'
                  ? 'bg-accent/10 text-accent'
                  : 'text-foreground/60 hover:bg-card-02 hover:text-foreground'
              }`}
            >
              Admin
            </Link>
          )}
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
                    <div className="px-3 py-2 text-xs text-foreground/50 border-b border-card-04 space-y-0.5">
                      <div className="truncate">
                        {[user.user_metadata?.first_name, user.user_metadata?.last_name]
                          .filter(Boolean)
                          .join(' ') || user.email}
                      </div>
                      {user.email && (
                        <div className="truncate text-foreground/40">{user.email}</div>
                      )}
                      {role && (
                        <div className="truncate text-foreground/40">Role: {role}</div>
                      )}
                    </div>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        className="block px-3 py-2 text-sm hover:bg-card-02 transition-colors"
                      >
                        Admin Dashboard
                      </Link>
                    )}
                    <button
                      onClick={handlePasswordResetRequest}
                      disabled={resetSubmitting}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-card-02 transition-colors disabled:opacity-50"
                    >
                      {resetSubmitting ? 'Sending reset email...' : 'Change password'}
                    </button>
                    <button
                      onClick={signOut}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-card-02 transition-colors"
                    >
                      Sign out
                    </button>
                    {resetNotice && (
                      <div className="px-3 py-2 text-xs text-foreground/60 border-t border-card-04">
                        {resetNotice}
                      </div>
                    )}
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
    </KeyboardMacrosProvider>
  );
}
