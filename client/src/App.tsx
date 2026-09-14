import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './auth/AuthContext';
import { FlowSheetVariantProvider } from './contexts/FlowSheetVariantContext';
import AuthGuard from './auth/AuthGuard';
import AdminGuard from './auth/AdminGuard';
import LoginPage from './auth/LoginPage';
import SignupPage from './auth/SignupPage';
import AuthPage from './auth/AuthPage';
import HomePage from './pages/HomePage';

const TournamentPage = lazy(() => import('./pages/TournamentPage'));
const RoundPage = lazy(() => import('./pages/RoundPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-gray-500">Loading...</div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FlowSheetVariantProvider>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route
            path="/"
            element={
              <AuthGuard>
                <HomePage />
              </AuthGuard>
            }
          />
          <Route
            path="/tournament/:id"
            element={
              <AuthGuard>
                <Suspense fallback={<LoadingFallback />}>
                  <TournamentPage />
                </Suspense>
              </AuthGuard>
            }
          />
          <Route
            path="/round/:id"
            element={
              <AuthGuard>
                <Suspense fallback={<LoadingFallback />}>
                  <RoundPage />
                </Suspense>
              </AuthGuard>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminGuard>
                <Suspense fallback={<LoadingFallback />}>
                  <AdminDashboardPage />
                </Suspense>
              </AdminGuard>
            }
          />
        </Routes>
        </FlowSheetVariantProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
