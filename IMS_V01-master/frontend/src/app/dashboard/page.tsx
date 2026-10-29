'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  UserPlus,
  ClipboardList,
  FileText,
  LogOut,
  BarChart3,
  DollarSign,
  Lock,
  Megaphone,
  GraduationCap,
  FolderOpen,
  UserCog,
  KeyRound,
  LayoutGrid,
  ChevronRight,
  ChevronDown,
  ArrowUpRight,
  Users,
  UserCheck,
  BriefcaseBusiness,
  CalendarDays,
  Sparkles,
} from 'lucide-react';
import { Role, ROLE_LABELS, clearSession, displayName, hasRole, useCurrentUser } from '@/lib/auth';
import api from '@/lib/api';

// Friendly names kept from the previous version of the dashboard.
const WELCOME_NAMES: Record<string, string> = {
  nawrose: 'Nawrose',
  mostafiz: 'Mostafiz',
  ryu: 'Rasmul Asif Safat',
  shairzil: 'Shairzil',
  fahim: 'ASM Fahim Hasnayene',
  nadia: 'Nadia',
  fahad: 'ASM Fahad Hasnayene',
  cathrin: 'Cathrin',
  ishfatjahin: 'Arna',
  nipa: 'Nipa',
  samia: 'Samia',
  dip: 'Dip',
};

interface Tile {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: Role[];
  group: string;
}

const TILES: Tile[] = [
  { label: 'Leads', href: '/leads', icon: Megaphone, roles: ['admin', 'accounts', 'counselor', 'telecaller'], group: 'STUDENT MANAGEMENT' },
  { label: 'Add Student', href: '/students/add', icon: UserPlus, roles: ['admin', 'accounts', 'counselor', 'telecaller'], group: 'STUDENT MANAGEMENT' },
  { label: 'Students Information', href: '/students', icon: ClipboardList, roles: ['admin', 'accounts', 'counselor', 'telecaller'], group: 'STUDENT MANAGEMENT' },
  { label: 'Applications', href: '/applications', icon: GraduationCap, roles: ['admin', 'accounts', 'counselor'], group: 'APPLICATIONS' },
  { label: 'Documents Review', href: '/documents', icon: FolderOpen, roles: ['admin', 'accounts', 'counselor'], group: 'APPLICATIONS' },
  { label: 'Employee Performance', href: '/dashboard/performance', icon: BarChart3, roles: ['admin', 'accounts', 'counselor'], group: 'REPORTS & FINANCE' },
  { label: 'Internal Cost', href: '/invoices/internal', icon: DollarSign, roles: ['admin', 'accounts', 'counselor'], group: 'REPORTS & FINANCE' },
  { label: 'Invoice History', href: '/invoices', icon: FileText, roles: ['admin', 'accounts', 'counselor'], group: 'REPORTS & FINANCE' },
  { label: 'Confidential', href: '/dashboard/confidential', icon: Lock, roles: ['admin', 'accounts'], group: 'REPORTS & FINANCE' },
  { label: 'Users & Roles', href: '/admin/users', icon: UserCog, roles: ['admin'], group: 'ADMINISTRATION' },
];

