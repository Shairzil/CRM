'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export const ConfidentialGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const isConfLoggedIn = typeof window !== 'undefined' ? sessionStorage.getItem('confidential_logged_in') === 'true' : false;
    
    if (pathname === '/dashboard/confidential') {
      // The login page itself should always be accessible
      setAuthorized(true);
      return;
    }

    if (!isConfLoggedIn) {
      setAuthorized(false);
      router.push('/dashboard/confidential');
    } else {
      setAuthorized(true);
    }
  }, [pathname, router]);

  if (!authorized) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white select-none">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <span className="text-sm font-extrabold text-blue-600 tracking-wider">VERIFYING CONFIDENTIAL ACCESS...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
