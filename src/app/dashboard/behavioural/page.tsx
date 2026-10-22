'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getAcademicData } from '@/actions/academic-data';
import { getBehaviouralAssessments, saveBehaviouralAssessments } from '@/actions/behavioural-actions';
import {
  Save,
  Loader2,
  Users,
  Heart,
  BookOpen,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Wand2,
  Search,
  MessageSquare,
} from 'lucide-react';
import { useRole } from '@/context/role-context';
import { motion, AnimatePresence } from 'framer-motion';

const TRAITS = [
  { key: 'conduct', label: 'Conduct' },
  { key: 'punctuality', label: 'Punctuality' },
  { key: 'dedication', label: 'Dedication' },
  { key: 'participation', label: 'Participation' },
  { key: 'hospitality', label: 'Hospitality' },
  { key: 'neatness', label: 'Neatness' },
  { key: 'creativity', label: 'Creativity' },
  { key: 'physical', label: 'Physical Dev.' },
] as const;

export default function BehaviouralPage() {
  const { role } = useRole();
  const userRole = (role || '').toUpperCase();
  const canEdit = ['TEACHER', 'ADMIN', 'SUPER_ADMIN', 'EXAM_OFFICER', 'HOD'].includes(userRole);
  const { toast } = useToast();

  const [classes, setClasses] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState('');

  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [assessments, setAssessments] = useState<Record<string, Record<string, number | null>>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const acadRes = await getAcademicData();
      setClasses(acadRes.classes || []);
      setTerms(acadRes.terms || []);
      setSessions(acadRes.sessions || []);

      const activeTerm = acadRes.terms?.find((t: any) => t.isActive) || acadRes.terms?.[0];
      const activeSession = acadRes.sessions?.find((s: any) => s.isActive) || acadRes.sessions?.[0];

      if (activeTerm) setSelectedTerm(activeTerm.id);
      if (activeSession) setSelectedSession(activeSession.name || activeSession.id);
    })();
  }, []);

  const loadData = async () => {
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
      const res = await getBehaviouralAssessments(selectedClass, selectedTerm, selectedSession);
      if (res.success) {
        setStudents(res.students || []);

        const assessMap: Record<string, Record<string, number | null>> = {};
        const commentMap: Record<string, string> = {};

        // Default: unassessed (null) so empty state is clearly visible
        res.students?.forEach((s: any) => {
          assessMap[s.id] = {
            conduct: null,
            punctuality: null,
            dedication: null,
            participation: null,
            hospitality: null,
            neatness: null,
            creativity: null,
            physical: null,
          };
          commentMap[s.id] = '';
        });

        // Overlay existing recorded assessments from database
        for (const a of res.assessments || []) {
          if (assessMap[a.studentId]) {
            assessMap[a.studentId] = {
              conduct: a.conduct ?? null,
              punctuality: a.punctuality ?? null,
              dedication: a.dedication ?? null,
              participation: a.participation ?? null,
              hospitality: a.hospitality ?? null,
              neatness: a.neatness ?? null,
              creativity: a.creativity ?? null,
              physical: a.physical ?? null,
            };
            if (a.comment) {
              commentMap[a.studentId] = a.comment;
            }
          }
        }

        setAssessments(assessMap);
        setComments(commentMap);
        setDirty(new Set());
        setIsLoaded(true);
      } else {
        throw new Error(res.message || 'Failed to load assessments');
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const updateScore = (studentId: string, trait: string, value: number) => {
    if (!canEdit) return;
    setAssessments(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [trait]: value,
      },
    }));
    setDirty(prev => new Set(prev).add(studentId));
  };

  const handleCommentChange = (studentId: string, text: string) => {
    if (!canEdit) return;
    setComments(prev => ({
      ...prev,
      [studentId]: text,
    }));
    setDirty(prev => new Set(prev).add(studentId));
  };

  const handleSetAllDefault = () => {
    if (!canEdit || students.length === 0) return;
    const updated: Record<string, Record<string, number | null>> = {};
    const newDirty = new Set<string>();

    students.forEach(s => {
      updated[s.id] = {
        conduct: 3,
        punctuality: 3,
        dedication: 3,
        participation: 3,
        hospitality: 3,
        neatness: 3,
        creativity: 3,
        physical: 3,
      };
      newDirty.add(s.id);
    });

    setAssessments(updated);
    setDirty(newDirty);
    toast({
      title: 'Defaults Applied',
      description: 'All 8 traits for all candidates set to 3 (Good). Click Save Changes to record.',
    });
  };

  const handleSave = async () => {
    if (dirty.size === 0) return;
    setIsSaving(true);
    try {
      const toSave = Array.from(dirty).map(studentId => {
        const data = assessments[studentId] || {};
        return {
          studentId,
          conduct: data.conduct ?? 3,
          punctuality: data.punctuality ?? 3,
          dedication: data.dedication ?? 3,
          participation: data.participation ?? 3,
          hospitality: data.hospitality ?? 3,
          neatness: data.neatness ?? 3,
          creativity: data.creativity ?? 3,
          physical: data.physical ?? 3,
          comment: comments[studentId] || null,
        };
      });

      const res = await saveBehaviouralAssessments(selectedTerm, selectedSession, toSave);
      if (res.success) {
        toast({
          title: 'Assessments Saved',
          description: `Successfully saved ratings and remarks for ${toSave.length} candidate(s).`,
        });
        setDirty(new Set());
      } else {
        throw new Error(res.message || 'Failed to save');
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

  const completionStats = useMemo(() => {
    if (!students || students.length === 0) return { total: 0, completed: 0, percentage: 0 };
    const completed = students.filter(s => {
      const a = assessments[s.id];
      return a && Object.values(a).every(v => v != null && v >= 1 && v <= 5);
    }).length;

    return {
      total: students.length,
      completed,
      percentage: Math.round((completed / students.length) * 100),
    };
  }, [students, assessments]);

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
              Behavioural & Affective Assessment
            </h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-semibold">
              <Heart className="w-3 h-3 mr-1" /> 8 Evaluated Traits
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Affective & Psychomotor Traits: Conduct • Punctuality • Dedication • Participation • Hospitality • Neatness • Creativity • Physical
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isLoaded && canEdit && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSetAllDefault}
                className="rounded-xl border-border"
              >
                <Wand2 className="h-4 w-4 mr-2" /> Fill All Good (3)
              </Button>

              <Button
                onClick={handleSave}
                disabled={isSaving || dirty.size === 0}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-sm font-semibold"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes {dirty.size > 0 ? `(${dirty.size})` : ''}
              </Button>
            </>
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
              onClick={loadData}
              disabled={isLoading || !selectedClass || !selectedTerm || !selectedSession}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-10 font-semibold"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BookOpen className="h-4 w-4 mr-2" />}
              Load Candidates
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Completion & Scale Legend Bar */}
      {isLoaded && students.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border">
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="font-semibold text-foreground">{completionStats.completed}</span>
              <span className="text-muted-foreground"> of {completionStats.total} candidates fully evaluated ({completionStats.percentage}%)</span>
            </div>
            {dirty.size > 0 && (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs">
                <Sparkles className="w-3 h-3 mr-1" /> {dirty.size} unsaved
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Scale Key:</span>
            <span>1 = Poor</span>
            <span>•</span>
            <span>2 = Fair</span>
            <span>•</span>
            <span>3 = Good</span>
            <span>•</span>
            <span>4 = Very Good</span>
            <span>•</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">5 = Excellent</span>
          </div>
        </div>
      )}

      {/* Assessment Matrix Grid */}
      <AnimatePresence>
        {isLoaded && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-card border-border shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="p-4 md:p-6 border-b border-border bg-card flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <CardTitle className="text-lg font-bold text-foreground">Assessment Matrix</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Click any Likert number pill (1-5) to rate traits. Provide qualitative Form Teacher comments on the right.
                  </CardDescription>
                </div>
                {/* Search Bar */}
                <div className="relative w-full sm:w-60">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Filter student name or ID..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 bg-background border-border text-foreground text-xs rounded-xl h-9"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse min-w-[1000px]">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-xs font-bold text-muted-foreground">
                        <th className="p-3 w-10 text-center">#</th>
                        <th className="p-3 sticky left-0 z-10 bg-muted/40 min-w-[180px] border-r border-border">
                          Candidate
                        </th>
                        {TRAITS.map(t => (
                          <th key={t.key} className="p-2.5 text-center min-w-[110px] border-r border-border font-semibold text-[11px]">
                            {t.label}
                          </th>
                        ))}
                        <th className="p-3 min-w-[220px] font-semibold text-xs">Form Teacher Comment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="h-40 text-center text-muted-foreground p-8">
                            <div className="flex flex-col items-center justify-center">
                              <AlertCircle className="w-8 h-8 text-muted-foreground mb-2 opacity-50" />
                              <p className="font-semibold text-foreground text-sm">
                                {students.length === 0 ? 'No students found in this class.' : 'No candidates match your query.'}
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((student, idx) => {
                          const isEdited = dirty.has(student.id);

                          return (
                            <tr
                              key={student.id}
                              className={`hover:bg-muted/30 transition-colors ${
                                isEdited ? 'bg-primary/5' : ''
                              }`}
                            >
                              <td className="p-3 text-center font-mono text-xs text-muted-foreground">
                                {idx + 1}
                              </td>
                              <td className="p-3 font-medium sticky left-0 z-10 border-r border-border bg-card">
                                <div className="font-semibold text-xs text-foreground">
                                  {student.lastName}, {student.firstName}
                                </div>
                                <div className="text-[10px] font-mono text-muted-foreground">
                                  {student.studentId || '-'}
                                </div>
                              </td>

                              {TRAITS.map(trait => {
                                const currentVal = assessments[student.id]?.[trait.key];
                                return (
                                  <td key={trait.key} className="p-2 border-r border-border text-center align-middle">
                                    <div className="inline-flex rounded-lg p-0.5 bg-muted/60 border border-border">
                                      {[1, 2, 3, 4, 5].map(n => (
                                        <button
                                          key={n}
                                          type="button"
                                          disabled={!canEdit}
                                          onClick={() => updateScore(student.id, trait.key, n)}
                                          className={`w-5 h-5 rounded text-[11px] font-semibold transition-all ${
                                            currentVal === n
                                              ? n >= 4
                                                ? 'bg-emerald-600 text-white shadow-sm font-bold'
                                                : n === 3
                                                ? 'bg-primary text-primary-foreground shadow-sm font-bold'
                                                : 'bg-amber-600 text-white shadow-sm font-bold'
                                              : 'text-muted-foreground hover:text-foreground hover:bg-background/80'
                                          } ${!canEdit ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                                          title={`Rate ${n} for ${trait.label}`}
                                        >
                                          {n}
                                        </button>
                                      ))}
                                    </div>
                                  </td>
                                );
                              })}

                              {/* Qualitative Comment Input */}
                              <td className="p-2 align-middle">
                                <Input
                                  placeholder="e.g. Well-mannered and respectful..."
                                  value={comments[student.id] || ''}
                                  onChange={e => handleCommentChange(student.id, e.target.value)}
                                  disabled={!canEdit}
                                  className="h-8 text-xs bg-background border-border text-foreground rounded-lg"
                                />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
