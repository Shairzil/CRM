'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { InputField } from '@/components/InputField';
import { Banknote, Layers, ArrowLeft, Scale } from 'lucide-react';

export default function ConfidentialPage() {
  const router = useRouter();

  // Authentication state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (sessionStorage.getItem('confidential_logged_in') === 'true') {
      setIsLoggedIn(true);
    }
    setCheckingAuth(false);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (username === 'admin' && password === 'Admin@123') {
      sessionStorage.setItem('confidential_logged_in', 'true');
      setIsLoggedIn(true);
    } else {
      setError('Invalid username or password.');
    }
  };

  const handleClear = () => {
    setUsername('');
    setPassword('');
    setError('');
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  // Login view if not authenticated
  if (!isLoggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-gray-100 animate-in fade-in slide-in-from-bottom-6 duration-300 relative">
          {/* Back button to dashboard */}
          <div className="absolute top-8 left-8">
            <Button
              variant="back"
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 px-4 py-2 text-sm shadow-md"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
          </div>

          <div className="pt-8">
            <PageHeader title="Internal Management Console" />
          </div>
          
          <form onSubmit={handleLogin} className="mt-8 space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                <span className="text-xs font-bold text-red-600">{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <InputField
                label="Username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <InputField
                label="Password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="flex gap-4 items-center justify-center pt-2">
              <Button
                type="button"
                variant="action"
                onClick={handleClear}
                className="flex-1 py-3 text-sm tracking-wider"
              >
                Clear
              </Button>
              <Button
                type="submit"
                variant="action"
                className="flex-1 py-3 text-sm tracking-wider"
              >
                Login
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Confidential main view with Salary & IO buttons
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6">
      <div className="relative w-full max-w-2xl bg-white p-8 rounded-2xl shadow-xl border border-gray-100 space-y-8 text-center animate-in fade-in slide-in-from-bottom-8 duration-300">
        {/* Back button */}
        <div className="absolute top-8 left-8">
          <Button
            variant="back"
            onClick={() => {
              sessionStorage.removeItem('confidential_logged_in');
              router.push('/dashboard');
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm shadow-md"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
        </div>

        <div className="pt-8">
          <PageHeader title="Confidential" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
          <Button
            variant="dashboard"
            onClick={() => router.push('/dashboard/confidential/salary')}
            className="flex flex-col items-center justify-center gap-4 py-8 rounded-2xl shadow-lg text-lg select-none"
          >
            <Banknote className="h-10 w-10 text-white" />
            <span>Salary</span>
          </Button>

          <Button
            variant="dashboard"
            onClick={() => router.push('/dashboard/confidential/io')}
            className="flex flex-col items-center justify-center gap-4 py-8 rounded-2xl shadow-lg text-lg select-none"
          >
            <Layers className="h-10 w-10 text-white" />
            <span>IO</span>
          </Button>

          <Button
            variant="dashboard"
            onClick={() => router.push('/dashboard/confidential/balance')}
            className="flex flex-col items-center justify-center gap-4 py-8 rounded-2xl shadow-lg text-lg select-none"
          >
            <Scale className="h-10 w-10 text-white" />
            <span>Balance</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
