'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Upload, RefreshCw, Search, Users } from 'lucide-react';
import api, { apiErrorMessage } from '@/lib/api';
import { hasRole, useCurrentUser } from '@/lib/auth';
import { Button } from '@/components/Button';
import { FormModal } from '@/components/FormModal';
import { PageShell, formatDate, inputClass, labelClass } from '@/components/PageShell';
import { StatusBadge, statusLabel } from '@/components/StatusBadge';

interface Lead {
  id: number;
  full_name: string;
  phone_country_code: string;
  phone_number: string | null;
  email: string | null;
  source_channel: string;
  source_label: string;
  platform: string | null;
  campaign_name: string | null;
  status: string;
  assigned_to_name: string | null;
  next_follow_up_date: string | null;
  created_at: string;
}

interface Options {
  statuses: string[];
  sources: { value: string; label: string }[];
  meta: { webhook_ready: boolean; has_page_token: boolean; form_ids: string[] };
}

interface Stats {
  total: number;
  by_status: Record<string, number>;
  by_source: { source_channel: string; label: string; total: number; converted: number }[];
  by_campaign: { campaign_name: string; total: number; converted: number }[];
  follow_ups: { overdue: number; due_today: number };
}

interface AssignableUser {
  id: number;
  username: string;
  full_name: string | null;
  role: string;
}

interface ImportResult {
  total_rows?: number;
  created?: number;
  duplicates?: number;
  errors?: { row: number; message: string }[];
  error?: string;
}

const PAGE_SIZE = 50;

const emptyLead = {
  full_name: '',
  phone_country_code: '+880',
  phone_number: '',
  email: '',
  source_channel: 'calling_team',
  source_detail: '',
  campaign_name: '',
  preferred_country: '',
  preferred_course_level: '',
  notes: '',
  assigned_to_user_id: '',
  next_follow_up_date: '',
};

function isPast(date: string | null) {
  if (!date) return false;
  return date < new Date().toISOString().substring(0, 10);
}

