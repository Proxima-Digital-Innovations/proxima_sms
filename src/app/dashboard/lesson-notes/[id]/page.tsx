'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { notFound, useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getLessonNoteById, updateLessonNote, submitLessonNote, reviewLessonNote } from '@/actions/lesson-note-actions';
import { ArrowLeft, Save, Send, Printer, MessageSquare, Check, X, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const REVIEW_ROLES = ['HOD', 'SLT', 'ADMIN', 'SUPER_ADMIN'];

export default function LessonNoteEditorPage() {
  const { id } = useParams();
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const userRole = (session?.user as any)?.role;
  const { toast } = useToast();
  const router = useRouter();

  const [note, setNote] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [form, setForm] = useState({
    objectives: '',
    content: '',
    activities: '',
    resources: '',
    evaluation: ''
  });

  const [reviewComment, setReviewComment] = useState('');
  const [showReviewPane, setShowReviewPane] = useState(false);

  const isReviewer = REVIEW_ROLES.includes((userRole || '').toUpperCase());
  const isAuthor = note?.teacherId === userId;
  const canEdit = isAuthor && (note?.status === 'DRAFT' || note?.status === 'REJECTED');

  useEffect(() => {
    fetchNote();
  }, [id]);

  const fetchNote = async () => {
    if (typeof id !== 'string') return;
    setIsLoading(true);
    try {
      const res = await getLessonNoteById(id);
      if (res.success && res.note) {
        setNote(res.note);
        setForm({
          objectives: res.note.objectives || '',
          content: res.note.content || '',
          activities: res.note.activities || '',
          resources: res.note.resources || '',
          evaluation: res.note.evaluation || '',
        });
      } else {
        notFound();
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (isSubmitting = false) => {
    if (typeof id !== 'string') return;
    setIsSaving(true);
    try {
      const res = await updateLessonNote(id, form);
      if (!res.success) throw new Error(res.message);
      
      if (isSubmitting) {
        const subRes = await submitLessonNote(id);
        if (!subRes.success) throw new Error(subRes.message);
        toast({ title: 'Submitted', description: 'Lesson plan sent for review.' });
      } else {
        toast({ title: 'Saved', description: 'Draft saved successfully.' });
      }
      fetchNote();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReview = async (status: 'APPROVED' | 'REJECTED') => {
    if (typeof id !== 'string' || !userId) return;
    if (status === 'REJECTED' && !reviewComment) {
      toast({ variant: 'destructive', title: 'Comment Required', description: 'Please provide a reason for rejection.' });
      return;
    }
    
    try {
      const res = await reviewLessonNote({
        noteId: id,
        action: status,
        reviewerId: userId,
        reviewNote: reviewComment
      });
      if (res.success) {
        toast({ title: status === 'APPROVED' ? 'Approved' : 'Rejected', description: `Document ${status.toLowerCase()}.` });
        setShowReviewPane(false);
        fetchNote();
      } else {
        throw new Error(res.message);
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Auto-resize textarea logic
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.target.style.height = 'auto';
    e.target.style.height = (e.target.scrollHeight) + 'px';
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-violet-500" /></div>;
  }

  if (!note) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans -mt-6 -mx-6">
      
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-background border-b border-border print:hidden sticky top-0 z-20 shadow-md">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/lesson-notes')} className="rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-600/20 border border-violet-500/30 rounded shadow-[0_0_10px_rgba(139,92,246,0.15)] text-violet-400">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-foreground leading-tight tracking-tight">{note.title}</span>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span className="font-medium text-foreground">{note.subject?.name} • {note.class?.name}</span>
                <span>•</span>
                <Badge variant="outline" className={`
                   text-[10px] font-bold h-5 px-1.5 py-0 border
                   ${note.status === 'APPROVED' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800' : ''}
                   ${note.status === 'SUBMITTED' ? 'bg-amber-950/40 text-amber-400 border-amber-800' : ''}
                   ${note.status === 'DRAFT' ? 'bg-muted text-foreground border-border' : ''}
                `}>{note.status}</Badge>
                {note.statusUpdatedAt && <span>• Last updated {format(new Date(note.statusUpdatedAt), 'MMM d, h:mm a')}</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handlePrint} className="text-muted-foreground hover:text-foreground hover:bg-muted">
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
          
          {canEdit && (
            <>
              <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={isSaving} className="border-border text-foreground hover:bg-muted hover:text-foreground">
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Draft
              </Button>
              <Button size="sm" onClick={() => handleSave(true)} disabled={isSaving} className="bg-violet-600 hover:bg-violet-700 text-white shadow-[0_0_15px_rgba(139,92,246,0.2)]">
                <Send className="w-4 h-4 mr-2" /> Submit
              </Button>
            </>
          )}

          {isReviewer && note.status === 'SUBMITTED' && (
             <Button size="sm" onClick={() => setShowReviewPane(!showReviewPane)} className={showReviewPane ? "bg-violet-900/50 text-violet-300 border border-violet-800" : "bg-violet-600 hover:bg-violet-700 text-white shadow-[0_0_15px_rgba(139,92,246,0.2)]"}>
               <MessageSquare className="w-4 h-4 mr-2" /> Review
             </Button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Main Document Canvas */}
        <div className="flex-1 overflow-y-auto py-10 px-4 print:py-0 print:px-0">
          <div className="max-w-[850px] mx-auto bg-card text-card-foreground shadow-2xl min-h-[1100px] p-8 md:p-16 print:shadow-none print:border-none print:p-0 border border-border rounded-2xl print:rounded-none">
            
            <div className="border-b-2 border-border pb-6 mb-8 text-center">
              <h1 className="text-3xl font-black uppercase tracking-widest text-foreground mb-3">Lesson Plan</h1>
              <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground font-semibold uppercase tracking-wider">
                 <span>Subject: <span className="text-foreground ml-1">{note.subject?.name}</span></span>
                 <span>Class: <span className="text-foreground ml-1">{note.class?.name}</span></span>
                 <span>Term: <span className="text-foreground ml-1">{note.term?.name}</span></span>
                 {note.weekNumber && <span>Week: <span className="text-foreground ml-1">{note.weekNumber}</span></span>}
              </div>
              <div className="text-sm text-muted-foreground mt-3 italic">Prepared by: <span className="font-semibold text-foreground">{note.teacher?.firstName} {note.teacher?.lastName}</span></div>
            </div>

            <div className="space-y-8">
              <section className="bg-muted/30 p-5 rounded-xl border border-border">
                <h2 className="text-xs font-black text-violet-500 uppercase tracking-widest mb-3 border-b border-border inline-block pb-1">1. Learning Objectives</h2>
                <textarea 
                  name="objectives"
                  value={form.objectives}
                  onChange={handleInput}
                  disabled={!canEdit}
                  placeholder="Specific learning objectives (Cognitive, Affective, Psychomotor)..."
                  className="w-full min-h-[90px] resize-none outline-none text-foreground bg-transparent disabled:opacity-100 disabled:bg-transparent font-medium leading-relaxed placeholder:text-muted-foreground"
                />
              </section>

              <section className="bg-muted/30 p-5 rounded-xl border border-border">
                <h2 className="text-xs font-black text-violet-500 uppercase tracking-widest mb-3 border-b border-border inline-block pb-1">2. Lesson Content & Presentation</h2>
                <textarea 
                  name="content"
                  value={form.content}
                  onChange={handleInput}
                  disabled={!canEdit}
                  placeholder="Main instructional material, step-by-step introduction and delivery..."
                  className="w-full min-h-[220px] resize-none outline-none text-foreground bg-transparent disabled:opacity-100 disabled:bg-transparent font-medium leading-relaxed placeholder:text-muted-foreground"
                />
              </section>

              <section className="bg-muted/30 p-5 rounded-xl border border-border">
                <h2 className="text-xs font-black text-violet-500 uppercase tracking-widest mb-3 border-b border-border inline-block pb-1">3. Student Activities</h2>
                <textarea 
                  name="activities"
                  value={form.activities}
                  onChange={handleInput}
                  disabled={!canEdit}
                  placeholder="Planned learner activities, group work, practical demonstrations..."
                  className="w-full min-h-[90px] resize-none outline-none text-foreground bg-transparent disabled:opacity-100 disabled:bg-transparent font-medium leading-relaxed placeholder:text-muted-foreground"
                />
              </section>

              <section className="bg-muted/30 p-5 rounded-xl border border-border">
                <h2 className="text-xs font-black text-violet-500 uppercase tracking-widest mb-3 border-b border-border inline-block pb-1">4. Instructional Materials & Resources</h2>
                <textarea 
                  name="resources"
                  value={form.resources}
                  onChange={handleInput}
                  disabled={!canEdit}
                  placeholder="Textbooks, charts, lab equipment, digital aids..."
                  className="w-full min-h-[80px] resize-none outline-none text-foreground bg-transparent disabled:opacity-100 disabled:bg-transparent font-medium leading-relaxed placeholder:text-muted-foreground"
                />
              </section>

              <section className="bg-muted/30 p-5 rounded-xl border border-border">
                <h2 className="text-xs font-black text-violet-500 uppercase tracking-widest mb-3 border-b border-border inline-block pb-1">5. Evaluation & Assessment Strategy</h2>
                <textarea 
                  name="evaluation"
                  value={form.evaluation}
                  onChange={handleInput}
                  disabled={!canEdit}
                  placeholder="Oral questions, class exercise, homework assignments..."
                  className="w-full min-h-[90px] resize-none outline-none text-foreground bg-transparent disabled:opacity-100 disabled:bg-transparent font-medium leading-relaxed placeholder:text-muted-foreground"
                />
              </section>
              
              {/* Reviewer Feedback Section (Read Only on Canvas) */}
              {(note.reviewNote || note.reviewerComment) && (
                <section className="mt-14 p-6 bg-destructive/10 border-2 border-destructive/30 rounded-2xl print:hidden">
                  <h2 className="text-sm font-black text-destructive uppercase tracking-widest mb-3 flex items-center gap-2">
                    Reviewer Feedback
                    {note.reviewer && <span className="text-xs font-normal text-muted-foreground">(by {note.reviewer.firstName} {note.reviewer.lastName})</span>}
                  </h2>
                  <p className="text-sm font-medium text-foreground leading-relaxed">{note.reviewNote || note.reviewerComment}</p>
                </section>
              )}
            </div>

          </div>
        </div>

        {/* Reviewer Side Panel */}
        {showReviewPane && (
          <div className="w-80 bg-background border-l border-border shadow-2xl flex flex-col print:hidden animate-in slide-in-from-right-8 duration-300 relative z-30">
            <div className="p-5 border-b border-border flex items-center justify-between bg-background backdrop-blur">
              <h3 className="font-bold text-foreground tracking-tight">Review Document</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full" onClick={() => setShowReviewPane(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-5 flex-1 flex flex-col gap-5">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 block">Leave a comment</label>
                <textarea 
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Required for rejection..."
                  className="w-full h-40 p-4 bg-background border border-border rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 text-sm text-foreground placeholder:text-slate-600 transition-all"
                />
              </div>
              <div className="mt-auto grid grid-cols-2 gap-3">
                <Button variant="outline" className="border-red-900/50 text-red-400 hover:bg-red-950/50 hover:text-red-300 hover:border-red-800 transition-all" onClick={() => handleReview('REJECTED')}>
                  <X className="w-4 h-4 mr-2" /> Reject
                </Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all" onClick={() => handleReview('APPROVED')}>
                  <Check className="w-4 h-4 mr-2" /> Approve
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      
    </div>
  );
}
