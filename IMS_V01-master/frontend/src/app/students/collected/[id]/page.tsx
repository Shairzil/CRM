'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { ArrowLeft, Loader2, FileText, UserPlus } from 'lucide-react';
import api from '@/lib/api';

interface CollectedLeadDetail {
  id: number;
  name: string;
  phone_country_code: string;
  phone_number: string;
  preferred_country?: string;
  preferred_course?: string;
  preferred_course_level?: string;
  preferred_intake?: string;
  ssc_gpa?: string;
  ssc_year?: string;
  hsc_gpa?: string;
  hsc_year?: string;
  bachelor_subject?: string;
  bachelor_university?: string;
  bachelor_cgpa?: string;
  bachelor_year?: string;
  master_subject?: string;
  master_university?: string;
  master_cgpa?: string;
  master_year?: string;
  test_taken?: string;
  overall_score?: string;
  study_gap?: string;
  work_experience?: string;
  visa_refusal?: string;
  estimated_budget?: string;
  counsellor_notes?: string;
  counselor_name?: string;
  source_type?: string;
  source_name?: string;
  created_at: string;
  cv_name?: string;
  cv_mime?: string;
}

const DetailRow = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-2.5 border-b border-gray-100 last:border-0">
    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider sm:w-52 shrink-0">{label}</span>
    <span className="text-sm font-semibold text-gray-900">{value && String(value).trim() !== '' ? value : '—'}</span>
  </div>
);

