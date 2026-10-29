'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { InputField } from '@/components/InputField';
import { Button } from '@/components/Button';
import api from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login', { username, password });
      sessionStorage.setItem('nexted_token', res.data.access_token);
      router.push('/dashboard');
    } catch (err: any) {
      setError('Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setUsername('');
    setPassword('');
    setError('');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-gray-100 animate-in fade-in slide-in-from-bottom-6 duration-300">
        <PageHeader title="Internal Management Console" />
        
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
              disabled={loading}
            >
              Clear
            </Button>
            <Button
              type="submit"
              variant="action"
              className="flex-1 py-3 text-sm tracking-wider"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
