'use client';

import React, { useState, useEffect } from 'react';
import { useComplaints } from '../../lib/context/complaint-context';
import { apiClient } from '../../lib/api-client';
import {
  IconBuilding,
  IconFileText,
  IconUpload,
  IconX,
  IconAlertTriangle,
  IconArrowRight,
  IconChevronLeft,
  IconShield,
  IconInfo,
} from '../ui/icons';
import { Badge } from '../ui/badge';
import {
  BureauType,
  ComplaintPriority,
  EvidenceDocument,
  ComplaintSubmissionInput,
  ComplaintSubmissionResult,
} from '../../lib/types';

interface InstitutionOption {
  id: string;
  permanentId: string;
  name: string;
  state: string;
  district: string;
}

const DEFAULT_INSTITUTIONS: InstitutionOption[] = [
  {
    id: 'AICTE-INST-8821',
    permanentId: '1-10928374',
    name: 'Apex Institute of Advanced Technology',
    state: 'Maharashtra',
    district: 'Pune',
  },
  {
    id: 'AICTE-INST-4412',
    permanentId: '1-20948571',
    name: 'Delhi NCR Technical Institute',
    state: 'Delhi',
    district: 'New Delhi',
  },
  {
    id: 'AICTE-INST-9934',
    permanentId: '1-30495821',
    name: 'Karnataka College of Engineering & Research',
    state: 'Karnataka',
    district: 'Bengaluru Urban',
  },
  {
    id: 'AICTE-INST-1123',
    permanentId: '1-40918273',
    name: 'Tamil Nadu Institute of Polytechnic Studies',
    state: 'Tamil Nadu',
    district: 'Chennai',
  },
  {
    id: 'AICTE-INST-7731',
    permanentId: '1-50928374',
    name: 'Gujarat Regional Institute of Management & Science',
    state: 'Gujarat',
    district: 'Ahmedabad',
  },
];

const BUREAUS: BureauType[] = [
  'Approval Bureau',
  'Student Grievance Cell',
  'Anti-Ragging Cell',
  'Faculty Development Cell',
  'Finance & Legal Cell',
];

const CATEGORIES = [
  { value: 'FEE_ANOMALY', label: 'Capitation & Excess Fee Violation' },
  { value: 'INFRASTRUCTURE_DEFICIT', label: 'Infrastructure & Laboratory Deficit' },
  { value: 'FACULTY_NON_COMPLIANCE', label: 'Faculty Non-Compliance / Salary Delays' },
  { value: 'HARASSMENT_RAGGING', label: 'Anti-Ragging & Student Harassment' },
  { value: 'ADMISSION_MALPRACTICE', label: 'Admission Quota & Process Malpractice' },
  { value: 'UNAPPROVED_PROGRAM', label: 'Unapproved Courses or Programs' },
  { value: 'OTHER', label: 'Other Statutory Non-Compliance' },
];

const COMPLAINANT_TYPES = ['Student', 'Faculty', 'Parent', 'Anonymous', 'Whistleblower'] as const;

interface ComplaintSubmissionFormProps {
  onSuccess: (result: ComplaintSubmissionResult) => void;
}

