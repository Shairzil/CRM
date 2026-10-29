'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { InputField } from '@/components/InputField';
import { PhoneInput } from '@/components/PhoneInput';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { ArrowLeft, Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface Employee {
  id: number;
  name: string;
}

interface Counselor {
  id: number;
  name: string;
}

function RegisterFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Reference lists
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [counselors, setCounselors] = useState<Counselor[]>([]);

  // Form states (pre-populated if search params exist)
  const [name, setName] = useState(searchParams.get('name') || '');
  const [phoneCountryCode, setPhoneCountryCode] = useState(searchParams.get('phoneCountryCode') || '+880');
  const [phoneNumber, setPhoneNumber] = useState(searchParams.get('phone') || '');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [counselorName, setCounselorName] = useState(searchParams.get('counselor_name') || '');
  const [studyLevel, setStudyLevel] = useState<string>(searchParams.get('level') || 'Bachelor');
  const [sourceType, setSourceType] = useState<'employee' | 'social_media'>((searchParams.get('source_type') as 'employee' | 'social_media') || 'employee');
  const [sourceName, setSourceName] = useState(searchParams.get('source_name') || '');
  const [dateOfOpening, setDateOfOpening] = useState('');
  const [fileOpeningFeeBdt, setFileOpeningFeeBdt] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');
  const [isSourceInitialized, setIsSourceInitialized] = useState(false);


  // Validation / Message states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [registeredStudentId, setRegisteredStudentId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          const paramCounselor = searchParams.get('counselor_name');
          const counselorExists = counselorsRes.data.some((c: Counselor) => c.name === paramCounselor);
          setCounselorName(counselorExists ? (paramCounselor || '') : counselorsRes.data[0].name);
        }
      } catch (err) {
        console.error('Failed to load reference lists:', err);
      }
    };
    fetchData();
  }, [searchParams]);

  // Form Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Student Name is required.';
    } else if (!/^[a-zA-Z\s]+$/.test(name)) {
      newErrors.name = 'Student Name must contain only alphabets and spaces.';
    }

    if (!phoneNumber) {
      newErrors.phone = 'Phone Number is required.';
    } else if (!/^[0-9]+$/.test(phoneNumber)) {
      newErrors.phone = 'Phone Number must contain only numbers.';
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Must be a valid email format.';
    }

    if (!counselorName) {
      newErrors.counselor = 'Please select a Counselor.';
    }

    if (!studyLevel) {
      newErrors.study_level = 'Please select a Study Level.';
    }

    if (!sourceName) {
      newErrors.source = 'Source Name must be selected.';
    }

    if (!dateOfOpening) {
      newErrors.date = 'Date of Opening is required.';
    }

    if (!fileOpeningFeeBdt) {
      newErrors.file_fee = 'File Opening Fee is required.';
    } else if (Number(fileOpeningFeeBdt) < 0) {
      newErrors.file_fee = 'File Opening Fee must be positive.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Force default choice when source type switches
  useEffect(() => {
    if (employees.length === 0) return;

    if (!isSourceInitialized) {
      const paramSourceType = searchParams.get('source_type');
      const paramSourceName = searchParams.get('source_name');
      if (paramSourceType && paramSourceName) {
        setSourceType(paramSourceType as 'employee' | 'social_media');
        setSourceName(paramSourceName);
        setIsSourceInitialized(true);
        return;
      }
      setIsSourceInitialized(true);
    }

    if (sourceType === 'social_media') {
      setSourceName('Facebook');
    } else if (employees.length > 0) {
      setSourceName(employees[0].name);
    } else {
      setSourceName('');
    }
  }, [sourceType, employees, isSourceInitialized, searchParams]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    const payload = {
      name,
      phone_country_code: phoneCountryCode,
      phone_number: phoneNumber,
      email: email.trim() || null,
      counselor_name: counselorName,
      study_level: studyLevel,
      source_type: sourceType,
      source_name: sourceName,
      date_of_opening: dateOfOpening,
      file_opening_fee_bdt: parseFloat(fileOpeningFeeBdt),
      follow_up_date: followUpDate || null,
      follow_up_note: followUpNote || null,
    };


    try {
      const res = await api.post('/students', payload);
      setSuccessMessage(`Student registered successfully! Student ID: ${res.data.student_id}`);
      setRegisteredStudentId(res.data.id);
      setIsSuccessModalOpen(true);
    } catch (err: any) {
      const serverMsg = err.response?.data?.message;
      setErrors({
        submit: Array.isArray(serverMsg) ? serverMsg.join(', ') : serverMsg || 'Registration failed. Check server inputs.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    setName('');
    setPhoneCountryCode('+880');
    setPhoneNumber('');
    setEmail('');
    if (counselors.length > 0) setCounselorName(counselors[0].name);
    setStudyLevel('Bachelor');
    setSourceType('employee');
    if (employees.length > 0) setSourceName(employees[0].name);
    setDateOfOpening('');
    setFileOpeningFeeBdt('');
    setFollowUpDate('');
    setFollowUpNote('');
    setErrors({});
  };


  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-xl border border-gray-100 space-y-6 relative">
      
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
        <PageHeader title="Registration Form" />
      </div>

      {/* Display submit error */}
      {errors.submit && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
          <span className="text-sm font-bold text-red-600">{errors.submit}</span>
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* 1. Student ID placeholder */}
          <InputField
            label="Student ID"
            type="text"
            value=""
            placeholder="Will be generated automatically"
            disabled
            className="bg-gray-50 opacity-75"
          />

          {/* 2. Student Name */}
          <InputField
            label="Student Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            placeholder="Enter student full name"
            required
          />

          {/* 3. Phone Number */}
          <PhoneInput
            label="Phone Number"
            countryCodeVal={phoneCountryCode}
            onChangeCountryCode={setPhoneCountryCode}
            phoneNumberVal={phoneNumber}
            onChangePhoneNumber={setPhoneNumber}
            error={errors.phone}
          />

          {/* 4. Email address */}
          <InputField
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            placeholder="student@example.com"
          />

          {/* 5. Counselor Name — Dropdown from DB */}
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

          {/* 6. Study Level */}
          <InputField
            label="Study Level"
            isSelect
            value={studyLevel}
            onChange={(e) => setStudyLevel(e.target.value)}
            error={errors.study_level}
            options={[
              { value: 'Bachelor', label: 'Bachelor' },
              { value: 'Master', label: 'Master' },
              { value: 'PhD', label: 'PhD' },
              { value: 'Foundation', label: 'Foundation' },
              { value: 'Diploma', label: 'Diploma' },
              { value: 'MRes', label: 'MRes' },
            ]}
            className="md:col-start-1"
            required
          />

          {/* 7. Date of Opening */}
          <InputField
            label="Date of Opening"
            type="date"
            value={dateOfOpening}
            onChange={(e) => setDateOfOpening(e.target.value)}
            error={errors.date}
            className="md:col-start-2 md:row-start-3"
            required
          />

          {/* 8. File Opening Fee (BDT) */}
          <InputField
            label="File Opening Fee (BDT)"
            type="number"
            value={fileOpeningFeeBdt}
            onChange={(e) => setFileOpeningFeeBdt(e.target.value)}
            error={errors.file_fee}
            placeholder="e.g. 5000"
            className="md:col-start-2"
            required
          />

          {/* 9. Follow Up Date */}
          <InputField
            label="Follow Up Date"
            type="date"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
            className="md:col-start-1"
          />

          {/* 9b. Follow Up Notes */}
          <InputField
            label="Follow Up Notes"
            type="text"
            value={followUpNote}
            onChange={(e) => setFollowUpNote(e.target.value)}
            placeholder="Enter follow up notes..."
            className="md:col-start-2"
          />


        </div>

        {/* 10. Source choice (Employee / Social Media radio buttons) */}
        <div className="flex flex-col gap-3 p-4 border border-gray-100 rounded-xl bg-gray-50/50">
          <span className="text-sm font-semibold text-gray-700">Student Source</span>
          
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
            {isSubmitting ? 'Registering...' : 'Register'}
          </Button>
        </div>
      </form>

      {/* Success Modal */}
      <Modal
        isOpen={isSuccessModalOpen}
        title="Registration Successful"
        message={successMessage}
        onConfirm={() => {
          setIsSuccessModalOpen(false);
          handleClear();
          router.push('/students'); // Go back to student info page
        }}
      />

    </div>
  );
}

export default function RegisterStudentPage() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <span className="text-sm font-semibold text-gray-500">Loading form content...</span>
        </div>
      }>
        <RegisterFormContent />
      </Suspense>
    </div>
  );
}
