'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { Role, hasRole, useCurrentUser } from '@/lib/auth';
import { Button } from './Button';

/**
 * Hides a page from roles that may not use it. This is only for a clean UI —
 * the backend checks the same roles on every request.
 */
export const RoleGuard: React.FC<{ roles: Role[]; children: React.ReactNode }> = ({ roles, children }) => {
  const router = useRouter();
  const { user, loading } = useCurrentUser();

  if (loading && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!hasRole(user, ...roles)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100 text-center space-y-4">
          <ShieldAlert className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-extrabold text-gray-900">No access</h2>
          <p className="text-sm font-semibold text-gray-500">
            Your role does not have access to this page. Ask an admin if you need it.
          </p>
          <Button variant="dashboard" onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
