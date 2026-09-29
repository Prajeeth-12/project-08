import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';

// Eager-loaded (auth critical)
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';

// Lazy-loaded pages (code-split)
const LandingPage         = lazy(() => import('./pages/LandingPage'));
const CandidateHomePage   = lazy(() => import('./pages/CandidateHomePage'));
const InterviewPage       = lazy(() => import('./pages/Index'));
const CodingPage          = lazy(() => import('./pages/CodingPage'));
const ExamPage            = lazy(() => import('./pages/ExamPage'));
const ProfilePage         = lazy(() => import('./pages/ProfilePage'));
const SettingsPage        = lazy(() => import('./pages/SettingsPage'));
const DashboardPage       = lazy(() => import('./pages/DashboardPage'));
const NotFound            = lazy(() => import('./pages/NotFound'));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-white">
    <div className="w-8 h-8 border-2 border-[#DC2626]/20 border-t-[#DC2626] rounded-full animate-spin" />
  </div>
);

/** Root redirect: candidates → /interview, staff → /dashboard, guests → / */
const RootRedirect: React.FC = () => {
  const { isAuthenticated, user, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <LandingPage />;
  if (user?.role === 'candidate') return <Navigate to="/home" replace />;
  return <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public */}
            <Route path="/"          element={<RootRedirect />} />
            <Route path="/login"     element={<LoginPage />} />
            <Route path="/register"  element={<RegisterPage />} />

            {/* Candidate-only */}
            <Route path="/home" element={
              <ProtectedRoute>
                <RoleRoute roles={['candidate']} fallback="/dashboard">
                  <CandidateHomePage />
                </RoleRoute>
              </ProtectedRoute>
            } />
            <Route path="/interview" element={
              <ProtectedRoute>
                <RoleRoute roles={['candidate']} fallback="/dashboard">
                  <InterviewPage />
                </RoleRoute>
              </ProtectedRoute>
            } />
            <Route path="/coding" element={
              <ProtectedRoute>
                <RoleRoute roles={['candidate']} fallback="/dashboard">
                  <CodingPage />
                </RoleRoute>
              </ProtectedRoute>
            } />
            {/* Exam — full page, no header, SEB locked */}
            <Route path="/exam/:examId" element={
              <ProtectedRoute>
                <RoleRoute roles={['candidate']} fallback="/home">
                  <ExamPage />
                </RoleRoute>
              </ProtectedRoute>
            } />

            {/* All authenticated */}
            <Route path="/profile"  element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

            {/* Faculty + Admin */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <RoleRoute roles={['faculty', 'admin']} fallback="/interview">
                  <DashboardPage />
                </RoleRoute>
              </ProtectedRoute>
            } />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <Toaster />
      </Router>
    </AuthProvider>
  );
}

export default App;
