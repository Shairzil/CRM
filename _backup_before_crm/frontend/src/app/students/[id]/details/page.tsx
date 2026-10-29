'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { ArrowLeft, Loader2, FileText } from 'lucide-react';
import api from '@/lib/api';

interface StudentDetail {
  id: number;
  student_id: string;
  name: string;
  phone_country_code: string;
  phone_number: string;
  email: string;
  counselor_name: string;
  study_level?: string;
  source_type: string;
  source_name: string;
  date_of_opening: string;
  file_opening_fee_bdt: number;
  follow_up_date?: string | null;
  follow_up_note?: string | null;
  status?: string;
  follow_ups?: {
    id: number;
    follow_up_date: string;
    notes: string | null;
    created_at: string;
  }[];
  invoices: {

    id: number;
    invoice_id: string;
    payer_name: string;
    payer_phone_country_code: string;
    payer_phone_number: string;
    payment_method: string;
    payment_detail: string;
    country?: {
      name: string;
    };
    application_fee_bdt?: number;
    total_amount_bdt: number;
    paid_amount_bdt: number;
    due_amount_bdt: number;
    created_at: string;
    comment?: string;
  }[];
  cv_name?: string;
  cv_mime?: string;
}

const DetailRow = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-2.5 border-b border-gray-100 last:border-0">
    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider sm:w-52 shrink-0">{label}</span>
    <span className="text-sm font-semibold text-gray-900">{value ?? '—'}</span>
  </div>
);

