'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getLmsCourses } from '@/actions/lms-content-actions';
import { submitWork } from '@/actions/lms-assignment-actions';
import { 
  FileUp, Clock, CheckCircle, AlertCircle, Calendar, 
  BookOpen, ChevronRight, Send, Star 
} from 'lucide-react';

export default function StudentLmsPortal() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  
  // Submission State
  const [body, setBody] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await getLmsCourses();
      if (res.success) setCourses(res.modules);
      setLoading(false);
    }
    load();
  }, []);

  const handleSelectAssignment = (as: any) => {
    setSelectedAssignment(as);
    setSuccess(false);
    setBody('');
    setFileUrl('');
  };

  const handleSubmit = async () => {
    if (!selectedAssignment) return;
    setSubmitting(true);
    
    const studentId = (session?.user as any)?.id || '';
    const res = await submitWork(selectedAssignment.id, studentId, fileUrl, body);
    
    if (res.success) {
      setSuccess(true);
      setBody('');
      setFileUrl('');
    }
    setSubmitting(false);
  };

  if (loading) {
    return <div className="min-h-screen bg-neutral-950 flex justify-center items-center"><div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900/40 to-neutral-900/40 border border-white/10 p-8 shadow-2xl backdrop-blur-xl">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl opacity-50 pointer-events-none" />
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2">
              <BookOpen className="w-4 h-4" /> Student Learning Cloud
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight">Active Assignments</h1>
            <p className="text-neutral-400 mt-2 max-w-xl text-lg font-light leading-relaxed">
              Track your deadlines and submit your work directly to your instructors.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* ASSIGNMENT LIST */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-neutral-900/40 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
               <h3 className="text-sm font-black text-neutral-500 uppercase tracking-widest mb-6">Upcoming Deadlines</h3>
               <div className="space-y-4">
                  {courses.flatMap(mod => mod.assignments).map(as => {
                    const isSelected = selectedAssignment?.id === as.id;
                    return (
                      <button 
                        key={as.id} 
                        onClick={() => handleSelectAssignment(as)}
                        className={`w-full text-left p-5 rounded-2xl border transition-all ${isSelected ? 'bg-indigo-600 border-indigo-400 shadow-lg scale-[1.02]' : 'bg-black/40 border-white/5 hover:bg-white/5'}`}
                      >
                         <div className="flex justify-between items-start mb-2">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-indigo-100' : 'text-indigo-400'}`}>Points: {as.points}</span>
                            {as.dueDate && <span className="text-[10px] font-mono opacity-60 flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(as.dueDate).toLocaleDateString()}</span>}
                         </div>
                         <h4 className={`font-bold text-base ${isSelected ? 'text-white' : 'text-neutral-300'}`}>{as.title}</h4>
                      </button>
                    )
                  })}
               </div>
            </div>
          </div>

          {/* SUBMISSION WORKSPACE */}
          <div className="lg:col-span-8">
            {!selectedAssignment ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-20 border-2 border-dashed border-white/5 rounded-3xl opacity-30">
                 <FileUp className="w-16 h-16 mb-4" />
                 <p className="text-xl font-medium">Select an assignment to start working.</p>
              </div>
            ) : (
              <div className="bg-neutral-900/40 border border-white/10 rounded-3xl p-8 backdrop-blur-xl animate-in fade-in slide-in-from-right-4">
                 <div className="flex justify-between items-start mb-8">
                    <div>
                      <h2 className="text-3xl font-black text-white">{selectedAssignment.title}</h2>
                      <div className="flex items-center gap-4 text-sm font-bold text-neutral-500 mt-2">
                        <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Due: {selectedAssignment.dueDate ? new Date(selectedAssignment.dueDate).toLocaleString() : 'No deadline'}</span>
                        <span className="text-white/10">|</span>
                        <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-amber-500" /> {selectedAssignment.points} Points</span>
                      </div>
                    </div>
                 </div>

                 {success ? (
                   <div className="bg-emerald-500/10 border border-emerald-500/20 p-10 rounded-3xl text-center space-y-4">
                      <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                        <CheckCircle className="w-10 h-10 text-emerald-400" />
                      </div>
                      <h3 className="text-2xl font-black text-emerald-400">Assignment Submitted!</h3>
                      <p className="text-neutral-400 max-w-sm mx-auto font-medium">Your work has been uploaded and sent to your instructor for review.</p>
                      <button onClick={() => setSuccess(false)} className="mt-6 px-8 py-3 bg-white text-black font-black rounded-xl">Submit New Version</button>
                   </div>
                 ) : (
                   <div className="space-y-8">
                      <div className="bg-black/40 border border-white/5 p-6 rounded-2xl">
                         <h3 className="text-xs font-black text-neutral-500 uppercase tracking-widest mb-4">Instructions</h3>
                         <p className="text-neutral-300 leading-relaxed font-light">{selectedAssignment.description || 'No specific instructions provided. Submit your response below.'}</p>
                      </div>

                      <div>
                         <label className="text-xs font-bold text-neutral-500 uppercase mb-3 block">Response Text</label>
                         <textarea 
                           value={body} onChange={e => setBody(e.target.value)}
                           placeholder="Write your answer or summary here..."
                           rows={10}
                           className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 outline-none focus:border-indigo-500 transition-colors text-lg font-light leading-relaxed resize-none"
                         />
                      </div>

                      <div className="flex flex-col md:flex-row items-center gap-6">
                         <div className="flex-1 w-full">
                            <label className="text-xs font-bold text-neutral-500 uppercase mb-3 block">File Attachment (Optional)</label>
                            <div className="relative group">
                               <input 
                                 type="text" 
                                 value={fileUrl} onChange={e => setFileUrl(e.target.value)}
                                 placeholder="Paste cloud file URL or upload simulated..."
                                 className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 pr-32 outline-none focus:border-indigo-500 transition-colors"
                               />
                               <button className="absolute right-2 top-2 bottom-2 px-4 bg-indigo-600 text-white text-[10px] font-black uppercase rounded-lg">Upload File</button>
                            </div>
                         </div>
                         <button 
                           onClick={handleSubmit}
                           disabled={submitting || (!body && !fileUrl)}
                           className="w-full md:w-auto px-12 py-5 bg-white text-black font-black rounded-2xl shadow-[0_0_50px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                         >
                           {submitting ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Send className="w-5 h-5" />}
                           Turn In Assignment
                         </button>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-600 italic">
                         <AlertCircle className="w-3 h-3" />
                         Finalizing your submission will lock it for grading unless the teacher permits a resubmission.
                      </div>
                   </div>
                 )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