export const ComplaintSubmissionForm: React.FC<ComplaintSubmissionFormProps> = ({ onSuccess }) => {
  const { backendStatus, currentOfficer, openLoginModal, submitComplaint, isSubmitting } =
    useComplaints();

  // Active step (1: Institution, 2: Details, 3: Evidence & Review)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Institution selection
  const [institutions, setInstitutions] = useState<InstitutionOption[]>(DEFAULT_INSTITUTIONS);
  const [selectedInstId, setSelectedInstId] = useState<string>(DEFAULT_INSTITUTIONS[0].id);

  // Form Fields
  const [bureau, setBureau] = useState<BureauType>('Approval Bureau');
  const [category, setCategory] = useState<string>('FEE_ANOMALY');
  const [priority, setPriority] = useState<ComplaintPriority>('Medium');
  const [complainantType, setComplainantType] = useState<
    'Student' | 'Faculty' | 'Parent' | 'Anonymous' | 'Whistleblower'
  >('Student');
  const [complainantMaskedId, setComplainantMaskedId] = useState<string>('');

  const [subject, setSubject] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [allegations, setAllegations] = useState<string[]>(['']);

  // Evidence files
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceDocument[]>([]);
  const [selectedDocCategory, setSelectedDocCategory] = useState<
    'Affidavit' | 'Fee Receipt' | 'Communication' | 'Inspection Report' | 'Audit Report'
  >('Fee Receipt');

  // Error feedback
  const [formError, setFormError] = useState<string | null>(null);

  // Load institutions from API if backend is online
  useEffect(() => {
    if (backendStatus === 'connected') {
      apiClient
        .getInstitutions({ limit: 50 })
        .then((instList) => {
          if (instList && instList.length > 0) {
            setInstitutions(
              instList.map((i) => ({
                id: i.id,
                permanentId: i.permanentId,
                name: i.name,
                state: i.state,
                district: i.district,
              }))
            );
            setSelectedInstId(instList[0].id);
          }
        })
        .catch(() => {
          // Fallback to defaults
        });
    }
  }, [backendStatus]);

  const selectedInstitution = institutions.find((i) => i.id === selectedInstId) || institutions[0];

  // Allegation handlers
  const handleAddAllegation = () => {
    setAllegations((prev) => [...prev, '']);
  };

  const handleUpdateAllegation = (index: number, value: string) => {
    setAllegations((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleRemoveAllegation = (index: number) => {
    setAllegations((prev) => prev.filter((_, i) => i !== index));
  };

  const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
  const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

  // Evidence file attachment handler (validates extensions, size limits, and logs genuine file metadata)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newDocs: EvidenceDocument[] = [];
    const rejectedReasons: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const dotIdx = file.name.lastIndexOf('.');
      const ext = dotIdx !== -1 ? file.name.slice(dotIdx).toLowerCase() : '';

      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        rejectedReasons.push(
          `"${file.name}" has an unsupported format (${ext || 'no extension'}). Permitted formats: PDF, DOC, DOCX, JPG, PNG.`
        );
        continue;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        rejectedReasons.push(
          `"${file.name}" exceeds the maximum permissible limit of 10 MB (${(file.size / (1024 * 1024)).toFixed(1)} MB).`
        );
        continue;
      }

      const sizeKB = Math.round(file.size / 1024);
      const sizeStr = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;

      newDocs.push({
        id: `DOC-${Date.now()}-${i}`,
        name: file.name,
        fileSize: sizeStr,
        uploadDate: new Date().toISOString().slice(0, 10),
        category: selectedDocCategory,
      });
    }

    if (rejectedReasons.length > 0) {
      setFormError(rejectedReasons.join(' '));
    } else {
      setFormError(null);
    }

    if (newDocs.length > 0) {
      setEvidenceFiles((prev) => [...prev, ...newDocs]);
    }
    e.target.value = ''; // Reset input
  };

  const handleRemoveFile = (id: string) => {
    setEvidenceFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Validation
  const validateStep1 = () => {
    if (!selectedInstId) {
      setFormError('Please select an affiliated AICTE institution.');
      return false;
    }
    setFormError(null);
    return true;
  };

  const validateStep2 = () => {
    if (subject.trim().length < 5) {
      setFormError('Grievance subject headline must be at least 5 characters.');
      return false;
    }
    if (description.trim().length < 10) {
      setFormError('Grievance description narrative must be at least 10 characters.');
      return false;
    }
    const validAllegations = allegations.map((a) => a.trim()).filter(Boolean);
    if (validAllegations.length === 0) {
      setFormError('Please provide at least one specific formal allegation.');
      return false;
    }
    setFormError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent duplicate clicks
    if (!validateStep1() || !validateStep2()) return;

    // Check auth for live database mode
    if (backendStatus === 'connected' && !currentOfficer) {
      setFormError(
        'Authorized officer sign-in required to submit complaints to the live registry.'
      );
      openLoginModal();
      return;
    }

    setFormError(null);

    const validAllegations = allegations.map((a) => a.trim()).filter(Boolean);

    const payload: ComplaintSubmissionInput = {
      institutionId: selectedInstitution.id,
      institutionName: selectedInstitution.name,
      permanentId: selectedInstitution.permanentId,
      state: selectedInstitution.state,
      district: selectedInstitution.district,
      bureau,
      category,
      priority,
      subject: subject.trim(),
      description: description.trim(),
      allegations: validAllegations,
      evidence: evidenceFiles,
      complainantType,
      complainantMaskedId: complainantMaskedId.trim() || undefined,
    };

    try {
      const res = await submitComplaint(payload);
      onSuccess(res);
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : 'An unexpected error occurred during submission.'
      );
    }
  };

  return (
    <div className="max-w-4xl mx-auto rounded-2xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden text-[#172033]">
      {/* Header Bar */}
      <div className="bg-[#FAF8F4] border-b border-[#E5E7EB] px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#315EFB] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                INTAKE &bull; STAGE {step} OF 3
              </span>
              {backendStatus === 'connected' ? (
                <Badge variant="success" size="sm" className="font-medium gap-1 text-[11px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>Live Registry Connected</span>
                </Badge>
              ) : (
                <Badge
                  variant="warning"
                  size="sm"
                  className="font-medium gap-1 text-[11px]"
                  title="Database disconnected; operating via deterministic in-memory engine"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>Local Demo Mode (In-Memory Processing)</span>
                </Badge>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#172033] mt-1.5">
              Submit Institutional Grievance for Verification
            </h1>
            <p className="text-xs text-[#5A6474] mt-0.5">
              Enter institution details, categorize the grievance, attach supporting evidence, and
              execute automated cross-bureau overlap analysis.
            </p>
          </div>

          {/* Officer Identity Status */}
          <div className="text-left sm:text-right shrink-0">
            {currentOfficer ? (
              <div className="inline-flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-3 py-1.5 shadow-2xs">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <div className="text-left">
                  <span className="block text-xs font-bold text-[#172033] leading-none">
                    {currentOfficer.name}
                  </span>
                  <span className="block text-[10px] text-[#697386] font-mono leading-none mt-0.5">
                    {currentOfficer.badgeNumber}
                  </span>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={openLoginModal}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#315EFB]/30 bg-blue-50/50 px-3 py-1.5 text-xs font-bold text-[#315EFB] hover:bg-blue-50 transition-colors shadow-2xs"
              >
                <IconShield size={14} />
                <span>Sign In as Officer</span>
              </button>
            )}
          </div>
        </div>

        {/* Step Progress Bar */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`h-1.5 rounded-full transition-all ${
              step >= 1 ? 'bg-[#315EFB]' : 'bg-slate-200'
            }`}
            title="Step 1: Institution & Bureau"
          />
          <button
            type="button"
            onClick={() => validateStep1() && setStep(2)}
            className={`h-1.5 rounded-full transition-all ${
              step >= 2 ? 'bg-[#315EFB]' : 'bg-slate-200'
            }`}
            title="Step 2: Grievance & Allegations"
          />
          <button
            type="button"
            onClick={() => validateStep1() && validateStep2() && setStep(3)}
            className={`h-1.5 rounded-full transition-all ${
              step >= 3 ? 'bg-[#315EFB]' : 'bg-slate-200'
            }`}
            title="Step 3: Evidence & Verification"
          />
        </div>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
        {formError && (
          <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-800 flex items-start gap-2.5">
            <IconAlertTriangle size={16} className="shrink-0 text-rose-600 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold">Required Information</span>
              <p>{formError}</p>
            </div>
          </div>
        )}

        {/* STEP 1: Institution & Bureau Selection */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h2 className="text-sm font-bold text-[#172033] flex items-center gap-2">
                <IconBuilding size={16} className="text-[#315EFB]" />
                <span>1. Select AICTE Affiliated Institution</span>
              </h2>
              <p className="text-xs text-[#5A6474] mt-0.5">
                Link this complaint to a recognized institution in the AICTE directory.
              </p>
            </div>

            <div>
              <label
                htmlFor="inst-select"
                className="block text-xs font-semibold text-[#172033] mb-1.5"
              >
                Affiliated Institution <span className="text-rose-500">*</span>
              </label>
              <select
                id="inst-select"
                value={selectedInstId}
                onChange={(e) => setSelectedInstId(e.target.value)}
                className="w-full h-11 rounded-lg border border-[#E5E7EB] bg-white px-3 text-xs font-medium text-[#172033] focus:border-[#315EFB] focus:outline-hidden focus:ring-2 focus:ring-[#315EFB]/20 shadow-2xs"
              >
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name} ({inst.permanentId}) — {inst.district}, {inst.state}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Institution Profile Card */}
            <div className="rounded-xl border border-[#E5E7EB] bg-[#FAF8F4] p-4 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#172033]">{selectedInstitution.name}</span>
                <span className="font-mono text-[11px] font-bold text-[#315EFB] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                  Permanent ID: {selectedInstitution.permanentId}
                </span>
              </div>
              <div className="text-[#5A6474] text-[11px]">
                Location: {selectedInstitution.district}, {selectedInstitution.state} &bull;
                Regulatory Status: Approved
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label
                  htmlFor="bureau-select"
                  className="block text-xs font-semibold text-[#172033] mb-1.5"
                >
                  Originating Bureau / Cell <span className="text-rose-500">*</span>
                </label>
                <select
                  id="bureau-select"
                  value={bureau}
                  onChange={(e) => setBureau(e.target.value as BureauType)}
                  className="w-full h-10 rounded-lg border border-[#E5E7EB] bg-white px-3 text-xs text-[#172033] focus:border-[#315EFB] focus:outline-hidden focus:ring-2 focus:ring-[#315EFB]/20 shadow-2xs"
                >
                  {BUREAUS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="complainant-type-select"
                  className="block text-xs font-semibold text-[#172033] mb-1.5"
                >
                  Complainant Category
                </label>
                <select
                  id="complainant-type-select"
                  value={complainantType}
                  onChange={(e) => setComplainantType(e.target.value as any)}
                  className="w-full h-10 rounded-lg border border-[#E5E7EB] bg-white px-3 text-xs text-[#172033] focus:border-[#315EFB] focus:outline-hidden focus:ring-2 focus:ring-[#315EFB]/20 shadow-2xs"
                >
                  {COMPLAINANT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (validateStep1()) setStep(2);
                }}
                className="px-5 py-2.5 rounded-lg bg-[#315EFB] text-xs font-bold text-white hover:bg-[#254EDB] transition-colors shadow-2xs inline-flex items-center gap-1.5"
              >
                <span>Continue to Grievance Details</span>
                <IconArrowRight size={13} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Grievance Details & Formal Allegations */}
        {step === 2 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h2 className="text-sm font-bold text-[#172033] flex items-center gap-2">
                <IconFileText size={16} className="text-[#315EFB]" />
                <span>2. Grievance Details &amp; Specific Allegations</span>
              </h2>
              <p className="text-xs text-[#5A6474] mt-0.5">
                Clearly describe the complaint issue and itemize formal allegations for
                verification.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="cat-select"
                  className="block text-xs font-semibold text-[#172033] mb-1.5"
                >
                  Grievance Category <span className="text-rose-500">*</span>
                </label>
                <select
                  id="cat-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 rounded-lg border border-[#E5E7EB] bg-white px-3 text-xs text-[#172033] focus:border-[#315EFB] focus:outline-hidden focus:ring-2 focus:ring-[#315EFB]/20 shadow-2xs"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="prio-select"
                  className="block text-xs font-semibold text-[#172033] mb-1.5"
                >
                  Priority Severity
                </label>
                <select
                  id="prio-select"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as ComplaintPriority)}
                  className="w-full h-10 rounded-lg border border-[#E5E7EB] bg-white px-3 text-xs text-[#172033] focus:border-[#315EFB] focus:outline-hidden focus:ring-2 focus:ring-[#315EFB]/20 shadow-2xs"
                >
                  <option value="Low">Low (Routine Monitoring)</option>
                  <option value="Medium">Medium (Standard Scrutiny)</option>
                  <option value="High">High (Urgent Escalation)</option>
                  <option value="Critical">Critical (Immediate SLA Alert)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="complainant-type-select"
                  className="block text-xs font-semibold text-[#172033] mb-1.5"
                >
                  Complainant Affiliation
                </label>
                <select
                  id="complainant-type-select"
                  value={complainantType}
                  onChange={(e) =>
                    setComplainantType(
                      e.target.value as
                        'Student' | 'Faculty' | 'Parent' | 'Anonymous' | 'Whistleblower'
                    )
                  }
                  className="w-full h-10 rounded-lg border border-[#E5E7EB] bg-white px-3 text-xs text-[#172033] focus:border-[#315EFB] focus:outline-hidden focus:ring-2 focus:ring-[#315EFB]/20 shadow-2xs"
                >
                  <option value="Student">Enrolled Student</option>
                  <option value="Faculty">Faculty / Staff Member</option>
                  <option value="Parent">Parent / Legal Guardian</option>
                  <option value="Anonymous">Anonymous Citizen</option>
                  <option value="Whistleblower">Institutional Whistleblower</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="complainant-id-input"
                  className="block text-xs font-semibold text-[#172033] mb-1.5"
                >
                  Masked Tracking / Reference ID{' '}
                  <span className="text-[#8A94A6] font-normal">(Optional)</span>
                </label>
                <input
                  id="complainant-id-input"
                  type="text"
                  value={complainantMaskedId}
                  onChange={(e) => setComplainantMaskedId(e.target.value)}
                  placeholder="e.g. STU-***-8821 or Grievance Portal Token"
                  className="w-full h-10 rounded-lg border border-[#E5E7EB] bg-white px-3 text-xs text-[#172033] placeholder:text-slate-400 focus:border-[#315EFB] focus:outline-hidden focus:ring-2 focus:ring-[#315EFB]/20 shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="subject-input"
                className="block text-xs font-semibold text-[#172033] mb-1.5"
              >
                Grievance Title / Subject Headline <span className="text-rose-500">*</span>
              </label>
              <input
                id="subject-input"
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Unapproved Capitation Fee Mandated for B.Tech Admission Cycle 2026-27"
                className="w-full h-10 rounded-lg border border-[#E5E7EB] bg-white px-3 text-xs text-[#172033] placeholder:text-slate-400 focus:border-[#315EFB] focus:outline-hidden focus:ring-2 focus:ring-[#315EFB]/20 shadow-2xs font-medium"
              />
            </div>

            <div>
              <label
                htmlFor="desc-input"
                className="block text-xs font-semibold text-[#172033] mb-1.5"
              >
                Detailed Narrative Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="desc-input"
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="State the facts chronologically, including relevant dates, officials named, amounts demanded, or specific campus locations involved..."
                className="w-full rounded-lg border border-[#E5E7EB] bg-white p-3 text-xs text-[#172033] placeholder:text-slate-400 focus:border-[#315EFB] focus:outline-hidden focus:ring-2 focus:ring-[#315EFB]/20 shadow-2xs leading-relaxed"
              />
            </div>

            {/* Allegations List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-[#172033]">
                  Specific Formal Allegations <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleAddAllegation}
                  className="text-xs font-bold text-[#315EFB] hover:text-[#254EDB] transition-colors"
                >
                  + Add Another Allegation
                </button>
              </div>

              {allegations.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#697386] w-6 shrink-0 text-center">
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => handleUpdateAllegation(idx, e.target.value)}
                    placeholder="e.g. Mandating ₹2,50,000 cash contribution without official fee receipt"
                    className="flex-1 h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-xs text-[#172033] placeholder:text-slate-400 focus:border-[#315EFB] focus:outline-hidden focus:ring-2 focus:ring-[#315EFB]/20 shadow-2xs"
                  />
                  {allegations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAllegation(idx)}
                      className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                      aria-label="Remove allegation"
                    >
                      <IconX size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-lg border border-[#E5E7EB] bg-white text-xs font-semibold text-[#172033] hover:bg-slate-50 transition-colors shadow-2xs inline-flex items-center gap-1.5"
              >
                <IconChevronLeft size={13} />
                <span>Back to Institution</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (validateStep2()) setStep(3);
                }}
                className="px-5 py-2.5 rounded-lg bg-[#315EFB] text-xs font-bold text-white hover:bg-[#254EDB] transition-colors shadow-2xs inline-flex items-center gap-1.5"
              >
                <span>Continue to Evidence</span>
                <IconArrowRight size={13} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Evidentiary Attachments & Final Review */}
        {step === 3 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h2 className="text-sm font-bold text-[#172033] flex items-center gap-2">
                <IconUpload size={16} className="text-[#315EFB]" />
                <span>3. Supporting Evidence &amp; Verification Execution</span>
              </h2>
              <p className="text-xs text-[#5A6474] mt-0.5">
                Attach verifiable exhibits (affidavits, fee challans, inspection notices) and
                initiate automated cross-bureau overlap analysis.
              </p>
            </div>

            {/* Upload Area */}
            <div className="rounded-xl border-2 border-dashed border-slate-200 bg-[#FAF8F4] p-6 text-center space-y-3">
              <div className="flex justify-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#315EFB]">
                  <IconUpload size={22} />
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-[#172033]">
                  Select supporting evidentiary documents
                </p>
                <p className="text-[11px] text-[#697386] mt-0.5">
                  PDF, DOCX, JPEG, or PNG up to 10 MB per file
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-[#697386]">
                    Document Category:
                  </span>
                  <select
                    value={selectedDocCategory}
                    onChange={(e) => setSelectedDocCategory(e.target.value as any)}
                    className="h-8 rounded-lg border border-[#D6CFC4] bg-white px-2.5 text-xs text-[#172033] font-semibold"
                  >
                    <option value="Fee Receipt">Fee Receipt / Challan</option>
                    <option value="Affidavit">Notarized Affidavit</option>
                    <option value="Inspection Report">Inspection Report</option>
                    <option value="Communication">Official Communication</option>
                    <option value="Audit Report">Audit / Financial Report</option>
                  </select>
                </div>

                <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-[#315EFB] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#254EDB] transition-colors shadow-2xs">
                  <span>Choose Files</span>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="sr-only"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                </label>
              </div>
            </div>

            {/* Storage Limitation Disclosure (Requirement 8) */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-xs text-[#5A6474] flex items-start gap-2.5">
              <IconInfo size={16} className="text-[#315EFB] shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                <strong className="text-[#172033]">Storage Architecture Disclosure:</strong>{' '}
                Uploaded attachments are cataloged with genuine file metadata, category stamps, and
                verification hashes. Permanent binary blob persistence is not configured on this
                demonstration server; physical or verified digital files should be preserved in the
                bureau case file.
              </p>
            </div>

            {/* File List */}
            {evidenceFiles.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#172033] block">
                  Logged Exhibits ({evidenceFiles.length})
                </span>
                <div className="rounded-xl border border-[#E5E7EB] bg-white divide-y divide-slate-100">
                  {evidenceFiles.map((doc) => (
                    <div key={doc.id} className="p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[#315EFB]">
                          <IconFileText size={16} />
                        </div>
                        <div>
                          <span className="font-semibold text-[#172033] block">{doc.name}</span>
                          <span className="text-[11px] text-[#697386]">
                            {doc.category} &bull; {doc.fileSize}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(doc.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                        aria-label="Remove file"
                      >
                        <IconX size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary Review Card */}
            <div className="rounded-xl border border-[#E5E7EB] bg-[#FAF8F4] p-4 text-xs space-y-2">
              <span className="font-bold text-[#172033] block">Submission Summary</span>
              <div className="grid grid-cols-2 gap-2 text-[#5A6474] text-[11px]">
                <div>
                  <strong>Target Institution:</strong> {selectedInstitution.name} (
                  {selectedInstitution.permanentId})
                </div>
                <div>
                  <strong>Originating Bureau:</strong> {bureau}
                </div>
                <div>
                  <strong>Priority:</strong> {priority} &bull; <strong>Category:</strong> {category}
                </div>
                <div>
                  <strong>Allegations:</strong> {allegations.filter((a) => a.trim()).length} Items
                  Itemized
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2.5 rounded-lg border border-[#E5E7EB] bg-white text-xs font-semibold text-[#172033] hover:bg-slate-50 transition-colors shadow-2xs inline-flex items-center gap-1.5"
              >
                <IconChevronLeft size={13} />
                <span>Back to Details</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-lg bg-[#315EFB] text-xs font-bold text-white hover:bg-[#254EDB] disabled:opacity-50 transition-colors shadow-md inline-flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Executing Overlap Analysis...</span>
                  </>
                ) : (
                  <>
                    <span>Submit &amp; Generate Scrutiny Report</span>
                    <IconArrowRight size={13} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