export default function StudentDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params.id as string;

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pdfError, setPdfError] = useState<Record<number, string>>({});

  // Follow-up editing states
  const [isEditingFollowUp, setIsEditingFollowUp] = useState(false);
  const [tempFollowUpDate, setTempFollowUpDate] = useState('');
  const [isUpdatingFollowUp, setIsUpdatingFollowUp] = useState(false);
  const [updateError, setUpdateError] = useState('');

  // Follow-up notes modal states
  const [isFollowUpNotesModalOpen, setIsFollowUpNotesModalOpen] = useState(false);
  const [tempFollowUpNote, setTempFollowUpNote] = useState('');
  const [notesError, setNotesError] = useState('');

  // Status editing states
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [tempStatus, setTempStatus] = useState('Registered');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusUpdateError, setStatusUpdateError] = useState('');

  // General Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');


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

  const [isUpdatingCv, setIsUpdatingCv] = useState(false);

  const handleOpenCv = async () => {
    try {
      const res = await api.get(`/students/${studentId}/cv`, { responseType: 'blob' });
      const contentType = (typeof res.headers['content-type'] === 'string' ? res.headers['content-type'] : undefined) || student?.cv_mime || 'application/pdf';
      const blob = new Blob([res.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      
      if (contentType === 'application/pdf') {
        window.open(url, '_blank');
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = student?.cv_name || 'CV_Document';
        link.click();
      }
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setModalTitle('Error');
      setModalMessage('Failed to open CV document.');
      setModalOpen(true);
    }
  };

  const handleUpdateCv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'doc' && ext !== 'docx') {
      setModalTitle('Unsupported File');
      setModalMessage('Only PDF, DOC, and DOCX files are supported.');
      setModalOpen(true);
      return;
    }

    setIsUpdatingCv(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post(`/students/${studentId}/cv`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      // Re-fetch student details
      const res = await api.get(`/students/${studentId}`);
      setStudent(res.data);
      setModalTitle('Success');
      setModalMessage('CV document updated successfully.');
      setModalOpen(true);
    } catch (err) {
      setModalTitle('Error');
      setModalMessage('Failed to update CV document.');
      setModalOpen(true);
    } finally {
      setIsUpdatingCv(false);
    }
  };

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const res = await api.get(`/students/${studentId}`);
        setStudent(res.data);
      } catch {
        setError('Failed to load student details.');
      } finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, [studentId]);

  const formatDateToYYYYMMDD = (dateStr?: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSaveFollowUpDate = () => {
    if (!tempFollowUpDate) {
      setUpdateError('Follow Up Date is required.');
      return;
    }
    setTempFollowUpNote('');
    setNotesError('');
    setIsFollowUpNotesModalOpen(true);
  };

  const handleConfirmSaveFollowUp = async () => {
    if (!tempFollowUpNote.trim()) {
      setNotesError('Follow Up Notes are required to update follow up dates.');
      return;
    }
    setIsUpdatingFollowUp(true);
    setNotesError('');
    try {
      await api.patch(`/students/${studentId}`, {
        follow_up_date: tempFollowUpDate,
        follow_up_note: tempFollowUpNote,
      });
      const fullRes = await api.get(`/students/${studentId}`);
      setStudent(fullRes.data);
      setIsEditingFollowUp(false);
      setIsFollowUpNotesModalOpen(false);
    } catch (err: any) {
      const serverMsg = err.response?.data?.message;
      setNotesError(Array.isArray(serverMsg) ? serverMsg.join(', ') : serverMsg || 'Failed to update follow up date.');
    } finally {
      setIsUpdatingFollowUp(false);
    }
  };

  const handleSaveStatus = async () => {
    if (!student) return;
    setIsUpdatingStatus(true);
    setStatusUpdateError('');
    try {
      await api.patch(`/students/${studentId}`, {
        status: tempStatus,
      });
      const fullRes = await api.get(`/students/${studentId}`);
      setStudent(fullRes.data);
      setIsEditingStatus(false);
    } catch (err: any) {
      const serverMsg = err.response?.data?.message;
      setStatusUpdateError(Array.isArray(serverMsg) ? serverMsg.join(', ') : serverMsg || 'Failed to update status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };


  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <span className="text-sm font-semibold text-gray-500">Loading student details...</span>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-sm w-full p-6 bg-red-50 border border-red-200 rounded-xl text-center">
          <p className="text-sm font-bold text-red-600 mb-4">{error || 'Student not found.'}</p>
          <Button variant="action" onClick={() => router.push('/students?tab=registered')}>← Back to Students</Button>
        </div>
      </div>
    );
  }

  // Use the most recent invoice for payment display
  const latestInvoice = student.invoices && student.invoices.length > 0 ? student.invoices[0] : null;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">

        {/* Header Card */}
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 space-y-6 relative">
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

          <div className="pt-8">
            <PageHeader title="Student Details" />
          </div>

          {/* Student Registration Card */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-blue-600 px-6 py-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Registration Information</h3>
            </div>
            <div className="px-6 py-2">
              <DetailRow label="Student ID" value={student.student_id} />
              <DetailRow label="Full Name" value={student.name} />
              <DetailRow label="Phone No" value={`${student.phone_country_code} ${student.phone_number}`} />
              <DetailRow label="Email" value={student.email} />
              <DetailRow label="Date of Opening" value={new Date(student.date_of_opening).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} />
              
              {/* Follow Up Date Row */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-2.5 border-b border-gray-100">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider sm:w-52 shrink-0 pt-1">Follow Up Date</span>
                <div className="flex flex-wrap items-center gap-3">
                  {isEditingFollowUp ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={tempFollowUpDate}
                        onChange={(e) => setTempFollowUpDate(e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded-lg bg-white text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-semibold"
                        disabled={isUpdatingFollowUp}
                      />
                      <Button
                        variant="action"
                        onClick={handleSaveFollowUpDate}
                        className="px-3 py-1 text-xs bg-green-500 hover:bg-green-600 flex items-center justify-center min-w-[50px] min-h-[30px]"
                        disabled={isUpdatingFollowUp}
                      >
                        Save
                      </Button>
                      <button
                        onClick={() => setIsEditingFollowUp(false)}
                        className="px-3 py-1 text-xs border border-gray-300 hover:bg-gray-100 rounded-lg text-gray-700 font-bold transition-colors min-h-[30px]"
                        disabled={isUpdatingFollowUp}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-900">
                        {student.follow_up_date
                          ? new Date(student.follow_up_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                          : '—'}
                      </span>
                      <Button
                        variant="action"
                        onClick={() => {
                          setTempFollowUpDate(formatDateToYYYYMMDD(student.follow_up_date));
                          setUpdateError('');
                          setIsEditingFollowUp(true);
                        }}
                        className="px-2.5 py-1 text-xs"
                      >
                        Update
                      </Button>
                    </div>
                  )}
                  {updateError && (
                    <span className="text-xs font-bold text-red-500 mt-1 sm:mt-0">{updateError}</span>
                  )}
                </div>

                {/* Follow Up Notes displayed to the right */}
                {!isEditingFollowUp && (
                  <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 sm:ml-8 flex-1">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider pt-1 shrink-0">Follow Up Notes</span>
                    <span className="text-sm font-semibold text-gray-900 break-words flex-1">
                      {student.follow_up_note ?? '—'}
                    </span>
                  </div>
                )}
              </div>

              {/* Previous Follow Ups History */}
              {(() => {
                const sortedFollowUps = [...(student.follow_ups || [])]
                  .filter(f => f.notes || f.follow_up_date)
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                const previousFollowUps = student.follow_up_date ? sortedFollowUps.slice(1) : sortedFollowUps;
                
                if (previousFollowUps.length === 0) return null;

                return (
                  <div className="py-2.5 border-b border-gray-100">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Previous Follow Ups History</span>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {previousFollowUps.map((f, idx) => (
                        <div key={f.id || idx} className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-4 py-2 px-3 bg-gray-50 rounded-lg border border-gray-100 animate-in fade-in duration-200">
                          <div className="flex flex-col gap-0.5 sm:w-52 shrink-0">
                            <span className="text-xs font-bold text-gray-500">
                              {new Date(f.follow_up_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                            <span className="text-[10px] font-semibold text-gray-400">
                              Updated on {new Date(f.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <span className="text-sm text-gray-700 font-medium flex-1 break-words">
                            {f.notes || '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}


              <DetailRow label="Counselor Name" value={student.counselor_name} />
              <DetailRow label="Study Level" value={student.study_level} />
              <DetailRow
                label="Source Type"
                value={`${student.source_type === 'employee' ? 'Employee' : 'Social Media'}${student.source_name ? ` (${student.source_name})` : ''}`}
              />

              {/* Status Row */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-2.5">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider sm:w-52 shrink-0">Status</span>
                <div className="flex flex-wrap items-center gap-3">
                  {isEditingStatus ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={tempStatus}
                        onChange={(e) => setTempStatus(e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded-lg bg-white text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-semibold"
                        disabled={isUpdatingStatus}
                      >
                        {[
                          "Registered",
                          "Documents Collected",
                          "Send to Admin",
                          "Ready for application",
                          "Application Done",
                          "Conditional Offer",
                          "Unconditional offer",
                          "Tution Fee Done",
                          "Visa Ready",
                          "Visa Done",
                          "Service Charge Paid",
                          "Successfully Closed",
                          "Forcefully Stopped"
                        ].map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                      <Button
                        variant="action"
                        onClick={handleSaveStatus}
                        className="px-3 py-1 text-xs bg-green-500 hover:bg-green-600 flex items-center justify-center min-w-[50px] min-h-[30px]"
                        disabled={isUpdatingStatus}
                      >
                        {isUpdatingStatus ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                      </Button>
                      <button
                        onClick={() => setIsEditingStatus(false)}
                        className="px-3 py-1 text-xs border border-gray-300 hover:bg-gray-100 rounded-lg text-gray-700 font-bold transition-colors min-h-[30px]"
                        disabled={isUpdatingStatus}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-900 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-100">
                        {student.status || 'Registered'}
                      </span>
                      <Button
                        variant="action"
                        onClick={() => {
                          setTempStatus(student.status || 'Registered');
                          setStatusUpdateError('');
                          setIsEditingStatus(true);
                        }}
                        className="px-2.5 py-1 text-xs"
                      >
                        Update
                      </Button>
                    </div>
                  )}
                  {statusUpdateError && (
                    <span className="text-xs font-bold text-red-500 mt-1 sm:mt-0">{statusUpdateError}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* CV Document Card */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-purple-600 px-6 py-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">CV Document</h3>
            </div>
            <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
              <div className="flex-1">
                {student.cv_name ? (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-gray-900">{student.cv_name}</span>
                    <span className="text-xs text-gray-400 font-medium">Click View CV to download/display document</span>
                  </div>
                ) : (
                  <span className="text-sm font-semibold text-gray-500">No CV uploaded yet.</span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {student.cv_name && (
                  <Button
                    variant="action"
                    onClick={handleOpenCv}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>View CV</span>
                  </Button>
                )}
                <input
                  type="file"
                  id="cv-update-input"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={handleUpdateCv}
                />
                <Button
                  variant="action"
                  onClick={() => document.getElementById('cv-update-input')?.click()}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-gray-500 hover:bg-gray-600"
                  disabled={isUpdatingCv}
                >
                  {isUpdatingCv ? 'Updating...' : 'Update'}
                </Button>
              </div>
            </div>
          </div>

          {/* Financial Details Card */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-green-600 px-6 py-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Financial Information</h3>
            </div>
            <div className="px-6 py-2">
              <DetailRow label="File Opening Fee" value={`BDT ${parseFloat(String(student.file_opening_fee_bdt)).toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
            </div>
          </div>

          {/* Invoice Information Card */}
          {student.invoices && student.invoices.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-blue-600 uppercase tracking-wider">
                Invoice History — {student.invoices.length} total
              </h3>
              {student.invoices.map((inv) => (
                <div key={inv.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow transition-shadow">
                  <div className="bg-indigo-600 px-6 py-3 flex items-center justify-between">
                    <span className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                      Invoice ID: {inv.invoice_id}
                    </span>
                    <span className="text-xs text-white/85 font-semibold">
                      {new Date(inv.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm border-t border-gray-100">
                    <DetailRow label="Payer Name" value={inv.payer_name} />
                    <DetailRow label="Payer Phone" value={`${inv.payer_phone_country_code} ${inv.payer_phone_number}`} />
                    <DetailRow
                      label="Payment Method"
                      value={
                        inv.payment_detail
                          ? `${inv.payment_method?.toUpperCase()} (${inv.payment_detail})`
                          : inv.payment_method?.toUpperCase()
                      }
                    />
                    {inv.country?.name && (
                      <DetailRow label="Destination Country" value={inv.country.name} />
                    )}
                    <DetailRow label="Total Amount" value={`BDT ${parseFloat(String(inv.total_amount_bdt)).toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
                    <DetailRow
                      label={inv.comment && inv.comment.includes('Spend') ? 'Disbursement Amount' : 'Paid Amount'}
                      value={`BDT ${parseFloat(String(inv.paid_amount_bdt)).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                    />
                    <DetailRow label="Due Amount" value={`BDT ${parseFloat(String(inv.due_amount_bdt)).toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
                  </div>
                  <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      {pdfError[inv.id] && (
                        <span className="text-xs font-bold text-red-500">{pdfError[inv.id]}</span>
                      )}
                    </div>
                    <Button
                      variant="action"
                      onClick={() => handleOpenPdf(inv.id)}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold w-full sm:w-auto justify-center"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>View Invoice</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-center">
              <span className="text-sm font-semibold text-yellow-600">No invoices have been generated for this student yet.</span>
            </div>
          )}
        </div>
      </div>

      {/* Follow Up Notes Modal Popup */}
      {isFollowUpNotesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-6 flex flex-col gap-4 border border-gray-100 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">Follow Up Notes</h3>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Notes for Follow Up Date {tempFollowUpDate} *
              </label>
              <textarea
                value={tempFollowUpNote}
                onChange={(e) => setTempFollowUpNote(e.target.value)}
                className="w-full h-28 p-3 border border-gray-300 rounded-lg text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                placeholder="Enter notes describing the update..."
                required
                disabled={isUpdatingFollowUp}
              />
              {notesError && <span className="text-xs font-bold text-red-500 mt-1">{notesError}</span>}
            </div>
            <div className="flex justify-end gap-3 mt-2">
              <button
                onClick={() => {
                  setIsFollowUpNotesModalOpen(false);
                  setTempFollowUpNote('');
                  setNotesError('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-100 transition-colors"
                disabled={isUpdatingFollowUp}
              >
                Cancel
              </button>
              <Button
                variant="action"
                onClick={handleConfirmSaveFollowUp}
                className="px-6 py-2"
                disabled={isUpdatingFollowUp}
              >
                {isUpdatingFollowUp ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit'}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* General Modal Popup */}
      <Modal
        isOpen={modalOpen}
        title={modalTitle}
        message={modalMessage}
        onConfirm={() => setModalOpen(false)}
      />

    </div>
  );
}
