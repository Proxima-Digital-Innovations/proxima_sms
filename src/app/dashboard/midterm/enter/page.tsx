'use client';

import { useState, useEffect, useMemo } from 'react';
import { getAcademicData } from '@/actions/academic-data';
import { getMidtermResults, saveMidtermResults, calculateMidtermAchievement } from '@/actions/midterm-actions';
import { getStudents } from '@/actions/student-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Save, ArrowLeft, BookOpen, Search } from 'lucide-react';
import Link from 'next/link';

type Student = {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  classLevel: string;
};

type ResultEntry = {
  studentId: string;
  score: string;
  achievement: string;
};

export default function MidtermEntryPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [results, setResults] = useState<Record<string, ResultEntry>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const data = await getAcademicData();
      setSubjects(data.subjects || []);
      setClasses(data.classes || []);
      setTerms(data.terms || []);
      setSessions(data.sessions || []);

      const activeTerm = data.terms?.find((t: any) => t.isActive) || data.terms?.[0];
      const activeSession = data.sessions?.find((s: any) => s.isActive) || data.sessions?.[0];

      if (activeTerm) setSelectedTerm(activeTerm.name || activeTerm.id);
      if (activeSession) setSelectedSession(activeSession.name || activeSession.id);
    })();
  }, []);

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

  const handleClassChange = (newClass: string) => {
    setSelectedClass(newClass);
    setStudents([]);
    setResults({});

    const classObj = classes.find(c => c.id === newClass || c.name === newClass);
    if (classObj?.subjectIds) {
      try {
        const ids: string[] = JSON.parse(classObj.subjectIds);
        if (Array.isArray(ids) && ids.length > 0 && selectedSubject && !ids.includes(selectedSubject)) {
          setSelectedSubject('');
        }
      } catch {}
    }
  };

  const loadStudents = async () => {
    if (!selectedClass || !selectedSubject) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select both a class and a subject.' });
      return;
    }

    setIsLoading(true);
    try {
      const classObj = classes.find(c => c.id === selectedClass || c.name === selectedClass);
      if (!classObj) {
        toast({ variant: 'destructive', title: 'Error', description: 'Class not found in academic records.' });
        return;
      }

      const studentsRes = await getStudents(classObj.id);
      if (!studentsRes.success) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load class cohort.' });
        return;
      }
      const studentsData = (studentsRes.data || []).filter((s: any) => s.status === 'Active' || s.status === 'ACTIVE') as any[];
      setStudents(studentsData);

      const existingResultsRes = await getMidtermResults(classObj.id, selectedTerm, selectedSubject, selectedSession);
      const existingResultsMap: Record<string, ResultEntry> = {};

      if (existingResultsRes && existingResultsRes.results) {
        existingResultsRes.results.forEach((r: any) => {
          existingResultsMap[r.studentId] = {
            studentId: r.studentId,
            score: r.score != null ? String(r.score) : '',
            achievement: r.achievement || '',
          };
        });
      }

      const initialResults: Record<string, ResultEntry> = {};
      studentsData.forEach(student => {
        initialResults[student.id] = existingResultsMap[student.id] || {
          studentId: student.id,
          score: '',
          achievement: 'Not Assessed',
        };
      });

      setResults(initialResults);
    } catch (error) {
      console.error('Error loading students:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load students.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleScoreChange = async (studentId: string, val: string) => {
    if (val !== '') {
      const num = parseFloat(val);
      if (isNaN(num) || num < 0 || num > 20) return;
      const achievement = await calculateMidtermAchievement(num);
      setResults(prev => ({
        ...prev,
        [studentId]: {
          studentId,
          score: val,
          achievement,
        },
      }));
    } else {
      setResults(prev => ({
        ...prev,
        [studentId]: {
          studentId,
          score: '',
          achievement: 'Not Assessed',
        },
      }));
    }
  };

  const handleSave = async () => {
    if (!selectedSubject) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a subject.' });
      return;
    }

    setIsSaving(true);
    try {
      const selectedSubjectData = subjects.find(s => s.id === selectedSubject);

      const resultsToSave = Object.values(results).map(r => {
        const student = students.find(s => s.id === r.studentId);
        const isBlank = r.score === '' || r.score == null;
        return {
          studentId: r.studentId,
          studentName: student ? `${student.firstName} ${student.lastName}` : '',
          subjectId: selectedSubject,
          subjectName: selectedSubjectData?.name || '',
          class: selectedClass,
          term: selectedTerm,
          session: selectedSession,
          score: isBlank ? null : parseFloat(r.score),
          achievement: isBlank ? 'Not Assessed' : r.achievement,
        };
      });

      await saveMidtermResults(resultsToSave);
      toast({ title: 'Success', description: 'Midterm scores successfully saved!' });
    } catch (error) {
      console.error('Error saving results:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save results.' });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(s =>
      `${s.firstName} ${s.lastName} ${s.studentId}`.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Direct Mid-Term Score Entry
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter marks (0-20) for continuous assessment.
          </p>
        </div>
        <Link href="/dashboard/midterm">
          <Button variant="outline" size="sm" className="rounded-xl border-border">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Gradebook
          </Button>
        </Link>
      </div>

      <Card className="bg-card border-border shadow-sm rounded-2xl">
        <CardHeader className="p-6 border-b border-border">
          <CardTitle className="text-base font-bold text-foreground">Select Parameters</CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Choose class, curriculum subject, term, and academic session.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Session</Label>
              <Select value={selectedSession} onValueChange={setSelectedSession}>
                <SelectTrigger className="rounded-xl border-border bg-background h-10 text-xs">
                  <SelectValue placeholder="Select Session" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {sessions.map(s => (
                    <SelectItem key={s.id} value={s.name || s.id} className="text-xs">
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
                  <SelectValue placeholder="Select Term" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {terms.map(t => (
                    <SelectItem key={t.id} value={t.name || t.id} className="text-xs">
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Class</Label>
              <Select value={selectedClass} onValueChange={handleClassChange}>
                <SelectTrigger className="rounded-xl border-border bg-background h-10 text-xs">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id} className="text-xs">
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="rounded-xl border-border bg-background h-10 text-xs">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {availableSubjects.map(subject => (
                    <SelectItem key={subject.id} value={subject.id} className="text-xs">
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={loadStudents}
            disabled={isLoading || !selectedClass || !selectedSubject}
            className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground h-10 font-semibold shadow-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading Candidates...
              </>
            ) : (
              <>
                <BookOpen className="mr-2 h-4 w-4" />
                Load Students
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {students.length > 0 && (
        <Card className="bg-card border-border shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="p-6 border-b border-border flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div>
              <CardTitle className="text-base font-bold text-foreground">Enter Scores</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                {students.length} candidates loaded in cohort.
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-60">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filter name or ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 bg-background border-border text-foreground text-xs rounded-xl h-9"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border bg-muted/40">
                  <TableHead className="w-12 text-center text-xs font-bold text-muted-foreground">#</TableHead>
                  <TableHead className="w-32 text-xs font-bold text-muted-foreground">Student ID</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground">Candidate Name</TableHead>
                  <TableHead className="w-36 text-center text-xs font-bold text-muted-foreground">
                    Score (0-20)
                  </TableHead>
                  <TableHead className="w-48 text-left text-xs font-bold text-muted-foreground pr-6">
                    Achievement
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student, idx) => (
                  <TableRow key={student.id} className="border-border hover:bg-muted/30">
                    <TableCell className="text-center font-mono text-xs text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {student.studentId || '-'}
                    </TableCell>
                    <TableCell className="font-semibold text-sm text-foreground">
                      {student.firstName} {student.lastName}
                    </TableCell>
                    <TableCell className="p-2 text-center">
                      <Input
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        placeholder="-"
                        value={results[student.id]?.score ?? ''}
                        onChange={e => handleScoreChange(student.id, e.target.value)}
                        className="w-24 text-center font-semibold rounded-lg bg-background border-border text-foreground text-sm mx-auto"
                      />
                    </TableCell>
                    <TableCell className="pr-6">
                      <span className="text-xs font-medium text-foreground">
                        {results[student.id]?.achievement || 'Not Assessed'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="p-4 border-t border-border">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-10 font-semibold shadow-sm"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving Marks...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Mid-Term Marks
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
