'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  UserCheck,
  BookOpen,
  Headphones,
  FileText,
  UploadCloud,
  CheckCircle2,
  Clock,
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
  submitAssignmentOnlineAction
} from '@/actions/tertiary-classroom-actions';

export default function StudentHubPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'activities' | 'materials' | 'assignments' | 'courses'>('activities');

  // Audio Player State
  const [currentAudio, setCurrentAudio] = useState<{ id: string; title: string; url: string; course: string } | null>(null);
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

      const res = await submitAssignmentOnlineAction(formData);
      if (res.success) {
        setSubmitMessage({ type: 'success', text: res.message || 'Assignment submitted successfully!' });
        setTimeout(() => {
          setSubmittingAssignmentId(null);
          setSubmissionText('');
          setSubmissionFile(null);
          setSubmitMessage(null);
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
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-600 font-medium animate-pulse">Loading Student Portal & Activities...</p>
      </div>
    );
  }

  const student = data?.student;
  const availableStudents = data?.availableStudents || [];

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
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
              className="bg-slate-800 text-white text-xs font-medium rounded-xl px-3 py-2 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 w-full md:w-64"
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

      {/* 2. PERSISTENT AUDIO PLAYER BAR (If audio selected) */}
      {currentAudio && (
        <div className="sticky top-4 z-40 bg-slate-900/95 text-white p-4 rounded-2xl shadow-2xl border border-indigo-500/40 backdrop-blur-lg flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => playAudio(currentAudio)}
              className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 flex-shrink-0"
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
      <div className="flex border-b border-gray-200 overflow-x-auto space-x-2">
        <button
          onClick={() => setActiveTab('activities')}
          className={`pb-3 px-4 font-semibold text-sm transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'activities'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          Institution Activity Monitor
          <span className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full font-bold">
            {student?.activities?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('materials')}
          className={`pb-3 px-4 font-semibold text-sm transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'materials'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Headphones className="w-4 h-4" />
          Lecture Notes & Audio Library
          <span className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full font-bold">
            {student?.materials?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('assignments')}
          className={`pb-3 px-4 font-semibold text-sm transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'assignments'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          Online Assignments & Submissions
          <span className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full font-bold">
            {student?.assignments?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('courses')}
          className={`pb-3 px-4 font-semibold text-sm transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'courses'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Enrolled Courses & Timetable
        </button>
      </div>

      {/* 4. TAB CONTENTS */}

      {/* TAB 1: INSTITUTION ACTIVITY MONITOR */}
      {activeTab === 'activities' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Chronological Institution Activity Feed
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Live automated feed tracking lecture notes, newly recorded audio lectures, assignment deadlines, and graded submissions.
            </p>

            <div className="relative pl-6 border-l-2 border-indigo-100 space-y-6">
              {student?.activities?.map((act: any) => (
                <div key={act.id} className="relative group">
                  {/* Timeline bullet */}
                  <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white shadow ${
                    act.category === 'GRADE' ? 'bg-emerald-500' :
                    act.category === 'MATERIAL' ? 'bg-indigo-600' :
                    act.category === 'ASSIGNMENT' ? 'bg-amber-500' : 'bg-blue-500'
                  }`}></div>

                  <div className="bg-gray-50 hover:bg-indigo-50/40 p-4 rounded-xl border border-gray-100 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          act.category === 'GRADE' ? 'bg-emerald-100 text-emerald-800' :
                          act.category === 'MATERIAL' ? 'bg-indigo-100 text-indigo-800' :
                          act.category === 'ASSIGNMENT' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {act.category}
                        </span>
                        <h4 className="font-semibold text-gray-900 text-sm">{act.title}</h4>
                      </div>
                      <span className="text-xs text-gray-400 font-medium">
                        {new Date(act.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600">{act.description}</p>

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
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
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
                <p className="text-gray-500 text-sm italic">No recent institutional activities recorded.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LECTURE NOTES & AUDIO LIBRARY */}
      {activeTab === 'materials' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Headphones className="w-5 h-5 text-indigo-600" />
                  Course Lecture Notes & Audio Broadcasts
                </h3>
                <p className="text-sm text-gray-500">
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
                        ? 'bg-gradient-to-br from-indigo-50/60 to-purple-50/40 border-indigo-100 hover:border-indigo-300'
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-indigo-600 text-white font-bold text-xs rounded-lg">
                          {mat.courseCode}
                        </span>
                        <span className="text-xs font-semibold text-gray-600">
                          Week {mat.weekNumber || 1}
                        </span>
                      </div>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        isAudio
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {isAudio ? <Headphones className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                        {isAudio ? 'Audio Lecture' : mat.materialType}
                      </span>
                    </div>

                    <h4 className="font-bold text-gray-900 text-base mb-1">{mat.title}</h4>
                    <p className="text-xs text-gray-600 mb-4 line-clamp-2">{mat.description}</p>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500">
                      <div>Uploaded by <span className="font-semibold text-gray-700">{mat.lecturerName}</span></div>
                      {isAudio ? (
                        <button
                          onClick={() => playAudio(mat)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
                        >
                          <Play className="w-3.5 h-3.5" />
                          Stream Audio
                        </button>
                      ) : (
                        <a
                          href={mat.fileUrl}
                          download
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5 text-gray-600" />
                          Download Note
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}

              {student?.materials?.length === 0 && (
                <div className="col-span-2 text-center py-12 text-gray-500">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
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
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Online Continuous Assessment & Assignments
            </h3>
            <p className="text-sm text-gray-500 mb-6">
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
                    className="p-6 rounded-2xl border border-gray-200 hover:border-indigo-200 transition-all bg-white shadow-sm"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-indigo-600 text-white font-bold text-xs rounded-lg">
                          {asgn.courseCode}
                        </span>
                        <h4 className="font-bold text-gray-900 text-base">{asgn.title}</h4>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {isGraded ? (
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Graded: {sub.score} / {asgn.maxScore} pts
                          </span>
                        ) : isSubmitted ? (
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            Submitted (Awaiting Grading)
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            Pending Submission
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-gray-700 whitespace-pre-line mb-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                      {asgn.description}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-gray-500 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-4">
                        <span className="font-medium text-gray-700">
                          Due Date: {new Date(asgn.dueDate).toLocaleString()}
                        </span>
                        <span className="font-medium text-gray-700">
                          Maximum Points: {asgn.maxScore} pts
                        </span>
                        {asgn.attachmentUrl && (
                          <a
                            href={asgn.attachmentUrl}
                            download
                            className="text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1"
                          >
                            <Download className="w-3.5 h-3.5" />
                            {asgn.attachmentName || 'Download Spec Sheet'}
                          </a>
                        )}
                      </div>

                      {/* Submit / Resubmit Button */}
                      <div>
                        <button
                          onClick={() => {
                            setSubmittingAssignmentId(asgn.id);
                            setSubmissionText(sub?.submissionText || '');
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 ${
                            isGraded
                              ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                              : isSubmitted
                              ? 'bg-blue-600 hover:bg-blue-700 text-white'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          }`}
                        >
                          <UploadCloud className="w-4 h-4" />
                          {isGraded ? 'View Submission' : isSubmitted ? 'Update Submission' : 'Submit Solution Online'}
                        </button>
                      </div>
                    </div>

                    {/* If Graded: Show Lecturer Feedback */}
                    {isGraded && (
                      <div className="mt-4 p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                        <div className="flex items-center gap-2 mb-1">
                          <Award className="w-4 h-4 text-emerald-700" />
                          <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                            Lecturer Feedback & Assessment
                          </span>
                        </div>
                        <p className="text-sm text-emerald-950 font-medium italic">
                          &ldquo;{sub.feedback || 'Good work on this continuous assessment assignment.'}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}

              {student?.assignments?.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
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
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Registered Courses & Weekly Schedule
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Official course load for {student?.session} &bull; Semester {student?.semester} (Total Credits: {student?.totalCredits} Units)
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">Course Code</th>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4 text-center">Credit Units</th>
                    <th className="py-3 px-4">Lecturer(s)</th>
                    <th className="py-3 px-4">Lecture Schedule & Venue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {student?.registeredCourses?.map((c: any) => (
                    <tr key={c.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600">{c.code}</td>
                      <td className="py-3 px-4 font-medium text-gray-900">{c.title}</td>
                      <td className="py-3 px-4 text-center font-bold">{c.creditUnits}</td>
                      <td className="py-3 px-4 text-xs text-gray-600">
                        {c.lecturers?.map((l: any, i: number) => (
                          <div key={i} className="font-medium text-gray-800">{l.name}</div>
                        ))}
                        {(!c.lecturers || c.lecturers.length === 0) && <span className="italic text-gray-400">Department Faculty</span>}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-600">
                        {c.schedules?.map((s: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <span className="font-semibold text-gray-700">{s.day}:</span> {s.time} ({s.venue})
                          </div>
                        ))}
                        {(!c.schedules || c.schedules.length === 0) && <span className="italic text-gray-400">TBA</span>}
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-xl w-full shadow-2xl border border-gray-200 relative animate-in fade-in zoom-in-95">
            <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <UploadCloud className="w-6 h-6 text-indigo-600" />
              Submit Assignment Solution Online
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              Enter your written solution, GitHub repo URL, or upload your assignment document (.zip, .pdf, .docx).
            </p>

            {submitMessage && (
              <div className={`p-4 rounded-xl text-xs font-semibold mb-4 flex items-center gap-2 ${
                submitMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {submitMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                {submitMessage.text}
              </div>
            )}

            <form onSubmit={handleAssignmentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Written Response / Repository Link / Notes
                </label>
                <textarea
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  rows={4}
                  placeholder="Paste your source code, GitHub repo URL, or executive summary here..."
                  className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Attach Solution File (Optional)
                </label>
                <input
                  type="file"
                  onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSubmittingAssignmentId(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5 shadow-md"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
