'use client';

import { useState, useEffect } from 'react';
import { getLmsCourses } from '@/actions/lms-content-actions';
import { createQuiz, addQuizQuestion, getQuizzes } from '@/actions/lms-quiz-actions';
import { 
  Zap, Plus, ListChecks, HelpCircle, Save, 
  Trash2, Clock, ShieldCheck, ChevronRight, Layout 
} from 'lucide-react';

export default function QuizBuilder() {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedModule, setSelectedModule] = useState<any>(null);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null);
  
  // Quiz State
  const [showNewQuiz, setShowNewQuiz] = useState(false);
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [newQuizTime, setNewQuizTime] = useState('30');
  
  // Question State
  const [showNewQuestion, setShowNewQuestion] = useState(false);
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState('MULTIPLE_CHOICE');
  const [qAnswer, setQAnswer] = useState('');
  const [qOptions, setQOptions] = useState(['', '', '', '']); // For MC

  useEffect(() => {
    async function load() {
      const res = await getLmsCourses();
      if (res.success) setCourses(res.modules);
      setLoading(false);
    }
    load();
  }, []);

  const handleSelectModule = async (mod: any) => {
    setSelectedModule(mod);
    const res = await getQuizzes(mod.id);
    if (res.success) setQuizzes(res.quizzes);
    setSelectedQuiz(null);
  };

  const handleCreateQuiz = async () => {
    if (!newQuizTitle) return;
    const res = await createQuiz(selectedModule.id, newQuizTitle, '', parseInt(newQuizTime));
    if (res.success) {
      setQuizzes([...quizzes, res.quiz]);
      setShowNewQuiz(false);
      setNewQuizTitle('');
    }
  };

  const handleAddQuestion = async () => {
    if (!qText || !qAnswer) return;
    const res = await addQuizQuestion(
      selectedQuiz.id, 
      qText, 
      qType, 
      qAnswer, 
      qType === 'MULTIPLE_CHOICE' ? JSON.stringify(qOptions) : undefined
    );
    if (res.success) {
      // Update local state
      const updated = { ...selectedQuiz };
      updated.questions = [...(updated.questions || []), res.question];
      setSelectedQuiz(updated);
      setShowNewQuestion(false);
      setQText('');
      setQAnswer('');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-neutral-950 flex justify-center items-center"><div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex font-sans">
      
      {/* Module Selector Sidebar */}
      <div className="w-80 bg-neutral-900 border-r border-white/5 flex flex-col">
         <div className="p-6 border-b border-white/5 bg-amber-500/5">
            <h1 className="text-xl font-black italic tracking-tighter flex items-center gap-2">
               <Zap className="text-amber-500 w-5 h-5" /> Quiz Architect
            </h1>
            <p className="text-[10px] font-bold text-neutral-500 uppercase mt-1 tracking-widest">Assessment Builder</p>
         </div>

         <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
            {courses.map(mod => (
               <button 
                 key={mod.id} 
                 onClick={() => handleSelectModule(mod)}
                 className={`w-full text-left p-4 rounded-2xl transition-all ${selectedModule?.id === mod.id ? 'bg-amber-500/10 border border-amber-500/30 text-amber-100' : 'hover:bg-white/5 text-neutral-500'}`}
               >
                  <div className="text-[10px] font-black uppercase mb-1 opacity-50">{mod.subject.name}</div>
                  <div className="font-bold text-sm truncate">{mod.title}</div>
               </button>
            ))}
         </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 overflow-hidden flex">
         
         {!selectedModule ? (
           <div className="flex-1 flex flex-col items-center justify-center opacity-20">
              <Layout className="w-20 h-20 mb-4" />
              <p className="text-xl font-bold">Select a module to build quizzes.</p>
           </div>
         ) : (
           <>
              {/* Quiz List in Module */}
              <div className="w-72 border-r border-white/5 bg-black/20 flex flex-col">
                 <div className="p-4 border-b border-white/5 flex justify-between items-center">
                    <span className="text-[10px] font-black text-neutral-600 uppercase">Assessments</span>
                    <button onClick={() => setShowNewQuiz(true)} className="p-1 hover:bg-white/10 rounded-lg text-amber-500"><Plus className="w-4 h-4" /></button>
                 </div>
                 
                 <div className="p-2 space-y-1">
                    {quizzes.map(q => (
                       <button 
                         key={q.id} 
                         onClick={() => setSelectedQuiz(q)}
                         className={`w-full text-left p-4 rounded-xl transition-all ${selectedQuiz?.id === q.id ? 'bg-white/10 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                       >
                          <div className="font-bold text-sm">{q.title}</div>
                          <div className="text-[10px] font-bold opacity-40 mt-1">{q.questions?.length || 0} Questions</div>
                       </button>
                    ))}
                 </div>
              </div>

              {/* Quiz Editor */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-12 bg-black/40">
                 {showNewQuiz ? (
                   <div className="max-w-2xl mx-auto bg-neutral-900 border border-amber-500/20 rounded-3xl p-8 animate-in zoom-in-95 duration-200">
                      <h2 className="text-2xl font-black mb-6">Create New Quiz</h2>
                      <div className="space-y-6">
                         <div>
                            <label className="text-xs font-bold text-neutral-500 uppercase mb-2 block">Quiz Title</label>
                            <input value={newQuizTitle} onChange={e => setNewQuizTitle(e.target.value)} placeholder="e.g. Midterm Physics Assessment" className="w-full bg-black/40 border border-white/10 rounded-xl p-4 outline-none focus:border-amber-500" />
                         </div>
                         <div>
                            <label className="text-xs font-bold text-neutral-500 uppercase mb-2 block">Time Limit (Minutes)</label>
                            <input type="number" value={newQuizTime} onChange={e => setNewQuizTime(e.target.value)} className="w-32 bg-black/40 border border-white/10 rounded-xl p-4 outline-none focus:border-amber-500" />
                         </div>
                         <div className="flex gap-4 pt-4">
                            <button onClick={handleCreateQuiz} className="flex-1 bg-amber-500 text-black font-black py-4 rounded-2xl">Initialize Quiz</button>
                            <button onClick={() => setShowNewQuiz(false)} className="px-8 py-4 text-neutral-500 font-bold">Cancel</button>
                         </div>
                      </div>
                   </div>
                 ) : selectedQuiz ? (
                   <div className="max-w-4xl mx-auto space-y-10 pb-20">
                      {/* Quiz Header */}
                      <div className="flex justify-between items-end">
                         <div>
                            <h2 className="text-5xl font-black text-white">{selectedQuiz.title}</h2>
                            <div className="flex items-center gap-4 text-xs font-bold text-neutral-500 mt-4">
                               <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {selectedQuiz.timeLimit} Min Limit</span>
                               <span className="w-1 h-1 rounded-full bg-neutral-800" />
                               <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-amber-500" /> Secure Mode Enabled</span>
                            </div>
                         </div>
                         <button onClick={() => setShowNewQuestion(true)} className="px-8 py-3 bg-amber-500 text-black font-black rounded-xl hover:scale-105 transition-transform flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Add Question
                         </button>
                      </div>

                      {/* Question List */}
                      <div className="space-y-6">
                         {selectedQuiz.questions?.map((q: any, idx: number) => (
                           <div key={q.id} className="bg-neutral-900/40 border border-white/5 rounded-3xl p-8 hover:border-white/10 transition-colors group">
                              <div className="flex justify-between items-start mb-6">
                                 <span className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center font-black text-amber-500">Q{idx + 1}</span>
                                 <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="p-2 text-neutral-700 hover:text-white"><Trash2 className="w-4 h-4" /></button>
                                 </div>
                              </div>
                              <h4 className="text-xl font-bold mb-6">{q.question}</h4>
                              <div className="grid grid-cols-2 gap-4">
                                 <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                                    <span className="text-[10px] font-black text-neutral-600 uppercase block mb-2">Question Type</span>
                                    <span className="text-xs font-bold">{q.type.replace('_', ' ')}</span>
                                 </div>
                                 <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/20">
                                    <span className="text-[10px] font-black text-emerald-600 uppercase block mb-2 tracking-widest">Key</span>
                                    <span className="text-xs font-black text-emerald-400">{q.correctAnswer}</span>
                                 </div>
                              </div>
                           </div>
                         ))}

                         {showNewQuestion && (
                           <div className="bg-neutral-900 border-2 border-amber-500/30 rounded-3xl p-8 animate-in slide-in-from-bottom-4">
                              <h3 className="text-xl font-black mb-6">New Question Definition</h3>
                              <div className="space-y-6">
                                 <div>
                                    <label className="text-xs font-bold text-neutral-500 uppercase mb-2 block">Question Prompt</label>
                                    <textarea value={qText} onChange={e => setQText(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 outline-none focus:border-amber-500 resize-none" rows={3} />
                                 </div>
                                 <div className="grid grid-cols-2 gap-6">
                                    <div>
                                       <label className="text-xs font-bold text-neutral-500 uppercase mb-2 block">Type</label>
                                       <select value={qType} onChange={e => setQType(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 outline-none focus:border-amber-500">
                                          <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                                          <option value="TRUE_FALSE">True / False</option>
                                          <option value="SHORT_ANSWER">Short Answer</option>
                                       </select>
                                    </div>
                                    <div>
                                       <label className="text-xs font-bold text-emerald-600 uppercase mb-2 block">Correct Answer (Key)</label>
                                       <input value={qAnswer} onChange={e => setQAnswer(e.target.value)} placeholder="The correct answer..." className="w-full bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 outline-none focus:border-emerald-500 text-emerald-400 font-bold" />
                                    </div>
                                 </div>
                                 
                                 {qType === 'MULTIPLE_CHOICE' && (
                                   <div className="grid grid-cols-2 gap-4 pt-4">
                                      {qOptions.map((opt, i) => (
                                        <div key={i}>
                                           <label className="text-[10px] font-bold text-neutral-600 uppercase mb-1 block">Option {i + 1}</label>
                                           <input 
                                             value={opt} 
                                             onChange={e => {
                                               const next = [...qOptions];
                                               next[i] = e.target.value;
                                               setQOptions(next);
                                             }}
                                             placeholder={`Option ${i + 1}`} 
                                             className="w-full bg-black/20 border border-white/5 rounded-lg p-3 text-sm" 
                                           />
                                        </div>
                                      ))}
                                   </div>
                                 )}

                                 <div className="flex gap-4 pt-6">
                                    <button onClick={handleAddQuestion} className="flex-1 bg-white text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2">
                                       <Save className="w-4 h-4" /> Commit Question
                                    </button>
                                    <button onClick={() => setShowNewQuestion(false)} className="px-8 py-4 text-neutral-500 font-bold">Discard</button>
                                 </div>
                              </div>
                           </div>
                         )}

                         <div className="py-20 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center opacity-30">
                            <HelpCircle className="w-12 h-12 mb-4" />
                            <p className="font-bold">No more questions. Ready to publish?</p>
                         </div>
                      </div>
                   </div>
                 ) : (
                   <div className="flex-1 flex flex-col items-center justify-center opacity-20">
                      <ListChecks className="w-20 h-20 mb-4" />
                      <p className="text-xl font-bold italic">Select a quiz from the list or create a new one.</p>
                   </div>
                 )}
              </div>
           </>
         )}
      </div>
    </div>
  );
}
