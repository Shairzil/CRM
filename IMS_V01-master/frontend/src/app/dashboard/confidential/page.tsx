'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { Banknote, Layers, ArrowLeft, Scale, HandCoins } from 'lucide-react';
import { Role, hasRole, useCurrentUser } from '@/lib/auth';

/**
 * Confidential menu. Access is now decided by the user's role on the server
 * (no separate hard-coded password in the browser any more).
 */
const ITEMS: { label: string; href: string; icon: React.ElementType; roles: Role[] }[] = [
  { label: 'Salary', href: '/dashboard/confidential/salary', icon: Banknote, roles: ['admin'] },
  { label: 'IO', href: '/dashboard/confidential/io', icon: Layers, roles: ['admin'] },
  { label: 'Balance', href: '/dashboard/confidential/balance', icon: Scale, roles: ['admin', 'accounts'] },
  { label: 'Collections', href: '/dashboard/confidential/collections', icon: HandCoins, roles: ['admin', 'accounts'] },
];

export default function ConfidentialPage() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const items = ITEMS.filter((i) => hasRole(user, ...i.roles));

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6">
      <div className="relative w-full max-w-3xl bg-white p-8 rounded-2xl shadow-xl border border-gray-100 space-y-8 text-center animate-in fade-in slide-in-from-bottom-8 duration-300">
        <div className="absolute top-8 left-8">
          <Button variant="back" onClick={() => router.push('/dashboard')} className="flex items-center gap-2 px-4 py-2 text-sm shadow-md">
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
        </div>

        <div className="pt-8">
          <PageHeader title="Confidential" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.href}
                variant="dashboard"
                onClick={() => router.push(item.href)}
                className="flex flex-col items-center justify-center gap-4 py-8 rounded-2xl shadow-lg text-lg select-none"
              >
                <Icon className="h-10 w-10 text-white" />
                <span>{item.label}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
