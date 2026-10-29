'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api, { apiErrorMessage } from '@/lib/api';
import { RoleGuard } from '@/components/RoleGuard';
import { PageShell, formatDateTime } from '@/components/PageShell';
import { StatusBadge, statusLabel } from '@/components/StatusBadge';

interface DocRow {
  id: number;
  student_id: number;
  student_name: string;
  student_code: string;
  document_type: string;
  title: string | null;
  status: string;
  file_name: string | null;
  uploaded_by: string | null;
  uploaded_at: string | null;
  due_date: string | null;
  created_at: string;
}

const TABS = [
  { value: 'uploaded', label: 'Waiting for review' },
  { value: 'requested', label: 'Requested (not uploaded)' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'approved', label: 'Approved' },
];

export default function DocumentsPage() {
  return (
    <RoleGuard roles={['admin', 'accounts', 'counselor']}>
      <DocumentsQueue />
    </RoleGuard>
  );
}

function DocumentsQueue() {
  const router = useRouter();
  const [tab, setTab] = useState('uploaded');
  const [rows, setRows] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/documents', { params: { status: tab } });
      setRows(res.data);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to load documents.'));
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <PageShell title="Documents Review">
      <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 space-y-4">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={`rounded-lg px-4 py-2 text-sm font-bold cursor-pointer ${tab === t.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm font-bold text-red-600">{error}</div>}

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider">Student</th>
                <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider">Document</th>
                <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider">Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="px-5 py-10 text-center text-gray-400">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-10 text-center text-gray-400">Nothing here.</td></tr>
              ) : (
                rows.map((d) => (
                  <tr key={d.id} className="border-t border-gray-100 hover:bg-blue-50/40 cursor-pointer" onClick={() => router.push(`/students/${d.student_id}/crm?tab=documents`)}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{d.student_name}</div>
                      <div className="font-mono text-xs text-blue-700">{d.student_code}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{d.title || statusLabel(d.document_type)}</div>
                      {d.file_name && <div className="text-xs text-gray-500">{d.file_name}</div>}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {d.uploaded_at ? `${formatDateTime(d.uploaded_at)}${d.uploaded_by ? ` · ${d.uploaded_by}` : ''}` : '—'}
                    </td>
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
