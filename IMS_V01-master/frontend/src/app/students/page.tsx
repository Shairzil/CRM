'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { ArrowLeft, Search, Loader2, User, FileText, ClipboardList, Printer, FileCheck, X } from 'lucide-react';
import api from '@/lib/api';

interface StudentRow {
  id: number;
  student_id: string;
  name: string;
  phone_country_code: string;
  phone_number: string;
  invoiceCount: number;
  hasDue?: boolean;
  follow_up_date?: string | null;
  status?: string;
}


interface CollectedInfoRow {
  id: number;
  name: string;
  phone_country_code: string;
  phone_number: string;
  preferred_course_level: string;
  test_taken: string;
  created_at: string;
  isRegistered?: boolean;
}

const isToday = (dateStr?: string | null) => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
};

function StudentsInfoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  // Tab State
  const [activeTab, setActiveTab] = useState<'registered' | 'collected' | 'transactions'>('collected');

  useEffect(() => {
    if (tabParam === 'registered' || tabParam === 'collected' || tabParam === 'transactions') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: 'registered' | 'collected' | 'transactions') => {
    setActiveTab(tab);
    router.replace(`/students?tab=${tab}`);
  };

  // Registered Student States
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [nameFilter, setNameFilter] = useState('');

  // Collected Info States
  const [collectedList, setCollectedList] = useState<CollectedInfoRow[]>([]);
  const [collectedLoading, setCollectedLoading] = useState(false);
  const [collectedNameFilter, setCollectedNameFilter] = useState('');

  // Transactions Tab States
  const [transactionList, setTransactionList] = useState<StudentRow[]>([]);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [transactionNameFilter, setTransactionNameFilter] = useState('');

  // Pay Modal States
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [payStage, setPayStage] = useState<'select' | 'form'>('select');
  const [payCategory, setPayCategory] = useState<'application' | 'other' | null>(null);
  const [studentDetailsLoading, setStudentDetailsLoading] = useState(false);
  const [studentDetails, setStudentDetails] = useState<any | null>(null);

  // Form Fields in Modal
  const [totalFee, setTotalFee] = useState('');
  const [amountAlreadyPaid, setAmountAlreadyPaid] = useState(0);
  const [payAmount, setPayAmount] = useState('');
  const [information, setInformation] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'card' | 'mobile'>('cash');
  const [bankName, setBankName] = useState('');
  const [paymentDetail, setPaymentDetail] = useState('');
  const [comment, setComment] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const [error, setError] = useState('');

  // General Info/Success Modal States
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [infoModalTitle, setInfoModalTitle] = useState('');
  const [infoModalMessage, setInfoModalMessage] = useState('');

  // Fetch functions
  const fetchStudents = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/students');
      setStudents(res.data);
    } catch {
      setError('Failed to load students. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCollectedList = async () => {
    setCollectedLoading(true);
    setError('');
    try {
      const res = await api.get('/students/info');
      setCollectedList(res.data);
    } catch {
      setError('Failed to load collected student information. Please try again.');
    } finally {
      setCollectedLoading(false);
    }
  };

  const fetchTransactionList = async () => {
    setTransactionLoading(true);
    setError('');
    try {
      const res = await api.get('/students');
      setTransactionList(res.data);
    } catch {
      setError('Failed to load transaction students. Please try again.');
    } finally {
      setTransactionLoading(false);
    }
  };

  // Switch tab trigger
  useEffect(() => {
    if (activeTab === 'registered') {
      fetchStudents();
    } else if (activeTab === 'transactions') {
      fetchTransactionList();
    } else {
      fetchCollectedList();
    }
  }, [activeTab]);

  // Dynamic client-side filtering
  const filteredStudents = students.filter((student) => {
    const term = nameFilter.toLowerCase().trim();
    if (!term) return true;
    return student.name && student.name.toLowerCase().includes(term);
  });

  const filteredCollected = collectedList.filter((info) => {
    const term = collectedNameFilter.toLowerCase().trim();
    if (!term) return true;
    return info.name && info.name.toLowerCase().includes(term);
  });

  const filteredTransactions = transactionList.filter((student) => {
    const term = transactionNameFilter.toLowerCase().trim();
    if (!term) return true;
    return student.name && student.name.toLowerCase().includes(term);
  });

  const loadStudentDetails = async (studentId: number, category: 'application' | 'other') => {
    setStudentDetailsLoading(true);
    setFormErrors({});
    try {
      const res = await api.get(`/students/${studentId}`);
      const s = res.data;
      setStudentDetails(s);

      const invoices: any[] = s.invoices || [];

      // Amount Received: how much the student has paid for this fee category
      // We retrieve it from the cumulative fields of the latest invoice
      const latestInvoice = invoices[0];
      const amountReceived = latestInvoice
        ? (category === 'application'
          ? Number(latestInvoice.application_fee_bdt) || 0
          : Number(latestInvoice.other_fee_bdt) || 0)
        : 0;

      // Amount Already Spent: what the company has already disbursed for this fee category
      const spendComment = category === 'application' ? 'Application Fee Spend' : 'Other Fee Spend';
      const alreadySpent = invoices
        .filter((inv) => inv.comment && inv.comment.trim().toLowerCase() === spendComment.toLowerCase())
        .reduce((sum, inv) => sum + (Number(inv.paid_amount_bdt) || 0), 0);

      setTotalFee(String(amountReceived));
      setAmountAlreadyPaid(alreadySpent);

      setPayAmount('');
      setInformation('');
      setPaymentMethod('cash');
      setBankName('');
      setPaymentDetail('');
      setComment('');
      setPayStage('form');
      setPayCategory(category);
    } catch (err) {
      setFormErrors({ load: 'Failed to retrieve student financial details.' });
    } finally {
      setStudentDetailsLoading(false);
    }
  };

  const handleSavePayTransaction = async (actionType: 'save' | 'print') => {
    const newErrors: Record<string, string> = {};
    const amountReceived = parseFloat(totalFee) || 0;
    const alreadySpent = amountAlreadyPaid;
    const remaining = amountReceived - alreadySpent;
    const pay = parseFloat(payAmount) || 0;

    if (amountReceived <= 0) {
      newErrors.totalFee = 'No amount has been received from the student for this fee category yet.';
    }

    if (!payAmount) {
      newErrors.payAmount = 'Disbursement amount is required.';
    } else if (pay <= 0) {
      newErrors.payAmount = 'Disbursement amount must be greater than 0.';
    } else if (pay > remaining) {
      newErrors.payAmount = `Disbursement cannot exceed remaining balance of BDT ${remaining.toFixed(2)}.`;
    }

    if (!information.trim()) {
      newErrors.information = 'Information details are required.';
    }

    setFormErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setModalSubmitting(true);

    // Spend transactions: pass paid_amount_bdt = disbursed amount
    // application_fee_bdt and other_fee_bdt are 0 (not adding new fees to the student's balance)
    const payload = {
      student_id: selectedStudent.id,
      payer_name: selectedStudent.name,
      payer_phone_country_code: selectedStudent.phone_country_code || '+880',
      payer_phone_number: selectedStudent.phone_number,
      payment_method: paymentMethod,
      payment_detail: paymentMethod === 'cash' ? null : paymentDetail,
      bank_name: paymentMethod === 'bank' ? bankName : null,
      paid_amount_bdt: pay,
      application_fee_bdt: 0,
      other_fee_bdt: 0,
      comment: payCategory === 'application' ? 'Application Fee Spend' : 'Other Fee Spend',
      information: information.trim(),
    };

    try {
      const res = await api.post('/invoices', payload);
      const invoiceData = res.data;

      if (actionType === 'print') {
        const pdfRes = await api.get(`/invoices/${invoiceData.id}/pdf`, { responseType: 'blob' });
        const blob = new Blob([pdfRes.data], { type: 'application/pdf' });
        const pdfUrl = window.URL.createObjectURL(blob);

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.src = pdfUrl;
        iframe.onload = () => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => { document.body.removeChild(iframe); }, 3000);
        };
        document.body.appendChild(iframe);
      } else {
        const pdfRes = await api.get(`/invoices/${invoiceData.id}/pdf`, { responseType: 'blob' });
        const blob = new Blob([pdfRes.data], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `Voucher_${invoiceData.invoice_id.replace(/\//g, '_')}.pdf`;
        link.click();
      }

      // Re-fetch transaction list and reload student details so modal shows updated balances
      await fetchTransactionList();
      await loadStudentDetails(selectedStudent.id, payCategory!);

      setIsPayModalOpen(false);
      setInfoModalTitle('Success');
      setInfoModalMessage(`Disbursement successfully ${actionType === 'print' ? 'printed' : 'saved'} and recorded!`);
      setInfoModalOpen(true);
    } catch (err: any) {
      const serverMsg = err.response?.data?.message;
      setFormErrors({
        submit: Array.isArray(serverMsg) ? serverMsg.join(', ') : serverMsg || 'Disbursement submission failed.',
      });
    } finally {
      setModalSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto bg-white p-8 rounded-2xl shadow-xl border border-gray-100 space-y-6 relative animate-in fade-in duration-300">

        {/* Top Left Red Back Button */}
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
          <PageHeader title="Students Information" />
        </div>

        {/* Tabs Selection Bar */}
        <div className="flex border-b border-gray-200 flex-wrap">
          <button
            onClick={() => handleTabChange('collected')}
            className={`flex items-center gap-2 px-6 py-3 font-bold text-sm border-b-2 transition-all cursor-pointer ${activeTab === 'collected'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
          >
            <FileText className="h-4 w-4" />
            <span>Collected Information</span>
          </button>
          <button
            onClick={() => handleTabChange('registered')}
            className={`flex items-center gap-2 px-6 py-3 font-bold text-sm border-b-2 transition-all cursor-pointer ${activeTab === 'registered'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
          >
            <ClipboardList className="h-4 w-4" />
            <span>Registered Students</span>
          </button>
          <button
            onClick={() => handleTabChange('transactions')}
            className={`flex items-center gap-2 px-6 py-3 font-bold text-sm border-b-2 transition-all cursor-pointer ${activeTab === 'transactions'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
          >
            <ClipboardList className="h-4 w-4" />
            <span>Transactions</span>
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
            <span className="text-sm font-bold text-red-600">{error}</span>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'registered' ? (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Search Filters for Registered */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Registered Students List</h3>
                <p className="text-xs text-gray-400 font-semibold">Search and manage registered students</p>
              </div>
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by student name..."
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>

            {/* Registered Table */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                <span className="text-sm font-semibold text-gray-500">Loading students...</span>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
                <User className="h-16 w-16 opacity-30" />
                <span className="text-sm font-semibold">No students found. Try adjusting filters.</span>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-blue-600 text-white">
                      <th className="text-left px-5 py-3 font-bold text-xs uppercase tracking-wider">Student ID</th>
                      <th className="text-left px-5 py-3 font-bold text-xs uppercase tracking-wider">Name</th>
                      <th className="text-left px-5 py-3 font-bold text-xs uppercase tracking-wider">Status</th>
                      <th className="text-left px-5 py-3 font-bold text-xs uppercase tracking-wider">Follow Up</th>

                      <th className="text-center px-5 py-3 font-bold text-xs uppercase tracking-wider">Invoice No</th>
                      <th className="text-center px-5 py-3 font-bold text-xs uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student, idx) => (
                      <tr
                        key={student.id}
                        className={`border-b border-gray-100 transition-colors hover:bg-blue-50/30 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                          }`}
                      >
                        <td className="px-5 py-3 font-mono text-xs font-bold text-blue-700">{student.student_id}</td>
                        <td className={`px-5 py-3 font-semibold ${student.hasDue ? 'blink-alert' : 'text-gray-900'}`}>{student.name}</td>
                        <td className="px-5 py-3 text-gray-700">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 border border-blue-100 text-blue-700">
                            {student.status || 'Registered'}
                          </span>
                        </td>

                        <td className={`px-5 py-3 ${isToday(student.follow_up_date) ? 'blink-alert' : 'text-gray-600'}`}>
                          {student.follow_up_date
                            ? new Date(student.follow_up_date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                            : '—'}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
                            {student.invoiceCount}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="action"
                              onClick={() => router.push(`/students/${student.id}/details`)}
                              className="px-3 py-1.5 text-xs"
                            >
                              Details
                            </Button>
                            <Button
                              variant="action"
                              onClick={() => router.push(`/invoices/create?studentId=${student.id}`)}
                              className="px-3 py-1.5 text-xs"
                            >
                              Generate Invoice
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer count */}
            {!loading && filteredStudents.length > 0 && (
              <p className="text-xs font-bold text-gray-400 text-right font-mono">
                Showing {filteredStudents.length} of {students.length} student{students.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        ) : activeTab === 'transactions' ? (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Search Filters for Transactions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Student Transactions</h3>
                <p className="text-xs text-gray-400 font-semibold">Search by student name to record or view transactions</p>
              </div>
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by student name..."
                  value={transactionNameFilter}
                  onChange={(e) => setTransactionNameFilter(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>

            {/* Transactions Table */}
            {transactionLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                <span className="text-sm font-semibold text-gray-500">Loading registered students...</span>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
                <User className="h-16 w-16 opacity-30" />
                <span className="text-sm font-semibold">No registered students found.</span>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-blue-600 text-white">
                      <th className="text-left px-5 py-3 font-bold text-xs uppercase tracking-wider">Student ID</th>
                      <th className="text-left px-5 py-3 font-bold text-xs uppercase tracking-wider">Name</th>
                      <th className="text-left px-5 py-3 font-bold text-xs uppercase tracking-wider">Phone No</th>
                      <th className="text-center px-5 py-3 font-bold text-xs uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((student, idx) => (
                      <tr
                        key={student.id}
                        className={`border-b border-gray-100 transition-colors hover:bg-blue-50/30 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                          }`}
                      >
                        <td className="px-5 py-3 font-mono text-xs font-bold text-blue-700">{student.student_id}</td>
                        <td className="px-5 py-3 font-semibold text-gray-900">{student.name}</td>
                        <td className="px-5 py-3 text-gray-600">
                          {student.phone_country_code} {student.phone_number}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="action"
                              onClick={() => {
                                setSelectedStudent(student);
                                setPayStage('select');
                                setPayCategory(null);
                                setIsPayModalOpen(true);
                              }}
                              className="px-3 py-1.5 text-xs bg-green-500 hover:bg-green-600"
                            >
                              Pay
                            </Button>
                            <Button
                              variant="dashboard"
                              onClick={() => router.push(`/students/${student.id}/transactions`)}
                              className="px-3 py-1.5 text-xs"
                            >
                              Details
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer count */}
            {!transactionLoading && filteredTransactions.length > 0 && (
              <p className="text-xs font-bold text-gray-400 text-right font-mono">
                Showing {filteredTransactions.length} of {transactionList.length} student{transactionList.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Search Filters for Collected */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Collected Information</h3>
                <p className="text-xs text-gray-400 font-semibold">Search by student name to view collected info or register</p>
              </div>
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by student name..."
                  value={collectedNameFilter}
                  onChange={(e) => setCollectedNameFilter(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>

            {/* Collected Table */}
            {collectedLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                <span className="text-sm font-semibold text-gray-500">Loading collected records...</span>
              </div>
            ) : filteredCollected.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
                <User className="h-16 w-16 opacity-30" />
                <span className="text-sm font-semibold">No collected information entries found.</span>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-blue-600 text-white">
                      <th className="text-left px-5 py-3 font-bold text-xs uppercase tracking-wider">Name</th>
                      <th className="text-left px-5 py-3 font-bold text-xs uppercase tracking-wider">Phone No</th>
                      <th className="text-left px-5 py-3 font-bold text-xs uppercase tracking-wider">Pref. Course Level</th>
                      <th className="text-left px-5 py-3 font-bold text-xs uppercase tracking-wider">Test Taken</th>
                      <th className="text-center px-5 py-3 font-bold text-xs uppercase tracking-wider">Date Collected</th>
                      <th className="text-center px-5 py-3 font-bold text-xs uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCollected.map((info, idx) => (
                      <tr
                        key={info.id}
                        className={`border-b border-gray-100 transition-colors hover:bg-blue-50/30 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                          }`}
                      >
                        <td className={`px-5 py-3 font-semibold ${!info.isRegistered ? 'blink-alert' : 'text-gray-900'}`}>{info.name}</td>
                        <td className="px-5 py-3 text-gray-600">
                          {info.phone_country_code} {info.phone_number}
                        </td>
                        <td className="px-5 py-3 font-medium text-gray-950">{info.preferred_course_level}</td>
                        <td className="px-5 py-3 text-xs text-gray-600 font-bold">
                          <span className="px-2 py-1 bg-blue-50 border border-blue-100 rounded-md text-blue-700">
                            {info.test_taken}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center text-gray-500 font-mono text-xs">
                          {new Date(info.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="dashboard"
                              onClick={() => router.push(`/students/collected/${info.id}`)}
                              className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700"
                            >
                              Details
                            </Button>
                            <Button
                              variant="action"
                              onClick={() =>
                                router.push(
                                  `/students/add/register?name=${encodeURIComponent(
                                    info.name
                                  )}&phone=${encodeURIComponent(
                                    info.phone_number
                                  )}&countryCode=${encodeURIComponent(
                                    info.phone_country_code
                                  )}&level=${encodeURIComponent(info.preferred_course_level)}`
                                )
                              }
                              className="px-3 py-1.5 text-xs bg-green-500 hover:bg-green-600"
                            >
                              Register
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer count */}
            {!collectedLoading && filteredCollected.length > 0 && (
              <p className="text-xs font-bold text-gray-400 text-right font-mono">
                Showing {filteredCollected.length} of {collectedList.length} entry{collectedList.length !== 1 ? 'ies' : ''}
              </p>
            )}
          </div>
        )}

      </div>

      {/* Custom Pay Modal */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <h3 className="text-lg font-bold">Record Transaction</h3>
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {payStage === 'select' ? (
                <div className="space-y-6 py-4 text-center">
                  <p className="text-sm font-semibold text-gray-600">
                    Select a fee category to disburse from for <span className="font-bold text-gray-900">{selectedStudent?.name}</span>:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      onClick={() => loadStudentDetails(selectedStudent.id, 'application')}
                      className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50/30 transition-all cursor-pointer group"
                    >
                      <span className="font-extrabold text-gray-950 group-hover:text-blue-600 text-base">Spend from Application Fee</span>
                      <span className="text-xs text-gray-400 mt-1">Disburse from received application fee funds</span>
                    </button>
                    <button
                      onClick={() => loadStudentDetails(selectedStudent.id, 'other')}
                      className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50/30 transition-all cursor-pointer group"
                    >
                      <span className="font-extrabold text-gray-950 group-hover:text-blue-600 text-base">Spend from Other Fee</span>
                      <span className="text-xs text-gray-400 mt-1">Disburse from received other fee funds</span>
                    </button>
                  </div>
                </div>
              ) : studentDetailsLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                  <span className="text-sm font-semibold text-gray-500 font-mono">Loading financials...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {formErrors.load && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                      <span className="text-sm font-bold text-red-600">{formErrors.load}</span>
                    </div>
                  )}

                  {formErrors.submit && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                      <span className="text-sm font-bold text-red-600">{formErrors.submit}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Student Name */}
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Student Name</span>
                      <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm font-semibold text-gray-800">
                        {selectedStudent?.name}
                      </div>
                    </div>

                    {/* Student ID */}
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Student ID</span>
                      <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm font-mono font-bold text-blue-700">
                        {selectedStudent?.student_id}
                      </div>
                    </div>

                    {/* Amount Received from Student */}
                    <div className="flex flex-col gap-1 col-span-1">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        {payCategory === 'application' ? 'Application Fee Received (BDT)' : 'Other Fee Received (BDT)'}
                      </span>
                      <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm font-bold text-gray-800">
                        BDT {parseFloat(totalFee || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      {formErrors.totalFee && <span className="text-xs font-bold text-red-500">{formErrors.totalFee}</span>}
                    </div>

                    {/* Amount Already Spent */}
                    <div className="flex flex-col gap-1 col-span-1">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Amount Already Spent</span>
                      <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm font-semibold text-gray-800">
                        BDT {amountAlreadyPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    {/* Disbursement Amount */}
                    <div className="flex flex-col gap-1 col-span-1">
                      <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Disbursement Amount (BDT) *</span>
                      <input
                        type="number"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        placeholder="e.g. 5000"
                        required
                      />
                      {formErrors.payAmount && <span className="text-xs font-bold text-red-500">{formErrors.payAmount}</span>}
                    </div>

                    {/* Remaining Amount */}
                    <div className="flex flex-col gap-1 col-span-1">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Remaining Amount</span>
                      {(() => {
                        const fee = parseFloat(totalFee) || 0;
                        const pay = parseFloat(payAmount) || 0;
                        const rem = Math.max(0, fee - amountAlreadyPaid - pay);
                        return (
                          <div className="px-3 py-2 border border-gray-200 rounded-lg bg-red-50 text-sm font-extrabold text-red-600">
                            BDT {rem.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Information */}
                    <div className="flex flex-col gap-1 col-span-1 sm:col-span-2">
                      <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Information *</span>
                      <input
                        type="text"
                        value={information}
                        onChange={(e) => setInformation(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        placeholder="e.g. Visa processing fee / flight booking invoice"
                        required
                      />
                      {formErrors.information && <span className="text-xs font-bold text-red-500">{formErrors.information}</span>}
                    </div>

                    {/* Payment Method Selector */}
                    <div className="flex flex-col gap-1 col-span-1">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Payment Method</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => {
                          setPaymentMethod(e.target.value as any);
                          setBankName('');
                          setPaymentDetail('');
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="cash">CASH</option>
                        <option value="bank">BANK</option>
                        <option value="card">CARD</option>
                        <option value="mobile">MOBILE</option>
                      </select>
                    </div>

                    {/* Conditional fields based on method */}
                    {paymentMethod === 'bank' && (
                      <div className="flex flex-col gap-1 col-span-1 animate-in fade-in duration-150">
                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Bank Name</span>
                        <input
                          type="text"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                          placeholder="e.g. BRAC Bank"

                        />
                        {formErrors.bankName && <span className="text-xs font-bold text-red-500">{formErrors.bankName}</span>}
                      </div>
                    )}

                    {paymentMethod !== 'cash' && (
                      <div className="flex flex-col gap-1 col-span-1 animate-in fade-in duration-150">
                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                          {paymentMethod === 'bank' ? 'ACC NO' : paymentMethod === 'card' ? 'Card NO' : 'Phone No'}
                        </span>
                        <input
                          type="text"
                          value={paymentDetail}
                          onChange={(e) => setPaymentDetail(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                          placeholder={`Enter ${paymentMethod} details`}

                        />
                        {formErrors.paymentDetail && <span className="text-xs font-bold text-red-500">{formErrors.paymentDetail}</span>}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
              {payStage === 'form' && (
                <button
                  onClick={() => setPayStage('select')}
                  className="px-4 py-2 border border-gray-300 hover:bg-gray-100 rounded-lg text-sm font-bold text-gray-700 select-none cursor-pointer transition-colors"
                  disabled={modalSubmitting}
                >
                  Back
                </button>
              )}
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="px-4 py-2 border border-gray-300 hover:bg-gray-100 rounded-lg text-sm font-bold text-gray-700 select-none cursor-pointer transition-colors"
                disabled={modalSubmitting}
              >
                Cancel
              </button>
              {payStage === 'form' && (
                <>
                  <Button
                    type="button"
                    variant="action"
                    onClick={() => handleSavePayTransaction('print')}
                    className="flex items-center gap-1.5 px-5 py-2 text-sm"
                    disabled={modalSubmitting || studentDetailsLoading}
                  >
                    <Printer className="h-4 w-4" />
                    <span>Print</span>
                  </Button>
                  <Button
                    type="button"
                    variant="action"
                    onClick={() => handleSavePayTransaction('save')}
                    className="flex items-center gap-1.5 px-5 py-2 text-sm bg-green-500 hover:bg-green-600"
                    disabled={modalSubmitting || studentDetailsLoading}
                  >
                    <FileCheck className="h-4 w-4" />
                    <span>Save</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* General Success/Info Modal */}
      <Modal
        isOpen={infoModalOpen}
        title={infoModalTitle}
        message={infoModalMessage}
        onConfirm={() => setInfoModalOpen(false)}
      />

    </div>
  );
}

export default function StudentsInfoPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    }>
      <StudentsInfoContent />
    </Suspense>
  );
}
