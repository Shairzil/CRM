'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { RoleGuard } from './RoleGuard';

/**
 * Confidential pages. Salary and IO are admin-only; balance and collections
 * are also open to the accounts role. The backend enforces the same rules.
 * (The old hard-coded admin password in the browser is gone.)
 */
export const ConfidentialGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname() || '';
  const adminOnly = pathname.includes('/salary') || pathname.includes('/io');
  return <RoleGuard roles={adminOnly ? ['admin'] : ['admin', 'accounts']}>{children}</RoleGuard>;
};
