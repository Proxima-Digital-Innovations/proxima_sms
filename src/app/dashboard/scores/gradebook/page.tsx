'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { DynamicTitle } from '@/components/dashboard/dynamic-title';
import { getGradebookData, createGradebookAssignment, saveGradebookScores, getAssignmentCategories } from '@/actions/gradebook-actions';
import { getAcademicData } from '@/actions/academic-data';
import { PlusCircle, Save, Loader2, Grid3X3, BarChart3, AlertCircle } from 'lucide-react';

interface ScoreCell {
  studentId: string;
  assignmentId: string;
  score: string;
  original: number | null;
}

export default function GradebookPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const { toast } = useToast();

  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');

  const [students, setStudents] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [scores, setScores] = useState<Record<string, ScoreCell>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const [newAssignment, setNewAssignment] = useState({ title: '', categoryId: '', maxScore: '100' });

  useEffect(() => {
    (async () => {
      const [acadRes, catRes] = await Promise.all([getAcademicData(), getAssignmentCategories()]);
      setSubjects(acadRes.subjects || []);
      setClasses(acadRes.classes || []);
      setTerms(acadRes.terms || []);
      if (catRes.success) setCategories(catRes.categories || []);
    })();
  }, []);

  const loadGradebook = async () => {
    if (!selectedClass || !selectedSubject || !selectedTerm) {
      toast({ variant: 'destructive', title: 'Select All Filters', description: 'Pick a class, subject, and term.' });
      return;
    }
    setIsLoading(true);
    try {
      const res = await getGradebookData(selectedClass, selectedSubject, selectedTerm);
      if (res.success) {
        setStudents(res.students);
        setAssignments(res.assignments);
        setCategories(res.categories);

        const scoreMap: Record<string, ScoreCell> = {};
        for (const a of res.assignments) {
          for (const s of res.students) {
            const key = `${s.id}__${a.id}`;
            const existing = a.scores?.find((sc: any) => sc.studentId === s.id);
            scoreMap[key] = {
              studentId: s.id,
              assignmentId: a.id,
              score: existing?.score != null ? String(existing.score) : '',
              original: existing?.score ?? null,
            };
          }
        }
        setScores(scoreMap);
        setDirty(new Set());
        setIsLoaded(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateScore = (key: string, value: string) => {
    setScores(prev => ({ ...prev, [key]: { ...prev[key], score: value } }));
    setDirty(prev => new Set(prev).add(key));
  };

  const handleSave = async () => {
    if (dirty.size === 0) {
      toast({ title: 'No Changes', description: 'Nothing to save.' });
      return;
    }
    setIsSaving(true);
    try {
      const byAssignment: Record<string, Array<{ studentId: string; score: number | null }>> = {};
      for (const key of dirty) {
        const cell = scores[key];
        if (!cell) continue;
        if (!byAssignment[cell.assignmentId]) byAssignment[cell.assignmentId] = [];
        byAssignment[cell.assignmentId].push({
          studentId: cell.studentId,
          score: cell.score === '' ? null : parseFloat(cell.score),
        });
      }
      for (const [assignmentId, scoreEntries] of Object.entries(byAssignment)) {
        await saveGradebookScores(assignmentId, scoreEntries);
      }
      toast({ title: 'Saved', description: `${dirty.size} scores updated.` });
      setDirty(new Set());
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddAssignment = async () => {
    if (!newAssignment.title || !newAssignment.categoryId) {
      toast({ variant: 'destructive', title: 'Required', description: 'Enter title and category.' });
      return;
    }
    try {
      const res = await createGradebookAssignment({
        title: newAssignment.title,
        categoryId: newAssignment.categoryId,
        subjectId: selectedSubject,
        classId: selectedClass,
        termId: selectedTerm,
        maxScore: parseFloat(newAssignment.maxScore) || 100,
        createdById: userId,
      });
      if (res.success) {
        toast({ title: 'Added', description: 'Assignment column added.' });
        setAddOpen(false);
        setNewAssignment({ title: '', categoryId: '', maxScore: '100' });
        loadGradebook();
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  };

  const getScoreColor = (value: string, max: number) => {
    if (!value) return 'bg-slate-50';
    const pct = (parseFloat(value) / max) * 100;
    if (pct >= 75) return 'bg-emerald-50 border-emerald-200';
    if (pct >= 50) return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
  };

  const computeStudentTotal = (studentId: string): { total: number; percentage: number } => {
    if (assignments.length === 0) return { total: 0, percentage: 0 };
    let weightedSum = 0;
    const catTotals: Record<string, { earned: number; possible: number; weight: number }> = {};
    for (const cat of categories) {
      catTotals[cat.id] = { earned: 0, possible: 0, weight: cat.weight };
    }
    for (const a of assignments) {
      const key = `${studentId}__${a.id}`;
      const cell = scores[key];
      const val = cell?.score ? parseFloat(cell.score) : 0;
      if (catTotals[a.categoryId]) {
        catTotals[a.categoryId].earned += val;
        catTotals[a.categoryId].possible += a.maxScore;
      }
    }
    for (const cat of Object.values(catTotals)) {
      if (cat.possible > 0) {
        weightedSum += (cat.earned / cat.possible) * 100 * cat.weight;
      }
    }
    return { total: Math.round(weightedSum * 10) / 10, percentage: weightedSum };
  };

  const getGrade = (pct: number) => {
    if (pct >= 75) return 'A1';
    if (pct >= 70) return 'B2';
    if (pct >= 65) return 'B3';
    if (pct >= 60) return 'C4';
    if (pct >= 55) return 'C5';
    if (pct >= 50) return 'C6';
    if (pct >= 45) return 'D7';
    if (pct >= 40) return 'E8';
    return 'F9';
  };

  const groupedAssignments = categories.map(cat => ({
    category: cat,
    items: assignments.filter(a => a.categoryId === cat.id),
  })).filter(g => g.items.length > 0);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <DynamicTitle breadcrumbs={[
        { label: 'Scores', href: '/dashboard/scores' },
        { label: 'Gradebook', href: '/dashboard/scores/gradebook' },
      ]} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            Gradebook
          </h2>
          <p className="text-muted-foreground mt-1">Enter and manage scores by assignment with weighted categories.</p>
        </div>
        {isLoaded && dirty.size > 0 && (
          <Button onClick={handleSave} disabled={isSaving} className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save {dirty.size} Changes
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label>Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <Label>Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <Label>Term</Label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
                <SelectContent>{terms.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={loadGradebook} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Grid3X3 className="h-4 w-4 mr-2" />}
              Load Gradebook
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Gradebook Grid */}
      {isLoaded && (
        <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm">
          <CardHeader className="border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Score Grid</CardTitle>
              <CardDescription>{students.length} students · {assignments.length} assignments</CardDescription>
            </div>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                  <PlusCircle className="h-4 w-4 mr-2" /> Add Assignment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Assignment Column</DialogTitle>
                  <DialogDescription>Create a new gradeable assignment.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input placeholder="e.g. CA1 Test - Week 3" value={newAssignment.title} onChange={e => setNewAssignment(p => ({ ...p, title: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={newAssignment.categoryId} onValueChange={v => setNewAssignment(p => ({ ...p, categoryId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {categories.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name} ({Math.round(c.weight * 100)}%)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Max Score</Label>
                    <Input type="number" value={newAssignment.maxScore} onChange={e => setNewAssignment(p => ({ ...p, maxScore: e.target.value }))} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddAssignment} className="bg-indigo-600 hover:bg-indigo-700">Add</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {assignments.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <AlertCircle className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                <p className="font-medium">No assignments yet</p>
                <p className="text-sm">Click &quot;Add Assignment&quot; to create gradebook columns.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  {/* Category header row */}
                  <tr className="border-b bg-slate-100">
                    <th className="text-left p-3 sticky left-0 bg-slate-100 z-10 min-w-[200px]">Student</th>
                    {groupedAssignments.map(g => (
                      <th key={g.category.id} colSpan={g.items.length} className="text-center p-2 border-l border-slate-200">
                        <span className="font-semibold text-xs uppercase tracking-wider text-slate-600">
                          {g.category.name}
                        </span>
                        <Badge variant="secondary" className="ml-2 text-xs">{Math.round(g.category.weight * 100)}%</Badge>
                      </th>
                    ))}
                    <th className="text-center p-2 border-l bg-indigo-50 min-w-[70px]">Total</th>
                    <th className="text-center p-2 bg-indigo-50 min-w-[60px]">Grade</th>
                  </tr>
                  {/* Assignment header row */}
                  <tr className="border-b bg-white">
                    <th className="text-left p-2 sticky left-0 bg-white z-10" />
                    {assignments.map(a => (
                      <th key={a.id} className="text-center p-2 border-l text-xs text-muted-foreground font-normal min-w-[80px]">
                        <div className="truncate max-w-[80px]" title={a.title}>{a.title}</div>
                        <div className="text-[10px] text-slate-400">/{a.maxScore}</div>
                      </th>
                    ))}
                    <th className="border-l bg-indigo-50" />
                    <th className="bg-indigo-50" />
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, idx) => {
                    const { total, percentage } = computeStudentTotal(student.id);
                    const grade = getGrade(percentage);
                    return (
                      <tr key={student.id} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/30 transition-colors`}>
                        <td className="p-2 sticky left-0 z-10 font-medium text-sm" style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                          {student.lastName}, {student.firstName}
                        </td>
                        {assignments.map(a => {
                          const key = `${student.id}__${a.id}`;
                          const cell = scores[key];
                          return (
                            <td key={a.id} className={`p-1 border-l ${getScoreColor(cell?.score || '', a.maxScore)}`}>
                              <Input
                                type="number"
                                min="0"
                                max={a.maxScore}
                                step="0.5"
                                value={cell?.score || ''}
                                onChange={e => updateScore(key, e.target.value)}
                                className="h-8 w-full text-center text-sm border-0 bg-transparent focus:bg-white focus:ring-2 focus:ring-indigo-300"
                                placeholder="—"
                              />
                            </td>
                          );
                        })}
                        <td className="p-2 text-center font-bold border-l bg-indigo-50/50">{total}</td>
                        <td className="p-2 text-center bg-indigo-50/50">
                          <Badge variant={percentage >= 50 ? 'default' : 'destructive'} className="text-xs">
                            {grade}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Category Legend */}
      {isLoaded && categories.length > 0 && (
        <Card className="border-none shadow-md bg-white/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <h4 className="font-semibold text-sm text-muted-foreground mb-3">Grading Weights</h4>
            <div className="flex flex-wrap gap-4">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg">
                  <BarChart3 className="h-4 w-4 text-indigo-500" />
                  <span className="text-sm font-medium">{cat.name}</span>
                  <Badge variant="secondary">{Math.round(cat.weight * 100)}%</Badge>
                  <span className="text-xs text-muted-foreground">(max {cat.maxScore})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
