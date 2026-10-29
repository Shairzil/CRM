'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { InputField } from '@/components/InputField';
import { PhoneInput } from '@/components/PhoneInput';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { ArrowLeft, Loader2, FileCheck, Printer } from 'lucide-react';
import api from '@/lib/api';

interface Student {
  id: number;
  student_id: string;
  name: string;
  phone_country_code: string;
  phone_number: string;
  file_opening_fee_bdt: number;
  application_fee_bdt: number;
  previous_due?: number;
  previous_total?: number;
}

function InvoiceFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentId = searchParams.get('studentId');

  // Student references
  const [student, setStudent] = useState<Student | null>(null);
  const [studentLoading, setStudentLoading] = useState(true);

  // Self-pay toggle
  const [payingSelf, setPayingSelf] = useState(true);

  // Form Fields
  const [payerName, setPayerName] = useState('');
  const [payerPhoneCountryCode, setPayerPhoneCountryCode] = useState('+880');
  const [payerPhoneNumber, setPayerPhoneNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'card' | 'mobile'>('cash');
  const [bankName, setBankName] = useState('');
  const [paymentDetail, setPaymentDetail] = useState('');
  const [paidAmountBdt, setPaidAmountBdt] = useState('');

  // Form Fields for fees
  const [applicationFeeBdt, setApplicationFeeBdt] = useState('');
  const [otherFeeBdt, setOtherFeeBdt] = useState('');
  const [comment, setComment] = useState('');
  const [fileOpeningFee, setFileOpeningFee] = useState(0);
  const [baseTotalAmount, setBaseTotalAmount] = useState(0);
  const [baseDueAmount, setBaseDueAmount] = useState(0);

  // Form helpers
  const [totalAmount, setTotalAmount] = useState(0);
  const [dueAmount, setDueAmount] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMsg, setModalMsg] = useState('');
  const [postSubmitAction, setPostSubmitAction] = useState<(() => void) | null>(null);

  // Load student data on startup
  useEffect(() => {
    if (!studentId) {
      setErrors({ load: 'No student reference ID supplied in URL parameters.' });
      setStudentLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const studentRes = await api.get(`/students/${studentId}`);
        const s = studentRes.data;
        setStudent(s);
        const openingFee = Number(s.file_opening_fee_bdt) || 0;
        const previousTotal = Number(s.previous_total) || openingFee;
        const previousDue = Number(s.previous_due) || 0;
        setFileOpeningFee(openingFee);
        setBaseTotalAmount(previousTotal);
        setBaseDueAmount(previousDue);
        setTotalAmount(previousTotal);
        setDueAmount(previousDue);
      } catch (err) {
        setErrors({ load: 'Failed to retrieve registered student records from DB.' });
      } finally {
        setStudentLoading(false);
      }
    };

    loadData();
  }, [studentId]);

  // When payingSelf is toggled, auto-fill or clear payer fields
  useEffect(() => {
    if (payingSelf && student) {
      setPayerName(student.name);
      setPayerPhoneCountryCode(student.phone_country_code || '+880');
      setPayerPhoneNumber(student.phone_number || '');
    } else if (!payingSelf) {
      setPayerName('');
      setPayerPhoneCountryCode('+880');
      setPayerPhoneNumber('');
    }
  }, [payingSelf, student]);

  // Recalculate Live Total and Due Amounts as User types
  useEffect(() => {
    const appFee = parseFloat(applicationFeeBdt) || 0;
    const otherFee = parseFloat(otherFeeBdt) || 0;
    const paid = parseFloat(paidAmountBdt) || 0;
    const addedFees = appFee + otherFee;
    const total = baseTotalAmount + addedFees;
    const dueBeforePayment = baseDueAmount + addedFees;
    setTotalAmount(total);
    setDueAmount(Math.max(0, dueBeforePayment - paid));
  }, [applicationFeeBdt, otherFeeBdt, baseTotalAmount, baseDueAmount, paidAmountBdt]);

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!payerName.trim()) {
      newErrors.payerName = 'Payer Name is required.';
    }

    if (!payerPhoneNumber) {
      newErrors.payerPhone = 'Payer Phone Number is required.';
    } else if (!/^[0-9]+$/.test(payerPhoneNumber)) {
      newErrors.payerPhone = 'Payer Phone Number must contain only numbers.';
    }

    if (paymentMethod === 'bank' && !bankName.trim()) {
      newErrors.bankName = 'Bank Name is required for bank payments.';
    }

    if (paymentMethod !== 'cash' && !paymentDetail.trim()) {
      newErrors.paymentDetail = 'Payment detail reference is required.';
    }

    if (applicationFeeBdt && Number(applicationFeeBdt) < 0) {
      newErrors.appFee = 'Application Fee BDT must be a positive value.';
    }

    if (otherFeeBdt && Number(otherFeeBdt) < 0) {
      newErrors.otherFee = 'Other Fee BDT must be a positive value.';
    }

    const appFee = parseFloat(applicationFeeBdt) || 0;
    const otherFee = parseFloat(otherFeeBdt) || 0;
    const payableAmount = baseDueAmount + appFee + otherFee;

    if (!paidAmountBdt) {
      newErrors.paid = 'Paid Amount BDT is required.';
    } else if (Number(paidAmountBdt) < 0) {
      newErrors.paid = 'Paid Amount BDT must be a positive value.';
    } else if (Number(paidAmountBdt) > payableAmount) {
      newErrors.paid = `Paid Amount cannot exceed Due BDT: ${payableAmount.toFixed(2)}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submitInvoice = async (actionType: 'print' | 'save') => {
    if (!validateForm()) return;
    setSubmitting(true);

    const payload = {
      student_id: Number(studentId),
      payer_name: payerName,
      payer_phone_country_code: payerPhoneCountryCode,
      payer_phone_number: payerPhoneNumber,
      payment_method: paymentMethod,
      payment_detail: paymentMethod === 'cash' ? null : paymentDetail,
      bank_name: paymentMethod === 'bank' ? bankName : null,
      paid_amount_bdt: parseFloat(paidAmountBdt),
      application_fee_bdt: parseFloat(applicationFeeBdt) || 0,
      other_fee_bdt: parseFloat(otherFeeBdt) || 0,
      comment: comment.trim() || null,
    };

    try {
      const res = await api.post('/invoices', payload);
      const invoiceData = res.data;

      if (actionType === 'print') {
        const pdfRes = await api.get(`/invoices/${invoiceData.id}/pdf`, { responseType: 'blob' });
        const blob = new Blob([pdfRes.data], { type: 'application/pdf' });
        const pdfUrl = window.URL.createObjectURL(blob);
        window.open(pdfUrl, '_blank');
        setTimeout(() => window.URL.revokeObjectURL(pdfUrl), 1000);

        setModalTitle('Invoice Registered');
        setModalMsg('Invoice created and PDF stream dispatched to print preview.');
        setPostSubmitAction(() => () => router.push('/students?tab=registered'));
        setModalOpen(true);
      } else {
        const pdfRes = await api.get(`/invoices/${invoiceData.id}/pdf`, { responseType: 'blob' });
        const blob = new Blob([pdfRes.data], { type: 'application/pdf' });

        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `Invoice_${invoiceData.invoice_id.replace(/\//g, '_')}.pdf`;
        link.click();

        setModalTitle('Invoice Saved');
        setModalMsg('Invoice created and PDF receipt downloaded successfully.');
        setPostSubmitAction(() => () => router.push('/students?tab=registered'));
        setModalOpen(true);
      }
    } catch (err: any) {
      const serverMsg = err.response?.data?.message;
      setErrors({
        submit: Array.isArray(serverMsg) ? serverMsg.join(', ') : serverMsg || 'Invoice submission failed.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (studentLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <span className="text-sm font-semibold text-gray-500">Loading student details...</span>
      </div>
    );
  }

  if (errors.load) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-center max-w-md mx-auto mt-10">
        <h4 className="text-lg font-bold text-red-600 mb-2">Error</h4>
        <p className="text-sm text-red-500">{errors.load}</p>
        <Button variant="action" onClick={() => router.push('/students?tab=registered')} className="mt-4">
          Back to Students
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Pre-fill Details Card */}
      {student && (
        <div className="p-5 border border-gray-200 rounded-xl bg-gray-50/50">
          <h3 className="text-sm font-extrabold text-blue-600 uppercase tracking-wider mb-3">
            Pre-registered Student Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold text-gray-600">
            <div>
              <span className="text-[10px] text-gray-400 block uppercase">Student ID:</span>
              <span className="text-gray-900 font-bold">{student.student_id}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block uppercase">Student Name:</span>
              <span className="text-gray-900 font-bold">{student.name}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block uppercase">File Opening Fee BDT:</span>
              <span className="text-gray-900 font-extrabold">BDT {fileOpeningFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      )}

      {errors.submit && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
          <span className="text-sm font-bold text-red-600">{errors.submit}</span>
        </div>
      )}

      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">

          {/* Invoice ID auto-generated */}
          <InputField
            label="Invoice ID"
            type="text"
            value=""
            placeholder="Will be generated automatically (e.g. NextEd/INV/1)"
            disabled
            className="bg-gray-50 opacity-75"
          />

          <InputField
            label="Application Fee (BDT)"
            type="number"
            value={applicationFeeBdt}
            onChange={(e) => setApplicationFeeBdt(e.target.value)}
            error={errors.appFee}
            placeholder="e.g. 5000"
          />

          <InputField
            label="Other Fee (BDT)"
            type="number"
            value={otherFeeBdt}
            onChange={(e) => setOtherFeeBdt(e.target.value)}
            error={errors.otherFee}
            placeholder="e.g. 1000"
          />

          <InputField
            label="Comment"
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional note"
          />

          {/* Self-Pay Toggle — spans full width */}
          <div className="col-span-1 md:col-span-2 flex flex-col gap-3 p-4 border border-blue-100 rounded-xl bg-blue-50/30">
            <span className="text-sm font-semibold text-gray-700">Is the student paying himself?</span>
            <div className="flex gap-8">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                <input
                  type="radio"
                  name="payingSelf"
                  checked={payingSelf}
                  onChange={() => setPayingSelf(true)}
                  className="accent-blue-600 h-4 w-4"
                />
                <span>Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                <input
                  type="radio"
                  name="payingSelf"
                  checked={!payingSelf}
                  onChange={() => setPayingSelf(false)}
                  className="accent-blue-600 h-4 w-4"
                />
                <span>No</span>
              </label>
            </div>
            {payingSelf && (
              <p className="text-xs text-blue-600 font-medium">
                Payer details have been auto-filled from student registration. These fields cannot be edited.
              </p>
            )}
          </div>

          {/* Payer Name */}
          <InputField
            label="Payer's Name"
            type="text"
            value={payerName}
            onChange={(e) => !payingSelf && setPayerName(e.target.value)}
            error={errors.payerName}
            placeholder="Enter payer full name"
            required
            disabled={payingSelf}
            className={payingSelf ? 'bg-gray-50 opacity-75' : ''}
          />

          {/* Payer Phone Number */}
          {payingSelf ? (
            <div className="flex flex-col gap-1 w-full">
              <label className="text-sm font-semibold text-gray-700">Payer's Phone Number</label>
              <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm font-semibold text-gray-700 opacity-75">
                {payerPhoneCountryCode} {payerPhoneNumber}
              </div>
            </div>
          ) : (
            <PhoneInput
              label="Payer's Phone Number"
              countryCodeVal={payerPhoneCountryCode}
              onChangeCountryCode={setPayerPhoneCountryCode}
              phoneNumberVal={payerPhoneNumber}
              onChangePhoneNumber={setPayerPhoneNumber}
              error={errors.payerPhone}
            />
          )}

          {/* Total BDT Display */}
          <div className="flex flex-col gap-1 w-full">
            <span className="text-sm font-semibold text-gray-700">Total Amount (BDT)</span>
            <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-base font-extrabold text-gray-900">
              BDT {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Paid BDT input */}
          <InputField
            label="Paid Amount (BDT)"
            type="number"
            value={paidAmountBdt}
            onChange={(e) => setPaidAmountBdt(e.target.value)}
            error={errors.paid}
            placeholder="e.g. 5000"
            required
          />

          {/* Live Due BDT Display */}
          <div className="flex flex-col gap-1 w-full">
            <span className="text-sm font-semibold text-gray-700">Due Amount (BDT)</span>
            <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-red-50 text-base font-extrabold text-red-600">
              BDT {dueAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Payment Method — full width */}
          <div className="flex flex-col gap-3 p-4 border border-gray-100 rounded-xl bg-gray-50/50 col-span-1 md:col-span-2">
            <span className="text-sm font-semibold text-gray-700">Payment Method</span>

            <div className="flex flex-wrap gap-6">
              {['cash', 'bank', 'card', 'mobile'].map((method) => (
                <label key={method} className="flex items-center gap-2 cursor-pointer text-sm font-medium uppercase">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === method}
                    onChange={() => {
                      setPaymentMethod(method as any);
                      setPaymentDetail('');
                      setBankName('');
                    }}
                    className="accent-blue-600 h-4 w-4"
                  />
                  <span>{method}</span>
                </label>
              ))}
            </div>

            {/* Bank Name field — only shown when bank is selected */}
            {paymentMethod === 'bank' && (
              <div className="pt-2 border-t border-gray-200 mt-2 animate-in fade-in slide-in-from-top-2 duration-150">
                <InputField
                  label="Bank Name:"
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  error={errors.bankName}
                  placeholder="Enter bank name"
                  required
                />
              </div>
            )}

            {/* Payment detail (ACC NO / Card NO / Mobile NO) */}
            {paymentMethod !== 'cash' && (
              <div className="pt-2 border-t border-gray-200 mt-2 animate-in fade-in slide-in-from-top-2 duration-150">
                <InputField
                  label={
                    paymentMethod === 'bank'
                      ? 'ACC NO:'
                      : paymentMethod === 'card'
                        ? 'Card NO:'
                        : 'Phone No:'
                  }
                  type="text"
                  value={paymentDetail}
                  onChange={(e) => setPaymentDetail(e.target.value)}
                  error={errors.paymentDetail}
                  placeholder={`Enter payment ${paymentMethod} details`}
                  required
                />
              </div>
            )}
          </div>

        </div>

        {/* Form Action Buttons */}
        <div className="flex gap-4 items-center justify-center border-t border-gray-100 pt-6">
          <Button
            type="button"
            variant="action"
            onClick={() => submitInvoice('print')}
            className="flex items-center gap-2 px-8 py-3 text-sm tracking-wider"
            disabled={submitting}
          >
            <Printer className="h-4 w-4 text-white" />
            <span>{submitting ? 'Processing...' : 'Print'}</span>
          </Button>
          <Button
            type="button"
            variant="action"
            onClick={() => submitInvoice('save')}
            className="flex items-center gap-2 px-8 py-3 text-sm tracking-wider"
            disabled={submitting}
          >
            <FileCheck className="h-4 w-4 text-white" />
            <span>{submitting ? 'Processing...' : 'Save'}</span>
          </Button>
        </div>
      </form>

      {/* Success Notification dialog */}
      <Modal
        isOpen={modalOpen}
        title={modalTitle}
        message={modalMsg}
        onConfirm={() => {
          setModalOpen(false);
          if (postSubmitAction) postSubmitAction();
        }}
      />

    </div>
  );
}

export default function InvoiceFormPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-xl border border-gray-100 space-y-6 relative animate-in fade-in duration-300">

        {/* Top Left Red Back Button */}
        <div className="absolute top-8 left-8">
          <Button
            variant="back"
            onClick={() => router.push('/students?tab=registered')}
            className="flex items-center gap-2 px-4 py-2 text-sm shadow-md"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
        </div>

        {/* Brand Header */}
        <div className="pt-8">
          <PageHeader title="Invoice Form" />
        </div>

        <Suspense fallback={
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <span className="text-sm font-semibold text-gray-500">Loading component content...</span>
          </div>
        }>
          <InvoiceFormContent />
        </Suspense>

      </div>
    </div>
  );
}
