import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, profileError, refreshProfile } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-foreground/60">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profileError) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <div className="text-foreground/70 text-sm">Failed to load your profile: {profileError}</div>
        <button
          type="button"
          onClick={() => void refreshProfile()}
          className="px-3 py-1.5 rounded bg-accent text-white hover:bg-accent/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
