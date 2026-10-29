'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { ArrowLeft, UserPlus, FileText } from 'lucide-react';

export default function SelectionPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6">
      <div className="relative w-full max-w-xl bg-white p-8 rounded-2xl shadow-xl border border-gray-100 space-y-8 text-center animate-in fade-in duration-300">
        
        {/* Top Left Red Back Button */}
        <div className="absolute top-6 left-6">
          <Button
            variant="back"
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs shadow-md"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back</span>
          </Button>
        </div>

        <PageHeader title="Add Student Options" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
          <Button
            variant="dashboard"
            onClick={() => router.push('/students/add/collect-info')}
            className="flex flex-col items-center justify-center gap-4 py-8 rounded-2xl shadow-lg text-lg select-none"
          >
            <FileText className="h-10 w-10 text-white animate-pulse" />
            <span>Collect Information</span>
          </Button>

          <Button
            variant="dashboard"
            onClick={() => router.push('/students/add/register')}
            className="flex flex-col items-center justify-center gap-4 py-8 rounded-2xl shadow-lg text-lg select-none"
          >
            <UserPlus className="h-10 w-10 text-white animate-pulse" />
            <span>Registration</span>
          </Button>
        </div>

      </div>
    </div>
  );
}
