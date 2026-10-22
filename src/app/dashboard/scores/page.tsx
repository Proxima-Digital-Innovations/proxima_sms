'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { getAcademicData } from '@/actions/academic-data';
import {
  getScoresByClassSubjectAndTerm,
  getModerationQueue,
  getModerationStats,
  saveModeratorScores,
  toggleScoreSheetLock,
  reviewScoreSheet,
  getScoreAuditHistory,
} from '@/actions/results-actions';
import { getStudents } from '@/actions/student-actions';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Download,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Save,
  Users,
  Award,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  History,
  FileSpreadsheet,
  Check,
  HelpCircle,
  User,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface CandidateScore {
  id?: string;
  studentId: string;
  fullName: string;
  admissionNumber: string;
  ca1: number | null;
  ca2: number | null;
  exam: number | null;
  originalCa1?: number | null;
  originalCa2?: number | null;
  originalExam?: number | null;
  total: number;
  grade: string;
  remarks?: string;
  status: string;
  moderatorNote?: string | null;
  isLocked?: boolean;
  auditLogs?: any[];
}

export default function ReviewScoresPage() {
  const { data: session } = useSession();
  const userRole = ((session?.user as any)?.role || '').toUpperCase();
  const userId = (session?.user as any)?.id;
  const isReviewer = ['ADMIN', 'SUPER_ADMIN', 'EXAM_OFFICER', 'SLT', 'HOD'].includes(userRole);
  const { toast } = useToast();

  // Active top-level tab
  const [activeTab, setActiveTab] = useState<'queue' | 'detail' | 'audit'>('queue');

  // Academic metadata
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);

  // Selected global term/session
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState('');

  // 1. Queue State
  const [queueSheets, setQueueSheets] = useState<any[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [queueStatusFilter, setQueueStatusFilter] = useState<'ALL' | 'Pending' | 'Approved' | 'Rejected' | 'Draft'>('ALL');
  const [queueClassFilter, setQueueClassFilter] = useState<string>('ALL');
  const [queueSearch, setQueueSearch] = useState('');
  const [moderationStats, setModerationStats] = useState({
    pendingCount: 0,
    approvedCount: 0,
    returnedCount: 0,
    draftCount: 0,
    totalSheets: 0,
    approvalRate: 0,
  });

  // 2. Detailed Score Sheet View State
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [scoresList, setScoresList] = useState<CandidateScore[]>([]);
  const [sheetStatus, setSheetStatus] = useState<'Draft' | 'Pending' | 'Approved' | 'Rejected'>('Draft');
  const [sheetModeratorNote, setSheetModeratorNote] = useState<string | null>(null);
  const [isSheetLocked, setIsSheetLocked] = useState(false);
  const [assignedTeacher, setAssignedTeacher] = useState<string>('Unassigned');
  const [activeClassName, setActiveClassName] = useState<string>('');
  const [activeSubjectName, setActiveSubjectName] = useState<string>('');
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetailLoaded, setIsDetailLoaded] = useState(false);

  // Moderator inline edits
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [adjustmentReason, setAdjustmentReason] = useState('Moderator score calibration');

  // Reject / Return dialog
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectFeedback, setRejectFeedback] = useState('');

  // Lock confirmation
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);

  // 3. Audit Trail State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditSubjectFilter, setAuditSubjectFilter] = useState<string>('ALL');

  // Helper: grade calculation
  const calculateGradeSync = (score: number) => {
    if (score >= 75) return 'A1';
    if (score >= 70) return 'B2';
    if (score >= 65) return 'B3';
    if (score >= 60) return 'C4';
    if (score >= 55) return 'C5';
    if (score >= 50) return 'C6';
    if (score >= 45) return 'D7';
    if (score >= 40) return 'E8';
    return 'F9';
  };

  // Initial Load: Academic Data
  useEffect(() => {
    (async () => {
      try {
        const acadRes = await getAcademicData();
        setClasses(acadRes.classes || []);
        setSubjects(acadRes.subjects || []);
        setTerms(acadRes.terms || []);
        setSessions(acadRes.sessions || []);

        const activeTerm = acadRes.terms?.find((t: any) => t.isActive) || acadRes.terms?.[0];
        const activeSession = acadRes.sessions?.find((s: any) => s.isActive) || acadRes.sessions?.[0];
        if (activeTerm) setSelectedTerm(activeTerm.id);
        if (activeSession) setSelectedSession(activeSession.id);
      } catch (err: any) {
        toast({ variant: 'destructive', title: 'Failed to load academic data', description: err.message });
      }
    })();
  }, []);

  // Fetch Queue & Stats
  const fetchQueueData = useCallback(async () => {
    if (!selectedTerm) return;
    setIsLoadingQueue(true);
    try {
      const [queueRes, statsRes] = await Promise.all([
        getModerationQueue({
          termId: selectedTerm,
          sessionId: selectedSession || undefined,
          status: queueStatusFilter !== 'ALL' ? queueStatusFilter : undefined,
          classId: queueClassFilter !== 'ALL' ? queueClassFilter : undefined,
          search: queueSearch.trim() || undefined,
        }),
        getModerationStats(selectedTerm, selectedSession || undefined),
      ]);

      if (queueRes.success) {
        setQueueSheets(queueRes.sheets || []);
      }
      if (statsRes.success) {
        setModerationStats({
          pendingCount: statsRes.pendingCount,
          approvedCount: statsRes.approvedCount,
          returnedCount: statsRes.returnedCount,
          draftCount: statsRes.draftCount,
          totalSheets: statsRes.totalSheets,
          approvalRate: statsRes.approvalRate,
        });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error loading queue', description: err.message });
    } finally {
      setIsLoadingQueue(false);
    }
  }, [selectedTerm, selectedSession, queueStatusFilter, queueClassFilter, queueSearch]);

  useEffect(() => {
    if (selectedTerm) {
      fetchQueueData();
    }
  }, [selectedTerm, selectedSession, queueStatusFilter, queueClassFilter, fetchQueueData]);

  // Fetch Audit Logs
  const fetchAuditData = useCallback(async () => {
    if (!selectedTerm) return;
    setIsLoadingAudit(true);
    try {
      const res = await getScoreAuditHistory({
        termId: selectedTerm,
        subjectId: auditSubjectFilter !== 'ALL' ? auditSubjectFilter : undefined,
        limit: 100,
      });
      if (res.success) {
        setAuditLogs(res.logs || []);
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to load audit history', description: err.message });
    } finally {
      setIsLoadingAudit(false);
    }
  }, [selectedTerm, auditSubjectFilter]);

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditData();
    }
  }, [activeTab, fetchAuditData]);

  // Load detailed score sheet
  const loadScoreSheet = async (overrideClassId?: string, overrideSubjectId?: string) => {
    const classToLoad = overrideClassId || selectedClass;
    const subjectToLoad = overrideSubjectId || selectedSubject;

    if (!classToLoad || !subjectToLoad || !selectedTerm) {
      toast({
        variant: 'destructive',
        title: 'Incomplete Selection',
        description: 'Please select both a class and a subject to view scores.',
      });
      return;
    }

    setIsLoadingDetail(true);
    try {
      const [stuRes, scoreRes] = await Promise.all([
        getStudents(classToLoad),
        getScoresByClassSubjectAndTerm(classToLoad, subjectToLoad, selectedTerm, selectedSession),
      ]);

      if (stuRes.success && stuRes.data) {
        const existingScores = scoreRes.scores || [];
        let computedStatus: 'Draft' | 'Pending' | 'Approved' | 'Rejected' = 'Draft';
        let foundFeedback: string | null = null;
        let sheetIsLocked = false;

        if (existingScores.length > 0) {
          const hasApproved = existingScores.some((sc: any) => sc.status === 'Approved');
          const hasPending = existingScores.some((sc: any) => sc.status === 'Pending');
          const hasRejected = existingScores.some((sc: any) => sc.status === 'Rejected');
          sheetIsLocked = existingScores.some((sc: any) => sc.isLocked);

          if (hasRejected) {
            computedStatus = 'Rejected';
            const rejectedDoc = existingScores.find((sc: any) => sc.status === 'Rejected' && sc.moderatorNote);
            foundFeedback = rejectedDoc?.moderatorNote || null;
          } else if (hasPending) {
            computedStatus = 'Pending';
          } else if (hasApproved) {
            computedStatus = 'Approved';
          }
        }

        setSheetStatus(computedStatus);
        setSheetModeratorNote(foundFeedback);
        setIsSheetLocked(sheetIsLocked);
        setAssignedTeacher(scoreRes.assignedTeacher || 'Unassigned');
        setActiveClassName(scoreRes.class?.name || classes.find(c => c.id === classToLoad)?.name || 'Class');
        setActiveSubjectName(scoreRes.subject?.name || subjects.find(s => s.id === subjectToLoad)?.name || 'Subject');

        const list: CandidateScore[] = stuRes.data.map((student: any) => {
          const matched = existingScores.find((sc: any) => sc.studentId === student.id);
          const ca1 = matched?.ca1 != null ? matched.ca1 : null;
          const ca2 = matched?.ca2 != null ? matched.ca2 : null;
          const exam = matched?.exam != null ? matched.exam : null;
          const total = (ca1 || 0) + (ca2 || 0) + (exam || 0);

          return {
            id: matched?.id,
            studentId: student.id,
            fullName: `${student.lastName}, ${student.firstName}`,
            admissionNumber: student.studentId || '-',
            ca1,
            ca2,
            exam,
            originalCa1: matched?.originalCa1 != null ? matched.originalCa1 : ca1,
            originalCa2: matched?.originalCa2 != null ? matched.originalCa2 : ca2,
            originalExam: matched?.originalExam != null ? matched.originalExam : exam,
            total: Math.round(total * 10) / 10,
            grade: total > 0 ? calculateGradeSync(total) : '-',
            remarks: matched?.remarks || '',
            status: matched?.status || 'Draft',
            moderatorNote: matched?.moderatorNote || null,
            isLocked: matched?.isLocked ?? false,
            auditLogs: matched?.scoreAuditLogs || [],
          };
        });

        setScoresList(list);
        setDirty(new Set());
        setIsDetailLoaded(true);
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to inspect sheet', description: err.message });
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Open Sheet directly from Queue item
  const handleSelectFromQueue = (sheet: any) => {
    setSelectedClass(sheet.classId);
    setSelectedSubject(sheet.subjectId);
    loadScoreSheet(sheet.classId, sheet.subjectId);
    setActiveTab('detail');
  };

  // Moderator Inline Edit
  const handleModeratorEdit = (studentId: string, field: 'ca1' | 'ca2' | 'exam', value: string) => {
    if (isSheetLocked) {
      toast({
        variant: 'destructive',
        title: 'Sheet is Locked',
        description: 'This score sheet has been locked. Unlock it before making adjustments.',
      });
      return;
    }

    const num = value === '' ? 0 : parseFloat(value);
    if (isNaN(num)) return;
    if (field === 'ca1' && (num < 0 || num > 20)) return;
    if (field === 'ca2' && (num < 0 || num > 20)) return;
    if (field === 'exam' && (num < 0 || num > 60)) return;

    setScoresList(prev =>
      prev.map(item => {
        if (item.studentId === studentId) {
          const updated = {
            ...item,
            [field]: value === '' ? null : num,
          };
          const newTotal = (updated.ca1 || 0) + (updated.ca2 || 0) + (updated.exam || 0);
          return {
            ...updated,
            total: Math.round(newTotal * 10) / 10,
            grade: newTotal > 0 ? calculateGradeSync(newTotal) : '-',
          };
        }
        return item;
      })
    );

    setDirty(prev => new Set(prev).add(studentId));
  };

  // Save Moderator Adjustments with Audit Logging
  const handleSaveModeratorChanges = async () => {
    if (dirty.size === 0) return;
    setIsSubmitting(true);
    try {
      const edits = scoresList
        .filter(s => dirty.has(s.studentId))
        .map(s => ({
          studentId: s.studentId,
          ca1: s.ca1,
          ca2: s.ca2,
          exam: s.exam,
          reason: adjustmentReason.trim() || 'Moderator score adjustment',
        }));

      const res = await saveModeratorScores({
        classId: selectedClass,
        subjectId: selectedSubject,
        termId: selectedTerm,
        edits,
        modifierId: userId,
      });

      if (res.success) {
        toast({
          title: 'Corrections Logged & Saved',
          description: `${edits.length} mark adjustment(s) recorded in audit history.`,
        });
        setDirty(new Set());
        setIsSaveModalOpen(false);
        loadScoreSheet();
        fetchQueueData();
      } else {
        throw new Error(res.error || 'Failed to save changes');
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Approve and Lock Sheet
  const handleApproveSheet = async () => {
    if (!selectedClass || !selectedSubject || !selectedTerm) return;
    setIsSubmitting(true);
    try {
      if (dirty.size > 0) {
        await handleSaveModeratorChanges();
      }
      const res = await reviewScoreSheet(selectedClass, selectedSubject, selectedTerm, 'Approved', undefined, userId);
      if (res.success) {
        setSheetStatus('Approved');
        setIsSheetLocked(true);
        setScoresList(prev => prev.map(s => ({ ...s, status: 'Approved', isLocked: true })));
        toast({
          title: 'Score Sheet Approved & Locked',
          description: 'Scores are officially approved, published for report cards, and locked against tampering.',
        });
        fetchQueueData();
      } else {
        throw new Error(res.error || 'Approval failed');
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reject / Return Sheet with Internal Moderator Note
  const handleRejectSheet = async () => {
    if (!selectedClass || !selectedSubject || !selectedTerm) return;
    if (!rejectFeedback.trim()) {
      toast({
        variant: 'destructive',
        title: 'Feedback Required',
        description: 'Please specify the exact revision instructions for the subject teacher.',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await reviewScoreSheet(
        selectedClass,
        selectedSubject,
        selectedTerm,
        'Rejected',
        rejectFeedback,
        userId
      );
      if (res.success) {
        setSheetStatus('Rejected');
        setSheetModeratorNote(rejectFeedback);
        setIsSheetLocked(false);
        setScoresList(prev =>
          prev.map(s => ({
            ...s,
            status: 'Rejected',
            moderatorNote: rejectFeedback,
            isLocked: false,
          }))
        );
        setIsRejectOpen(false);
        setRejectFeedback('');
        toast({
          title: 'Sheet Returned to Teacher',
          description: 'The internal revision note was recorded without modifying parent report card remarks.',
        });
        fetchQueueData();
      } else {
        throw new Error(res.error || 'Rejection failed');
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Sheet Lock State
  const handleToggleLock = async () => {
    if (!selectedClass || !selectedSubject || !selectedTerm) return;
    const targetLockState = !isSheetLocked;
    setIsSubmitting(true);
    try {
      const res = await toggleScoreSheetLock(selectedClass, selectedSubject, selectedTerm, targetLockState);
      if (res.success) {
        setIsSheetLocked(targetLockState);
        setScoresList(prev => prev.map(s => ({ ...s, isLocked: targetLockState })));
        setIsLockModalOpen(false);
        toast({
          title: targetLockState ? 'Sheet Locked' : 'Sheet Unlocked',
          description: targetLockState
            ? 'Score modifications are now blocked to preserve academic integrity.'
            : 'Moderators can now make authorized score corrections.',
        });
        fetchQueueData();
      } else {
        throw new Error(res.error || 'Failed to toggle lock');
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (scoresList.length === 0) return;
    const headers = [
      'Candidate ID',
      'Candidate Name',
      'CA1 (20)',
      'Orig CA1',
      'CA2 (20)',
      'Orig CA2',
      'Exam (60)',
      'Orig Exam',
      'Total (100)',
      'Grade',
      'Status',
      'Is Locked',
    ];
    const rows = scoresList.map(s => [
      s.admissionNumber,
      `"${s.fullName}"`,
      s.ca1 ?? '',
      s.originalCa1 ?? '',
      s.ca2 ?? '',
      s.originalCa2 ?? '',
      s.exam ?? '',
      s.originalExam ?? '',
      s.total,
      s.grade,
      s.status,
      s.isLocked ? 'Yes' : 'No',
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `moderation_${activeClassName.replace(/\s+/g, '_')}_${activeSubjectName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Performance analytics for detail view
  const analytics = useMemo(() => {
    if (scoresList.length === 0) {
      return { total: 0, scored: 0, average: 0, passRate: 0, distinctionRate: 0, highest: 0, lowest: 0 };
    }

    const validScores = scoresList.filter(s => s.total > 0);
    const scoredCount = validScores.length;
    if (scoredCount === 0) {
      return { total: scoresList.length, scored: 0, average: 0, passRate: 0, distinctionRate: 0, highest: 0, lowest: 0 };
    }

    const totalSum = validScores.reduce((acc, s) => acc + s.total, 0);
    const passCount = validScores.filter(s => s.total >= 50).length;
    const distinctionCount = validScores.filter(s => ['A1', 'B2', 'B3'].includes(s.grade)).length;
    const highest = Math.max(...validScores.map(s => s.total));
    const lowest = Math.min(...validScores.map(s => s.total));

    return {
      total: scoresList.length,
      scored: scoredCount,
      average: Math.round((totalSum / scoredCount) * 10) / 10,
      passRate: Math.round((passCount / scoredCount) * 100),
      distinctionRate: Math.round((distinctionCount / scoredCount) * 100),
      highest,
      lowest,
    };
  }, [scoresList]);

  // Filtered audit logs
  const filteredAuditLogs = useMemo(() => {
    if (!auditSearch.trim()) return auditLogs;
    const q = auditSearch.toLowerCase().trim();
    return auditLogs.filter((log: any) => {
      const studentName = `${log.termGrade?.student?.firstName || ''} ${log.termGrade?.student?.lastName || ''}`.toLowerCase();
      const studentId = (log.termGrade?.student?.studentId || '').toLowerCase();
      const subjectName = (log.termGrade?.subject?.name || '').toLowerCase();
      const modifierName = `${log.modifier?.firstName || ''} ${log.modifier?.lastName || ''}`.toLowerCase();
      const reason = (log.reason || '').toLowerCase();
      return (
        studentName.includes(q) ||
        studentId.includes(q) ||
        subjectName.includes(q) ||
        modifierName.includes(q) ||
        reason.includes(q)
      );
    });
  }, [auditLogs, auditSearch]);

  return (
    <div className="w-full space-y-5">
      {/* Top Header Card */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Score Moderation</h1>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold">
                  Exam Officer & HOD Deck
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Quality assurance inbox, continuous assessment compliance, lock protection & score audit trail
              </p>
            </div>
          </div>
        </div>

        {/* Global Academic Session & Term Selectors */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-xl border border-border">
            <Select value={selectedSession} onValueChange={setSelectedSession}>
              <SelectTrigger className="w-[140px] h-8 text-xs rounded-lg border-border bg-background">
                <SelectValue placeholder="Session" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {sessions.map(s => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedTerm} onValueChange={setSelectedTerm}>
              <SelectTrigger className="w-[130px] h-8 text-xs rounded-lg border-border bg-background font-medium">
                <SelectValue placeholder="Term" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {terms.map(t => (
                  <SelectItem key={t.id} value={t.id} className="text-xs">
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="sm"
              onClick={fetchQueueData}
              disabled={isLoadingQueue}
              className="h-8 px-2.5 rounded-lg text-muted-foreground hover:text-foreground"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingQueue ? 'animate-spin text-primary' : ''}`} />
            </Button>
          </div>

          <Link href="/dashboard/scores/enter">
            <Button variant="outline" size="sm" className="h-9 rounded-xl text-xs border-border">
              Score Entry <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Review */}
        <Card className="bg-card border-border shadow-sm rounded-2xl hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Pending Review
              </span>
              <div className="text-3xl font-extrabold text-amber-500 tracking-tight">
                {moderationStats.pendingCount}
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-500" /> Awaiting Exam Officer action
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Approved This Term */}
        <Card className="bg-card border-border shadow-sm rounded-2xl hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Approved This Term
              </span>
              <div className="text-3xl font-extrabold text-emerald-500 tracking-tight">
                {moderationStats.approvedCount}
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {moderationStats.approvalRate}% of submitted sheets
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Returned for Revision */}
        <Card className="bg-card border-border shadow-sm rounded-2xl hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Returned for Revision
              </span>
              <div className="text-3xl font-extrabold text-rose-500 tracking-tight">
                {moderationStats.returnedCount}
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <XCircle className="w-3 h-3 text-rose-500" /> Needs teacher resubmission
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600">
              <XCircle className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Total Sheets Tracked */}
        <Card className="bg-card border-border shadow-sm rounded-2xl hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Tracked Sheets
              </span>
              <div className="text-3xl font-extrabold text-foreground tracking-tight">
                {moderationStats.totalSheets}
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <BookOpen className="w-3 h-3 text-primary" /> {moderationStats.draftCount} drafts in preparation
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <BookOpen className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabbed Workflow */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <TabsList className="bg-muted/60 p-1 rounded-xl">
            <TabsTrigger value="queue" className="rounded-lg text-xs font-semibold flex items-center gap-1.5 px-3.5 py-1.5">
              <Clock className="w-3.5 h-3.5" />
              Moderation Queue
              {moderationStats.pendingCount > 0 && (
                <Badge className="ml-1 px-1.5 py-0 text-[10px] bg-amber-500 text-white rounded-full">
                  {moderationStats.pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="detail" className="rounded-lg text-xs font-semibold flex items-center gap-1.5 px-3.5 py-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Detailed Score Sheet
              {isDetailLoaded && (
                <Badge variant="outline" className="ml-1 px-1.5 py-0 text-[10px] border-border">
                  {activeClassName || 'Active'}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="audit" className="rounded-lg text-xs font-semibold flex items-center gap-1.5 px-3.5 py-1.5">
              <History className="w-3.5 h-3.5" />
              Score Change Audit Trail
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: MODERATION QUEUE (INBOX) */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="queue" className="space-y-4 m-0">
          {/* Filter Toolbar */}
          <Card className="bg-card border-border shadow-sm rounded-2xl">
            <CardContent className="p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
              {/* Status Segment Pills */}
              <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
                {(['ALL', 'Pending', 'Approved', 'Rejected', 'Draft'] as const).map(status => {
                  const isActive = queueStatusFilter === status;
                  let count = moderationStats.totalSheets;
                  if (status === 'Pending') count = moderationStats.pendingCount;
                  if (status === 'Approved') count = moderationStats.approvedCount;
                  if (status === 'Rejected') count = moderationStats.returnedCount;
                  if (status === 'Draft') count = moderationStats.draftCount;

                  return (
                    <Button
                      key={status}
                      variant={isActive ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setQueueStatusFilter(status)}
                      className={`rounded-xl text-xs h-8 px-3 font-medium transition-all ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      {status === 'ALL' ? 'All Sheets' : status === 'Pending' ? 'Pending Review' : status === 'Rejected' ? 'Returned' : status}
                      <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] ${
                        isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        {count}
                      </span>
                    </Button>
                  );
                })}
              </div>

              {/* Search & Class Dropdown */}
              <div className="flex items-center gap-2.5 w-full md:w-auto">
                <div className="relative w-full md:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search subject, class, teacher..."
                    value={queueSearch}
                    onChange={e => setQueueSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && fetchQueueData()}
                    className="pl-8 h-9 text-xs rounded-xl bg-background border-border"
                  />
                </div>

                <Select value={queueClassFilter} onValueChange={setQueueClassFilter}>
                  <SelectTrigger className="w-[150px] h-9 text-xs rounded-xl border-border bg-background">
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="ALL" className="text-xs">All Classes</SelectItem>
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Queue Data Table */}
          <Card className="bg-card border-border shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="p-4 md:p-6 border-b border-border bg-card flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base md:text-lg font-bold text-foreground flex items-center gap-2">
                  <span>Moderation Submission Queue</span>
                  <Badge variant="outline" className="text-xs border-border font-normal">
                    {queueSheets.length} sheet{queueSheets.length !== 1 ? 's' : ''} listed
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Select any score sheet to review marks, calibrate scoring, and publish report card grades.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs font-bold text-muted-foreground w-48">Class</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground">Subject</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground">Subject Teacher</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground w-40">Scored Progress</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground w-32">Status</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground w-28 text-center">Integrity</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground text-right pr-6 w-36">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingQueue ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-xs">Aggregating moderation queue across subjects...</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : queueSheets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                          <div className="flex flex-col items-center justify-center">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2 opacity-80" />
                            <p className="font-semibold text-foreground text-sm">All caught up!</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              No score sheets matching this filter require your attention right now.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      queueSheets.map((sheet) => {
                        const progressPct = sheet.totalStudents > 0
                          ? Math.round((sheet.scoredStudents / sheet.totalStudents) * 100)
                          : 0;

                        return (
                          <TableRow
                            key={sheet.key}
                            className="border-border hover:bg-muted/30 transition-colors group cursor-pointer"
                            onClick={() => handleSelectFromQueue(sheet)}
                          >
                            <TableCell className="font-semibold text-sm text-foreground">
                              {sheet.className}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-sm text-foreground">{sheet.subjectName}</div>
                              {sheet.subjectCode && (
                                <span className="text-[11px] font-mono text-muted-foreground">
                                  {sheet.subjectCode}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-xs text-foreground">
                                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                  <User className="w-3 h-3" />
                                </div>
                                <span className="truncate max-w-[160px]">{sheet.teacherName}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex justify-between text-[11px] font-medium">
                                  <span className="text-muted-foreground">
                                    {sheet.scoredStudents} / {sheet.totalStudents}
                                  </span>
                                  <span className={progressPct === 100 ? 'text-emerald-500 font-bold' : 'text-muted-foreground'}>
                                    {progressPct}%
                                  </span>
                                </div>
                                <Progress value={progressPct} className="h-1.5" />
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-[11px] font-medium flex items-center gap-1 w-fit ${
                                  sheet.status === 'Approved'
                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                    : sheet.status === 'Pending'
                                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                    : sheet.status === 'Rejected'
                                    ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                    : 'bg-muted text-muted-foreground border-border'
                                }`}
                              >
                                {sheet.status === 'Approved' && <CheckCircle2 className="w-3 h-3" />}
                                {sheet.status === 'Pending' && <Clock className="w-3 h-3" />}
                                {sheet.status === 'Rejected' && <XCircle className="w-3 h-3" />}
                                {sheet.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {sheet.isLocked ? (
                                <Badge variant="outline" className="text-[10px] bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 gap-1">
                                  <Lock className="w-2.5 h-2.5" /> Locked
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
                                  <Unlock className="w-2.5 h-2.5" /> Unlocked
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                variant={sheet.status === 'Pending' ? 'default' : 'outline'}
                                onClick={() => handleSelectFromQueue(sheet)}
                                className={`h-8 rounded-xl text-xs font-semibold ${
                                  sheet.status === 'Pending'
                                    ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                                    : 'border-border hover:bg-muted'
                                }`}
                              >
                                {sheet.status === 'Pending' ? 'Review Sheet' : 'View Sheet'}
                                <ArrowRight className="w-3 h-3 ml-1" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: DETAILED SCORE SHEET VIEW */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="detail" className="space-y-5 m-0">
          {/* Quick Select Bar for direct sheet lookup */}
          <Card className="bg-card border-border shadow-sm rounded-2xl">
            <CardContent className="p-4 flex flex-col md:flex-row gap-3 items-end justify-between">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full md:w-auto">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">Class</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="w-full sm:w-[200px] h-9 text-xs rounded-xl border-border bg-background">
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

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">Subject</Label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger className="w-full sm:w-[220px] h-9 text-xs rounded-xl border-border bg-background">
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
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('queue')}
                  className="h-9 rounded-xl text-xs border-border"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Queue
                </Button>

                <Button
                  onClick={() => loadScoreSheet()}
                  disabled={isLoadingDetail || !selectedClass || !selectedSubject || !selectedTerm}
                  className="h-9 rounded-xl text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4"
                >
                  {isLoadingDetail ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <BookOpen className="w-3.5 h-3.5 mr-1.5" />}
                  Inspect Sheet
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Active Sheet Banner */}
          {isDetailLoaded && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-4"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-xl md:text-2xl font-bold text-foreground">
                      {activeClassName} • {activeSubjectName}
                    </h2>
                    <Badge
                      variant="outline"
                      className={
                        sheetStatus === 'Approved'
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : sheetStatus === 'Pending'
                          ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                          : sheetStatus === 'Rejected'
                          ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                          : 'bg-muted text-muted-foreground border-border'
                      }
                    >
                      {sheetStatus === 'Approved' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                      {sheetStatus === 'Pending' && <Clock className="w-3 h-3 mr-1" />}
                      {sheetStatus === 'Rejected' && <XCircle className="w-3 h-3 mr-1" />}
                      {sheetStatus}
                    </Badge>

                    {isSheetLocked ? (
                      <Badge variant="outline" className="bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 text-xs">
                        <Lock className="w-3 h-3 mr-1" /> Locked Sheet
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                        <Unlock className="w-3 h-3 mr-1" /> Open for Moderation
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>Subject Teacher: <strong className="text-foreground">{assignedTeacher}</strong></span>
                    <span>•</span>
                    <span>Standard: WAEC 20/20/60 Model</span>
                  </p>
                </div>

                {/* Moderation Actions Bar */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCSV}
                    className="rounded-xl h-8 text-xs border-border"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
                  </Button>

                  {/* Lock / Unlock Toggle Button */}
                  {isReviewer && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsLockModalOpen(true)}
                      disabled={isSubmitting}
                      className="rounded-xl h-8 text-xs border-border"
                      title={isSheetLocked ? 'Unlock to allow edits' : 'Lock to prevent edits'}
                    >
                      {isSheetLocked ? (
                        <>
                          <Unlock className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> Unlock Sheet
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5 mr-1.5 text-slate-500" /> Lock Sheet
                        </>
                      )}
                    </Button>
                  )}

                  {/* Save Corrections */}
                  {dirty.size > 0 && isReviewer && (
                    <Button
                      size="sm"
                      onClick={() => setIsSaveModalOpen(true)}
                      disabled={isSubmitting}
                      className="rounded-xl h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                    >
                      <Save className="w-3.5 h-3.5 mr-1.5" /> Save {dirty.size} Adjustment(s)
                    </Button>
                  )}

                  {/* Return to Teacher */}
                  {isReviewer && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsRejectOpen(true)}
                      disabled={isSubmitting || sheetStatus === 'Rejected'}
                      className="rounded-xl h-8 text-xs border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1.5" /> Return to Teacher
                    </Button>
                  )}

                  {/* Approve Sheet */}
                  {isReviewer && (
                    <Button
                      size="sm"
                      onClick={handleApproveSheet}
                      disabled={isSubmitting || sheetStatus === 'Approved' || analytics.scored === 0}
                      className="rounded-xl h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Approve & Publish
                    </Button>
                  )}
                </div>
              </div>

              {/* Internal Moderator Note Alert (isolated from teacherRemark!) */}
              <AnimatePresence>
                {sheetModeratorNote && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs"
                  >
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span>Internal Moderator Revision Note</span>
                        <Badge variant="outline" className="text-[10px] bg-rose-500/20 border-none font-normal">
                          Internal Only • Never printed on Report Cards
                        </Badge>
                      </div>
                      <p className="mt-1 opacity-90">{sheetModeratorNote}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Locked Sheet Warning Notice */}
              {isSheetLocked && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-500/10 border border-slate-500/20 text-slate-700 dark:text-slate-300 text-xs">
                  <Lock className="w-4 h-4 shrink-0 text-slate-500" />
                  <span>
                    <strong>Sheet Locked:</strong> Scores in this sheet are protected against modifications. If adjustments are required, click <strong>Unlock Sheet</strong> above.
                  </span>
                </div>
              )}

              {/* Analytics Ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 border-t border-border">
                <div className="p-3 bg-muted/40 rounded-xl">
                  <div className="text-[11px] text-muted-foreground font-medium">Candidates</div>
                  <div className="text-xl font-bold mt-0.5 text-foreground">{analytics.total}</div>
                  <div className="text-[10px] text-muted-foreground">{analytics.scored} entered</div>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl">
                  <div className="text-[11px] text-muted-foreground font-medium">Class Average</div>
                  <div className="text-xl font-bold mt-0.5 text-foreground">{analytics.average}%</div>
                  <div className="text-[10px] text-muted-foreground">Mean subject mark</div>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl">
                  <div className="text-[11px] text-muted-foreground font-medium">Pass Rate (&ge;50%)</div>
                  <div className={`text-xl font-bold mt-0.5 ${analytics.passRate >= 70 ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {analytics.passRate}%
                  </div>
                  <div className="text-[10px] text-muted-foreground">Grade C6 or better</div>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl">
                  <div className="text-[11px] text-muted-foreground font-medium">Distinctions (A1-B3)</div>
                  <div className="text-xl font-bold mt-0.5 text-primary">{analytics.distinctionRate}%</div>
                  <div className="text-[10px] text-muted-foreground">Top-tier scoring</div>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl col-span-2 sm:col-span-1">
                  <div className="text-[11px] text-muted-foreground font-medium">Range (High / Low)</div>
                  <div className="text-xl font-bold mt-0.5 text-foreground">
                    {analytics.highest} <span className="text-xs font-normal text-muted-foreground">/ {analytics.lowest}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">Peak vs lowest</div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Scores Table */}
          {isDetailLoaded ? (
            <Card className="bg-card border-border shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="p-4 md:p-6 border-b border-border bg-card flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base md:text-lg font-bold text-foreground">Candidate Mark Grid</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Continuous Assessment (CA1: 20, CA2: 20) and Terminal Examination (60). Moderator alterations are tracked in the audit trail.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border bg-muted/40 hover:bg-muted/40">
                        <TableHead className="w-12 text-center text-xs font-bold text-muted-foreground">#</TableHead>
                        <TableHead className="w-32 text-xs font-bold text-muted-foreground">Candidate ID</TableHead>
                        <TableHead className="text-xs font-bold text-muted-foreground">Candidate Name</TableHead>
                        <TableHead className="w-28 text-center text-xs font-bold text-muted-foreground">CA1 (20)</TableHead>
                        <TableHead className="w-28 text-center text-xs font-bold text-muted-foreground">CA2 (20)</TableHead>
                        <TableHead className="w-28 text-center text-xs font-bold text-muted-foreground">Exam (60)</TableHead>
                        <TableHead className="w-20 text-center text-xs font-bold text-muted-foreground">Total</TableHead>
                        <TableHead className="w-20 text-center text-xs font-bold text-muted-foreground">Grade</TableHead>
                        <TableHead className="w-28 text-center text-xs font-bold text-muted-foreground pr-6">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scoresList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="h-48 text-center text-muted-foreground">
                            <div className="flex flex-col items-center justify-center">
                              <AlertCircle className="w-10 h-10 text-muted-foreground mb-3" />
                              <p className="font-semibold text-foreground">No students enrolled in this class.</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        scoresList.map((item, idx) => {
                          const isEdited = dirty.has(item.studentId);
                          const ca1Changed = item.originalCa1 != null && item.ca1 !== item.originalCa1;
                          const ca2Changed = item.originalCa2 != null && item.ca2 !== item.originalCa2;
                          const examChanged = item.originalExam != null && item.exam !== item.originalExam;

                          return (
                            <TableRow
                              key={item.studentId}
                              className={`border-border hover:bg-muted/30 transition-colors ${
                                isEdited ? 'bg-primary/5' : ''
                              }`}
                            >
                              <TableCell className="text-center font-mono text-xs text-muted-foreground">
                                {idx + 1}
                              </TableCell>
                              <TableCell className="font-mono text-xs font-medium text-muted-foreground">
                                {item.admissionNumber}
                              </TableCell>
                              <TableCell className="font-semibold text-sm text-foreground">
                                <div className="flex items-center gap-2">
                                  <span>{item.fullName}</span>
                                  {(ca1Changed || ca2Changed || examChanged) && (
                                    <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20 px-1 py-0" title="Altered by moderator">
                                      Modified
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              {/* CA1 */}
                              <TableCell className="p-2">
                                {isReviewer && !isSheetLocked ? (
                                  <div className="space-y-0.5">
                                    <Input
                                      type="number"
                                      min="0"
                                      max="20"
                                      step="0.5"
                                      value={item.ca1 != null ? item.ca1 : ''}
                                      onChange={e => handleModeratorEdit(item.studentId, 'ca1', e.target.value)}
                                      className="h-8 text-center font-semibold rounded-lg bg-background border-border text-foreground text-xs"
                                    />
                                    {ca1Changed && (
                                      <div className="text-[10px] text-center text-muted-foreground line-through">
                                        Orig: {item.originalCa1}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-center font-semibold text-xs text-foreground">
                                    {item.ca1 ?? '-'}
                                    {ca1Changed && (
                                      <div className="text-[10px] text-muted-foreground line-through">
                                        Orig: {item.originalCa1}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              {/* CA2 */}
                              <TableCell className="p-2">
                                {isReviewer && !isSheetLocked ? (
                                  <div className="space-y-0.5">
                                    <Input
                                      type="number"
                                      min="0"
                                      max="20"
                                      step="0.5"
                                      value={item.ca2 != null ? item.ca2 : ''}
                                      onChange={e => handleModeratorEdit(item.studentId, 'ca2', e.target.value)}
                                      className="h-8 text-center font-semibold rounded-lg bg-background border-border text-foreground text-xs"
                                    />
                                    {ca2Changed && (
                                      <div className="text-[10px] text-center text-muted-foreground line-through">
                                        Orig: {item.originalCa2}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-center font-semibold text-xs text-foreground">
                                    {item.ca2 ?? '-'}
                                    {ca2Changed && (
                                      <div className="text-[10px] text-muted-foreground line-through">
                                        Orig: {item.originalCa2}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              {/* Exam */}
                              <TableCell className="p-2">
                                {isReviewer && !isSheetLocked ? (
                                  <div className="space-y-0.5">
                                    <Input
                                      type="number"
                                      min="0"
                                      max="60"
                                      step="0.5"
                                      value={item.exam != null ? item.exam : ''}
                                      onChange={e => handleModeratorEdit(item.studentId, 'exam', e.target.value)}
                                      className="h-8 text-center font-semibold rounded-lg bg-background border-border text-foreground text-xs"
                                    />
                                    {examChanged && (
                                      <div className="text-[10px] text-center text-muted-foreground line-through">
                                        Orig: {item.originalExam}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-center font-semibold text-xs text-foreground">
                                    {item.exam ?? '-'}
                                    {examChanged && (
                                      <div className="text-[10px] text-muted-foreground line-through">
                                        Orig: {item.originalExam}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              {/* Total */}
                              <TableCell className="text-center font-bold text-sm text-foreground">
                                {item.total > 0 ? item.total : '-'}
                              </TableCell>
                              {/* Grade */}
                              <TableCell className="text-center">
                                {item.total > 0 ? (
                                  <Badge
                                    variant="outline"
                                    className={`text-xs font-bold ${
                                      ['A1', 'B2', 'B3'].includes(item.grade)
                                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                        : ['C4', 'C5', 'C6'].includes(item.grade)
                                        ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                                        : item.grade === 'F9'
                                        ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                        : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                    }`}
                                  >
                                    {item.grade}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-xs">-</span>
                                )}
                              </TableCell>
                              {/* Status */}
                              <TableCell className="text-center pr-6">
                                <Badge
                                  variant="outline"
                                  className={`text-[11px] font-medium ${
                                    item.status === 'Approved'
                                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                      : item.status === 'Pending'
                                      ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                      : item.status === 'Rejected'
                                      ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                      : 'bg-muted text-muted-foreground border-border'
                                  }`}
                                >
                                  {item.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border shadow-sm rounded-2xl p-12 text-center">
              <div className="max-w-md mx-auto space-y-3">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto opacity-50" />
                <h3 className="text-lg font-bold text-foreground">No Sheet Selected</h3>
                <p className="text-xs text-muted-foreground">
                  Pick a sheet from the <strong>Moderation Queue</strong> or select a Class and Subject in the bar above to begin reviewing student continuous assessment and exam scores.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('queue')}
                  className="rounded-xl text-xs border-border"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Jump to Moderation Queue
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: SCORE CHANGE AUDIT TRAIL */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="audit" className="space-y-4 m-0">
          <Card className="bg-card border-border shadow-sm rounded-2xl">
            <CardContent className="p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" />
                  Score Modification Audit Trail
                </h3>
                <p className="text-xs text-muted-foreground">
                  Immutable historical log of all mark alterations made by Exam Officers, HODs, and administrators.
                </p>
              </div>

              <div className="flex items-center gap-2.5 w-full md:w-auto">
                <div className="relative w-full md:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search candidate, modifier, reason..."
                    value={auditSearch}
                    onChange={e => setAuditSearch(e.target.value)}
                    className="pl-8 h-9 text-xs rounded-xl bg-background border-border"
                  />
                </div>

                <Select value={auditSubjectFilter} onValueChange={setAuditSubjectFilter}>
                  <SelectTrigger className="w-[150px] h-9 text-xs rounded-xl border-border bg-background">
                    <SelectValue placeholder="All Subjects" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="ALL" className="text-xs">All Subjects</SelectItem>
                    {subjects.map(s => (
                      <SelectItem key={s.id} value={s.id} className="text-xs">
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchAuditData}
                  disabled={isLoadingAudit}
                  className="h-9 px-2.5 rounded-xl text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAudit ? 'animate-spin text-primary' : ''}`} />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border bg-muted/40 hover:bg-muted/40">
                      <TableHead className="w-44 text-xs font-bold text-muted-foreground">Timestamp</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground">Candidate</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground">Class & Subject</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground">Field</TableHead>
                      <TableHead className="w-32 text-center text-xs font-bold text-muted-foreground">Old &rarr; New</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground">Modified By</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground pr-6">Audit Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingAudit ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-xs">Loading audit records...</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredAuditLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                          <div className="flex flex-col items-center justify-center">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2 opacity-80" />
                            <p className="font-semibold text-foreground text-sm">No Audit Logs Found</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              All scores remain in their original teacher-submitted state without adjustments.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAuditLogs.map((log: any) => {
                        const studentName = `${log.termGrade?.student?.lastName || ''}, ${log.termGrade?.student?.firstName || ''}`;
                        const admissionNo = log.termGrade?.student?.studentId || '-';
                        const className = log.termGrade?.student?.class?.name || '-';
                        const subjectName = log.termGrade?.subject?.name || '-';
                        const modifierName = `${log.modifier?.firstName || ''} ${log.modifier?.lastName || ''}`;

                        return (
                          <TableRow key={log.id} className="border-border hover:bg-muted/30 transition-colors">
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {new Date(log.createdAt).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <div className="font-semibold text-xs text-foreground">{studentName}</div>
                              <div className="font-mono text-[10px] text-muted-foreground">{admissionNo}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs font-medium text-foreground">{className}</div>
                              <div className="text-[11px] text-muted-foreground">{subjectName}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono text-[10px] uppercase">
                                {log.field}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center font-mono text-xs">
                              <span className="text-rose-500 line-through mr-1.5">{log.oldValue ?? 0}</span>
                              <span className="text-muted-foreground">&rarr;</span>
                              <span className="text-emerald-500 font-bold ml-1.5">{log.newValue ?? 0}</span>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs font-medium text-foreground">{modifierName}</div>
                              <div className="text-[10px] text-muted-foreground">{log.modifier?.role}</div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground pr-6">
                              {log.reason || 'Moderator adjustment'}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ------------------------------------------------------------- */}
      {/* MODALS & DIALOGS */}
      {/* ------------------------------------------------------------- */}

      {/* Return Sheet Dialog with Internal Moderator Note */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-500" /> Return Score Sheet for Revision
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provide actionable feedback to the subject teacher. This note is strictly internal and will never appear on parent report cards or broadsheets.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[11px] text-rose-700 dark:text-rose-400">
              <strong>Academic Integrity Notice:</strong> Returning the sheet unlocks it for the teacher to edit and resubmit. Internal comments are securely separated from student report remarks.
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Internal Moderator Feedback & Instructions <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                placeholder="e.g. CA scores exceed 20 marks for multiple candidates. Please verify test records, normalize scores to standard WAEC 20/20/60, and re-submit."
                rows={4}
                value={rejectFeedback}
                onChange={e => setRejectFeedback(e.target.value)}
                className="bg-background border-border text-foreground text-xs rounded-xl resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRejectOpen(false)}
              className="rounded-xl border-border text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleRejectSheet}
              disabled={isSubmitting || !rejectFeedback.trim()}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold"
            >
              {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <XCircle className="h-3.5 w-3.5 mr-1.5" />}
              Confirm & Return Sheet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Corrections Reason Dialog */}
      <Dialog open={isSaveModalOpen} onOpenChange={setIsSaveModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Save className="w-5 h-5 text-primary" /> Save Moderator Adjustments
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              You are about to save changes to {dirty.size} candidate mark(s). A record will be logged in the permanent audit trail.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Reason for Score Alteration
              </Label>
              <Input
                placeholder="e.g. Recalculation after script remarking, clerical entry error correction"
                value={adjustmentReason}
                onChange={e => setAdjustmentReason(e.target.value)}
                className="bg-background border-border text-foreground text-xs rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSaveModalOpen(false)}
              className="rounded-xl border-border text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveModeratorChanges}
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-semibold"
            >
              {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
              Confirm & Save Adjustments
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lock / Unlock Confirmation Dialog */}
      <Dialog open={isLockModalOpen} onOpenChange={setIsLockModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              {isSheetLocked ? (
                <>
                  <Unlock className="w-5 h-5 text-emerald-500" /> Unlock Score Sheet
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5 text-slate-500" /> Lock Score Sheet
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {isSheetLocked
                ? 'Unlocking allows moderators and teachers to edit scores. Do you wish to proceed?'
                : 'Locking prevents any further modifications to candidate marks until explicitly unlocked.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLockModalOpen(false)}
              className="rounded-xl border-border text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleToggleLock}
              disabled={isSubmitting}
              className={`rounded-xl text-xs font-semibold ${
                isSheetLocked
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-slate-700 hover:bg-slate-800 text-white'
              }`}
            >
              {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              {isSheetLocked ? 'Confirm Unlock' : 'Confirm Lock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
