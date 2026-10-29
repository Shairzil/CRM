'use client';

import { useEffect, useState } from 'react';
import api from './api';

export type Role = 'admin' | 'accounts' | 'counselor' | 'telecaller';

export interface CurrentUser {
  id: number;
  username: string;
  full_name: string | null;
  role: Role;
  employee_id: number | null;
  employee_name?: string | null;
  counselor_id: number | null;
  counselor_name?: string | null;
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  accounts: 'Accounts',
  counselor: 'Counselor',
  telecaller: 'Telecaller',
};

const TOKEN_KEY = 'nexted_token';
const USER_KEY = 'nexted_user';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

/** Reads the `exp` claim of the JWT (seconds since epoch). */
function tokenExpiry(token: string): number | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(window.atob(base64));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

export function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  const exp = tokenExpiry(token);
  return exp === null || exp * 1000 > Date.now();
}

export function getStoredUser(): CurrentUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as CurrentUser) : null;
  } catch {
    return null;
  }
}

export function storeSession(token: string, user?: CurrentUser | null) {
  sessionStorage.setItem(TOKEN_KEY, token);
  if (user) sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function storeUser(user: CurrentUser) {
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem('confidential_logged_in'); // legacy flag from the old confidential login
}

/** Admin can do everything; otherwise the user's role must be in the list. */
export function hasRole(user: CurrentUser | null | undefined, ...roles: Role[]): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return roles.includes(user.role);
}

/**
 * The logged-in user. Starts from the copy saved at login (instant) and then
 * refreshes from /auth/me so role changes made by an admin show up.
 */
export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const cached = getStoredUser();
    if (cached) {
      setUser(cached);
      setLoading(false);
    }
    api
      .get('/auth/me')
      .then((res) => {
        if (cancelled) return;
        storeUser(res.data);
        setUser(res.data);
      })
      .catch(() => {
        /* 401 is handled globally in lib/api.ts */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { user, loading };
}

export function displayName(user: CurrentUser | null | undefined): string {
  if (!user) return '';
  return user.full_name || user.username;
}
