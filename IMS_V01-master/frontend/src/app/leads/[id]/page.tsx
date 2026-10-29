'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Phone, StickyNote, ArrowRightCircle, Save, Trash2 } from 'lucide-react';
import api, { apiErrorMessage } from '@/lib/api';
import { hasRole, useCurrentUser } from '@/lib/auth';
import { Button } from '@/components/Button';
import { PageShell, formatDate, formatDateTime, inputClass, labelClass } from '@/components/PageShell';
import { StatusBadge, statusLabel } from '@/components/StatusBadge';

interface Activity {
  id: number;
  type: string;
  content: string;
  user: string;
  created_at: string;
}

interface LeadDetail {
  id: number;
  full_name: string;
  phone_country_code: string;
  phone_number: string | null;
  email: string | null;
  source_channel: string;
  source_label: string;
  platform: string | null;
  source_detail: string | null;
  campaign_name: string | null;
  campaign_id: string | null;
  adset_name: string | null;
  ad_id: string | null;
  ad_name: string | null;
  meta_lead_id: string | null;
  meta_form_id: string | null;
  preferred_country: string | null;
  preferred_course_level: string | null;
  preferred_intake: string | null;
  status: string;
  assigned_to_user_id: number | null;
  assigned_to_name: string | null;
  next_follow_up_date: string | null;
  notes: string | null;
  student_info_id: number | null;
  student_id: number | null;
  source_created_at: string | null;
  created_at: string;
  activities: Activity[];
  duplicates: { id: number; full_name: string; status: string; created_at: string }[];
}

const ACTIVITY_ICON: Record<string, string> = {
  call: '📞',
  note: '📝',
  status_change: '🔁',
  assignment: '👤',
  conversion: '🎓',
  system: '⚙️',
};

