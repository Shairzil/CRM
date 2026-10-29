import React from 'react';

const COLORS: Record<string, string> = {
  // leads
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-indigo-100 text-indigo-700',
  interested: 'bg-emerald-100 text-emerald-700',
  follow_up: 'bg-amber-100 text-amber-800',
  not_interested: 'bg-gray-200 text-gray-600',
  converted: 'bg-green-600 text-white',
  lost: 'bg-red-100 text-red-700',
  // documents
  requested: 'bg-amber-100 text-amber-800',
  uploaded: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  // applications
  draft: 'bg-gray-100 text-gray-700',
  documents_pending: 'bg-amber-100 text-amber-800',
  submitted: 'bg-blue-100 text-blue-700',
  conditional_offer: 'bg-teal-100 text-teal-700',
  unconditional_offer: 'bg-emerald-100 text-emerald-700',
  deposit_paid: 'bg-cyan-100 text-cyan-800',
  cas_coe_received: 'bg-sky-100 text-sky-800',
  visa_applied: 'bg-violet-100 text-violet-700',
  visa_granted: 'bg-green-600 text-white',
  visa_refused: 'bg-red-600 text-white',
  enrolled: 'bg-green-700 text-white',
  withdrawn: 'bg-gray-200 text-gray-600',
};

export function statusLabel(status: string): string {
  const special: Record<string, string> = {
    cas_coe_received: 'CAS / CoE Received',
    follow_up: 'Follow-up',
  };
  if (special[status]) return special[status];
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span
    className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${COLORS[status] || 'bg-gray-100 text-gray-700'}`}
  >
    {statusLabel(status)}
  </span>
);
