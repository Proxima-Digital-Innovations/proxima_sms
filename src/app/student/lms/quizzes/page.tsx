'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getLmsCourses } from '@/actions/lms-content-actions';
import { submitQuizAttempt } from '@/actions/lms-quiz-actions';
import { 
  Zap, Clock, ShieldAlert, CheckCircle, 
  ChevronRight, ArrowLeft, Trophy, AlertTriangle, EyeOff, Lock
} from 'lucide-react';

// Steganographic invisible watermarking with zero-width characters (\u200B and \u200C)
function embedWatermark(text: string, identifier: string): string {
  if (!text || !identifier) return text || '';
  const binary = identifier
    .split('')
    .map((c) => c.charCodeAt(0).toString(2).padStart(8, '0'))
    .join('');
  const invisibleSeq = binary
    .split('')
    .map((b) => (b === '1' ? '\u200C' : '\u200B'))
    .join('');
  const mid = Math.floor(text.length / 2);
  return text.slice(0, mid) + invisibleSeq + text.slice(mid);
}

export default function StudentAssessmentPlayer() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null);
  
  // Quiz State
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isTaking, setIsTaking] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Anti-Cheat & Telemetry
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [pasteCount, setPasteCount] = useState(0);
  const [pastedChars, setPastedChars] = useState(0);
  const [isPasteFlagged, setIsPasteFlagged] = useState(false);
  const [securityAlert, setSecurityAlert] = useState<string | null>(null);

  const studentIdentifier = (session?.user as any)?.admissionNumber || (session?.user as any)?.email || (session?.user as any)?.name || 'STUDENT-SESSION';

  useEffect(() => {
    async function load() {
      const res = await getLmsCourses();
      if (res.success) setCourses(res.modules);
      setLoading(false);
    }
    load();
  }, []);

  // Anti-cheat window blur & visibility detection while taking quiz
  useEffect(() => {
    if (!isTaking || result) return;

    const handleFocusLoss = () => {
      setTabSwitchCount((prev) => {
        const next = prev + 1;
        setSecurityAlert(`Academic Integrity Alert: Focus lost from exam environment (Strike ${next}). Tab switches are audited.`);
        return next;
      });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleFocusLoss();
      }
    };

    window.addEventListener('blur', handleFocusLoss);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('blur', handleFocusLoss);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isTaking, result]);

  // Anti-cheat copy & inspect keyboard shortcuts lockdown
  useEffect(() => {
    if (!isTaking) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'u', 'C', 'X', 'U'].includes(e.key)) {
        if (!['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
          e.preventDefault();
          setSecurityAlert('Question copying is restricted during academic assessments.');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTaking]);

  const handleStartQuiz = (quiz: any) => {
    setSelectedQuiz(quiz);
    setAnswers({});
    setIsTaking(true);
    setResult(null);
    setTabSwitchCount(0);
    setPasteCount(0);
    setPastedChars(0);
    setIsPasteFlagged(false);
    setSecurityAlert(null);
  };

  const handleInterceptCopy = (e: React.ClipboardEvent) => {
    e.preventDefault();
    setSecurityAlert('Copying assessment questions is strictly prohibited.');
  };

  const handleInterceptPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text') || '';
    const length = text.length;
    setPastedChars((prev) => prev + length);
    setPasteCount((prev) => prev + 1);

    if (length > 40) {
      setIsPasteFlagged(true);
      setSecurityAlert(`Clipboard paste detected (${length} chars). External answer pasting is audited.`);
    }
  };

  const handleSubmit = async () => {
    if (!selectedQuiz) return;
    setSubmitting(true);
    
    const studentId = (session?.user as any)?.id || '';
    const res = await submitQuizAttempt(
      selectedQuiz.id,
      studentId,
      answers,
      {
        pasteCount,
        tabSwitchCount,
        isPasteFlagged: isPasteFlagged || pastedChars > 50,
      }
    );
    
    if (res.success) {
      setResult(res);
      setIsTaking(false);
    }
    setSubmitting(false);
  };

  if (loading) {
    return <div className="min-h-screen bg-neutral-950 flex justify-center items-center"><div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8 font-sans select-none">
      <div className="max-w-5xl mx-auto">
        
        {/* Security Alert Toast */}
        {securityAlert && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-sm flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{securityAlert}</span>
            </div>
            <button 
              onClick={() => setSecurityAlert(null)}
              className="text-xs font-bold text-rose-400 hover:text-white px-2 py-1 rounded-lg bg-rose-500/20"
            >
              Dismiss
            </button>
          </div>
        )}

        {result ? (
          /* RESULT SCREEN */
          <div className="py-20 text-center space-y-8 animate-in zoom-in-95">
             <div className="w-32 h-32 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto border-4 border-amber-500/30">
                <Trophy className="w-16 h-16 text-amber-500" />
             </div>
             <h1 className="text-6xl font-black italic tracking-tighter">Assessment Complete</h1>
             <div className="max-w-sm mx-auto bg-neutral-900 border border-white/10 p-10 rounded-3xl space-y-4">
                <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2">Final Score</div>
                <div className="text-7xl font-black text-white">{Math.round(result.score)}%</div>
                
                {/* Telemetry report */}
                <div className="pt-4 border-t border-white/5 flex justify-center gap-4 text-xs font-semibold">
                  <span className={tabSwitchCount > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                    {tabSwitchCount} Tab Strikes
                  </span>
                  <span className="text-white/20">•</span>
                  <span className={isPasteFlagged ? 'text-amber-400' : 'text-emerald-400'}>
                    {pasteCount} Pastes
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-center gap-2 text-emerald-500 font-bold text-sm">
                   <CheckCircle className="w-4 h-4" /> Posted to SIS Report Card
                </div>
             </div>
             <button onClick={() => { setSelectedQuiz(null); setResult(null); }} className="px-10 py-4 bg-white text-black font-black rounded-2xl hover:scale-105 transition-all">Return to Course</button>
          </div>
        ) : isTaking ? (
          /* QUIZ TAKER */
          <div className="space-y-12">
             <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-neutral-900/50 border border-white/10 p-6 rounded-3xl backdrop-blur-xl">
                <div>
                   <h2 className="text-2xl font-black">{selectedQuiz.title}</h2>
                   <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mt-1">In Progress • Proctored Assessment</p>
                </div>
                <div className="flex items-center gap-4 sm:gap-6 self-start sm:self-auto">
                   {/* Telemetry indicator */}
                   <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${tabSwitchCount > 0 ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-white/5 border-white/10 text-neutral-400'}`}>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>{tabSwitchCount} Strikes</span>
                   </div>

                   <div className="text-right">
                      <div className="text-[10px] font-black text-neutral-600 uppercase mb-1">Time Remaining</div>
                      <div className="text-2xl font-mono font-black text-amber-500">{selectedQuiz.timeLimit}:00</div>
                   </div>
                   <div className="w-px h-10 bg-white/10" />
                   <ShieldAlert className="w-8 h-8 text-rose-500 opacity-60" />
                </div>
             </div>

             <div className="space-y-10">
                {selectedQuiz.questions.map((q: any, i: number) => {
                  const options = q.options ? JSON.parse(q.options) : [];
                  return (
                    <div 
                      key={q.id} 
                      onCopy={handleInterceptCopy}
                      onContextMenu={(e) => { e.preventDefault(); setSecurityAlert('Right-click is restricted during academic assessments.'); }}
                      className="bg-neutral-900/40 border border-white/5 rounded-3xl p-10 select-none group"
                    >
                       <div className="flex items-center gap-4 mb-8">
                          <span className="text-xs font-black text-amber-500 uppercase flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5" /> Question {i + 1}
                          </span>
                          <div className="h-px flex-1 bg-white/5" />
                          <span className="text-[10px] font-mono text-neutral-600 bg-white/5 px-2 py-0.5 rounded">Protected Item</span>
                       </div>
                       
                       {/* Watermarked Question Prompt */}
                       <h3 className="text-2xl font-bold mb-10 leading-snug select-none">
                         {embedWatermark(q.question, studentIdentifier)}
                       </h3>
                       
                       <div className="space-y-4">
                          {q.type === 'MULTIPLE_CHOICE' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               {options.map((opt: string) => (
                                 <button 
                                   key={opt} 
                                   onClick={() => setAnswers({...answers, [q.id]: opt})}
                                   className={`p-6 rounded-2xl text-left font-bold transition-all border ${answers[q.id] === opt ? 'bg-amber-500 border-amber-400 text-black shadow-lg scale-[1.02]' : 'bg-black/40 border-white/5 hover:bg-white/5 text-neutral-400'}`}
                                 >
                                    {opt}
                                 </button>
                               ))}
                            </div>
                          ) : q.type === 'TRUE_FALSE' ? (
                            <div className="flex gap-4">
                               {['True', 'False'].map(opt => (
                                 <button 
                                   key={opt} 
                                   onClick={() => setAnswers({...answers, [q.id]: opt})}
                                   className={`flex-1 p-6 rounded-2xl font-black text-lg transition-all border ${answers[q.id] === opt ? 'bg-amber-500 border-amber-400 text-black shadow-lg' : 'bg-black/40 border-white/5 text-neutral-400'}`}
                                 >
                                    {opt}
                                 </button>
                               ))}
                            </div>
                          ) : (
                            <input 
                              value={answers[q.id] || ''} 
                              onChange={e => setAnswers({...answers, [q.id]: e.target.value})}
                              onPaste={handleInterceptPaste}
                              placeholder="Type your answer here..."
                              className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-xl font-bold outline-none focus:border-amber-500 transition-colors select-text"
                            />
                          )}
                       </div>
                    </div>
                  )
                })}
             </div>

             <div className="flex flex-col sm:flex-row justify-between items-center gap-4 py-10 border-t border-white/5">
                <div className="flex items-center gap-3 text-amber-500/70">
                   <AlertTriangle className="w-5 h-5 shrink-0" />
                   <span className="text-xs font-bold italic uppercase tracking-wider">Final submission cannot be undone. Tab switches and copy attempts are recorded.</span>
                </div>
                <button 
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full sm:w-auto px-12 py-5 bg-white text-black font-black rounded-2xl shadow-[0_0_50px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  {submitting ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Zap className="w-5 h-5" />}
                  Finish & Grade Now
                </button>
             </div>
          </div>
        ) : (
          /* COURSE LIST / QUIZ MENU */
          <div className="space-y-12">
             <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    <Zap className="w-4 h-4" /> Assessment Center
                  </div>
                  <h1 className="text-5xl font-black tracking-tight">Academic Quizzes</h1>
                </div>
                <p className="text-neutral-500 max-w-sm text-right text-sm font-medium leading-relaxed">
                  Quizzes are auto-graded with active browser proctoring and anti-cheat tracking.
                </p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {courses.flatMap(mod => mod.quizzes).map(q => (
                  <div key={q.id} className="bg-neutral-900/40 border border-white/5 rounded-3xl p-8 hover:border-amber-500/30 transition-all group overflow-hidden relative">
                     <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                        <Zap className="w-12 h-12 text-amber-500" />
                     </div>
                     <div className="flex items-center gap-2 mb-4">
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{q.timeLimit} Min Limit</span>
                        <span className="text-neutral-800">•</span>
                        <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">{q.questions?.length || 0} Questions</span>
                     </div>
                     <h3 className="text-2xl font-black text-white mb-6 leading-tight">{q.title}</h3>
                     <button 
                       onClick={() => handleStartQuiz(q)}
                       className="w-full flex items-center justify-center gap-3 py-4 bg-white/5 hover:bg-white text-neutral-400 hover:text-black font-black rounded-2xl transition-all border border-white/5"
                     >
                        Start Assessment <ChevronRight className="w-4 h-4" />
                     </button>
                  </div>
                ))}
             </div>

             {courses.flatMap(mod => mod.quizzes).length === 0 && (
               <div className="py-32 text-center border-2 border-dashed border-white/5 rounded-3xl opacity-20">
                  <Zap className="w-16 h-16 mx-auto mb-4" />
                  <p className="text-xl font-bold italic">No active quizzes scheduled.</p>
               </div>
             )}
          </div>
        )}

      </div>
    </div>
  );
}
