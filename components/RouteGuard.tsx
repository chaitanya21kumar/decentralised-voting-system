import React from 'react';
import { useVoterAuth, useAdminAuth } from '../utils/useAuth';

interface RouteGuardProps {
  children: React.ReactNode;
  role: 'voter' | 'admin';
  fallback?: React.ReactNode;
}

export function RouteGuard({ children, role, fallback }: RouteGuardProps) {
  const voterAuth = useVoterAuth('/signin');
  const adminAuth = useAdminAuth('/admin');
  
  const auth = role === 'admin' ? adminAuth : voterAuth;

  if (auth.loading) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-500"></div>
        <p className="ml-4 text-indigo-300">Checking authentication...</p>
      </div>
    );
  }

  if (!auth.authenticated) {
    return null; // Redirect happens in the hook
  }

  return <>{children}</>;
}

export function VoterGuard({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return <RouteGuard role="voter" fallback={fallback}>{children}</RouteGuard>;
}

export function AdminGuard({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return <RouteGuard role="admin" fallback={fallback}>{children}</RouteGuard>;
}
