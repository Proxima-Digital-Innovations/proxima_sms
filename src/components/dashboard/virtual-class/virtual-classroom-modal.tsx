'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  MessageSquare,
  ThumbsUp,
  CheckCircle2,
  PhoneOff,
  Maximize2,
  Minimize2,
  Wifi,
  Radio,
  Send,
  Users,
  Hand,
  Sparkles,
  Monitor,
  Disc,
  Download,
  UploadCloud,
  Layers,
  Settings,
  AlertCircle
} from 'lucide-react';
import {
  LiveVirtualClassSession,
  LiveClassQuestion,
  postLiveQuestionAction,
  upvoteLiveQuestionAction,
  markLiveQuestionAnsweredAction,
  uploadLectureMaterialAction
} from '@/actions/tertiary-classroom-actions';

interface VirtualClassroomModalProps {
  session: LiveVirtualClassSession;
  currentUser: {
    id: string;
    name: string;
    role: 'LECTURER' | 'STUDENT';
    matricNumber?: string;
  };
  onClose: () => void;
  onEndSession?: (sessionId: string) => void;
}

export function VirtualClassroomModal({
  session,
  currentUser,
  onClose,
  onEndSession
}: VirtualClassroomModalProps) {
  const [questions, setQuestions] = useState<LiveClassQuestion[]>(session.questions || []);
  const [newQuestion, setNewQuestion] = useState('');
  const [isSubmittingQ, setIsSubmittingQ] = useState(false);
  const [showQuestions, setShowQuestions] = useState(true);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const isLecturer = currentUser.role === 'LECTURER';

  // Video / Audio Stream State
  const [mode, setMode] = useState<'NATIVE' | 'WEBRTC_ROOM'>('NATIVE');
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  // Live Recording State (Native MediaRecorder)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isPublishingRecording, setIsPublishingRecording] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Native Camera & Mic
  useEffect(() => {
    let active = true;

    async function initMedia() {
      try {
        setDeviceError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

        if (!active) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        console.warn('Could not acquire camera/mic:', err);
        setDeviceError('Camera or microphone permission not granted. You can still stream slides or audio.');
      }
    }

    if (mode === 'NATIVE') {
      initMedia();
    }

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [mode]);

  // Toggle Microphone
  const toggleMic = () => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMicOn(prev => !prev);
    }
  };

  // Toggle Video
  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOn(prev => !prev);
    }
  };

  // Toggle Screen Sharing
  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        // Revert to camera
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        setIsScreenSharing(false);
      } else {
        // Capture screen
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = screenStream;
        if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
        setIsScreenSharing(true);

        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(camStream => {
            streamRef.current = camStream;
            if (localVideoRef.current) localVideoRef.current.srcObject = camStream;
          });
        };
      }
    } catch (err) {
      console.warn('Screen share cancelled:', err);
    }
  };

  // Start In-Browser Live Recording
  const startRecording = () => {
    if (!streamRef.current) {
      alert('Camera / audio stream is required to start recording.');
      return;
    }

    recordedChunksRef.current = [];
    setRecordedBlobUrl(null);
    setRecordedBlob(null);
    setPublishSuccess(false);

    try {
      const recorder = new MediaRecorder(streamRef.current, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
          ? 'video/webm;codecs=vp9,opus'
          : 'video/webm'
      });

      recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const fullBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(fullBlob);
        setRecordedBlob(fullBlob);
        setRecordedBlobUrl(url);
      };

      recorder.start(1000); // 1-second chunks
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recorder:', err);
      alert('Could not start video recorder on this browser.');
    }
  };

  // Stop Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  // 1-Click Publish Recording directly to students
  const handlePublishRecording = async () => {
    if (!recordedBlob) return;
    setIsPublishingRecording(true);

    try {
      const file = new File([recordedBlob], `${session.courseCode}_Live_Lecture_${Date.now()}.webm`, {
        type: 'video/webm'
      });

      const formData = new FormData();
      formData.append('courseOfferingId', session.courseOfferingId);
      formData.append('uploadedById', session.lecturerId);
      formData.append('title', `Live Lecture Recording: ${session.topic}`);
      formData.append('description', `Recorded live during virtual classroom session on ${new Date().toLocaleDateString()}.`);
      formData.append('weekNumber', '1');
      formData.append('materialType', 'VIDEO_LINK');
      formData.append('file', file);

      const res = await uploadLectureMaterialAction(formData);
      if (res.success) {
        setPublishSuccess(true);
      } else {
        alert(res.error || 'Failed to publish recording.');
      }
    } catch (err: any) {
      console.error('Error publishing recording:', err);
      alert('Error publishing recording.');
    } finally {
      setIsPublishingRecording(false);
    }
  };

  const handleSendQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || isSubmittingQ) return;

    setIsSubmittingQ(true);
    try {
      const res = await postLiveQuestionAction({
        sessionId: session.id,
        studentId: currentUser.id,
        studentName: currentUser.name,
        matricNumber: currentUser.matricNumber,
        question: newQuestion.trim()
      });

      if (res.success && res.question) {
        setQuestions(prev => [res.question!, ...prev]);
        setNewQuestion('');
      }
    } catch (err) {
      console.error('Failed to post question:', err);
    } finally {
      setIsSubmittingQ(false);
    }
  };

  const handleUpvote = async (questionId: string) => {
    try {
      const res = await upvoteLiveQuestionAction(session.id, questionId, currentUser.id);
      if (res.success) {
        setQuestions(prev =>
          prev.map(q => {
            if (q.id === questionId) {
              const hasUpvoted = q.upvotedBy.includes(currentUser.id);
              const newUpvotedBy = hasUpvoted
                ? q.upvotedBy.filter(id => id !== currentUser.id)
                : [...q.upvotedBy, currentUser.id];
              return { ...q, upvotes: newUpvotedBy.length, upvotedBy: newUpvotedBy };
            }
            return q;
          }).sort((a, b) => b.upvotes - a.upvotes)
        );
      }
    } catch (err) {
      console.error('Failed to upvote:', err);
    }
  };

  const handleMarkAnswered = async (questionId: string) => {
    try {
      const res = await markLiveQuestionAnsweredAction(session.id, questionId);
      if (res.success) {
        setQuestions(prev =>
          prev.map(q => (q.id === questionId ? { ...q, isAnswered: true } : q))
        );
      }
    } catch (err) {
      console.error('Failed to mark answered:', err);
    }
  };

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Strictly English-enforced open Jitsi URL (if user wants multi-user grid)
  const englishJitsiUrl = `https://meet.jit.si/${session.roomName}#config.defaultLanguage=%22en%22&config.language=%22en%22&config.prejoinConfig.enabled=false&userInfo.displayName=${encodeURIComponent(currentUser.name)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4">
      <div className="w-full h-full max-w-7xl bg-card border border-border rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* TOP BAR / CLASS HEADER */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded-md border border-rose-500/30">
                  LIVE VIRTUAL HALL
                </span>
                <span className="text-sm font-black text-white">{session.courseCode}</span>
                <span className="text-xs text-slate-300 hidden sm:inline">• {session.topic}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                <span>Instructor: <strong className="text-slate-200">{session.lecturerName}</strong></span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-emerald-400" />
                  Remote Students Connected
                </span>
              </div>
            </div>
          </div>

          {/* TOP CONTROLS */}
          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-white/10 p-1 rounded-xl text-xs font-bold border border-white/10">
              <button
                type="button"
                onClick={() => setMode('NATIVE')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  mode === 'NATIVE' ? 'bg-primary text-white shadow' : 'text-slate-300 hover:text-white'
                }`}
              >
                Direct Broadcast &amp; Recording
              </button>
              <button
                type="button"
                onClick={() => setMode('WEBRTC_ROOM')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  mode === 'WEBRTC_ROOM' ? 'bg-primary text-white shadow' : 'text-slate-300 hover:text-white'
                }`}
              >
                Multi-User Room (English)
              </button>
            </div>

            {/* Student Raise Hand */}
            {!isLecturer && (
              <button
                onClick={() => setIsHandRaised(!isHandRaised)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                  isHandRaised
                    ? 'bg-amber-500 text-black border-amber-400'
                    : 'bg-white/10 text-slate-200 hover:bg-white/15 border-white/10'
                }`}
              >
                <Hand className={`w-3.5 h-3.5 ${isHandRaised ? 'animate-bounce' : ''}`} />
                <span>{isHandRaised ? 'Hand Raised ✋' : 'Raise Hand'}</span>
              </button>
            )}

            {/* Toggle Q&A Panel */}
            <button
              onClick={() => setShowQuestions(!showQuestions)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                showQuestions
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-white/10 text-slate-200 hover:bg-white/15 border-white/10'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Live Q&amp;A ({questions.length})</span>
            </button>

            {/* End Class (Lecturer) or Leave (Student) */}
            {isLecturer ? (
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to conclude this live virtual class for all students?')) {
                    if (onEndSession) onEndSession(session.id);
                    onClose();
                  }
                }}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                End Class
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                Leave Hall
              </button>
            )}
          </div>
        </div>

        {/* MAIN BODY */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          
          {/* VIDEO & BROADCAST CANVAS */}
          <div className="flex-1 h-full bg-slate-950 flex flex-col relative overflow-hidden">
            {mode === 'NATIVE' ? (
              <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
                {/* Live Video Feed */}
                <div className="relative w-full h-full max-h-[75vh] bg-black/60 rounded-3xl overflow-hidden border border-white/10 flex items-center justify-center shadow-inner">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted={isLecturer}
                    className="w-full h-full object-contain"
                  />

                  {/* Top Recording HUD */}
                  {isRecording && (
                    <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-rose-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-rose-500/50 text-white text-xs font-bold animate-pulse">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                      REC {formatTimer(recordingSeconds)}
                    </div>
                  )}

                  {/* Device Error Warning */}
                  {deviceError && (
                    <div className="absolute inset-0 z-10 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center text-slate-300">
                      <AlertCircle className="w-12 h-12 text-amber-400 mb-3" />
                      <h4 className="text-base font-bold text-white mb-1">Camera / Mic Access Needed</h4>
                      <p className="text-xs text-slate-400 max-w-md mb-4">{deviceError}</p>
                      <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl"
                      >
                        Retry Permissions
                      </button>
                    </div>
                  )}

                  {/* In-Video Watermark / Info */}
                  <div className="absolute bottom-4 left-4 z-20 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-white text-xs font-bold flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                    <span>{session.courseCode}: {session.topic}</span>
                  </div>
                </div>

                {/* BOTTOM MEDIA TOOLBAR */}
                <div className="w-full max-w-2xl mt-4 px-4 py-3 bg-slate-900/95 border border-white/10 rounded-2xl backdrop-blur-lg flex flex-wrap items-center justify-between gap-3 shadow-xl">
                  {/* Mic & Video */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleMic}
                      className={`p-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isMicOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-rose-500 text-white'
                      }`}
                      title={isMicOn ? 'Mute Mic' : 'Unmute Mic'}
                    >
                      {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                      <span className="hidden sm:inline">{isMicOn ? 'Mute' : 'Unmuted'}</span>
                    </button>

                    <button
                      onClick={toggleVideo}
                      className={`p-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isVideoOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-rose-500 text-white'
                      }`}
                      title={isVideoOn ? 'Turn Video Off' : 'Turn Video On'}
                    >
                      {isVideoOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                      <span className="hidden sm:inline">{isVideoOn ? 'Camera On' : 'Camera Off'}</span>
                    </button>

                    {isLecturer && (
                      <button
                        onClick={toggleScreenShare}
                        className={`p-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                          isScreenSharing ? 'bg-primary text-white' : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                        title="Share your slides or full screen"
                      >
                        <Monitor className="w-4 h-4" />
                        <span className="hidden sm:inline">{isScreenSharing ? 'Stop Screen' : 'Share Screen'}</span>
                      </button>
                    )}
                  </div>

                  {/* Live Recording Buttons (Lecturer Only) */}
                  {isLecturer && (
                    <div className="flex items-center gap-2">
                      {!isRecording ? (
                        <button
                          onClick={startRecording}
                          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-1.5 active:scale-95"
                        >
                          <Disc className="w-4 h-4 animate-spin text-white" />
                          <span>Start Recording</span>
                        </button>
                      ) : (
                        <button
                          onClick={stopRecording}
                          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-500/40 rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-1.5 active:scale-95"
                        >
                          <span className="w-2.5 h-2.5 bg-rose-500 rounded-sm"></span>
                          <span>Stop Recording ({formatTimer(recordingSeconds)})</span>
                        </button>
                      )}

                      {/* Download / Publish Recording */}
                      {recordedBlobUrl && (
                        <div className="flex items-center gap-1.5">
                          <a
                            href={recordedBlobUrl}
                            download={`${session.courseCode}_Lecture_Recording.webm`}
                            className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow"
                            title="Download Recording to your computer"
                          >
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">Save</span>
                          </a>

                          <button
                            onClick={handlePublishRecording}
                            disabled={isPublishingRecording || publishSuccess}
                            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 shadow"
                          >
                            <UploadCloud className="w-4 h-4" />
                            <span>{publishSuccess ? 'Published to Students!' : 'Publish to Course'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Multi-User Meeting Frame (With Forced English & No Moderator Prompt) */
              <div className="w-full h-full relative">
                <iframe
                  src={englishJitsiUrl}
                  allow="camera; microphone; display-capture; autoplay; clipboard-write; encrypted-media"
                  className="w-full h-full border-0"
                  title="Virtual Classroom Stream"
                />
              </div>
            )}
          </div>

          {/* REAL-TIME INTERACTIVE Q&A PANEL */}
          {showQuestions && (
            <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-border bg-card flex flex-col h-72 lg:h-full">
              {/* Q&A Header */}
              <div className="p-3.5 border-b border-border bg-muted/30 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    Live Questions &amp; Queries
                  </h4>
                  <p className="text-[10px] text-muted-foreground">
                    Ask real-time questions; students can upvote key questions.
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                  {questions.filter(q => !q.isAnswered).length} Unanswered
                </span>
              </div>

              {/* Questions Stream */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {questions.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                    <Sparkles className="w-8 h-8 text-muted-foreground/40 mb-2" />
                    <p className="text-xs font-semibold">No questions posted yet.</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {isLecturer
                        ? 'Student questions will appear here with upvotes in real-time.'
                        : 'Have a question on what the lecturer just explained? Ask below!'}
                    </p>
                  </div>
                ) : (
                  questions.map(q => {
                    const hasUpvoted = q.upvotedBy.includes(currentUser.id);
                    return (
                      <div
                        key={q.id}
                        className={`p-3 rounded-2xl border text-xs transition-all ${
                          q.isAnswered
                            ? 'bg-muted/30 border-border/60 opacity-60'
                            : 'bg-card border-border hover:border-primary/40 shadow-sm'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div>
                            <span className="font-bold text-foreground">{q.studentName}</span>
                            {q.matricNumber && (
                              <span className="text-[10px] font-mono text-muted-foreground ml-1.5">
                                ({q.matricNumber})
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground">{q.createdAt}</span>
                        </div>

                        <p className="text-foreground/90 font-medium mb-2.5 whitespace-pre-wrap">
                          {q.question}
                        </p>

                        <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
                          {/* Upvote Button */}
                          <button
                            type="button"
                            onClick={() => handleUpvote(q.id)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg font-semibold transition-all ${
                              hasUpvoted
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <ThumbsUp className="w-3 h-3" />
                            <span>{q.upvotes}</span>
                          </button>

                          {/* Status / Lecturer Controls */}
                          {q.isAnswered ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" /> Answered Live
                            </span>
                          ) : isLecturer ? (
                            <button
                              type="button"
                              onClick={() => handleMarkAnswered(q.id)}
                              className="px-2 py-0.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 font-bold rounded-lg border border-emerald-500/20"
                            >
                              Mark Answered
                            </button>
                          ) : (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                              Pending Response
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Ask Question Form */}
              <form onSubmit={handleSendQuestion} className="p-3 border-t border-border bg-card">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={newQuestion}
                    onChange={e => setNewQuestion(e.target.value)}
                    placeholder={
                      isLecturer
                        ? 'Broadcast a discussion prompt to students...'
                        : 'Ask your instructor a question in real-time...'
                    }
                    className="w-full text-xs pl-3 pr-10 py-2.5 bg-background border border-input rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!newQuestion.trim() || isSubmittingQ}
                    className="absolute right-1.5 p-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg disabled:opacity-40 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
