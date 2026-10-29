'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { ArrowLeft, Loader2, Users, UserCheck, TrendingUp, BarChart3 } from 'lucide-react';
import api from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface StudentItem {
  id: number;
  student_id: string | null;
  name: string;
  date: string;
  type: 'registered' | 'collected';
}

interface SourceRow {
  source_name: string;
  source_type: string;
  students_brought: number;
  files_opened: number;
  ratio: number;
  students: StudentItem[];
}

interface CounselorRow {
  counselor_name: string;
  students_counseled: number;
  files_opened: number;
  ratio: number;
  students: StudentItem[];
}

interface DashboardData {
  sourcePerformance: SourceRow[];
  counselorPerformance: CounselorRow[];
  availableMonths?: string[];
  totalWalkins: number;
  totalOpened: number;
}

// ─── Donut Chart ─────────────────────────────────────────────────────────────

const OPENED_COLOR = '#10b981';   // emerald-500
const CLOSED_COLOR = '#cbd5e1';   // slate-300

function DonutChart({
  opened,
  total,
  ratio,
  size = 120,
}: {
  opened: number;
  total: number;
  ratio: number;
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = size * 0.155;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;

  const openedFraction = total > 0 ? opened / total : 0;
  const openedDash = openedFraction * circumference;
  const closedDash = circumference - openedDash;

  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background track */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={CLOSED_COLOR}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={OPENED_COLOR}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${animated ? openedDash : 0} ${circumference}`}
          style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(.4,0,.2,1)' }}
        />
      </svg>
      {/* Centre label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-black leading-none"
          style={{ fontSize: size * 0.19, color: ratio >= 60 ? '#059669' : ratio >= 30 ? '#d97706' : '#dc2626' }}
        >
          {ratio.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

// ─── Legend ──────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="flex items-center gap-5 text-xs font-semibold text-slate-500">
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded-full" style={{ background: OPENED_COLOR }} />
        Opened File
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded-full" style={{ background: CLOSED_COLOR }} />
        Did Not Open
      </span>
    </div>
  );
}

// ─── Ratio Badge ─────────────────────────────────────────────────────────────

function RatioBadge({ ratio }: { ratio: number }) {
  const color =
    ratio >= 70
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
      : ratio >= 40
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : 'bg-red-100 text-red-600 border-red-200';
  return (
    <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-black border ${color}`}>
      {ratio.toFixed(1)}%
    </span>
  );
}

// ─── Source Donut Card ────────────────────────────────────────────────────────

function SourceDonutCard({ row }: { row: SourceRow }) {
  const isEmployee = row.source_type === 'employee';
  return (
    <div className="flex flex-col items-center gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-5 hover:shadow-md transition-shadow duration-200">
      <DonutChart opened={row.files_opened} total={row.students_brought} ratio={row.ratio} size={110} />
      <div className="text-center">
        <div className="flex items-center gap-1.5 justify-center mb-1">
          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${isEmployee ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'}`}>
            {isEmployee ? 'Employee' : 'Social'}
          </span>
        </div>
        <p className="font-bold text-slate-800 text-sm leading-snug">{row.source_name}</p>
        <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
          {row.ratio.toFixed(1)}% conversion &bull; {row.files_opened}/{row.students_brought}
        </p>
      </div>
    </div>
  );
}

// ─── Counselor Donut Card ─────────────────────────────────────────────────────

function CounselorDonutCard({ row }: { row: CounselorRow }) {
  return (
    <div className="flex flex-col items-center gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-5 hover:shadow-md transition-shadow duration-200">
      <DonutChart opened={row.files_opened} total={row.students_counseled} ratio={row.ratio} size={110} />
      <div className="text-center">
        <p className="font-bold text-slate-800 text-sm leading-snug">{row.counselor_name}</p>
        <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
          {row.ratio.toFixed(1)}% conversion &bull; {row.files_opened}/{row.students_counseled}
        </p>
      </div>
    </div>
  );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div className={`flex items-center gap-4 bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4`}>
      <div className={`p-2.5 rounded-xl ${accent}`}>{icon}</div>
      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-black text-slate-800 leading-tight">{value}</p>
      </div>
    </div>
  );
}