export default function LeadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { user } = useCurrentUser();

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [options, setOptions] = useState<{ statuses: string[]; sources: { value: string; label: string }[] } | null>(null);
  const [users, setUsers] = useState<{ id: number; username: string; full_name: string | null }[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // editable copy
  const [edit, setEdit] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // activity form
  const [activityType, setActivityType] = useState<'call' | 'note'>('call');
  const [activityText, setActivityText] = useState('');
  const [activityStatus, setActivityStatus] = useState('');
  const [activityFollowUp, setActivityFollowUp] = useState('');
  const [addingActivity, setAddingActivity] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/leads/${id}`);
      setLead(res.data);
      setEdit({
        full_name: res.data.full_name,
        phone_country_code: res.data.phone_country_code,
        phone_number: res.data.phone_number || '',
        email: res.data.email || '',
        source_channel: res.data.source_channel,
        source_detail: res.data.source_detail || '',
        campaign_name: res.data.campaign_name || '',
        preferred_country: res.data.preferred_country || '',
        preferred_course_level: res.data.preferred_course_level || '',
        preferred_intake: res.data.preferred_intake || '',
        status: res.data.status,
        assigned_to_user_id: res.data.assigned_to_user_id ? String(res.data.assigned_to_user_id) : '',
        next_follow_up_date: res.data.next_follow_up_date || '',
        notes: res.data.notes || '',
      });
    } catch (err) {
      setError(apiErrorMessage(err, 'Lead not found.'));
    }
  }, [id]);

  useEffect(() => {
    load();
    api.get('/leads/options').then((r) => setOptions(r.data)).catch(() => {});
    api.get('/users/assignable').then((r) => setUsers(r.data)).catch(() => {});
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.patch(`/leads/${id}`, {
        full_name: edit.full_name.trim(),
        phone_country_code: edit.phone_country_code,
        phone_number: edit.phone_number,
        email: edit.email.trim() || null,
        source_channel: edit.source_channel,
        source_detail: edit.source_detail.trim() || null,
        campaign_name: edit.campaign_name.trim() || null,
        preferred_country: edit.preferred_country.trim() || null,
        preferred_course_level: edit.preferred_course_level || null,
        preferred_intake: edit.preferred_intake.trim() || null,
        status: edit.status,
        assigned_to_user_id: edit.assigned_to_user_id ? Number(edit.assigned_to_user_id) : null,
        next_follow_up_date: edit.next_follow_up_date || null,
        notes: edit.notes.trim() || null,
      });
      setMessage('Saved.');
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save.'));
    } finally {
      setSaving(false);
    }
  };

  const addActivity = async () => {
    if (!activityText.trim()) return;
    setAddingActivity(true);
    setError('');
    try {
      await api.post(`/leads/${id}/activities`, {
        type: activityType,
        content: activityText.trim(),
        status: activityStatus || undefined,
        next_follow_up_date: activityFollowUp || undefined,
      });
      setActivityText('');
      setActivityStatus('');
      setActivityFollowUp('');
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not add the note.'));
    } finally {
      setAddingActivity(false);
    }
  };

  const convert = async () => {
    setError('');
    try {
      const res = await api.post(`/leads/${id}/convert`);
      router.push(`/students/collected/${res.data.student_info_id}`);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not convert the lead.'));
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this lead permanently?')) return;
    try {
      await api.delete(`/leads/${id}`);
      router.push('/leads');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not delete.'));
    }
  };

  if (!lead || !edit) {
    return (
      <PageShell title="Lead" backTo="/leads" maxWidth="max-w-5xl">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 text-center text-gray-500">
          {error || 'Loading...'}
        </div>
      </PageShell>
    );
  }

  const field = (label: string, key: string, type = 'text') => (
    <div className="flex flex-col gap-1">
      <label className={labelClass}>{label}</label>
      <input className={inputClass} type={type} value={edit[key]} onChange={(e) => setEdit({ ...edit, [key]: e.target.value })} />
    </div>
  );

  return (
    <PageShell
      title={lead.full_name}
      backTo="/leads"
      maxWidth="max-w-5xl"
      actions={
        <>
          {hasRole(user, 'admin') && (
            <Button variant="back" onClick={remove} className="flex items-center gap-2 px-4 py-2 text-sm">
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          )}
          {lead.student_info_id ? (
            <Button variant="dashboard" onClick={() => router.push(`/students/collected/${lead.student_info_id}`)} className="flex items-center gap-2 px-4 py-2 text-sm">
              <ArrowRightCircle className="h-4 w-4" /> Open student info
            </Button>
          ) : (
            <Button variant="action" onClick={convert} className="flex items-center gap-2 px-4 py-2 text-sm">
              <ArrowRightCircle className="h-4 w-4" /> Convert to student
            </Button>
          )}
          {lead.student_id && (
            <Button variant="dashboard" onClick={() => router.push(`/students/${lead.student_id}/details`)} className="px-4 py-2 text-sm">
              Registered student
            </Button>
          )}
        </>
      }
    >
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm font-bold text-red-600">{error}</div>}
      {message && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm font-bold text-green-700">{message}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: details */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-blue-600 px-6 py-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Lead details</h3>
            <StatusBadge status={lead.status} />
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {field('Full name', 'full_name')}
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Phone</label>
              <div className="flex gap-2">
                <select className={`${inputClass} w-[110px]`} value={edit.phone_country_code} onChange={(e) => setEdit({ ...edit, phone_country_code: e.target.value })}>
                  <option value="+880">BD (+880)</option>
                  <option value="+1">US/CA (+1)</option>
                  <option value="+44">UK (+44)</option>
                  <option value="+61">AUS (+61)</option>
                  <option value="+91">IND (+91)</option>
                </select>
                <input
                  className={inputClass}
                  value={edit.phone_number}
                  onChange={(e) => /^[0-9]*$/.test(e.target.value) && setEdit({ ...edit, phone_number: e.target.value })}
                />
              </div>
            </div>
            {field('Email', 'email', 'email')}
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Status</label>
              <select className={inputClass} value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
                {options?.statuses.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Source</label>
              <select className={inputClass} value={edit.source_channel} onChange={(e) => setEdit({ ...edit, source_channel: e.target.value })}>
                {options?.sources.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            {field('Source detail / referred by', 'source_detail')}
            {field('Campaign', 'campaign_name')}
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Assigned to</label>
              <select className={inputClass} value={edit.assigned_to_user_id} onChange={(e) => setEdit({ ...edit, assigned_to_user_id: e.target.value })}>
                <option value="">Unassigned</option>
                {users.map((u) => <option key={u.id} value={String(u.id)}>{u.full_name || u.username}</option>)}
              </select>
            </div>
            {field('Preferred country', 'preferred_country')}
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Course level</label>
              <select className={inputClass} value={edit.preferred_course_level} onChange={(e) => setEdit({ ...edit, preferred_course_level: e.target.value })}>
                <option value="">—</option>
                {['Foundation', 'Diploma', 'Bachelor', 'Master', 'MRes', 'PhD'].map((l) => <option key={l} value={l}>{l}</option>)}
                {edit.preferred_course_level && !['Foundation', 'Diploma', 'Bachelor', 'Master', 'MRes', 'PhD'].includes(edit.preferred_course_level) && (
                  <option value={edit.preferred_course_level}>{edit.preferred_course_level}</option>
                )}
              </select>
            </div>
            {field('Preferred intake', 'preferred_intake')}
            {field('Next follow-up', 'next_follow_up_date', 'date')}
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className={labelClass}>Notes</label>
              <textarea className={inputClass} rows={4} value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button variant="action" disabled={saving} onClick={save} className="flex items-center gap-2">
                <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save changes'}
              </Button>
            </div>
          </div>

          {(lead.meta_lead_id || lead.meta_form_id || lead.platform || lead.ad_name || lead.adset_name || lead.campaign_name) && (
            <div className="border-t border-gray-100 px-6 py-4 text-xs text-gray-500 space-y-1">
              <div className="font-bold uppercase tracking-wider text-gray-400">Meta ad info</div>
              {lead.platform && <div>Platform: <span className="font-semibold capitalize text-gray-700">{lead.platform}</span></div>}
              {lead.campaign_name && <div>Campaign: <span className="font-semibold text-gray-700">{lead.campaign_name}</span></div>}
              {lead.campaign_id && <div>Campaign ID: <span className="font-mono">{lead.campaign_id}</span></div>}
              {lead.adset_name && <div>Ad set: <span className="font-semibold text-gray-700">{lead.adset_name}</span></div>}
              {lead.ad_id && <div>Ad ID: <span className="font-mono">{lead.ad_id}</span></div>}
              {lead.ad_name && <div>Ad: <span className="font-semibold text-gray-700">{lead.ad_name}</span></div>}
              {lead.meta_form_id && <div>Form ID: <span className="font-mono">{lead.meta_form_id}</span></div>}
              {lead.meta_lead_id && <div>Meta lead ID: <span className="font-mono">{lead.meta_lead_id}</span></div>}
              {lead.source_created_at && <div>Submitted: {formatDateTime(lead.source_created_at)}</div>}
            </div>
          )}

          {lead.duplicates.length > 0 && (
            <div className="border-t border-amber-100 bg-amber-50 px-6 py-4 text-sm">
              <div className="font-bold text-amber-800 mb-1">Other leads with the same phone number</div>
              {lead.duplicates.map((d) => (
                <button key={d.id} type="button" className="block text-left text-amber-900 underline cursor-pointer" onClick={() => router.push(`/leads/${d.id}`)}>
                  {d.full_name} — {statusLabel(d.status)} ({formatDate(d.created_at)})
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: activity */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col">
          <div className="bg-blue-600 px-6 py-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Calls &amp; notes</h3>
          </div>
          <div className="p-4 space-y-3 border-b border-gray-100">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActivityType('call')}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold cursor-pointer ${activityType === 'call' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                <Phone className="h-3.5 w-3.5" /> Call log
              </button>
              <button
                type="button"
                onClick={() => setActivityType('note')}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold cursor-pointer ${activityType === 'note' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                <StickyNote className="h-3.5 w-3.5" /> Note
              </button>
            </div>
            <textarea
              className={inputClass}
              rows={3}
              placeholder={activityType === 'call' ? 'What did the student say?' : 'Write a note'}
              value={activityText}
              onChange={(e) => setActivityText(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <select className={inputClass} value={activityStatus} onChange={(e) => setActivityStatus(e.target.value)}>
                <option value="">Keep status</option>
                {options?.statuses.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
              </select>
              <input className={inputClass} type="date" title="Next follow-up" value={activityFollowUp} onChange={(e) => setActivityFollowUp(e.target.value)} />
            </div>
            <Button variant="action" disabled={addingActivity || !activityText.trim()} onClick={addActivity} className="w-full py-2 text-sm">
              {addingActivity ? 'Saving...' : 'Add'}
            </Button>
          </div>
          <div className="p-4 space-y-3 overflow-y-auto max-h-[600px]">
            {lead.activities.length === 0 && <p className="text-sm text-gray-400">No activity yet.</p>}
            {lead.activities.map((a) => (
              <div key={a.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="font-bold">
                    {ACTIVITY_ICON[a.type] || '•'} {a.user}
                  </span>
                  <span>{formatDateTime(a.created_at)}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{a.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
