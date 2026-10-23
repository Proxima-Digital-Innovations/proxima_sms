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
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Paperclip,
  X,
  Eye,
  LayoutGrid,
  List,
  Filter,
  FileEdit,
  ArrowUpRight,
  ShieldAlert,
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
import { DocumentUploadZone } from '@/components/academics/document-upload-zone';

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

  // View Mode: Table (default high-density) or Cards
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

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
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');

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
    if (withAttachment && !form.fileUrl) {
      toast({
        variant: 'destructive',
        title: 'File Required',
        description: 'Please upload an outside document or paste a document URL.',
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
        toast({ title: 'Created', description: 'Opening lesson plan...' });
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
      const matchesSubject = selectedSubject === 'ALL' || n.subjectId === selectedSubject;
      const matchesClass = selectedClass === 'ALL' || n.classId === selectedClass;

      return matchesSearch && matchesStatus && matchesSubject && matchesClass;
    });
  }, [notes, searchQuery, statusFilter, selectedSubject, selectedClass]);

  // Filtered notes for review queue
  const filteredPendingNotes = useMemo(() => {
    return pendingNotes.filter(n => {
      const matchesSearch =
        n.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.subject?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.class?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.teacher?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.teacher?.lastName?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSubject = selectedSubject === 'ALL' || n.subjectId === selectedSubject;
      const matchesClass = selectedClass === 'ALL' || n.classId === selectedClass;

      return matchesSearch && matchesSubject && matchesClass;
    });
  }, [pendingNotes, searchQuery, selectedSubject, selectedClass]);

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

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[11px] font-semibold">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Approved
          </Badge>
        );
      case 'SUBMITTED':
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[11px] font-semibold">
            <Clock className="w-3 h-3 mr-1" /> In Review
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[11px] font-semibold">
            <AlertCircle className="w-3 h-3 mr-1" /> Returned
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[11px] font-medium">
            Draft
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 border border-primary/20 rounded-lg text-primary">
              <BookOpen className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Lesson Plans & Approvals</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Author syllabus lesson notes, submit for HOD departmental review, and monitor approval status.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => {
              setForm(p => ({ ...p, title: 'External Document', fileUrl: '' }));
              setUploadOpen(true);
            }}
            className="border-border text-foreground hover:bg-muted font-medium text-xs sm:text-sm"
          >
            <Upload className="w-4 h-4 mr-2 text-primary" />
            Upload Outside Document
          </Button>

          <Button
            onClick={() => {
              setForm(p => ({ ...p, title: 'Untitled Document', fileUrl: '' }));
              setCreateOpen(true);
            }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs sm:text-sm shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Lesson Plan
          </Button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Plans</p>
              <p className="text-2xl font-bold text-foreground">{statusCounts.ALL}</p>
              <p className="text-[11px] text-muted-foreground">Across all subjects</p>
            </div>
            <div className="p-3 bg-muted rounded-xl text-muted-foreground">
              <BookOpen className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">In Review</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{statusCounts.SUBMITTED}</p>
              <p className="text-[11px] text-muted-foreground">Awaiting HOD signoff</p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Approved</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{statusCounts.APPROVED}</p>
              <p className="text-[11px] text-muted-foreground">Ready for classroom</p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wider">Returned</p>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{statusCounts.REJECTED}</p>
              <p className="text-[11px] text-muted-foreground">Needs teacher revision</p>
            </div>
            <div className="p-3 bg-rose-500/10 rounded-xl text-rose-600">
              <AlertCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Container */}
      <Tabs defaultValue="my-docs" className="w-full space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-border pb-3">
          <TabsList className="bg-muted p-1 rounded-lg h-9">
            <TabsTrigger
              value="my-docs"
              className="rounded-md px-3 text-xs font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              My Lesson Plans ({notes.length})
            </TabsTrigger>
            {isReviewer && (
              <TabsTrigger
                value="review"
                className="rounded-md px-3 text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground relative"
              >
                Awaiting HOD Review
                {pendingNotes.length > 0 && (
                  <span className="ml-1.5 bg-primary-foreground/20 text-primary-foreground py-0.5 px-1.5 rounded-full text-[10px] font-bold">
                    {pendingNotes.length}
                  </span>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="h-7 px-2.5 text-xs gap-1.5"
            >
              <List className="w-3.5 h-3.5" /> Table
            </Button>
            <Button
              variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="h-7 px-2.5 text-xs gap-1.5"
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Cards
            </Button>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="bg-card border border-border rounded-xl p-3 space-y-3">
          <div className="flex flex-col lg:flex-row gap-2.5 items-stretch lg:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by title, subject, or class..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 bg-background border-border text-xs rounded-lg h-9"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="w-[150px] bg-background border-border text-xs rounded-lg h-9">
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="ALL" className="text-xs">All Subjects</SelectItem>
                  {subjects.map(s => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-[140px] bg-background border-border text-xs rounded-lg h-9">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="ALL" className="text-xs">All Classes</SelectItem>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(searchQuery || selectedSubject !== 'ALL' || selectedClass !== 'ALL' || statusFilter !== 'ALL') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedSubject('ALL');
                    setSelectedClass('ALL');
                    setStatusFilter('ALL');
                  }}
                  className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5 mr-1" /> Reset
                </Button>
              )}
            </div>
          </div>

          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/50 text-xs">
            <span className="text-muted-foreground text-[11px] font-medium mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Status:
            </span>
            <Button
              variant={statusFilter === 'ALL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('ALL')}
              className="rounded-lg text-xs h-7 px-2.5"
            >
              All ({statusCounts.ALL})
            </Button>
            <Button
              variant={statusFilter === 'DRAFT' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('DRAFT')}
              className="rounded-lg text-xs h-7 px-2.5"
            >
              Drafts ({statusCounts.DRAFT})
            </Button>
            <Button
              variant={statusFilter === 'SUBMITTED' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('SUBMITTED')}
              className="rounded-lg text-xs h-7 px-2.5"
            >
              <Clock className="w-3 h-3 mr-1 text-amber-500" />
              In Review ({statusCounts.SUBMITTED})
            </Button>
            <Button
              variant={statusFilter === 'APPROVED' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('APPROVED')}
              className="rounded-lg text-xs h-7 px-2.5"
            >
              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />
              Approved ({statusCounts.APPROVED})
            </Button>
            <Button
              variant={statusFilter === 'REJECTED' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('REJECTED')}
              className="rounded-lg text-xs h-7 px-2.5"
            >
              <AlertCircle className="w-3 h-3 mr-1 text-rose-500" />
              Returned ({statusCounts.REJECTED})
            </Button>
          </div>
        </div>

        {/* TEACHER'S LESSON PLANS TAB */}
        <TabsContent value="my-docs" className="outline-none space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
              <p className="text-xs font-medium">Loading your lesson plans...</p>
            </div>
          ) : filteredMyNotes.length === 0 ? (
            /* Empty State */
            <Card className="border-border bg-card">
              <CardContent className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 text-primary">
                  <BookOpen className="w-7 h-7" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">No Lesson Plans Found</h3>
                <p className="text-xs text-muted-foreground max-w-md mb-6">
                  {statusFilter !== 'ALL' || searchQuery || selectedSubject !== 'ALL' || selectedClass !== 'ALL'
                    ? 'No lesson plans match your current filters. Try resetting the search or filter conditions.'
                    : 'You haven’t created any lesson plans for this term yet. Start authoring with the built-in editor or upload outside Word/PDF documents.'}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button
                    onClick={() => {
                      setForm(p => ({ ...p, title: 'Untitled Document', fileUrl: '' }));
                      setCreateOpen(true);
                    }}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 px-4 rounded-lg"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    New Lesson Plan
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setForm(p => ({ ...p, title: 'External Document', fileUrl: '' }));
                      setUploadOpen(true);
                    }}
                    className="border-border text-foreground hover:bg-muted text-xs h-9 px-4 rounded-lg font-medium"
                  >
                    <Upload className="w-4 h-4 mr-2 text-primary" />
                    Upload Outside Document
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : viewMode === 'table' ? (
            /* TABLE VIEW */
            <Card className="border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="w-[30%] text-xs font-semibold">Title & Topic</TableHead>
                    <TableHead className="text-xs font-semibold">Subject</TableHead>
                    <TableHead className="text-xs font-semibold">Class</TableHead>
                    <TableHead className="text-xs font-semibold">Week</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold">Updated</TableHead>
                    <TableHead className="text-right text-xs font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMyNotes.map(note => (
                    <TableRow
                      key={note.id}
                      className="cursor-pointer border-border hover:bg-muted/50 transition-colors"
                      onClick={() => router.push(`/dashboard/lesson-notes/${note.id}`)}
                    >
                      <TableCell className="font-medium text-xs">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-md bg-muted text-foreground">
                            {note.fileUrl ? <Paperclip className="w-3.5 h-3.5 text-primary" /> : <FileText className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                              {note.title || 'Untitled Document'}
                              {note.fileUrl && (
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-primary/5 text-primary border-primary/20">
                                  Outside Doc
                                </Badge>
                              )}
                            </div>
                            {note.status === 'REJECTED' && note.reviewNote && (
                              <p className="text-[10px] text-rose-600 dark:text-rose-400 line-clamp-1 mt-0.5">
                                Reason: {note.reviewNote}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-foreground">
                        <span className="font-medium">{note.subject?.name || '—'}</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {note.class?.name || '—'}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="secondary" className="text-[10px] font-mono">
                          Wk {note.weekNumber || 1}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {renderStatusBadge(note.status)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(note.submissionDate || note.createdAt), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right text-xs" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2.5 text-xs text-foreground hover:text-primary"
                            onClick={() => router.push(`/dashboard/lesson-notes/${note.id}`)}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" /> View
                          </Button>

                          {note.status === 'DRAFT' && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-popover border-border">
                                <DropdownMenuItem
                                  className="text-xs text-rose-600 focus:text-rose-600 cursor-pointer"
                                  onClick={e => handleDelete(note.id, e)}
                                >
                                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete Draft
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            /* CARDS GRID VIEW */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredMyNotes.map(note => (
                <Card
                  key={note.id}
                  className="cursor-pointer border-border bg-card hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between"
                  onClick={() => router.push(`/dashboard/lesson-notes/${note.id}`)}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="p-2 rounded-lg bg-muted text-primary">
                        {note.fileUrl ? <Paperclip className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                      </div>
                      {renderStatusBadge(note.status)}
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm text-foreground line-clamp-2 hover:text-primary transition-colors">
                        {note.title || 'Untitled Document'}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {note.subject?.name} • {note.class?.name}
                      </p>
                    </div>

                    {note.status === 'REJECTED' && note.reviewNote && (
                      <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-600">
                        <strong>Feedback:</strong> {note.reviewNote}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/50">
                      <span>Week {note.weekNumber || 1}</span>
                      <span>{format(new Date(note.submissionDate || note.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* HOD / SLT / ADMIN REVIEW QUEUE TAB */}
        {isReviewer && (
          <TabsContent value="review" className="outline-none space-y-4">
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
                      className="border-rose-500/30 text-rose-600 hover:bg-rose-500/10 text-xs h-8"
                    >
                      Return ({selectedNoteIds.size})
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleBulkApprove}
                      disabled={isBulkActing}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 font-semibold"
                    >
                      {isBulkActing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />}
                      Approve ({selectedNoteIds.size})
                    </Button>
                  </div>
                )}
              </div>
            )}

            {filteredPendingNotes.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3 text-emerald-600">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">Queue is Clear</h3>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    No submitted lesson plans are currently awaiting review in your department.
                  </p>
                </CardContent>
              </Card>
            ) : viewMode === 'table' ? (
              <Card className="border-border bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead className="text-xs font-semibold">Title & Topic</TableHead>
                      <TableHead className="text-xs font-semibold">Teacher</TableHead>
                      <TableHead className="text-xs font-semibold">Subject</TableHead>
                      <TableHead className="text-xs font-semibold">Class</TableHead>
                      <TableHead className="text-xs font-semibold">Week</TableHead>
                      <TableHead className="text-xs font-semibold">Submitted</TableHead>
                      <TableHead className="text-right text-xs font-semibold">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPendingNotes.map(note => {
                      const isSelected = selectedNoteIds.has(note.id);
                      return (
                        <TableRow
                          key={note.id}
                          className={`cursor-pointer border-border hover:bg-muted/50 transition-colors ${
                            isSelected ? 'bg-primary/5' : ''
                          }`}
                          onClick={() => router.push(`/dashboard/lesson-notes/${note.id}`)}
                        >
                          <TableCell onClick={e => toggleSelectNote(note.id, e)}>
                            <button type="button" className="text-muted-foreground hover:text-foreground">
                              {isSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                            </button>
                          </TableCell>
                          <TableCell className="font-medium text-xs">
                            <div className="flex items-center gap-2">
                              {note.fileUrl ? <Paperclip className="w-3.5 h-3.5 text-primary" /> : <FileText className="w-3.5 h-3.5 text-muted-foreground" />}
                              <span className="font-semibold text-foreground">{note.title}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-foreground font-medium">
                            {note.teacher ? `${note.teacher.firstName} ${note.teacher.lastName}` : '—'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{note.subject?.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{note.class?.name}</TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="secondary" className="text-[10px] font-mono">
                              Wk {note.weekNumber || 1}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(note.submissionDate || note.createdAt), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-right text-xs" onClick={e => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2.5 text-xs text-primary border-primary/30 hover:bg-primary/10"
                              onClick={() => router.push(`/dashboard/lesson-notes/${note.id}`)}
                            >
                              Review <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredPendingNotes.map(note => {
                  const isSelected = selectedNoteIds.has(note.id);
                  return (
                    <Card
                      key={note.id}
                      className={`cursor-pointer border-border bg-card hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between ${
                        isSelected ? 'ring-2 ring-primary border-primary' : ''
                      }`}
                      onClick={() => router.push(`/dashboard/lesson-notes/${note.id}`)}
                    >
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <button
                            type="button"
                            onClick={e => toggleSelectNote(note.id, e)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {isSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                          </button>
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">
                            Awaiting Review
                          </Badge>
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-foreground line-clamp-2">
                            {note.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            By {note.teacher?.firstName} {note.teacher?.lastName}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {note.subject?.name} • {note.class?.name}
                          </p>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/50">
                          <span>Week {note.weekNumber || 1}</span>
                          <span className="text-primary font-semibold flex items-center">
                            Review <ArrowUpRight className="w-3 h-3 ml-0.5" />
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* CREATE BLANK LESSON PLAN DIALOG */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
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
                className="bg-background border-border text-foreground text-xs rounded-lg"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Week 1: Introduction to Algebra"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Subject</Label>
                <Select value={form.subjectId} onValueChange={v => setForm(p => ({ ...p, subjectId: v }))}>
                  <SelectTrigger className="bg-background border-border text-foreground text-xs rounded-lg">
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
                  <SelectTrigger className="bg-background border-border text-foreground text-xs rounded-lg">
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
                  <SelectTrigger className="bg-background border-border text-foreground text-xs rounded-lg">
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
                  className="bg-background border-border text-foreground text-xs rounded-lg"
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
              className="text-muted-foreground hover:text-foreground text-xs rounded-lg"
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleCreate(false)}
              disabled={isSaving}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs rounded-lg font-semibold min-w-[120px]"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : null}
              {isSaving ? 'Creating...' : 'Create Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* UPLOAD OUTSIDE LESSON PLAN DIALOG */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="bg-card border-border text-foreground shadow-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">Upload Outside Lesson Plan</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Upload an external PDF, Word document (.docx/.doc), PowerPoint, or scanned notes from your device.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Document Title</Label>
              <Input
                className="bg-background border-border text-foreground text-xs rounded-lg"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Term 1 Physics Syllabus Notes"
              />
            </div>

            {/* Drag and Drop File Upload */}
            <DocumentUploadZone
              folder="lessonNotes"
              label="Attach Outside File"
              initialUrl={form.fileUrl}
              onUploaded={(url, fileName) => {
                setForm(p => ({
                  ...p,
                  fileUrl: url,
                  title: p.title === 'Untitled Document' || !p.title || p.title === 'External Document' ? fileName.replace(/\.[^/.]+$/, '') : p.title
                }));
              }}
            />

            <div className="pt-1">
              <details className="text-[11px] text-muted-foreground cursor-pointer">
                <summary className="hover:text-foreground font-medium">Or paste an external web link (Google Docs / Drive)</summary>
                <div className="mt-2">
                  <Input
                    className="bg-background border-border text-foreground text-xs rounded-lg font-mono"
                    value={form.fileUrl}
                    onChange={e => setForm(p => ({ ...p, fileUrl: e.target.value }))}
                    placeholder="https://docs.google.com/document/... or direct link"
                  />
                </div>
              </details>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Subject</Label>
                <Select value={form.subjectId} onValueChange={v => setForm(p => ({ ...p, subjectId: v }))}>
                  <SelectTrigger className="bg-background border-border text-foreground text-xs rounded-lg">
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
                  <SelectTrigger className="bg-background border-border text-foreground text-xs rounded-lg">
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
                  <SelectTrigger className="bg-background border-border text-foreground text-xs rounded-lg">
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
                  className="bg-background border-border text-foreground text-xs rounded-lg"
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
              className="text-muted-foreground hover:text-foreground text-xs rounded-lg"
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleCreate(true)}
              disabled={isSaving}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs rounded-lg font-semibold min-w-[120px]"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : null}
              {isSaving ? 'Uploading...' : 'Save & Open'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BULK REJECT REASON MODAL */}
      <Dialog open={rejectReasonModalOpen} onOpenChange={setRejectReasonModalOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" /> Return for Revision
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Provide feedback for the teachers explaining what needs correction before approval.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs font-semibold text-muted-foreground">Reviewer Feedback Notes</Label>
            <textarea
              className="w-full h-24 bg-background border border-border rounded-lg p-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none resize-none"
              placeholder="e.g. Please align behavioral objectives with Bloom's taxonomy and include practical exercises..."
              value={bulkRejectReason}
              onChange={e => setBulkRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter className="border-t border-border pt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRejectReasonModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleBulkRejectSubmit}
              disabled={isBulkActing}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
            >
              {isBulkActing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              Send Feedback & Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
