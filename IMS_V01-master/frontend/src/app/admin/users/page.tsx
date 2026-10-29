'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Plus, KeyRound, Pencil } from 'lucide-react';
import api, { apiErrorMessage } from '@/lib/api';
import { ROLE_LABELS, Role, useCurrentUser } from '@/lib/auth';
import { Button } from '@/components/Button';
import { FormModal } from '@/components/FormModal';
import { RoleGuard } from '@/components/RoleGuard';
import { PageShell, formatDateTime, inputClass, labelClass } from '@/components/PageShell';

interface UserRow {
  id: number;
  username: string;
  full_name: string | null;
  role: Role;
  is_active: boolean;
  employee_id: number | null;
  employee_name: string | null;
  counselor_id: number | null;
  counselor_name: string | null;
  last_login_at: string | null;
}

const ROLES: Role[] = ['admin', 'accounts', 'counselor', 'telecaller'];

const ROLE_HELP: Record<Role, string> = {
  admin: 'Everything, incl. salary, IO, balance and user management',
  accounts: 'Daily work + balance sheet and collections',
  counselor: 'Students, leads, applications, documents, invoices',
  telecaller: 'Leads and collecting student info',
};

const emptyForm = { username: '', password: '', full_name: '', role: 'counselor' as Role, employee_id: '', counselor_id: '' };

export default function UsersAdminPage() {
  return (
    <RoleGuard roles={['admin']}>
      <UsersAdmin />
    </RoleGuard>
  );
}

function UsersAdmin() {
  const { user: me } = useCurrentUser();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [employees, setEmployees] = useState<{ id: number; name: string }[]>([]);
  const [counselors, setCounselors] = useState<{ id: number; name: string }[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [modal, setModal] = useState<{ open: boolean; editId: number | null }>({ open: false, editId: null });
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const [pwFor, setPwFor] = useState<UserRow | null>(null);
  const [newPw, setNewPw] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to load users.'));
    }
  }, []);

  useEffect(() => {
    load();
    api.get('/employees').then((r) => setEmployees(r.data)).catch(() => {});
    api.get('/counselors').then((r) => setCounselors(r.data)).catch(() => {});
  }, [load]);

  const flash = (m: string) => {
    setNotice(m);
    setError('');
    setTimeout(() => setNotice(''), 3500);
  };

  const openCreate = () => {
    setForm({ ...emptyForm });
    setModal({ open: true, editId: null });
  };

  const openEdit = (u: UserRow) => {
    setForm({
      username: u.username,
      password: '',
      full_name: u.full_name || '',
      role: u.role,
      employee_id: u.employee_id ? String(u.employee_id) : '',
      counselor_id: u.counselor_id ? String(u.counselor_id) : '',
    });
    setModal({ open: true, editId: u.id });
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      if (modal.editId) {
        await api.patch(`/users/${modal.editId}`, {
          full_name: form.full_name.trim() || null,
          role: form.role,
          employee_id: form.employee_id ? Number(form.employee_id) : null,
          counselor_id: form.counselor_id ? Number(form.counselor_id) : null,
        });
      } else {
        await api.post('/users', {
          username: form.username.trim(),
          password: form.password,
          full_name: form.full_name.trim() || undefined,
          role: form.role,
          employee_id: form.employee_id ? Number(form.employee_id) : undefined,
          counselor_id: form.counselor_id ? Number(form.counselor_id) : undefined,
        });
      }
      setModal({ open: false, editId: null });
      await load();
      flash('User saved.');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save the user.'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u: UserRow) => {
    if (u.is_active && !window.confirm(`Deactivate ${u.username}? They will be logged out immediately.`)) return;
    try {
      await api.patch(`/users/${u.id}`, { is_active: !u.is_active });
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const resetPassword = async () => {
    if (!pwFor) return;
    try {
      await api.post(`/users/${pwFor.id}/reset-password`, { password: newPw });
      setPwFor(null);
      setNewPw('');
      flash('Password changed. The user has been logged out everywhere.');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not reset the password.'));
    }
  };

  return (
    <PageShell
      title="Users & Roles"
      actions={
        <Button variant="action" onClick={openCreate} className="flex items-center gap-2 px-4 py-2 text-sm">
          <Plus className="h-4 w-4" /> Add user
        </Button>
      }
    >
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm font-bold text-red-600">{error}</div>}
      {notice && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm font-bold text-green-700">{notice}</div>}

      <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {ROLES.map((r) => (
            <div key={r} className="rounded-lg bg-gray-50 p-3">
              <div className="text-xs font-bold uppercase text-blue-700">{ROLE_LABELS[r]}</div>
              <div className="text-xs text-gray-600">{ROLE_HELP[r]}</div>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider">Linked to</th>
                <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider">Last login</th>
                <th className="text-right px-4 py-3 font-bold text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className={`border-t border-gray-100 ${u.is_active ? '' : 'opacity-50'}`}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{u.full_name || u.username}</div>
                    <div className="text-xs text-gray-500">@{u.username}{!u.is_active && ' · deactivated'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">{ROLE_LABELS[u.role] || u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {u.employee_name && <div>Employee: {u.employee_name}</div>}
                    {u.counselor_name && <div>Counselor: {u.counselor_name}</div>}
                    {!u.employee_name && !u.counselor_name && '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{formatDateTime(u.last_login_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="dashboard" onClick={() => openEdit(u)} className="px-3 py-1.5 text-xs flex items-center gap-1">
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button variant="dashboard" onClick={() => { setPwFor(u); setNewPw(''); }} className="px-3 py-1.5 text-xs flex items-center gap-1 bg-gray-500 hover:bg-gray-600">
                        <KeyRound className="h-3.5 w-3.5" /> Password
                      </Button>
                      {me?.id !== u.id && (
                        <Button variant={u.is_active ? 'back' : 'action'} onClick={() => toggleActive(u)} className="px-3 py-1.5 text-xs">
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <FormModal isOpen={modal.open} title={modal.editId ? 'Edit user' : 'Add user'} onClose={() => setModal({ open: false, editId: null })}>
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Username</label>
            <input className={inputClass} disabled={!!modal.editId} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          {!modal.editId && (
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Password (min 8 characters)</label>
              <input className={inputClass} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Full name</label>
            <input className={inputClass} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Role</label>
            <select className={inputClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} disabled={modal.editId === me?.id}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Employee record</label>
              <select className={inputClass} value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}>
                <option value="">—</option>
                {employees.map((e) => <option key={e.id} value={String(e.id)}>{e.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Counselor record</label>
              <select className={inputClass} value={form.counselor_id} onChange={(e) => setForm({ ...form, counselor_id: e.target.value })}>
                <option value="">—</option>
                {counselors.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Linking a user to their employee / counselor record lets reports and lead conversion use the right person.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="back" onClick={() => setModal({ open: false, editId: null })}>Cancel</Button>
            <Button variant="action" disabled={saving} onClick={save}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </div>
      </FormModal>

      <FormModal isOpen={!!pwFor} title={`New password for ${pwFor?.username || ''}`} onClose={() => setPwFor(null)}>
        <div className="space-y-4">
          <input className={inputClass} type="password" placeholder="At least 8 characters" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          <div className="flex justify-end gap-3">
            <Button variant="back" onClick={() => setPwFor(null)}>Cancel</Button>
            <Button variant="action" disabled={newPw.length < 8} onClick={resetPassword}>Set password</Button>
          </div>
        </div>
      </FormModal>
    </PageShell>
  );
}
