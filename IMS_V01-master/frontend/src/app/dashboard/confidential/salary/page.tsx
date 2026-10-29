'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Banknote } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { InputField } from '@/components/InputField';
import { Button } from '@/components/Button';
import api from '@/lib/api';

const EMPLOYEES = ['Rasmul', 'Nawroj', 'Mustafiz', 'Katherin', 'Nipa', 'Samia', 'Nadia', 'Dip', 'Sharjil'];

interface SalaryRow {
  id: number;
  employeeName: string;
  month: string;
  baseSalary: number;
  ioDeduction: number;
  netSalary: number;
  paid: boolean;
}

function formatMonth(month: string): string {
  // 'YYYY-MM' => 'Jan 2026'
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

// Get current YYYY-MM for default
function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function SalaryPage() {
  const router = useRouter();

  // Form state
  const [employee, setEmployee] = useState(EMPLOYEES[0]);
  const [month, setMonth] = useState(currentYearMonth());
  const [baseSalary, setBaseSalary] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Table state
  const [rows, setRows] = useState<SalaryRow[]>([]);
  const [filterMonth, setFilterMonth] = useState('');
  const [loading, setLoading] = useState(false);

  // Dialog state
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    type: 'confirm' | 'alert';
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
  });

  const handlePayCheckboxClick = (row: SalaryRow) => {
    if (row.paid) return;

    if (row.netSalary === 0) {
      setDialog({
        isOpen: true,
        type: 'alert',
        title: 'Payment Status',
        message: 'Nothing to Pay',
      });
    } else if (row.netSalary < 0) {
      setDialog({
        isOpen: true,
        type: 'alert',
        title: 'Payment Restricted',
        message: 'Employee has to clear IO first',
      });
    } else {
      setDialog({
        isOpen: true,
        type: 'confirm',
        title: 'Confirm Payment',
        message: 'Do you confirm?',
        onConfirm: async () => {
          try {
            await api.post(`/salary/${row.id}/pay`);
            setFormSuccess(`Successfully processed payment for ${row.employeeName}!`);
            fetchSalaries();
          } catch (err: any) {
            setFormError(err?.response?.data?.message || 'Failed to process payment.');
          }
        },
      });
    }
  };

  const fetchSalaries = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterMonth) params.month = filterMonth;
      const res = await api.get('/salary', { params });
      setRows(res.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [filterMonth]);

  useEffect(() => {
    fetchSalaries();
  }, [fetchSalaries]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!employee || !month || !baseSalary) {
      setFormError('All fields are required.');
      return;
    }
    const numSalary = parseFloat(baseSalary);
    if (isNaN(numSalary)) {
      setFormError('Base salary must be a valid number.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/salary', { employeeName: employee, month, baseSalary: numSalary });
      setFormSuccess('Salary entry saved successfully!');
      setBaseSalary('');
      fetchSalaries();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Failed to save salary.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = () => {
    setEmployee(EMPLOYEES[0]);
    setMonth(currentYearMonth());
    setBaseSalary('');
    setFormError('');
    setFormSuccess('');
  };

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
            <Banknote className="h-7 w-7 text-blue-600" />
            <PageHeader title="Salary Management" />
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-6 duration-300">
          <h2 className="text-lg font-bold text-gray-800 mb-5">Add Salary Entry</h2>
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
                <label className="text-sm font-semibold text-gray-700">Month</label>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white shadow-sm outline-none transition-all duration-150 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <InputField
                label="Base Salary"
                type="number"
                placeholder="e.g. 25000"
                value={baseSalary}
                onChange={(e) => setBaseSalary(e.target.value)}
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
            <h2 className="text-lg font-bold text-gray-800 flex-1">Salary Records</h2>
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
                  <th className="px-4 py-3 text-left font-semibold rounded-tl-xl">Employee</th>
                  <th className="px-4 py-3 text-left font-semibold">Month</th>
                  <th className="px-4 py-3 text-right font-semibold">Base Salary</th>
                  <th className="px-4 py-3 text-right font-semibold">IO Deduction</th>
                  <th className="px-4 py-3 text-right font-semibold">Net Salary</th>
                  <th className="px-4 py-3 text-center font-semibold rounded-tr-xl">Pay</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400 text-sm">
                      Loading...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400 text-sm">
                      No salary records found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={`border-t border-gray-100 transition-colors duration-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        } hover:bg-blue-50`}
                    >
                      <td className="px-4 py-3 font-medium text-gray-800">{row.employeeName}</td>
                      <td className="px-4 py-3 text-gray-600">{formatMonth(row.month)}</td>
                      <td className="px-4 py-3 text-right text-gray-800 font-mono">
                        {formatCurrency(row.baseSalary)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        <span className={row.ioDeduction > 0 ? 'text-red-600 font-semibold' : 'text-gray-400'}>
                          {formatCurrency(row.ioDeduction)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold">
                        <span className={row.netSalary < 0 ? 'text-red-700' : 'text-green-700'}>
                          {formatCurrency(row.netSalary)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={row.paid}
                          disabled={row.paid}
                          onChange={() => handlePayCheckboxClick(row)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {rows.length > 0 && (
            <p className="text-xs text-gray-400 mt-3">
              Showing {rows.length} record{rows.length !== 1 ? 's' : ''}.
              {filterMonth && ` Filtered to ${formatMonth(filterMonth)}.`}
            </p>
          )}
        </div>
      </div>

      {/* Dialog Modal */}
      {dialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-6 flex flex-col gap-4 border border-gray-150 transform transition-all duration-200 scale-100 animate-in zoom-in-95 duration-150">
            <h3 className="text-lg font-black text-gray-800 border-b border-gray-100 pb-3">{dialog.title}</h3>
            <p className="text-sm font-semibold text-gray-600 leading-relaxed">{dialog.message}</p>
            <div className="flex justify-end gap-3 mt-2">
              {dialog.type === 'confirm' ? (
                <>
                  <button
                    onClick={() => setDialog({ isOpen: false, type: 'alert', title: '', message: '' })}
                    className="px-5 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-150 cursor-pointer"
                  >
                    No
                  </button>
                  <button
                    onClick={() => {
                      setDialog({ isOpen: false, type: 'alert', title: '', message: '' });
                      if (dialog.onConfirm) dialog.onConfirm();
                    }}
                    className="px-5 py-2 text-sm font-bold text-white bg-green-500 hover:bg-green-600 rounded-lg shadow-md transition-colors duration-150 cursor-pointer"
                  >
                    Yes
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setDialog({ isOpen: false, type: 'alert', title: '', message: '' })}
                  className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition-colors duration-150 cursor-pointer"
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
