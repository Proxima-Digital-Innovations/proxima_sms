'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { DynamicTitle } from '@/components/dashboard/dynamic-title';
import { getAcademicData } from '@/actions/academic-data';
import { getScoresByClassSubjectAndTerm, saveScores } from '@/actions/results-actions';
import { getStudents } from '@/actions/student-actions';
import { Save, Loader2, ArrowRight, BookOpen, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface ScoreEntry {
  studentId: string;
  ca1: string;
  ca2: string;
  exam: string;
}

export default function BasicScoreEntryPage() {
  const { data: session } = useSession();
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

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const acadRes = await getAcademicData();
      setSubjects(acadRes.subjects || []);
      setClasses(acadRes.classes || []);
      setTerms(acadRes.terms || []);
      setSessions(acadRes.sessions || []);
    })();
  }, []);

  const loadStudents = async () => {
    if (!selectedClass || !selectedSubject || !selectedTerm || !selectedSession) {
      toast({ variant: 'destructive', title: 'Missing Filters', description: 'Please select class, subject, term, and session.' });
      return;
    }
    setIsLoading(true);
    try {
      const termObj = terms.find(t => t.id === selectedTerm);
      const sessionObj = sessions.find(s => s.id === selectedSession);
      
      const [stuRes, scoreRes] = await Promise.all([
        getStudents(selectedClass),
        getScoresByClassSubjectAndTerm(selectedClass, selectedSubject, termObj?.name, sessionObj?.name)
      ]);

      if (stuRes.success && stuRes.data) {
        setStudents(stuRes.data);
        const scoreMap: Record<string, ScoreEntry> = {};
        for (const s of stuRes.data) {
          const existing = scoreRes.scores?.find((sc: any) => sc.studentId === s.id);
          scoreMap[s.id] = {
            studentId: s.id,
            ca1: existing?.ca1 != null ? String(existing.ca1) : '',
            ca2: existing?.ca2 != null ? String(existing.ca2) : '',
            exam: existing?.exam != null ? String(existing.exam) : '',
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

  const updateScore = (studentId: string, field: keyof ScoreEntry, value: string) => {
    setScores(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value }
    }));
    setDirty(prev => new Set(prev).add(studentId));
  };

  const handleSave = async () => {
    if (dirty.size === 0) return;
    setIsSaving(true);
    try {
      const toSave = Array.from(dirty).map(studentId => ({
        studentId,
        subjectId: selectedSubject,
        termId: selectedTerm,
        ca1: scores[studentId].ca1 === '' ? undefined : parseFloat(scores[studentId].ca1),
        ca2: scores[studentId].ca2 === '' ? undefined : parseFloat(scores[studentId].ca2),
        exam: scores[studentId].exam === '' ? undefined : parseFloat(scores[studentId].exam),
      }));

      const res = await saveScores(toSave);
      if (res.success) {
        toast({ title: 'Saved', description: 'Scores successfully saved.' });
        setDirty(new Set());
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const calculateTotal = (studentId: string) => {
    const s = scores[studentId];
    if (!s) return 0;
    return (parseFloat(s.ca1) || 0) + (parseFloat(s.ca2) || 0) + (parseFloat(s.exam) || 0);
  };

  const getGrade = (total: number) => {
    if (total >= 75) return 'A1';
    if (total >= 70) return 'B2';
    if (total >= 65) return 'B3';
    if (total >= 60) return 'C4';
    if (total >= 55) return 'C5';
    if (total >= 50) return 'C6';
    if (total >= 45) return 'D7';
    if (total >= 40) return 'E8';
    return 'F9';
  };

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/50 p-6 rounded-3xl border border-slate-800 backdrop-blur-sm shadow-xl shadow-black/10"
      >
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Basic Score Entry</h1>
          <p className="text-slate-400 mt-1">
            Quick entry for CA1 (20), CA2 (20), and Exam (60).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/dashboard/scores/gradebook">
            <Button variant="outline" className="border-slate-700 text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-xl h-10">
              Use Advanced Gradebook <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <AnimatePresence>
            {isLoaded && dirty.size > 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                >
                    <Button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 transition-all rounded-xl h-10">
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save {dirty.size} Changes
                    </Button>
                </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="bg-slate-900/40 border-slate-800 shadow-none rounded-3xl overflow-hidden backdrop-blur-sm">
            <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div className="space-y-2">
                <Label className="text-slate-400">Session</Label>
                <Select value={selectedSession} onValueChange={setSelectedSession}>
                    <SelectTrigger className="bg-slate-950/50 border-slate-700 text-slate-200 rounded-xl h-10"><SelectValue placeholder="Select session" /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">{sessions.map(s => <SelectItem key={s.id} value={s.id} className="hover:bg-slate-800 focus:bg-slate-800">{s.name}</SelectItem>)}</SelectContent>
                </Select>
                </div>
                <div className="space-y-2">
                <Label className="text-slate-400">Term</Label>
                <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                    <SelectTrigger className="bg-slate-950/50 border-slate-700 text-slate-200 rounded-xl h-10"><SelectValue placeholder="Select term" /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">{terms.map(t => <SelectItem key={t.id} value={t.id} className="hover:bg-slate-800 focus:bg-slate-800">{t.name}</SelectItem>)}</SelectContent>
                </Select>
                </div>
                <div className="space-y-2">
                <Label className="text-slate-400">Class</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="bg-slate-950/50 border-slate-700 text-slate-200 rounded-xl h-10"><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">{classes.map(c => <SelectItem key={c.id} value={c.id} className="hover:bg-slate-800 focus:bg-slate-800">{c.name}</SelectItem>)}</SelectContent>
                </Select>
                </div>
                <div className="space-y-2">
                <Label className="text-slate-400">Subject</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger className="bg-slate-950/50 border-slate-700 text-slate-200 rounded-xl h-10"><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">{subjects.map(s => <SelectItem key={s.id} value={s.id} className="hover:bg-slate-800 focus:bg-slate-800">{s.name}</SelectItem>)}</SelectContent>
                </Select>
                </div>
                <Button onClick={loadStudents} disabled={isLoading} className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-10">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BookOpen className="h-4 w-4 mr-2" />}
                Load Students
                </Button>
            </div>
            </CardContent>
        </Card>
      </motion.div>

      <AnimatePresence>
      {isLoaded && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} exit={{ opacity: 0, y: -20 }}>
            <Card className="bg-slate-900/40 border-slate-800 shadow-none rounded-3xl overflow-hidden backdrop-blur-sm">
            <CardHeader className="bg-slate-900/50 border-b border-slate-800 p-6">
                <CardTitle className="text-xl font-bold text-white">Student Scores</CardTitle>
                <CardDescription className="text-slate-400">{students.length} students found.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                <Table>
                <TableHeader className="bg-slate-950/50">
                    <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="font-bold text-slate-400 py-4 px-6 w-32">Student ID</TableHead>
                    <TableHead className="font-bold text-slate-400 py-4">Student Name</TableHead>
                    <TableHead className="w-24 text-center font-bold text-slate-400 py-4">CA1 (20)</TableHead>
                    <TableHead className="w-24 text-center font-bold text-slate-400 py-4">CA2 (20)</TableHead>
                    <TableHead className="w-24 text-center font-bold text-slate-400 py-4">Exam (60)</TableHead>
                    <TableHead className="w-24 text-center font-bold text-slate-400 py-4">Total</TableHead>
                    <TableHead className="w-24 text-center pr-6 font-bold text-slate-400 py-4">Grade</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {students.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="h-48 text-center text-slate-500">
                                <div className="flex flex-col items-center justify-center">
                                    <AlertCircle className="w-12 h-12 text-slate-700 mb-4" />
                                    <p className="text-lg font-medium text-slate-400">No students found.</p>
                                    <p className="text-sm">Verify the selected class has enrolled students.</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        students.map((student, idx) => {
                        const total = calculateTotal(student.id);
                        const s = scores[student.id];
                        const isEdited = dirty.has(student.id);
                        return (
                            <TableRow key={student.id} className="border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                            <TableCell className="px-6 py-4 font-mono text-xs text-slate-500 tracking-widest">{student.studentId || '-'}</TableCell>
                            <TableCell className="py-4">
                                <div className="font-bold text-slate-200">{student.lastName}, {student.firstName}</div>
                                {isEdited && <div className="text-[10px] text-emerald-400 font-medium uppercase mt-1 tracking-wider">Unsaved Changes</div>}
                            </TableCell>
                            <TableCell className="py-4">
                                <Input type="number" min="0" max="20" value={s?.ca1 || ''} onChange={e => updateScore(student.id, 'ca1', e.target.value)} className={`h-10 text-center rounded-xl bg-slate-950/50 border-slate-700 text-white focus-visible:ring-violet-500 ${isEdited ? 'border-emerald-500/50 ring-1 ring-emerald-500/20' : ''}`} />
                            </TableCell>
                            <TableCell className="py-4">
                                <Input type="number" min="0" max="20" value={s?.ca2 || ''} onChange={e => updateScore(student.id, 'ca2', e.target.value)} className={`h-10 text-center rounded-xl bg-slate-950/50 border-slate-700 text-white focus-visible:ring-violet-500 ${isEdited ? 'border-emerald-500/50 ring-1 ring-emerald-500/20' : ''}`} />
                            </TableCell>
                            <TableCell className="py-4">
                                <Input type="number" min="0" max="60" value={s?.exam || ''} onChange={e => updateScore(student.id, 'exam', e.target.value)} className={`h-10 text-center rounded-xl bg-slate-950/50 border-slate-700 text-white focus-visible:ring-violet-500 ${isEdited ? 'border-emerald-500/50 ring-1 ring-emerald-500/20' : ''}`} />
                            </TableCell>
                            <TableCell className="text-center font-bold text-lg text-white py-4">{total}</TableCell>
                            <TableCell className="text-center pr-6 py-4">
                                {total > 0 ? (
                                    <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                                        total >= 70 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                        total >= 50 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                        'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                    }`}>
                                        {getGrade(total)}
                                    </span>
                                ) : <span className="text-slate-600">-</span>}
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