export default function CollectedLeadDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const leadId = params.id as string;

  const [lead, setLead] = useState<CollectedLeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // General Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');

  useEffect(() => {
    const fetchLeadDetails = async () => {
      try {
        const res = await api.get(`/students/info/${leadId}`);
        setLead(res.data);
      } catch {
        setError('Failed to load collected lead details.');
      } finally {
        setLoading(false);
      }
    };
    fetchLeadDetails();
  }, [leadId]);

  const [isUpdatingCv, setIsUpdatingCv] = useState(false);

  const handleOpenCv = async () => {
    try {
      const res = await api.get(`/students/info/${leadId}/cv`, { responseType: 'blob' });
      const contentType = (typeof res.headers['content-type'] === 'string' ? res.headers['content-type'] : undefined) || lead?.cv_mime || 'application/pdf';
      const blob = new Blob([res.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      
      if (contentType === 'application/pdf') {
        window.open(url, '_blank');
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = lead?.cv_name || 'CV_Document';
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
      await api.post(`/students/info/${leadId}/cv`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      // Re-fetch lead details
      const res = await api.get(`/students/info/${leadId}`);
      setLead(res.data);
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <span className="text-sm font-semibold text-gray-500">Loading collected lead details...</span>
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-sm w-full p-6 bg-red-50 border border-red-200 rounded-xl text-center">
          <p className="text-sm font-bold text-red-600 mb-4">{error || 'Collected lead not found.'}</p>
          <Button variant="action" onClick={() => router.push('/students')}>← Back to Students</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">

        {/* Outer Card */}
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 space-y-6 relative">
          
          {/* Top Left Red Back Button */}
          <div className="absolute top-8 left-8">
            <Button
              variant="back"
              onClick={() => router.push('/students')}
              className="flex items-center gap-2 px-4 py-2 text-sm shadow-md"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
          </div>

          {/* Quick Action Button in Top Right */}
          <div className="absolute top-8 right-8">
            <Button
              variant="action"
              onClick={() =>
                router.push(
                  `/students/add/register?name=${encodeURIComponent(
                    lead.name
                  )}&phone=${encodeURIComponent(
                    lead.phone_number
                  )}&countryCode=${encodeURIComponent(
                    lead.phone_country_code
                  )}&level=${encodeURIComponent(lead.preferred_course_level || 'Bachelor')}&counselor_name=${encodeURIComponent(lead.counselor_name || '')}&source_type=${encodeURIComponent(lead.source_type || '')}&source_name=${encodeURIComponent(lead.source_name || '')}`
                )
              }
              className="flex items-center gap-2 px-4 py-2 text-sm shadow-md bg-green-500 hover:bg-green-600"
            >
              <UserPlus className="h-4 w-4" />
              <span>Register Student</span>
            </Button>
          </div>

          <div className="pt-12">
            <PageHeader title="Collected Information Details" />
          </div>

          {/* Section 1: Personal Information */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-blue-600 px-6 py-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Personal Information</h3>
            </div>
            <div className="px-6 py-2">
              <DetailRow label="Full Name" value={lead.name} />
              <DetailRow label="Phone Number (WhatsApp)" value={`${lead.phone_country_code} ${lead.phone_number}`} />
              <DetailRow
                label="Student Source"
                value={lead.source_type ? `${lead.source_type === 'employee' ? 'Employee' : 'Social Media'}${lead.source_name ? ` (${lead.source_name})` : ''}` : '—'}
              />
              <DetailRow
                label="Date Collected"
                value={new Date(lead.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              />
            </div>
          </div>

          {/* CV Document Card */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-purple-600 px-6 py-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">CV Document</h3>
            </div>
            <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
              <div className="flex-1">
                {lead.cv_name ? (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-gray-900">{lead.cv_name}</span>
                    <span className="text-xs text-gray-400 font-medium">Click View CV to download/display document</span>
                  </div>
                ) : (
                  <span className="text-sm font-semibold text-gray-500">No CV uploaded yet.</span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {lead.cv_name && (
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

          {/* Section 2: Study Preferences */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-indigo-600 px-6 py-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Study Preferences</h3>
            </div>
            <div className="px-6 py-2">
              <DetailRow label="Preferred Country/Countries" value={lead.preferred_country} />
              <DetailRow label="Preferred Course/Subject" value={lead.preferred_course} />
              <DetailRow label="Preferred Course Level" value={lead.preferred_course_level} />
              <DetailRow label="Preferred Intake" value={lead.preferred_intake} />
            </div>
          </div>

          {/* Section 3: Academic Background */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-emerald-600 px-6 py-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Academic Background</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              {/* SSC / O-Level */}
              <div>
                <h4 className="text-xs font-extrabold text-emerald-600 uppercase tracking-wider mb-2">SSC / O-Level</h4>
                <div className="pl-4 border-l-2 border-emerald-100">
                  <DetailRow label="GPA" value={lead.ssc_gpa} />
                  <DetailRow label="Year of Passing" value={lead.ssc_year} />
                </div>
              </div>
              
              {/* HSC / A-Level */}
              <div>
                <h4 className="text-xs font-extrabold text-emerald-600 uppercase tracking-wider mb-2">HSC / A-Level</h4>
                <div className="pl-4 border-l-2 border-emerald-100">
                  <DetailRow label="GPA" value={lead.hsc_gpa} />
                  <DetailRow label="Year of Passing" value={lead.hsc_year} />
                </div>
              </div>

              {/* Bachelor's */}
              <div>
                <h4 className="text-xs font-extrabold text-emerald-600 uppercase tracking-wider mb-2">Bachelor's Degree</h4>
                <div className="pl-4 border-l-2 border-emerald-100">
                  <DetailRow label="Subject / Dept" value={lead.bachelor_subject} />
                  <DetailRow label="University Name" value={lead.bachelor_university} />
                  <DetailRow label="CGPA / Score" value={lead.bachelor_cgpa} />
                  <DetailRow label="Year of Passing" value={lead.bachelor_year} />
                </div>
              </div>

              {/* Master's */}
              <div>
                <h4 className="text-xs font-extrabold text-emerald-600 uppercase tracking-wider mb-2">Master's Degree</h4>
                <div className="pl-4 border-l-2 border-emerald-100">
                  <DetailRow label="Subject / Dept" value={lead.master_subject} />
                  <DetailRow label="University Name" value={lead.master_university} />
                  <DetailRow label="CGPA / Score" value={lead.master_cgpa} />
                  <DetailRow label="Year of Passing" value={lead.master_year} />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: English Language Proficiency */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-teal-600 px-6 py-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">English Language Proficiency</h3>
            </div>
            <div className="px-6 py-2">
              <DetailRow label="Test Taken" value={lead.test_taken} />
              <DetailRow label="Overall Score & Test Date" value={lead.overall_score} />
            </div>
          </div>

          {/* Section 5: Additional Information */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-cyan-600 px-6 py-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Additional Information</h3>
            </div>
            <div className="px-6 py-2">
              <DetailRow label="Study Gap (If Any)" value={lead.study_gap} />
              <DetailRow label="Work Experience (If Any)" value={lead.work_experience} />
              <DetailRow label="Visa Refusal (if any)" value={lead.visa_refusal} />
              <DetailRow label="Estimated Budget" value={lead.estimated_budget} />
            </div>
          </div>

          {/* Counselor Assignment */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-teal-700 px-6 py-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Counselor Assignment</h3>
            </div>
            <div className="px-6 py-2">
              <DetailRow label="Assigned Counselor" value={lead.counselor_name} />
            </div>
          </div>

          {/* Section 6: Counsellor Notes */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-violet-600 px-6 py-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Counsellor Notes</h3>
            </div>
            <div className="px-6 py-4">
              <div className="text-sm font-semibold text-gray-900 whitespace-pre-line leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-100">
                {lead.counsellor_notes && lead.counsellor_notes.trim() !== ''
                  ? lead.counsellor_notes
                  : 'No counsellor recommendations/eligibility notes recorded.'}
              </div>
            </div>
          </div>

        </div>

      </div>

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
