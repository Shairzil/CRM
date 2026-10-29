'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Upload, Eye, Check, X, History, Pencil, Link2, ExternalLink, Search, Trash2 } from 'lucide-react';
import api, { apiErrorMessage } from '@/lib/api';
import { hasRole, useCurrentUser } from '@/lib/auth';
import { Button } from '@/components/Button';
import { FormModal } from '@/components/FormModal';
import { PageShell, formatDate, formatDateTime, inputClass, labelClass } from '@/components/PageShell';
import { StatusBadge, statusLabel } from '@/components/StatusBadge';

// Keep in sync with the backend lists (entities/application.entity.ts, entities/student-document.entity.ts)
const APPLICATION_STATUSES = [
  'draft', 'documents_pending', 'submitted', 'conditional_offer', 'unconditional_offer', 'rejected',
  'deposit_paid', 'cas_coe_received', 'visa_applied', 'visa_granted', 'visa_refused', 'enrolled', 'withdrawn',
];
const DOCUMENT_TYPES = [
  'passport', 'photo', 'ssc_certificate', 'hsc_certificate', 'bachelor_certificate', 'master_certificate',
  'transcript', 'english_test', 'cv', 'sop', 'lor', 'bank_statement', 'sponsor_documents', 'offer_letter',
  'visa_documents', 'other',
];
const DOC_LABELS: Record<string, string> = {
  ssc_certificate: 'SSC / O-Level Certificate',
  hsc_certificate: 'HSC / A-Level Certificate',
  english_test: 'IELTS / English Test',
  cv: 'CV',
  sop: 'SOP',
  lor: 'LOR (Recommendation)',
};
const docLabel = (t: string) => DOC_LABELS[t] || statusLabel(t);
const LEVELS = ['Foundation', 'Diploma', 'Bachelor', 'Master', 'MRes', 'PhD'];

type Tab = 'applications' | 'documents' | 'accounts';

interface Student {
  id: number;
  student_id: string;
  name: string;
  phone_country_code: string;
  phone_number: string;
  email: string | null;
  counselor_name: string;
  status: string;
}

interface Application {
  id: number;
  university_name: string;
  course_name: string;
  course_level: string | null;
  intake: string | null;
  country_id: number | null;
  country_name: string | null;
  status: string;
  application_fee: number | null;
  application_fee_currency: string | null;
  tuition_fee: number | null;
  university_reference: string | null;
  submitted_at: string | null;
  decision_at: string | null;
  notes: string | null;
  assigned_to_user_id: number | null;
  assigned_to_name: string | null;
  updated_at: string;
}

interface Doc {
  id: number;
  document_type: string;
  title: string | null;
  status: string;
  request_note: string | null;
  due_date: string | null;
  requested_by: string | null;
  file_name: string | null;
  has_file: boolean;
  uploaded_by: string | null;
  uploaded_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
}

interface SystemRow {
  system: string;
  label: string;
  can_lookup: boolean;
  signup_url: string | null;
  account: null | {
    id: number;
    external_id: string;
    external_email: string | null;
    note: string | null;
    profile_url: string | null;
    linked_by: string | null;
    created_at: string;
  };
}

const emptyApp = {
  university_name: '',
  course_name: '',
  course_level: '',
  intake: '',
  country_id: '',
  application_fee: '',
  application_fee_currency: '',
  tuition_fee: '',
  university_reference: '',
  assigned_to_user_id: '',
  notes: '',
  status: 'draft',
};

