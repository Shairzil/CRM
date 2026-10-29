'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { InputField } from '@/components/InputField';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { ArrowLeft, Loader2, FileCheck, Printer } from 'lucide-react';
import api from '@/lib/api';

export default function CreateInternalInvoicePage() {
  const router = useRouter();

  // Form Fields
  const [payer, setPayer] = useState('');
  const [purpose, setPurpose] = useState('');
  const [amount, setAmount] = useState('');

  // UI States
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMsg, setModalMsg] = useState('');
  const [postSubmitAction, setPostSubmitAction] = useState<(() => void) | null>(null);

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!payer.trim()) {
      newErrors.payer = 'Payer Name is required.';
    }

    if (!purpose.trim()) {
      newErrors.purpose = 'Purpose of cost is required.';
    }

    if (!amount) {
      newErrors.amount = 'Amount (BDT) is required.';
    } else if (Number(amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submitInvoice = async (actionType: 'print' | 'save') => {
    if (!validateForm()) return;
    setSubmitting(true);

    const payload = {
      payer: payer.trim(),
      purpose: purpose.trim(),
      amount: parseFloat(amount),
    };

    try {
      const res = await api.post('/invoices/internal', payload);
      const invoiceData = res.data;

      if (actionType === 'print') {
        const pdfRes = await api.get(`/invoices/${invoiceData.id}/pdf`, { responseType: 'blob' });
        const blob = new Blob([pdfRes.data], { type: 'application/pdf' });
        const pdfUrl = window.URL.createObjectURL(blob);
        window.open(pdfUrl, '_blank');
        setTimeout(() => window.URL.revokeObjectURL(pdfUrl), 1000);

        setModalTitle('Internal Invoice Generated');
        setModalMsg('Internal invoice created and PDF print dispatch succeeded.');
        setPostSubmitAction(() => () => router.push('/dashboard'));
        setModalOpen(true);
      } else {
        const pdfRes = await api.get(`/invoices/${invoiceData.id}/pdf`, { responseType: 'blob' });
        const blob = new Blob([pdfRes.data], { type: 'application/pdf' });

        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `Internal_Invoice_${invoiceData.invoice_id.replace(/\//g, '_')}.pdf`;
        link.click();

        setModalTitle('Internal Invoice Saved');
        setModalMsg('Internal invoice created and PDF copy downloaded successfully.');
        setPostSubmitAction(() => () => router.push('/dashboard'));
        setModalOpen(true);
      }
    } catch (err: any) {
      const serverMsg = err.response?.data?.message;
      setErrors({
        submit: Array.isArray(serverMsg) ? serverMsg.join(', ') : serverMsg || 'Internal invoice creation failed.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-xl border border-gray-100 space-y-6 relative animate-in fade-in duration-300">
        
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

        {/* Brand Header */}
        <div className="pt-8">
          <PageHeader title="Generate Internal Cost Invoice" />
        </div>

        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
            <span className="text-sm font-bold text-red-600">{errors.submit}</span>
          </div>
        )}

        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            
            {/* Invoice ID auto-generated */}
            <InputField
              label="Invoice ID"
              type="text"
              value=""
              placeholder="Auto-generated (e.g. Next/Int/1)"
              disabled
              className="bg-gray-50 opacity-75 md:col-span-2"
            />

            {/* Payer Name */}
            <InputField
              label="Payer / Beneficiary *"
              type="text"
              value={payer}
              onChange={(e) => setPayer(e.target.value)}
              error={errors.payer}
              placeholder="e.g. Finance Department, Joh"
              required
            />

            {/* Purpose */}
            <InputField
              label="Purpose / Cost Category *"
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              error={errors.purpose}
              placeholder="e.g. Office Rent / Stationeries"
              required
            />

            {/* Amount */}
            <InputField
              label="Amount (BDT) *"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              error={errors.amount}
              placeholder="e.g. 15000"
              required
              className="md:col-span-2"
            />

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
    </div>
  );
}
