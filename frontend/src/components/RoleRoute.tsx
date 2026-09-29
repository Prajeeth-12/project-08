import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';

interface Props {
  children: React.ReactNode;
  roles: UserRole[];          // allowed roles
  fallback?: string;          // redirect if wrong role (default: '/')
}

/** Only renders children if authenticated user's role is in the allowed list. */
const RoleRoute: React.FC<Props> = ({ children, roles, fallback = '/' }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-2 border-[#DC2626]/20 border-t-[#DC2626] rounded-full animate-spin" />
    </div>
  );

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user || !roles.includes(user.role)) return <Navigate to={fallback} replace />;

  return <>{children}</>;
};

export default RoleRoute;
