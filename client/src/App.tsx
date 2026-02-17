import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import AuthGuard from './auth/AuthGuard';
import LoginPage from './auth/LoginPage';
import SignupPage from './auth/SignupPage';
import HomePage from './pages/HomePage';
import TournamentPage from './pages/TournamentPage';
import RoundPage from './pages/RoundPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
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
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
