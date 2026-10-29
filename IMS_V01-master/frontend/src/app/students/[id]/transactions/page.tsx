'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { ArrowLeft, Loader2, FileText, ArrowUpRight, ArrowDownLeft, DollarSign, Wallet, CreditCard } from 'lucide-react';
import api from '@/lib/api';

interface InvoiceRow {
  id: number;
  invoice_id: string;
  payer_name: string;
  payer_phone_country_code: string;
  payer_phone_number: string;
  payment_method: string;
  payment_detail: string;
  bank_name?: string;
  application_fee_bdt: number;
  other_fee_bdt: number;
  total_amount_bdt: number;
  paid_amount_bdt: number;
  due_amount_bdt: number;
  comment: string;
  created_at: string;
}

interface StudentDetail {
  id: number;
  student_id: string;
  name: string;
  phone_country_code: string;
  phone_number: string;
  email: string;
  counselor_name: string;
  file_opening_fee_bdt: number;
  invoices: InvoiceRow[];
}

export default function StudentTransactionsPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params.id as string;

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pdfError, setPdfError] = useState<Record<number, string>>({});

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const res = await api.get(`/students/${studentId}`);
        setStudent(res.data);
      } catch (err) {
        setError('Failed to load transaction details.');
      } finally {
        setLoading(false);
      }
    };
    fetchStudentData();
  }, [studentId]);

  const handleOpenPdf = async (invoiceId: number) => {
    setPdfError((prev) => ({ ...prev, [invoiceId]: '' }));
    try {
      const res = await api.get(`/invoices/${invoiceId}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const pdfUrl = window.URL.createObjectURL(blob);
      window.open(pdfUrl, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(pdfUrl), 1000);
    } catch (err) {
      setPdfError((prev) => ({ ...prev, [invoiceId]: 'Failed to open PDF.' }));
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <span className="text-sm font-semibold text-gray-500 font-mono">Loading financial statements...</span>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 bg-gray-50">
        <div className="max-w-sm w-full p-6 bg-red-50 border border-red-200 rounded-xl text-center">
          <p className="text-sm font-bold text-red-600 mb-4">{error || 'Student records not found.'}</p>
          <Button variant="action" onClick={() => router.push('/students?tab=transactions')}>
            ← Back to Students
          </Button>
        </div>
      </div>
    );
  }

  const invoices = student.invoices || [];

  // Calculate Application Fee metrics
  // Total Received: latest invoice's cumulative application_fee_bdt (or 0)
  const latestInvoice = invoices[0];
  const appFeeReceived = latestInvoice ? Number(latestInvoice.application_fee_bdt) || 0 : 0;
  // Spent: sum of paid_amount_bdt for all invoices with "Application Fee Spend" comment
  const appFeeSpent = invoices
    .filter((inv) => inv.comment && inv.comment.trim().toLowerCase() === 'application fee spend')
    .reduce((sum, inv) => sum + (Number(inv.paid_amount_bdt) || 0), 0);
  const appFeeRemaining = Math.max(0, appFeeReceived - appFeeSpent);

  // Calculate Other Fee metrics
  const otherFeeReceived = latestInvoice ? Number(latestInvoice.other_fee_bdt) || 0 : 0;
  // Spent: sum of paid_amount_bdt for all invoices with "Other Fee Spend" comment
  const otherFeeSpent = invoices
    .filter((inv) => inv.comment && inv.comment.trim().toLowerCase() === 'other fee spend')
    .reduce((sum, inv) => sum + (Number(inv.paid_amount_bdt) || 0), 0);
  const otherFeeRemaining = Math.max(0, otherFeeReceived - otherFeeSpent);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
        
        {/* Navigation & Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="back"
              onClick={() => router.push('/students?tab=transactions')}
              className="flex items-center gap-2 px-4 py-2 text-sm shadow-md"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <PageHeader title="Transaction Details" />
          </div>
          
          <div className="bg-white px-5 py-3 rounded-2xl border border-gray-150 shadow-sm flex items-center gap-4">
            <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
              <span className="font-extrabold text-blue-600 text-sm">ID</span>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Student ID</p>
              <p className="font-mono text-sm font-bold text-blue-700">{student.student_id}</p>
            </div>
          </div>
        </div>

        {/* Student Profile Info */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <span className="text-xs text-gray-400 block font-bold uppercase tracking-wider mb-1">Student Name</span>
            <span className="text-sm font-semibold text-gray-800">{student.name}</span>
          </div>
          <div>
            <span className="text-xs text-gray-400 block font-bold uppercase tracking-wider mb-1">Phone Number</span>
            <span className="text-sm font-semibold text-gray-800">{student.phone_country_code} {student.phone_number}</span>
          </div>
          <div>
            <span className="text-xs text-gray-400 block font-bold uppercase tracking-wider mb-1">Counselor</span>
            <span className="text-sm font-semibold text-gray-800">{student.counselor_name || 'N/A'}</span>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Application Fee Card Group */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl shadow-lg text-white space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 opacity-90" />
                <h4 className="text-sm font-extrabold uppercase tracking-widest opacity-90">Application Fee Funds</h4>
              </div>
              <span className="px-2.5 py-1 bg-white/25 rounded-full text-xs font-bold backdrop-blur-md">Category Summary</span>
            </div>
            
            <div className="grid grid-cols-3 gap-4 border-t border-white/20 pt-4">
              <div>
                <p className="text-[10px] text-white/70 font-semibold uppercase tracking-wider">Received</p>
                <p className="text-sm sm:text-base font-extrabold mt-1">
                  BDT {appFeeReceived.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-white/70 font-semibold uppercase tracking-wider">Spent</p>
                <p className="text-sm sm:text-base font-extrabold mt-1 text-red-200">
                  BDT {appFeeSpent.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-white/70 font-semibold uppercase tracking-wider">Remaining</p>
                <p className="text-sm sm:text-base font-extrabold mt-1 text-green-200">
                  BDT {appFeeRemaining.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </div>

          {/* Other Fee Card Group */}
          <div className="bg-gradient-to-br from-slate-700 to-slate-900 p-6 rounded-2xl shadow-lg text-white space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 opacity-90" />
                <h4 className="text-sm font-extrabold uppercase tracking-widest opacity-90">Other Fee Funds</h4>
              </div>
              <span className="px-2.5 py-1 bg-white/20 rounded-full text-xs font-bold backdrop-blur-md">Category Summary</span>
            </div>
            
            <div className="grid grid-cols-3 gap-4 border-t border-white/20 pt-4">
              <div>
                <p className="text-[10px] text-white/70 font-semibold uppercase tracking-wider">Received</p>
                <p className="text-sm sm:text-base font-extrabold mt-1">
                  BDT {otherFeeReceived.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-white/70 font-semibold uppercase tracking-wider">Spent</p>
                <p className="text-sm sm:text-base font-extrabold mt-1 text-red-300">
                  BDT {otherFeeSpent.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-white/70 font-semibold uppercase tracking-wider">Remaining</p>
                <p className="text-sm sm:text-base font-extrabold mt-1 text-emerald-300">
                  BDT {otherFeeRemaining.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Transaction History Ledger */}
        <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-gray-700 uppercase tracking-wider">Transaction Ledger</h3>
            <span className="text-xs text-gray-400 font-bold">{invoices.length} Record{invoices.length !== 1 ? 's' : ''} Found</span>
          </div>

          {invoices.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <span className="text-sm font-semibold">No financial transactions exist for this student profile yet.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-gray-100/70 border-b border-gray-250 text-gray-500 font-bold text-xs uppercase tracking-wider">
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Voucher / Inv ID</th>
                    <th className="px-6 py-3">Transaction Details</th>
                    <th className="px-6 py-3 text-center">Type</th>
                    <th className="px-6 py-3 text-right">Inflow (BDT)</th>
                    <th className="px-6 py-3 text-right">Outflow (BDT)</th>
                    <th className="px-6 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.map((inv) => {
                    const isSpend = inv.comment && inv.comment.trim().toLowerCase().includes('spend');
                    return (
                      <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-gray-500 font-mono text-xs whitespace-nowrap">
                          {new Date(inv.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs font-bold text-blue-700 whitespace-nowrap">
                          {inv.invoice_id}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-800 text-sm">
                            {isSpend ? 'Company Disbursement' : `Payment from ${inv.payer_name}`}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Method: <span className="font-bold text-gray-500 uppercase">{inv.payment_method}</span>
                            {inv.bank_name ? ` (${inv.bank_name})` : ''}
                            {inv.payment_detail ? ` - ${inv.payment_detail}` : ''}
                          </p>
                          {inv.comment && (
                            <p className="text-xs italic text-blue-600 bg-blue-50/50 border border-blue-100/50 rounded px-2 py-0.5 mt-1 inline-block">
                              {inv.comment}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isSpend ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-100">
                              <ArrowUpRight className="h-3 w-3" />
                              <span>Outflow</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                              <ArrowDownLeft className="h-3 w-3" />
                              <span>Inflow</span>
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-emerald-600 whitespace-nowrap">
                          {!isSpend ? `+ BDT ${inv.paid_amount_bdt.toLocaleString('en-US')}` : '—'}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-rose-600 whitespace-nowrap">
                          {isSpend ? `- BDT ${inv.paid_amount_bdt.toLocaleString('en-US')}` : '—'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <Button
                              variant="action"
                              onClick={() => handleOpenPdf(inv.id)}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold shrink-0"
                            >
                              <FileText className="h-3 w-3" />
                              <span>PDF Document</span>
                            </Button>
                            {pdfError[inv.id] && (
                              <span className="text-[10px] text-red-500 font-bold mt-1">{pdfError[inv.id]}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
