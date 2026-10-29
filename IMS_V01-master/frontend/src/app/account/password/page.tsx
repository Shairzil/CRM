'use client';

import React, { useState } from 'react';
import api, { apiErrorMessage } from '@/lib/api';
import { getStoredUser, storeSession } from '@/lib/auth';
import { Button } from '@/components/Button';
import { PageShell, inputClass, labelClass } from '@/components/PageShell';

export default function ChangePasswordPage() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (next.length < 8) return setError('New password must be at least 8 characters.');
    if (next !== confirm) return setError('The two new passwords do not match.');
    setSaving(true);
    try {
      const res = await api.post('/auth/change-password', { current_password: current, new_password: next });
      // The old token is now invalid; keep the user logged in with the new one.
      storeSession(res.data.access_token, getStoredUser());
      setDone(true);
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not change the password.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell title="Change Password" maxWidth="max-w-md">
      <form onSubmit={submit} className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 space-y-4">
        {done && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm font-bold text-green-700">Password changed. Other devices have been logged out.</div>}
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm font-bold text-red-600">{error}</div>}
        <div className="flex flex-col gap-1">
          <label className={labelClass}>Current password</label>
          <input className={inputClass} type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass}>New password</label>
          <input className={inputClass} type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass}>Repeat new password</label>
          <input className={inputClass} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        <Button type="submit" variant="action" disabled={saving} className="w-full py-3">{saving ? 'Saving...' : 'Change password'}</Button>
      </form>
    </PageShell>
  );
}
