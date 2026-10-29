'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Scale, Search, ArrowDownLeft, ArrowUpRight, Coins, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import api from '@/lib/api';

interface StudentBalanceRow {
  id: number;
  studentId: string;
  name: string;
  fileOpeningFeeReceived: number;
  fileOpeningFeeDue: number;
  applicationFeeReceived: number;
  applicationFeeDue: number;
  otherFeeReceived: number;
  otherFeeDue: number;
  applicationDisbursement: number;
  otherDisbursement: number;
  totalDue: number;
}

interface BalanceSummary {
  totalFileOpeningFeeReceived: number;
  totalApplicationFeeReceived: number;
  totalOtherFeeReceived: number;
  totalFeeReceived: number;
  totalApplicationDisbursement: number;
  totalOtherDisbursement: number;
  totalInternalCost: number;
  totalSalaryOutflow: number;
  totalEmployeeDue: number;
  totalFileOpeningFeeDue: number;
  totalApplicationFeeDue: number;
  totalOtherFeeDue: number;
  totalDue: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function BalancePage() {
  const router = useRouter();

  const [summary, setSummary] = useState<BalanceSummary | null>(null);
  const [details, setDetails] = useState<StudentBalanceRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchBalanceSheet = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/invoices/balance');
      setSummary(res.data.summary);
      setDetails(res.data.details || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch balance sheet data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalanceSheet();
  }, [fetchBalanceSheet]);

  const filteredDetails = details.filter((row) => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;
    return (
      (row.name && row.name.toLowerCase().includes(term)) ||
      (row.studentId && row.studentId.toLowerCase().includes(term))
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="back"
              onClick={() => router.push('/dashboard/confidential')}
              className="flex items-center gap-2 px-4 py-2 text-sm shadow-md"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <div className="flex items-center gap-3">
              <Scale className="h-7 w-7 text-blue-600 animate-pulse" />
              <PageHeader title="Balance Sheet" />
            </div>
          </div>

          <Button
            variant="action"
            onClick={fetchBalanceSheet}
            className="flex items-center gap-2 px-4 py-2 text-sm shrink-0 self-start sm:self-center"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload</span>
          </Button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center max-w-lg mx-auto">
            <span className="text-sm font-bold text-red-600">{error}</span>
          </div>
        )}

        {loading && !summary ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <span className="text-sm font-semibold text-gray-500 font-mono">Loading general ledger metrics...</span>
          </div>
        ) : summary ? (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Grid of Key Categories */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Category 1: Student Fee Inflows */}
              <div className="bg-white p-6 rounded-2xl shadow-md border border-emerald-100 space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 bg-emerald-50 text-emerald-600 rounded-bl-2xl">
                  <ArrowDownLeft className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-emerald-600 uppercase tracking-wider">Total Received</h3>
                  <p className="text-2xl font-black text-gray-800 font-mono mt-1">
                    BDT {formatCurrency(summary.totalFeeReceived)}
                  </p>
                </div>
                <div className="border-t border-gray-100 pt-3 text-xs font-semibold text-gray-500">
                  Total amount received from all students
                </div>
              </div>

