import React, { Suspense, lazy } from 'react';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';

const AdminDashboard = lazy(() => import('@/components/AdminDashboard'));

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  // Use a demo org ID — in production this comes from user.org_id
  const orgId = (user as any)?.org_id || 'demo-org-id';

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Header />
      <Suspense fallback={
        <div className="p-8 text-center text-gray-400 animate-pulse">Loading dashboard…</div>
      }>
        <AdminDashboard orgId={orgId} />
      </Suspense>
    </div>
  );
};

export default DashboardPage;
