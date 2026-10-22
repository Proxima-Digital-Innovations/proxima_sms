'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/context/language-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { getAcademicData } from '@/actions/academic-data';
import { getScoresByClassSubjectAndTerm, saveScores, submitScoresForReview } from '@/actions/results-actions';
import { getStudents } from '@/actions/student-actions';
import {
  Save,
  Send,
  Loader2,
  ArrowRight,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Lock,
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface ScoreEntry {
  studentId: string;
  ca1: string;
  ca2: string;
  exam: string;
  status?: string;
  rejectionNote?: string;
}

export default function BasicScoreEntryPage() {
  const { data: session } = useSession();
  const { language, isRtl } = useLanguage();
  const userRole = ((session?.user as any)?.role || '').toUpperCase();
  const isAdminOrOfficer = ['ADMIN', 'SUPER_ADMIN', 'EXAM_OFFICER', 'SLT', 'HOD'].includes(userRole);
  const { toast } = useToast();

  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState('');

  const [students, setStudents] = useState<any[]>([]);
  const [scores, setScores] = useState<Record<string, ScoreEntry>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());

  const [sheetStatus, setSheetStatus] = useState<'Draft' | 'Pending' | 'Approved' | 'Rejected'>('Draft');
  const [rejectionNote, setRejectionNote] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // References for fast arrow/enter key navigation
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    (async () => {
      const acadRes = await getAcademicData();
      setSubjects(acadRes.subjects || []);
      setClasses(acadRes.classes || []);
      setTerms(acadRes.terms || []);
      setSessions(acadRes.sessions || []);

      const activeTerm = acadRes.terms?.find((t: any) => t.isActive) || acadRes.terms?.[0];
      const activeSession = acadRes.sessions?.find((s: any) => s.isActive) || acadRes.sessions?.[0];
      if (activeTerm) setSelectedTerm(activeTerm.id);
      if (activeSession) setSelectedSession(activeSession.id);
    })();
  }, []);

  const loadStudents = async () => {
    if (!selectedClass || !selectedSubject || !selectedTerm) {
      toast({
        variant: 'destructive',
        title: 'Missing Selection',
        description: 'Please select class, subject, and term to load the mark sheet.',
      });
      return;
    }
    setIsLoading(true);
    try {
      const [stuRes, scoreRes] = await Promise.all([
        getStudents(selectedClass),
        getScoresByClassSubjectAndTerm(selectedClass, selectedSubject, selectedTerm),
      ]);

      if (stuRes.success && stuRes.data) {
        setStudents(stuRes.data);
        const scoreMap: Record<string, ScoreEntry> = {};
        const existingScores = scoreRes.scores || [];

        let computedStatus: 'Draft' | 'Pending' | 'Approved' | 'Rejected' = 'Draft';
        let foundRejectionNote: string | null = null;

        if (existingScores.length > 0) {
          const hasApproved = existingScores.some((sc: any) => sc.status === 'Approved');
          const hasPending = existingScores.some((sc: any) => sc.status === 'Pending');
          const hasRejected = existingScores.some((sc: any) => sc.status === 'Rejected');

          if (hasApproved && !hasPending && !hasRejected) computedStatus = 'Approved';
          else if (hasPending) computedStatus = 'Pending';
          else if (hasRejected) {
            computedStatus = 'Rejected';
            const rejectedRecord = existingScores.find((sc: any) => sc.status === 'Rejected' && sc.teacherRemark);
            foundRejectionNote = rejectedRecord?.teacherRemark || null;
          }
        }

        setSheetStatus(computedStatus);
        setRejectionNote(foundRejectionNote);

        for (const s of stuRes.data) {
          const existing = existingScores.find((sc: any) => sc.studentId === s.id);
          scoreMap[s.id] = {
            studentId: s.id,
            ca1: existing?.ca1 != null ? String(existing.ca1) : '',
            ca2: existing?.ca2 != null ? String(existing.ca2) : '',
            exam: existing?.exam != null ? String(existing.exam) : '',
            status: existing?.status || 'Draft',
            rejectionNote: existing?.teacherRemark || '',
          };
        }
        setScores(scoreMap);
        setDirty(new Set());
        setIsLoaded(true);
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const isLocked = useMemo(() => {
    if (isAdminOrOfficer) return false;
    return sheetStatus === 'Pending' || sheetStatus === 'Approved';
  }, [sheetStatus, isAdminOrOfficer]);

  const updateScore = (studentId: string, field: 'ca1' | 'ca2' | 'exam', value: string) => {
    if (isLocked) return;

    if (value !== '') {
      const num = parseFloat(value);
      if (isNaN(num)) return;
      if (field === 'ca1' && (num < 0 || num > 20)) return;
      if (field === 'ca2' && (num < 0 || num > 20)) return;
      if (field === 'exam' && (num < 0 || num > 60)) return;
    }

    setScores(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
    }));
    setDirty(prev => new Set(prev).add(studentId));
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    studentIndex: number,
    field: 'ca1' | 'ca2' | 'exam'
  ) => {
    const fields: ('ca1' | 'ca2' | 'exam')[] = ['ca1', 'ca2', 'exam'];
    const currentFieldIndex = fields.indexOf(field);

    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      const nextStudent = students[studentIndex + 1];
      if (nextStudent) {
        inputRefs.current[`${nextStudent.id}-${field}`]?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevStudent = students[studentIndex - 1];
      if (prevStudent) {
        inputRefs.current[`${prevStudent.id}-${field}`]?.focus();
      }
    } else if (e.key === 'ArrowRight' && (e.currentTarget.selectionStart === e.currentTarget.value.length || e.currentTarget.value === '')) {
      if (currentFieldIndex < fields.length - 1) {
        e.preventDefault();
        const nextField = fields[currentFieldIndex + 1];
        inputRefs.current[`${students[studentIndex].id}-${nextField}`]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && e.currentTarget.selectionStart === 0) {
      if (currentFieldIndex > 0) {
        e.preventDefault();
        const prevField = fields[currentFieldIndex - 1];
        inputRefs.current[`${students[studentIndex].id}-${prevField}`]?.focus();
      }
    }
  };

  const handleSave = async (statusOverride?: string) => {
    if (dirty.size === 0 && !statusOverride) return;
    setIsSaving(true);
    try {
      const studentIdsToSave = dirty.size > 0 ? Array.from(dirty) : students.map(s => s.id);
      const toSave = studentIdsToSave.map(studentId => ({
        studentId,
        subjectId: selectedSubject,
        termId: selectedTerm,
        ca1: scores[studentId]?.ca1 === '' || scores[studentId]?.ca1 == null ? undefined : parseFloat(scores[studentId].ca1),
        ca2: scores[studentId]?.ca2 === '' || scores[studentId]?.ca2 == null ? undefined : parseFloat(scores[studentId].ca2),
        exam: scores[studentId]?.exam === '' || scores[studentId]?.exam == null ? undefined : parseFloat(scores[studentId].exam),
        status: statusOverride || scores[studentId]?.status || 'Draft',
      }));

      const res = await saveScores(toSave);
      if (res.success) {
        toast({
          title: 'Draft Saved',
          description: `Successfully saved marks for ${toSave.length} candidate(s).`,
        });
        setDirty(new Set());
        if (statusOverride) {
          setSheetStatus(statusOverride as any);
        }
      } else {
        throw new Error(res.error || 'Failed to save scores');
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!selectedClass || !selectedSubject || !selectedTerm) return;
    setIsSubmitting(true);
    try {
      // 1. Save any pending dirty scores first
      if (dirty.size > 0) {
        await handleSave('Pending');
      }
      // 2. Submit the score sheet
      const res = await submitScoresForReview(selectedClass, selectedSubject, selectedTerm);
      if (res.success) {
        setSheetStatus('Pending');
        toast({
          title: 'Submitted for Moderation',
          description: 'The score sheet has been submitted to the Exam Officer / HOD for review.',
        });
        setDirty(new Set());
      } else {
        throw new Error(res.error || 'Submission failed');
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Submission Failed', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateTotal = (studentId: string) => {
    const s = scores[studentId];
    if (!s) return 0;
    const ca1 = parseFloat(s.ca1) || 0;
    const ca2 = parseFloat(s.ca2) || 0;
    const exam = parseFloat(s.exam) || 0;
    return Math.round((ca1 + ca2 + exam) * 10) / 10;
  };

  const getGrade = (total: number) => {
    if (total >= 75) return { grade: 'A1', label: 'Excellent', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
    if (total >= 70) return { grade: 'B2', label: 'Very Good', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    if (total >= 65) return { grade: 'B3', label: 'Good', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' };
    if (total >= 60) return { grade: 'C4', label: 'Credit', color: 'text-sky-500 bg-sky-500/10 border-sky-500/20' };
    if (total >= 55) return { grade: 'C5', label: 'Credit', color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20' };
    if (total >= 50) return { grade: 'C6', label: 'Credit', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
    if (total >= 45) return { grade: 'D7', label: 'Pass', color: 'text-orange-500 bg-orange-500/10 border-orange-500/20' };
    if (total >= 40) return { grade: 'E8', label: 'Pass', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' };
    return { grade: 'F9', label: 'Fail', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' };
  };

  // Performance metrics computed from active scores
  const metrics = useMemo(() => {
    if (!students || students.length === 0) {
      return { totalStudents: 0, scoredCount: 0, average: 0, highest: 0, lowest: 0, passRate: 0 };
    }

    let totalPoints = 0;
    let scoredCount = 0;
    let highest = 0;
    let lowest = 100;
    let passedCount = 0;

    for (const student of students) {
      const s = scores[student.id];
      const hasAnyScore = s && (s.ca1 !== '' || s.ca2 !== '' || s.exam !== '');
      if (hasAnyScore) {
        scoredCount++;
        const total = (parseFloat(s.ca1) || 0) + (parseFloat(s.ca2) || 0) + (parseFloat(s.exam) || 0);
        totalPoints += total;
        if (total > highest) highest = total;
        if (total < lowest) lowest = total;
        if (total >= 50) passedCount++;
      }
    }

    return {
      totalStudents: students.length,
      scoredCount,
      average: scoredCount > 0 ? Math.round((totalPoints / scoredCount) * 10) / 10 : 0,
      highest: scoredCount > 0 ? highest : 0,
      lowest: scoredCount > 0 ? lowest : 0,
      passRate: scoredCount > 0 ? Math.round((passedCount / scoredCount) * 100) : 0,
    };
  }, [students, scores]);

  return (
    <div className="w-full space-y-5">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              {language === 'ar' ? 'رصد درجات الاختبارات والامتحانات' : 'Score Entry'}
            </h1>
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
              {sheetStatus === 'Approved' && <CheckCircle2 className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0 shrink-0" />}
              {sheetStatus === 'Pending' && <Clock className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0 shrink-0" />}
              {sheetStatus === 'Rejected' && <AlertCircle className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0 shrink-0" />}
              <span>
                {language === 'ar' 
                  ? (sheetStatus === 'Approved' ? 'معتمد رسمياً' : sheetStatus === 'Pending' ? 'بانتظار المراجعة' : sheetStatus === 'Rejected' ? 'مرفوض ومُعاد' : 'مسودة')
                  : `${sheetStatus} Sheet`}
              </span>
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {language === 'ar'
              ? 'مصفوفة التقييم المستمر: أعمال السنة الأولى (20) • أعمال السنة الثانية (20) • الامتحان النهائي (60) • المجموع (100)'
              : 'Continuous Assessment Matrix • CA1 (20) • CA2 (20) • Exam (60) • Total (100)'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link href="/dashboard/scores/gradebook">
            <Button variant="outline" size="sm" className="rounded-xl border-border flex items-center gap-2">
              <span>{language === 'ar' ? 'سجل الدرجات المتقدم' : 'Advanced Gradebook'}</span>
              <ArrowRight className="h-4 w-4 rtl:rotate-180 shrink-0" />
            </Button>
          </Link>

          {isLoaded && !isLocked && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSave()}
                disabled={isSaving || dirty.size === 0}
                className="rounded-xl border-border flex items-center gap-2"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <Save className="h-4 w-4 shrink-0" />}
                <span>{language === 'ar' ? 'حفظ كمسودة' : 'Save Draft'} {dirty.size > 0 ? `(${dirty.size})` : ''}</span>
              </Button>

              <Button
                size="sm"
                onClick={handleSubmitForReview}
                disabled={isSubmitting || metrics.scoredCount === 0}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl flex items-center gap-2"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <Send className="h-4 w-4 shrink-0" />}
                <span>{language === 'ar' ? 'إرسال للاعتماد والتدقيق' : 'Submit for Moderation'}</span>
              </Button>
            </>
          )}

          {isLoaded && isLocked && isAdminOrOfficer && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSave('Draft')}
              className="rounded-xl border-amber-500/30 text-amber-600 flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4 shrink-0" />
              <span>{language === 'ar' ? 'إعادة فتح المسودة (إدارة)' : 'Re-open as Draft (Admin)'}</span>
            </Button>
          )}
        </div>
      </motion.div>

      {/* Sheet Status Banner */}
      <AnimatePresence>
        {isLoaded && sheetStatus === 'Pending' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm"
          >
            <Clock className="h-5 w-5 shrink-0" />
            <div className="flex-1">
              <span className="font-semibold">Under Moderation:</span> This score sheet is submitted and locked for review by the Exam Officer / HOD.
            </div>
            {isLocked && <Lock className="h-4 w-4 text-amber-500" />}
          </motion.div>
        )}

        {isLoaded && sheetStatus === 'Approved' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <div className="flex-1">
              <span className="font-semibold">Approved & Published:</span> These marks have been officially moderated and published to student broadsheets and report cards.
            </div>
            {isLocked && <Lock className="h-4 w-4 text-emerald-500" />}
          </motion.div>
        )}

        {isLoaded && sheetStatus === 'Rejected' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-start gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm"
          >
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold">Returned for Revision</div>
              <p className="mt-1 text-xs opacity-90">
                {rejectionNote || 'The Exam Officer requested revisions on this score sheet. Please update the affected student marks and re-submit.'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Selection Card */}
      <Card className="bg-card border-border shadow-sm rounded-2xl">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                {language === 'ar' ? 'العام الدراسي' : 'Academic Session'}
              </Label>
              <Select value={selectedSession} onValueChange={setSelectedSession}>
                <SelectTrigger className="rounded-xl border-border bg-background h-10">
                  <SelectValue placeholder={language === 'ar' ? 'اختر العام' : 'Session'} />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {sessions.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                {language === 'ar' ? 'الفصل الدراسي' : 'Academic Term'}
              </Label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger className="rounded-xl border-border bg-background h-10">
                  <SelectValue placeholder={language === 'ar' ? 'اختر الفصل' : 'Term'} />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {terms.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                {language === 'ar' ? 'الصف / الفصل' : 'Class'}
              </Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="rounded-xl border-border bg-background h-10">
                  <SelectValue placeholder={language === 'ar' ? 'اختر الصف' : 'Select Class'} />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                {language === 'ar' ? 'المادة الدراسية' : 'Subject'}
              </Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="rounded-xl border-border bg-background h-10">
                  <SelectValue placeholder={language === 'ar' ? 'اختر المادة' : 'Select Subject'} />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {subjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={loadStudents}
              disabled={isLoading || !selectedClass || !selectedSubject || !selectedTerm}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-10 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <BookOpen className="h-4 w-4 shrink-0" />}
              <span>{language === 'ar' ? 'عرض كشف الدرجات' : 'Load Mark Sheet'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Real-Time Metrics Deck */}
      {isLoaded && students.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-card p-4 rounded-xl border border-border">
            <div className="text-xs text-muted-foreground font-medium">Candidates</div>
            <div className="text-2xl font-bold mt-1 text-foreground">{metrics.totalStudents}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Enrolled in class</div>
          </div>
          <div className="bg-card p-4 rounded-xl border border-border">
            <div className="text-xs text-muted-foreground font-medium">Scored</div>
            <div className="text-2xl font-bold mt-1 text-primary">
              {metrics.scoredCount} / {metrics.totalStudents}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {metrics.totalStudents > 0 ? Math.round((metrics.scoredCount / metrics.totalStudents) * 100) : 0}% completion
            </div>
          </div>
          <div className="bg-card p-4 rounded-xl border border-border">
            <div className="text-xs text-muted-foreground font-medium">Class Average</div>
            <div className="text-2xl font-bold mt-1 text-foreground">{metrics.average}%</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Mean total mark</div>
          </div>
          <div className="bg-card p-4 rounded-xl border border-border">
            <div className="text-xs text-muted-foreground font-medium">Pass Rate</div>
            <div className={`text-2xl font-bold mt-1 ${metrics.passRate >= 70 ? 'text-emerald-500' : metrics.passRate >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
              {metrics.passRate}%
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Score &ge; 50/100</div>
          </div>
          <div className="bg-card p-4 rounded-xl border border-border col-span-2 md:col-span-1">
            <div className="text-xs text-muted-foreground font-medium">High / Low</div>
            <div className="text-2xl font-bold mt-1 text-foreground">
              {metrics.highest} <span className="text-sm font-normal text-muted-foreground">/ {metrics.lowest}</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Range across sheet</div>
          </div>
        </div>
      )}

      {/* Score Entry Table */}
      <AnimatePresence>
        {isLoaded && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-card border-border shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="p-4 md:p-6 border-b border-border bg-card flex flex-col md:flex-row justify-between md:items-center gap-2">
                <div>
                  <CardTitle className="text-lg font-bold text-foreground">Candidate Mark Sheet</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Use arrow keys or Enter/Tab to navigate swiftly between assessment cells.
                  </CardDescription>
                </div>
                {dirty.size > 0 && (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs w-fit">
                    <Sparkles className="w-3 h-3 mr-1" /> {dirty.size} unsaved mark(s)
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className="min-w-[550px] md:min-w-full">
                    <TableHeader>
                      <TableRow className="border-border bg-muted/40 hover:bg-muted/40">
                        <TableHead className="w-10 sm:w-12 text-center text-xs font-bold text-muted-foreground">#</TableHead>
                        <TableHead className="hidden sm:table-cell w-32 text-xs font-bold text-muted-foreground">
                          {language === 'ar' ? 'رقم القيد' : 'Candidate ID'}
                        </TableHead>
                        <TableHead className="text-xs font-bold text-muted-foreground min-w-[130px]">
                          {language === 'ar' ? 'اسم الطالب' : 'Full Name'}
                        </TableHead>
                        <TableHead className="w-20 sm:w-28 text-center text-xs font-bold text-muted-foreground">
                          {language === 'ar' ? 'أعمال 1' : 'CA 1'}{' '}
                          <span className="text-[10px] font-normal block text-muted-foreground">
                            {language === 'ar' ? 'من 20' : 'Max 20'}
                          </span>
                        </TableHead>
                        <TableHead className="w-20 sm:w-28 text-center text-xs font-bold text-muted-foreground">
                          {language === 'ar' ? 'أعمال 2' : 'CA 2'}{' '}
                          <span className="text-[10px] font-normal block text-muted-foreground">
                            {language === 'ar' ? 'من 20' : 'Max 20'}
                          </span>
                        </TableHead>
                        <TableHead className="w-20 sm:w-28 text-center text-xs font-bold text-muted-foreground">
                          {language === 'ar' ? 'الامتحان' : 'Exam'}{' '}
                          <span className="text-[10px] font-normal block text-muted-foreground">
                            {language === 'ar' ? 'من 60' : 'Max 60'}
                          </span>
                        </TableHead>
                        <TableHead className="w-16 sm:w-24 text-center text-xs font-bold text-muted-foreground">
                          {language === 'ar' ? 'المجموع' : 'Total'}{' '}
                          <span className="text-[10px] font-normal block text-muted-foreground">
                            {language === 'ar' ? 'من 100' : '100'}
                          </span>
                        </TableHead>
                        <TableHead className="w-16 sm:w-28 text-center text-xs font-bold text-muted-foreground px-4 sm:px-6">
                          {language === 'ar' ? 'التقدير' : 'Grade'}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="h-48 text-center text-muted-foreground">
                            <div className="flex flex-col items-center justify-center">
                              <AlertCircle className="w-10 h-10 text-muted-foreground mb-3" />
                              <p className="font-semibold text-foreground">No students enrolled in this class.</p>
                              <p className="text-xs text-muted-foreground mt-1">Please confirm candidate enrollments in student directory.</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        students.map((student, idx) => {
                          const total = calculateTotal(student.id);
                          const s = scores[student.id];
                          const isEdited = dirty.has(student.id);
                          const gradeInfo = getGrade(total);

                          return (
                            <TableRow
                              key={student.id}
                              className={`border-border hover:bg-muted/30 transition-colors ${
                                isEdited ? 'bg-primary/5' : ''
                              }`}
                            >
                              <TableCell className="text-center font-mono text-xs text-muted-foreground p-2 sm:p-4">
                                {idx + 1}
                              </TableCell>
                              <TableCell className="hidden sm:table-cell font-mono text-xs font-medium text-muted-foreground ltr-only">
                                {student.studentId || '-'}
                              </TableCell>
                              <TableCell className="p-2 sm:p-4">
                                <div className="font-semibold text-xs sm:text-sm text-foreground">
                                  {student.lastName}, {student.firstName}
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="sm:hidden font-mono text-[10px] text-muted-foreground uppercase ltr-only">{student.studentId || '-'}</span>
                                  {student.middleName && (
                                    <span className="text-[11px] text-muted-foreground">{student.middleName}</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="p-1 sm:p-2">
                                <Input
                                  ref={el => { inputRefs.current[`${student.id}-ca1`] = el; }}
                                  type="number"
                                  min="0"
                                  max="20"
                                  step="0.5"
                                  disabled={isLocked}
                                  placeholder="-"
                                  value={s?.ca1 || ''}
                                  onChange={e => updateScore(student.id, 'ca1', e.target.value)}
                                  onKeyDown={e => handleKeyDown(e, idx, 'ca1')}
                                  className={`h-8 sm:h-9 text-xs sm:text-sm text-center font-semibold rounded-lg bg-background border-border text-foreground focus-visible:ring-primary ${
                                    isEdited ? 'border-primary/40 ring-1 ring-primary/20' : ''
                                  } ${isLocked ? 'opacity-70 cursor-not-allowed bg-muted/40' : ''}`}
                                />
                              </TableCell>
                              <TableCell className="p-1 sm:p-2">
                                <Input
                                  ref={el => { inputRefs.current[`${student.id}-ca2`] = el; }}
                                  type="number"
                                  min="0"
                                  max="20"
                                  step="0.5"
                                  disabled={isLocked}
                                  placeholder="-"
                                  value={s?.ca2 || ''}
                                  onChange={e => updateScore(student.id, 'ca2', e.target.value)}
                                  onKeyDown={e => handleKeyDown(e, idx, 'ca2')}
                                  className={`h-8 sm:h-9 text-xs sm:text-sm text-center font-semibold rounded-lg bg-background border-border text-foreground focus-visible:ring-primary ${
                                    isEdited ? 'border-primary/40 ring-1 ring-primary/20' : ''
                                  } ${isLocked ? 'opacity-70 cursor-not-allowed bg-muted/40' : ''}`}
                                />
                              </TableCell>
                              <TableCell className="p-1 sm:p-2">
                                <Input
                                  ref={el => { inputRefs.current[`${student.id}-exam`] = el; }}
                                  type="number"
                                  min="0"
                                  max="60"
                                  step="0.5"
                                  disabled={isLocked}
                                  placeholder="-"
                                  value={s?.exam || ''}
                                  onChange={e => updateScore(student.id, 'exam', e.target.value)}
                                  onKeyDown={e => handleKeyDown(e, idx, 'exam')}
                                  className={`h-8 sm:h-9 text-xs sm:text-sm text-center font-semibold rounded-lg bg-background border-border text-foreground focus-visible:ring-primary ${
                                    isEdited ? 'border-primary/40 ring-1 ring-primary/20' : ''
                                  } ${isLocked ? 'opacity-70 cursor-not-allowed bg-muted/40' : ''}`}
                                />
                              </TableCell>
                              <TableCell className="text-center font-bold text-xs sm:text-sm text-foreground p-2">
                                {total > 0 ? total : '-'}
                              </TableCell>
                              <TableCell className="text-center pr-3 sm:pr-6 p-2">
                                {total > 0 ? (
                                  <span
                                    className={`inline-flex items-center justify-center px-1.5 sm:px-2.5 py-0.5 rounded-md text-[11px] sm:text-xs font-bold uppercase tracking-wider border ${gradeInfo.color}`}
                                    title={gradeInfo.label}
                                  >
                                    {gradeInfo.grade}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-xs">-</span>
                                )}
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