              {/* Category 2: Disbursements & Internal Costs */}
              <div className="bg-white p-6 rounded-2xl shadow-md border border-indigo-100 space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 bg-indigo-50 text-indigo-600 rounded-bl-2xl">
                  <ArrowUpRight className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider">Outflows & Disbursements</h3>
                  <p className="text-2xl font-black text-gray-800 font-mono mt-1">
                    BDT {formatCurrency(summary.totalApplicationDisbursement + summary.totalOtherDisbursement + summary.totalInternalCost + (summary.totalSalaryOutflow || 0))}
                  </p>
                </div>
                <div className="border-t border-gray-100 pt-3 space-y-2 text-xs font-semibold text-gray-500">
                  <div className="flex justify-between">
                    <span>App Disbursement:</span>
                    <span className="text-gray-800 font-mono">BDT {formatCurrency(summary.totalApplicationDisbursement)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Other Disbursement:</span>
                    <span className="text-gray-800 font-mono">BDT {formatCurrency(summary.totalOtherDisbursement)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Internal Operations:</span>
                    <span className="text-gray-800 font-mono">BDT {formatCurrency(summary.totalInternalCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Salary Outflow:</span>
                    <span className="text-gray-800 font-mono">BDT {formatCurrency(summary.totalSalaryOutflow || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Category 3: Total Outstandings / Receivables */}
              <div className="bg-white p-6 rounded-2xl shadow-md border border-amber-100 space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 bg-amber-50 text-amber-600 rounded-bl-2xl">
                  <Coins className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-amber-600 uppercase tracking-wider">Total Due</h3>
                  <p className="text-2xl font-black text-red-600 font-mono mt-1">
                    BDT {formatCurrency(summary.totalDue)}
                  </p>
                </div>
                <div className="border-t border-gray-100 pt-3 text-xs font-semibold text-gray-500">
                  Total outstanding dues from all students and employee IO
                </div>
              </div>

            </div>

            {/* General Balance Sheet Summary Table */}
            <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-150 space-y-4">
              <h2 className="text-base font-extrabold text-gray-800 uppercase tracking-wider">Balance Sheet Summary Table</h2>
              <div className="overflow-x-auto rounded-xl border border-gray-150">
                <table className="w-full text-base">
                  <thead>
                    <tr className="bg-blue-600 text-white font-semibold">
                      <th className="px-5 py-3 text-left">Financial Metric</th>
                      <th className="px-5 py-3 text-right">Amount (BDT)</th>
                      <th className="px-5 py-3 text-left">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    <tr className="bg-emerald-50/50">
                      <td className="px-5 py-3 font-black text-gray-900">Total Amount Received</td>
                      <td className="px-5 py-3 text-right font-mono text-emerald-700 font-black">
                        {formatCurrency(summary.totalFeeReceived)}
                      </td>
                      <td className="px-5 py-3 text-xs text-emerald-800 font-semibold">Sum of all student cash inflows.</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-semibold text-gray-800">Application Disbursement Outflow</td>
                      <td className="px-5 py-3 text-right font-mono text-rose-600 font-bold">
                        {formatCurrency(summary.totalApplicationDisbursement)}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">Application fees paid by the company to universities.</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-semibold text-gray-800">Other Disbursement Outflow</td>
                      <td className="px-5 py-3 text-right font-mono text-rose-600 font-bold">
                        {formatCurrency(summary.totalOtherDisbursement)}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">Other student-related fees paid out by the company.</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-semibold text-gray-800">Total Internal Operation Costs</td>
                      <td className="px-5 py-3 text-right font-mono text-rose-600 font-bold">
                        {formatCurrency(summary.totalInternalCost)}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">Global internal agency expenses and operation costs.</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-semibold text-gray-800">Salary Outflow</td>
                      <td className="px-5 py-3 text-right font-mono text-rose-600 font-bold">
                        {formatCurrency(summary.totalSalaryOutflow || 0)}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">Paid net salaries of employees.</td>
                    </tr>
                    <tr className="bg-amber-50/50">
                      <td className="px-5 py-3 font-black text-gray-900">Total Due</td>
                      <td className="px-5 py-3 text-right font-mono text-red-600 font-black">
                        {formatCurrency(summary.totalDue)}
                      </td>
                      <td className="px-5 py-3 text-xs text-amber-800 font-semibold">Total remaining amount expected from students and employee IO.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detailed Ledger Section */}
            <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-150 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-extrabold text-gray-800 uppercase tracking-wider">Detailed Student Ledger</h2>
                  <p className="text-xs text-gray-400 font-semibold mt-0.5">Individual fee breakdowns per registered student profile</p>
                </div>

                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by ID or student name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-150">
                <table className="w-full text-base text-left">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
                      <th className="px-4 py-3">Student Name / ID</th>
                      <th className="px-4 py-3 text-right">Total Received</th>
                      <th className="px-4 py-3 text-right">Application Spend</th>
                      <th className="px-4 py-3 text-right">Other Spend</th>
                      <th className="px-4 py-3 text-right">Total Spend</th>
                      <th className="px-4 py-3 text-right font-black">Total Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {filteredDetails.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-400 text-sm font-semibold">
                          No student records matched your query.
                        </td>
                      </tr>
                    ) : (
                      filteredDetails.map((row) => {
                        const totalRec = (Number(row.fileOpeningFeeReceived) || 0) +
                                         (Number(row.applicationFeeReceived) || 0) +
                                         (Number(row.otherFeeReceived) || 0);
                        const totalSpend = (Number(row.applicationDisbursement) || 0) +
                                           (Number(row.otherDisbursement) || 0);
                        return (
                          <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <p className="font-semibold text-gray-800">{row.name}</p>
                              <p className="font-mono text-[10px] text-blue-700 font-bold mt-0.5">{row.studentId}</p>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-emerald-600 font-bold">
                              {totalRec > 0 ? formatCurrency(totalRec) : '—'}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-rose-600 font-semibold">
                              {row.applicationDisbursement > 0 ? formatCurrency(row.applicationDisbursement) : '—'}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-rose-600 font-semibold">
                              {row.otherDisbursement > 0 ? formatCurrency(row.otherDisbursement) : '—'}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-rose-700 font-bold">
                              {totalSpend > 0 ? formatCurrency(totalSpend) : '—'}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-black whitespace-nowrap">
                              <span className={row.totalDue > 0 ? 'text-red-600' : 'text-gray-400'}>
                                {row.totalDue > 0 ? `BDT ${formatCurrency(row.totalDue)}` : 'Fully Paid'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {filteredDetails.length > 0 && (
                <p className="text-[10px] text-gray-400 font-bold">
                  Showing {filteredDetails.length} of {details.length} student ledger profiles.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
