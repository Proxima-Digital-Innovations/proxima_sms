'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  BookOpen,
  Award,
  Layers,
  ChevronRight,
  Loader2,
  Building,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getActiveCampaignAction, submitApplicationAction } from '@/actions/admission-actions';
import { OLEVEL_POINT_MATRIX, ELDS_STATES, CATCHMENT_STATES } from '@/lib/services/admission-service';

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT - Abuja', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau',
  'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

const OLEVEL_SUBJECTS = [
  'English Language',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Further Mathematics',
  'Agricultural Science',
  'Economics',
  'Civic Education',
  'Geography',
  'Government',
  'Literature in English',
  'Commerce',
  'Financial Accounting',
  'Computer Studies / Data Processing',
];

const OLEVEL_GRADES = ['A1', 'B2', 'B3', 'C4', 'C5', 'C6', 'D7', 'E8', 'F9'];

export default function PublicAdmissionApplyPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loadingCampaign, setLoadingCampaign] = useState(true);
  const [campaign, setCampaign] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    mode: 'UTME' as 'UTME' | 'DIRECT_ENTRY',
    jambRegNumber: '',
    firstName: '',
    lastName: '',
    otherNames: '',
    email: '',
    phone: '',
    gender: 'MALE',
    dateOfBirth: '2007-05-15',
    stateOfOrigin: 'Kano',
    lga: 'Kano Municipal',
    deInstitution: '',
    deQualification: 'ND',
    deGradeOrCgpa: '',
    firstChoiceId: '',
    secondChoiceId: '',
    jambScore: 280,
    jambSubject1: 'Use of English',
    jambScore1: 72,
    jambSubject2: 'Mathematics',
    jambScore2: 70,
    jambSubject3: 'Physics',
    jambScore3: 68,
    jambSubject4: 'Chemistry',
    jambScore4: 70,
    examBody: 'WAEC' as 'WAEC' | 'NECO' | 'NABTEB',
    examYear: 2024,
    examCenterNumber: '428019',
    candidateNumber: '428019042',
    oLevelRows: [
      { subject: 'English Language', grade: 'A1' },
      { subject: 'Mathematics', grade: 'B2' },
      { subject: 'Physics', grade: 'B2' },
      { subject: 'Chemistry', grade: 'B3' },
      { subject: 'Further Mathematics', grade: 'B3' },
      { subject: 'Civic Education', grade: 'A1' },
    ],
  });

  useEffect(() => {
    async function loadCampaign() {
      setLoadingCampaign(true);
      const res = await getActiveCampaignAction();
      if (res.success && res.data) {
        setCampaign(res.data);
        if (res.data.cutOffs && res.data.cutOffs.length > 0) {
          setFormData((prev) => ({
            ...prev,
            firstChoiceId: res.data.cutOffs[0].programId,
            secondChoiceId: res.data.cutOffs[1]?.programId || res.data.cutOffs[0].programId,
          }));
        }
      }
      setLoadingCampaign(false);
    }
    loadCampaign();
  }, []);

  // Compute O'Level points live
  const calculateLiveOLevelPoints = () => {
    const pointsList = formData.oLevelRows.map((r) => OLEVEL_POINT_MATRIX[r.grade] ?? 0);
    const sorted = [...pointsList].sort((a, b) => b - a);
    const top5 = sorted.slice(0, 5);
    const totalPoints = top5.reduce((sum, p) => sum + p, 0);
    const creditsCount = pointsList.filter((p) => p >= 3).length;
    return { totalPoints, creditsCount };
  };

  const { totalPoints: oLevelPoints, creditsCount } = calculateLiveOLevelPoints();

  // Compute Composite Score live
  const computeLiveComposite = () => {
    const jambWeight = (formData.jambScore / 400) * 60;
    const olevelWeight = (oLevelPoints / 40) * 40;
    return Number((jambWeight + olevelWeight).toFixed(2));
  };

  const liveComposite = computeLiveComposite();

  // Determine Quota Preview
  const stateUpper = formData.stateOfOrigin.toUpperCase().trim();
  const quotaType = CATCHMENT_STATES.includes(stateUpper)
    ? 'CATCHMENT (35% Quota)'
    : ELDS_STATES.includes(stateUpper)
    ? 'ELDS (20% Quota - Less Developed State)'
    : 'NATIONAL MERIT (45% Quota)';

  // Quick Persona Fills
  const fillDemoCandidate = (type: 'UTME' | 'DIRECT_ENTRY') => {
    if (type === 'UTME') {
      setFormData((prev) => ({
        ...prev,
        mode: 'UTME',
        jambRegNumber: `202510${Math.floor(100000 + Math.random() * 900000)}AB`,
        firstName: 'Farouq',
        lastName: 'Sanusi',
        otherNames: 'Abdullahi',
        email: `farouq.sanusi.${Date.now().toString().slice(-4)}@example.com`,
        phone: '08034567890',
        gender: 'MALE',
        stateOfOrigin: 'Kano',
        lga: 'Dala',
        jambScore: 292,
        oLevelRows: [
          { subject: 'English Language', grade: 'A1' },
          { subject: 'Mathematics', grade: 'A1' },
          { subject: 'Physics', grade: 'B2' },
          { subject: 'Chemistry', grade: 'B2' },
          { subject: 'Further Mathematics', grade: 'B3' },
          { subject: 'Economics', grade: 'B2' },
        ],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        mode: 'DIRECT_ENTRY',
        jambRegNumber: `202520${Math.floor(100000 + Math.random() * 900000)}DE`,
        firstName: 'Blessing',
        lastName: 'Eze',
        otherNames: 'Ngozi',
        email: `blessing.eze.${Date.now().toString().slice(-4)}@example.com`,
        phone: '08023456789',
        gender: 'FEMALE',
        stateOfOrigin: 'Ebonyi',
        lga: 'Afikpo North',
        deInstitution: 'Federal Polytechnic Nekede',
        deQualification: 'ND Computer Engineering',
        deGradeOrCgpa: 'Distinction (3.65 CGPA)',
        jambScore: 240,
        oLevelRows: [
          { subject: 'English Language', grade: 'B2' },
          { subject: 'Mathematics', grade: 'A1' },
          { subject: 'Physics', grade: 'B2' },
          { subject: 'Chemistry', grade: 'B3' },
          { subject: 'Technical Drawing', grade: 'A1' },
          { subject: 'Civic Education', grade: 'A1' },
        ],
      }));
    }
    toast({
      title: 'Demo Persona Populated',
      description: `Loaded realistic ${type} applicant credentials and O'Level sittings.`,
    });
  };

  const handleGradeChange = (index: number, grade: string) => {
    const updated = [...formData.oLevelRows];
    updated[index].grade = grade;
    setFormData({ ...formData, oLevelRows: updated });
  };

  const handleSubjectChange = (index: number, subject: string) => {
    const updated = [...formData.oLevelRows];
    updated[index].subject = subject;
    setFormData({ ...formData, oLevelRows: updated });
  };

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      if (!campaign) throw new Error('No active admissions campaign found.');
      if (!formData.jambRegNumber.trim()) throw new Error('JAMB Registration Number is required.');
      if (!formData.firstName.trim() || !formData.lastName.trim()) throw new Error('Candidate full name is required.');
      if (creditsCount < 5) {
        throw new Error(`Insufficient credits: NUC CCMAS guidelines require a minimum of 5 O'Level credits (C6 or higher). You currently have ${creditsCount} credits.`);
      }

      const payload = {
        campaignId: campaign.id,
        jambRegNumber: formData.jambRegNumber.trim(),
        mode: formData.mode,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        otherNames: formData.otherNames.trim() || undefined,
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth,
        stateOfOrigin: formData.stateOfOrigin,
        lga: formData.lga,
        deInstitution: formData.mode === 'DIRECT_ENTRY' ? formData.deInstitution : undefined,
        deQualification: formData.mode === 'DIRECT_ENTRY' ? formData.deQualification : undefined,
        deGradeOrCgpa: formData.mode === 'DIRECT_ENTRY' ? formData.deGradeOrCgpa : undefined,
        firstChoiceId: formData.firstChoiceId,
        secondChoiceId: formData.secondChoiceId || undefined,
        jambScore: Number(formData.jambScore),
        jambSubjects: [
          { subject: formData.jambSubject1, score: Number(formData.jambScore1) },
          { subject: formData.jambSubject2, score: Number(formData.jambScore2) },
          { subject: formData.jambSubject3, score: Number(formData.jambScore3) },
          { subject: formData.jambSubject4, score: Number(formData.jambScore4) },
        ],
        oLevelSittings: [
          {
            examBody: formData.examBody,
            examYear: Number(formData.examYear),
            examCenterNumber: formData.examCenterNumber,
            candidateNumber: formData.candidateNumber,
            sittingNumber: 1,
            grades: formData.oLevelRows.map((r) => ({
              subject: r.subject,
              grade: r.grade,
              points: OLEVEL_POINT_MATRIX[r.grade] ?? 0,
            })),
          },
        ],
      };

      const res = await submitApplicationAction(payload);
      if (!res.success) {
        throw new Error(res.error || 'Failed to submit application.');
      }

      setSubmittedData(res.data);
      setCurrentStep(5);
      toast({
        title: 'Application Successfully Registered!',
        description: `Application Number: ${res.data.applicationNumber}`,
      });
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during submission.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Ambient Top Light */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-80 bg-gradient-to-b from-indigo-600/15 via-blue-600/10 to-transparent blur-[120px] pointer-events-none" />

      {/* Top Enterprise Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 p-0.5 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base tracking-wider text-white uppercase">
                  Proxima Admissions Portal
                </span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-[10px] font-mono text-indigo-300 font-bold">
                  2025/2026
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Post-UTME &amp; Direct Entry Screening Hub</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admissions/status"
              className="px-3 py-1.5 rounded-xl border border-slate-700 hover:border-indigo-500/60 text-xs font-semibold text-slate-300 hover:text-white transition-all bg-slate-900/60"
            >
              Check Admission Status
            </Link>
            <Link
              href="/dashboard/admissions"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all shadow-md shadow-indigo-600/20"
            >
              <span>Senate Desk</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 relative z-10 space-y-6">
        
        {/* Banner with 1-Click Demo Fill buttons */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900/80 to-slate-900 border border-indigo-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h2 className="text-base font-extrabold text-white">Post-UTME &amp; JAMB Screening Application</h2>
            </div>
            <p className="text-xs text-slate-300">
              Evaluated under NUC CCMAS 5.0 standards with automated O'Level points &amp; composite aggregate calculation.
            </p>
          </div>

          {/* Quick Fills */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fillDemoCandidate('UTME')}
              className="h-8 text-xs bg-slate-800/80 border-slate-700 hover:border-indigo-400 text-slate-200"
            >
              ⚡ Fill Demo UTME
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fillDemoCandidate('DIRECT_ENTRY')}
              className="h-8 text-xs bg-slate-800/80 border-slate-700 hover:border-emerald-400 text-slate-200"
            >
              ⚡ Fill Demo Direct Entry
            </Button>
          </div>
        </div>

        {/* Wizard Step Progress Tracker */}
        {currentStep < 5 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { num: 1, title: 'Bio & JAMB ID', desc: 'Personal details' },
              { num: 2, title: 'UTME Scores', desc: 'Subject combinations' },
              { num: 3, title: "O'Level Sittings", desc: 'WAEC / NECO grades' },
              { num: 4, title: 'Program & Review', desc: 'Department choices' },
            ].map((step) => {
              const isDone = currentStep > step.num;
              const isCurrent = currentStep === step.num;
              return (
                <div
                  key={step.num}
                  className={`p-3 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-sm shadow-indigo-500/20'
                      : isDone
                      ? 'bg-slate-900/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-900/20 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold">0{step.num}</span>
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <span className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-indigo-400 animate-pulse' : 'bg-slate-700'}`} />
                    )}
                  </div>
                  <h4 className="text-xs font-bold mt-1 truncate">{step.title}</h4>
                  <p className="text-[10px] text-slate-400 hidden sm:block truncate">{step.desc}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="bg-red-950/70 border-red-500/50 text-red-200 rounded-xl">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-xs font-semibold ml-2">{error}</AlertDescription>
          </Alert>
        )}

        {/* ============================================================== */}
        {/* STEP 1: BIODATA & JAMB REGISTRATION DETAILS                    */}
        {/* ============================================================== */}
        {currentStep === 1 && (
          <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl">
            <CardHeader className="pb-4 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-white">Step 1: Bio-Data &amp; Application Mode</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Enter your official JAMB candidate information as registered with JAMB CAPS.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="border-indigo-500/30 text-indigo-300">
                  Step 1 of 4
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              
              {/* Application Mode Selector */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-300">Application Entry Mode</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, mode: 'UTME' })}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      formData.mode === 'UTME'
                        ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-md'
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm">UTME Track</span>
                      <Badge className="bg-indigo-600/30 text-indigo-300 border-0 text-[10px]">100 Level</Badge>
                    </div>
                    <p className="text-[11px] text-slate-400">For secondary school leavers with UTME score.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, mode: 'DIRECT_ENTRY' })}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      formData.mode === 'DIRECT_ENTRY'
                        ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-md'
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm">Direct Entry (DE)</span>
                      <Badge className="bg-emerald-600/30 text-emerald-300 border-0 text-[10px]">200 Level</Badge>
                    </div>
                    <p className="text-[11px] text-slate-400">For ND, HND, IJMB, JUPEB, or NCE graduates.</p>
                  </button>
                </div>
              </div>

              {/* JAMB Reg Number & Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-300">JAMB Registration Number *</Label>
                  <Input
                    placeholder="e.g. 202510849301AB"
                    value={formData.jambRegNumber}
                    onChange={(e) => setFormData({ ...formData, jambRegNumber: e.target.value.toUpperCase() })}
                    className="h-10 bg-slate-800/60 border-slate-700 font-mono text-sm uppercase text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-300">Gender</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(val) => setFormData({ ...formData, gender: val })}
                  >
                    <SelectTrigger className="h-10 bg-slate-800/60 border-slate-700 text-white">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-300">Surname / Last Name *</Label>
                  <Input
                    placeholder="e.g. Sanusi"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="h-10 bg-slate-800/60 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-300">First Name *</Label>
                  <Input
                    placeholder="e.g. Farouq"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="h-10 bg-slate-800/60 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-300">Other Name(s)</Label>
                  <Input
                    placeholder="e.g. Abdullahi"
                    value={formData.otherNames}
                    onChange={(e) => setFormData({ ...formData, otherNames: e.target.value })}
                    className="h-10 bg-slate-800/60 border-slate-700 text-white"
                  />
                </div>
              </div>

              {/* Contact Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-300">Email Address *</Label>
                  <Input
                    type="email"
                    placeholder="applicant@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-10 bg-slate-800/60 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-300">Phone Number *</Label>
                  <Input
                    placeholder="08012345678"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="h-10 bg-slate-800/60 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-300">Date of Birth</Label>
                  <Input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="h-10 bg-slate-800/60 border-slate-700 text-white"
                  />
                </div>
              </div>

              {/* State & LGA (Quota Determinant) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-300">State of Origin</Label>
                    <span className="text-[10px] text-indigo-400 font-mono">{quotaType}</span>
                  </div>
                  <Select
                    value={formData.stateOfOrigin}
                    onValueChange={(val) => setFormData({ ...formData, stateOfOrigin: val })}
                  >
                    <SelectTrigger className="h-10 bg-slate-800/60 border-slate-700 text-white">
                      <SelectValue placeholder="Select State" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white max-h-60">
                      {NIGERIAN_STATES.map((st) => (
                        <SelectItem key={st} value={st}>
                          {st}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-300">Local Government Area (LGA)</Label>
                  <Input
                    placeholder="e.g. Kano Municipal, Zaria, Ikeja"
                    value={formData.lga}
                    onChange={(e) => setFormData({ ...formData, lga: e.target.value })}
                    className="h-10 bg-slate-800/60 border-slate-700 text-white"
                  />
                </div>
              </div>

              {/* Direct Entry Details (If DE mode) */}
              {formData.mode === 'DIRECT_ENTRY' && (
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-4">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                      Direct Entry Prior Academic Credentials
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-300">Previous Institution</Label>
                      <Input
                        placeholder="e.g. YabaTech, Kaduna Poly"
                        value={formData.deInstitution}
                        onChange={(e) => setFormData({ ...formData, deInstitution: e.target.value })}
                        className="h-9 bg-slate-800/70 border-slate-700 text-xs text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-300">Qualification Obtained</Label>
                      <Input
                        placeholder="e.g. ND Computer Science, IJMB 12 pts"
                        value={formData.deQualification}
                        onChange={(e) => setFormData({ ...formData, deQualification: e.target.value })}
                        className="h-9 bg-slate-800/70 border-slate-700 text-xs text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-300">Grade / CGPA</Label>
                      <Input
                        placeholder="e.g. Upper Credit, 3.45 CGPA"
                        value={formData.deGradeOrCgpa}
                        onChange={(e) => setFormData({ ...formData, deGradeOrCgpa: e.target.value })}
                        className="h-9 bg-slate-800/70 border-slate-700 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1 Actions */}
              <div className="flex items-center justify-end pt-4 border-t border-slate-800">
                <Button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="bg-indigo-600 hover:bg-indigo-500 font-bold text-xs gap-1.5"
                >
                  <span>Proceed to UTME Scores</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>

            </CardContent>
          </Card>
        )}

        {/* ============================================================== */}
        {/* STEP 2: UTME EXAMINATION SCORES & SUBJECT BREAKDOWN            */}
        {/* ============================================================== */}
        {currentStep === 2 && (
          <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl">
            <CardHeader className="pb-4 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-white">Step 2: JAMB UTME Subject Breakdown</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Input your four official UTME examination subjects and their respective scores.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="border-indigo-500/30 text-indigo-300">
                  Step 2 of 4
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              
              {/* Overall Aggregate Score Card */}
              <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs text-indigo-300 font-semibold uppercase tracking-wider">
                    Total JAMB Score (Out of 400)
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white">{formData.jambScore}</span>
                    <span className="text-xs text-slate-400">/ 400</span>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={formData.jambScore >= 200 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}>
                    {formData.jambScore >= 200 ? 'High Competitive Band' : 'Baseline Eligibility'}
                  </Badge>
                  <p className="text-[10px] text-slate-400 mt-1">NUC National Cutoff: 140–160</p>
                </div>
              </div>

              {/* 4 JAMB Subjects */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
                  <Label className="text-xs font-bold text-slate-300">Subject 1 (Compulsory)</Label>
                  <Input value="Use of English" disabled className="h-9 bg-slate-800 text-slate-400 text-xs font-semibold" />
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">Score</span>
                    <Input
                      type="number"
                      max={100}
                      value={formData.jambScore1}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setFormData({
                          ...formData,
                          jambScore1: val,
                          jambScore: val + formData.jambScore2 + formData.jambScore3 + formData.jambScore4,
                        });
                      }}
                      className="w-24 h-8 text-right bg-slate-800 text-white font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
                  <Label className="text-xs font-bold text-slate-300">Subject 2</Label>
                  <Input
                    value={formData.jambSubject2}
                    onChange={(e) => setFormData({ ...formData, jambSubject2: e.target.value })}
                    className="h-9 bg-slate-800 text-white text-xs font-semibold"
                  />
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">Score</span>
                    <Input
                      type="number"
                      max={100}
                      value={formData.jambScore2}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setFormData({
                          ...formData,
                          jambScore2: val,
                          jambScore: formData.jambScore1 + val + formData.jambScore3 + formData.jambScore4,
                        });
                      }}
                      className="w-24 h-8 text-right bg-slate-800 text-white font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
                  <Label className="text-xs font-bold text-slate-300">Subject 3</Label>
                  <Input
                    value={formData.jambSubject3}
                    onChange={(e) => setFormData({ ...formData, jambSubject3: e.target.value })}
                    className="h-9 bg-slate-800 text-white text-xs font-semibold"
                  />
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">Score</span>
                    <Input
                      type="number"
                      max={100}
                      value={formData.jambScore3}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setFormData({
                          ...formData,
                          jambScore3: val,
                          jambScore: formData.jambScore1 + formData.jambScore2 + val + formData.jambScore4,
                        });
                      }}
                      className="w-24 h-8 text-right bg-slate-800 text-white font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
                  <Label className="text-xs font-bold text-slate-300">Subject 4</Label>
                  <Input
                    value={formData.jambSubject4}
                    onChange={(e) => setFormData({ ...formData, jambSubject4: e.target.value })}
                    className="h-9 bg-slate-800 text-white text-xs font-semibold"
                  />
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">Score</span>
                    <Input
                      type="number"
                      max={100}
                      value={formData.jambScore4}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setFormData({
                          ...formData,
                          jambScore4: val,
                          jambScore: formData.jambScore1 + formData.jambScore2 + formData.jambScore3 + val,
                        });
                      }}
                      className="w-24 h-8 text-right bg-slate-800 text-white font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  className="border-slate-700 text-slate-300 text-xs gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Bio-data</span>
                </Button>
                <Button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="bg-indigo-600 hover:bg-indigo-500 font-bold text-xs gap-1.5"
                >
                  <span>Proceed to O'Level Sittings</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>

            </CardContent>
          </Card>
        )}

        {/* ============================================================== */}
        {/* STEP 3: O'LEVEL SITTINGS & GRADE POINTS MATRIX                 */}
        {/* ============================================================== */}
        {currentStep === 3 && (
          <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl">
            <CardHeader className="pb-4 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-white">Step 3: Senior School Certificate (O'Level)</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    WAEC, NECO, or NABTEB results with automatic NUC grade points evaluator.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="border-indigo-500/30 text-indigo-300">
                  Step 3 of 4
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">

              {/* Examination Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-300">Exam Body</Label>
                  <Select
                    value={formData.examBody}
                    onValueChange={(val: any) => setFormData({ ...formData, examBody: val })}
                  >
                    <SelectTrigger className="h-9 bg-slate-800 border-slate-700 text-xs text-white">
                      <SelectValue placeholder="Body" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                      <SelectItem value="WAEC">WAEC (WASSCE)</SelectItem>
                      <SelectItem value="NECO">NECO (SSCE)</SelectItem>
                      <SelectItem value="NABTEB">NABTEB (NBC/NTC)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-300">Exam Year</Label>
                  <Input
                    type="number"
                    value={formData.examYear}
                    onChange={(e) => setFormData({ ...formData, examYear: Number(e.target.value) })}
                    className="h-9 bg-slate-800 border-slate-700 text-xs text-white"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-300">Centre Number</Label>
                  <Input
                    placeholder="e.g. 428019"
                    value={formData.examCenterNumber}
                    onChange={(e) => setFormData({ ...formData, examCenterNumber: e.target.value })}
                    className="h-9 bg-slate-800 border-slate-700 text-xs text-white"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-300">Candidate Number</Label>
                  <Input
                    placeholder="e.g. 428019042"
                    value={formData.candidateNumber}
                    onChange={(e) => setFormData({ ...formData, candidateNumber: e.target.value })}
                    className="h-9 bg-slate-800 border-slate-700 text-xs text-white"
                  />
                </div>
              </div>

              {/* Live Point Counter Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Credits (C6+)</span>
                  <p className="text-xl font-bold text-white mt-0.5">{creditsCount} / 6</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Top 5 Grade Points</span>
                  <p className="text-xl font-bold text-emerald-400 mt-0.5">{oLevelPoints} / 40 pts</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">English &amp; Maths</span>
                  <p className="text-xl font-bold text-indigo-400 mt-0.5">Satisfied</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Max Sittings Allowed</span>
                  <p className="text-xl font-bold text-slate-300 mt-0.5">1 of 2 Used</p>
                </div>
              </div>

              {/* Subject & Grade Rows */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-2">
                  <span>Subject Title</span>
                  <span className="w-32 text-right">Grade &amp; Point</span>
                </div>

                {formData.oLevelRows.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/60">
                    <span className="font-mono text-xs text-slate-500 w-6">#{idx + 1}</span>
                    <div className="flex-1">
                      <Select
                        value={row.subject}
                        onValueChange={(val) => handleSubjectChange(idx, val)}
                      >
                        <SelectTrigger className="h-9 bg-slate-800 border-slate-700 text-xs text-white">
                          <SelectValue placeholder="Select Subject" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white max-h-56">
                          {OLEVEL_SUBJECTS.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-28 flex items-center gap-2">
                      <Select
                        value={row.grade}
                        onValueChange={(val) => handleGradeChange(idx, val)}
                      >
                        <SelectTrigger className="h-9 bg-slate-800 border-slate-700 text-xs font-bold text-white">
                          <SelectValue placeholder="Grade" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                          {OLEVEL_GRADES.map((g) => (
                            <SelectItem key={g} value={g}>
                              {g} ({OLEVEL_POINT_MATRIX[g]} pts)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="font-mono text-xs font-bold text-emerald-400 w-8 text-right">
                        {OLEVEL_POINT_MATRIX[row.grade]}p
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(2)}
                  className="border-slate-700 text-slate-300 text-xs gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to UTME Scores</span>
                </Button>
                <Button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="bg-indigo-600 hover:bg-indigo-500 font-bold text-xs gap-1.5"
                >
                  <span>Proceed to Program Selection</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>

            </CardContent>
          </Card>
        )}

        {/* ============================================================== */}
        {/* STEP 4: PROGRAM SELECTION & COMPOSITE PREVIEW                  */}
        {/* ============================================================== */}
        {currentStep === 4 && (
          <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl">
            <CardHeader className="pb-4 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-white">Step 4: Department Selection &amp; Review</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Choose your academic program and review your final institutional composite score.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="border-indigo-500/30 text-indigo-300">
                  Step 4 of 4
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">

              {/* Program Choice Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-300">First Choice Program *</Label>
                  <Select
                    value={formData.firstChoiceId}
                    onValueChange={(val) => setFormData({ ...formData, firstChoiceId: val })}
                  >
                    <SelectTrigger className="h-11 bg-slate-800/80 border-slate-700 text-white font-medium">
                      <SelectValue placeholder="Select First Choice Program" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                      {campaign?.cutOffs?.map((c: any) => (
                        <SelectItem key={c.programId} value={c.programId}>
                          {c.program.name} ({c.program.code}) &bull; Cutoff: {c.minJambScore}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-300">Second Choice Program (Alternate)</Label>
                  <Select
                    value={formData.secondChoiceId}
                    onValueChange={(val) => setFormData({ ...formData, secondChoiceId: val })}
                  >
                    <SelectTrigger className="h-11 bg-slate-800/80 border-slate-700 text-white font-medium">
                      <SelectValue placeholder="Select Second Choice Program" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                      {campaign?.cutOffs?.map((c: any) => (
                        <SelectItem key={c.programId} value={c.programId}>
                          {c.program.name} ({c.program.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Composite Aggregate Breakdown Box */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-900/90 to-slate-900 border border-indigo-500/40 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                      Calculated Composite Aggregate Score
                    </h4>
                  </div>
                  <Badge className="bg-indigo-600/30 text-indigo-200 border-indigo-400/30 text-xs font-mono font-bold">
                    {liveComposite}% OVERALL
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">JAMB Weight (60%)</span>
                    <p className="text-base font-bold text-white">
                      {((formData.jambScore / 400) * 60).toFixed(2)} pts
                    </p>
                    <p className="text-[10px] text-slate-500">From {formData.jambScore} / 400</p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">O'Level Weight (40%)</span>
                    <p className="text-base font-bold text-emerald-400">
                      {((oLevelPoints / 40) * 40).toFixed(2)} pts
                    </p>
                    <p className="text-[10px] text-slate-500">From {oLevelPoints} / 40 points</p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Quota Placement</span>
                    <p className="text-sm font-bold text-indigo-300 truncate">
                      {quotaType.split(' ')[0]}
                    </p>
                    <p className="text-[10px] text-slate-500">State: {formData.stateOfOrigin}</p>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Formula: <code className="font-mono text-indigo-300">(JAMB / 400 * 60) + (O'Level / 40 * 40)</code>. This score will be cross-referenced against the Senate Departmental Cut-off mark for merit, catchment, and ELDS lists.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(3)}
                  className="border-slate-700 text-slate-300 text-xs gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to O'Level</span>
                </Button>
                
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 font-bold text-xs gap-2 px-6 h-11 shadow-lg shadow-indigo-600/30"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Transmitting Application...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Submit Application Slip</span>
                    </>
                  )}
                </Button>
              </div>

            </CardContent>
          </Card>
        )}

        {/* ============================================================== */}
        {/* STEP 5: SUCCESS SLIP & CONFIRMATION                            */}
        {/* ============================================================== */}
        {currentStep === 5 && submittedData && (
          <Card className="bg-slate-900/90 border-emerald-500/40 backdrop-blur-xl shadow-2xl">
            <CardHeader className="text-center pb-4 border-b border-slate-800">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 mx-auto flex items-center justify-center text-emerald-400 mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <CardTitle className="text-2xl font-black text-white">Application Successfully Submitted!</CardTitle>
              <CardDescription className="text-xs text-slate-300 max-w-md mx-auto">
                Your post-UTME screening submission has been registered and queued for Senate ranking.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              
              {/* Slip Summary Box */}
              <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/60 pb-3">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono">Official Application Number</span>
                    <p className="text-lg font-black text-emerald-400 font-mono tracking-wider">
                      {submittedData.applicationNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-mono">JAMB Reg No</span>
                    <p className="text-sm font-bold text-white font-mono">{submittedData.jambRegNumber}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase block">Candidate Name</span>
                    <span className="font-bold text-white">
                      {submittedData.firstName} {submittedData.lastName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase block">JAMB Score</span>
                    <span className="font-bold text-white">{submittedData.jambScore} / 400</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase block">O'Level Points</span>
                    <span className="font-bold text-emerald-400">{submittedData.oLevelAggregate} / 40 pts</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase block">Composite Aggregate</span>
                    <span className="font-bold text-indigo-300">{submittedData.compositeScore}%</span>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 space-y-2 text-xs text-slate-300">
                <h4 className="font-bold text-indigo-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Next Steps &amp; Admissions Timeline:
                </h4>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
                  <li>Your screening application fee of ₦2,000 has been verified and settled.</li>
                  <li>Check your admission status periodically on this portal using your JAMB Registration Number.</li>
                  <li>Ensure your O'Level results are also uploaded directly to the JAMB CAPS portal.</li>
                </ul>
              </div>

              {/* Bottom Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link href="/admissions/status">
                  <Button className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-xs font-bold gap-2">
                    <span>Track Status in Candidate Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => window.print()}
                  className="w-full sm:w-auto border-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Print Acknowledgement Slip
                </Button>
              </div>

            </CardContent>
          </Card>
        )}

      </main>
    </div>
  );
}
