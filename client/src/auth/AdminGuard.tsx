import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();

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

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
