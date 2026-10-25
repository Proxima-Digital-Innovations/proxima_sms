'use client';

import { saveExamDraft, loadExamDraft, clearExamDraft } from '@/lib/offline-vault';

import React, { useState, useEffect, useRef } from 'react';
import {
  UserCheck,
  BookOpen,
  Headphones,
  FileText,
  UploadCloud,
  CheckCircle2,
  Clock,
  Timer,
  AlertCircle,
  Calendar,
  Award,
  ChevronRight,
  Play,
  Pause,
  Download,
  RotateCcw,
  Sparkles,
  Send,
  CreditCard,
  Building,
  GraduationCap,
  ShieldCheck,
  ExternalLink,
  Volume2
} from 'lucide-react';
import {
  getStudentPortalData,
  submitAssignmentOnlineAction,
  activateTertiaryExamSessionAction,
  getActiveLiveClassesAction,
  LiveVirtualClassSession
} from '@/actions/tertiary-classroom-actions';
import { VirtualClassroomModal } from '@/components/dashboard/virtual-class/virtual-classroom-modal';
import { Radio, Video } from 'lucide-react';

export default function StudentHubPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'activities' | 'materials' | 'assignments' | 'courses'>('activities');

  // Audio Player State
  const [currentAudio, setCurrentAudio] = useState<{ id: string; title: string; url: string; course: string } | null>(null);

  // Live Virtual Classroom State
  const [activeLiveSessions, setActiveLiveSessions] = useState<LiveVirtualClassSession[]>([]);
  const [selectedLiveSession, setSelectedLiveSession] = useState<LiveVirtualClassSession | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Assignment Submission Modal/State
  const [submittingAssignmentId, setSubmittingAssignmentId] = useState<string | null>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Timed Essay Exam Session State
  const [activeExamTimerSeconds, setActiveExamTimerSeconds] = useState<number | null>(null);
  const [isExamMode, setIsExamMode] = useState(false);

  // Anti-Cheat & Integrity Telemetry State
  const [submissionPasteCount, setSubmissionPasteCount] = useState(0);
  const [submissionPastedChars, setSubmissionPastedChars] = useState(0);
  const [submissionTabSwitches, setSubmissionTabSwitches] = useState(0);
  const [isPasteFlagged, setIsPasteFlagged] = useState(false);
  const [antiCheatToast, setAntiCheatToast] = useState<string | null>(null);

  // Monitor tab-switching & focus changes while assignment submission modal is active
  useEffect(() => {
    if (submittingAssignmentId) {
      setSubmissionPasteCount(0);
      setSubmissionPastedChars(0);
      setSubmissionTabSwitches(0);
      setIsPasteFlagged(false);
      setAntiCheatToast(null);

      const handleVisibilityChange = () => {
        if (document.hidden) {
          setSubmissionTabSwitches((prev) => {
            const next = prev + 1;
            setAntiCheatToast(`Security Notice: Window focus lost (${next} tab switch${next > 1 ? 'es' : ''}). Academic integrity telemetry is recorded.`);
            return next;
          });
        }
      };

      const handleWindowBlur = () => {
        setSubmissionTabSwitches((prev) => prev + 1);
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('blur', handleWindowBlur);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('blur', handleWindowBlur);
      };
    }
  }, [submittingAssignmentId]);

  // Live Countdown Timer for Timed Essay Exams
  useEffect(() => {
    if (!submittingAssignmentId || activeExamTimerSeconds === null) return;

    if (activeExamTimerSeconds <= 0) {
      // Auto-submit when countdown hits zero
      setAntiCheatToast('Exam time expired! Auto-submitting your written response...');
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      handleAssignmentSubmit(fakeEvent);
      return;
    }

    const timer = setInterval(() => {
      setActiveExamTimerSeconds((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [submittingAssignmentId, activeExamTimerSeconds]);

  const handlePreventQuestionCopy = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setAntiCheatToast('Copying question text is disabled under Institutional Academic Integrity Policy.');
    setTimeout(() => setAntiCheatToast(null), 3500);
  };

  const handleTextareaPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text') || '';
    if (text) {
      setSubmissionPasteCount((prev) => prev + 1);
      setSubmissionPastedChars((prev) => prev + text.length);
      if (text.length > 50) {
        setIsPasteFlagged(true);
        setAntiCheatToast(`Bulk paste detected (${text.length} characters). Clipboard telemetry attached to your submission.`);
      }
    }
  };

  const embedWatermark = (text: string, identifier?: string) => {
    if (!identifier) return text;
    const binary = Array.from(identifier).map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join('');
    const zeroWidth = binary.split('').map(b => b === '1' ? '\u200C' : '\u200B').join('');
    return `${text}${zeroWidth}`;
  };

  // Load Data
  const fetchData = async (studentId?: string) => {
    setLoading(true);
    try {
      const res = await getStudentPortalData(studentId);
      if (res.success && res.student) {
        setData(res);
        if (!selectedStudentId) {
          setSelectedStudentId(res.student.id);
        }

        // Check active live sessions for registered courses
        const offeringIds = res.registeredCourses?.map((c: any) => c.offeringId) || [];
        const liveRes = await getActiveLiveClassesAction(offeringIds);
        if (liveRes.success && liveRes.sessions) {
          setActiveLiveSessions(liveRes.sessions);
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

    // Check for active live sessions every 10 seconds
    const interval = setInterval(async () => {
      try {
        const liveRes = await getActiveLiveClassesAction();
        if (liveRes.success && liveRes.sessions) {
          setActiveLiveSessions(liveRes.sessions);
        }
      } catch (e) {}
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleStudentSwitch = (newId: string) => {
    setSelectedStudentId(newId);
    fetchData(newId);
  };

  // Audio Controls
  const playAudio = (material: any) => {
    if (currentAudio?.id === material.id) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play();
        setIsPlaying(true);
      }
    } else {
      setCurrentAudio({
        id: material.id,
        title: material.title,
        url: material.fileUrl,
        course: material.courseCode
      });
      setIsPlaying(true);
      if (audioRef.current) {
        audioRef.current.src = material.fileUrl;
        audioRef.current.play().catch(e => console.warn('Audio play error:', e));
      }
    }
  };

  const onTimeUpdate = () => {
    if (audioRef.current) {
      setAudioProgress(audioRef.current.currentTime);
      setAudioDuration(audioRef.current.duration || 0);
    }
  };

  const handleAudioSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setAudioProgress(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const formatSeconds = (sec: number) => {
    if (!sec || isNaN(sec)) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Submit Assignment
  const handleAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingAssignmentId || !data?.student) return;

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      const formData = new FormData();
      formData.append('assignmentId', submittingAssignmentId);
      formData.append('studentId', data.student.id);
      if (submissionText) formData.append('submissionText', submissionText);
      if (submissionFile) formData.append('file', submissionFile);
      formData.append('pasteCount', String(submissionPasteCount));
      formData.append('tabSwitchCount', String(submissionTabSwitches));
      formData.append('isPasteFlagged', String(isPasteFlagged));

      const res = await submitAssignmentOnlineAction(formData);
      if (res.success) {
        setSubmitMessage({ type: 'success', text: res.message || 'Assignment submitted successfully!' });
        setTimeout(() => {
          if (submittingAssignmentId) clearExamDraft(`essay_${submittingAssignmentId}`);
          setSubmittingAssignmentId(null);
          setSubmissionText('');
          setSubmissionFile(null);
          setSubmitMessage(null);
          setActiveExamTimerSeconds(null);
          setIsExamMode(false);
          fetchData(data.student.id);
        }, 1500);
      } else {
        setSubmitMessage({ type: 'error', text: res.error || 'Submission failed.' });
      }
    } catch (err: any) {
      setSubmitMessage({ type: 'error', text: err.message || 'An error occurred during submission.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-muted-foreground font-medium animate-pulse">Loading Student Portal &amp; Activities...</p>
      </div>
    );
  }

  const student = data?.student;
  const availableStudents = data?.availableStudents || [];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Hidden native audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={onTimeUpdate}
        onEnded={() => setIsPlaying(false)}
      />

      {/* 1. TOP HEADER & IDENTITY CARD */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-3xl p-6 md:p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-white font-bold text-2xl shadow-inner backdrop-blur-sm">
              {student?.fullName?.charAt(0) || 'S'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-mono rounded-full font-bold">
                  {student?.matricNumber}
                </span>
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs rounded-full font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {student?.academicStanding?.replace(/_/g, ' ')}
                </span>
                <span className="px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs rounded-full font-semibold">
                  {student?.currentLevel} Level
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                {student?.fullName}
              </h1>
              <p className="text-slate-300 text-sm mt-1 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-400" />
                {student?.program} &bull; {student?.department}
              </p>
            </div>
          </div>

          {/* Quick Demo Switcher */}
          <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 w-full md:w-auto">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Switch Student Profile (Demo)
            </label>
            <select
              value={student?.id || ''}
              onChange={(e) => handleStudentSwitch(e.target.value)}
              className="bg-slate-800 text-white text-xs font-medium rounded-xl px-3 py-2 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 w-full sm:w-64"
            >
              {availableStudents.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.matric} - {s.name} ({s.program})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* METRICS STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/5">
            <div className="text-slate-400 text-xs font-medium">Cumulative GPA</div>
            <div className="text-2xl font-black text-amber-300 mt-1 flex items-baseline gap-1">
              {Number(student?.cgpa || 0).toFixed(2)}
              <span className="text-xs text-slate-400 font-normal">/ 5.00 NUC</span>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/5">
            <div className="text-slate-400 text-xs font-medium">Registered Credits</div>
            <div className="text-2xl font-black text-white mt-1">
              {student?.totalCredits} <span className="text-xs text-slate-400 font-normal">Units</span>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/5">
            <div className="text-slate-400 text-xs font-medium">Bursary Clearance</div>
            <div className="text-sm font-bold text-emerald-300 mt-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {student?.isBursaryCleared ? 'Cleared (Eligible)' : 'Pending'}
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/5">
            <div className="text-slate-400 text-xs font-medium">Graduation Clearance</div>
            <div className="text-sm font-bold text-indigo-300 mt-2 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-indigo-400" />
              {student?.clearanceStatus}
            </div>
          </div>
        </div>
      </div>

      {/* LIVE VIRTUAL CLASS IN PROGRESS BANNER (Remote Students Real-time Interaction) */}
      {activeLiveSessions.length > 0 && (
        <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-indigo-950 p-4 sm:p-5 rounded-3xl border border-rose-500/40 text-white shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <Radio className="w-6 h-6 animate-ping" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-rose-500 text-white rounded-md flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                  LIVE CLASS IN PROGRESS
                </span>
                <span className="text-xs text-rose-300 font-bold">{activeLiveSessions[0].courseCode}</span>
              </div>
              <h4 className="text-sm font-black text-white mt-1">{activeLiveSessions[0].topic}</h4>
              <p className="text-xs text-slate-300">
                Instructor: <strong className="text-white">{activeLiveSessions[0].lecturerName}</strong> &bull; Remote Students can unmute, raise hand &amp; ask questions live.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedLiveSession(activeLiveSessions[0])}
            className="w-full sm:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-xs font-black shadow-lg transition-all flex items-center justify-center gap-2 shrink-0 active:scale-95"
          >
            <Video className="w-4 h-4" />
            Join Virtual Classroom
          </button>
        </div>
      )}

      {/* MODAL: STUDENT REAL-TIME VIRTUAL CLASSROOM */}
      {selectedLiveSession && (
        <VirtualClassroomModal
          session={selectedLiveSession}
          currentUser={{
            id: data?.student?.id || 'student',
            name: `${data?.student?.user?.firstName || ''} ${data?.student?.user?.lastName || ''}`.trim() || data?.student?.matricNumber || 'Student',
            matricNumber: data?.student?.matricNumber,
            role: 'STUDENT'
          }}
          onClose={() => setSelectedLiveSession(null)}
        />
      )}

      {/* 2. PERSISTENT AUDIO PLAYER BAR (If audio selected) */}
      {currentAudio && (
        <div className="sticky top-4 z-40 bg-slate-900/95 text-white p-4 rounded-2xl shadow-2xl border border-indigo-500/40 backdrop-blur-lg flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => playAudio(currentAudio)}
              className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 shrink-0"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
            </button>
            <div className="overflow-hidden">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-indigo-500/30 text-indigo-300 text-[10px] font-bold rounded">
                  {currentAudio.course}
                </span>
                <span className="text-xs text-slate-400 font-medium">Audio Lecture Stream</span>
              </div>
              <h4 className="text-sm font-semibold truncate text-white">{currentAudio.title}</h4>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-1/2">
            <span className="text-xs text-slate-400 font-mono w-12 text-right">
              {formatSeconds(audioProgress)}
            </span>
            <input
              type="range"
              min="0"
              max={audioDuration || 100}
              value={audioProgress}
              onChange={handleAudioSeek}
              className="w-full accent-indigo-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
            />
            <span className="text-xs text-slate-400 font-mono w-12">
              {formatSeconds(audioDuration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={currentAudio.url}
              download
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              Download Audio
            </a>
          </div>
        </div>
      )}

      {/* 3. NAVIGATION TABS */}
      <div className="w-full overflow-x-auto scrollbar-none border-b border-border">
        <div className="flex space-x-2 pb-1 min-w-max">
          <button
            onClick={() => setActiveTab('activities')}
            className={`pb-3 px-4 font-semibold text-sm transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'activities'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="w-4 h-4" />
            Institution Activity Monitor
            <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full font-bold">
              {student?.activities?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('materials')}
            className={`pb-3 px-4 font-semibold text-sm transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'materials'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Headphones className="w-4 h-4" />
            Lecture Notes &amp; Audio Library
            <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full font-bold">
              {student?.materials?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('assignments')}
            className={`pb-3 px-4 font-semibold text-sm transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'assignments'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="w-4 h-4" />
            Online Assignments &amp; Submissions
            <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full font-bold">
              {student?.assignments?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('courses')}
            className={`pb-3 px-4 font-semibold text-sm transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'courses'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Enrolled Courses &amp; Timetable
          </button>
        </div>
      </div>

      {/* 4. TAB CONTENTS */}

      {/* TAB 1: INSTITUTION ACTIVITY MONITOR */}
      {activeTab === 'activities' && (
        <div className="space-y-6">
          <div className="bg-card rounded-2xl p-4 sm:p-6 border border-border shadow-sm">
            <h3 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Chronological Institution Activity Feed
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Live automated feed tracking lecture notes, newly recorded audio lectures, assignment deadlines, and graded submissions.
            </p>

            <div className="relative pl-6 border-l-2 border-border space-y-6">
              {student?.activities?.map((act: any) => (
                <div key={act.id} className="relative group">
                  {/* Timeline bullet */}
                  <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-card shadow ${
                    act.category === 'GRADE' ? 'bg-emerald-500' :
                    act.category === 'MATERIAL' ? 'bg-primary' :
                    act.category === 'ASSIGNMENT' ? 'bg-amber-500' : 'bg-blue-500'
                  }`}></div>

                  <div className="bg-muted/30 hover:bg-muted/60 p-4 rounded-xl border border-border/60 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          act.category === 'GRADE' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' :
                          act.category === 'MATERIAL' ? 'bg-primary/15 text-primary' :
                          act.category === 'ASSIGNMENT' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400' : 'bg-blue-500/15 text-blue-700 dark:text-blue-400'
                        }`}>
                          {act.category}
                        </span>
                        <h4 className="font-semibold text-foreground text-sm">{act.title}</h4>
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">
                        {new Date(act.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground">{act.description}</p>

                    {/* Action buttons on activity item */}
                    {act.metadata?.type === 'AUDIO_RECORDING' && (
                      <div className="mt-3">
                        <button
                          onClick={() => playAudio({
                            id: act.id,
                            title: act.title,
                            fileUrl: act.metadata.url,
                            courseCode: 'COURSE'
                          })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-semibold shadow-sm transition-colors"
                        >
                          <Play className="w-3.5 h-3.5" />
                          Listen to Audio Lecture
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {student?.activities?.length === 0 && (
                <p className="text-muted-foreground text-sm italic">No recent institutional activities recorded.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LECTURE NOTES & AUDIO LIBRARY */}
      {activeTab === 'materials' && (
        <div className="space-y-6">
          <div className="bg-card rounded-2xl p-4 sm:p-6 border border-border shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Headphones className="w-5 h-5 text-primary" />
                  Course Lecture Notes &amp; Audio Broadcasts
                </h3>
                <p className="text-sm text-muted-foreground">
                  Access digital course packs, lecture slides, and streaming audio podcasts uploaded by your lecturers.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {student?.materials?.map((mat: any) => {
                const isAudio = mat.materialType === 'AUDIO_RECORDING';
                return (
                  <div
                    key={mat.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      isAudio
                        ? 'bg-primary/5 border-primary/30 hover:border-primary/60 hover:shadow-md'
                        : 'bg-card border-border hover:border-primary/40 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-primary text-primary-foreground font-bold text-xs rounded-lg">
                          {mat.courseCode}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">
                          Week {mat.weekNumber || 1}
                        </span>
                      </div>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        isAudio
                          ? 'bg-purple-500/15 text-purple-700 dark:text-purple-400'
                          : 'bg-blue-500/15 text-blue-700 dark:text-blue-400'
                      }`}>
                        {isAudio ? <Headphones className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                        {isAudio ? 'Audio Lecture' : mat.materialType}
                      </span>
                    </div>

                    <h4 className="font-bold text-foreground text-base mb-1">{mat.title}</h4>
                    <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{mat.description}</p>

                    <div className="flex items-center justify-between pt-3 border-t border-border text-xs text-muted-foreground">
                      <div>Uploaded by <span className="font-semibold text-foreground">{mat.lecturerName}</span></div>
                      {isAudio ? (
                        <button
                          onClick={() => playAudio(mat)}
                          className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
                        >
                          <Play className="w-3.5 h-3.5" />
                          Stream Audio
                        </button>
                      ) : (
                        <a
                          href={mat.fileUrl}
                          download
                          className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5 text-muted-foreground" />
                          Download Note
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}

              {student?.materials?.length === 0 && (
                <div className="col-span-2 text-center py-12 text-muted-foreground">
                  <BookOpen className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="font-medium">No lecture materials or audio uploaded yet for your enrolled courses.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ONLINE ASSIGNMENTS & SUBMISSION */}
      {activeTab === 'assignments' && (
        <div className="space-y-6">
          <div className="bg-card rounded-2xl p-4 sm:p-6 border border-border shadow-sm">
            <h3 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Online Continuous Assessment &amp; Assignments
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Review lecturer specifications, submit code/solutions online, and receive graded continuous assessment feedback.
            </p>

            <div className="space-y-4">
              {student?.assignments?.map((asgn: any) => {
                const sub = asgn.submission;
                const isGraded = sub?.status === 'GRADED';
                const isSubmitted = sub && !isGraded;

                return (
                  <div
                    key={asgn.id}
                    className="p-5 sm:p-6 rounded-2xl border border-border hover:border-primary/30 transition-all bg-card/60 shadow-sm"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-primary text-primary-foreground font-bold text-xs rounded-lg">
                          {asgn.courseCode}
                        </span>
                        <h4 className="font-bold text-foreground text-base">{asgn.title}</h4>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {isGraded ? (
                          <span className="px-3 py-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            Graded: {sub.score} / {asgn.maxScore} pts
                          </span>
                        ) : isSubmitted ? (
                          <span className="px-3 py-1 bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/20 text-xs font-bold rounded-full flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            Submitted (Awaiting Grading)
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-xs font-bold rounded-full flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            Pending Submission
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      onCopy={handlePreventQuestionCopy}
                      onContextMenu={handlePreventQuestionCopy}
                      className="select-none relative group mb-4"
                    >
                      <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-mono font-bold text-muted-foreground bg-background/90 backdrop-blur px-2 py-0.5 rounded-md border border-border">
                        <Lock className="w-2.5 h-2.5 text-amber-500" /> Protected Question
                      </div>
                      <p className="text-sm text-foreground/90 whitespace-pre-line bg-muted/40 p-4 rounded-xl border border-border/60 select-none">
                        {embedWatermark(asgn.description, data?.student?.matricNumber)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground pt-3 border-t border-border">
                      <div className="flex flex-wrap items-center gap-4">
                        <span className="font-medium text-foreground">
                          Due Date: {new Date(asgn.dueDate).toLocaleString()}
                        </span>
                        <span className="font-medium text-foreground">
                          Maximum Points: {asgn.maxScore} pts
                        </span>
                        {asgn.attachmentUrl && (
                          <a
                            href={asgn.attachmentUrl}
                            download
                            className="text-primary hover:text-primary/80 font-bold flex items-center gap-1"
                          >
                            <Download className="w-3.5 h-3.5" />
                            {asgn.attachmentName || 'Download Spec Sheet'}
                          </a>
                        )}
                      </div>

                      {/* Submit / Resubmit Button */}
                      <div>
                        <button
                          onClick={async () => {
                            setSubmittingAssignmentId(asgn.id);
                            const draft = await loadExamDraft(`essay_${asgn.id}`);
                            setSubmissionText(draft?.essayText || sub?.submissionText || '');
                            if (asgn.assessmentType === 'ESSAY_EXAM' && asgn.durationMinutes) {
                              setIsExamMode(true);
                              // Activate exam session on backend to timestamp startedAt
                              if (data?.student?.id) {
                                const actRes = await activateTertiaryExamSessionAction(asgn.id, data.student.id);
                                if (actRes.success && actRes.startedAt) {
                                  const started = new Date(actRes.startedAt).getTime();
                                  const totalSec = asgn.durationMinutes * 60;
                                  const elapsedSec = Math.floor((Date.now() - started) / 1000);
                                  const remaining = Math.max(0, totalSec - elapsedSec);
                                  setActiveExamTimerSeconds(remaining);
                                } else {
                                  setActiveExamTimerSeconds(asgn.durationMinutes * 60);
                                }
                              } else {
                                setActiveExamTimerSeconds(asgn.durationMinutes * 60);
                              }
                            } else {
                              setIsExamMode(false);
                              setActiveExamTimerSeconds(null);
                            }
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 ${
                            isGraded
                              ? 'bg-muted hover:bg-muted/80 text-foreground border border-border'
                              : isSubmitted
                              ? 'bg-blue-600 hover:bg-blue-700 text-white'
                              : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                          }`}
                        >
                          <UploadCloud className="w-4 h-4" />
                          {isGraded ? 'View Submission' : isSubmitted ? 'Update Submission' : 'Submit Solution Online'}
                        </button>
                      </div>
                    </div>

                    {/* If Graded: Show Lecturer Feedback */}
                    {isGraded && (
                      <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex items-center gap-2 mb-1">
                          <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                            Lecturer Feedback &amp; Assessment
                          </span>
                        </div>
                        <p className="text-sm text-emerald-950 dark:text-emerald-200 font-medium italic">
                          &ldquo;{sub.feedback || 'Good work on this continuous assessment assignment.'}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}

              {student?.assignments?.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="font-medium">No online assignments currently published for your enrolled courses.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ENROLLED COURSES & TIMETABLE */}
      {activeTab === 'courses' && (
        <div className="space-y-6">
          <div className="bg-card rounded-2xl p-4 sm:p-6 border border-border shadow-sm">
            <h3 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Registered Courses &amp; Weekly Schedule
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Official course load for {student?.session} &bull; Semester {student?.semester} (Total Credits: {student?.totalCredits} Units)
            </p>

            <div className="w-full overflow-x-auto scrollbar-none">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="py-3 px-4">Course Code</th>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4 text-center">Credit Units</th>
                    <th className="py-3 px-4">Lecturer(s)</th>
                    <th className="py-3 px-4">Lecture Schedule &amp; Venue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {student?.registeredCourses?.map((c: any) => (
                    <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-primary">{c.code}</td>
                      <td className="py-3 px-4 font-medium text-foreground">{c.title}</td>
                      <td className="py-3 px-4 text-center font-bold text-foreground">{c.creditUnits}</td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {c.lecturers?.map((l: any, i: number) => (
                          <div key={i} className="font-medium text-foreground">{l.name}</div>
                        ))}
                        {(!c.lecturers || c.lecturers.length === 0) && <span className="italic text-muted-foreground">Department Faculty</span>}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {c.schedules?.map((s: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground">{s.day}:</span> {s.time} ({s.venue})
                          </div>
                        ))}
                        {(!c.schedules || c.schedules.length === 0) && <span className="italic text-muted-foreground">TBA</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. ONLINE ASSIGNMENT SUBMISSION MODAL */}
      {submittingAssignmentId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-card rounded-3xl p-5 sm:p-8 w-[95vw] sm:max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl border border-border relative text-card-foreground animate-in fade-in zoom-in-95">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                {isExamMode ? <Timer className="w-6 h-6 text-amber-500 animate-pulse" /> : <UploadCloud className="w-6 h-6 text-primary" />}
                {isExamMode ? 'Timed Essay Examination' : 'Submit Assignment Solution Online'}
              </h3>
              {activeExamTimerSeconds !== null && (
                <div className={`px-3 py-1.5 rounded-xl font-mono text-sm font-bold flex items-center gap-2 shadow-inner ${
                  activeExamTimerSeconds < 300 
                    ? 'bg-rose-600 text-white animate-pulse' 
                    : 'bg-slate-900 border border-slate-700 text-amber-400'
                }`}>
                  <Timer className="w-4 h-4" />
                  <span>
                    {String(Math.floor(activeExamTimerSeconds / 3600)).padStart(2, '0')}:
                    {String(Math.floor((activeExamTimerSeconds % 3600) / 60)).padStart(2, '0')}:
                    {String(activeExamTimerSeconds % 60).padStart(2, '0')}
                  </span>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Enter your written solution, GitHub repo URL, or upload your assignment document (.zip, .pdf, .docx).
            </p>

            {/* Academic Integrity & Anti-Cheat Telemetry Banner */}
            <div className="p-3.5 rounded-2xl bg-slate-900 text-white mb-4 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold flex items-center gap-1.5 text-indigo-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Academic Integrity Monitor Active
                </span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  Audit Telemetry
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1 border-t border-slate-800">
                <div className="flex items-center justify-between bg-slate-800/80 px-2 py-1 rounded">
                  <span className="text-slate-400">Tab Switches:</span>
                  <span className={submissionTabSwitches > 0 ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                    {submissionTabSwitches} Strikes
                  </span>
                </div>
                <div className="flex items-center justify-between bg-slate-800/80 px-2 py-1 rounded">
                  <span className="text-slate-400">Pasted Text:</span>
                  <span className={isPasteFlagged ? "text-amber-400 font-bold" : "text-slate-200"}>
                    {submissionPastedChars} chars ({submissionPasteCount})
                  </span>
                </div>
              </div>
              {antiCheatToast && (
                <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg flex items-center gap-1.5 animate-pulse">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  <span>{antiCheatToast}</span>
                </div>
              )}
            </div>

            {submitMessage && (
              <div className={`p-4 rounded-xl text-xs font-semibold mb-4 flex items-center gap-2 ${
                submitMessage.type === 'success' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20' : 'bg-destructive/15 text-destructive border border-destructive/20'
              }`}>
                {submitMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-destructive" />}
                {submitMessage.text}
              </div>
            )}

            <form onSubmit={handleAssignmentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Written Response / Repository Link / Notes
                </label>
                <textarea
                  value={submissionText}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSubmissionText(val);
                    if (submittingAssignmentId) {
                      saveExamDraft(`essay_${submittingAssignmentId}`, {
                        essayText: val,
                        timeLeftSeconds: activeExamTimerSeconds || undefined,
                      });
                    }
                  }}
                  onPaste={handleTextareaPaste}
                  rows={5}
                  placeholder="Type your solution, code, GitHub repo URL, or executive summary here..."
                  className="w-full text-xs p-3 bg-background border border-input rounded-xl focus:ring-2 focus:ring-primary focus:outline-none font-mono text-foreground"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Attach Solution File (Optional)
                </label>
                <input
                  type="file"
                  onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setSubmittingAssignmentId(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 rounded-xl text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5 shadow-md"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Confirm Submission
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