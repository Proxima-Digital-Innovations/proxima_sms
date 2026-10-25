'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getAcademicData } from '@/actions/academic-data';
import { getMidtermResults, saveMidtermResults, calculateMidtermAchievement } from '@/actions/midterm-actions';
import { Save, Loader2, Users, Printer, BookOpen, AlertCircle, Search, CheckCircle2 } from 'lucide-react';
import { useRole } from '@/context/role-context';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const ACHIEVEMENT_OPTIONS = [
  'Exceeding',
  'Expected +',
  'Expected',
  'Emerging +',
  'Emerging',
  'Not Assessed',
] as const;

function getAchievementBadgeColor(achievement: string) {
  switch (achievement) {
    case 'Exceeding':
      return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
    case 'Expected +':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
    case 'Expected':
      return 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30';
    case 'Emerging +':
    case 'Working Towards':
      return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
    case 'Emerging':
      return 'bg-rose-500/10 text-rose-600 border-rose-500/30';
    case 'Not Assessed':
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

export default function MidTermPage() {
  const { role } = useRole();
  const userRole = (role || '').toUpperCase();
  const canEdit = ['TEACHER', 'ADMIN', 'SUPER_ADMIN', 'EXAM_OFFICER', 'HOD'].includes(userRole);
  const { toast } = useToast();

  const [classes, setClasses] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [scores, setScores] = useState<Record<string, { score: string; achievement: string }>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    (async () => {
      const acadRes = await getAcademicData();
      setClasses(acadRes.classes || []);
      setTerms(acadRes.terms || []);
      setSessions(acadRes.sessions || []);
      setSubjects(acadRes.subjects || []);

      const activeTerm = acadRes.terms?.find((t: any) => t.isActive) || acadRes.terms?.[0];
      const activeSession = acadRes.sessions?.find((s: any) => s.isActive) || acadRes.sessions?.[0];

      if (activeTerm) setSelectedTerm(activeTerm.id);
      if (activeSession) setSelectedSession(activeSession.name || activeSession.id);
    })();
  }, []);

  // Filter subjects assigned specifically to the selected class
  const availableSubjects = useMemo(() => {
    if (!selectedClass) return subjects;
    const classObj = classes.find(c => c.id === selectedClass || c.name === selectedClass);
    if (!classObj?.subjectIds) return subjects;

    try {
      const ids: string[] = JSON.parse(classObj.subjectIds);
      if (Array.isArray(ids) && ids.length > 0) {
        const filtered = subjects.filter(s => ids.includes(s.id));
        return filtered.length > 0 ? filtered : subjects;
      }
    } catch {}
    return subjects;
  }, [classes, selectedClass, subjects]);

  // Handle class change: auto-reset subject if current selection is not in class curriculum
  const handleClassChange = (newClassId: string) => {
    setSelectedClass(newClassId);
    setIsLoaded(false);
    setStudents([]);
    setScores({});
    setDirty(new Set());

    const classObj = classes.find(c => c.id === newClassId || c.name === newClassId);
    if (classObj?.subjectIds) {
      try {
        const ids: string[] = JSON.parse(classObj.subjectIds);
        if (Array.isArray(ids) && ids.length > 0 && selectedSubject && !ids.includes(selectedSubject)) {
          setSelectedSubject('');
        }
      } catch {}
    }
  };

  const calculateAchievement = (score: number | null | undefined): string => {
    if (score == null || isNaN(score)) return 'Not Assessed';
    if (score >= 17) return 'Exceeding';
    if (score >= 13) return 'Expected +';
    if (score >= 10) return 'Expected';
    if (score >= 7) return 'Emerging +';
    if (score >= 0) return 'Emerging';
    return 'Not Assessed';
  };

  const loadData = async () => {
    if (!selectedClass || !selectedTerm || !selectedSession || !selectedSubject) {
      toast({
        variant: 'destructive',
        title: 'Missing Selection',
        description: 'Please select session, term, class, and subject.',
      });
      return;
    }
    setIsLoading(true);
    try {
      const res = await getMidtermResults(selectedClass, selectedTerm, selectedSubject, selectedSession);
      if (res.success) {
        setStudents(res.students || []);

        const scoreMap: Record<string, { score: string; achievement: string }> = {};

        // Default all students to empty / Not Assessed (no phantom 0s)
        res.students?.forEach((s: any) => {
          scoreMap[s.id] = { score: '', achievement: 'Not Assessed' };
        });

        // Overlay existing recorded scores
        for (const r of res.results || []) {
          if (scoreMap[r.studentId]) {
            const hasScore = r.score != null && r.score !== '';
            scoreMap[r.studentId] = {
              score: hasScore ? String(r.score) : '',
              achievement: r.achievement || (hasScore ? calculateAchievement(r.score) : 'Not Assessed'),
            };
          }
        }

        setScores(scoreMap);
        setDirty(new Set());
        setIsLoaded(true);
      } else {
        throw new Error(res.message || 'Failed to load midterm results');
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleScoreChange = (studentId: string, val: string) => {
    if (!canEdit) return;

    if (val !== '') {
      const num = parseFloat(val);
      if (isNaN(num) || num < 0 || num > 20) return;
      const achievement = calculateAchievement(num);
      setScores(prev => ({
        ...prev,
        [studentId]: { score: val, achievement },
      }));
    } else {
      setScores(prev => ({
        ...prev,
        [studentId]: { score: '', achievement: 'Not Assessed' },
      }));
    }

    setDirty(prev => new Set(prev).add(studentId));
  };

  const handleAchievementChange = (studentId: string, achievement: string) => {
    if (!canEdit) return;
    setScores(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], achievement },
    }));
    setDirty(prev => new Set(prev).add(studentId));
  };

  const handleSave = async () => {
    if (dirty.size === 0) return;
    setIsSaving(true);
    try {
      const toSave = Array.from(dirty).map(studentId => {
        const rawScore = scores[studentId]?.score;
        const isBlank = rawScore === '' || rawScore === undefined || rawScore === null;
        return {
          studentId,
          score: isBlank ? null : parseFloat(rawScore),
          achievement: isBlank ? 'Not Assessed' : scores[studentId].achievement,
        };
      });

      const res = await saveMidtermResults(selectedTerm, selectedSubject, selectedSession, toSave);
      if (res.success) {
        toast({
          title: 'Marks Saved',
          description: `Successfully updated midterm scores for ${toSave.length} candidate(s).`,
        });
        setDirty(new Set());
      } else {
        throw new Error(res.message || 'Failed to save scores');
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(s =>
      `${s.firstName} ${s.lastName} ${s.studentId}`.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  // Real-time cohort metrics (excluding blank / unassessed students from the average)
  const metrics = useMemo(() => {
    if (!students || students.length === 0) {
      return { total: 0, scored: 0, average: 0, highest: 0, expectedPlusRate: 0 };
    }

    let totalScore = 0;
    let scored = 0;
    let highest = 0;
    let expectedPlusCount = 0;

    for (const student of students) {
      const entry = scores[student.id];
      if (entry && entry.score !== '') {
        const num = parseFloat(entry.score);
        if (!isNaN(num)) {
          scored++;
          totalScore += num;
          if (num > highest) highest = num;
          if (num >= 13) expectedPlusCount++;
        }
      }
    }

    return {
      total: students.length,
      scored,
      average: scored > 0 ? Math.round((totalScore / scored) * 10) / 10 : 0,
      highest,
      expectedPlusRate: scored > 0 ? Math.round((expectedPlusCount / scored) * 100) : 0,
    };
  }, [students, scores]);

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Mid-Term Results Entry
            </h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-semibold">
              Max 20 Marks
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Continuous Assessment Gradebook • Auto-calibrated achievement benchmarks (Emerging to Exceeding)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link href="/dashboard/midterm/view">
            <Button variant="outline" size="sm" className="rounded-xl border-border">
              <Printer className="h-4 w-4 mr-2" /> View & Print Reports
            </Button>
          </Link>

          {isLoaded && canEdit && (
            <Button
              onClick={handleSave}
              disabled={isSaving || dirty.size === 0}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-sm font-semibold"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes {dirty.size > 0 ? `(${dirty.size})` : ''}
            </Button>
          )}
        </div>
      </motion.div>

      {/* Filter Selection Card */}
      <Card className="bg-card border-border shadow-sm rounded-2xl">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Session</Label>
              <Select value={selectedSession} onValueChange={setSelectedSession}>
                <SelectTrigger className="rounded-xl border-border bg-background h-10">
                  <SelectValue placeholder="Session" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {sessions.map(s => (
                    <SelectItem key={s.id} value={s.name || s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Term</Label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger className="rounded-xl border-border bg-background h-10">
                  <SelectValue placeholder="Term" />
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
              <Label className="text-xs font-semibold text-muted-foreground">Class</Label>
              <Select value={selectedClass} onValueChange={handleClassChange}>
                <SelectTrigger className="rounded-xl border-border bg-background h-10">
                  <SelectValue placeholder="Select Class" />
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
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground">Subject</Label>
                {selectedClass && (
                  <span className="text-[10px] text-muted-foreground">
                    ({availableSubjects.length} for class)
                  </span>
                )}
              </div>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="rounded-xl border-border bg-background h-10">
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {availableSubjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={loadData}
              disabled={isLoading || !selectedClass || !selectedSubject || !selectedTerm || !selectedSession}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-10 font-semibold"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BookOpen className="h-4 w-4 mr-2" />}
              Load Candidates
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Metrics */}
      {isLoaded && students.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-card p-4 rounded-xl border border-border">
            <div className="text-xs text-muted-foreground font-medium">Candidates</div>
            <div className="text-2xl font-bold mt-1 text-foreground">{metrics.total}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {metrics.scored} entered • {metrics.total - metrics.scored} unassessed
            </div>
          </div>
          <div className="bg-card p-4 rounded-xl border border-border">
            <div className="text-xs text-muted-foreground font-medium">Class Average</div>
            <div className="text-2xl font-bold mt-1 text-foreground">{metrics.average} / 20</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Scored candidates only</div>
          </div>
          <div className="bg-card p-4 rounded-xl border border-border">
            <div className="text-xs text-muted-foreground font-medium">Expected + Rate</div>
            <div className="text-2xl font-bold mt-1 text-emerald-500">{metrics.expectedPlusRate}%</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">&ge; 13 / 20 marks</div>
          </div>
          <div className="bg-card p-4 rounded-xl border border-border">
            <div className="text-xs text-muted-foreground font-medium">Top Score</div>
            <div className="text-2xl font-bold mt-1 text-foreground">{metrics.highest} / 20</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Peak result</div>
          </div>
        </div>
      )}

      {/* Main Gradebook Table */}
      <AnimatePresence>
        {isLoaded && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-card border-border shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="p-4 md:p-6 border-b border-border bg-card flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <CardTitle className="text-lg font-bold text-foreground">Mid-Term Gradebook</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Enter marks (0-20). Leave blank if unassessed or absent. Achievement updates automatically.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {/* Candidate Search Bar */}
                  <div className="relative w-full sm:w-60">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Filter student name or ID..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-9 bg-background border-border text-foreground text-xs rounded-xl h-9"
                    />
                  </div>
                  {dirty.size > 0 && (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs w-fit">
                      <AlertCircle className="w-3 h-3 mr-1" /> {dirty.size} unsaved mark(s)
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border bg-muted/40 hover:bg-muted/40">
                        <TableHead className="w-12 text-center text-xs font-bold text-muted-foreground">#</TableHead>
                        <TableHead className="w-32 text-xs font-bold text-muted-foreground">Candidate ID</TableHead>
                        <TableHead className="text-xs font-bold text-muted-foreground">Full Name</TableHead>
                        <TableHead className="w-36 text-center text-xs font-bold text-muted-foreground">
                          Score (Max 20)
                        </TableHead>
                        <TableHead className="w-56 text-left text-xs font-bold text-muted-foreground pr-6">
                          Achievement Benchmark
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                            <div className="flex flex-col items-center justify-center">
                              <AlertCircle className="w-8 h-8 text-muted-foreground mb-2 opacity-50" />
                              <p className="font-semibold text-foreground text-sm">
                                {students.length === 0
                                  ? 'No students enrolled in this class.'
                                  : 'No candidates match your search filter.'}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredStudents.map((student, idx) => {
                          const s = scores[student.id];
                          const isEdited = dirty.has(student.id);

                          return (
                            <TableRow
                              key={student.id}
                              className={`border-border hover:bg-muted/30 transition-colors ${
                                isEdited ? 'bg-primary/5' : ''
                              }`}
                            >
                              <TableCell className="text-center font-mono text-xs text-muted-foreground">
                                {idx + 1}
                              </TableCell>
                              <TableCell className="font-mono text-xs font-medium text-muted-foreground">
                                {student.studentId || '-'}
                              </TableCell>
                              <TableCell className="font-semibold text-sm text-foreground">
                                {student.lastName}, {student.firstName}
                              </TableCell>
                              <TableCell className="p-2 text-center">
                                <Input
                                  ref={el => { inputRefs.current[student.id] = el; }}
                                  type="number"
                                  min="0"
                                  max="20"
                                  step="0.5"
                                  disabled={!canEdit}
                                  placeholder="-"
                                  value={s?.score ?? ''}
                                  onChange={e => handleScoreChange(student.id, e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'ArrowDown' || e.key === 'Enter') {
                                      e.preventDefault();
                                      const next = filteredStudents[idx + 1];
                                      if (next) inputRefs.current[next.id]?.focus();
                                    } else if (e.key === 'ArrowUp') {
                                      e.preventDefault();
                                      const prev = filteredStudents[idx - 1];
                                      if (prev) inputRefs.current[prev.id]?.focus();
                                    }
                                  }}
                                  className={`h-9 text-center font-semibold rounded-lg bg-background border-border text-foreground text-sm w-28 mx-auto focus-visible:ring-primary ${
                                    isEdited ? 'border-primary/40 ring-1 ring-primary/20' : ''
                                  }`}
                                />
                              </TableCell>
                              <TableCell className="pr-6">
                                <Select
                                  value={s?.achievement || 'Not Assessed'}
                                  onValueChange={v => handleAchievementChange(student.id, v)}
                                  disabled={!canEdit}
                                >
                                  <SelectTrigger
                                    className={`h-9 rounded-lg border text-xs w-48 font-medium ${getAchievementBadgeColor(
                                      s?.achievement || 'Not Assessed'
                                    )}`}
                                  >
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-popover border-border">
                                    {ACHIEVEMENT_OPTIONS.map(opt => (
                                      <SelectItem key={opt} value={opt} className="text-xs font-medium">
                                        {opt}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
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
