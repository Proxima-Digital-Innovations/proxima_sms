'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/context/role-context';
import { getAcademicData } from '@/actions/academic-data';
import {
  generateTermResults,
  getResultPreflightCheck,
  unpublishTermResults,
  publishTermResults,
  GenerateResultsOptions,
} from '@/actions/results-actions';
import {
  Loader2,
  PlayCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  ArrowRight,
  Calculator,
  BellRing,
  BookOpen,
  Eye,
  EyeOff,
  RefreshCw,
  Clock,
  Lock,
  Unlock,
  Sliders,
  FileSpreadsheet,
  Users,
  ShieldCheck,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';

export default function GenerateResultsPage() {
  const { toast } = useToast();
  const { role } = useRole();
  const normalizedRole = (role || '').toUpperCase();
  const isAuthorized = ['SUPER_ADMIN', 'ADMIN', 'SLT', 'EXAM_OFFICER'].includes(normalizedRole);

  // Academic Selectors
  const [classes, setClasses] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState('');

  // Engine Parameters
  const [passMark, setPassMark] = useState<number>(50);
  const [customPassMark, setCustomPassMark] = useState<string>('');
  const [publishMode, setPublishMode] = useState<'publish' | 'draft'>('publish');
  const [rankingMethod, setRankingMethod] = useState<'standard' | 'dense'>('standard');
  const [notifyParents, setNotifyParents] = useState(false);
  const [regenerateRankingOnly, setRegenerateRankingOnly] = useState(false);

  // Pre-Flight Check State
  const [preflightData, setPreflightData] = useState<any>(null);
  const [isLoadingPreflight, setIsLoadingPreflight] = useState(false);

  // Generation & Status State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(1);
  const [resultData, setResultData] = useState<any>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Unpublish / Publish Rollback State
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isUnpublishModalOpen, setIsUnpublishModalOpen] = useState(false);

  // Initial Load: Academic Data
  useEffect(() => {
    (async () => {
      try {
        const acadRes = await getAcademicData();
        setClasses(acadRes.classes || []);
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

  // Pre-Flight Check Hook
  const runPreflightCheck = useCallback(async () => {
    if (!selectedClass || !selectedTerm) {
      setPreflightData(null);
      return;
    }
    setIsLoadingPreflight(true);
    try {
      const res = await getResultPreflightCheck(selectedClass, selectedTerm, selectedSession || undefined);
      if (res.success) {
        setPreflightData(res);
      } else {
        setPreflightData(null);
      }
    } catch (err: any) {
      console.error('Pre-flight error:', err);
    } finally {
      setIsLoadingPreflight(false);
    }
  }, [selectedClass, selectedTerm, selectedSession]);

  useEffect(() => {
    runPreflightCheck();
  }, [selectedClass, selectedTerm, selectedSession, runPreflightCheck]);

  if (role && !isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Only Exam Officers, SLT, and Administrators have security clearance to generate termly academic rankings and report cards.
        </p>
      </div>
    );
  }

  // Handle Pass Mark Select
  const handlePassMarkPreset = (val: number) => {
    setPassMark(val);
    setCustomPassMark('');
  };

  const handleCustomPassMarkChange = (val: string) => {
    setCustomPassMark(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0 && num <= 100) {
      setPassMark(num);
    }
  };

  // Execution Trigger
  const handleGenerate = async () => {
    if (!selectedClass || !selectedTerm) {
      toast({
        variant: 'destructive',
        title: 'Missing Selection',
        description: 'Please select class and term.',
      });
      return;
    }
    setIsGenerating(true);
    setGenerationStep(1);
    setResultData(null);
    setIsConfirmOpen(false);

    // Simulated multi-step progress feedback for better user experience
    const stepTimer = setInterval(() => {
      setGenerationStep(prev => (prev < 4 ? prev + 1 : prev));
    }, 700);

    try {
      const options: GenerateResultsOptions = {
        sessionId: selectedSession || undefined,
        notifyParents,
        passMark,
        publishMode,
        rankingMethod,
        regenerateRankingOnly,
      };

      const res = await generateTermResults(selectedClass, selectedTerm, options);
      clearInterval(stepTimer);
      setGenerationStep(5);

      if (res.success) {
        setResultData(res);
        toast({
          title: publishMode === 'publish' ? 'Results Published' : 'Draft Results Generated',
          description: res.message || 'Academic standings, positions, and report cards are updated.',
        });
        runPreflightCheck();
      } else {
        throw new Error(res.error || res.message || 'Generation failed');
      }
    } catch (err: any) {
      clearInterval(stepTimer);
      toast({ variant: 'destructive', title: 'Generation Error', description: err.message });
      setResultData({ success: false, message: err.message });
    } finally {
      setIsGenerating(false);
    }
  };

  // Unpublish Action
  const handleUnpublish = async () => {
    if (!selectedClass || !selectedTerm) return;
    setIsUnpublishing(true);
    try {
      const res = await unpublishTermResults(selectedClass, selectedTerm, selectedSession || undefined);
      if (res.success) {
        toast({
          title: 'Results Unpublished',
          description: 'Report cards are retracted into draft mode and hidden from parents.',
        });
        setIsUnpublishModalOpen(false);
        runPreflightCheck();
        if (resultData?.summary) {
          setResultData({
            ...resultData,
            summary: { ...resultData.summary, isPublished: false },
          });
        }
      } else {
        throw new Error(res.error || 'Failed to unpublish');
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsUnpublishing(false);
    }
  };

  // Publish Action
  const handlePublish = async () => {
    if (!selectedClass || !selectedTerm) return;
    setIsUnpublishing(true);
    try {
      const res = await publishTermResults(selectedClass, selectedTerm, selectedSession || undefined);
      if (res.success) {
        toast({
          title: 'Results Published',
          description: 'Report cards and broadsheet positions are officially live.',
        });
        setIsPublishModalOpen(false);
        runPreflightCheck();
        if (resultData?.summary) {
          setResultData({
            ...resultData,
            summary: { ...resultData.summary, isPublished: true },
          });
        }
      } else {
        throw new Error(res.error || 'Failed to publish');
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsUnpublishing(false);
    }
  };

  const selectedClassName = classes.find(c => c.id === selectedClass)?.name || 'Class';
  const selectedTermName = terms.find(t => t.id === selectedTerm)?.name || 'Term';
  const selectedSessionName = sessions.find(s => s.id === selectedSession)?.name || 'Current Session';

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
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                  Generate Term Results
                </h1>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                  Academic Processing Engine
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Automated continuous assessment aggregation, WAEC terminal grading, class rankings & report card publishing
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <Link href="/dashboard/scores">
            <Button variant="outline" size="sm" className="rounded-xl border-border text-xs h-9">
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Moderation Queue
            </Button>
          </Link>
          <Link href="/dashboard/results/view">
            <Button variant="outline" size="sm" className="rounded-xl border-border text-xs h-9">
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> View Broadsheet & Cards <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Main Execution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Parameters & Pre-Flight Checklist */}
        <div className="lg:col-span-7 space-y-6">
          {/* Cohort & Parameter Card */}
          <Card className="bg-card border-border shadow-sm rounded-2xl">
            <CardHeader className="p-6 border-b border-border">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                Target Cohort & Calculation Parameters
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Select target class and configure terminal grading, pass threshold, and publishing policies.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              {/* Cohort Selectors: Session, Term, Class */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Session</Label>
                  <Select value={selectedSession} onValueChange={setSelectedSession}>
                    <SelectTrigger className="rounded-xl border-border bg-background h-10 text-xs">
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
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Term</Label>
                  <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                    <SelectTrigger className="rounded-xl border-border bg-background h-10 text-xs">
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
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Class Cohort</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="rounded-xl border-border bg-background h-10 text-xs">
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

              {/* Pass Mark Threshold */}
              <div className="space-y-2 pt-1 border-t border-border">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Pass Mark Benchmark
                  </Label>
                  <span className="text-xs font-bold text-primary">{passMark}%</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {[40, 45, 50, 60].map(val => (
                    <Button
                      key={val}
                      type="button"
                      variant={passMark === val && !customPassMark ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePassMarkPreset(val)}
                      className={`rounded-xl text-xs h-8 px-3 font-semibold ${
                        passMark === val && !customPassMark ? 'bg-primary text-primary-foreground' : 'border-border'
                      }`}
                    >
                      {val}% {val === 40 ? '(WAEC E8)' : val === 45 ? '(WAEC D7)' : val === 50 ? '(Credit C6)' : ''}
                    </Button>
                  ))}
                  <div className="relative w-24">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="Custom"
                      value={customPassMark}
                      onChange={e => handleCustomPassMarkChange(e.target.value)}
                      className="h-8 text-xs rounded-xl border-border bg-background text-center font-semibold"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Scores meeting or exceeding {passMark}% will be recognized as passing grades in class statistics.
                </p>
              </div>

              {/* Advanced Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border">
                {/* Publishing Mode */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Publication Status</Label>
                  <Select value={publishMode} onValueChange={(val: any) => setPublishMode(val)}>
                    <SelectTrigger className="rounded-xl border-border bg-background h-9 text-xs">
                      <SelectValue placeholder="Mode" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="publish" className="text-xs">
                        Publish Immediately (Visible to Parents)
                      </SelectItem>
                      <SelectItem value="draft" className="text-xs">
                        Save as Draft (Internal Review Only)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Ranking Tie-Breaker Method */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Ranking Tie-Breaker</Label>
                  <Select value={rankingMethod} onValueChange={(val: any) => setRankingMethod(val)}>
                    <SelectTrigger className="rounded-xl border-border bg-background h-9 text-xs">
                      <SelectValue placeholder="Ranking Method" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="standard" className="text-xs">
                        Standard Competition (1, 2, 2, 4)
                      </SelectItem>
                      <SelectItem value="dense" className="text-xs">
                        Dense Ranking (1, 2, 2, 3)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Toggles: Notify Parents & Regenerate Ranking Only */}
              <div className="space-y-2 pt-1 border-t border-border">
                <div className="flex items-start gap-3 p-3 rounded-xl border border-border bg-muted/20">
                  <Checkbox
                    id="notify-parents"
                    checked={notifyParents}
                    onCheckedChange={v => setNotifyParents(Boolean(v))}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <Label htmlFor="notify-parents" className="text-xs font-semibold text-foreground cursor-pointer">
                      Email Announcement to Guardians
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Automatically dispatch email notifications to verified parents once report cards are published.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl border border-border bg-muted/20">
                  <Checkbox
                    id="ranking-only"
                    checked={regenerateRankingOnly}
                    onCheckedChange={v => setRegenerateRankingOnly(Boolean(v))}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <Label htmlFor="ranking-only" className="text-xs font-semibold text-foreground cursor-pointer">
                      Regenerate Ranking & Positions Only
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Recalculate overall averages and rank standings without recalculating individual student subject scores.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pre-Flight Audit Checklist Card */}
          <Card className="bg-card border-border shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="p-5 border-b border-border flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" /> Pre-Flight Submission Checklist
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Audit subject mark submissions to ensure all scores are approved before terminal processing.
                </CardDescription>
              </div>

              {preflightData && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={runPreflightCheck}
                  disabled={isLoadingPreflight}
                  className="h-8 px-2 text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPreflight ? 'animate-spin text-primary' : ''}`} />
                </Button>
              )}
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              {!selectedClass || !selectedTerm ? (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  Select a class cohort and term above to load the pre-flight readiness checklist.
                </div>
              ) : isLoadingPreflight ? (
                <div className="text-center py-8 text-muted-foreground space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  <p className="text-xs">Auditing subject score sheets...</p>
                </div>
              ) : preflightData?.stats ? (
                <>
                  {/* Readiness Progress Indicator */}
                  <div className="space-y-1.5 bg-muted/30 p-3.5 rounded-xl border border-border">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-foreground">
                        {preflightData.stats.approvedCount} of {preflightData.stats.totalSubjects} Subjects Approved
                      </span>
                      <span
                        className={`font-bold ${
                          preflightData.stats.isReady ? 'text-emerald-500' : 'text-amber-500'
                        }`}
                      >
                        {preflightData.stats.readinessPercentage}% Ready
                      </span>
                    </div>
                    <Progress value={preflightData.stats.readinessPercentage} className="h-2" />
                  </div>

                  {/* Warning if Incomplete */}
                  {!preflightData.stats.isReady && (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <strong>Incomplete Mark Submissions:</strong>{' '}
                        {preflightData.stats.pendingCount > 0 && `${preflightData.stats.pendingCount} pending review. `}
                        {preflightData.stats.draftCount > 0 && `${preflightData.stats.draftCount} missing or in draft. `}
                        Generating results now will produce partial report cards.
                      </div>
                    </div>
                  )}

                  {/* Existing Results Detected Alert */}
                  {preflightData.hasExistingResults && (
                    <div className="flex items-start justify-between gap-3 p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-xs">
                      <div className="space-y-0.5">
                        <div className="font-bold text-foreground flex items-center gap-1.5">
                          <span>Existing Term Results Active</span>
                          <Badge
                            variant="outline"
                            className={
                              preflightData.isCurrentlyPublished
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]'
                                : 'bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]'
                            }
                          >
                            {preflightData.isCurrentlyPublished ? 'Published' : 'Draft / Hidden'}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-[11px]">
                          {preflightData.existingResults?.studentCount} candidates ranked • Class Average:{' '}
                          {preflightData.existingResults?.classAverage}%
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {preflightData.isCurrentlyPublished ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsUnpublishModalOpen(true)}
                            className="h-7 text-[11px] rounded-lg border-border text-rose-600 hover:bg-rose-500/10"
                          >
                            <EyeOff className="w-3 h-3 mr-1" /> Unpublish
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => setIsPublishModalOpen(true)}
                            className="h-7 text-[11px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <Eye className="w-3 h-3 mr-1" /> Publish Live
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Checklist Table */}
                  <div className="rounded-xl border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border bg-muted/40 hover:bg-muted/40">
                          <TableHead className="text-xs font-bold text-muted-foreground">Subject</TableHead>
                          <TableHead className="text-xs font-bold text-muted-foreground">Teacher</TableHead>
                          <TableHead className="text-xs font-bold text-muted-foreground text-center">Marks Entered</TableHead>
                          <TableHead className="text-xs font-bold text-muted-foreground text-right pr-4">Moderation</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preflightData.subjects.map((sub: any) => (
                          <TableRow key={sub.subjectId} className="border-border hover:bg-muted/20 text-xs">
                            <TableCell className="font-semibold text-foreground">
                              {sub.subjectName}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {sub.teacherName}
                            </TableCell>
                            <TableCell className="text-center font-mono">
                              <span
                                className={
                                  sub.scoredStudents >= sub.totalStudents
                                    ? 'text-emerald-500 font-bold'
                                    : 'text-amber-500'
                                }
                              >
                                {sub.scoredStudents} / {sub.totalStudents}
                              </span>
                            </TableCell>
                            <TableCell className="text-right pr-4">
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${
                                  sub.status === 'Approved'
                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                    : sub.status === 'Pending'
                                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                    : sub.status === 'Rejected'
                                    ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                    : 'bg-muted text-muted-foreground border-border'
                                }`}
                              >
                                {sub.status === 'Approved' && <CheckCircle2 className="w-2.5 h-2.5 mr-1" />}
                                {sub.status === 'Pending' && <Clock className="w-2.5 h-2.5 mr-1" />}
                                {sub.status === 'Rejected' && <XCircle className="w-2.5 h-2.5 mr-1" />}
                                {sub.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : null}

              {/* Execute Result Generation Button & Confirmation */}
              <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="lg"
                    disabled={!selectedClass || !selectedTerm || isGenerating}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl h-12 shadow-sm text-sm"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    ) : (
                      <PlayCircle className="h-5 w-5 mr-2" />
                    )}
                    {regenerateRankingOnly ? 'Execute Ranking Recalculation' : 'Execute Result Generation'}
                  </Button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-md bg-card border-border">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-bold text-foreground">
                      Confirm Result Computation
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      You are about to compute terminal academic standing and ranks for:
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-3 py-2 text-xs">
                    <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Class Cohort:</span>
                        <strong className="text-foreground">{selectedClassName}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Session & Term:</span>
                        <strong className="text-foreground">{selectedSessionName} • {selectedTermName}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pass Mark Benchmark:</span>
                        <strong className="text-primary">{passMark}%</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Publishing Mode:</span>
                        <strong className="text-foreground">
                          {publishMode === 'publish' ? 'Publish Immediately (Live)' : 'Save as Draft (Hidden)'}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tie-Breaker Rule:</span>
                        <strong className="text-foreground">
                          {rankingMethod === 'dense' ? 'Dense (1, 2, 2, 3)' : 'Competition (1, 2, 2, 4)'}
                        </strong>
                      </div>
                    </div>

                    {preflightData?.hasExistingResults && (
                      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <div>
                          <strong>Overwriting Previous Results:</strong> Existing positions and terminal totals for this cohort will be completely updated.
                        </div>
                      </div>
                    )}

                    {!preflightData?.stats?.isReady && (
                      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <div>
                          <strong>Notice:</strong> Some subject mark sheets are pending review. Missing subject scores will default to zero in terminal averages.
                        </div>
                      </div>
                    )}
                  </div>

                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsConfirmOpen(false)}
                      className="rounded-xl border-border text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleGenerate}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-semibold"
                    >
                      Proceed with Generation
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Processing Status, Summary & Podium */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="bg-card border-border shadow-sm rounded-2xl flex flex-col justify-between min-h-[500px]">
            <CardHeader className="p-6 border-b border-border">
              <CardTitle className="text-base font-bold text-foreground flex items-center justify-between">
                <span>Computation Feedback & Podium</span>
                {resultData?.summary && (
                  <Badge
                    variant="outline"
                    className={
                      resultData.summary.isPublished
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs'
                        : 'bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs'
                    }
                  >
                    {resultData.summary.isPublished ? 'Published' : 'Draft'}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Official terminal averages, pass rates, and top candidate standings.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 flex-1 flex flex-col justify-center">
              {/* Idle State */}
              {!resultData && !isGenerating && (
                <div className="text-center py-12 text-muted-foreground space-y-3">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
                  <h3 className="font-semibold text-foreground text-base">Engine Ready</h3>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    Configure your class cohort and pass benchmark, then click &quot;Execute Result Generation&quot; to begin processing.
                  </p>
                </div>
              )}

              {/* Progress State */}
              {isGenerating && (
                <div className="text-center py-12 space-y-5">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-foreground">Processing Cohort Results...</h3>
                    <p className="text-xs text-muted-foreground">
                      {generationStep === 1 && 'Validating student cohort and subject mappings...'}
                      {generationStep === 2 && 'Aggregating CA tests and terminal exam marks...'}
                      {generationStep === 3 && 'Assigning WAEC grades and remark profiles...'}
                      {generationStep === 4 && 'Computing overall averages and applying tie-breaker rankings...'}
                      {generationStep >= 5 && 'Finalizing report cards and broadsheet records...'}
                    </p>
                  </div>
                  <div className="max-w-xs mx-auto">
                    <Progress value={generationStep * 20} className="h-1.5" />
                  </div>
                </div>
              )}

              {/* Success Result Summary */}
              {resultData && resultData.success && (
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5">
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <div>
                      <div className="font-bold text-xs">Results Successfully Computed!</div>
                      <p className="text-[11px] opacity-90">{resultData.message}</p>
                    </div>
                  </div>

                  {resultData.summary && (
                    <div className="space-y-4">
                      {/* 4 Summary KPIs */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-muted/40 p-3 rounded-xl border border-border">
                          <div className="text-[10px] text-muted-foreground uppercase font-semibold">Candidates</div>
                          <div className="text-xl font-extrabold text-foreground mt-0.5">
                            {resultData.summary.studentsCount}
                          </div>
                        </div>
                        <div className="bg-muted/40 p-3 rounded-xl border border-border">
                          <div className="text-[10px] text-muted-foreground uppercase font-semibold">Class Average</div>
                          <div className="text-xl font-extrabold text-foreground mt-0.5">
                            {resultData.summary.classAverage}%
                          </div>
                        </div>
                        <div className="bg-muted/40 p-3 rounded-xl border border-border">
                          <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                            Pass Rate (&ge;{resultData.summary.passMark}%)
                          </div>
                          <div
                            className={`text-xl font-extrabold mt-0.5 ${
                              resultData.summary.passRate >= 70 ? 'text-emerald-500' : 'text-amber-500'
                            }`}
                          >
                            {resultData.summary.passRate}%
                          </div>
                        </div>
                        <div className="bg-muted/40 p-3 rounded-xl border border-border">
                          <div className="text-[10px] text-muted-foreground uppercase font-semibold">Publication</div>
                          <div className="text-sm font-bold text-foreground mt-1 flex items-center gap-1">
                            {resultData.summary.isPublished ? (
                              <span className="text-emerald-600 flex items-center gap-1">
                                <Eye className="w-3.5 h-3.5" /> Published
                              </span>
                            ) : (
                              <span className="text-amber-600 flex items-center gap-1">
                                <EyeOff className="w-3.5 h-3.5" /> Draft Mode
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Top Candidates Podium */}
                      {resultData.summary.topStudents && resultData.summary.topStudents.length > 0 && (
                        <div className="space-y-2 pt-1 border-t border-border">
                          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            <Award className="w-3.5 h-3.5 text-primary" /> Top Academic Candidates
                          </div>
                          <div className="space-y-1.5">
                            {resultData.summary.topStudents.map((s: any, idx: number) => (
                              <div
                                key={s.studentId}
                                className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-muted/20 text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] font-bold ${
                                      idx === 0
                                        ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
                                        : idx === 1
                                        ? 'bg-slate-500/15 text-slate-600 border-slate-500/30'
                                        : 'bg-orange-500/15 text-orange-600 border-orange-500/30'
                                    }`}
                                  >
                                    #{s.rank || idx + 1}
                                  </Badge>
                                  <div>
                                    <span className="font-semibold text-foreground">{s.name}</span>
                                    <span className="text-[10px] text-muted-foreground ml-2 font-mono">{s.studentId}</span>
                                  </div>
                                </div>
                                <span className="font-bold text-foreground">{s.average}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Shortcuts */}
                      <div className="space-y-2 pt-2 border-t border-border">
                        <Link href="/dashboard/results/view">
                          <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-sm text-xs h-9 font-semibold">
                            Open Broadsheet & Report Cards <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                          </Button>
                        </Link>

                        {resultData.summary.isPublished ? (
                          <Button
                            variant="outline"
                            onClick={() => setIsUnpublishModalOpen(true)}
                            className="w-full rounded-xl border-rose-500/30 text-rose-600 hover:bg-rose-500/10 text-xs h-9"
                          >
                            <EyeOff className="w-3.5 h-3.5 mr-1.5" /> Unpublish Results (Retract to Draft)
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => setIsPublishModalOpen(true)}
                            className="w-full rounded-xl border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 text-xs h-9"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1.5" /> Publish Results Live
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Error State */}
              {resultData && !resultData.success && (
                <div className="text-center py-8 space-y-3">
                  <AlertTriangle className="h-10 w-10 mx-auto text-destructive" />
                  <h3 className="font-bold text-foreground text-sm">Generation Aborted</h3>
                  <p className="text-xs text-destructive bg-destructive/10 p-3 rounded-xl border border-destructive/20 max-w-xs mx-auto">
                    {resultData.message}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Unpublish Confirmation Modal */}
      <Dialog open={isUnpublishModalOpen} onOpenChange={setIsUnpublishModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <EyeOff className="w-5 h-5 text-rose-500" /> Unpublish Term Results
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to unpublish results for {selectedClassName}?
            </DialogDescription>
          </DialogHeader>
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-700 dark:text-rose-400 space-y-1">
            <p className="font-bold">Immediate Effect:</p>
            <p className="opacity-90">
              Student digital report cards will be hidden from the Parent Portal and Student Dashboard until published again.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsUnpublishModalOpen(false)}
              className="rounded-xl border-border text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleUnpublish}
              disabled={isUnpublishing}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold"
            >
              {isUnpublishing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              Confirm Unpublish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish Confirmation Modal */}
      <Dialog open={isPublishModalOpen} onOpenChange={setIsPublishModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Eye className="w-5 h-5 text-emerald-500" /> Publish Term Results Live
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Make results officially visible to students and guardians for {selectedClassName}.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-700 dark:text-emerald-400">
            Report cards and broadsheet positions will immediately become active on digital portals.
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPublishModalOpen(false)}
              className="rounded-xl border-border text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={isUnpublishing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold"
            >
              {isUnpublishing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              Confirm Publication
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
