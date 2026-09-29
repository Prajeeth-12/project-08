import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface Props { children: React.ReactNode; }

/** Redirect unauthenticated users to /login, preserving the intended path. */
const ProtectedRoute: React.FC<Props> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-2 border-[#DC2626]/20 border-t-[#DC2626] rounded-full animate-spin" />
    </div>
  );

  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;

  return <>{children}</>;
};

export default ProtectedRoute;