export default function LeadsPage() {
  const router = useRouter();
  const { user } = useCurrentUser();

  const [options, setOptions] = useState<Options | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // filters
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState('');
  const [source, setSource] = useState('');
  const [assigned, setAssigned] = useState('');
  const [followUp, setFollowUp] = useState('');

  const [selected, setSelected] = useState<number[]>([]);

  // modals
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyLead });
  const [formError, setFormError] = useState('');
  const [duplicateId, setDuplicateId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importSource, setImportSource] = useState('meta_ads');
  const [importAssign, setImportAssign] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);

  const [assignOpen, setAssignOpen] = useState(false);
  const [bulkAssignTo, setBulkAssignTo] = useState('');

  const [syncMsg, setSyncMsg] = useState('');

  const loadLeads = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');
    try {
      const res = await api.get('/leads', {
        params: {
          search: search || undefined,
          status: status || undefined,
          source_channel: source || undefined,
          assigned: assigned || undefined,
          follow_up: followUp || undefined,
          page,
          page_size: PAGE_SIZE,
        },
      });
      setLeads(res.data.items);
      setTotal(res.data.total);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to load leads.'));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [search, status, source, assigned, followUp, page]);

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get('/leads/stats');
      setStats(res.data);
    } catch {
      /* stats are optional */
    }
  }, []);

  useEffect(() => {
    api.get('/leads/options').then((res) => setOptions(res.data)).catch(() => {});
    api.get('/users/assignable').then((res) => setUsers(res.data)).catch(() => {});
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadLeads();
    setSelected([]);
  }, [loadLeads]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadLeads(false);
        void loadStats();
      }
    }, 30_000);
    return () => window.clearInterval(intervalId);
  }, [loadLeads, loadStats]);

  const refreshAll = () => {
    loadLeads();
    loadStats();
  };

  const userName = (u: AssignableUser) => u.full_name || u.username;

  // ── Add lead ────────────────────────────────────────────────────────────
  const submitLead = async (allowDuplicate = false) => {
    setFormError('');
    setDuplicateId(null);
    if (!form.full_name.trim()) return setFormError('Name is required.');
    if (!form.phone_number && !form.email) return setFormError('Give a phone number or an email.');
    setSaving(true);
    try {
      const payload: any = {
        full_name: form.full_name.trim(),
        phone_country_code: form.phone_country_code,
        phone_number: form.phone_number || undefined,
        email: form.email.trim() || undefined,
        source_channel: form.source_channel,
        source_detail: form.source_detail.trim() || undefined,
        campaign_name: form.campaign_name.trim() || undefined,
        preferred_country: form.preferred_country.trim() || undefined,
        preferred_course_level: form.preferred_course_level || undefined,
        notes: form.notes.trim() || undefined,
        assigned_to_user_id: form.assigned_to_user_id ? Number(form.assigned_to_user_id) : undefined,
        next_follow_up_date: form.next_follow_up_date || undefined,
        allow_duplicate: allowDuplicate || undefined,
      };
      const res = await api.post('/leads', payload);
      setAddOpen(false);
      setForm({ ...emptyLead });
      refreshAll();
      router.push(`/leads/${res.data.id}`);
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setDuplicateId(err.response.data?.existing_lead_id ?? null);
      }
      setFormError(apiErrorMessage(err, 'Could not save the lead.'));
    } finally {
      setSaving(false);
    }
  };

  // ── Import ──────────────────────────────────────────────────────────────
  const submitImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      const res = await api.post('/leads/import', fd, {
        params: { source_channel: importSource, assign_to: importAssign || undefined },
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(res.data);
      refreshAll();
    } catch (err) {
      setImportResult({ error: apiErrorMessage(err, 'Import failed.') });
    } finally {
      setImporting(false);
    }
  };

  // ── Bulk assign ─────────────────────────────────────────────────────────
  const submitBulkAssign = async () => {
    try {
      await api.post('/leads/bulk-assign', {
        ids: selected,
        assigned_to_user_id: bulkAssignTo ? Number(bulkAssignTo) : null,
      });
      setAssignOpen(false);
      setSelected([]);
      loadLeads();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not assign leads.'));
    }
  };

  // ── Meta sync ───────────────────────────────────────────────────────────
  const syncMeta = async () => {
    setSyncMsg('Syncing from Meta...');
    try {
      const res = await api.post('/leads/meta/sync');
      const created = res.data.reduce((s: number, r: any) => s + (r.created || 0), 0);
      const errors = res.data.filter((r: any) => r.error).map((r: any) => `${r.form_id}: ${r.error}`);
      setSyncMsg(`${created} new lead(s) imported.${errors.length ? ' Errors: ' + errors.join('; ') : ''}`);
      refreshAll();
    } catch (err) {
      setSyncMsg(apiErrorMessage(err, 'Meta sync failed.'));
    }
  };

  const toggleAll = () => {
    setSelected(selected.length === leads.length ? [] : leads.map((l) => l.id));
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canSyncMeta = hasRole(user, 'admin') && options?.meta?.has_page_token && (options?.meta?.form_ids?.length ?? 0) > 0;

  const statCards = stats
    ? [
        { label: 'All leads', value: stats.total, onClick: () => { setStatus(''); setFollowUp(''); setPage(1); } },
        { label: 'New', value: stats.by_status.new || 0, onClick: () => { setStatus('new'); setFollowUp(''); setPage(1); } },
        { label: 'Follow-up today', value: stats.follow_ups.due_today, onClick: () => { setFollowUp('today'); setStatus(''); setPage(1); } },
        { label: 'Overdue follow-ups', value: stats.follow_ups.overdue, alert: stats.follow_ups.overdue > 0, onClick: () => { setFollowUp('overdue'); setStatus(''); setPage(1); } },
        { label: 'Converted', value: stats.by_status.converted || 0, onClick: () => { setStatus('converted'); setFollowUp(''); setPage(1); } },
      ]
    : [];

  return (
    <PageShell
      title="Leads"
      actions={
        <>
          {canSyncMeta && (
            <Button variant="dashboard" onClick={syncMeta} className="flex items-center gap-2 px-4 py-2 text-sm">
              <RefreshCw className="h-4 w-4" /> Sync from Meta
            </Button>
          )}
          <Button variant="dashboard" onClick={() => { setImportResult(null); setImportFile(null); setImportOpen(true); }} className="flex items-center gap-2 px-4 py-2 text-sm">
            <Upload className="h-4 w-4" /> Import leads
          </Button>
          <Button variant="action" onClick={() => { setForm({ ...emptyLead }); setFormError(''); setDuplicateId(null); setAddOpen(true); }} className="flex items-center gap-2 px-4 py-2 text-sm">
            <Plus className="h-4 w-4" /> Add Lead
          </Button>
        </>
      }
    >
      {syncMsg && <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm font-semibold text-blue-700">{syncMsg}</div>}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {statCards.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={c.onClick}
              className="bg-white rounded-2xl border border-gray-100 shadow-md p-4 text-left cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <div className="text-xs font-bold uppercase tracking-wider text-gray-400">{c.label}</div>
              <div className={`text-3xl font-extrabold ${c.alert ? 'text-red-600' : 'text-gray-900'}`}>{c.value}</div>
            </button>
          ))}
        </div>
      )}

      {/* Filters + table */}
      <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <form
            className="md:col-span-2 flex gap-2"
            onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(searchInput.trim()); }}
          >
            <input className={inputClass} placeholder="Search name, phone, email, campaign" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
            <Button type="submit" variant="action" className="px-3 py-2"><Search className="h-4 w-4" /></Button>
          </form>
          <select className={inputClass} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            {options?.statuses.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
          </select>
          <select className={inputClass} value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }}>
            <option value="">All sources</option>
            {options?.sources.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select className={inputClass} value={assigned} onChange={(e) => { setAssigned(e.target.value); setPage(1); }}>
            <option value="">Everyone&apos;s leads</option>
            <option value="me">My leads</option>
            <option value="unassigned">Unassigned</option>
            {users.map((u) => <option key={u.id} value={String(u.id)}>{userName(u)}</option>)}
          </select>
          <select className={inputClass} value={followUp} onChange={(e) => { setFollowUp(e.target.value); setPage(1); }}>
            <option value="">Any follow-up</option>
            <option value="today">Follow-up today</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        {selected.length > 0 && (
          <div className="flex items-center gap-3 rounded-lg bg-blue-50 px-4 py-2">
            <span className="text-sm font-bold text-blue-700">{selected.length} selected</span>
            <Button variant="dashboard" onClick={() => { setBulkAssignTo(''); setAssignOpen(true); }} className="flex items-center gap-2 px-3 py-1.5 text-xs">
              <Users className="h-4 w-4" /> Assign
            </Button>
          </div>
        )}

        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm font-bold text-red-600">{error}</div>}

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="px-3 py-3 w-8">
                  <input type="checkbox" checked={leads.length > 0 && selected.length === leads.length} onChange={toggleAll} aria-label="Select all" />
                </th>
                <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider">Phone</th>
                <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider">Source / Campaign</th>
                <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider">Assigned</th>
                <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider">Follow-up</th>
                <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider">Added</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-gray-400">Loading...</td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-gray-400">No leads found.</td></tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="border-t border-gray-100 hover:bg-blue-50/40 cursor-pointer" onClick={() => router.push(`/leads/${lead.id}`)}>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.includes(lead.id)}
                        onChange={(e) => setSelected(e.target.checked ? [...selected, lead.id] : selected.filter((id) => id !== lead.id))}
                        aria-label={`Select ${lead.full_name}`}
                      />
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{lead.full_name}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {lead.phone_number ? `${lead.phone_country_code} ${lead.phone_number}` : lead.email || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-800">{lead.source_label}</div>
                          {lead.platform && <div className="text-xs text-gray-500 capitalize">{lead.platform}</div>}
                          {lead.campaign_name && <div className="text-xs text-gray-500 truncate max-w-[220px]">{lead.campaign_name}</div>}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                    <td className="px-4 py-3 text-gray-700">{lead.assigned_to_name || <span className="text-gray-400">—</span>}</td>
                    <td className={`px-4 py-3 whitespace-nowrap ${isPast(lead.next_follow_up_date) && !['converted', 'lost', 'not_interested'].includes(lead.status) ? 'blink-alert' : 'text-gray-700'}`}>
                      {formatDate(lead.next_follow_up_date)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(lead.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-gray-500">{total} lead(s)</span>
          <div className="flex items-center gap-2">
            <Button variant="dashboard" disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1.5 text-xs disabled:opacity-40">Prev</Button>
            <span className="font-semibold text-gray-600">Page {page} / {totalPages}</span>
            <Button variant="dashboard" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1.5 text-xs disabled:opacity-40">Next</Button>
          </div>
        </div>
      </div>

      {/* Source & campaign performance */}
      {stats && (stats.by_source.length > 0 || stats.by_campaign.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">By source</h3>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs uppercase text-gray-400"><th className="py-1">Source</th><th className="py-1 text-right">Leads</th><th className="py-1 text-right">Converted</th><th className="py-1 text-right">Rate</th></tr></thead>
              <tbody>
                {stats.by_source.map((r) => (
                  <tr key={r.source_channel} className="border-t border-gray-100">
                    <td className="py-2 font-semibold text-gray-800">{r.label}</td>
                    <td className="py-2 text-right">{r.total}</td>
                    <td className="py-2 text-right">{r.converted}</td>
                    <td className="py-2 text-right font-bold text-blue-700">{r.total ? Math.round((r.converted / r.total) * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">Top campaigns</h3>
            {stats.by_campaign.length === 0 ? (
              <p className="text-sm text-gray-400">No campaign data yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs uppercase text-gray-400"><th className="py-1">Campaign</th><th className="py-1 text-right">Leads</th><th className="py-1 text-right">Converted</th></tr></thead>
                <tbody>
                  {stats.by_campaign.map((r) => (
                    <tr key={r.campaign_name} className="border-t border-gray-100">
                      <td className="py-2 font-semibold text-gray-800 truncate max-w-[220px]">{r.campaign_name}</td>
                      <td className="py-2 text-right">{r.total}</td>
                      <td className="py-2 text-right">{r.converted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Add lead modal */}
      <FormModal isOpen={addOpen} title="Add Lead" onClose={() => setAddOpen(false)} wide>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className={labelClass}>Full name *</label>
            <input className={inputClass} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Phone</label>
            <div className="flex gap-2">
              <select className={`${inputClass} w-[110px]`} value={form.phone_country_code} onChange={(e) => setForm({ ...form, phone_country_code: e.target.value })}>
                <option value="+880">BD (+880)</option>
                <option value="+1">US/CA (+1)</option>
                <option value="+44">UK (+44)</option>
                <option value="+61">AUS (+61)</option>
                <option value="+91">IND (+91)</option>
              </select>
              <input
                className={inputClass}
                placeholder="1712345678"
                value={form.phone_number}
                onChange={(e) => /^[0-9]*$/.test(e.target.value) && setForm({ ...form, phone_number: e.target.value.replace(/^0/, '') })}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Email</label>
            <input className={inputClass} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Source *</label>
            <select className={inputClass} value={form.source_channel} onChange={(e) => setForm({ ...form, source_channel: e.target.value })}>
              {options?.sources.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>{form.source_channel.includes('reference') ? 'Referred by' : 'Source detail'}</label>
            <input className={inputClass} placeholder="e.g. referrer name, page name" value={form.source_detail} onChange={(e) => setForm({ ...form, source_detail: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Campaign</label>
            <input className={inputClass} value={form.campaign_name} onChange={(e) => setForm({ ...form, campaign_name: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Preferred country</label>
            <input className={inputClass} value={form.preferred_country} onChange={(e) => setForm({ ...form, preferred_country: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Course level</label>
            <select className={inputClass} value={form.preferred_course_level} onChange={(e) => setForm({ ...form, preferred_course_level: e.target.value })}>
              <option value="">—</option>
              {['Foundation', 'Diploma', 'Bachelor', 'Master', 'MRes', 'PhD'].map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Assign to</label>
            <select className={inputClass} value={form.assigned_to_user_id} onChange={(e) => setForm({ ...form, assigned_to_user_id: e.target.value })}>
              <option value="">Unassigned</option>
              {users.map((u) => <option key={u.id} value={String(u.id)}>{userName(u)}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Next follow-up</label>
            <input className={inputClass} type="date" value={form.next_follow_up_date} onChange={(e) => setForm({ ...form, next_follow_up_date: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className={labelClass}>Notes</label>
            <textarea className={inputClass} rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        {formError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm font-bold text-red-600 space-y-2">
            <div>{formError}</div>
            {duplicateId && (
              <div className="flex flex-wrap gap-2">
                <Button variant="dashboard" className="px-3 py-1.5 text-xs" onClick={() => router.push(`/leads/${duplicateId}`)}>Open existing lead</Button>
                <Button variant="action" className="px-3 py-1.5 text-xs" onClick={() => submitLead(true)}>Save anyway</Button>
              </div>
            )}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="back" onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="action" disabled={saving} onClick={() => submitLead(false)}>{saving ? 'Saving...' : 'Save Lead'}</Button>
        </div>
      </FormModal>

      {/* Import modal */}
      <FormModal isOpen={importOpen} title="Import leads from spreadsheet" onClose={() => setImportOpen(false)}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Upload a Meta Ads Manager CSV/TSV export or an Excel .xlsx workbook. For Excel files, the first worksheet and first row must
            contain the column names, e.g. <code>full_name, phone_number, email, campaign_name</code>. Google Sheets can be downloaded as CSV.
            People already in the CRM (same phone number) are skipped.
          </p>
          <input type="file" accept=".csv,.tsv,.txt,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => setImportFile(e.target.files?.[0] || null)} className="text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Source</label>
              <select className={inputClass} value={importSource} onChange={(e) => setImportSource(e.target.value)}>
                {options?.sources.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Assign to</label>
              <select className={inputClass} value={importAssign} onChange={(e) => setImportAssign(e.target.value)}>
                <option value="">Unassigned</option>
                {users.map((u) => <option key={u.id} value={String(u.id)}>{userName(u)}</option>)}
              </select>
            </div>
          </div>
          {importResult && (
            importResult.error ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm font-bold text-red-600">{importResult.error}</div>
            ) : (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 space-y-1">
                <div className="font-bold">{importResult.created} new lead(s) added from {importResult.total_rows} row(s).</div>
                <div>{importResult.duplicates} duplicate(s) skipped.</div>
                {importResult.errors?.length > 0 && (
                  <div className="text-red-700">
                    {importResult.errors.length} row(s) with problems:{' '}
                    {importResult.errors.slice(0, 5).map((rowError) => `row ${rowError.row}: ${rowError.message}`).join('; ')}
                  </div>
                )}
              </div>
            )
          )}
          <div className="flex justify-end gap-3">
            <Button variant="back" onClick={() => setImportOpen(false)}>Close</Button>
            <Button variant="action" disabled={!importFile || importing} onClick={submitImport}>{importing ? 'Importing...' : 'Import'}</Button>
          </div>
        </div>
      </FormModal>

      {/* Bulk assign modal */}
      <FormModal isOpen={assignOpen} title={`Assign ${selected.length} lead(s)`} onClose={() => setAssignOpen(false)}>
        <div className="space-y-4">
          <select className={inputClass} value={bulkAssignTo} onChange={(e) => setBulkAssignTo(e.target.value)}>
            <option value="">Unassigned</option>
            {users.map((u) => <option key={u.id} value={String(u.id)}>{userName(u)}</option>)}
          </select>
          <div className="flex justify-end gap-3">
            <Button variant="back" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button variant="action" onClick={submitBulkAssign}>Assign</Button>
          </div>
        </div>
      </FormModal>
    </PageShell>
  );
}
