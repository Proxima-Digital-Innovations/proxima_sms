'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { notFound, useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getQuestionPaperById, updateQuestionPaper, submitQuestionPaper, reviewQuestionPaper } from '@/actions/question-paper-actions';
import { ArrowLeft, Save, Send, Printer, MessageSquare, Check, X, FileQuestion, Loader2, Clock, Award, HelpCircle, BookOpen, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { AttachedDocumentBanner, DocumentUploadZone } from '@/components/academics/document-upload-zone';

const OFFICER_ROLES = ['EXAM_OFFICER', 'ADMIN', 'SUPER_ADMIN'];

export default function QuestionPaperEditorPage() {
  const { id } = useParams();
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const userRole = (session?.user as any)?.role;
  const { toast } = useToast();
  const router = useRouter();

  const [paper, setPaper] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [form, setForm] = useState({
    title: '',
    duration: 90,
    maxMarks: 100,
    instructions: '',
    sectionA: '', // Objectives
    sectionB: '', // Theory / Essay
    markingScheme: '',
    fileUrl: '',
  });

  const [reviewComment, setReviewComment] = useState('');
  const [showReviewPane, setShowReviewPane] = useState(false);

  const isOfficer = OFFICER_ROLES.includes((userRole || '').toUpperCase());
  const isAuthor = paper?.teacherId === userId;
  const canEdit = isAuthor && (paper?.status === 'DRAFT' || paper?.status === 'REJECTED');
  
  // Parse evaluation: QUESTION_PAPER:Type:Duration:MaxMarks
  const evalParts = (paper?.evaluation || '').split(':');
  const paperType = evalParts[1] || 'Examination Paper';

  useEffect(() => {
    fetchPaper();
  }, [id]);

  const fetchPaper = async () => {
    if (typeof id !== 'string') return;
    setIsLoading(true);
    try {
      const res = await getQuestionPaperById(id);
      if (res.success && res.paper) {
        setPaper(res.paper);
        const parts = (res.paper.evaluation || '').split(':');
        const parsedDuration = parts[2] ? parseInt(parts[2]) : 90;
        const parsedMaxMarks = parts[3] ? parseInt(parts[3]) : 100;

        setForm({
          title: res.paper.title || '',
          duration: parsedDuration,
          maxMarks: parsedMaxMarks,
          instructions: res.paper.objectives || '',
          sectionA: res.paper.content || '',
          sectionB: res.paper.activities || '',
          markingScheme: res.paper.resources || '',
          fileUrl: res.paper.fileUrl || '',
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
      const res = await updateQuestionPaper(id, {
        title: form.title,
        content: form.sectionA,
        activities: form.sectionB,
        objectives: form.instructions,
        resources: form.markingScheme,
        fileUrl: form.fileUrl,
        paperType,
        duration: Number(form.duration),
        maxMarks: Number(form.maxMarks),
      });
      if (!res.success) throw new Error(res.message);
      
      if (isSubmitting) {
        const subRes = await submitQuestionPaper(id);
        if (!subRes.success) throw new Error(subRes.message);
        toast({ title: 'Submitted', description: 'Question paper submitted for Exam Officer moderation.' });
      } else {
        toast({ title: 'Saved', description: 'Draft saved successfully.' });
      }
      fetchPaper();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReview = async (status: 'APPROVED' | 'REJECTED') => {
    if (typeof id !== 'string' || !userId) return;
    if (status === 'REJECTED' && !reviewComment) {
      toast({ variant: 'destructive', title: 'Comment Required', description: 'Please provide moderation notes explaining required corrections.' });
      return;
    }
    
    try {
      const res = await reviewQuestionPaper({
        paperId: id,
        action: status,
        reviewerId: userId,
        reviewNote: reviewComment,
      });
      if (res.success) {
        toast({ title: status === 'APPROVED' ? 'Approved' : 'Returned for Revision', description: `Question paper ${status.toLowerCase()}.` });
        setShowReviewPane(false);
        fetchPaper();
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

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-violet-500" /></div>;
  }

  if (!paper) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans -mt-6 -mx-6">
      
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 bg-background border-b border-border print:hidden sticky top-0 z-20 shadow-md">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/exam-questions')} className="rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-600/20 border border-violet-500/30 rounded-xl shadow-md text-violet-400">
              <FileQuestion className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-foreground leading-tight tracking-tight">{paper.title}</span>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span className="font-semibold text-foreground">{paper.subject?.name} • {paper.class?.name}</span>
                <span>•</span>
                <Badge variant="outline" className={`
                   text-[10px] font-bold h-5 px-1.5 py-0 border
                   ${paper.status === 'APPROVED' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800' : ''}
                   ${paper.status === 'SUBMITTED' ? 'bg-amber-950/40 text-amber-400 border-amber-800' : ''}
                   ${paper.status === 'DRAFT' ? 'bg-muted text-foreground border-border' : ''}
                   ${paper.status === 'REJECTED' ? 'bg-destructive/20 text-destructive border-destructive/30' : ''}
                `}>{paper.status}</Badge>
                {paper.reviewedAt && <span>• Moderated {format(new Date(paper.reviewedAt), 'MMM d, h:mm a')}</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handlePrint} className="text-muted-foreground hover:text-foreground hover:bg-muted">
            <Printer className="w-4 h-4 mr-2" /> Print Paper
          </Button>
          
          {canEdit && (
            <>
              <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={isSaving} className="border-border text-foreground hover:bg-muted hover:text-foreground">
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Draft
              </Button>
              <Button size="sm" onClick={() => handleSave(true)} disabled={isSaving} className="bg-violet-600 hover:bg-violet-700 text-white shadow-lg">
                <Send className="w-4 h-4 mr-2" /> Submit for Moderation
              </Button>
            </>
          )}

          {isOfficer && paper.status === 'SUBMITTED' && (
             <Button size="sm" onClick={() => setShowReviewPane(!showReviewPane)} className={showReviewPane ? "bg-violet-900/50 text-violet-300 border border-violet-800" : "bg-violet-600 hover:bg-violet-700 text-white shadow-lg"}>
               <MessageSquare className="w-4 h-4 mr-2" /> Moderate Paper
             </Button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Main Document Canvas */}
        <div className="flex-1 overflow-y-auto py-10 px-4 print:py-0 print:px-0">
          <div className="max-w-[850px] mx-auto bg-card text-card-foreground shadow-2xl min-h-[1100px] p-8 md:p-16 print:shadow-none print:border-none print:p-0 border border-border rounded-2xl print:rounded-none">
            
            {/* Header / School Examination Banner */}
            <div className="border-b-2 border-border pb-6 mb-8 text-center space-y-2">
              <h2 className="text-xl font-bold uppercase tracking-wider text-muted-foreground">Proxima Academy / SMS</h2>
              <h1 className="text-3xl font-black uppercase tracking-widest text-foreground">{paperType}</h1>
              <div className="flex flex-wrap justify-center gap-6 text-sm text-foreground font-semibold uppercase tracking-wider pt-2">
                 <span>Subject: <span className="text-primary font-bold ml-1">{paper.subject?.name}</span></span>
                 <span>Class: <span className="text-primary font-bold ml-1">{paper.class?.name}</span></span>
                 <span>Term: <span className="text-primary font-bold ml-1">{paper.term?.name}</span></span>
              </div>
              <div className="flex flex-wrap justify-center gap-8 text-xs text-muted-foreground pt-2 font-medium">
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-violet-400" /> Time Allowed: <strong>{form.duration} Minutes</strong></span>
                <span className="flex items-center gap-1.5"><Award className="w-3.5 h-3.5 text-emerald-400" /> Maximum Marks: <strong>{form.maxMarks} Marks</strong></span>
                <span>Examiner: <strong>{paper.teacher?.firstName} {paper.teacher?.lastName}</strong></span>
              </div>
            </div>

            {/* Candidate Info Box for Printing */}
            <div className="hidden print:grid grid-cols-2 gap-4 border border-slate-900 p-4 mb-8 text-xs font-bold uppercase">
              <div>Student Name: _____________________________________</div>
              <div>Admission / Exam No: _____________________________</div>
              <div>Class: {paper.class?.name}</div>
              <div>Date: ________________________  Invigilator: _________</div>
            </div>

            {/* Attached Outside Exam Document Banner */}
            {paper.fileUrl && (
              <div className="mb-8">
                <AttachedDocumentBanner
                  fileUrl={paper.fileUrl}
                  title="Official Attached Outside Question Paper"
                />
              </div>
            )}

            {/* Author Outside Document Attachment / Replacement Zone */}
            {canEdit && (
              <div className="mb-8 p-4 rounded-xl border border-dashed border-border bg-muted/20">
                <DocumentUploadZone
                  folder="examQuestions"
                  label={paper.fileUrl ? "Replace Attached Question Paper (PDF, Word, Scans)" : "Attach Outside Question Paper (PDF, Word, Scans)"}
                  initialUrl={paper.fileUrl || ''}
                  onUploaded={async (url) => {
                    setPaper((prev: any) => ({ ...prev, fileUrl: url }));
                    setForm((prev: any) => ({ ...prev, fileUrl: url }));
                    if (typeof id === 'string') {
                      await updateQuestionPaper(id, {
                        ...form,
                        fileUrl: url,
                        paperType,
                        duration: Number(form.duration),
                        maxMarks: Number(form.maxMarks),
                      });
                      toast({ title: 'Question Paper Attached', description: 'Outside file saved to exam paper.' });
                    }
                  }}
                />
              </div>
            )}

            <div className="space-y-8">
              
              {/* Exam Instructions */}
              <section className="bg-muted/40 p-5 rounded-xl border border-border">
                <h3 className="text-xs font-black text-violet-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5" /> General Instructions to Candidates
                </h3>
                <textarea 
                  value={form.instructions}
                  onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                  disabled={!canEdit}
                  placeholder="e.g. Answer all questions in Section A and any three questions in Section B. Write clearly and show all working..."
                  className="w-full min-h-[70px] resize-none outline-none text-foreground bg-transparent font-medium text-sm leading-relaxed placeholder:text-muted-foreground"
                />
              </section>

              {/* Section A: Multiple Choice / Objectives */}
              <section className="bg-muted/20 p-6 rounded-xl border border-border">
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-border">
                  <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-violet-500" /> Section A: Objective Questions
                  </h3>
                  <span className="text-xs font-bold text-muted-foreground">Multiple Choice / Short Answers</span>
                </div>
                <textarea 
                  value={form.sectionA}
                  onChange={(e) => setForm({ ...form, sectionA: e.target.value })}
                  disabled={!canEdit}
                  placeholder="1. Which of the following is an example of an operating system?&#10;   A) Linux   B) Python   C) HTML   D) React&#10;&#10;2. Calculate the acceleration of a vehicle..."
                  className="w-full min-h-[250px] resize-none outline-none text-foreground bg-transparent font-medium text-sm leading-relaxed placeholder:text-muted-foreground font-mono"
                />
              </section>

              {/* Section B: Theory / Essay Questions */}
              <section className="bg-muted/20 p-6 rounded-xl border border-border">
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-border">
                  <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-violet-500" /> Section B: Theory & Problem-Solving
                  </h3>
                  <span className="text-xs font-bold text-muted-foreground">Structured / Essay Questions</span>
                </div>
                <textarea 
                  value={form.sectionB}
                  onChange={(e) => setForm({ ...form, sectionB: e.target.value })}
                  disabled={!canEdit}
                  placeholder="Question 1:&#10;a) Define photosynthesis. (4 marks)&#10;b) State three differences between aerobic and anaerobic respiration. (6 marks)&#10;&#10;Question 2:..."
                  className="w-full min-h-[250px] resize-none outline-none text-foreground bg-transparent font-medium text-sm leading-relaxed placeholder:text-muted-foreground font-mono"
                />
              </section>

              {/* Marking Scheme / Rubric (Hidden during student print) */}
              <section className="bg-muted/20 p-6 rounded-xl border border-border print:hidden">
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-border">
                  <h3 className="text-sm font-black text-amber-500 uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500" /> Marking Scheme & Solution Key
                  </h3>
                  <span className="text-xs font-semibold text-amber-400/80">Confidential • For Examiners & Moderator Only</span>
                </div>
                <textarea 
                  value={form.markingScheme}
                  onChange={(e) => setForm({ ...form, markingScheme: e.target.value })}
                  disabled={!canEdit}
                  placeholder="Outline key answers, mark allocations per step, and allowable alternative methods..."
                  className="w-full min-h-[120px] resize-none outline-none text-foreground bg-transparent font-medium text-sm leading-relaxed placeholder:text-muted-foreground"
                />
              </section>

              {/* Reviewer Feedback Section */}
              {paper.reviewNote && (
                <section className="p-6 bg-destructive/10 border-2 border-destructive/30 rounded-2xl print:hidden">
                  <h3 className="text-sm font-black text-destructive uppercase tracking-widest mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> Exam Officer Moderation Notes
                    {paper.reviewer && <span className="text-xs font-normal text-muted-foreground">(by {paper.reviewer.firstName} {paper.reviewer.lastName})</span>}
                  </h3>
                  <p className="text-sm font-medium text-foreground leading-relaxed">{paper.reviewNote}</p>
                </section>
              )}

            </div>

          </div>
        </div>

        {/* Reviewer Side Panel */}
        {showReviewPane && (
          <div className="w-80 bg-background border-l border-border shadow-2xl flex flex-col print:hidden animate-in slide-in-from-right-8 duration-300 relative z-30">
            <div className="p-5 border-b border-border flex items-center justify-between bg-background backdrop-blur">
              <h3 className="font-bold text-foreground tracking-tight">Moderate Paper</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full" onClick={() => setShowReviewPane(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-5 flex-1 flex flex-col gap-5">
              <div>
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Moderation Feedback</Label>
                <p className="text-xs text-muted-foreground mb-3">State required changes if rejecting, or quality approval notes.</p>
                <textarea 
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="e.g. Ensure question 3b specifies the unit of measurement..."
                  className="w-full h-44 p-4 bg-background border border-border rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 text-sm text-foreground placeholder:text-muted-foreground transition-all"
                />
              </div>
              <div className="mt-auto grid grid-cols-2 gap-3">
                <Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/20 transition-all" onClick={() => handleReview('REJECTED')}>
                  <X className="w-4 h-4 mr-2" /> Request Revision
                </Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg transition-all" onClick={() => handleReview('APPROVED')}>
                  <Check className="w-4 h-4 mr-2" /> Approve Paper
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
      
    </div>
  );
}
