'use client';

import { useState, useEffect } from 'react';
import { getLmsCourses } from '@/actions/lms-content-actions';
import { getSubmissions, gradeSubmission } from '@/actions/lms-assignment-actions';
import { 
  CheckCircle, Clock, FileText, User, ChevronRight, 
  ChevronLeft, Star, MessageSquare, Save, Search, Filter 
} from 'lucide-react';

export default function SpeedGrader() {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Grading State
  const [score, setScore] = useState<string>('');
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await getLmsCourses();
      if (res.success) {
        setCourses(res.modules);
        // Extract first assignment if exists
        const firstAssignment = res.modules.flatMap((m: any) => m.assignments)[0];
        if (firstAssignment) handleSelectAssignment(firstAssignment);
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleSelectAssignment = async (assignment: any) => {
    setSelectedAssignment(assignment);
    const res = await getSubmissions(assignment.id);
    if (res.success) {
      setSubmissions(res.submissions);
      setCurrentIndex(0);
      if (res.submissions.length > 0) {
        setScore(res.submissions[0].score?.toString() || '');
        setFeedback(res.submissions[0].feedback || '');
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < submissions.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setScore(submissions[nextIndex].score?.toString() || '');
      setFeedback(submissions[nextIndex].feedback || '');
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      setScore(submissions[prevIndex].score?.toString() || '');
      setFeedback(submissions[prevIndex].feedback || '');
    }
  };

  const handleSaveGrade = async () => {
    if (!submissions[currentIndex]) return;
    setSaving(true);
    const res = await gradeSubmission(submissions[currentIndex].id, parseFloat(score), feedback);
    if (res.success) {
      // Update local state
      const updated = [...submissions];
      updated[currentIndex] = res.submission;
      setSubmissions(updated);
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-neutral-950 flex justify-center items-center"><div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>;
  }

  const currentSubmission = submissions[currentIndex];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      
      {/* Top Navigation Bar */}
      <div className="h-16 bg-neutral-900 border-b border-white/10 flex items-center justify-between px-6 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <div className="bg-emerald-500/10 p-2 rounded-lg"><Star className="w-5 h-5 text-emerald-400" /></div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-widest text-emerald-500">SpeedGrader™ Terminal</h1>
            <p className="text-xs font-bold text-neutral-500 truncate max-w-[300px]">
              {selectedAssignment ? selectedAssignment.title : 'Select an assignment'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-black/40 px-4 py-2 rounded-xl border border-white/5">
          <button onClick={handlePrev} disabled={currentIndex === 0} className="disabled:opacity-20 hover:text-emerald-400 transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex flex-col items-center px-4 border-x border-white/10">
            <span className="text-xs font-black text-neutral-500">{currentIndex + 1} / {submissions.length}</span>
            <span className="text-[10px] font-bold text-emerald-500 uppercase">Grading Students</span>
          </div>
          <button onClick={handleNext} disabled={currentIndex === submissions.length - 1} className="disabled:opacity-20 hover:text-emerald-400 transition-colors">
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        <div className="flex items-center gap-3">
           <div className="text-right">
             <div className="text-[10px] font-black text-neutral-600 uppercase">Sync Status</div>
             <div className="text-xs font-bold text-emerald-500 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> SIS Passback Active</div>
           </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Sidebar: Assignment List */}
        <div className="w-72 bg-neutral-900/50 border-r border-white/5 overflow-y-auto custom-scrollbar">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-xs font-black text-neutral-500 uppercase tracking-widest">Assignments</h3>
            <Filter className="w-4 h-4 text-neutral-700" />
          </div>
          {courses.map((mod: any) => (
            <div key={mod.id}>
              <div className="px-4 py-2 bg-white/5 text-[10px] font-black text-neutral-500 uppercase tracking-widest border-y border-white/5">{mod.title}</div>
              {mod.assignments.map((as: any) => (
                <button 
                  key={as.id} 
                  onClick={() => handleSelectAssignment(as)}
                  className={`w-full text-left px-6 py-4 border-b border-white/5 hover:bg-emerald-500/5 transition-colors ${selectedAssignment?.id === as.id ? 'bg-emerald-500/10 border-r-2 border-r-emerald-500' : ''}`}
                >
                  <div className="font-bold text-sm text-neutral-300">{as.title}</div>
                  <div className="text-[10px] font-bold text-neutral-600 mt-1">{as.points} Points • {as.submissions?.length || 0} Turned in</div>
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Main Content: Submission View */}
        <div className="flex-1 bg-black flex flex-col relative">
          {!currentSubmission ? (
            <div className="flex-1 flex flex-col items-center justify-center opacity-20">
              <FileText className="w-20 h-20 mb-4" />
              <p className="text-xl font-bold italic">No submissions for this assignment yet.</p>
            </div>
          ) : (
            <>
              {/* Student Meta */}
              <div className="p-6 bg-neutral-900/40 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/30">
                    <User className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white">{currentSubmission.student.firstName} {currentSubmission.student.lastName}</h2>
                    <div className="flex items-center gap-3 text-xs font-bold text-neutral-500 mt-1">
                       <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Submitted {new Date(currentSubmission.submittedAt).toLocaleString()}</span>
                       <span className="text-emerald-500/50">•</span>
                       <span className="text-emerald-500 uppercase">On Time</span>
                    </div>
                  </div>
                </div>
                <button className="px-4 py-2 bg-white/5 rounded-xl text-xs font-bold hover:bg-white/10 transition-colors border border-white/10">View Log</button>
              </div>

              {/* Submission Content */}
              <div className="flex-1 p-12 overflow-y-auto custom-scrollbar">
                <div className="max-w-3xl mx-auto bg-neutral-900 border border-white/10 rounded-3xl p-10 shadow-2xl min-h-[600px]">
                   <div className="flex items-center gap-2 text-xs font-black text-emerald-500 uppercase mb-6 tracking-widest">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Student Submission
                   </div>
                   {currentSubmission.body ? (
                     <div className="prose prose-invert max-w-none text-lg leading-relaxed font-light text-neutral-300">
                        {currentSubmission.body}
                     </div>
                   ) : (
                     <div className="flex flex-col items-center justify-center py-20 bg-black/40 rounded-2xl border border-dashed border-white/10">
                        <FileText className="w-12 h-12 text-neutral-700 mb-4" />
                        <p className="font-bold text-neutral-500">File attached: {currentSubmission.fileUrl?.split('/').pop() || 'submission.pdf'}</p>
                        <button className="mt-4 px-6 py-2 bg-emerald-600 text-white font-bold rounded-xl text-sm">Download Attachment</button>
                     </div>
                   )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Grading Panel */}
        <div className="w-96 bg-neutral-900 border-l border-white/10 p-8 flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
           <div className="flex items-center gap-3 mb-10">
              <Star className="text-emerald-500 w-6 h-6" />
              <h3 className="text-xl font-black italic tracking-tighter">Evaluation</h3>
           </div>

           <div className="space-y-8 flex-1">
              <div>
                <label className="text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-3 block">Score Out of {selectedAssignment?.points || 100}</label>
                <div className="flex items-end gap-3">
                   <input 
                     value={score} onChange={e => setScore(e.target.value)}
                     placeholder="0"
                     className="w-full bg-black/40 border-b-2 border-white/10 focus:border-emerald-500 outline-none p-4 text-4xl font-black text-emerald-400 transition-colors"
                   />
                   <span className="text-2xl font-black text-neutral-700 pb-2">/ {selectedAssignment?.points || 100}</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-3 block flex items-center gap-2">
                  <MessageSquare className="w-3 h-3" /> Instructor Feedback
                </label>
                <textarea 
                  value={feedback} onChange={e => setFeedback(e.target.value)}
                  placeholder="Excellent analysis, but watch your citations..."
                  rows={6}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 outline-none focus:border-emerald-500 transition-colors text-sm font-medium resize-none leading-relaxed"
                />
              </div>
           </div>

           <div className="pt-8 border-t border-white/5 space-y-4">
              <button 
                onClick={handleSaveGrade}
                disabled={saving || !currentSubmission}
                className="w-full bg-white text-black font-black py-4 rounded-2xl shadow-[0_0_50px_rgba(255,255,255,0.1)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                {saving ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                Post & Sync Grade
              </button>
              <p className="text-[10px] text-center font-bold text-neutral-600 leading-tight">
                Posting will automatically sync this score with the Student's Term Report Card.
              </p>
           </div>
        </div>

      </div>
    </div>
  );
}
