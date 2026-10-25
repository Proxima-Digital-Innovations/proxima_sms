'use client';

import { DocumentAnnotationStudio } from '@/components/dashboard/grading/document-annotation-studio';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/context/role-context';
import { Button } from '@/components/ui/button';
import {
  Presentation,
  BookOpen,
  Headphones,
  FileText,
  UploadCloud,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  Award,
  Play,
  Pause,
  Download,
  Send,
  PlusCircle,
  Calendar,
  Layers,
  CheckSquare,
  ShieldAlert,
  ShieldCheck,
  ChevronRight,
  Filter
} from 'lucide-react';
import {
  getLecturerStudioData,
  uploadLectureMaterialAction,
  createTertiaryAssignmentAction,
  gradeAssignmentSubmissionAction,
  startLiveVirtualClassAction,
  endLiveVirtualClassAction,
  getActiveLiveClassesAction,
  LiveVirtualClassSession
} from '@/actions/tertiary-classroom-actions';
import { VirtualClassroomModal } from '@/components/dashboard/virtual-class/virtual-classroom-modal';
import { Radio, Video, PhoneOff, Hand, MessageSquare } from 'lucide-react';

export default function LecturerStudioPage() {
  const { role, isLoading: isRoleLoading } = useRole();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'courses' | 'materials' | 'assignments' | 'grading' | 'virtual-class'>('materials');

  // Virtual Classroom State
  const [activeLiveSession, setActiveLiveSession] = useState<LiveVirtualClassSession | null>(null);
  const [isStartingLive, setIsStartingLive] = useState(false);
  const [liveOfferingId, setLiveOfferingId] = useState('');
  const [liveTopic, setLiveTopic] = useState('');
  const [liveProvider, setLiveProvider] = useState<'JITSI' | 'ZOOM' | 'GOOGLE_MEET'>('JITSI');
  const [liveExternalUrl, setLiveExternalUrl] = useState('');
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [liveMessage, setLiveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!isRoleLoading && (role === 'STUDENT' || role === 'PARENT')) {
      router.replace('/dashboard/tertiary/student-hub');
    }
  }, [role, isRoleLoading, router]);

  // Audio Preview State
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Material Upload Form State
  const [uploadOfferingId, setUploadOfferingId] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadWeek, setUploadWeek] = useState(1);
  const [uploadType, setUploadType] = useState<'DOCUMENT' | 'SLIDES' | 'AUDIO_RECORDING'>('AUDIO_RECORDING');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Assignment Creation Form State
  const [asgnOfferingId, setAsgnOfferingId] = useState('');
  const [asgnTitle, setAsgnTitle] = useState('');
  const [asgnDesc, setAsgnDesc] = useState('');
  const [asgnMaxScore, setAsgnMaxScore] = useState(20);
  const [asgnDueDate, setAsgnDueDate] = useState('');
  const [asgnType, setAsgnType] = useState<'ASSIGNMENT' | 'ESSAY_EXAM'>('ASSIGNMENT');
  const [asgnDuration, setAsgnDuration] = useState<number>(60);
  const [asgnAttachment, setAsgnAttachment] = useState<File | null>(null);
  const [isCreatingAsgn, setIsCreatingAsgn] = useState(false);
  const [asgnMessage, setAsgnMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Multi-Question Assessment State
  const [questionMode, setQuestionMode] = useState<'SINGLE' | 'MULTI'>('SINGLE');
  const [multiQuestions, setMultiQuestions] = useState<Array<{ id: string; text: string; points: number }>>([
    { id: '1', text: '', points: 10 },
    { id: '2', text: '', points: 10 }
  ]);

  // Grading Modal / Inline State
  const [gradingSubmission, setGradingSubmission] = useState<any | null>(null);
  const [gradeScore, setGradeScore] = useState<number>(0);
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [isGrading, setIsGrading] = useState(false);
  const [gradeMessage, setGradeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Interactive Rubric State (Accreditation & Structured Scoring)
  const [showRubric, setShowRubric] = useState(false);
  const [showAnnotationStudio, setShowAnnotationStudio] = useState(false);
  const [rubricScores, setRubricScores] = useState<{
    comprehension: number; // 0-4
    accuracy: number;      // 0-4
    methodology: number;   // 0-4
    presentation: number;  // 0-4
  }>({ comprehension: 3, accuracy: 3, methodology: 3, presentation: 3 });


  // Virtual Class Actions
  const handleStartLiveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const offeringId = liveOfferingId || assignedCourses[0]?.offeringId;
    if (!offeringId || !data?.lecturer) {
      setLiveMessage({ type: 'error', text: 'Please select a course offering to launch the virtual class.' });
      return;
    }

    setIsStartingLive(true);
    setLiveMessage(null);

    try {
      const res = await startLiveVirtualClassAction({
        offeringId,
        topic: liveTopic.trim() || 'Live Interactive Class & Q&A Discussion',
        provider: liveProvider,
        externalUrl: liveExternalUrl,
        lecturerId: data.lecturer.id
      });

      if (res.success && res.session) {
        setActiveLiveSession(res.session);
        setShowLiveModal(true);
        setLiveMessage({ type: 'success', text: res.message || 'Live virtual classroom launched!' });
      } else {
        setLiveMessage({ type: 'error', text: res.error || 'Failed to start live class.' });
      }
    } catch (err: any) {
      setLiveMessage({ type: 'error', text: err.message || 'Error starting live class.' });
    } finally {
      setIsStartingLive(false);
    }
  };

  const handleEndLiveClass = async (sessionId: string) => {
    try {
      await endLiveVirtualClassAction(sessionId);
      setActiveLiveSession(null);
      setShowLiveModal(false);
      setLiveMessage({ type: 'success', text: 'Live virtual classroom ended for all participants.' });
    } catch (err: any) {
      console.error('Error ending live class:', err);
    }
  };

  // Calculate weighted score based on selected rubric dimensions
  const applyRubricScore = (updated: typeof rubricScores) => {
    setRubricScores(updated);
    if (!gradingSubmission) return;
    const max = gradingSubmission.maxScore || 20;
    // Total rubric points = 16 (4 dimensions * 4)
    const totalPoints = updated.comprehension + updated.accuracy + updated.methodology + updated.presentation;
    const computedScore = Math.round(((totalPoints / 16) * max) * 10) / 10;
    setGradeScore(computedScore);
    
    // Auto-generate accreditation feedback summary
    const remarks = [
      updated.comprehension >= 3 ? 'Strong theoretical grasp of core principles.' : 'Needs deeper comprehension of course fundamentals.',
      updated.accuracy >= 3 ? 'High analytical accuracy demonstrated in calculations/code.' : 'Mathematical or logic errors observed.',
      updated.methodology >= 3 ? 'Systematic problem-solving methodology.' : 'Methodology lacks structured derivation.',
      updated.presentation >= 3 ? 'Clear technical documentation and clean structure.' : 'Formatting and structural presentation could be improved.'
    ].join(' ');
    setGradeFeedback(remarks);
  };

  // Load Data
  const fetchData = async (staffId?: string) => {
    setLoading(true);
    try {
      const res = await getLecturerStudioData(staffId);
      if (res.success && res.lecturer) {
        setData(res);
        if (!selectedStaffId) {
          setSelectedStaffId(res.lecturer.id);
        }
        if (res.lecturer.assignedCourses?.length > 0 && !uploadOfferingId) {
          setUploadOfferingId(res.lecturer.assignedCourses[0].offeringId);
          setAsgnOfferingId(res.lecturer.assignedCourses[0].offeringId);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStaffSwitch = (newStaffId: string) => {
    setSelectedStaffId(newStaffId);
    fetchData(newStaffId);
  };

  // Audio Preview Toggle
  const toggleAudioPreview = (url: string) => {
    if (previewAudioUrl === url && isPlayingAudio) {
      audioPreviewRef.current?.pause();
      setIsPlayingAudio(false);
    } else {
      setPreviewAudioUrl(url);
      setIsPlayingAudio(true);
      if (audioPreviewRef.current) {
        audioPreviewRef.current.src = url;
        audioPreviewRef.current.play().catch(e => console.warn('Preview error:', e));
      }
    }
  };

  // Upload Material
  const handleUploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadOfferingId || !data?.lecturer) return;

    setIsUploading(true);
    setUploadMessage(null);

    try {
      const formData = new FormData();
      formData.append('offeringId', uploadOfferingId);
      formData.append('title', uploadTitle);
      formData.append('weekNumber', uploadWeek.toString());
      formData.append('materialType', uploadType);
      formData.append('lecturerId', data.lecturer.id);
      if (uploadDesc) formData.append('description', uploadDesc);
      if (uploadFile) formData.append('file', uploadFile);

      const res = await uploadLectureMaterialAction(formData);
      if (res.success) {
        setUploadMessage({ type: 'success', text: res.message || 'Course material published successfully!' });
        setUploadTitle('');
        setUploadDesc('');
        setUploadFile(null);
        setTimeout(() => {
          setUploadMessage(null);
          fetchData(data.lecturer.id);
        }, 1500);
      } else {
        setUploadMessage({ type: 'error', text: res.error || 'Failed to upload material.' });
      }
    } catch (err: any) {
      setUploadMessage({ type: 'error', text: err.message || 'Error uploading material.' });
    } finally {
      setIsUploading(false);
    }
  };

  // Create Assignment
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveOfferingId = asgnOfferingId || (assignedCourses[0]?.offeringId || '');
    if (!effectiveOfferingId || !asgnTitle || !asgnDueDate || !data?.lecturer) {
      setAsgnMessage({ type: 'error', text: 'Please fill in all required fields (Course, Title, Due Date).' });
      return;
    }

    // Compile description if in multi-question mode
    let finalDesc = asgnDesc;
    if (questionMode === 'MULTI') {
      const validQuestions = multiQuestions.filter(q => q.text.trim().length > 0);
      if (validQuestions.length === 0) {
        setAsgnMessage({ type: 'error', text: 'Please enter at least one question in Multi-Question mode.' });
        return;
      }
      const questionsText = validQuestions
        .map((q, idx) => `Question ${idx + 1} (${q.points} Marks):\n${q.text.trim()}`)
        .join('\n\n');
      finalDesc = asgnDesc.trim() 
        ? `${asgnDesc.trim()}\n\n--- EXAMINATION QUESTIONS ---\n${questionsText}`
        : questionsText;
    }

    if (!finalDesc.trim()) {
      setAsgnMessage({ type: 'error', text: 'Please provide instructions or at least one question.' });
      return;
    }

    setIsCreatingAsgn(true);
    setAsgnMessage(null);

    try {
      const formData = new FormData();
      formData.append('courseOfferingId', effectiveOfferingId);
      formData.append('offeringId', effectiveOfferingId);
      formData.append('title', asgnTitle);
      formData.append('description', finalDesc);
      formData.append('maxScore', asgnMaxScore.toString());
      formData.append('dueDate', asgnDueDate);
      formData.append('assessmentType', asgnType);
      if (asgnType === 'ESSAY_EXAM') {
        formData.append('durationMinutes', asgnDuration.toString());
      }
      formData.append('lecturerId', data.lecturer.id);
      if (asgnAttachment) {
        formData.append('attachment', asgnAttachment);
        formData.append('file', asgnAttachment);
      }

      const res = await createTertiaryAssignmentAction(formData);
      if (res.success) {
        setAsgnMessage({ type: 'success', text: res.message || 'Assignment created and published to students!' });
        setAsgnTitle('');
        setAsgnDesc('');
        setAsgnDueDate('');
        setAsgnAttachment(null);
        setTimeout(() => {
          setAsgnMessage(null);
          fetchData(data.lecturer.id);
        }, 1500);
      } else {
        setAsgnMessage({ type: 'error', text: res.error || 'Failed to create assignment.' });
      }
    } catch (err: any) {
      setAsgnMessage({ type: 'error', text: err.message || 'Error creating assignment.' });
    } finally {
      setIsCreatingAsgn(false);
    }
  };

  // Submit Grade
  const handleGradeSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingSubmission || !data?.lecturer) return;

    setIsGrading(true);
    setGradeMessage(null);

    try {
      const res = await gradeAssignmentSubmissionAction(
        gradingSubmission.id,
        gradeScore,
        gradeFeedback,
        data.lecturer.id
      );

      if (res.success) {
        setGradeMessage({ type: 'success', text: res.message || 'Grade recorded!' });
        setTimeout(() => {
          setGradingSubmission(null);
          setGradeMessage(null);
          fetchData(data.lecturer.id);
        }, 1200);
      } else {
        setGradeMessage({ type: 'error', text: res.error || 'Failed to record grade.' });
      }
    } catch (err: any) {
      setGradeMessage({ type: 'error', text: err.message || 'Error grading submission.' });
    } finally {
      setIsGrading(false);
    }
  };

  if (!isRoleLoading && (role === 'STUDENT' || role === 'PARENT')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Faculty &amp; Lecturer Studio Only</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          This portal is reserved for academic faculty and lecturers to upload course materials and grade assignments. Students access lectures and submit assignments through the Student Portal.
        </p>
        <Button onClick={() => router.replace('/dashboard/tertiary/student-hub')} className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium">
          Go to Student Portal &amp; Activities Hub
        </Button>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-muted-foreground font-medium animate-pulse">Loading Lecturer Studio &amp; Course Manager...</p>
      </div>
    );
  }

  const lecturer = data?.lecturer;
  const availableLecturers = data?.availableLecturers || [];
  const assignedCourses = lecturer?.assignedCourses || [];

  // Flatten submissions across all assignments for the grading tab
  const allSubmissions = assignedCourses.flatMap((c: any) =>
    c.assignments.flatMap((a: any) =>
      a.submissions.map((s: any) => ({
        ...s,
        courseCode: c.courseCode,
        assignmentTitle: a.title,
        maxScore: a.maxScore
      }))
    )
  );

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Hidden audio element for preview playback */}
      <audio
        ref={audioPreviewRef}
        onEnded={() => setIsPlayingAudio(false)}
      />

      {/* 1. TOP HEADER & IDENTITY */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-indigo-900 rounded-3xl p-6 md:p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-purple-600/30 border border-purple-400/30 flex items-center justify-center text-white font-bold text-2xl shadow-inner backdrop-blur-sm">
              {lecturer?.fullName?.charAt(0) || 'L'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-mono rounded-full font-bold">
                  {lecturer?.staffCode}
                </span>
                <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs rounded-full font-semibold">
                  {lecturer?.department}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                {lecturer?.fullName}
              </h1>
              <p className="text-slate-300 text-sm mt-1 flex items-center gap-2">
                <Presentation className="w-4 h-4 text-purple-400" />
                Tertiary Course Lecturer Studio &amp; Digital Classroom
              </p>
            </div>
          </div>

          {/* Quick Actions & Demo Switcher */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            {/* Quick Launch Live Virtual Class Button */}
            <button
              onClick={() => setActiveTab('virtual-class')}
              className="px-5 py-3 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-2xl text-xs font-black shadow-xl shadow-rose-950/50 border border-rose-400/40 transition-all flex items-center justify-center gap-2 group active:scale-95 shrink-0"
            >
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
              </span>
              <Radio className="w-4 h-4 text-white animate-pulse" />
              <span>Launch Live Virtual Class</span>
            </button>

            {/* Quick Demo Switcher */}
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
              <label className="block text-[10px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
                Switch Lecturer Profile
              </label>
              <select
                value={lecturer?.id || ''}
                onChange={(e) => handleStaffSwitch(e.target.value)}
                className="bg-slate-800 text-white text-xs font-medium rounded-xl px-3 py-1.5 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400 w-full sm:w-56"
              >
                {availableLecturers.map((l: any) => (
                  <option key={l.id} value={l.id}>
                    {l.staffCode} - {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* METRICS STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/5">
            <div className="text-slate-400 text-xs font-medium">Assigned Courses</div>
            <div className="text-2xl font-black text-white mt-1">
              {lecturer?.totalCourses} <span className="text-xs text-slate-400 font-normal">Active</span>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/5">
            <div className="text-slate-400 text-xs font-medium">Uploaded Materials</div>
            <div className="text-2xl font-black text-purple-300 mt-1">
              {lecturer?.totalMaterials} <span className="text-xs text-slate-400 font-normal">Files</span>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/5">
            <div className="text-slate-400 text-xs font-medium">Audio Lectures Streamed</div>
            <div className="text-2xl font-black text-emerald-300 mt-1 flex items-center gap-1.5">
              <Headphones className="w-5 h-5 text-emerald-400" />
              {lecturer?.totalAudioLectures}
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/5">
            <div className="text-slate-400 text-xs font-medium">Continuous Assessment</div>
            <div className="text-2xl font-black text-amber-300 mt-1">
              {lecturer?.totalAssignments} <span className="text-xs text-slate-400 font-normal">Assignments</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. NAVIGATION TABS (RESPONSIVE WRAP & PROMINENT LIVE CLASS) */}
      <div className="w-full border-b border-border pb-1">
        <div className="flex flex-wrap items-center gap-2">
          {/* TAB 1: LIVE VIRTUAL CLASS (HIGH-VISIBILITY BADGE) */}
          <button
            onClick={() => setActiveTab('virtual-class')}
            className={`py-2.5 px-4 font-bold text-xs rounded-xl transition-all flex items-center gap-2 border ${
              activeTab === 'virtual-class'
                ? 'bg-rose-500 text-white border-rose-600 shadow-md shadow-rose-500/20'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
            }`}
          >
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <Radio className="w-3.5 h-3.5" />
            <span>Live Virtual Class &amp; Real-Time Q&amp;A</span>
            {activeLiveSession && (
              <span className="px-1.5 py-0.2 bg-white text-rose-600 font-mono text-[10px] rounded-full font-black">
                LIVE
              </span>
            )}
          </button>

          {/* TAB 2: NOTES & AUDIO STUDIO */}
          <button
            onClick={() => setActiveTab('materials')}
            className={`py-2.5 px-4 font-semibold text-xs rounded-xl transition-all flex items-center gap-2 border ${
              activeTab === 'materials'
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-card text-muted-foreground hover:text-foreground border-border hover:bg-muted/50'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>Lecture Notes &amp; Audio Studio</span>
          </button>

          {/* TAB 3: ASSIGNMENTS & EXAMS */}
          <button
            onClick={() => setActiveTab('assignments')}
            className={`py-2.5 px-4 font-semibold text-xs rounded-xl transition-all flex items-center gap-2 border ${
              activeTab === 'assignments'
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-card text-muted-foreground hover:text-foreground border-border hover:bg-muted/50'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Assignments &amp; Exams</span>
          </button>

          {/* TAB 4: GRADING CONSOLE */}
          <button
            onClick={() => setActiveTab('grading')}
            className={`py-2.5 px-4 font-semibold text-xs rounded-xl transition-all flex items-center gap-2 border ${
              activeTab === 'grading'
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-card text-muted-foreground hover:text-foreground border-border hover:bg-muted/50'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Grading Console</span>
            <span className="px-1.5 py-0.5 text-[10px] bg-primary/20 text-primary rounded-full font-bold">
              {allSubmissions.filter(s => s.status === 'SUBMITTED').length}
            </span>
          </button>

          {/* TAB 5: STUDENT ROSTERS */}
          <button
            onClick={() => setActiveTab('courses')}
            className={`py-2.5 px-4 font-semibold text-xs rounded-xl transition-all flex items-center gap-2 border ${
              activeTab === 'courses'
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-card text-muted-foreground hover:text-foreground border-border hover:bg-muted/50'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Assigned Courses &amp; Rosters</span>
          </button>
        </div>
      </div>

      {/* 3. TAB CONTENTS */}

      {/* TAB 1: UPLOAD NOTES & AUDIO STUDIO */}
      {activeTab === 'materials' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-1 bg-card p-5 sm:p-6 rounded-3xl border border-border shadow-sm h-fit space-y-4 text-card-foreground">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-primary" />
              Upload Lecture Note / Audio
            </h3>
            <p className="text-xs text-muted-foreground">
              Publish PDF notes, slides, or MP3/M4A audio recordings directly to your enrolled students.
            </p>

            {uploadMessage && (
              <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                uploadMessage.type === 'success' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20' : 'bg-destructive/15 text-destructive border border-destructive/20'
              }`}>
                {uploadMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-destructive" />}
                {uploadMessage.text}
              </div>
            )}

            <form onSubmit={handleUploadMaterial} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Select Course Offering</label>
                <select
                  value={uploadOfferingId}
                  onChange={(e) => setUploadOfferingId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-background text-foreground border border-input rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  {assignedCourses.map((c: any) => (
                    <option key={c.offeringId} value={c.offeringId}>
                      {c.courseCode} - {c.courseTitle}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Material Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setUploadType('AUDIO_RECORDING')}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border flex flex-col items-center gap-1 transition-all ${
                      uploadType === 'AUDIO_RECORDING'
                        ? 'bg-primary/10 border-primary text-primary shadow-sm'
                        : 'bg-background border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <Headphones className="w-4 h-4" />
                    Audio Lecture
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadType('DOCUMENT')}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border flex flex-col items-center gap-1 transition-all ${
                      uploadType === 'DOCUMENT'
                        ? 'bg-primary/10 border-primary text-primary shadow-sm'
                        : 'bg-background border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    PDF Notes
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadType('SLIDES')}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border flex flex-col items-center gap-1 transition-all ${
                      uploadType === 'SLIDES'
                        ? 'bg-primary/10 border-primary text-primary shadow-sm'
                        : 'bg-background border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    Slides
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Lecture Title &amp; Topic</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Week 3: Dynamic Dispatch &amp; Abstract Classes"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full text-xs p-2.5 bg-background text-foreground border border-input rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Week Number</label>
                  <input
                    type="number"
                    min="1"
                    max="16"
                    value={uploadWeek}
                    onChange={(e) => setUploadWeek(parseInt(e.target.value) || 1)}
                    className="w-full text-xs p-2.5 bg-background text-foreground border border-input rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Attach File</label>
                  <input
                    type="file"
                    accept={uploadType === 'AUDIO_RECORDING' ? 'audio/*' : '.pdf,.docx,.pptx'}
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="w-full text-[11px] text-muted-foreground file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-[11px] file:font-semibold file:bg-primary/10 file:text-primary cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Synopsis / Lecture Guide</label>
                <textarea
                  rows={3}
                  placeholder="Outline key learning outcomes, prerequisites, and suggested reading..."
                  value={uploadDesc}
                  onChange={(e) => setUploadDesc(e.target.value)}
                  className="w-full text-xs p-2.5 bg-background text-foreground border border-input rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={isUploading}
                className="w-full py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                    Publishing...
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    Publish to Student Portal
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Published Material List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-card p-5 sm:p-6 rounded-3xl border border-border shadow-sm text-card-foreground">
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Headphones className="w-5 h-5 text-primary" />
                Published Course Materials &amp; Audio Broadcasts
              </h3>

              <div className="space-y-4">
                {assignedCourses.map((course: any) => (
                  <div key={course.offeringId} className="space-y-3">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="font-bold text-foreground text-sm flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-primary/15 text-primary rounded font-mono text-xs">
                          {course.courseCode}
                        </span>
                        {course.courseTitle}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">
                        {course.materials.length} Materials
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {course.materials.map((m: any) => {
                        const isAudio = m.materialType === 'AUDIO_RECORDING';
                        return (
                          <div
                            key={m.id}
                            className={`p-4 rounded-2xl border transition-all ${
                              isAudio ? 'bg-primary/5 border-primary/30' : 'bg-muted/30 border-border'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-background border border-border rounded text-foreground">
                                Week {m.weekNumber || 1}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                isAudio ? 'bg-purple-500/15 text-purple-700 dark:text-purple-400' : 'bg-blue-500/15 text-blue-700 dark:text-blue-400'
                              }`}>
                                {isAudio ? <Headphones className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                                {isAudio ? 'Audio Podcast' : m.materialType}
                              </span>
                            </div>

                            <h5 className="font-bold text-foreground text-xs mb-1 line-clamp-1">{m.title}</h5>
                            <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3">{m.description}</p>

                            <div className="flex items-center justify-between pt-2 border-t border-border/80">
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(m.createdAt).toLocaleDateString()}
                              </span>
                              {isAudio ? (
                                <button
                                  onClick={() => toggleAudioPreview(m.fileUrl)}
                                  className="px-2.5 py-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm"
                                >
                                  {previewAudioUrl === m.fileUrl && isPlayingAudio ? (
                                    <Pause className="w-3 h-3" />
                                  ) : (
                                    <Play className="w-3 h-3" />
                                  )}
                                  Preview Audio
                                </button>
                              ) : (
                                <a
                                  href={m.fileUrl}
                                  download
                                  className="px-2.5 py-1 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-lg text-xs font-semibold flex items-center gap-1"
                                >
                                  <Download className="w-3 h-3" />
                                  File
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {course.materials.length === 0 && (
                        <div className="col-span-2 text-center py-6 text-muted-foreground text-xs italic">
                          No materials uploaded yet for this course.
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CREATE & MANAGE ASSIGNMENTS */}
      {activeTab === 'assignments' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Creator Form */}
          <div className="lg:col-span-1 bg-card p-5 sm:p-6 rounded-3xl border border-border shadow-sm h-fit space-y-4 text-card-foreground">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-primary" />
              Create Online Assignment
            </h3>
            <p className="text-xs text-muted-foreground">
              Set homework, lab tasks, or essays. Enrolled students will be notified and can submit files/text online.
            </p>

            {asgnMessage && (
              <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                asgnMessage.type === 'success' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20' : 'bg-destructive/15 text-destructive border border-destructive/20'
              }`}>
                {asgnMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-destructive" />}
                {asgnMessage.text}
              </div>
            )}

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Course Offering</label>
                <select
                  value={asgnOfferingId || (assignedCourses[0]?.offeringId || '')}
                  onChange={(e) => setAsgnOfferingId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-background text-foreground border border-input rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  {assignedCourses.map((c: any) => (
                    <option key={c.offeringId} value={c.offeringId}>
                      {c.courseCode} - {c.courseTitle}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Assignment Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lab 2: Binary Search Tree Balancing &amp; Traversals"
                  value={asgnTitle}
                  onChange={(e) => setAsgnTitle(e.target.value)}
                  className="w-full text-xs p-2.5 bg-background text-foreground border border-input rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Max Points / Score</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={asgnMaxScore}
                    onChange={(e) => setAsgnMaxScore(parseFloat(e.target.value) || 20)}
                    className="w-full text-xs p-2.5 bg-background text-foreground border border-input rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Due Date &amp; Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={asgnDueDate}
                    onChange={(e) => setAsgnDueDate(e.target.value)}
                    className="w-full text-xs p-2.5 bg-background text-foreground border border-input rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Optional Spec Attachment</label>
                <input
                  type="file"
                  onChange={(e) => setAsgnAttachment(e.target.files?.[0] || null)}
                  className="w-full text-[11px] text-muted-foreground file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-[11px] file:font-semibold file:bg-primary/10 file:text-primary cursor-pointer"
                />
              </div>

              {/* Assessment Type & Timer */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-2xl border border-border">
                <div>
                  <label className="block text-[11px] font-bold text-foreground mb-1">Assessment Mode</label>
                  <select
                    value={asgnType}
                    onChange={(e: any) => setAsgnType(e.target.value)}
                    className="w-full text-xs p-2 bg-background border border-input rounded-xl"
                  >
                    <option value="ASSIGNMENT">Standard Assignment (No Timer)</option>
                    <option value="ESSAY_EXAM">Timed Essay Examination</option>
                  </select>
                </div>
                {asgnType === 'ESSAY_EXAM' ? (
                  <div>
                    <label className="block text-[11px] font-bold text-foreground mb-1">Timer (Minutes)</label>
                    <input
                      type="number"
                      min="5"
                      max="360"
                      value={asgnDuration}
                      onChange={(e) => setAsgnDuration(parseInt(e.target.value) || 60)}
                      className="w-full text-xs p-2 bg-background border border-input rounded-xl"
                    />
                  </div>
                ) : (
                  <div className="flex items-center text-[11px] text-muted-foreground pt-5">
                    Continuous assessment homework.
                  </div>
                )}
              </div>

              {/* Question Format Toggle */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-foreground">Question Format</label>
                  <div className="flex items-center bg-muted p-0.5 rounded-lg text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setQuestionMode('SINGLE')}
                      className={`px-2.5 py-1 rounded-md transition-all ${questionMode === 'SINGLE' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Single Prompt
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuestionMode('MULTI')}
                      className={`px-2.5 py-1 rounded-md transition-all ${questionMode === 'MULTI' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Multiple Questions (Q1, Q2...)
                    </button>
                  </div>
                </div>

                {questionMode === 'SINGLE' ? (
                  <textarea
                    rows={4}
                    required
                    placeholder="Detail the problem statement, deliverables, formatting rules, and grading breakdown..."
                    value={asgnDesc}
                    onChange={(e) => setAsgnDesc(e.target.value)}
                    className="w-full text-xs p-2.5 bg-background text-foreground border border-input rounded-xl focus:ring-2 focus:ring-primary focus:outline-none font-mono"
                  ></textarea>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Optional exam general instructions (e.g. Answer all questions clearly.)"
                      value={asgnDesc}
                      onChange={(e) => setAsgnDesc(e.target.value)}
                      className="w-full text-xs p-2.5 bg-background text-foreground border border-input rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                    />

                    <div className="space-y-2.5">
                      {multiQuestions.map((q, idx) => (
                        <div key={q.id} className="p-3 bg-muted/40 rounded-xl border border-border space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                              Question {idx + 1}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground font-semibold">Points:</span>
                              <input
                                type="number"
                                min="1"
                                max="100"
                                value={q.points}
                                onChange={(e) => {
                                  const pts = parseFloat(e.target.value) || 1;
                                  const updated = [...multiQuestions];
                                  updated[idx].points = pts;
                                  setMultiQuestions(updated);
                                  const total = updated.reduce((acc, cur) => acc + cur.points, 0);
                                  setAsgnMaxScore(total);
                                }}
                                className="w-16 text-xs p-1 text-center bg-background border border-input rounded-lg font-bold"
                              />
                              {multiQuestions.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = multiQuestions.filter((_, i) => i !== idx);
                                    setMultiQuestions(updated);
                                    const total = updated.reduce((acc, cur) => acc + cur.points, 0);
                                    setAsgnMaxScore(total);
                                  }}
                                  className="text-destructive hover:text-destructive/80 text-xs px-1 font-bold"
                                  title="Remove question"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          </div>
                          <textarea
                            rows={2}
                            required
                            placeholder={`Type Question ${idx + 1} prompt here...`}
                            value={q.text}
                            onChange={(e) => {
                              const updated = [...multiQuestions];
                              updated[idx].text = e.target.value;
                              setMultiQuestions(updated);
                            }}
                            className="w-full text-xs p-2 bg-background text-foreground border border-input rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const newQ = { id: String(Date.now()), text: '', points: 5 };
                        const updated = [...multiQuestions, newQ];
                        setMultiQuestions(updated);
                        const total = updated.reduce((acc, cur) => acc + cur.points, 0);
                        setAsgnMaxScore(total);
                      }}
                      className="w-full py-2 bg-muted hover:bg-muted/80 text-foreground border border-dashed border-border rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-primary" />
                      Add Another Question (Question {multiQuestions.length + 1})
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isCreatingAsgn}
                className="w-full py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isCreatingAsgn ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                    Publishing...
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    Publish Assignment Online
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Active Assignments Overview */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-card p-5 sm:p-6 rounded-3xl border border-border shadow-sm text-card-foreground">
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Active Assignments Across Assigned Courses
              </h3>

              <div className="space-y-4">
                {assignedCourses.map((c: any) => (
                  <div key={c.offeringId} className="space-y-3">
                    <span className="font-bold text-foreground text-xs px-2.5 py-1 bg-muted rounded-lg inline-block">
                      {c.courseCode} - {c.courseTitle}
                    </span>

                    {c.assignments.map((a: any) => (
                      <div key={a.id} className="p-4 sm:p-5 rounded-2xl border border-border hover:border-primary/30 bg-card shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                          <h4 className="font-bold text-foreground text-sm">{a.title}</h4>
                          <span className="text-xs font-mono font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                            Max {a.maxScore} pts
                          </span>
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-2 mb-4 whitespace-pre-line bg-muted/40 p-3 rounded-xl border border-border/60">
                          {a.description}
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div className="p-2 bg-muted/30 rounded-lg border border-border/60">
                            <span className="text-muted-foreground block text-[10px]">Due Date</span>
                            <span className="font-semibold text-foreground">{new Date(a.dueDate).toLocaleDateString()}</span>
                          </div>
                          <div className="p-2 bg-muted/30 rounded-lg border border-border/60">
                            <span className="text-muted-foreground block text-[10px]">Submissions</span>
                            <span className="font-bold text-primary">{a.totalSubmissions}</span>
                          </div>
                          <div className="p-2 bg-muted/30 rounded-lg border border-border/60">
                            <span className="text-muted-foreground block text-[10px]">Pending Grading</span>
                            <span className="font-bold text-amber-600 dark:text-amber-400">{a.pendingReview}</span>
                          </div>
                          <div className="p-2 bg-muted/30 rounded-lg border border-border/60">
                            <span className="text-muted-foreground block text-[10px]">Average Score</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{a.averageScore || 0} pts</span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {c.assignments.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">No assignments created yet for this course.</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SUBMISSIONS & GRADING CONSOLE */}
      {activeTab === 'grading' && (
        <div className="space-y-6">
          <div className="bg-card rounded-3xl p-4 sm:p-6 border border-border shadow-sm text-card-foreground">
            <h3 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-primary" />
              Online Submissions &amp; Grading Desk
            </h3>
            <p className="text-xs text-muted-foreground mb-6">
              Inspect student written solutions, download submitted code/zip archives, assign continuous assessment scores, and leave feedback.
            </p>

            <div className="w-full overflow-x-auto scrollbar-none">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Course &amp; Assignment</th>
                    <th className="py-3 px-4">Submission Text / File</th>
                    <th className="py-3 px-4">Submitted At</th>
                    <th className="py-3 px-4">Integrity Telemetry</th>
                    <th className="py-3 px-4 text-center">Score / Grade</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {allSubmissions.map((sub: any) => {
                    const isGraded = sub.status === 'GRADED';
                    return (
                      <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-foreground">{sub.studentName}</div>
                          <div className="font-mono text-muted-foreground text-[11px]">{sub.matricNumber}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-[10px] mr-1">
                            {sub.courseCode}
                          </span>
                          <span className="font-medium text-foreground">{sub.assignmentTitle}</span>
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          {sub.submissionText && (
                            <p className="text-[11px] text-muted-foreground font-mono truncate mb-1">
                              {sub.submissionText}
                            </p>
                          )}
                          {sub.fileUrl && (
                            <a
                              href={sub.fileUrl}
                              download
                              className="text-primary hover:text-primary/80 font-bold inline-flex items-center gap-1 text-[11px]"
                            >
                              <Download className="w-3 h-3" />
                              {sub.fileName || 'Download Submission'}
                            </a>
                          )}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {new Date(sub.submittedAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          {sub.isPasteFlagged || (sub.tabSwitchCount && sub.tabSwitchCount > 0) ? (
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-200 rounded-lg font-bold flex items-center gap-1.5 text-[10px] w-fit">
                              <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              {sub.tabSwitchCount || 0} Tab Strikes &bull; {sub.pasteCount || 0} Pastes
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-lg font-bold flex items-center gap-1.5 text-[10px] w-fit">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              Clean Typed
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isGraded ? (
                            <span className="px-2.5 py-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 rounded-full font-bold">
                              {sub.score} / {sub.maxScore}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20 rounded-full font-bold">
                              Needs Grading
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setGradingSubmission(sub);
                              setGradeScore(sub.score ?? 0);
                              setGradeFeedback(sub.feedback || '');
                            }}
                            className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold shadow-sm transition-all"
                          >
                            {isGraded ? 'Edit Grade' : 'Grade Submission'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {allSubmissions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground italic">
                        No submissions received yet for your assignments.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: REAL-TIME VIRTUAL CLASSROOM STUDIO */}
      {activeTab === 'virtual-class' && (
        <div className="space-y-6">
          {/* Active Live Banner */}
          {activeLiveSession && (
            <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-indigo-950 p-6 rounded-3xl border border-rose-500/40 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <Radio className="w-7 h-7 animate-ping" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 bg-rose-500 text-white rounded-md">
                      ROOM ACTIVE NOW
                    </span>
                    <span className="text-sm font-black text-rose-300">{activeLiveSession.courseCode}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1">{activeLiveSession.topic}</h3>
                  <p className="text-xs text-slate-300">
                    Provider: {activeLiveSession.provider} &bull; Room: <code className="font-mono text-rose-200">{activeLiveSession.roomName}</code>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => setShowLiveModal(true)}
                  className="flex-1 md:flex-none px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-xs font-black shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Video className="w-4 h-4" />
                  Enter Virtual Hall
                </button>
                <button
                  type="button"
                  onClick={() => handleEndLiveClass(activeLiveSession.id)}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <PhoneOff className="w-4 h-4" />
                  End Class
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Launch Virtual Classroom Form */}
            <div className="bg-card p-5 sm:p-6 rounded-3xl border border-border shadow-sm text-card-foreground">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Radio className="w-5 h-5 text-rose-500" />
                Start Live Virtual Session
              </h3>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Conduct live interactive video/audio classes. Remote students can raise hands and ask questions real-time.
              </p>

              {liveMessage && (
                <div className={`p-3.5 rounded-xl text-xs font-semibold mb-4 flex items-center gap-2 ${
                  liveMessage.type === 'success'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-destructive/15 text-destructive border border-destructive/20'
                }`}>
                  {liveMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-destructive" />}
                  {liveMessage.text}
                </div>
              )}

              <form onSubmit={handleStartLiveClass} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Target Course Offering</label>
                  <select
                    value={liveOfferingId || (assignedCourses[0]?.offeringId || '')}
                    onChange={(e) => setLiveOfferingId(e.target.value)}
                    className="w-full text-xs p-2.5 bg-background text-foreground border border-input rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    {assignedCourses.map((c: any) => (
                      <option key={c.offeringId} value={c.offeringId}>
                        {c.courseCode} - {c.courseTitle}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Session Agenda / Topic</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Week 4: Tree Traversals & Live Student Q&A"
                    value={liveTopic}
                    onChange={(e) => setLiveTopic(e.target.value)}
                    className="w-full text-xs p-2.5 bg-background text-foreground border border-input rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Conferencing Engine</label>
                  <select
                    value={liveProvider}
                    onChange={(e: any) => setLiveProvider(e.target.value)}
                    className="w-full text-xs p-2.5 bg-background text-foreground border border-input rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    <option value="JITSI">Proxima In-Browser WebRTC Hall (Zero Install / Free / Encrypted)</option>
                    <option value="ZOOM">External Zoom Meeting Link</option>
                    <option value="GOOGLE_MEET">External Google Meet Link</option>
                  </select>
                </div>

                {liveProvider !== 'JITSI' && (
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">External Meeting URL</label>
                    <input
                      type="url"
                      required
                      placeholder="https://zoom.us/j/123456789 or https://meet.google.com/xyz-abcd"
                      value={liveExternalUrl}
                      onChange={(e) => setLiveExternalUrl(e.target.value)}
                      className="w-full text-xs p-2.5 bg-background text-foreground border border-input rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                )}

                <div className="p-3 bg-muted/40 rounded-xl border border-border text-[11px] text-muted-foreground space-y-1">
                  <div className="font-bold text-foreground flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-rose-500" />
                    How Remote Students Participate:
                  </div>
                  <div>&bull; Students get an instant alert on their portal &amp; phone.</div>
                  <div>&bull; They can unmute to talk or click <strong>Raise Hand (✋)</strong>.</div>
                  <div>&bull; Built-in <strong>Low-Bandwidth Mode</strong> for students on weak 3G/4G connections.</div>
                </div>

                <button
                  type="submit"
                  disabled={isStartingLive}
                  className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isStartingLive ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Broadcasting Room...
                    </>
                  ) : (
                    <>
                      <Radio className="w-4 h-4" />
                      🔴 Launch Live Classroom Now
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Virtual Hall Features & Best Practices */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-card p-5 sm:p-6 rounded-3xl border border-border shadow-sm text-card-foreground">
                <h3 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                  <Video className="w-5 h-5 text-primary" />
                  Remote Student Real-Time Interaction Tools
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/30 rounded-2xl border border-border/60 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                      <Hand className="w-4 h-4 text-amber-500" />
                      Live Hand-Raising Queue
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Remote students click ✋ to raise their hand without interrupting the lecture. You see a clear queue to call on them one by one.
                    </p>
                  </div>

                  <div className="p-4 bg-muted/30 rounded-2xl border border-border/60 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                      <MessageSquare className="w-4 h-4 text-primary" />
                      Upvotable Question Stream
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Students type questions during the class. Fellow students upvote the best questions so you can answer high-priority queries first.
                    </p>
                  </div>

                  <div className="p-4 bg-muted/30 rounded-2xl border border-border/60 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                      <Radio className="w-4 h-4 text-emerald-500" />
                      Low-Data Audio-Priority Stream
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Students in low-connectivity areas can toggle audio-only mode to consume ~90% less data while staying connected live.
                    </p>
                  </div>

                  <div className="p-4 bg-muted/30 rounded-2xl border border-border/60 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                      <Users className="w-4 h-4 text-indigo-500" />
                      Automated Attendance Logs
                    </div>
                    <p className="text-xs text-muted-foreground">
                      System automatically marks students present when they join the virtual hall, synchronizing with the master attendance registry.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LIVE VIRTUAL CLASSROOM HUD */}
      {showLiveModal && activeLiveSession && (
        <VirtualClassroomModal
          session={activeLiveSession}
          currentUser={{
            id: data?.lecturer?.id || 'lecturer',
            name: `${data?.lecturer?.title || 'Dr.'} ${data?.lecturer?.firstName || ''} ${data?.lecturer?.lastName || ''}`.trim(),
            role: 'LECTURER'
          }}
          onClose={() => setShowLiveModal(false)}
          onEndSession={handleEndLiveClass}
        />
      )}

      {/* TAB 4: ASSIGNED COURSES & ROSTERS */}
      {activeTab === 'courses' && (
        <div className="space-y-6">
          <div className="bg-card rounded-3xl p-4 sm:p-6 border border-border shadow-sm text-card-foreground">
            <h3 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Assigned Courses &amp; Enrolled Student Rosters
            </h3>
            <p className="text-xs text-muted-foreground mb-6">
              Direct visibility into all students formally registered for your courses in {lecturer?.assignedCourses?.[0]?.academicSession || '2025/2026'}.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {assignedCourses.map((c: any) => (
                <div key={c.offeringId} className="border border-border rounded-2xl p-5 bg-muted/20">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 bg-primary text-primary-foreground rounded">
                        {c.courseCode}
                      </span>
                      <h4 className="font-bold text-foreground text-sm mt-1">{c.courseTitle}</h4>
                    </div>
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                      {c.enrolledCount} Enrolled
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2 mt-4 pr-1">
                    {c.students?.map((s: any) => (
                      <div key={s.studentId} className="bg-card p-2.5 rounded-xl border border-border/60 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold text-foreground">{s.name}</div>
                          <div className="font-mono text-muted-foreground text-[10px]">{s.matricNumber}</div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 rounded font-semibold">
                          Active Enrolled
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. INLINE GRADING MODAL */}
      {gradingSubmission && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-card rounded-3xl p-5 sm:p-8 w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-border relative text-card-foreground animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Grade Student Submission
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              {gradingSubmission.studentName} ({gradingSubmission.matricNumber}) &bull; {gradingSubmission.assignmentTitle}
            </p>

            {gradeMessage && (
              <div className={`p-3 rounded-xl text-xs font-semibold mb-3 flex items-center gap-2 ${
                gradeMessage.type === 'success' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20' : 'bg-destructive/15 text-destructive border border-destructive/20'
              }`}>
                {gradeMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-destructive" />}
                {gradeMessage.text}
              </div>
            )}

            {/* Academic Integrity Telemetry Audit Box */}
            <div className={`p-3 rounded-xl border text-xs mb-3 flex items-center justify-between ${
              gradingSubmission.isPasteFlagged || (gradingSubmission.tabSwitchCount && gradingSubmission.tabSwitchCount > 0)
                ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                : 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
            }`}>
              <div className="flex items-center gap-2">
                {gradingSubmission.isPasteFlagged || (gradingSubmission.tabSwitchCount && gradingSubmission.tabSwitchCount > 0) ? (
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                )}
                <div>
                  <div className="font-bold text-xs">
                    {gradingSubmission.isPasteFlagged || (gradingSubmission.tabSwitchCount && gradingSubmission.tabSwitchCount > 0)
                      ? 'Academic Integrity Alert: External Copy/Paste or Tab-Switching Detected'
                      : 'Academic Integrity Verified: Hand-Typed Submission'}
                  </div>
                  <div className="text-[11px] text-gray-600">
                    Tab Switches / Focus Loss: <strong className="text-gray-900">{gradingSubmission.tabSwitchCount || 0}</strong> &bull; Paste Operations: <strong className="text-gray-900">{gradingSubmission.pasteCount || 0}</strong> {gradingSubmission.isPasteFlagged ? '(Bulk paste flagged)' : ''}
                  </div>
                </div>
              </div>
              <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded ${
                gradingSubmission.isPasteFlagged || (gradingSubmission.tabSwitchCount && gradingSubmission.tabSwitchCount > 0)
                  ? 'bg-amber-200 text-amber-900'
                  : 'bg-emerald-200 text-emerald-900'
              }`}>
                {gradingSubmission.isPasteFlagged ? 'Review Paste' : 'Clean'}
              </span>
            </div>

            {/* Submission preview */}
            <div className="bg-muted/40 p-3.5 rounded-xl border border-border/60 text-xs mb-4 max-h-36 overflow-y-auto">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Student Answer</span>
              {gradingSubmission.submissionText ? (
                <p className="font-mono text-foreground whitespace-pre-wrap">{gradingSubmission.submissionText}</p>
              ) : (
                <span className="italic text-muted-foreground">No written text provided.</span>
              )}
              {gradingSubmission.fileUrl && (
                <div className="mt-2 pt-2 border-t border-border flex flex-wrap items-center justify-between gap-2">
                  <a
                    href={gradingSubmission.fileUrl}
                    download
                    className="text-primary hover:text-primary/80 font-bold inline-flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download {gradingSubmission.fileName || 'Student Attachment'}
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowAnnotationStudio(!showAnnotationStudio)}
                    className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 text-xs font-bold rounded-lg transition-all"
                  >
                    {showAnnotationStudio ? 'Close In-Browser Markup' : 'Open In-Browser Markup & Stylus'}
                  </button>
                </div>
              )}

              {/* In-Browser PDF/Document Markup Studio */}
              {showAnnotationStudio && gradingSubmission.fileUrl && (
                <div className="mt-4">
                  <DocumentAnnotationStudio
                    documentUrl={gradingSubmission.fileUrl}
                    documentName={gradingSubmission.fileName || 'Student Submission'}
                  />
                </div>
              )}
            </div>

            <form onSubmit={handleGradeSubmission} className="space-y-4">
              {/* Interactive Rubric Toggle */}
              <div className="border border-border/70 rounded-2xl p-4 bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold text-foreground">Accreditation Rubric Assistant (NUC/ABET Standard)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRubric(!showRubric)}
                    className="text-xs font-bold text-indigo-500 hover:text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg"
                  >
                    {showRubric ? 'Hide Rubric Matrix' : 'Open Rubric Matrix'}
                  </button>
                </div>

                {showRubric && (
                  <div className="mt-3 space-y-3 pt-3 border-t border-border/60 text-xs">
                    {/* Dimension 1: Comprehension */}
                    <div>
                      <div className="flex justify-between font-semibold text-muted-foreground mb-1">
                        <span>1. Conceptual Comprehension (25%)</span>
                        <span className="font-bold text-foreground">{rubricScores.comprehension} / 4 pts</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { val: 1, label: 'Unsatisfactory (1)' },
                          { val: 2, label: 'Developing (2)' },
                          { val: 3, label: 'Proficient (3)' },
                          { val: 4, label: 'Mastery (4)' }
                        ].map(tier => (
                          <button
                            key={tier.val}
                            type="button"
                            onClick={() => applyRubricScore({ ...rubricScores, comprehension: tier.val })}
                            className={`py-1.5 px-1 rounded-lg text-[10px] font-bold border transition-all ${
                              rubricScores.comprehension === tier.val
                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                                : 'bg-background hover:bg-muted text-muted-foreground border-border'
                            }`}
                          >
                            {tier.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Dimension 2: Analytical Accuracy */}
                    <div>
                      <div className="flex justify-between font-semibold text-muted-foreground mb-1">
                        <span>2. Technical & Analytical Accuracy (25%)</span>
                        <span className="font-bold text-foreground">{rubricScores.accuracy} / 4 pts</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { val: 1, label: 'Unsatisfactory (1)' },
                          { val: 2, label: 'Developing (2)' },
                          { val: 3, label: 'Proficient (3)' },
                          { val: 4, label: 'Mastery (4)' }
                        ].map(tier => (
                          <button
                            key={tier.val}
                            type="button"
                            onClick={() => applyRubricScore({ ...rubricScores, accuracy: tier.val })}
                            className={`py-1.5 px-1 rounded-lg text-[10px] font-bold border transition-all ${
                              rubricScores.accuracy === tier.val
                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                                : 'bg-background hover:bg-muted text-muted-foreground border-border'
                            }`}
                          >
                            {tier.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Dimension 3: Methodology */}
                    <div>
                      <div className="flex justify-between font-semibold text-muted-foreground mb-1">
                        <span>3. Problem Solving & Methodology (25%)</span>
                        <span className="font-bold text-foreground">{rubricScores.methodology} / 4 pts</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { val: 1, label: 'Unsatisfactory (1)' },
                          { val: 2, label: 'Developing (2)' },
                          { val: 3, label: 'Proficient (3)' },
                          { val: 4, label: 'Mastery (4)' }
                        ].map(tier => (
                          <button
                            key={tier.val}
                            type="button"
                            onClick={() => applyRubricScore({ ...rubricScores, methodology: tier.val })}
                            className={`py-1.5 px-1 rounded-lg text-[10px] font-bold border transition-all ${
                              rubricScores.methodology === tier.val
                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                                : 'bg-background hover:bg-muted text-muted-foreground border-border'
                            }`}
                          >
                            {tier.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Dimension 4: Presentation & Style */}
                    <div>
                      <div className="flex justify-between font-semibold text-muted-foreground mb-1">
                        <span>4. Structure & Technical Presentation (25%)</span>
                        <span className="font-bold text-foreground">{rubricScores.presentation} / 4 pts</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { val: 1, label: 'Unsatisfactory (1)' },
                          { val: 2, label: 'Developing (2)' },
                          { val: 3, label: 'Proficient (3)' },
                          { val: 4, label: 'Mastery (4)' }
                        ].map(tier => (
                          <button
                            key={tier.val}
                            type="button"
                            onClick={() => applyRubricScore({ ...rubricScores, presentation: tier.val })}
                            className={`py-1.5 px-1 rounded-lg text-[10px] font-bold border transition-all ${
                              rubricScores.presentation === tier.val
                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                                : 'bg-background hover:bg-muted text-muted-foreground border-border'
                            }`}
                          >
                            {tier.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Awarded Score (Max: {gradingSubmission.maxScore} pts)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max={gradingSubmission.maxScore}
                  required
                  value={gradeScore}
                  onChange={(e) => setGradeScore(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs p-2.5 bg-background text-foreground border border-input rounded-xl focus:ring-2 focus:ring-primary focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Lecturer Feedback &amp; Review Remarks
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide constructive feedback, praise, or areas for improvement..."
                  value={gradeFeedback}
                  onChange={(e) => setGradeFeedback(e.target.value)}
                  className="w-full text-xs p-2.5 bg-background text-foreground border border-input rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setGradingSubmission(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGrading}
                  className="px-6 py-2 rounded-xl text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5 shadow-md"
                >
                  {isGrading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                      Saving Grade...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Save &amp; Notify Student
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}