// ─── Main Dashboard Content ───────────────────────────────────────────────────

function PerformanceDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMonth = searchParams.get('month') || 'all';

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/students/performance-dashboard', {
          params: { month: selectedMonth },
        });
        setData(res.data);
      } catch {
        setError('Failed to load performance data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedMonth]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          <span className="text-sm font-semibold text-slate-500">Loading performance data...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-sm w-full p-6 bg-red-50 border border-red-200 rounded-2xl text-center shadow-sm">
          <p className="text-sm font-bold text-red-600 mb-4">{error || 'No data found.'}</p>
          <Button variant="action" onClick={() => router.push('/dashboard')}>← Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const totalWalkins = data.totalWalkins;
  const totalOpened  = data.totalOpened;
  const overallRatio = totalWalkins > 0 ? ((totalOpened / totalWalkins) * 100).toFixed(1) : '0.0';

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">

        {/* ── Header Card ── */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 px-8 py-6 relative overflow-hidden">
          {/* decorative gradient strip */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 rounded-t-2xl" />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
            <div>
              <Button
                id="performance-back-btn"
                variant="back"
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-2 px-4 py-2 text-sm shadow-md mb-4"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
              <PageHeader title="Employee Performance Dashboard" />
              <p className="text-sm text-slate-400 font-medium mt-1">
                Tracks the student walk‑in → file opening conversion funnel
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0">
              {/* Month Selector Dropdown */}
              <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl shadow-inner">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider text-slate-500">Filter Month:</span>
                <select
                  id="month-select"
                  value={selectedMonth}
                  onChange={(e) => {
                    const newMonth = e.target.value;
                    setSelectedMonth(newMonth);
                    const params = new URLSearchParams(window.location.search);
                    params.set('month', newMonth);
                    window.history.replaceState(null, '', `?${params.toString()}`);
                  }}
                  className="bg-transparent border-0 text-sm font-black text-slate-800 outline-none cursor-pointer pr-2"
                >
                  <option value="all">All Time</option>
                  {data.availableMonths?.map((m) => {
                    const date = new Date(m + '-02');
                    const formatted = date.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                    });
                    return (
                      <option key={m} value={m}>
                        {formatted}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Rate badge */}
              <div className="flex items-center gap-2 bg-gradient-to-br from-blue-600 to-indigo-600 px-5 py-3 rounded-2xl shadow-lg shadow-blue-500/30 text-white">
                <BarChart3 className="h-6 w-6 opacity-80" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Overall Rate</p>
                  <p className="text-2xl font-black leading-tight">{overallRatio}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Summary Totals ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCard
            icon={<Users className="h-5 w-5 text-blue-600" />}
            label="Total Walk-ins"
            value={totalWalkins}
            accent="bg-blue-50"
          />
          <SummaryCard
            icon={<UserCheck className="h-5 w-5 text-emerald-600" />}
            label="Files Opened"
            value={totalOpened}
            accent="bg-emerald-50"
          />
          <SummaryCard
            icon={<TrendingUp className="h-5 w-5 text-indigo-600" />}
            label="Overall Conversion"
            value={`${overallRatio}%`}
            accent="bg-indigo-50"
          />
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ── Section 1: Source Performance ── */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          {/* Section header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 flex items-center gap-3">
            <Users className="h-5 w-5 text-white/80" />
            <h2 className="text-base font-bold text-white tracking-wide">Source Performance</h2>
          </div>

          {/* Table */}
          <div className="p-6 space-y-4">
            <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-sm">
              <table id="source-performance-table" className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-700 text-white">
                    <th className="text-left px-5 py-3 font-bold text-xs uppercase tracking-wider">Source Name</th>
                    <th className="text-left px-5 py-3 font-bold text-xs uppercase tracking-wider">Type</th>
                    <th className="text-center px-5 py-3 font-bold text-xs uppercase tracking-wider">Students Brought</th>
                    <th className="text-center px-5 py-3 font-bold text-xs uppercase tracking-wider">Files Opened</th>
                    <th className="text-center px-5 py-3 font-bold text-xs uppercase tracking-wider">Performance Ratio</th>
                    <th className="text-center px-5 py-3 font-bold text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sourcePerformance.map((row, idx) => (
                    <tr
                      key={row.source_name}
                      className={`border-b border-slate-100 transition-colors hover:bg-blue-50/40 ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                      }`}
                    >
                      <td className="px-5 py-3 font-bold text-slate-800">{row.source_name}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-block text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                            row.source_type === 'employee'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-violet-100 text-violet-700'
                          }`}
                        >
                          {row.source_type === 'employee' ? 'Employee' : 'Social Media'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center font-semibold text-slate-700">{row.students_brought}</td>
                      <td className="px-5 py-3 text-center font-semibold text-emerald-700">{row.files_opened}</td>
                      <td className="px-5 py-3 text-center">
                        <RatioBadge ratio={row.ratio} />
                      </td>
                      <td className="px-5 py-3 text-center">
                        <Button
                          variant="action"
                          className="px-3.5 py-1.5 text-xs shadow-sm"
                          onClick={() => router.push(`/dashboard/performance/details?type=source&name=${encodeURIComponent(row.source_name)}&month=${selectedMonth}`)}
                        >
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Donut charts */}
            <div className="pt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">Source Conversion Ratios</h3>
                <Legend />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                {data.sourcePerformance.map((row) => (
                  <SourceDonutCard key={row.source_name} row={row} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 2: Counselor Performance ── */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          {/* Section header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-4 flex items-center gap-3">
            <UserCheck className="h-5 w-5 text-white/80" />
            <h2 className="text-base font-bold text-white tracking-wide">Counselor Performance</h2>
          </div>

          {/* Table */}
          <div className="p-6 space-y-4">
            <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-sm">
              <table id="counselor-performance-table" className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-700 text-white">
                    <th className="text-left px-5 py-3 font-bold text-xs uppercase tracking-wider">Counselor Name</th>
                    <th className="text-center px-5 py-3 font-bold text-xs uppercase tracking-wider">Students Counseled</th>
                    <th className="text-center px-5 py-3 font-bold text-xs uppercase tracking-wider">Files Opened</th>
                    <th className="text-center px-5 py-3 font-bold text-xs uppercase tracking-wider">Performance Ratio</th>
                    <th className="text-center px-5 py-3 font-bold text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.counselorPerformance.map((row, idx) => (
                    <tr
                      key={row.counselor_name}
                      className={`border-b border-slate-100 transition-colors hover:bg-emerald-50/40 ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                      }`}
                    >
                      <td className="px-5 py-3 font-bold text-slate-800">{row.counselor_name}</td>
                      <td className="px-5 py-3 text-center font-semibold text-slate-700">{row.students_counseled}</td>
                      <td className="px-5 py-3 text-center font-semibold text-emerald-700">{row.files_opened}</td>
                      <td className="px-5 py-3 text-center">
                        <RatioBadge ratio={row.ratio} />
                      </td>
                      <td className="px-5 py-3 text-center">
                        <Button
                          variant="action"
                          className="px-3.5 py-1.5 text-xs shadow-sm"
                          onClick={() => router.push(`/dashboard/performance/details?type=counselor&name=${encodeURIComponent(row.counselor_name)}&month=${selectedMonth}`)}
                        >
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Donut charts */}
            <div className="pt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">Counselor Conversion Ratios</h3>
                <Legend />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {data.counselorPerformance.map((row) => (
                  <CounselorDonutCard key={row.counselor_name} row={row} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 font-medium pb-4">
          Formula: (Files Opened ÷ Total Students) × 100 &nbsp;|&nbsp; Data from walk-in and registration records
        </p>

      </div>
    </div>
  );
}

export default function PerformanceDashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          <span className="text-sm font-semibold text-slate-500">Loading performance dashboard...</span>
        </div>
      </div>
    }>
      <PerformanceDashboardContent />
    </Suspense>
  );
}
