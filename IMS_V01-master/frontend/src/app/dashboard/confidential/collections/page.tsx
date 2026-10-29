'use client';

import React, { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '@/lib/api';
import { PageShell, inputClass } from '@/components/PageShell';

interface Row {
  employee_id: number | null;
  employee_name: string;
  invoice_count: number;
  total_collected_bdt: number;
}

const bdt = (n: number) => `BDT ${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

export default function CollectionsPage() {
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7));
  const [allTime, setAllTime] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api
      .get('/invoices/collections', { params: { month: allTime ? 'all' : month } })
      .then((res) => setRows(res.data))
      .catch((err) => setError(apiErrorMessage(err, 'Failed to load collections.')))
      .finally(() => setLoading(false));
  }, [month, allTime]);

  const total = rows.reduce((s, r) => s + r.total_collected_bdt, 0);
  const count = rows.reduce((s, r) => s + r.invoice_count, 0);

  return (
    <PageShell title="Collections by Employee" backTo="/dashboard/confidential" maxWidth="max-w-4xl">
      <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 space-y-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">Month</label>
            <input type="month" className={inputClass} value={month} disabled={allTime} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 pb-2 cursor-pointer">
            <input type="checkbox" checked={allTime} onChange={(e) => setAllTime(e.target.checked)} />
            All time
          </label>
          <div className="ml-auto text-right">
            <div className="text-xs font-bold uppercase text-gray-400">Total collected</div>
            <div className="text-2xl font-extrabold text-green-600">{bdt(total)}</div>
            <div className="text-xs font-semibold text-gray-500">{count} payment(s)</div>
          </div>
        </div>

        <p className="text-xs font-semibold text-gray-500">
          Student payments only (internal costs and fee disbursements are excluded). Invoices made before the
          “Collected by” field existed show as <em>Not recorded</em>.
        </p>

        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm font-bold text-red-600">{error}</div>}

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="text-left px-5 py-3 font-bold text-xs uppercase tracking-wider">Employee</th>
                <th className="text-center px-5 py-3 font-bold text-xs uppercase tracking-wider">Payments</th>
                <th className="text-right px-5 py-3 font-bold text-xs uppercase tracking-wider">Collected</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="px-5 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={3} className="px-5 py-8 text-center text-gray-400">No payments in this period.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={`${r.employee_id ?? 'none'}`} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className={`px-5 py-3 font-semibold ${r.employee_id ? 'text-gray-900' : 'text-gray-400 italic'}`}>{r.employee_name}</td>
                    <td className="px-5 py-3 text-center text-gray-700">{r.invoice_count}</td>
                    <td className="px-5 py-3 text-right font-bold text-gray-900">{bdt(r.total_collected_bdt)}</td>
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
