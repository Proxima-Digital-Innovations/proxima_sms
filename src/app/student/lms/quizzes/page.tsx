'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getLmsCourses } from '@/actions/lms-content-actions';
import { submitQuizAttempt } from '@/actions/lms-quiz-actions';
import { 
  Zap, Clock, ShieldAlert, CheckCircle, 
  ChevronRight, ArrowLeft, Trophy, AlertTriangle 
} from 'lucide-react';

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

  useEffect(() => {
    async function load() {
      const res = await getLmsCourses();
      if (res.success) setCourses(res.modules);
      setLoading(false);
    }
    load();
  }, []);

  const handleStartQuiz = (quiz: any) => {
    setSelectedQuiz(quiz);
    setAnswers({});
    setIsTaking(true);
    setResult(null);
  };

  const handleSubmit = async () => {
    if (!selectedQuiz) return;
    setSubmitting(true);
    
    const studentId = (session?.user as any)?.id || '';
    const res = await submitQuizAttempt(selectedQuiz.id, studentId, answers);
    
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
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        
        {result ? (
          /* RESULT SCREEN */
          <div className="py-20 text-center space-y-8 animate-in zoom-in-95">
             <div className="w-32 h-32 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto border-4 border-amber-500/30">
                <Trophy className="w-16 h-16 text-amber-500" />
             </div>
             <h1 className="text-6xl font-black italic tracking-tighter">Assessment Complete</h1>
             <div className="max-w-sm mx-auto bg-neutral-900 border border-white/10 p-10 rounded-3xl">
                <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2">Final Score</div>
                <div className="text-7xl font-black text-white">{Math.round(result.score)}%</div>
                <div className="mt-6 flex items-center justify-center gap-2 text-emerald-500 font-bold text-sm">
                   <CheckCircle className="w-4 h-4" /> Posted to SIS Report Card
                </div>
             </div>
             <button onClick={() => { setSelectedQuiz(null); setResult(null); }} className="px-10 py-4 bg-white text-black font-black rounded-2xl">Return to Course</button>
          </div>
        ) : isTaking ? (
          /* QUIZ TAKER */
          <div className="space-y-12">
             <div className="flex justify-between items-center bg-neutral-900/50 border border-white/10 p-6 rounded-3xl backdrop-blur-xl">
                <div>
                   <h2 className="text-2xl font-black">{selectedQuiz.title}</h2>
                   <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mt-1">In Progress • Auto-Grade Enabled</p>
                </div>
                <div className="flex items-center gap-6">
                   <div className="text-right">
                      <div className="text-[10px] font-black text-neutral-600 uppercase mb-1">Time Remaining</div>
                      <div className="text-2xl font-mono font-black text-amber-500">{selectedQuiz.timeLimit}:00</div>
                   </div>
                   <div className="w-px h-10 bg-white/10" />
                   <ShieldAlert className="w-8 h-8 text-rose-500 opacity-50" />
                </div>
             </div>

             <div className="space-y-10">
                {selectedQuiz.questions.map((q: any, i: number) => {
                  const options = q.options ? JSON.parse(q.options) : [];
                  return (
                    <div key={q.id} className="bg-neutral-900/40 border border-white/5 rounded-3xl p-10">
                       <div className="flex items-center gap-4 mb-8">
                          <span className="text-xs font-black text-amber-500 uppercase">Question {i + 1}</span>
                          <div className="h-px flex-1 bg-white/5" />
                       </div>
                       <h3 className="text-2xl font-bold mb-10 leading-snug">{q.question}</h3>
                       
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
                              placeholder="Type your answer here..."
                              className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-xl font-bold outline-none focus:border-amber-500 transition-colors"
                            />
                          )}
                       </div>
                    </div>
                  )
                })}
             </div>

             <div className="flex justify-between items-center py-10 border-t border-white/5">
                <div className="flex items-center gap-3 text-amber-500/50">
                   <AlertTriangle className="w-5 h-5" />
                   <span className="text-xs font-bold italic uppercase tracking-wider">Final submission cannot be undone.</span>
                </div>
                <button 
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-12 py-5 bg-white text-black font-black rounded-2xl shadow-[0_0_50px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
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
                  Quizzes are auto-graded and instantly update your gradebook records.
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
