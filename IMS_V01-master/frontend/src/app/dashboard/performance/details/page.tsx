'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { ArrowLeft, Loader2, User } from 'lucide-react';
import api from '@/lib/api';

interface StudentItem {
  id: number;
  student_id: string | null;
  name: string;
  date: string;
  type: 'registered' | 'collected';
}

function PerformanceDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get('type') || ''; // 'source' or 'counselor'
  const name = searchParams.get('name') || '';
  const month = searchParams.get('month') || 'all';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [stats, setStats] = useState<{ total: number; opened: number; ratio: number } | null>(null);

  useEffect(() => {
    if (!type || !name) {
      setError('Missing type or name parameters.');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const res = await api.get(`/students/performance-dashboard`, {
          params: { month }
        });
        
        if (type === 'source') {
          const row = res.data.sourcePerformance.find(
            (r: any) => r.source_name.toLowerCase() === name.toLowerCase()
          );
          if (row) {
            setStudents(row.students || []);
            setStats({
              total: row.students_brought,
              opened: row.files_opened,
              ratio: row.ratio
            });
          } else {
            setError(`Source "${name}" not found.`);
          }
        } else if (type === 'counselor') {
          const row = res.data.counselorPerformance.find(
            (r: any) => r.counselor_name.toLowerCase() === name.toLowerCase()
          );
          if (row) {
            setStudents(row.students || []);
            setStats({
              total: row.students_counseled,
              opened: row.files_opened,
              ratio: row.ratio
            });
          } else {
            setError(`Counselor "${name}" not found.`);
          }
        } else {
          setError('Invalid type parameter.');
        }
      } catch (err) {
        setError('Failed to load details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [type, name, month]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <span className="text-sm font-semibold text-slate-500">Loading details...</span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="max-w-md mx-auto p-6 bg-red-50 border border-red-200 rounded-2xl text-center shadow-sm">
        <p className="text-sm font-bold text-red-600 mb-4">{error || 'No data found.'}</p>
        <Button variant="action" onClick={() => router.push(`/dashboard/performance?month=${month}`)}>
          ← Back to Performance Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="back"
            onClick={() => router.push(`/dashboard/performance?month=${month}`)}
            className="flex items-center gap-2 px-4 py-2 text-sm shadow-md"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          <div>
            <PageHeader title={`${name} - Performance Details`} />
            <p className="text-xs text-slate-400 font-semibold uppercase mt-0.5 tracking-wider">
              Type: {type === 'source' ? 'Source / Referral' : 'Counselor'} &bull; Month: {month === 'all' ? 'All Time' : month}
            </p>
          </div>
        </div>

        {/* Mini Stats Card */}
        <div className="flex items-center gap-6 bg-white border border-slate-100 rounded-2xl shadow-sm px-5 py-3.5">
          <div className="text-center border-r border-slate-100 pr-6">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Brought</p>
            <p className="text-xl font-black text-slate-800">{stats.total}</p>
          </div>
          <div className="text-center border-r border-slate-100 pr-6">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Files Opened</p>
            <p className="text-xl font-black text-emerald-600">{stats.opened}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ratio</p>
            <p className={`text-xl font-black ${
              stats.ratio >= 70 ? 'text-emerald-600' : stats.ratio >= 40 ? 'text-amber-600' : 'text-red-600'
            }`}>{stats.ratio.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Main Student List Table */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <User className="h-5 w-5 text-white/80" />
            <h2 className="text-base font-bold text-white tracking-wide">Student Performance Records</h2>
          </div>
          <span className="text-xs font-semibold text-slate-200 bg-slate-600/50 px-3 py-1 rounded-full">
            {students.length} student{students.length !== 1 ? 's' : ''} found
          </span>
        </div>

        <div className="p-6">
          {students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <User className="h-16 w-16 opacity-30" />
              <span className="text-sm font-semibold">No student records found for this period.</span>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-sm">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <th className="px-6 py-3.5 text-xs uppercase tracking-wider">Student ID</th>
                    <th className="px-6 py-3.5 text-xs uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3.5 text-xs uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3.5 text-xs uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3.5 text-xs uppercase tracking-wider text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((student, idx) => (
                    <tr key={idx + '-' + student.id + '-' + student.type} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-blue-700">
                        {student.student_id ? (
                          <span className="bg-blue-50 text-blue-800 px-2.5 py-1 rounded-md border border-blue-100 text-xs">
                            {student.student_id}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal italic">N/A (Unregistered)</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800">{student.name}</td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(student.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${
                          student.type === 'registered'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {student.type === 'registered' ? 'Registered' : 'Unregistered'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Button
                          variant="action"
                          className="px-4 py-2 text-xs"
                          onClick={() => {
                            if (student.type === 'registered') {
                              router.push(`/students/${student.id}/details`);
                            } else {
                              router.push(`/students/collected/${student.id}`);
                            }
                          }}
                        >
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PerformanceDetailsPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            <span className="text-sm font-semibold text-slate-500">Loading details...</span>
          </div>
        }>
          <PerformanceDetailsContent />
        </Suspense>
      </div>
    </div>
  );
}
