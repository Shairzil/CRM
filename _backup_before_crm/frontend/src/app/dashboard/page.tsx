'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { UserPlus, ClipboardList, FileText, LogOut, BarChart3, DollarSign, Lock } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [welcomeMessage, setWelcomeMessage] = useState('');

  useEffect(() => {
    const token = sessionStorage.getItem('nexted_token');
    if (!token) return;
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window.atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonPayload);
      const username = payload?.username || '';

      const welcomeMessages: Record<string, string> = {
        nawrose: "Welcome Nawrose",
        mostafiz: "Welcome Mostafiz",
        ryu: "Welcome Rasmul Asif Safat",
        shairzil: "Welcome Shairzil",
        fahim: "Welcome ASM Fahim Hasnayene",
        nadia: "Welcome Nadia",
        fahad: "Welcome ASM Fahad Hasnayene",
        cathrin: "Welcome Cathrin",
        ishfatjahin: "Welcome Arna",
        nipa: "Welcome Nipa",
        samia: "Welcome Samia",
        dip: "Welcome Dip",
      };

      const matchedMessage = welcomeMessages[username.toLowerCase()];
      if (matchedMessage) {
        setWelcomeMessage(matchedMessage);
      } else {
        setWelcomeMessage(`Welcome ${username}`);
      }
    } catch (err) {
      console.error('Failed to decode token for welcome message:', err);
    }
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('nexted_token');
    sessionStorage.removeItem('confidential_logged_in');
    router.push('/');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6">
      <div className="relative w-full max-w-2xl bg-white p-8 rounded-2xl shadow-xl border border-gray-100 space-y-8 text-center animate-in fade-in slide-in-from-bottom-8 duration-300">
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Log out"
          title="Log out"
          className="absolute right-5 top-5 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-red-600 text-white shadow-lg shadow-red-500/30 transition-all duration-200 hover:-translate-y-0.5 hover:scale-110 hover:bg-red-700 hover:shadow-xl hover:shadow-red-500/50 focus:outline-none focus:ring-2 focus:ring-red-500/35"
        >
          <LogOut className="h-5 w-5" />
        </button>

        <div>
          <PageHeader title="Management Panel" />
          {welcomeMessage && (
            <div className="text-xl font-bold text-gray-700 -mt-6 mb-4 select-none animate-in fade-in duration-500">
              {welcomeMessage}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
          <Button
            variant="dashboard"
            onClick={() => router.push('/students/add')}
            className="flex flex-col items-center justify-center gap-4 py-8 rounded-2xl shadow-lg text-lg select-none"
          >
            <UserPlus className="h-10 w-10 text-white" />
            <span>Add Student</span>
          </Button>

          <Button
            variant="dashboard"
            onClick={() => router.push('/students')}
            className="flex flex-col items-center justify-center gap-4 py-8 rounded-2xl shadow-lg text-lg select-none"
          >
            <ClipboardList className="h-10 w-10 text-white" />
            <span>Students Information</span>
          </Button>

          <Button
            variant="dashboard"
            onClick={() => router.push('/dashboard/performance')}
            className="flex flex-col items-center justify-center gap-4 py-8 rounded-2xl shadow-lg text-lg select-none"
          >
            <BarChart3 className="h-10 w-10 text-white" />
            <span>Employee Performance</span>
          </Button>

          <Button
            variant="dashboard"
            onClick={() => router.push('/invoices/internal')}
            className="flex flex-col items-center justify-center gap-4 py-8 rounded-2xl shadow-lg text-lg select-none"
          >
            <DollarSign className="h-10 w-10 text-white" />
            <span>Internal Cost</span>
          </Button>

          <Button
            variant="dashboard"
            onClick={() => router.push('/dashboard/confidential')}
            className="flex flex-col items-center justify-center gap-4 py-8 rounded-2xl shadow-lg text-lg select-none"
          >
            <Lock className="h-10 w-10 text-white" />
            <span>Confidential</span>
          </Button>

          <Button
            variant="dashboard"
            onClick={() => router.push('/invoices')}
            className="flex flex-col items-center justify-center gap-4 py-8 rounded-2xl shadow-lg text-lg select-none"
          >
            <FileText className="h-10 w-10 text-white" />
            <span>Invoice History</span>
          </Button>

        </div>
      </div>
    </div>
  );
}
