'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getAcademicData } from '@/actions/academic-data';
import { getTahfeezScoresByClass, saveTahfeezScores, TahfeezScoreInput } from '@/actions/tahfeez-actions';
import {
  BookOpen,
  Save,
  Loader2,
  AlertCircle,
  Sparkles,
  SlidersHorizontal,
  Search,
  CheckCircle2,
  Award,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface StudentTahfeezRow {
  id?: string;
  studentId: string;
  fullName: string;
  admissionNumber: string;
  tajweed: string; // max 20
  fluency: string; // max 20
  memorization: string; // max 60
  surah: string;
  juz: string;
  page: string;
  startAyah: string;
  endAyah: string;
  teacherNote: string;
}

export default function TahfeezPage() {
  const { data: session } = useSession();
  const userRole = ((session?.user as any)?.role || '').toUpperCase();
  const canEdit = ['TEACHER', 'ADMIN', 'SUPER_ADMIN', 'EXAM_OFFICER', 'HOD'].includes(userRole);
  const { toast } = useToast();

  const [classes, setClasses] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState('');

  const [studentsData, setStudentsData] = useState<StudentTahfeezRow[]>([]);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Student detail modal state (for Surah/Juz/Ayah range and notes)
  const [activeModalStudent, setActiveModalStudent] = useState<StudentTahfeezRow | null>(null);

  useEffect(() => {
    (async () => {
      const acadRes = await getAcademicData();
      setClasses(acadRes.classes || []);
      setTerms(acadRes.terms || []);
      setSessions(acadRes.sessions || []);

      const activeTerm = acadRes.terms?.find((t: any) => t.isActive) || acadRes.terms?.[0];
      const activeSession = acadRes.sessions?.find((s: any) => s.isActive) || acadRes.sessions?.[0];
      if (activeTerm) setSelectedTerm(activeTerm.id);
      if (activeSession) setSelectedSession(activeSession.id);
    })();
  }, []);

  const handleLoadData = async () => {
    if (!selectedClass || !selectedTerm || !selectedSession) {
      toast({
        variant: 'destructive',
        title: 'Missing Selection',
        description: 'Please select class, session, and term.',
      });
      return;
    }
    setIsLoading(true);
    try {
      const sessionObj = sessions.find(s => s.id === selectedSession);
      const sessionName = sessionObj?.name || selectedSession;

      const res = await getTahfeezScoresByClass(selectedClass, selectedTerm, sessionName);
      if (res.success && res.students) {
        const scoresMap = new Map((res.scores || []).map((sc: any) => [sc.studentId, sc]));

        const rows: StudentTahfeezRow[] = res.students.map((student: any) => {
          const sc = scoresMap.get(student.id) as any;
          return {
            id: sc?.id,
            studentId: student.id,
            fullName: `${student.lastName}, ${student.firstName}`,
            admissionNumber: student.studentId || '-',
            tajweed: sc?.tajweedScore != null ? String(sc.tajweedScore) : '',
            fluency: sc?.fluencyScore != null ? String(sc.fluencyScore) : '',
            memorization: sc?.memorizationScore != null ? String(sc.memorizationScore) : '',
            surah: sc?.surah || '',
            juz: sc?.juz != null ? String(sc.juz) : '',
            page: sc?.page != null ? String(sc.page) : '',
            startAyah: sc?.startAyah != null ? String(sc.startAyah) : '',
            endAyah: sc?.endAyah != null ? String(sc.endAyah) : '',
            teacherNote: sc?.teacherNote || '',
          };
        });

        setStudentsData(rows);
        setDirty(new Set());
        setIsLoaded(true);
      } else {
        throw new Error(res.error || 'Failed to load Tahfeez records');
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const updateScoreField = (studentId: string, field: 'tajweed' | 'fluency' | 'memorization', val: string) => {
    if (!canEdit) return;

    if (val !== '') {
      const num = parseFloat(val);
      if (isNaN(num)) return;
      if (field === 'tajweed' && (num < 0 || num > 20)) return;
      if (field === 'fluency' && (num < 0 || num > 20)) return;
      if (field === 'memorization' && (num < 0 || num > 60)) return;
    }

    setStudentsData(prev =>
      prev.map(row => (row.studentId === studentId ? { ...row, [field]: val } : row))
    );
    setDirty(prev => new Set(prev).add(studentId));
  };

  const calculateTotal = (row: StudentTahfeezRow) => {
    const t = parseFloat(row.tajweed) || 0;
    const f = parseFloat(row.fluency) || 0;
    const m = parseFloat(row.memorization) || 0;
    return Math.round((t + f + m) * 10) / 10;
  };

  const getHifzGrade = (total: number) => {
    if (total >= 85) return { grade: 'Mumtaz', label: 'Excellent', color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' };
    if (total >= 75) return { grade: 'Jayyid Jiddan', label: 'Very Good', color: 'text-blue-600 bg-blue-500/10 border-blue-500/20' };
    if (total >= 65) return { grade: 'Jayyid', label: 'Good', color: 'text-sky-600 bg-sky-500/10 border-sky-500/20' };
    if (total >= 50) return { grade: 'Maqbool', label: 'Pass', color: 'text-amber-600 bg-amber-500/10 border-amber-500/20' };
    return { grade: "Da'if", label: 'Weak', color: 'text-rose-600 bg-rose-500/10 border-rose-500/20' };
  };

  const handleSaveScores = async () => {
    if (dirty.size === 0) return;
    setIsSaving(true);
    try {
      const sessionObj = sessions.find(s => s.id === selectedSession);
      const sessionName = sessionObj?.name || '2024/2025';

      const toSave: TahfeezScoreInput[] = studentsData
        .filter(s => dirty.has(s.studentId))
        .map(s => {
          const taj = s.tajweed === '' ? undefined : parseFloat(s.tajweed);
          const flu = s.fluency === '' ? undefined : parseFloat(s.fluency);
          const mem = s.memorization === '' ? undefined : parseFloat(s.memorization);
          const total = (taj || 0) + (flu || 0) + (mem || 0);

          return {
            studentId: s.studentId,
            termId: selectedTerm,
            session: sessionName,
            tajweedScore: taj,
            fluencyScore: flu,
            memorizationScore: mem,
            marks: total,
            surah: s.surah || undefined,
            juz: s.juz ? parseInt(s.juz) : undefined,
            page: s.page ? parseInt(s.page) : undefined,
            startAyah: s.startAyah ? parseInt(s.startAyah) : undefined,
            endAyah: s.endAyah ? parseInt(s.endAyah) : undefined,
            teacherNote: s.teacherNote || undefined,
          };
        });

      const res = await saveTahfeezScores(toSave);
      if (res.success) {
        toast({
          title: 'Tahfeez Marks Saved',
          description: `Successfully saved records for ${toSave.length} candidate(s).`,
        });
        setDirty(new Set());
      } else {
        throw new Error(res.error || 'Failed to save scores');
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveModalDetails = () => {
    if (!activeModalStudent) return;
    setStudentsData(prev =>
      prev.map(row => (row.studentId === activeModalStudent.studentId ? activeModalStudent : row))
    );
    setDirty(prev => new Set(prev).add(activeModalStudent.studentId));
    setActiveModalStudent(null);
    toast({ title: 'Milestone Updated', description: 'Surah and Ayah details saved locally. Remember to click Save Changes.' });
  };

  const filteredStudents = useMemo(() => {
    if (!searchQuery) return studentsData;
    const q = searchQuery.toLowerCase();
    return studentsData.filter(
      s => s.fullName.toLowerCase().includes(q) || s.admissionNumber.toLowerCase().includes(q) || s.surah.toLowerCase().includes(q)
    );
  }, [studentsData, searchQuery]);

  const metrics = useMemo(() => {
    if (studentsData.length === 0) return { total: 0, scored: 0, average: 0, mumtazCount: 0, topScore: 0 };
    const valid = studentsData.filter(s => s.tajweed !== '' || s.fluency !== '' || s.memorization !== '');
    const scored = valid.length;
    if (scored === 0) return { total: studentsData.length, scored: 0, average: 0, mumtazCount: 0, topScore: 0 };

    const totals = valid.map(s => calculateTotal(s));
    const sum = totals.reduce((a, b) => a + b, 0);
    const mumtazCount = totals.filter(t => t >= 85).length;
    const topScore = Math.max(...totals);

    return {
      total: studentsData.length,
      scored,
      average: Math.round((sum / scored) * 10) / 10,
      mumtazCount,
      topScore,
    };
  }, [studentsData]);

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Tahfeez & Quran Memorization
            </h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              <Award className="w-3 h-3 mr-1" /> Hifz Matrix
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            3-Pillar Assessment: Tajweed (20) • Tartil & Fluency (20) • Hifz Memorization (60) • Total (100)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isLoaded && canEdit && (
            <Button
              onClick={handleSaveScores}
              disabled={isSaving || dirty.size === 0}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-sm"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Session</Label>
              <Select value={selectedSession} onValueChange={setSelectedSession}>
                <SelectTrigger className="rounded-xl border-border bg-background h-10">
                  <SelectValue placeholder="Session" />
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
              <Select value={selectedClass} onValueChange={setSelectedClass}>
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

            <Button
              onClick={handleLoadData}
              disabled={isLoading || !selectedClass || !selectedTerm || !selectedSession}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-10"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BookOpen className="h-4 w-4 mr-2" />}
              Load Tahfeez Roster
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Bar */}
      {isLoaded && studentsData.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-card p-4 rounded-xl border border-border">
            <div className="text-xs text-muted-foreground font-medium">Candidates</div>
            <div className="text-2xl font-bold mt-1 text-foreground">{metrics.total}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Enrolled in class</div>
          </div>
          <div className="bg-card p-4 rounded-xl border border-border">
            <div className="text-xs text-muted-foreground font-medium">Evaluated</div>
            <div className="text-2xl font-bold mt-1 text-primary">
              {metrics.scored} / {metrics.total}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {metrics.total > 0 ? Math.round((metrics.scored / metrics.total) * 100) : 0}% assessed
            </div>
          </div>
          <div className="bg-card p-4 rounded-xl border border-border">
            <div className="text-xs text-muted-foreground font-medium">Class Hifz Average</div>
            <div className="text-2xl font-bold mt-1 text-foreground">{metrics.average}%</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Mean composite mark</div>
          </div>
          <div className="bg-card p-4 rounded-xl border border-border">
            <div className="text-xs text-muted-foreground font-medium">Mumtaz (&ge;85)</div>
            <div className="text-2xl font-bold mt-1 text-emerald-500">{metrics.mumtazCount}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Excellence tier</div>
          </div>
          <div className="bg-card p-4 rounded-xl border border-border col-span-2 md:col-span-1">
            <div className="text-xs text-muted-foreground font-medium">Top Score</div>
            <div className="text-2xl font-bold mt-1 text-foreground">{metrics.topScore} / 100</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Highest class result</div>
          </div>
        </div>
      )}

      {/* Main Table */}
      <AnimatePresence>
        {isLoaded && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-card border-border shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="p-4 md:p-6 border-b border-border bg-card flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <CardTitle className="text-lg font-bold text-foreground">Quranic Memorization Register</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Input Tajweed, Tartil, and Hifz marks. Click &quot;Milestone&quot; to log Surah, Juz, and Ayah progression.
                  </CardDescription>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Filter student or surah..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 bg-background border-border text-foreground text-xs rounded-xl h-9"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border bg-muted/40 hover:bg-muted/40">
                        <TableHead className="w-12 text-center text-xs font-bold text-muted-foreground">#</TableHead>
                        <TableHead className="w-32 text-xs font-bold text-muted-foreground">Student ID</TableHead>
                        <TableHead className="text-xs font-bold text-muted-foreground">Candidate</TableHead>
                        <TableHead className="w-36 text-xs font-bold text-muted-foreground">Current Portion</TableHead>
                        <TableHead className="w-24 text-center text-xs font-bold text-muted-foreground">
                          Tajweed <span className="text-[10px] font-normal block">Max 20</span>
                        </TableHead>
                        <TableHead className="w-24 text-center text-xs font-bold text-muted-foreground">
                          Tartil <span className="text-[10px] font-normal block">Max 20</span>
                        </TableHead>
                        <TableHead className="w-24 text-center text-xs font-bold text-muted-foreground">
                          Hifz <span className="text-[10px] font-normal block">Max 60</span>
                        </TableHead>
                        <TableHead className="w-24 text-center text-xs font-bold text-muted-foreground">Total (100)</TableHead>
                        <TableHead className="w-32 text-center text-xs font-bold text-muted-foreground">Rating</TableHead>
                        <TableHead className="w-28 text-center text-xs font-bold text-muted-foreground pr-6">Portion Log</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="h-48 text-center text-muted-foreground">
                            <div className="flex flex-col items-center justify-center">
                              <AlertCircle className="w-10 h-10 text-muted-foreground mb-3" />
                              <p className="font-semibold text-foreground">No students found.</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredStudents.map((row, idx) => {
                          const total = calculateTotal(row);
                          const isEdited = dirty.has(row.studentId);
                          const grade = getHifzGrade(total);

                          return (
                            <TableRow
                              key={row.studentId}
                              className={`border-border hover:bg-muted/30 transition-colors ${
                                isEdited ? 'bg-primary/5' : ''
                              }`}
                            >
                              <TableCell className="text-center font-mono text-xs text-muted-foreground">
                                {idx + 1}
                              </TableCell>
                              <TableCell className="font-mono text-xs font-medium text-muted-foreground">
                                {row.admissionNumber}
                              </TableCell>
                              <TableCell className="font-semibold text-sm text-foreground">
                                {row.fullName}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {row.surah ? (
                                  <div>
                                    <span className="font-medium text-foreground">{row.surah}</span>
                                    {row.juz && <span className="text-[10px] block text-muted-foreground">Juz {row.juz}</span>}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground/60 italic text-xs">Not logged</span>
                                )}
                              </TableCell>
                              <TableCell className="p-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max="20"
                                  step="0.5"
                                  disabled={!canEdit}
                                  placeholder="-"
                                  value={row.tajweed}
                                  onChange={e => updateScoreField(row.studentId, 'tajweed', e.target.value)}
                                  className="h-8 text-center font-semibold rounded-lg bg-background border-border text-foreground text-xs"
                                />
                              </TableCell>
                              <TableCell className="p-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max="20"
                                  step="0.5"
                                  disabled={!canEdit}
                                  placeholder="-"
                                  value={row.fluency}
                                  onChange={e => updateScoreField(row.studentId, 'fluency', e.target.value)}
                                  className="h-8 text-center font-semibold rounded-lg bg-background border-border text-foreground text-xs"
                                />
                              </TableCell>
                              <TableCell className="p-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max="60"
                                  step="0.5"
                                  disabled={!canEdit}
                                  placeholder="-"
                                  value={row.memorization}
                                  onChange={e => updateScoreField(row.studentId, 'memorization', e.target.value)}
                                  className="h-8 text-center font-semibold rounded-lg bg-background border-border text-foreground text-xs"
                                />
                              </TableCell>
                              <TableCell className="text-center font-bold text-sm text-foreground">
                                {total > 0 ? total : '-'}
                              </TableCell>
                              <TableCell className="text-center">
                                {total > 0 ? (
                                  <Badge variant="outline" className={`text-xs font-semibold ${grade.color}`}>
                                    {grade.grade}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-xs">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center pr-6">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setActiveModalStudent({ ...row })}
                                  className="rounded-lg h-7 px-2 text-xs border-border"
                                >
                                  <SlidersHorizontal className="h-3 w-3 mr-1" /> Details
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Surah / Ayah / Details Dialog */}
      <Dialog open={!!activeModalStudent} onOpenChange={open => !open && setActiveModalStudent(null)}>
        <DialogContent className="sm:max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              Quran Milestone & Details: {activeModalStudent?.fullName}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Record specific Surah, Juz, Mushaf page, and teacher notes for report card inclusion.
            </DialogDescription>
          </DialogHeader>

          {activeModalStudent && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Surah Name</Label>
                  <Input
                    placeholder="e.g. Al-Baqarah"
                    value={activeModalStudent.surah}
                    onChange={e => setActiveModalStudent({ ...activeModalStudent, surah: e.target.value })}
                    className="bg-background border-border text-foreground h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Juz (1 - 30)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    placeholder="e.g. 1"
                    value={activeModalStudent.juz}
                    onChange={e => setActiveModalStudent({ ...activeModalStudent, juz: e.target.value })}
                    className="bg-background border-border text-foreground h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Mushaf Page (1-604)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="604"
                    placeholder="e.g. 25"
                    value={activeModalStudent.page}
                    onChange={e => setActiveModalStudent({ ...activeModalStudent, page: e.target.value })}
                    className="bg-background border-border text-foreground h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Start Ayah</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g. 1"
                    value={activeModalStudent.startAyah}
                    onChange={e => setActiveModalStudent({ ...activeModalStudent, startAyah: e.target.value })}
                    className="bg-background border-border text-foreground h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">End Ayah</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g. 25"
                    value={activeModalStudent.endAyah}
                    onChange={e => setActiveModalStudent({ ...activeModalStudent, endAyah: e.target.value })}
                    className="bg-background border-border text-foreground h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Teacher Recommendation & Remark</Label>
                <Textarea
                  placeholder="e.g. Excellent makharij and retention. Ready to test for Juz 2 completion."
                  rows={3}
                  value={activeModalStudent.teacherNote}
                  onChange={e => setActiveModalStudent({ ...activeModalStudent, teacherNote: e.target.value })}
                  className="bg-background border-border text-foreground text-xs resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setActiveModalStudent(null)} className="rounded-xl border-border">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveModalDetails} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl">
              Apply Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
