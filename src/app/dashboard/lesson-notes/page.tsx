'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  createLessonNote,
  getLessonNotes,
  deleteLessonNote,
  bulkReviewLessonNotes,
} from '@/actions/lesson-note-actions';
import { getAcademicData } from '@/actions/academic-data';
import {
  Plus,
  FileText,
  Upload,
  MoreVertical,
  Search,
  FileSignature,
  Loader2,
  BookOpen,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  CheckSquare,
  Square,
  Link as LinkIcon,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';

const REVIEW_ROLES = ['HOD', 'SLT', 'ADMIN', 'SUPER_ADMIN'];

export default function LessonPlansPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const userRole = (session?.user as any)?.role;
  const { toast } = useToast();
  const router = useRouter();

  const [notes, setNotes] = useState<any[]>([]);
  const [pendingNotes, setPendingNotes] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Creation dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    title: 'Untitled Document',
    subjectId: '',
    classId: '',
    termId: '',
    weekNumber: 1,
    fileUrl: '',
  });

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'>('ALL');

  // Bulk Review State
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [isBulkActing, setIsBulkActing] = useState(false);
  const [rejectReasonModalOpen, setRejectReasonModalOpen] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState('');

  const isReviewer = REVIEW_ROLES.includes((userRole || '').toUpperCase());

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const [acadRes, myRes, pendingRes] = await Promise.all([
        getAcademicData(),
        getLessonNotes({ teacherId: userId }),
        isReviewer ? getLessonNotes({ status: 'SUBMITTED' }) : Promise.resolve({ success: true, notes: [] }),
      ]);
      setSubjects(acadRes.subjects || []);
      setClasses(acadRes.classes || []);
      setTerms(acadRes.terms || []);

      const activeTerm = acadRes.terms?.find((t: any) => t.isActive) || acadRes.terms?.[0];
      if (activeTerm) setForm(prev => ({ ...prev, termId: activeTerm.id }));

      if (myRes.success) setNotes(myRes.notes || []);
      if (pendingRes.success) setPendingNotes((pendingRes.notes || []).filter((n: any) => n.teacherId !== userId));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (withAttachment = false) => {
    if (!form.title || !form.subjectId || !form.classId || !form.termId) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please fill in title, subject, class, and term.',
      });
      return;
    }
    setIsSaving(true);
    try {
      const res = await createLessonNote({
        title: form.title,
        subjectId: form.subjectId,
        classId: form.classId,
        teacherId: userId,
        termId: form.termId,
        weekNumber: form.weekNumber ? Number(form.weekNumber) : undefined,
        fileUrl: withAttachment && form.fileUrl ? form.fileUrl : undefined,
      });
      if (res.success && res.note) {
        toast({ title: 'Created', description: 'Opening document...' });
        setCreateOpen(false);
        setUploadOpen(false);
        router.push(`/dashboard/lesson-notes/${res.note.id}`);
      } else {
        throw new Error(res.message);
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, e: any) => {
    e.stopPropagation();
    try {
      await deleteLessonNote(id);
      toast({ title: 'Deleted', description: 'Lesson plan removed.' });
      loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  };

  // Bulk Review Handlers
  const toggleSelectNote = (id: string, e: any) => {
    e.stopPropagation();
    setSelectedNoteIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllPending = () => {
    setSelectedNoteIds(new Set(pendingNotes.map(n => n.id)));
  };

  const clearSelection = () => {
    setSelectedNoteIds(new Set());
  };

  const handleBulkApprove = async () => {
    if (selectedNoteIds.size === 0 || !userId) return;
    setIsBulkActing(true);
    try {
      const res = await bulkReviewLessonNotes({
        noteIds: Array.from(selectedNoteIds),
        reviewerId: userId,
        action: 'APPROVED',
      });
      if (res.success) {
        toast({
          title: 'Bulk Approved',
          description: `Successfully approved ${res.count} lesson plan(s).`,
        });
        clearSelection();
        loadData();
      } else {
        throw new Error(res.message);
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsBulkActing(false);
    }
  };

  const handleBulkRejectSubmit = async () => {
    if (selectedNoteIds.size === 0 || !userId) return;
    if (!bulkRejectReason.trim()) {
      toast({ variant: 'destructive', title: 'Reason Required', description: 'Please provide feedback for the teachers.' });
      return;
    }
    setIsBulkActing(true);
    try {
      const res = await bulkReviewLessonNotes({
        noteIds: Array.from(selectedNoteIds),
        reviewerId: userId,
        action: 'REJECTED',
        reviewNote: bulkRejectReason,
      });
      if (res.success) {
        toast({
          title: 'Returned for Revision',
          description: `Returned ${res.count} lesson plan(s) to teachers.`,
        });
        setRejectReasonModalOpen(false);
        setBulkRejectReason('');
        clearSelection();
        loadData();
      } else {
        throw new Error(res.message);
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsBulkActing(false);
    }
  };

  // Filtered notes for teacher's own tab
  const filteredMyNotes = useMemo(() => {
    return notes.filter(n => {
      const matchesSearch =
        n.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.subject?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.class?.name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || n.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [notes, searchQuery, statusFilter]);

  // Counts for workflow pills
  const statusCounts = useMemo(() => {
    return {
      ALL: notes.length,
      DRAFT: notes.filter(n => n.status === 'DRAFT').length,
      SUBMITTED: notes.filter(n => n.status === 'SUBMITTED').length,
      APPROVED: notes.filter(n => n.status === 'APPROVED').length,
      REJECTED: notes.filter(n => n.status === 'REJECTED').length,
    };
  }, [notes]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
  };

  const DocumentCard = ({ note, isReviewMode = false }: { note: any; isReviewMode?: boolean }) => {
    const isSelected = selectedNoteIds.has(note.id);

    return (
      <motion.div variants={itemVariants}>
        <Card
          className={`group cursor-pointer border-border bg-card hover:border-primary/50 hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden h-[290px] relative ${
            isSelected ? 'ring-2 ring-primary border-primary' : ''
          }`}
          onClick={() => router.push(`/dashboard/lesson-notes/${note.id}`)}
        >
          {/* Top Selection Box for Reviewers */}
          {isReviewMode && (
            <div
              className="absolute top-2.5 left-2.5 z-20 bg-background/80 backdrop-blur-md rounded-md p-1 cursor-pointer hover:bg-background transition-colors"
              onClick={e => toggleSelectNote(note.id, e)}
            >
              {isSelected ? (
                <CheckSquare className="w-5 h-5 text-primary" />
              ) : (
                <Square className="w-5 h-5 text-muted-foreground hover:text-foreground" />
              )}
            </div>
          )}

          {/* Banner Graphic */}
          <div className="h-32 bg-gradient-to-br from-slate-900 to-slate-800 border-b border-border flex items-center justify-center p-4 relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                backgroundSize: '16px 16px',
              }}
            />

            {note.status === 'APPROVED' ? (
              <FileSignature className="w-12 h-12 text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.3)] z-10 transition-transform group-hover:scale-110 duration-300" />
            ) : note.status === 'SUBMITTED' ? (
              <Clock className="w-12 h-12 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.3)] z-10 transition-transform group-hover:scale-110 duration-300" />
            ) : note.status === 'REJECTED' ? (
              <AlertCircle className="w-12 h-12 text-rose-400 drop-shadow-[0_0_12px_rgba(244,63,94,0.3)] z-10 transition-transform group-hover:scale-110 duration-300" />
            ) : (
              <FileText className="w-12 h-12 text-violet-400 drop-shadow-[0_0_12px_rgba(139,92,246,0.3)] z-10 transition-transform group-hover:scale-110 duration-300" />
            )}

            {/* Week & Term Badge */}
            <div className="absolute bottom-2.5 right-2.5 z-10">
              <span className="text-[10px] font-semibold bg-black/60 text-slate-200 px-2 py-0.5 rounded-md backdrop-blur-sm">
                Week {note.weekNumber || 1} • {note.term?.name || 'Term'}
              </span>
            </div>
          </div>

          <CardContent className="p-3.5 flex-1 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex justify-between items-start gap-2">
                <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                  {note.title || 'Untitled Document'}
                </h3>
                {note.status === 'DRAFT' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover border-border">
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive cursor-pointer text-xs"
                        onClick={e => handleDelete(note.id, e)}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2" />
                        Delete Draft
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Class & Subject Metadata */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="bg-primary/10 text-primary font-semibold text-[10px] px-1.5 py-0.5 rounded">
                  {note.subject?.name || 'Subject'}
                </span>
                <span className="bg-muted text-muted-foreground font-medium text-[10px] px-1.5 py-0.5 rounded">
                  {note.class?.name || 'Class'}
                </span>
                {note.fileUrl && (
                  <span className="bg-blue-500/10 text-blue-500 font-medium text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
                    <LinkIcon className="w-2.5 h-2.5" /> Attached
                  </span>
                )}
              </div>

              {/* Rejection Note Warning Snippet */}
              {note.status === 'REJECTED' && note.reviewNote && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded p-1.5 text-[10px] text-rose-600 line-clamp-1">
                  <strong>Feedback:</strong> {note.reviewNote}
                </div>
              )}
            </div>

            {/* Bottom Status & Date Row */}
            <div className="flex items-center justify-between text-xs pt-2 border-t border-border/50">
              <Badge
                variant="outline"
                className={`text-[9px] px-1.5 py-0 font-bold border uppercase tracking-wider ${
                  note.status === 'APPROVED'
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                    : note.status === 'SUBMITTED'
                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                    : note.status === 'REJECTED'
                    ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                    : 'bg-muted text-muted-foreground border-border'
                }`}
              >
                {note.status === 'SUBMITTED' ? 'In Review' : note.status === 'REJECTED' ? 'Returned' : note.status}
              </Badge>

              <span className="text-[11px] text-muted-foreground font-medium">
                {isReviewMode && note.teacher
                  ? `${note.teacher.firstName} ${note.teacher.lastName?.[0]}.`
                  : format(new Date(note.submissionDate || note.createdAt), 'MMM d, yyyy')}
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-12 -mt-6 -mx-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-6 md:px-8 py-5 bg-background backdrop-blur-md border-b border-border sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-xl">
            <BookOpen className="text-primary w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Lesson Plans & Instructional Materials</h1>
            <p className="text-xs text-muted-foreground font-medium">Author syllabus notes, submit for HOD review, and track approvals</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-background border border-border rounded-xl px-3 py-2 w-full sm:w-72 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title, subject, class..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-xs w-full text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Start New Document Section */}
      <section className="bg-card px-6 md:px-8 py-8 border-b border-border">
        <div className="w-full">
          <p className="text-xs font-bold text-muted-foreground mb-4 uppercase tracking-wider">Start a new document</p>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {/* Blank Document Template */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="cursor-pointer group flex flex-col gap-2.5 min-w-[150px]"
                >
                  <div className="h-44 bg-background border border-border rounded-xl flex items-center justify-center group-hover:border-primary group-hover:bg-primary/5 transition-all shadow-sm relative overflow-hidden">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Plus className="w-6 h-6 text-primary" strokeWidth={2.5} />
                    </div>
                  </div>
                  <p className="text-xs font-bold text-foreground text-center">Blank Document</p>
                </motion.div>
              </DialogTrigger>
              <DialogContent className="bg-card border-border text-foreground shadow-2xl max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-foreground">New Lesson Plan</DialogTitle>
                  <DialogDescription className="text-muted-foreground text-xs">
                    Initialize a new instructional document for your class cohort.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Document Title</Label>
                    <Input
                      className="bg-background border-border text-foreground text-xs rounded-xl"
                      value={form.title}
                      onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                      placeholder="e.g. Week 1: Introduction to Algebra"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Subject</Label>
                      <Select value={form.subjectId} onValueChange={v => setForm(p => ({ ...p, subjectId: v }))}>
                        <SelectTrigger className="bg-background border-border text-foreground text-xs rounded-xl">
                          <SelectValue placeholder="Select Subject" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          {subjects.map(s => (
                            <SelectItem key={s.id} value={s.id} className="text-xs">
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Class</Label>
                      <Select value={form.classId} onValueChange={v => setForm(p => ({ ...p, classId: v }))}>
                        <SelectTrigger className="bg-background border-border text-foreground text-xs rounded-xl">
                          <SelectValue placeholder="Select Class" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          {classes.map(c => (
                            <SelectItem key={c.id} value={c.id} className="text-xs">
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Term</Label>
                      <Select value={form.termId} onValueChange={v => setForm(p => ({ ...p, termId: v }))}>
                        <SelectTrigger className="bg-background border-border text-foreground text-xs rounded-xl">
                          <SelectValue placeholder="Select Term" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          {terms.map(t => (
                            <SelectItem key={t.id} value={t.id} className="text-xs">
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Week Number</Label>
                      <Input
                        type="number"
                        min="1"
                        max="14"
                        className="bg-background border-border text-foreground text-xs rounded-xl"
                        value={form.weekNumber}
                        onChange={e => setForm(p => ({ ...p, weekNumber: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter className="border-t border-border pt-4">
                  <Button
                    variant="ghost"
                    onClick={() => setCreateOpen(false)}
                    className="text-muted-foreground hover:text-foreground text-xs rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleCreate(false)}
                    disabled={isSaving}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs rounded-xl font-semibold min-w-[130px]"
                  >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : null}
                    {isSaving ? 'Creating...' : 'Create Document'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Document with File Attachment Dialog */}
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
              <DialogTrigger asChild>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="cursor-pointer group flex flex-col gap-2.5 min-w-[150px]"
                >
                  <div className="h-44 bg-background border border-border rounded-xl flex items-center justify-center group-hover:border-primary group-hover:bg-primary/5 transition-all shadow-sm relative overflow-hidden">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                      <Upload className="w-6 h-6 text-blue-500" strokeWidth={2} />
                    </div>
                  </div>
                  <p className="text-xs font-bold text-foreground text-center">Attach Document / PDF</p>
                </motion.div>
              </DialogTrigger>
              <DialogContent className="bg-card border-border text-foreground shadow-2xl max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Attach Lesson Plan Document</DialogTitle>
                  <DialogDescription className="text-muted-foreground text-xs">
                    Link a PDF, Google Docs, Word file, or Drive link to your lesson submission.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Document Title</Label>
                    <Input
                      className="bg-background border-border text-foreground text-xs rounded-xl"
                      value={form.title}
                      onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                      placeholder="e.g. Term 1 Physics Syllabus Notes"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Document URL / Attachment Link</Label>
                    <Input
                      className="bg-background border-border text-foreground text-xs rounded-xl font-mono"
                      value={form.fileUrl}
                      onChange={e => setForm(p => ({ ...p, fileUrl: e.target.value }))}
                      placeholder="https://docs.google.com/document/... or file URL"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Subject</Label>
                      <Select value={form.subjectId} onValueChange={v => setForm(p => ({ ...p, subjectId: v }))}>
                        <SelectTrigger className="bg-background border-border text-foreground text-xs rounded-xl">
                          <SelectValue placeholder="Select Subject" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          {subjects.map(s => (
                            <SelectItem key={s.id} value={s.id} className="text-xs">
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Class</Label>
                      <Select value={form.classId} onValueChange={v => setForm(p => ({ ...p, classId: v }))}>
                        <SelectTrigger className="bg-background border-border text-foreground text-xs rounded-xl">
                          <SelectValue placeholder="Select Class" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          {classes.map(c => (
                            <SelectItem key={c.id} value={c.id} className="text-xs">
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Term</Label>
                      <Select value={form.termId} onValueChange={v => setForm(p => ({ ...p, termId: v }))}>
                        <SelectTrigger className="bg-background border-border text-foreground text-xs rounded-xl">
                          <SelectValue placeholder="Select Term" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          {terms.map(t => (
                            <SelectItem key={t.id} value={t.id} className="text-xs">
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Week Number</Label>
                      <Input
                        type="number"
                        min="1"
                        max="14"
                        className="bg-background border-border text-foreground text-xs rounded-xl"
                        value={form.weekNumber}
                        onChange={e => setForm(p => ({ ...p, weekNumber: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter className="border-t border-border pt-4">
                  <Button
                    variant="ghost"
                    onClick={() => setUploadOpen(false)}
                    className="text-muted-foreground hover:text-foreground text-xs rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleCreate(true)}
                    disabled={isSaving}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs rounded-xl font-semibold min-w-[130px]"
                  >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : null}
                    {isSaving ? 'Linking...' : 'Save & Open'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </section>

      {/* Recent Documents Tabs */}
      <section className="w-full space-y-5">
        <Tabs defaultValue="my-docs" className="w-full">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border pb-4">
            <h2 className="text-lg font-bold text-foreground">Instructional Archive</h2>
            {isReviewer && (
              <TabsList className="bg-muted p-1 rounded-xl h-10">
                <TabsTrigger
                  value="my-docs"
                  className="rounded-lg px-4 text-xs font-semibold text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground"
                >
                  My Lesson Plans ({notes.length})
                </TabsTrigger>
                <TabsTrigger
                  value="review"
                  className="rounded-lg px-4 text-xs font-semibold text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground relative"
                >
                  Awaiting Review
                  {pendingNotes.length > 0 && (
                    <span className="ml-2 bg-primary-foreground/20 text-primary-foreground py-0.5 px-1.5 rounded-full text-[10px] font-black">
                      {pendingNotes.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            )}
          </div>

          {/* TEACHER'S OWN LESSON PLANS TAB */}
          <TabsContent value="my-docs" className="mt-4 outline-none space-y-5">
            {/* Workflow Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={statusFilter === 'ALL' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('ALL')}
                className="rounded-xl text-xs h-8"
              >
                All ({statusCounts.ALL})
              </Button>
              <Button
                variant={statusFilter === 'DRAFT' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('DRAFT')}
                className="rounded-xl text-xs h-8"
              >
                Drafts ({statusCounts.DRAFT})
              </Button>
              <Button
                variant={statusFilter === 'SUBMITTED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('SUBMITTED')}
                className="rounded-xl text-xs h-8"
              >
                <Clock className="w-3.5 h-3.5 mr-1 text-amber-500" />
                In Review ({statusCounts.SUBMITTED})
              </Button>
              <Button
                variant={statusFilter === 'APPROVED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('APPROVED')}
                className="rounded-xl text-xs h-8"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                Approved ({statusCounts.APPROVED})
              </Button>
              <Button
                variant={statusFilter === 'REJECTED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('REJECTED')}
                className="rounded-xl text-xs h-8"
              >
                <AlertCircle className="w-3.5 h-3.5 mr-1 text-rose-500" />
                Returned ({statusCounts.REJECTED})
              </Button>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="font-medium text-xs">Loading documents...</p>
              </div>
            ) : filteredMyNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-border rounded-2xl bg-card">
                <FileText className="w-10 h-10 text-muted-foreground mb-3 opacity-40" />
                <h3 className="text-base font-semibold text-foreground mb-1">No documents found</h3>
                <p className="text-xs text-muted-foreground text-center max-w-sm">
                  {statusFilter !== 'ALL'
                    ? `You have no documents with status '${statusFilter}'.`
                    : 'Create a blank document above to begin authoring.'}
                </p>
              </div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5"
              >
                <AnimatePresence>
                  {filteredMyNotes.map(note => (
                    <DocumentCard key={note.id} note={note} />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </TabsContent>

          {/* HOD / SLT / ADMIN REVIEW QUEUE TAB */}
          {isReviewer && (
            <TabsContent value="review" className="mt-4 outline-none space-y-4">
              {/* Review Queue Toolbar with Bulk Actions */}
              {pendingNotes.length > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card p-3 rounded-xl border border-border">
                  <div className="flex items-center gap-2 text-xs">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={selectedNoteIds.size === pendingNotes.length ? clearSelection : selectAllPending}
                      className="text-xs h-8 px-2"
                    >
                      {selectedNoteIds.size === pendingNotes.length ? (
                        <>
                          <CheckSquare className="w-4 h-4 mr-1.5 text-primary" /> Deselect All
                        </>
                      ) : (
                        <>
                          <Square className="w-4 h-4 mr-1.5" /> Select All ({pendingNotes.length})
                        </>
                      )}
                    </Button>
                    <span className="text-muted-foreground font-medium">
                      • {selectedNoteIds.size} of {pendingNotes.length} selected
                    </span>
                  </div>

                  {selectedNoteIds.size > 0 && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => setRejectReasonModalOpen(true)}
                        disabled={isBulkActing}
                        variant="outline"
                        className="text-rose-600 border-rose-500/30 hover:bg-rose-500/10 text-xs h-8 rounded-lg"
                      >
                        Return Selected ({selectedNoteIds.size})
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleBulkApprove}
                        disabled={isBulkActing}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 rounded-lg shadow-sm"
                      >
                        {isBulkActing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />}
                        Approve Selected ({selectedNoteIds.size})
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {pendingNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-border rounded-2xl bg-card">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-3 opacity-60" />
                  <h3 className="text-base font-semibold text-foreground mb-1">Queue Clear</h3>
                  <p className="text-xs text-muted-foreground">All submitted lesson plans have been reviewed.</p>
                </div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5"
                >
                  <AnimatePresence>
                    {pendingNotes
                      .filter(
                        n =>
                          n.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          n.teacher?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          n.teacher?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          n.subject?.name?.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map(note => (
                        <DocumentCard key={note.id} note={note} isReviewMode={true} />
                      ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </section>

      {/* Bulk Return Feedback Modal */}
      <Dialog open={rejectReasonModalOpen} onOpenChange={setRejectReasonModalOpen}>
        <DialogContent className="bg-card border-border text-foreground shadow-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Return Lesson Plans for Revision</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Provide feedback explaining why these {selectedNoteIds.size} lesson plan(s) need changes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-xs font-semibold text-muted-foreground">Reviewer Feedback & Instructions</Label>
            <textarea
              rows={4}
              value={bulkRejectReason}
              onChange={e => setBulkRejectReason(e.target.value)}
              placeholder="e.g. Please expand on the evaluation strategy and align week 3 activities with current syllabus requirements."
              className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <DialogFooter className="border-t border-border pt-4">
            <Button
              variant="ghost"
              onClick={() => setRejectReasonModalOpen(false)}
              className="text-muted-foreground hover:text-foreground text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkRejectSubmit}
              disabled={isBulkActing}
              variant="destructive"
              className="text-xs rounded-xl font-semibold"
            >
              {isBulkActing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              Return to Teachers
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
