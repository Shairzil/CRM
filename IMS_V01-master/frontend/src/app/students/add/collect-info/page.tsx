'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { InputField } from '@/components/InputField';
import { PhoneInput } from '@/components/PhoneInput';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { ArrowLeft } from 'lucide-react';
import api from '@/lib/api';

interface Employee {
  id: number;
  name: string;
}

interface Counselor {
  id: number;
  name: string;
}

export default function CollectInfoPage() {
  const router = useRouter();

  // Reference lists
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [counselors, setCounselors] = useState<Counselor[]>([]);

  // Personal Information
  const [name, setName] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+880');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Student Source
  const [sourceType, setSourceType] = useState<'employee' | 'social_media'>('employee');
  const [sourceName, setSourceName] = useState('');

  // Study Preferences
  const [preferredCountry, setPreferredCountry] = useState('');
  const [preferredCourse, setPreferredCourse] = useState('');
  const [preferredCourseLevel, setPreferredCourseLevel] = useState('Foundation'); // Dropdown default
  const [preferredIntake, setPreferredIntake] = useState('');

  // Academic Background - SSC / O-Level
  const [sscGpa, setSscGpa] = useState('');
  const [sscYear, setSscYear] = useState('');

  // HSC / A-Level
  const [hscGpa, setHscGpa] = useState('');
  const [hscYear, setHscYear] = useState('');

  // Bachelor's
  const [bachelorSubject, setBachelorSubject] = useState('');
  const [bachelorUniversity, setBachelorUniversity] = useState('');
  const [bachelorCgpa, setBachelorCgpa] = useState('');
  const [bachelorYear, setBachelorYear] = useState('');

  // Master's
  const [masterSubject, setMasterSubject] = useState('');
  const [masterUniversity, setMasterUniversity] = useState('');
  const [masterCgpa, setMasterCgpa] = useState('');
  const [masterYear, setMasterYear] = useState('');

  // English Proficiency
  const [tests, setTests] = useState({
    IELTS: false,
    PTE: false,
    TOEFL: false,
    Duolingo: false,
    None: false,
  });
  const [overallScore, setOverallScore] = useState('');

  // Additional Information
  const [studyGap, setStudyGap] = useState('');
  const [workExperience, setWorkExperience] = useState('');
  const [visaRefusal, setVisaRefusal] = useState('');
  const [estimatedBudget, setEstimatedBudget] = useState('');

  // Counsellor Notes
  const [counsellorNotes, setCounsellorNotes] = useState('');

  // Counselor Name
  const [counselorName, setCounselorName] = useState('');

  // Fetch initial reference lists
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [employeesRes, counselorsRes] = await Promise.all([
          api.get('/employees'),
          api.get('/counselors'),
        ]);
        setEmployees(employeesRes.data);
        setCounselors(counselorsRes.data);
        
        if (counselorsRes.data.length > 0) {
          setCounselorName(counselorsRes.data[0].name);
        }
      } catch (err) {
        console.error('Failed to load reference lists:', err);
      }
    };
    fetchData();
  }, []);

  // Force default choice when source type switches
  useEffect(() => {
    if (sourceType === 'social_media') {
      setSourceName('Facebook');
    } else if (employees.length > 0) {
      setSourceName(employees[0].name);
    } else {
      setSourceName('');
    }
  }, [sourceType, employees]);

  // UI / State helpers
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // CV Upload States & Handlers
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvName, setCvName] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'pdf' && ext !== 'doc' && ext !== 'docx') {
        setErrors((prev) => ({ ...prev, cv: 'Only PDF, DOC, and DOCX files are supported.' }));
        return;
      }
      setErrors((prev) => {
        const { cv, ...rest } = prev;
        return rest;
      });
      setCvFile(file);
      setCvName(file.name);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleCheckboxChange = (test: keyof typeof tests) => {
    setTests((prev) => {
      const updated = { ...prev, [test]: !prev[test] };
      if (test === 'None' && updated.None) {
        return { IELTS: false, PTE: false, TOEFL: false, Duolingo: false, None: true };
      }
      if (test !== 'None' && updated[test]) {
        updated.None = false;
      }
      return updated;
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required.';
    }
    if (!phoneNumber) {
      newErrors.phone = 'WhatsApp Phone Number is required.';
    }
    if (!counselorName) {
      newErrors.counselor = 'Please select a Counselor.';
    }
    if (!sourceName) {
      newErrors.source = 'Source Name must be selected.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    const testTaken = Object.entries(tests)
      .filter(([_, checked]) => checked)
      .map(([name]) => name)
      .join(', ');

    let cvBase64 = '';
    if (cvFile) {
      try {
        cvBase64 = await fileToBase64(cvFile);
      } catch (err) {
        setErrors((prev) => ({ ...prev, cv: 'Failed to read CV document.' }));
        setIsSubmitting(false);
        return;
      }
    }

    const payload = {
      name,
      phone_country_code: phoneCountryCode,
      phone_number: phoneNumber,
      counselor_name: counselorName,
      source_type: sourceType,
      source_name: sourceName,
      preferred_country: preferredCountry,
      preferred_course: preferredCourse,
      preferred_course_level: preferredCourseLevel,
      preferred_intake: preferredIntake,
      ssc_gpa: sscGpa,
      ssc_year: sscYear,
      hsc_gpa: hscGpa,
      hsc_year: hscYear,
      bachelor_subject: bachelorSubject,
      bachelor_university: bachelorUniversity,
      bachelor_cgpa: bachelorCgpa,
      bachelor_year: bachelorYear,
      master_subject: masterSubject,
      master_university: masterUniversity,
      master_cgpa: masterCgpa,
      master_year: masterYear,
      test_taken: testTaken || 'None',
      overall_score: overallScore,
      study_gap: studyGap,
      work_experience: workExperience,
      visa_refusal: visaRefusal,
      estimated_budget: estimatedBudget,
      counsellor_notes: counsellorNotes,
      cv_name: cvFile ? cvFile.name : undefined,
      cv_mime: cvFile ? cvFile.type : undefined,
      cv_data: cvBase64 || undefined,
    };

    try {
      await api.post('/students/info', payload);
      setSuccessMsg('Student information collected and saved successfully!');
      setSuccessModalOpen(true);
    } catch (err: any) {
      const serverMsg = err.response?.data?.message;
      setErrors({
        submit: Array.isArray(serverMsg) ? serverMsg.join(', ') : serverMsg || 'Failed to save student details.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    setName('');
    setPhoneCountryCode('+880');
    setPhoneNumber('');
    if (counselors.length > 0) setCounselorName(counselors[0].name);
    setSourceType('employee');
    if (employees.length > 0) setSourceName(employees[0].name);
    setPreferredCountry('');
    setPreferredCourse('');
    setPreferredCourseLevel('Foundation');
    setPreferredIntake('');
    setSscGpa('');
    setSscYear('');
    setHscGpa('');
    setHscYear('');
    setBachelorSubject('');
    setBachelorUniversity('');
    setBachelorCgpa('');
    setBachelorYear('');
    setMasterSubject('');
    setMasterUniversity('');
    setMasterCgpa('');
    setMasterYear('');
    setTests({ IELTS: false, PTE: false, TOEFL: false, Duolingo: false, None: false });
    setOverallScore('');
    setStudyGap('');
    setWorkExperience('');
    setVisaRefusal('');
    setEstimatedBudget('');
    setCounsellorNotes('');
    setCvFile(null);
    setCvName('');
    setErrors({});
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-xl border border-gray-100 space-y-6 relative animate-in fade-in duration-300">
        
        {/* Top Left Red Back Button */}
        <div className="absolute top-6 left-6">
          <Button
            variant="back"
            onClick={() => router.push('/students/add')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs shadow-md"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back</span>
          </Button>
        </div>

        {/* Brand Header */}
        <div className="pt-8">
          <PageHeader title="Information Collection Form" />
        </div>

        {/* Display submit error */}
        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
            <span className="text-sm font-bold text-red-600">{errors.submit}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-8">
          
          {/* Section 1: Personal Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-blue-600 uppercase tracking-wider pb-1.5 border-b border-gray-100">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Full Name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={errors.name}
                placeholder="Enter student full name"
                required
              />
              <PhoneInput
                label="Phone Number (WhatsApp)"
                countryCodeVal={phoneCountryCode}
                onChangeCountryCode={setPhoneCountryCode}
                phoneNumberVal={phoneNumber}
                onChangePhoneNumber={setPhoneNumber}
                error={errors.phone}
              />
            </div>
          </div>

          {/* Student Source selection */}
          <div className="flex flex-col gap-3 p-4 border border-gray-100 rounded-xl bg-gray-50/50">
            <span className="text-sm font-semibold text-gray-700">Student Source <span className="text-red-500">*</span></span>
            
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                <input
                  type="radio"
                  name="sourceType"
                  checked={sourceType === 'employee'}
                  onChange={() => setSourceType('employee')}
                  className="accent-blue-600 h-4 w-4"
                />
                <span>Employee</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                <input
                  type="radio"
                  name="sourceType"
                  checked={sourceType === 'social_media'}
                  onChange={() => setSourceType('social_media')}
                  className="accent-blue-600 h-4 w-4"
                />
                <span>Social Media</span>
              </label>
            </div>

            <div className="pt-2 border-t border-gray-200 mt-2">
              <span className="text-xs font-bold text-gray-500 block mb-2">
                Select {sourceType === 'employee' ? 'Employee' : 'Platform'}:
              </span>
              
              {sourceType === 'employee' ? (
                <div className="flex flex-wrap gap-3">
                  {employees.map((emp) => (
                    <label key={emp.id} className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold px-2.5 py-1.5 rounded-lg border bg-white shadow-sm hover:border-blue-300">
                      <input
                        type="radio"
                        name="employeeSource"
                        value={emp.name}
                        checked={sourceName === emp.name}
                        onChange={(e) => setSourceName(e.target.value)}
                        className="accent-blue-600 h-3.5 w-3.5"
                      />
                      <span>{emp.name}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="flex gap-4">
                  {['Facebook', 'Instagram', 'LinkedIn'].map((plat) => (
                    <label key={plat} className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold px-2.5 py-1.5 rounded-lg border bg-white shadow-sm hover:border-blue-300">
                      <input
                        type="radio"
                        name="socialSource"
                        value={plat}
                        checked={sourceName === plat}
                        onChange={(e) => setSourceName(e.target.value)}
                        className="accent-blue-600 h-3.5 w-3.5"
                      />
                      <span>{plat}</span>
                    </label>
                  ))}
                </div>
              )}
              {errors.source && <span className="text-xs font-bold text-red-500 mt-1 block">{errors.source}</span>}
            </div>
          </div>

          {/* Section 2: Study Preferences */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-blue-600 uppercase tracking-wider pb-1.5 border-b border-gray-100">
              Study Preferences
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Preferred Country/Countries"
                type="text"
                value={preferredCountry}
                onChange={(e) => setPreferredCountry(e.target.value)}
                placeholder="e.g. USA, Canada, UK"
              />
              <InputField
                label="Preferred Course/Subject"
                type="text"
                value={preferredCourse}
                onChange={(e) => setPreferredCourse(e.target.value)}
                placeholder="e.g. Computer Science"
              />
              <InputField
                label="Preferred Course Level"
                isSelect
                value={preferredCourseLevel}
                onChange={(e) => setPreferredCourseLevel(e.target.value)}
                options={[
                  { value: 'Foundation', label: 'Foundation' },
                  { value: 'Diploma', label: 'Diploma' },
                  { value: 'Bachelor', label: 'Bachelor' },
                  { value: 'Master', label: 'Master' },
                  { value: 'MRes', label: 'MRes' },
                  { value: 'PhD', label: 'PhD' },
                ]}
              />
              <InputField
                label="Preferred Intake"
                type="text"
                value={preferredIntake}
                onChange={(e) => setPreferredIntake(e.target.value)}
                placeholder="e.g. Fall 2026 / Spring 2027"
              />
            </div>
          </div>

          {/* Section 3: Academic Background */}
          <div className="space-y-6">
            <h3 className="text-sm font-extrabold text-blue-600 uppercase tracking-wider pb-1.5 border-b border-gray-100">
              Academic Background
            </h3>

            {/* SSC & HSC rows */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* SSC / O-Level */}
              <div className="p-4 border border-gray-100 rounded-xl bg-gray-50/50 space-y-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">SSC / O-Level</span>
                <div className="grid grid-cols-2 gap-3">
                  <InputField
                    label="GPA"
                    type="text"
                    value={sscGpa}
                    onChange={(e) => setSscGpa(e.target.value)}
                    placeholder="e.g. 5.00"
                  />
                  <InputField
                    label="Year Of Passing"
                    type="text"
                    value={sscYear}
                    onChange={(e) => setSscYear(e.target.value)}
                    placeholder="e.g. 2020"
                  />
                </div>
              </div>

              {/* HSC / A-Level */}
              <div className="p-4 border border-gray-100 rounded-xl bg-gray-50/50 space-y-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">HSC / A-Level</span>
                <div className="grid grid-cols-2 gap-3">
                  <InputField
                    label="GPA"
                    type="text"
                    value={hscGpa}
                    onChange={(e) => setHscGpa(e.target.value)}
                    placeholder="e.g. 5.00"
                  />
                  <InputField
                    label="Year Of Passing"
                    type="text"
                    value={hscYear}
                    onChange={(e) => setHscYear(e.target.value)}
                    placeholder="e.g. 2022"
                  />
                </div>
              </div>
            </div>

            {/* Bachelor's */}
            <div className="p-4 border border-gray-100 rounded-xl bg-gray-50/50 space-y-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Bachelor's Degree</span>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <InputField
                    label="Subject / Dept"
                    type="text"
                    value={bachelorSubject}
                    onChange={(e) => setBachelorSubject(e.target.value)}
                    placeholder="e.g. B.Sc. in CSE"
                  />
                </div>
                <div className="md:col-span-2">
                  <InputField
                    label="University Name"
                    type="text"
                    value={bachelorUniversity}
                    onChange={(e) => setBachelorUniversity(e.target.value)}
                    placeholder="Enter University"
                  />
                </div>
                <InputField
                  label="CGPA / Score"
                  type="text"
                  value={bachelorCgpa}
                  onChange={(e) => setBachelorCgpa(e.target.value)}
                  placeholder="e.g. 3.85"
                />
                <InputField
                  label="Year of Passing"
                  type="text"
                  value={bachelorYear}
                  onChange={(e) => setBachelorYear(e.target.value)}
                  placeholder="e.g. 2026"
                />
              </div>
            </div>

            {/* Master's */}
            <div className="p-4 border border-gray-100 rounded-xl bg-gray-50/50 space-y-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Master's Degree</span>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <InputField
                    label="Subject / Dept"
                    type="text"
                    value={masterSubject}
                    onChange={(e) => setMasterSubject(e.target.value)}
                    placeholder="e.g. MBA"
                  />
                </div>
                <div className="md:col-span-2">
                  <InputField
                    label="University Name"
                    type="text"
                    value={masterUniversity}
                    onChange={(e) => setMasterUniversity(e.target.value)}
                    placeholder="Enter University"
                  />
                </div>
                <InputField
                  label="CGPA / Score"
                  type="text"
                  value={masterCgpa}
                  onChange={(e) => setMasterCgpa(e.target.value)}
                  placeholder="e.g. 3.90"
                />
                <InputField
                  label="Year of Passing"
                  type="text"
                  value={masterYear}
                  onChange={(e) => setMasterYear(e.target.value)}
                  placeholder="e.g. 2028"
                />
              </div>
            </div>
          </div>

          {/* Section 4: English Language Proficiency */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-blue-600 uppercase tracking-wider pb-1.5 border-b border-gray-100">
              English Language Proficiency
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Checkboxes for Test Taken */}
              <div className="flex flex-col gap-1 w-full md:col-span-2">
                <label className="text-sm font-semibold text-gray-700 mb-1">Test Taken</label>
                <div className="flex flex-wrap gap-6 py-1.5 px-3 border border-gray-200 rounded-lg bg-gray-50/50">
                  {['IELTS', 'PTE', 'TOEFL', 'Duolingo', 'None'].map((tName) => (
                    <label key={tName} className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-700">
                      <input
                        type="checkbox"
                        checked={tests[tName as keyof typeof tests]}
                        onChange={() => handleCheckboxChange(tName as keyof typeof tests)}
                        className="accent-blue-600 h-4 w-4 rounded border-gray-300 transition-all cursor-pointer"
                      />
                      <span>{tName}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Overall Score */}
              <div className="md:col-span-2">
                <InputField
                  label="Overall Score & Test Date"
                  type="text"
                  value={overallScore}
                  onChange={(e) => setOverallScore(e.target.value)}
                  placeholder="e.g. IELTS 7.5, Test Date: 12-Dec-2025"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Additional Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-blue-600 uppercase tracking-wider pb-1.5 border-b border-gray-100">
              Additional Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Study Gap (If Any)"
                type="text"
                value={studyGap}
                onChange={(e) => setStudyGap(e.target.value)}
                placeholder="e.g. 2 years (2022-2024)"
              />
              <InputField
                label="Work Experience (If Any)"
                type="text"
                value={workExperience}
                onChange={(e) => setWorkExperience(e.target.value)}
                placeholder="e.g. 1 year as Software Engineer"
              />
              <InputField
                label="Visa Refusal (if any)"
                type="text"
                value={visaRefusal}
                onChange={(e) => setVisaRefusal(e.target.value)}
                placeholder="e.g. Canada (2024)"
              />
              <InputField
                label="Estimated Budget"
                type="text"
                value={estimatedBudget}
                onChange={(e) => setEstimatedBudget(e.target.value)}
                placeholder="e.g. 15,000 USD / Year"
              />
            </div>
            {/* CV Collection */}
            <div className="mt-4 flex flex-col gap-1 w-full">
              <label className="text-sm font-semibold text-gray-700">CV</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  placeholder="No document collected (pdf, doc, docx supported)"
                  value={cvName}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 shadow-sm outline-none text-sm font-medium"
                />
                <input
                  type="file"
                  id="cv-file-input"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  type="button"
                  variant="action"
                  onClick={() => document.getElementById('cv-file-input')?.click()}
                  className="px-4 py-2 text-xs font-bold"
                >
                  Collect
                </Button>
              </div>
              {errors.cv && <span className="text-xs font-bold text-red-500 mt-0.5">{errors.cv}</span>}
            </div>
          </div>

          {/* Counselor Name Selection */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-blue-600 uppercase tracking-wider pb-1.5 border-b border-gray-100">
              Counselor Assignment
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1 w-full">
                <label htmlFor="counselor-select" className="text-sm font-semibold text-gray-700">
                  Counselor Name <span className="text-red-500">*</span>
                </label>
                <select
                  id="counselor-select"
                  value={counselorName}
                  onChange={(e) => setCounselorName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white shadow-sm outline-none transition-all duration-150 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm font-medium"
                >
                  {counselors.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
                {errors.counselor && <span className="text-xs font-bold text-red-500 mt-0.5">{errors.counselor}</span>}
              </div>
            </div>
          </div>

          {/* Section 6: Counsellor Notes */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-blue-600 uppercase tracking-wider pb-1.5 border-b border-gray-100">
              Counsellor Notes
            </h3>
            <div className="flex flex-col gap-1 w-full">
              <label htmlFor="notes-area" className="text-sm font-semibold text-gray-700">
                Eligibility & Recommendations
              </label>
              <textarea
                id="notes-area"
                value={counsellorNotes}
                onChange={(e) => setCounsellorNotes(e.target.value)}
                placeholder="Add eligibility details, course or country suggestions, etc."
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg bg-white shadow-sm outline-none transition-all duration-150 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm font-medium"
              />
            </div>
          </div>

          {/* Form Action Buttons */}
          <div className="flex gap-4 items-center justify-center border-t border-gray-100 pt-6">
            <Button
              type="button"
              variant="action"
              onClick={handleClear}
              className="px-8 py-3 text-sm tracking-wider"
              disabled={isSubmitting}
            >
              Clear
            </Button>
            <Button
              type="submit"
              variant="action"
              className="px-8 py-3 text-sm tracking-wider"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Information'}
            </Button>
          </div>
        </form>

        {/* Success Modal */}
        <Modal
          isOpen={successModalOpen}
          title="Information Saved"
          message={successMsg}
          onConfirm={() => {
            setSuccessModalOpen(false);
            handleClear();
            router.push('/students'); // Route back to students list
          }}
        />

      </div>
    </div>
  );
}
