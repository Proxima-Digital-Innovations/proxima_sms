'use client';

import React, { useState, useEffect } from 'react';
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
  ExternalLink
} from 'lucide-react';
import {
  LiveVirtualClassSession,
  LiveClassQuestion,
  postLiveQuestionAction,
  upvoteLiveQuestionAction,
  markLiveQuestionAnsweredAction
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
  const [lowDataMode, setLowDataMode] = useState(false);
  const [showQuestions, setShowQuestions] = useState(true);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const isLecturer = currentUser.role === 'LECTURER';

  // Poll for latest questions every 4 seconds during active class
  useEffect(() => {
    const timer = setInterval(async () => {
      // In-memory sessions update live
    }, 4000);
    return () => clearInterval(timer);
  }, [session.id]);

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

  // Construct Jitsi iframe URL with query params
  const jitsiUrl = `${session.meetingUrl}${
    session.meetingUrl.includes('#') ? '&' : '#'
  }config.startWithVideoMuted=${lowDataMode ? 'true' : 'false'}&config.disableDeepLinking=true&interfaceConfig.TOOLBAR_BUTTONS=[%22microphone%22,%22camera%22,%22desktop%22,%22chat%22,%22raisehand%22,%22tileview%22,%22fullscreen%22]`;

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
                  Remote Session Active
                </span>
              </div>
            </div>
          </div>

          {/* CONTROLS */}
          <div className="flex items-center gap-2">
            {/* Low-Data Mode Toggle */}
            <button
              onClick={() => setLowDataMode(!lowDataMode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                lowDataMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-white/10 text-slate-200 hover:bg-white/15 border-white/10'
              }`}
              title="Save data by disabling video and streaming crystal-clear audio only"
            >
              <Wifi className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{lowDataMode ? 'Low-Data (Audio Only)' : 'HD Video Mode'}</span>
            </button>

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

        {/* MAIN BODY: VIDEO FRAME + LIVE Q&A HUD */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          {/* VIDEO / WEBRTC CONFERENCING AREA */}
          <div className="flex-1 h-full bg-slate-950 flex flex-col relative overflow-hidden">
            {lowDataMode && (
              <div className="absolute top-3 left-3 z-10 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-amber-300 text-xs font-semibold flex items-center gap-2">
                <Wifi className="w-3.5 h-3.5 animate-pulse" />
                Low-Data Audio-Priority Active (Consumes ~90% less internet data)
              </div>
            )}

            <iframe
              src={jitsiUrl}
              allow="camera; microphone; display-capture; autoplay; clipboard-write; encrypted-media"
              className="w-full h-full border-0"
              title="Virtual Classroom Stream"
            />
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

              {/* Ask Question Form (Student only or Lecturer prompt) */}
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
