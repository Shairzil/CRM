'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { clearSession, getToken, isTokenValid } from '@/lib/auth';

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let token = getToken();
    if (token && !isTokenValid(token)) {
      // Expired token: drop it so the user logs in again.
      clearSession();
      token = null;
    }

    if (pathname === '/') {
      if (token) {
        router.push('/welcome');
      } else {
        setAuthorized(true);
      }
      return;
    }

    if (!token) {
      setAuthorized(false);
      router.push('/');
    } else {
      setAuthorized(true);
    }
  }, [pathname, router]);

  if (!authorized) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white select-none">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <span className="text-sm font-extrabold text-blue-600 tracking-wider">SECURE CONNECTION CHECK...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