export default function StudentCrmPage() {
  const params = useParams();
  const studentId = params?.id as string;
  const { user } = useCurrentUser();
  const canEdit = hasRole(user, 'counselor', 'accounts');

  const [tab, setTab] = useState<Tab>('applications');
  const [student, setStudent] = useState<Student | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [countries, setCountries] = useState<{ id: number; name: string; currency_code: string }[]>([]);
  const [users, setUsers] = useState<{ id: number; username: string; full_name: string | null }[]>([]);

  // applications
  const [apps, setApps] = useState<Application[]>([]);
  const [appModal, setAppModal] = useState<{ open: boolean; editId: number | null }>({ open: false, editId: null });
  const [appForm, setAppForm] = useState({ ...emptyApp });
  const [appSaving, setAppSaving] = useState(false);
  const [statusModal, setStatusModal] = useState<{ app: Application | null; status: string; note: string }>({ app: null, status: '', note: '' });
  const [historyFor, setHistoryFor] = useState<number | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [highlightApp, setHighlightApp] = useState<number | null>(null);

  // documents
  const [docs, setDocs] = useState<Doc[]>([]);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestTypes, setRequestTypes] = useState<string[]>([]);
  const [requestNote, setRequestNote] = useState('');
  const [requestDue, setRequestDue] = useState('');
  const [uploadOpen, setUploadOpen] = useState<{ open: boolean; docId: number | null }>({ open: false, docId: null });
  const [uploadType, setUploadType] = useState('passport');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [rejectFor, setRejectFor] = useState<Doc | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  // linked accounts
  const [systems, setSystems] = useState<SystemRow[]>([]);
  const [linkForm, setLinkForm] = useState<Record<string, { external_id: string; external_email: string }>>({});
  const [lookup, setLookup] = useState<any[] | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  // ── loaders ─────────────────────────────────────────────────────────────
  const loadApps = useCallback(async () => {
    const res = await api.get(`/students/${studentId}/applications`);
    setApps(res.data);
  }, [studentId]);

  const loadDocs = useCallback(async () => {
    const res = await api.get(`/students/${studentId}/documents`);
    setDocs(res.data);
  }, [studentId]);

  const loadSystems = useCallback(async () => {
    const res = await api.get(`/students/${studentId}/external-accounts`);
    setSystems(res.data);
  }, [studentId]);

  useEffect(() => {
    // read ?tab= and ?app= without useSearchParams (no Suspense boundary needed)
    const q = new URLSearchParams(window.location.search);
    const t = q.get('tab');
    if (t === 'documents' || t === 'accounts' || t === 'applications') setTab(t);
    const a = q.get('app');
    if (a) setHighlightApp(Number(a));

    api.get(`/students/${studentId}`).then((r) => setStudent(r.data)).catch((err) => setError(apiErrorMessage(err, 'Student not found.')));
    api.get('/countries').then((r) => setCountries(r.data)).catch(() => {});
    api.get('/users/assignable').then((r) => setUsers(r.data)).catch(() => {});
    loadApps().catch(() => {});
    loadDocs().catch(() => {});
    loadSystems().catch(() => {});
  }, [studentId, loadApps, loadDocs, loadSystems]);

  const flash = (msg: string) => {
    setNotice(msg);
    setError('');
    setTimeout(() => setNotice(''), 3500);
  };

  // ── applications ────────────────────────────────────────────────────────
  const openNewApp = () => {
    setAppForm({ ...emptyApp, assigned_to_user_id: user ? String(user.id) : '' });
    setAppModal({ open: true, editId: null });
  };

  const openEditApp = (a: Application) => {
    setAppForm({
      university_name: a.university_name,
      course_name: a.course_name,
      course_level: a.course_level || '',
      intake: a.intake || '',
      country_id: a.country_id ? String(a.country_id) : '',
      application_fee: a.application_fee != null ? String(a.application_fee) : '',
      application_fee_currency: a.application_fee_currency || '',
      tuition_fee: a.tuition_fee != null ? String(a.tuition_fee) : '',
      university_reference: a.university_reference || '',
      assigned_to_user_id: a.assigned_to_user_id ? String(a.assigned_to_user_id) : '',
      notes: a.notes || '',
      status: a.status,
    });
    setAppModal({ open: true, editId: a.id });
  };

  const saveApp = async () => {
    if (!appForm.university_name.trim() || !appForm.course_name.trim()) {
      setError('University and course are required.');
      return;
    }
    setAppSaving(true);
    const body: any = {
      university_name: appForm.university_name.trim(),
      course_name: appForm.course_name.trim(),
      course_level: appForm.course_level || null,
      intake: appForm.intake.trim() || null,
      country_id: appForm.country_id ? Number(appForm.country_id) : null,
      application_fee: appForm.application_fee ? Number(appForm.application_fee) : null,
      application_fee_currency: appForm.application_fee_currency.trim() || null,
      tuition_fee: appForm.tuition_fee ? Number(appForm.tuition_fee) : null,
      university_reference: appForm.university_reference.trim() || null,
      assigned_to_user_id: appForm.assigned_to_user_id ? Number(appForm.assigned_to_user_id) : null,
      notes: appForm.notes.trim() || null,
    };
    try {
      if (appModal.editId) {
        await api.patch(`/applications/${appModal.editId}`, body);
      } else {
        // create: null values are simply left out
        const createBody: any = { status: appForm.status };
        for (const [k, v] of Object.entries(body)) if (v !== null && v !== '') createBody[k] = v;
        await api.post(`/students/${studentId}/applications`, createBody);
      }
      setAppModal({ open: false, editId: null });
      await loadApps();
      flash('Application saved.');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save the application.'));
    } finally {
      setAppSaving(false);
    }
  };

  const saveStatus = async () => {
    if (!statusModal.app || !statusModal.status) return;
    try {
      await api.post(`/applications/${statusModal.app.id}/status`, {
        status: statusModal.status,
        note: statusModal.note.trim() || undefined,
      });
      const id = statusModal.app.id;
      setStatusModal({ app: null, status: '', note: '' });
      await loadApps();
      if (historyFor === id) showHistory(id);
      flash('Status updated.');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not change the status.'));
    }
  };

  const showHistory = async (appId: number) => {
    if (historyFor === appId) {
      setHistoryFor(null);
      return;
    }
    try {
      const res = await api.get(`/applications/${appId}`);
      setHistory(res.data.history);
      setHistoryFor(appId);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const deleteApp = async (appId: number) => {
    if (!window.confirm('Delete this application and its history?')) return;
    try {
      await api.delete(`/applications/${appId}`);
      await loadApps();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  // ── documents ───────────────────────────────────────────────────────────
  const submitRequest = async () => {
    if (requestTypes.length === 0) return;
    try {
      await api.post(`/students/${studentId}/documents/request`, {
        document_types: requestTypes,
        request_note: requestNote.trim() || undefined,
        due_date: requestDue || undefined,
      });
      setRequestOpen(false);
      setRequestTypes([]);
      setRequestNote('');
      setRequestDue('');
      await loadDocs();
      flash('Documents requested.');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not request documents.'));
    }
  };

  const submitUpload = async () => {
    if (!uploadFile) return;
    if (uploadFile.size > 10 * 1024 * 1024) {
      setError('File is larger than 10 MB.');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', uploadFile);
      if (uploadOpen.docId) {
        await api.post(`/documents/${uploadOpen.docId}/file`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        fd.append('document_type', uploadType);
        if (uploadTitle.trim()) fd.append('title', uploadTitle.trim());
        await api.post(`/students/${studentId}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setUploadOpen({ open: false, docId: null });
      setUploadFile(null);
      setUploadTitle('');
      await loadDocs();
      flash('Document uploaded.');
    } catch (err) {
      setError(apiErrorMessage(err, 'Upload failed.'));
    } finally {
      setUploading(false);
    }
  };

  const viewDoc = async (doc: Doc) => {
    try {
      const res = await api.get(`/documents/${doc.id}/file`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: res.headers['content-type'] }));
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not open the file.'));
    }
  };

  const review = async (doc: Doc, status: 'approved' | 'rejected', note?: string) => {
    try {
      await api.patch(`/documents/${doc.id}/review`, { status, review_note: note || undefined });
      setRejectFor(null);
      setRejectNote('');
      await loadDocs();
      flash(status === 'approved' ? 'Document approved.' : 'Document rejected.');
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const deleteDoc = async (doc: Doc) => {
    if (!window.confirm('Delete this document and its file?')) return;
    try {
      await api.delete(`/documents/${doc.id}`);
      await loadDocs();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  // ── linked accounts ─────────────────────────────────────────────────────
  const link = async (system: string, prefill?: { external_id: string; external_email?: string | null }) => {
    const f = prefill || linkForm[system];
    if (!f?.external_id?.trim()) {
      setError('Enter the account ID in the other system.');
      return;
    }
    try {
      const res = await api.post(`/students/${studentId}/external-accounts`, {
        system,
        external_id: f.external_id.trim(),
        external_email: f.external_email?.trim() || undefined,
      });
      setSystems(res.data);
      flash('Account linked.');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not link the account.'));
    }
  };

  const unlink = async (accountId: number) => {
    if (!window.confirm('Remove this link?')) return;
    try {
      const res = await api.delete(`/students/${studentId}/external-accounts/${accountId}`);
      setSystems(res.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const runLookup = async () => {
    setLookingUp(true);
    try {
      const res = await api.post(`/students/${studentId}/external-accounts/lookup`);
      setLookup(res.data);
    } catch (err) {
      setError(apiErrorMessage(err, 'Lookup failed.'));
    } finally {
      setLookingUp(false);
    }
  };

  // ── render ──────────────────────────────────────────────────────────────
  const tabBtn = (value: Tab, label: string, count?: number) => (
    <button
      type="button"
      onClick={() => setTab(value)}
      className={`rounded-lg px-4 py-2 text-sm font-bold cursor-pointer ${tab === value ? 'bg-blue-600 text-white shadow' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'}`}
    >
      {label}
      {count !== undefined ? ` (${count})` : ''}
    </button>
  );

  const userOpts = users.map((u) => <option key={u.id} value={String(u.id)}>{u.full_name || u.username}</option>);

  return (
    <PageShell title="Applications & Documents" backTo={`/students/${studentId}/details`}>
      {student && (
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 px-6 py-4 flex flex-wrap items-center gap-x-8 gap-y-2">
          <div>
            <div className="text-xs font-bold uppercase text-gray-400">Student</div>
            <div className="text-lg font-extrabold text-gray-900">{student.name}</div>
          </div>
          <div>
            <div className="text-xs font-bold uppercase text-gray-400">Student ID</div>
            <div className="font-mono text-sm font-bold text-blue-700">{student.student_id}</div>
          </div>
          <div>
            <div className="text-xs font-bold uppercase text-gray-400">Phone</div>
            <div className="text-sm font-semibold text-gray-700">{student.phone_country_code} {student.phone_number}</div>
          </div>
          <div>
            <div className="text-xs font-bold uppercase text-gray-400">Counselor</div>
            <div className="text-sm font-semibold text-gray-700">{student.counselor_name}</div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm font-bold text-red-600 flex justify-between">
          <span>{error}</span>
          <button type="button" className="cursor-pointer" onClick={() => setError('')}><X className="h-4 w-4" /></button>
        </div>
      )}
      {notice && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm font-bold text-green-700">{notice}</div>}

      <div className="flex flex-wrap gap-2">
        {tabBtn('applications', 'Applications', apps.length)}
        {tabBtn('documents', 'Documents', docs.length)}
        {tabBtn('accounts', 'Linked accounts')}
      </div>

      {/* ── Applications tab ── */}
      {tab === 'applications' && (
        <div className="space-y-4">
          {canEdit && (
            <div className="flex justify-end">
              <Button variant="action" onClick={openNewApp} className="flex items-center gap-2 px-4 py-2 text-sm">
                <Plus className="h-4 w-4" /> Add application
              </Button>
            </div>
          )}
          {apps.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow p-8 text-center text-gray-400">No applications yet.</div>
          )}
          {apps.map((a) => (
            <div key={a.id} className={`bg-white rounded-2xl border shadow-md overflow-hidden ${highlightApp === a.id ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-100'}`}>
              <div className="px-6 py-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-extrabold text-gray-900">{a.university_name}</div>
                  <div className="text-sm font-semibold text-gray-600">
                    {a.course_name}
                    {a.course_level ? ` · ${a.course_level}` : ''}
                    {a.intake ? ` · ${a.intake}` : ''}
                    {a.country_name ? ` · ${a.country_name}` : ''}
                  </div>
                  <div className="mt-1 text-xs text-gray-500 space-x-3">
                    {a.application_fee != null && <span>App fee: {a.application_fee} {a.application_fee_currency || ''}</span>}
                    {a.tuition_fee != null && <span>Tuition: {a.tuition_fee}</span>}
                    {a.university_reference && <span>Ref: {a.university_reference}</span>}
                    {a.submitted_at && <span>Submitted: {formatDate(a.submitted_at)}</span>}
                    {a.decision_at && <span>Decision: {formatDate(a.decision_at)}</span>}
                    {a.assigned_to_name && <span>Handled by: {a.assigned_to_name}</span>}
                  </div>
                  {a.notes && <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{a.notes}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={a.status} />
                  <div className="flex flex-wrap gap-2">
                    {canEdit && (
                      <Button variant="dashboard" onClick={() => setStatusModal({ app: a, status: a.status, note: '' })} className="px-3 py-1.5 text-xs">
                        Change status
                      </Button>
                    )}
                    {canEdit && (
                      <Button variant="dashboard" onClick={() => openEditApp(a)} className="px-3 py-1.5 text-xs flex items-center gap-1">
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                    )}
                    <Button variant="dashboard" onClick={() => showHistory(a.id)} className="px-3 py-1.5 text-xs flex items-center gap-1 bg-gray-500 hover:bg-gray-600">
                      <History className="h-3.5 w-3.5" /> History
                    </Button>
                    {hasRole(user, 'admin') && (
                      <Button variant="back" onClick={() => deleteApp(a.id)} className="px-3 py-1.5 text-xs">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              {historyFor === a.id && (
                <div className="border-t border-gray-100 bg-gray-50 px-6 py-3 space-y-2">
                  {history.map((h) => (
                    <div key={h.id} className="text-sm">
                      <span className="text-gray-500">{formatDateTime(h.created_at)}</span>{' '}
                      <span className="font-semibold text-gray-800">
                        {h.from_status ? `${statusLabel(h.from_status)} → ` : ''}
                        {statusLabel(h.to_status)}
                      </span>
                      {h.changed_by && <span className="text-gray-500"> · {h.changed_by}</span>}
                      {h.note && <div className="text-gray-600 pl-4">“{h.note}”</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Documents tab ── */}
      {tab === 'documents' && (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="dashboard" onClick={() => setRequestOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm">
              <Plus className="h-4 w-4" /> Request documents
            </Button>
            <Button variant="action" onClick={() => { setUploadFile(null); setUploadOpen({ open: true, docId: null }); }} className="flex items-center gap-2 px-4 py-2 text-sm">
              <Upload className="h-4 w-4" /> Upload document
            </Button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider">Document</th>
                  <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider">Details</th>
                  <th className="text-right px-4 py-3 font-bold text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {docs.length === 0 ? (
                  <tr><td colSpan={4} className="px-5 py-10 text-center text-gray-400">No documents yet.</td></tr>
                ) : (
                  docs.map((d) => (
                    <tr key={d.id} className="border-t border-gray-100 align-top">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{d.title || docLabel(d.document_type)}</div>
                        {d.file_name && <div className="text-xs text-gray-500">{d.file_name}</div>}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                      <td className="px-4 py-3 text-xs text-gray-600 space-y-0.5">
                        {d.request_note && <div>Request: {d.request_note}</div>}
                        {d.due_date && <div>Due: {formatDate(d.due_date)}</div>}
                        {d.uploaded_at && <div>Uploaded {formatDateTime(d.uploaded_at)}{d.uploaded_by ? ` by ${d.uploaded_by}` : ''}</div>}
                        {d.reviewed_at && <div>Reviewed {formatDateTime(d.reviewed_at)}{d.reviewed_by ? ` by ${d.reviewed_by}` : ''}</div>}
                        {d.review_note && <div className={d.status === 'rejected' ? 'font-semibold text-red-600' : ''}>Note: {d.review_note}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          {d.has_file && (
                            <Button variant="action" onClick={() => viewDoc(d)} className="px-3 py-1.5 text-xs flex items-center gap-1">
                              <Eye className="h-3.5 w-3.5" /> View
                            </Button>
                          )}
                          <Button
                            variant="dashboard"
                            onClick={() => { setUploadFile(null); setUploadOpen({ open: true, docId: d.id }); }}
                            className="px-3 py-1.5 text-xs flex items-center gap-1"
                          >
                            <Upload className="h-3.5 w-3.5" /> {d.has_file ? 'Replace' : 'Upload'}
                          </Button>
                          {canEdit && d.status === 'uploaded' && (
                            <>
                              <Button variant="action" onClick={() => review(d, 'approved')} className="px-3 py-1.5 text-xs flex items-center gap-1">
                                <Check className="h-3.5 w-3.5" /> Approve
                              </Button>
                              <Button variant="back" onClick={() => { setRejectFor(d); setRejectNote(''); }} className="px-3 py-1.5 text-xs flex items-center gap-1">
                                <X className="h-3.5 w-3.5" /> Reject
                              </Button>
                            </>
                          )}
                          {hasRole(user, 'admin') && (
                            <Button variant="back" onClick={() => deleteDoc(d)} className="px-3 py-1.5 text-xs">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs font-semibold text-gray-500">
            The CV uploaded on the student form is still shown on the Student Details page. Files here are stored on the
            server disk (not in the database). Max 10 MB — PDF, JPG, PNG, WEBP, DOC, DOCX.
          </p>
        </div>
      )}

      {/* ── Linked accounts tab ── */}
      {tab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            {systems.some((s) => s.can_lookup) && (
              <Button variant="dashboard" disabled={lookingUp} onClick={runLookup} className="flex items-center gap-2 px-4 py-2 text-sm">
                <Search className="h-4 w-4" /> {lookingUp ? 'Checking...' : 'Check other systems'}
              </Button>
            )}
          </div>
          {systems.map((s) => {
            const found = lookup?.find((l) => l.system === s.system);
            return (
              <div key={s.system} className="bg-white rounded-2xl border border-gray-100 shadow-md p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-extrabold text-gray-900">{s.label}</h3>
                  {s.account ? (
                    <span className="rounded-full bg-green-100 px-3 py-0.5 text-xs font-bold text-green-700">Linked</span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-3 py-0.5 text-xs font-bold text-gray-600">Not linked</span>
                  )}
                </div>

                {s.account ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <div className="space-y-0.5">
                      <div>Account ID: <span className="font-mono font-bold">{s.account.external_id}</span></div>
                      {s.account.external_email && <div>Email: {s.account.external_email}</div>}
                      <div className="text-xs text-gray-500">
                        Linked {formatDate(s.account.created_at)}{s.account.linked_by ? ` by ${s.account.linked_by}` : ''}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {s.account.profile_url && (
                        <a href={s.account.profile_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700">
                          <ExternalLink className="h-3.5 w-3.5" /> Open
                        </a>
                      )}
                      {canEdit && (
                        <Button variant="back" onClick={() => unlink(s.account!.id)} className="px-3 py-1.5 text-xs">Unlink</Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {found && found.checked && (
                      <div className={`rounded-lg px-4 py-3 text-sm ${found.found ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>
                        {found.found ? (
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span>
                              Found an account: <b>{found.external_id}</b> {found.external_email ? `(${found.external_email})` : ''}
                            </span>
                            {canEdit && (
                              <Button variant="action" onClick={() => link(s.system, { external_id: found.external_id, external_email: found.external_email })} className="px-3 py-1.5 text-xs">
                                Link this account
                              </Button>
                            )}
                          </div>
                        ) : (
                          <span>No account found with this phone/email — create one in {s.label}, then link it here.</span>
                        )}
                      </div>
                    )}
                    {found && !found.checked && found.reason !== 'No lookup URL configured' && (
                      <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">Could not check {s.label}: {found.reason}</div>
                    )}
                    {canEdit && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                        <div className="flex flex-col gap-1">
                          <label className={labelClass}>Account ID in {s.label}</label>
                          <input
                            className={inputClass}
                            value={linkForm[s.system]?.external_id || ''}
                            onChange={(e) => setLinkForm({ ...linkForm, [s.system]: { external_id: e.target.value, external_email: linkForm[s.system]?.external_email || '' } })}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className={labelClass}>Email used there (optional)</label>
                          <input
                            className={inputClass}
                            type="email"
                            value={linkForm[s.system]?.external_email || ''}
                            onChange={(e) => setLinkForm({ ...linkForm, [s.system]: { external_id: linkForm[s.system]?.external_id || '', external_email: e.target.value } })}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button variant="action" onClick={() => link(s.system)} className="flex items-center gap-1 px-4 py-2 text-sm">
                            <Link2 className="h-4 w-4" /> Link
                          </Button>
                          {s.signup_url && (
                            <a href={s.signup_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
                              <ExternalLink className="h-4 w-4" /> Create
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
          <p className="text-xs font-semibold text-gray-500">
            The list of systems comes from <code>EXTERNAL_SYSTEMS</code> in backend/.env. Automatic checking needs a lookup
            URL from that system (see README).
          </p>
        </div>
      )}

      {/* ── Modals ── */}
      <FormModal isOpen={appModal.open} title={appModal.editId ? 'Edit application' : 'Add application'} onClose={() => setAppModal({ open: false, editId: null })} wide>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className={labelClass}>University *</label>
            <input className={inputClass} value={appForm.university_name} onChange={(e) => setAppForm({ ...appForm, university_name: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className={labelClass}>Course *</label>
            <input className={inputClass} value={appForm.course_name} onChange={(e) => setAppForm({ ...appForm, course_name: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Level</label>
            <select className={inputClass} value={appForm.course_level} onChange={(e) => setAppForm({ ...appForm, course_level: e.target.value })}>
              <option value="">—</option>
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Intake</label>
            <input className={inputClass} placeholder="e.g. September 2027" value={appForm.intake} onChange={(e) => setAppForm({ ...appForm, intake: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Country</label>
            <select
              className={inputClass}
              value={appForm.country_id}
              onChange={(e) => {
                const c = countries.find((x) => String(x.id) === e.target.value);
                setAppForm({ ...appForm, country_id: e.target.value, application_fee_currency: appForm.application_fee_currency || c?.currency_code || '' });
              }}
            >
              <option value="">—</option>
              {countries.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Handled by</label>
            <select className={inputClass} value={appForm.assigned_to_user_id} onChange={(e) => setAppForm({ ...appForm, assigned_to_user_id: e.target.value })}>
              <option value="">—</option>
              {userOpts}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Application fee</label>
            <div className="flex gap-2">
              <input className={inputClass} type="number" min="0" value={appForm.application_fee} onChange={(e) => setAppForm({ ...appForm, application_fee: e.target.value })} />
              <input className={`${inputClass} w-24`} placeholder="GBP" value={appForm.application_fee_currency} onChange={(e) => setAppForm({ ...appForm, application_fee_currency: e.target.value.toUpperCase() })} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Tuition fee (per year)</label>
            <input className={inputClass} type="number" min="0" value={appForm.tuition_fee} onChange={(e) => setAppForm({ ...appForm, tuition_fee: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>University reference / app no.</label>
            <input className={inputClass} value={appForm.university_reference} onChange={(e) => setAppForm({ ...appForm, university_reference: e.target.value })} />
          </div>
          {!appModal.editId && (
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Starting status</label>
              <select className={inputClass} value={appForm.status} onChange={(e) => setAppForm({ ...appForm, status: e.target.value })}>
                {APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className={labelClass}>Notes</label>
            <textarea className={inputClass} rows={3} value={appForm.notes} onChange={(e) => setAppForm({ ...appForm, notes: e.target.value })} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="back" onClick={() => setAppModal({ open: false, editId: null })}>Cancel</Button>
          <Button variant="action" disabled={appSaving} onClick={saveApp}>{appSaving ? 'Saving...' : 'Save'}</Button>
        </div>
      </FormModal>

      <FormModal isOpen={!!statusModal.app} title="Change application status" onClose={() => setStatusModal({ app: null, status: '', note: '' })}>
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            {statusModal.app?.university_name} — now <b>{statusModal.app ? statusLabel(statusModal.app.status) : ''}</b>
          </div>
          <select className={inputClass} value={statusModal.status} onChange={(e) => setStatusModal({ ...statusModal, status: e.target.value })}>
            {APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
          </select>
          <textarea className={inputClass} rows={3} placeholder="Note (optional), e.g. offer conditions" value={statusModal.note} onChange={(e) => setStatusModal({ ...statusModal, note: e.target.value })} />
          <div className="flex justify-end gap-3">
            <Button variant="back" onClick={() => setStatusModal({ app: null, status: '', note: '' })}>Cancel</Button>
            <Button variant="action" disabled={!statusModal.app || statusModal.status === statusModal.app.status} onClick={saveStatus}>Update</Button>
          </div>
        </div>
      </FormModal>

      <FormModal isOpen={requestOpen} title="Request documents from the student" onClose={() => setRequestOpen(false)} wide>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DOCUMENT_TYPES.map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requestTypes.includes(t)}
                  onChange={(e) => setRequestTypes(e.target.checked ? [...requestTypes, t] : requestTypes.filter((x) => x !== t))}
                />
                {docLabel(t)}
              </label>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className={labelClass}>Note for the student</label>
              <input className={inputClass} value={requestNote} onChange={(e) => setRequestNote(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Due date</label>
              <input className={inputClass} type="date" value={requestDue} onChange={(e) => setRequestDue(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="back" onClick={() => setRequestOpen(false)}>Cancel</Button>
            <Button variant="action" disabled={requestTypes.length === 0} onClick={submitRequest}>Request {requestTypes.length || ''}</Button>
          </div>
        </div>
      </FormModal>

      <FormModal isOpen={uploadOpen.open} title={uploadOpen.docId ? 'Upload file' : 'Upload document'} onClose={() => setUploadOpen({ open: false, docId: null })}>
        <div className="space-y-4">
          {!uploadOpen.docId && (
            <>
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Document type</label>
                <select className={inputClass} value={uploadType} onChange={(e) => setUploadType(e.target.value)}>
                  {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{docLabel(t)}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Title (optional)</label>
                <input className={inputClass} value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} />
              </div>
            </>
          )}
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            className="text-sm"
          />
          <div className="flex justify-end gap-3">
            <Button variant="back" onClick={() => setUploadOpen({ open: false, docId: null })}>Cancel</Button>
            <Button variant="action" disabled={!uploadFile || uploading} onClick={submitUpload}>{uploading ? 'Uploading...' : 'Upload'}</Button>
          </div>
        </div>
      </FormModal>

      <FormModal isOpen={!!rejectFor} title="Reject document" onClose={() => setRejectFor(null)}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Tell the student what to fix (required).</p>
          <textarea className={inputClass} rows={3} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} />
          <div className="flex justify-end gap-3">
            <Button variant="back" onClick={() => setRejectFor(null)}>Cancel</Button>
            <Button variant="action" disabled={!rejectNote.trim()} onClick={() => rejectFor && review(rejectFor, 'rejected', rejectNote.trim())}>Reject</Button>
          </div>
        </div>
      </FormModal>
    </PageShell>
  );
}