interface DashboardSummary {
  leadsReceived?: number;
  documentsReviewed?: number;
  documentsPending?: number;
  studentsRegistered?: number;
  applications?: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    OVERVIEW: true,
    'STUDENT MANAGEMENT': true,
    APPLICATIONS: true,
    'REPORTS & FINANCE': true,
    ADMINISTRATION: true,
  });

  useEffect(() => {
    let active = true;
    const loadSummary = async () => {
      const results = await Promise.allSettled([
        api.get('/leads/stats'),
        api.get('/documents/summary'),
        api.get('/students/summary'),
        api.get('/applications/summary'),
      ]);
      if (!active) return;

      const errors: string[] = [];
      const leads = results[0];
      const documents = results[1];
      const students = results[2];
      const applications = results[3];
      if (leads.status === 'rejected') errors.push('lead');
      if (documents.status === 'rejected') errors.push('document');
      if (students.status === 'rejected') errors.push('student');
      if (applications.status === 'rejected') errors.push('application');

      setSummary((previous) => {
        const documentStatuses = documents.status === 'fulfilled'
          ? documents.value.data.by_status as Record<string, number>
          : null;
        return {
          leadsReceived: leads.status === 'fulfilled' ? leads.value.data.total : previous?.leadsReceived,
          documentsReviewed: documentStatuses
            ? (documentStatuses.approved || 0) + (documentStatuses.rejected || 0)
            : previous?.documentsReviewed,
          documentsPending: documentStatuses ? documentStatuses.uploaded || 0 : previous?.documentsPending,
          studentsRegistered: students.status === 'fulfilled' ? students.value.data.registered : previous?.studentsRegistered,
          applications: applications.status === 'fulfilled' ? applications.value.data.total : previous?.applications,
        };
      });

      if (errors.length) {
        setSummaryError(`Could not load ${errors.join(', ')} dashboard counts. Please refresh to try again.`);
      } else {
        setSummaryError('');
      }
      setSummaryLoading(false);
    };

    const refresh = () => {
      if (document.visibilityState === 'visible') void loadSummary();
    };
    void loadSummary();
    const intervalId = window.setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  const handleLogout = () => {
    clearSession();
    router.push('/');
  };

  const tiles = TILES.filter((t) => hasRole(user, ...t.roles));

  return (
    <div className="min-h-screen bg-[linear-gradient(125deg,#fff1e9_0%,#f8f2f4_48%,#e8eaff_100%)] text-[#171827]">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 flex h-screen w-[68px] shrink-0 flex-col border-r border-[#eee5e2] bg-[#fffaf8] text-[#535568] shadow-sm sm:w-[260px]">
          <div className="flex h-[92px] items-center justify-center border-b border-[#eee5e2] px-3 sm:h-[102px] sm:justify-start sm:px-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff9a7e] text-sm font-black tracking-wide text-white sm:mr-3">
              NE
            </div>
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-base font-extrabold tracking-wide text-[#171827]">NEXTED</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#66709a]">Study abroad</p>
            </div>
          </div>

          <nav aria-label="Dashboard navigation" className="flex-1 overflow-y-auto px-2 py-5 sm:px-3">
            <section className="mb-5">
              <button
                type="button"
                aria-expanded={expandedSections.OVERVIEW}
                aria-controls="nav-overview"
                onClick={() => setExpandedSections((sections) => ({ ...sections, OVERVIEW: !sections.OVERVIEW }))}
                className="mb-2 flex w-full cursor-pointer items-center justify-between px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9295a5] hover:text-[#e87962]"
              >
                <span>Overview</span>
                <ChevronDown className={`hidden h-3.5 w-3.5 transition-transform sm:block ${expandedSections.OVERVIEW ? '' : '-rotate-90'}`} />
              </button>
              {expandedSections.OVERVIEW && (
                <div id="nav-overview">
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard')}
                    aria-current="page"
                    title="Dashboard"
                    className="flex h-11 w-full cursor-pointer items-center justify-center gap-3 rounded-full bg-[#181925] px-3 text-sm font-semibold text-white shadow-lg shadow-[#181925]/15 transition-colors hover:bg-[#292b3d] sm:justify-start sm:px-4"
                  >
                    <LayoutGrid className="h-[18px] w-[18px] shrink-0" />
                    <span className="hidden sm:block">Dashboard</span>
                  </button>
                </div>
              )}
            </section>

            {Array.from(new Set(tiles.map((tile) => tile.group))).map((group) => (
              <section key={group} className="mb-5">
                <button
                  type="button"
                  aria-expanded={expandedSections[group]}
                  aria-controls={`nav-${group.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                  onClick={() => setExpandedSections((sections) => ({ ...sections, [group]: !sections[group] }))}
                  className="mb-2 flex w-full cursor-pointer items-center justify-between px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9295a5] hover:text-[#e87962]"
                >
                  <span className="hidden sm:block">{group}</span>
                  <span className="sr-only sm:hidden">{group}</span>
                  <ChevronDown className={`hidden h-3.5 w-3.5 transition-transform sm:block ${expandedSections[group] ? '' : '-rotate-90'}`} />
                </button>
                {expandedSections[group] && (
                  <div id={`nav-${group.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="space-y-1">
                    {tiles.filter((tile) => tile.group === group).map((tile) => {
                      const Icon = tile.icon;
                      return (
                        <button
                          key={tile.href}
                          type="button"
                          onClick={() => router.push(tile.href)}
                          title={tile.label}
                          className="flex h-10 w-full cursor-pointer items-center justify-center gap-3 rounded-xl px-3 text-left text-sm text-[#535568] transition-colors hover:bg-[#ffede7] hover:text-[#bc604e] sm:justify-start sm:px-3"
                        >
                          <Icon className="h-[18px] w-[18px] shrink-0" />
                          <span className="hidden min-w-0 flex-1 truncate sm:block">{tile.label}</span>
                          <ChevronRight className="hidden h-4 w-4 shrink-0 text-gray-400 sm:block" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            ))}
          </nav>

          <div className="border-t border-[#eee5e2] p-2 sm:p-3">
            <button
              type="button"
              onClick={() => router.push('/account/password')}
              title="Settings / Change password"
              className="mb-2 flex h-10 w-full cursor-pointer items-center justify-center gap-3 rounded-xl px-3 text-sm text-[#535568] transition-colors hover:bg-[#ffede7] hover:text-[#bc604e] sm:justify-start"
            >
              <KeyRound className="h-[18px] w-[18px] shrink-0" />
              <span className="hidden sm:block">Settings</span>
            </button>
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-[#eee5e2] bg-white/80 p-2 sm:justify-start sm:px-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#ffd4c7] bg-[#fff0e9] text-xs font-bold text-[#bd6655]">
                {user?.username.slice(0, 2).toUpperCase() || 'NE'}
              </div>
              <div className="hidden min-w-0 flex-1 sm:block">
                <p className="truncate text-xs font-semibold text-[#171827]">{user ? displayName(user) : 'NextEd user'}</p>
                <p className="truncate text-[10px] text-[#85889a]">{user ? ROLE_LABELS[user.role] || user.role : ''}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Log out"
                title="Log out"
                className="hidden h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#73768a] transition-colors hover:bg-[#ffede7] hover:text-[#bc604e] sm:flex"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Log out"
              title="Log out"
              className="mt-2 flex h-9 w-full cursor-pointer items-center justify-center rounded-xl text-[#73768a] transition-colors hover:bg-[#ffede7] hover:text-[#bc604e] sm:hidden"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="flex min-h-[76px] flex-wrap items-center justify-between gap-4 border-b border-[#eee5e2] bg-white/80 px-5 py-4 shadow-sm backdrop-blur sm:px-8 lg:px-10">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-lg font-bold tracking-tight text-[#171827] sm:text-xl">Dashboard</h1>
                <p className="mt-0.5 text-xs text-[#73768a]">NextEd Advisors · Management panel</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {user && (
                <span className="hidden rounded-full border border-[#f4d8cf] bg-[#fff3ee] px-3 py-1.5 text-xs font-semibold text-[#aa594b] sm:inline-flex">
                  {ROLE_LABELS[user.role] || user.role}
                </span>
              )}
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
            <section className="relative overflow-hidden rounded-3xl border border-[#303249] bg-[linear-gradient(115deg,#242536_0%,#171827_58%,#293657_100%)] p-6 text-white shadow-[0_20px_45px_rgba(27,29,53,0.2)] sm:p-9">
              <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full border-[28px] border-white/[0.06]" />
              <div className="pointer-events-none absolute -right-2 top-10 h-40 w-40 rounded-full border border-white/[0.08]" />
              <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
                <div>
                  <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#ffc0ad]">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date())}
                  </div>
                  <p className="mt-5 text-sm font-medium text-white/65">YOUR NEXTED WORKSPACE</p>
                  <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                    Welcome, {WELCOME_NAMES[user?.username.toLowerCase() || ''] || (user ? displayName(user) : 'there')}
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-white/70 sm:text-base">
                    Your team workspace for leads, students, applications and document reviews.
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push('/leads')}
                    className="mt-6 inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-[#ff9a7e] px-5 text-sm font-bold text-[#202132] shadow-md shadow-black/10 transition-colors hover:bg-[#ffb09b]"
                  >
                    Open leads <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="relative flex items-center gap-4 self-start rounded-[26px] border border-white/10 bg-white/[0.07] px-4 py-3 backdrop-blur sm:self-center sm:px-5 sm:py-4">
                  <div className="relative flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-[22px] bg-gradient-to-br from-[#ffb29c] to-[#f28d7e] text-[#25263b] shadow-lg shadow-black/15">
                    <GraduationCap className="h-9 w-9" strokeWidth={1.8} />
                    <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#242536] bg-white text-[#e87962]">
                      <Sparkles className="h-3 w-3" />
                    </span>
                  </div>
                  <div>
                    <p className="text-lg font-extrabold text-white">Nexi</p>
                    <p className="mt-0.5 text-xs text-white/65">Your NextEd guide</p>
                    <p className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#ffc0ad]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#ff9a7e]" /> Here to help
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-8">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#bd6655]">Performance</p>
                  <h3 className="mt-1 text-xl font-bold text-[#171827]">Workspace overview</h3>
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/performance')}
                  className="inline-flex cursor-pointer items-center gap-1 text-sm font-semibold text-[#69739a] hover:text-[#41496e]"
                >
                  View performance <ArrowUpRight className="h-4 w-4" />
                </button>
              </div>

              {summaryError && (
                <p role="alert" className="mb-4 rounded-xl border border-[#ffd3c8] bg-[#fff1ec] px-4 py-3 text-sm text-[#a94338]">
                  {summaryError}
                </p>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {[
                  { label: 'Leads received', value: summary?.leadsReceived, icon: Megaphone, tone: 'blue' },
                  { label: 'Documents reviewed', value: summary?.documentsReviewed, icon: UserCheck, tone: 'green' },
                  { label: 'Students registered', value: summary?.studentsRegistered, icon: Users, tone: 'violet' },
                  { label: 'Waiting for review', value: summary?.documentsPending, icon: FolderOpen, tone: 'amber' },
                  { label: 'Applications', value: summary?.applications, icon: BriefcaseBusiness, tone: 'blue' },
                ].map((metric) => {
                  const Icon = metric.icon;
                  const toneClasses = {
                    blue: 'bg-[#eef0ff] text-[#68739c] border-[#dfe2fb]',
                    green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                    violet: 'bg-[#f3edff] text-[#8b6db0] border-[#e8dcfa]',
                    amber: 'bg-[#fff0e9] text-[#c87858] border-[#ffded0]',
                  }[metric.tone];
                  return (
                    <article key={metric.label} className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-[0_8px_24px_rgba(37,39,62,0.07)] backdrop-blur">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-[#777a8d]">{metric.label}</p>
                          <p className="mt-3 text-3xl font-extrabold tracking-tight text-[#171827]">
                            {summaryLoading ? <span className="inline-block h-9 w-14 animate-pulse rounded-lg bg-[#f1eff2]" /> : metric.value ?? '—'}
                          </p>
                        </div>
                        <span className={`flex h-11 w-11 items-center justify-center rounded-xl border ${toneClasses}`}>
                          <Icon className="h-5 w-5" />
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="mt-8 rounded-2xl border border-white/80 bg-white/90 p-5 shadow-[0_8px_24px_rgba(37,39,62,0.07)] backdrop-blur sm:p-6">
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#bd6655]">Get started</p>
                <h3 className="mt-1 text-lg font-bold text-[#171827]">Quick actions</h3>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {tiles.slice(0, 4).map((tile) => {
                  const Icon = tile.icon;
                  return (
                    <button
                      key={tile.href}
                      type="button"
                      onClick={() => router.push(tile.href)}
                      className="group flex cursor-pointer items-center gap-3 rounded-xl border border-[#f0e9e7] bg-[#fffaf8] p-3 text-left transition-colors hover:border-[#f4c8ba] hover:bg-[#fff0e9]"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#bd6655] shadow-sm">
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#343548]">{tile.label}</span>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-[#9b9cad] group-hover:text-[#bd6655]" />
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
