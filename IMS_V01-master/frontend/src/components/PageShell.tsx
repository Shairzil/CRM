'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from './Button';
import { PageHeader } from './PageHeader';

interface PageShellProps {
  title: string;
  backTo?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
}

/** Common page frame shared by CRM pages. */
export const PageShell: React.FC<PageShellProps> = ({ title, backTo = '/dashboard', actions, children, maxWidth = 'max-w-6xl' }) => {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className={`${maxWidth} mx-auto space-y-6 animate-in fade-in duration-300`}>
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100 relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="back" onClick={() => router.push(backTo)} className="flex items-center gap-2 px-4 py-2 text-sm shadow-md">
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          </div>
          <div className="-mb-6">
            <PageHeader title={title} />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
};

/** Small helpers shared by the CRM pages. */
export const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg bg-white shadow-sm outline-none transition-all duration-150 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm';

export const labelClass = 'text-sm font-semibold text-gray-700';

export function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
