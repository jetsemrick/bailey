import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { supabase } from '../db/supabase';
import {
  handlePasswordResetCallback,
  hasAuthCallbackParams,
} from './passwordReset';

export default function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [checkingCallback, setCheckingCallback] = useState(true);
  const [callbackError, setCallbackError] = useState<string | null>(null);
  const [showResetForm, setShowResetForm] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const href = window.location.href;
      if (!hasAuthCallbackParams(href)) {
        if (!cancelled) {
          setCheckingCallback(false);
        }
        return;
      }

      const result = await handlePasswordResetCallback(supabase.auth, href);
      if (cancelled) return;

      window.history.replaceState({}, document.title, '/auth');

      if (result.error) {
        setCallbackError(result.error);
      } else {
        setShowResetForm(result.shouldShowResetForm);
      }

      setCheckingCallback(false);
    };

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(false);

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    setFormSuccess(true);
    setPassword('');
    setConfirmPassword('');
  };

  if (loading || checkingCallback) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-foreground/60">Loading...</div>
      </div>
    );
  }

  if (callbackError) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-sm px-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Bailey</h1>
          <p className="text-red-500 text-sm mb-4">{callbackError}</p>
          <p className="text-foreground/60 text-sm">
            You can request a new reset email from account settings after signing in.
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              to="/login"
              className="px-4 py-2 bg-accent text-white rounded font-medium hover:bg-accent/90 transition-colors"
            >
              Go to Sign In
            </Link>
            <Link
              to="/signup"
              className="px-4 py-2 border border-card-04 rounded font-medium hover:bg-card-02 transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!showResetForm) {
    return <Navigate to={user ? '/' : '/login'} replace />;
  }

  return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm px-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Bailey</h1>
        <p className="text-foreground/60 mb-8 text-sm">Set your new password</p>

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
              New password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded border border-card-04 bg-card text-foreground focus:outline-none focus:border-accent"
              placeholder="At least 6 characters"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 rounded border border-card-04 bg-card text-foreground focus:outline-none focus:border-accent"
              placeholder="Re-enter password"
            />
          </div>

          {formError && <p className="text-red-500 text-sm">{formError}</p>}
          {formSuccess && (
            <p className="text-green-600 text-sm">
              Password updated successfully. You can continue to Bailey.
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 bg-accent text-white rounded font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Updating password...' : 'Update Password'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-4 w-full py-2 border border-card-04 rounded font-medium hover:bg-card-02 transition-colors"
        >
          Continue to Bailey
        </button>
      </div>
    </div>
  );
}
