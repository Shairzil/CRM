'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, LayoutGrid } from 'lucide-react';
import { ROLE_LABELS, useCurrentUser } from '@/lib/auth';

export default function WelcomePage() {
  const router = useRouter();
  const { user, loading } = useCurrentUser();
  const roleName = user ? ROLE_LABELS[user.role] || user.role : 'Admin';

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-5 py-10 text-gray-900">
      <section className="w-full max-w-3xl rounded-[28px] border border-gray-100 bg-white px-7 py-12 text-center shadow-[0_12px_30px_rgba(15,23,42,0.08)] sm:px-12 sm:py-16">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <LayoutGrid className="h-8 w-8" />
        </div>
        <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-blue-600">NextEd Advisors</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
          {loading ? 'Welcome back' : `Welcome back, ${roleName}`}
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-gray-500 sm:text-base">
          You are signed in to your management workspace. Start here to open your dashboard and available modules.
        </p>
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="mt-8 inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-600/20"
        >
          Start here
          <ArrowRight className="h-4 w-4" />
        </button>
      </section>
    </main>
  );
}
