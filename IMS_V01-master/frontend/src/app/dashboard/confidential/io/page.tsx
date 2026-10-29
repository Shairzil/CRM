'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Layers } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { InputField } from '@/components/InputField';
import { Button } from '@/components/Button';
import api from '@/lib/api';

const EMPLOYEES = ['Rasmul', 'Nawroj', 'Mustafiz', 'Katherin', 'Nipa', 'Samia', 'Nadia', 'Dip', 'Sharjil'];

interface IORow {
  id: number;
  employeeName: string;
  month: string;
  amount: number;
}

function formatMonth(month: string): string {
  const [year, mon] = month.split('-');
  const date = new Date(Number(year), Number(mon) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function IOPage() {
  const router = useRouter();

  // Form state
  const [employee, setEmployee] = useState(EMPLOYEES[0]);
  const [month, setMonth] = useState(currentYearMonth());
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Table state
  const [rows, setRows] = useState<IORow[]>([]);
  const [filterMonth, setFilterMonth] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchIO = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterMonth) params.month = filterMonth;
      const res = await api.get('/io', { params });
      setRows(res.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [filterMonth]);

  useEffect(() => {
    fetchIO();
  }, [fetchIO]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!employee || !month || !amount) {
      setFormError('All fields are required.');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Amount must be a positive number.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/io', { employeeName: employee, month, amount: numAmount });
      setFormSuccess('IO entry saved successfully!');
      setAmount('');
      fetchIO();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Failed to save IO entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = () => {
    setEmployee(EMPLOYEES[0]);
    setMonth(currentYearMonth());
    setAmount('');
    setFormError('');
    setFormSuccess('');
  };

  // Compute per-month summary for the table footer
  const monthlyTotals = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.month] = (acc[row.month] || 0) + Number(row.amount);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header */}
        <div className="relative flex items-center justify-center">
          <Button
            variant="back"
            onClick={() => router.push('/dashboard/confidential')}
            className="absolute left-0 flex items-center gap-2 px-4 py-2 text-sm shadow-md"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          <div className="flex items-center gap-3">
            <Layers className="h-7 w-7 text-blue-600" />
            <PageHeader title="IO Management" />
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 text-sm text-blue-700 font-medium">
          💡 IO entries recorded in a given month will be deducted from that employee's salary in the <strong>following month</strong>.
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-6 duration-300">
          <h2 className="text-lg font-bold text-gray-800 mb-5">Record IO Entry</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <InputField
                label="Employee"
                isSelect
                options={EMPLOYEES.map((e) => ({ value: e, label: e }))}
                value={employee}
                onChange={(e) => setEmployee((e.target as HTMLSelectElement).value)}
              />
              <div className="flex flex-col gap-1 w-full">
                <label className="text-sm font-semibold text-gray-700">Month Taken</label>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white shadow-sm outline-none transition-all duration-150 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <InputField
                label="Amount"
                type="number"
                placeholder="e.g. 5000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                <span className="text-xs font-bold text-red-600">{formError}</span>
              </div>
            )}
            {formSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                <span className="text-xs font-bold text-green-600">{formSuccess}</span>
              </div>
            )}

            <div className="flex gap-4 justify-center pt-1">
              <Button
                type="button"
                variant="action"
                onClick={handleClear}
                className="px-8 py-2.5 text-sm tracking-wider"
                disabled={submitting}
              >
                Clear
              </Button>
              <Button
                type="submit"
                variant="action"
                className="px-8 py-2.5 text-sm tracking-wider"
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-5">
            <h2 className="text-lg font-bold text-gray-800 flex-1">IO Records</h2>
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700">Filter by Month</label>
                <input
                  type="month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg bg-white shadow-sm outline-none transition-all duration-150 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm"
                />
              </div>
              {filterMonth && (
                <button
                  type="button"
                  onClick={() => setFilterMonth('')}
                  className="mt-5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-base">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="px-4 py-3 text-left font-semibold rounded-tl-xl">#</th>
                  <th className="px-4 py-3 text-left font-semibold">Employee</th>
                  <th className="px-4 py-3 text-left font-semibold">Month Taken</th>
                  <th className="px-4 py-3 text-right font-semibold rounded-tr-xl">Amount</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-400 text-sm">
                      Loading...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-400 text-sm">
                      No IO records found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={`border-t border-gray-100 transition-colors duration-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        } hover:bg-blue-50`}
                    >
                      <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{row.employeeName}</td>
                      <td className="px-4 py-3 text-gray-600">{formatMonth(row.month)}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-orange-600">
                        {formatCurrency(Number(row.amount))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  {Object.entries(monthlyTotals).map(([m, total]) => (
                    <tr key={m} className="bg-orange-50 border-t-2 border-orange-200">
                      <td colSpan={3} className="px-4 py-2 text-sm font-bold text-orange-700">
                        Total IO — {formatMonth(m)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono font-bold text-orange-700">
                        {formatCurrency(total)}
                      </td>
                    </tr>
                  ))}
                </tfoot>
              )}
            </table>
          </div>
          {rows.length > 0 && (
            <p className="text-xs text-gray-400 mt-3">
              Showing {rows.length} entr{rows.length !== 1 ? 'ies' : 'y'}.
              {filterMonth && ` Filtered to ${formatMonth(filterMonth)}.`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
