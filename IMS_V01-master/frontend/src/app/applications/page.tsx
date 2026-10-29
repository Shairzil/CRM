'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import api, { apiErrorMessage } from '@/lib/api';
import { Button } from '@/components/Button';
import { RoleGuard } from '@/components/RoleGuard';
import { PageShell, formatDate, inputClass } from '@/components/PageShell';
import { StatusBadge, statusLabel } from '@/components/StatusBadge';

interface AppRow {
  id: number;
  student_id: number;
  student_name: string | null;
  student_code: string | null;
  university_name: string;
  course_name: string;
  course_level: string | null;
  intake: string | null;
  country_name: string | null;
  status: string;
  assigned_to_name: string | null;
  updated_at: string;
}

export default function ApplicationsPage() {
  return (
    <RoleGuard roles={['admin', 'accounts', 'counselor']}>
      <ApplicationsList />
    </RoleGuard>
  );
}

function ApplicationsList() {
  const router = useRouter();
  const [rows, setRows] = useState<AppRow[]>([]);
  const [summary, setSummary] = useState<{ counts: Record<string, number>; total: number } | null>(null);
  const [status, setStatus] = useState('');
  const [mine, setMine] = useState(false);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [list, sum] = await Promise.all([
        api.get('/applications', { params: { status: status || undefined, assigned: mine ? 'me' : undefined, search: search || undefined } }),
        api.get('/applications/summary'),
      ]);
      setRows(list.data);
      setSummary(sum.data);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to load applications.'));
    } finally {
      setLoading(false);
    }
  }, [status, mine, search]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <PageShell title="Applications">
      {summary && (
        <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-100">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStatus('')}
              className={`rounded-full px-3 py-1 text-xs font-bold cursor-pointer ${status === '' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              All ({summary.total})
            </button>
            {Object.entries(summary.counts).map(([s, n]) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`rounded-full px-3 py-1 text-xs font-bold cursor-pointer ${status === s ? 'bg-blue-600 text-white' : n > 0 ? 'bg-gray-100 text-gray-800 hover:bg-gray-200' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
              >
                {statusLabel(s)} ({n})
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <form className="flex gap-2 flex-1 min-w-[260px]" onSubmit={(e) => { e.preventDefault(); setSearch(searchInput.trim()); }}>
            <input className={inputClass} placeholder="Search student, university, course" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
            <Button type="submit" variant="action" className="px-3 py-2"><Search className="h-4 w-4" /></Button>
          </form>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer">
            <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> Only mine
          </label>
        </div>

        <p className="text-xs font-semibold text-gray-500">
          To add an application, open a student → <em>Applications &amp; Documents</em>.
        </p>

        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm font-bold text-red-600">{error}</div>}

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider">Student</th>
                <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider">University / Course</th>
                <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider">Intake</th>
                <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider">Assigned</th>
                <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider">Updated</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400">No applications.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100 hover:bg-blue-50/40 cursor-pointer" onClick={() => router.push(`/students/${r.student_id}/crm?app=${r.id}`)}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{r.student_name}</div>
                      <div className="font-mono text-xs text-blue-700">{r.student_code}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{r.university_name}</div>
                      <div className="text-xs text-gray-500">
                        {r.course_name}
                        {r.course_level ? ` · ${r.course_level}` : ''}
                        {r.country_name ? ` · ${r.country_name}` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{r.intake || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-gray-700">{r.assigned_to_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(r.updated_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
