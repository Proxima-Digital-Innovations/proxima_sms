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
  createQuestionPaper,
  getQuestionPapers,
  deleteQuestionPaper,
} from '@/actions/question-paper-actions';
import { getAcademicData } from '@/actions/academic-data';
import {
  Plus,
  FileQuestion,
  Upload,
  MoreVertical,
  Search,
  Loader2,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  X,
  Eye,
  LayoutGrid,
  List,
  Filter,
  FileText,
  ArrowUpRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DocumentUploadZone } from '@/components/academics/document-upload-zone';

const OFFICER_ROLES = ['EXAM_OFFICER', 'ADMIN', 'SUPER_ADMIN'];
const PAPER_TYPES = ['CA Test', 'Mid-Term Exam', 'Final Exam'];

export default function QuestionPapersPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const userRole = (session?.user as any)?.role;
  const { toast } = useToast();
  const router = useRouter();

  const [myPapers, setMyPapers] = useState<any[]>([]);
  const [reviewQueue, setReviewQueue] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // View Mode: Table (default high-density) or Cards
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const [createOpen, setCreateOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    title: 'Untitled Question Paper',
    subjectId: '',
    classId: '',
    termId: '',
    paperType: 'CA Test',
    fileUrl: '',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'>('ALL');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  const isOfficer = OFFICER_ROLES.includes((userRole || '').toUpperCase());

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const [acadRes, myRes, queueRes] = await Promise.all([
        getAcademicData(),
        getQuestionPapers({ teacherId: userId }),
        isOfficer ? getQuestionPapers({ status: 'SUBMITTED' }) : Promise.resolve({ success: true, papers: [] }),
      ]);
      setSubjects(acadRes.subjects || []);
      setClasses(acadRes.classes || []);
      setTerms(acadRes.terms || []);

      const activeTerm = acadRes.terms?.find((t: any) => t.isActive) || acadRes.terms?.[0];
      if (activeTerm) setForm(prev => ({ ...prev, termId: activeTerm.id }));

      if (myRes.success) setMyPapers(myRes.papers || []);
      if (queueRes.success) setReviewQueue((queueRes.papers || []).filter((p: any) => p.teacherId !== userId));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (withAttachment = false) => {
    if (!form.title || !form.subjectId || !form.classId || !form.termId) {
      toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please fill in title, subject, class, and term.' });
      return;
    }
    if (withAttachment && !form.fileUrl) {
      toast({ variant: 'destructive', title: 'No File Attached', description: 'Please select an outside document to upload.' });
      return;
    }
    setIsSaving(true);
    try {
      const res = await createQuestionPaper({
        title: form.title,
        subjectId: form.subjectId,
        classId: form.classId,
        teacherId: userId,
        termId: form.termId,
        paperType: form.paperType,
        fileUrl: withAttachment && form.fileUrl ? form.fileUrl : undefined,
      });
      if (res.success && res.paper) {
        toast({ title: 'Created', description: 'Opening question paper...' });
        setCreateOpen(false);
        setUploadOpen(false);
        router.push(`/dashboard/exam-questions/${res.paper.id}`);
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
      await deleteQuestionPaper(id);
      toast({ title: 'Deleted', description: 'Question paper removed.' });
      loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  };

  // Filtered papers
  const filteredMyPapers = useMemo(() => {
    return myPapers.filter(p => {
      const matchesSearch =
        p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.subject?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.class?.name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
      const matchesSubject = selectedSubject === 'ALL' || p.subjectId === selectedSubject;
      const matchesClass = selectedClass === 'ALL' || p.classId === selectedClass;
      const matchesType = selectedType === 'ALL' || (p.evaluation || '').includes(selectedType);

      return matchesSearch && matchesStatus && matchesSubject && matchesClass && matchesType;
    });
  }, [myPapers, searchQuery, statusFilter, selectedSubject, selectedClass, selectedType]);

  const filteredQueue = useMemo(() => {
    return reviewQueue.filter(p => {
      const matchesSearch =
        p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.subject?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.class?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.teacher?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.teacher?.lastName?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSubject = selectedSubject === 'ALL' || p.subjectId === selectedSubject;
      const matchesClass = selectedClass === 'ALL' || p.classId === selectedClass;

      return matchesSearch && matchesSubject && matchesClass;
    });
  }, [reviewQueue, searchQuery, selectedSubject, selectedClass]);

  const statusCounts = useMemo(() => {
    return {
      ALL: myPapers.length,
      DRAFT: myPapers.filter(p => p.status === 'DRAFT').length,
      SUBMITTED: myPapers.filter(p => p.status === 'SUBMITTED').length,
      APPROVED: myPapers.filter(p => p.status === 'APPROVED').length,
      REJECTED: myPapers.filter(p => p.status === 'REJECTED').length,
    };
  }, [myPapers]);

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
            <Clock className="w-3 h-3 mr-1" /> In Moderation
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

  const extractPaperType = (evalString?: string) => {
    if (!evalString) return 'CA Test';
    const parts = evalString.split(':');
    return parts[1] || 'CA Test';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 border border-primary/20 rounded-lg text-primary">
              <FileQuestion className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Question Papers & Moderation</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Author examination question papers, upload continuous assessment tests, and manage moderation approvals.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => {
              setForm(p => ({ ...p, title: 'External Question Paper', fileUrl: '' }));
              setUploadOpen(true);
            }}
            className="border-border text-foreground hover:bg-muted font-medium text-xs sm:text-sm"
          >
            <Upload className="w-4 h-4 mr-2 text-primary" />
            Upload Outside Paper
          </Button>

          <Button
            onClick={() => {
              setForm(p => ({ ...p, title: 'Untitled Question Paper', fileUrl: '' }));
              setCreateOpen(true);
            }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs sm:text-sm shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Question Paper
          </Button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Papers</p>
              <p className="text-2xl font-bold text-foreground">{statusCounts.ALL}</p>
              <p className="text-[11px] text-muted-foreground">Your authored papers</p>
            </div>
            <div className="p-3 bg-muted rounded-xl text-muted-foreground">
              <FileQuestion className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">In Moderation</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{statusCounts.SUBMITTED}</p>
              <p className="text-[11px] text-muted-foreground">Awaiting Exam Officer</p>
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
              <p className="text-[11px] text-muted-foreground">Cleared for printing/exam</p>
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
              <p className="text-[11px] text-muted-foreground">Feedback provided</p>
            </div>
            <div className="p-3 bg-rose-500/10 rounded-xl text-rose-600">
              <AlertCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Container */}
      <Tabs defaultValue="my-papers" className="w-full space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-border pb-3">
          <TabsList className="bg-muted p-1 rounded-lg h-9">
            <TabsTrigger
              value="my-papers"
              className="rounded-md px-3 text-xs font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              My Question Papers ({myPapers.length})
            </TabsTrigger>
            {isOfficer && (
              <TabsTrigger
                value="review-queue"
                className="rounded-md px-3 text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground relative"
              >
                Moderation Queue
                {reviewQueue.length > 0 && (
                  <span className="ml-1.5 bg-primary-foreground/20 text-primary-foreground py-0.5 px-1.5 rounded-full text-[10px] font-bold">
                    {reviewQueue.length}
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
                <SelectTrigger className="w-[140px] bg-background border-border text-xs rounded-lg h-9">
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
                <SelectTrigger className="w-[130px] bg-background border-border text-xs rounded-lg h-9">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="ALL" className="text-xs">All Classes</SelectItem>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-[130px] bg-background border-border text-xs rounded-lg h-9">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="ALL" className="text-xs">All Types</SelectItem>
                  {PAPER_TYPES.map(t => (
                    <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(searchQuery || selectedSubject !== 'ALL' || selectedClass !== 'ALL' || selectedType !== 'ALL' || statusFilter !== 'ALL') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedSubject('ALL');
                    setSelectedClass('ALL');
                    setSelectedType('ALL');
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
              In Moderation ({statusCounts.SUBMITTED})
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

        {/* TEACHER'S PAPERS TAB */}
        <TabsContent value="my-papers" className="outline-none space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
              <p className="text-xs font-medium">Loading your question papers...</p>
            </div>
          ) : filteredMyPapers.length === 0 ? (
            /* Empty State */
            <Card className="border-border bg-card">
              <CardContent className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 text-primary">
                  <FileQuestion className="w-7 h-7" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">No Question Papers Found</h3>
                <p className="text-xs text-muted-foreground max-w-md mb-6">
                  {statusFilter !== 'ALL' || searchQuery || selectedSubject !== 'ALL' || selectedClass !== 'ALL'
                    ? 'No question papers match your current filters. Try resetting the search or filters.'
                    : 'You haven’t created any question papers yet. Author your exam questions directly or upload existing files.'}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button
                    onClick={() => {
                      setForm(p => ({ ...p, title: 'Untitled Question Paper', fileUrl: '' }));
                      setCreateOpen(true);
                    }}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 px-4 rounded-lg"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    New Question Paper
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setForm(p => ({ ...p, title: 'External Question Paper', fileUrl: '' }));
                      setUploadOpen(true);
                    }}
                    className="border-border text-foreground hover:bg-muted text-xs h-9 px-4 rounded-lg font-medium"
                  >
                    <Upload className="w-4 h-4 mr-2 text-primary" />
                    Upload Outside Paper
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
                    <TableHead className="w-[30%] text-xs font-semibold">Title & Paper Type</TableHead>
                    <TableHead className="text-xs font-semibold">Subject</TableHead>
                    <TableHead className="text-xs font-semibold">Class</TableHead>
                    <TableHead className="text-xs font-semibold">Term</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold">Updated</TableHead>
                    <TableHead className="text-right text-xs font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMyPapers.map(paper => (
                    <TableRow
                      key={paper.id}
                      className="cursor-pointer border-border hover:bg-muted/50 transition-colors"
                      onClick={() => router.push(`/dashboard/exam-questions/${paper.id}`)}
                    >
                      <TableCell className="font-medium text-xs">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-md bg-muted text-foreground">
                            {paper.fileUrl ? <Paperclip className="w-3.5 h-3.5 text-primary" /> : <FileText className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                              {paper.title || 'Untitled Document'}
                              {paper.fileUrl && (
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-primary/5 text-primary border-primary/20">
                                  Outside Doc
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="secondary" className="text-[9px] font-mono">
                                {extractPaperType(paper.evaluation)}
                              </Badge>
                              {paper.status === 'REJECTED' && paper.reviewNote && (
                                <span className="text-[10px] text-rose-600 line-clamp-1">
                                  {paper.reviewNote}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-foreground font-medium">
                        {paper.subject?.name || '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {paper.class?.name || '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {paper.term?.name || '—'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {renderStatusBadge(paper.status)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(paper.submissionDate || paper.createdAt), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right text-xs" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2.5 text-xs text-foreground hover:text-primary"
                            onClick={() => router.push(`/dashboard/exam-questions/${paper.id}`)}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" /> View
                          </Button>

                          {paper.status === 'DRAFT' && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-popover border-border">
                                <DropdownMenuItem
                                  className="text-xs text-rose-600 focus:text-rose-600 cursor-pointer"
                                  onClick={e => handleDelete(paper.id, e)}
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
              {filteredMyPapers.map(paper => (
                <Card
                  key={paper.id}
                  className="cursor-pointer border-border bg-card hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between"
                  onClick={() => router.push(`/dashboard/exam-questions/${paper.id}`)}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="p-2 rounded-lg bg-muted text-primary">
                        {paper.fileUrl ? <Paperclip className="w-4 h-4" /> : <FileQuestion className="w-4 h-4" />}
                      </div>
                      {renderStatusBadge(paper.status)}
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm text-foreground line-clamp-2 hover:text-primary transition-colors">
                        {paper.title || 'Untitled Document'}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="secondary" className="text-[10px]">
                          {extractPaperType(paper.evaluation)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {paper.subject?.name} • {paper.class?.name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/50">
                      <span>{paper.term?.name || 'Active Term'}</span>
                      <span>{format(new Date(paper.submissionDate || paper.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* MODERATION QUEUE TAB */}
        {isOfficer && (
          <TabsContent value="review-queue" className="outline-none space-y-4">
            {filteredQueue.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3 text-emerald-600">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">Moderation Queue is Clear</h3>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    No submitted question papers are currently awaiting examination moderation.
                  </p>
                </CardContent>
              </Card>
            ) : viewMode === 'table' ? (
              <Card className="border-border bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-xs font-semibold">Title & Paper Type</TableHead>
                      <TableHead className="text-xs font-semibold">Teacher</TableHead>
                      <TableHead className="text-xs font-semibold">Subject</TableHead>
                      <TableHead className="text-xs font-semibold">Class</TableHead>
                      <TableHead className="text-xs font-semibold">Submitted</TableHead>
                      <TableHead className="text-right text-xs font-semibold">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQueue.map(paper => (
                      <TableRow
                        key={paper.id}
                        className="cursor-pointer border-border hover:bg-muted/50 transition-colors"
                        onClick={() => router.push(`/dashboard/exam-questions/${paper.id}`)}
                      >
                        <TableCell className="font-medium text-xs">
                          <div className="flex items-center gap-2">
                            {paper.fileUrl ? <Paperclip className="w-3.5 h-3.5 text-primary" /> : <FileText className="w-3.5 h-3.5 text-muted-foreground" />}
                            <div>
                              <span className="font-semibold text-foreground">{paper.title}</span>
                              <div className="text-[10px] text-muted-foreground">{extractPaperType(paper.evaluation)}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-foreground font-medium">
                          {paper.teacher ? `${paper.teacher.firstName} ${paper.teacher.lastName}` : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{paper.subject?.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{paper.class?.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(paper.submissionDate || paper.createdAt), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right text-xs" onClick={e => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2.5 text-xs text-primary border-primary/30 hover:bg-primary/10"
                            onClick={() => router.push(`/dashboard/exam-questions/${paper.id}`)}
                          >
                            Moderate <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredQueue.map(paper => (
                  <Card
                    key={paper.id}
                    className="cursor-pointer border-border bg-card hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between"
                    onClick={() => router.push(`/dashboard/exam-questions/${paper.id}`)}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <Badge variant="secondary" className="text-[10px]">
                          {extractPaperType(paper.evaluation)}
                        </Badge>
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">
                          Awaiting Moderation
                        </Badge>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-foreground line-clamp-2">
                          {paper.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          By {paper.teacher?.firstName} {paper.teacher?.lastName}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {paper.subject?.name} • {paper.class?.name}
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/50">
                        <span>{format(new Date(paper.submissionDate || paper.createdAt), 'MMM d, yyyy')}</span>
                        <span className="text-primary font-semibold flex items-center">
                          Moderate <ArrowUpRight className="w-3 h-3 ml-0.5" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* CREATE BLANK QUESTION PAPER DIALOG */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border text-foreground shadow-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">New Question Paper</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Initialize a new question paper document for testing or exams.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Paper Title</Label>
              <Input
                className="bg-background border-border text-foreground text-xs rounded-lg"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Mid-Term Algebra Test"
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
                      <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
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
                      <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
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
                      <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Paper Type</Label>
                <Select value={form.paperType} onValueChange={v => setForm(p => ({ ...p, paperType: v }))}>
                  <SelectTrigger className="bg-background border-border text-foreground text-xs rounded-lg">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {PAPER_TYPES.map(t => (
                      <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

      {/* UPLOAD OUTSIDE QUESTION PAPER DIALOG */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="bg-card border-border text-foreground shadow-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">Upload Outside Question Paper</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Upload an external exam paper (PDF, Word DOCX/DOC, scanned paper) directly from your device.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Paper Title</Label>
              <Input
                className="bg-background border-border text-foreground text-xs rounded-lg"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. SS2 Physics First Term Exam Paper"
              />
            </div>

            {/* Document Upload Zone */}
            <DocumentUploadZone
              folder="examQuestions"
              label="Attach Question Paper (PDF / Word / Scans)"
              initialUrl={form.fileUrl}
              onUploaded={(url, fileName) => {
                setForm(p => ({
                  ...p,
                  fileUrl: url,
                  title: p.title === 'Untitled Question Paper' || !p.title || p.title === 'External Question Paper' ? fileName.replace(/\.[^/.]+$/, '') : p.title
                }));
              }}
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Subject</Label>
                <Select value={form.subjectId} onValueChange={v => setForm(p => ({ ...p, subjectId: v }))}>
                  <SelectTrigger className="bg-background border-border text-foreground text-xs rounded-lg">
                    <SelectValue placeholder="Select Subject" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {subjects.map(s => (
                      <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
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
                      <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
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
                      <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Paper Type</Label>
                <Select value={form.paperType} onValueChange={v => setForm(p => ({ ...p, paperType: v }))}>
                  <SelectTrigger className="bg-background border-border text-foreground text-xs rounded-lg">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {PAPER_TYPES.map(t => (
                      <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
    </div>
  );
}
