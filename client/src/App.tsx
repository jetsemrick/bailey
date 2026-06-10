import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import AuthGuard from './auth/AuthGuard';
import AdminGuard from './auth/AdminGuard';
import LoginPage from './auth/LoginPage';
import SignupPage from './auth/SignupPage';
import AuthPage from './auth/AuthPage';
import HomePage from './pages/HomePage';
import TournamentPage from './pages/TournamentPage';
import RoundPage from './pages/RoundPage';
import FlowPrototypePage from './pages/FlowPrototypePage';
import AdminDashboardPage from './pages/AdminDashboardPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/prototype" element={<FlowPrototypePage />} />
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
                <TournamentPage />
              </AuthGuard>
            }
          />
          <Route
            path="/round/:id"
            element={
              <AuthGuard>
                <RoundPage />
              </AuthGuard>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminGuard>
                <AdminDashboardPage />
              </AdminGuard>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
