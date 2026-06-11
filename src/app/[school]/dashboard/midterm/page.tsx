'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAcademicData } from '@/hooks/use-academic-data';
import { useRole } from '@/context/role-context';
import { Skeleton } from '@/components/ui/skeleton';
import { Save, Loader2 } from 'lucide-react';

// Server actions — no direct Firebase usage in client components
import { getStudentsByClass } from '@/actions/student-actions';
import { getMidtermResults, saveMidtermResults } from '@/actions/midterm-actions';

/**
 * Inline student type with only the fields used on this page.
 * Avoids importing the Firebase-based schema type.
 */
type StudentSlim = {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
};

/** Options for the achievement level dropdown. */
const achievementOptions = ['Excellent', 'Good', 'Fair', 'Poor'];

/** Hardcoded academic term and session for data fetching and saving. */
const TERM = 'First Term';
const SESSION = '2024/2025';

export default function MidTermPage() {
  const { role } = useRole();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  // List of slim student objects for the selected class
  const [students, setStudents] = useState<StudentSlim[]>([]);
  // Map of display studentId -> score/achievement entry (with optional existing record id)
  const [scores, setScores] = useState<Record<string, { score: number; achievement: string; id?: string }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { classes, subjects, isLoading: isAcademicDataLoading } = useAcademicData();

  /**
   * Loads students and their existing midterm scores for the given class+subject.
   * Uses server actions instead of Firebase client calls.
   */
  const handleLoadData = useCallback(async (cls: string, subj: string) => {
    if (!cls || !subj) {
      toast({
        variant: 'destructive',
        title: 'Selection Required',
        description: 'Please select both a class and a subject.',
      });
      return;
    }
    setIsLoading(true);
    try {
      // Fetch active students in this class via server action
      const studentsList = await getStudentsByClass(cls);
      setStudents(studentsList as StudentSlim[]);

      if (studentsList.length === 0) {
        setScores({});
        return;
      }

      // Fetch existing midterm results for this class/term/session
      const existingResults = await getMidtermResults(cls, TERM, SESSION);

      // Build a lookup: display studentId -> result (filtering to the selected subject)
      const existingMap: Record<string, { score: number; achievement: string; id: string }> = {};
      for (const result of existingResults) {
        // Match results by subject name (the page selects subject by name)
        if (result.subjectName === subj || result.subjectId === subj) {
          // getMidtermResults returns studentId as the Prisma cuid; match by iterating students
          const matched = studentsList.find(s => s.id === result.studentId);
          if (matched) {
            existingMap[matched.studentId] = {
              score: result.score,
              achievement: result.achievement,
              id: result.id,
            };
          }
        }
      }

      // Initialise score state; fall back to defaults for students without existing records
      const initialScores: Record<string, { score: number; achievement: string; id?: string }> = {};
      for (const student of studentsList) {
        initialScores[student.studentId] = existingMap[student.studentId] ?? {
          score: 0,
          achievement: 'Fair',
        };
      }
      setScores(initialScores);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not load student or score data.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Restore the last selected class and subject from localStorage on mount
  useEffect(() => {
    const savedClass = localStorage.getItem('midterm-selectedClass');
    const savedSubject = localStorage.getItem('midterm-selectedSubject');
    if (savedClass) setSelectedClass(savedClass);
    if (savedSubject) setSelectedSubject(savedSubject);
    if (savedClass && savedSubject) {
      handleLoadData(savedClass, savedSubject);
    }
  }, [handleLoadData]);

  // Persist selected class to localStorage
  useEffect(() => {
    if (selectedClass) {
      localStorage.setItem('midterm-selectedClass', selectedClass);
    } else {
      localStorage.removeItem('midterm-selectedClass');
    }
  }, [selectedClass]);

  // Persist selected subject to localStorage
  useEffect(() => {
    if (selectedSubject) {
      localStorage.setItem('midterm-selectedSubject', selectedSubject);
    } else {
      localStorage.removeItem('midterm-selectedSubject');
    }
  }, [selectedSubject]);

  /** Updates a score or achievement value for a student in local state. */
  const handleScoreChange = (studentId: string, field: 'score' | 'achievement', value: string) => {
    if (field === 'score') {
      const numericValue = Number(value) || 0;
      // Clamp value to 0-100 range
      if (numericValue < 0 || numericValue > 100) return;
      setScores(prev => ({ ...prev, [studentId]: { ...prev[studentId], score: numericValue } }));
    } else {
      setScores(prev => ({ ...prev, [studentId]: { ...prev[studentId], achievement: value } }));
    }
  };

  /**
   * Saves all midterm scores via the saveMidtermResults server action.
   * Builds the full payload expected by the action and submits in one call.
   */
  const handleSaveScores = async () => {
    setIsSubmitting(true);
    try {
      // Build payload array: one entry per student
      const resultsPayload = students.flatMap(student => {
        const score = scores[student.studentId];
        if (!score) return [];
        return [{
          studentId: student.studentId,
          studentName: `${student.firstName} ${student.lastName}`,
          subjectId: selectedSubject,
          subjectName: selectedSubject,
          class: selectedClass,
          term: TERM,
          session: SESSION,
          score: score.score,
          achievement: score.achievement,
        }];
      });

      // Call server action to batch upsert all results
      await saveMidtermResults(resultsPayload);

      toast({
        title: 'Mid-Term Scores Saved',
        description: 'All mid-term scores have been saved successfully.',
      });
      // Refresh data to reflect saved state
      await handleLoadData(selectedClass, selectedSubject);
    } catch (error) {
      console.error('Error saving scores:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save scores.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Renders the table content based on current loading/data state. */
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4 pt-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-9 w-40" />
            </div>
          ))}
        </div>
      );
    }

    if (students.length === 0) {
      return (
        <div className="flex h-48 flex-col items-center justify-center rounded-md border border-dashed text-center">
          <h3 className="text-lg font-medium">No Students Found</h3>
          <p className="text-sm text-muted-foreground">
            Please select a class and subject, then click &quot;Load Data&quot;.
          </p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student Name</TableHead>
            <TableHead className="w-[150px]">Score (100)</TableHead>
            <TableHead className="w-[180px]">Achievement</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => (
            <TableRow key={student.id}>
              <TableCell className="font-medium">{student.firstName} {student.lastName}</TableCell>
              <TableCell>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={scores[student.studentId]?.score ?? 0}
                  onChange={(e) => handleScoreChange(student.studentId, 'score', e.target.value)}
                  disabled={role !== 'Teacher' && role !== 'Admin'}
                />
              </TableCell>
              <TableCell>
                <Select
                  value={scores[student.studentId]?.achievement ?? 'Fair'}
                  onValueChange={(value) => handleScoreChange(student.studentId, 'achievement', value)}
                  disabled={role !== 'Teacher' && role !== 'Admin'}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {achievementOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold">Mid-Term Results</h1>
        <p className="text-muted-foreground">Enter mid-term scores and achievement levels for students.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mid-Term Gradebook</CardTitle>
          <CardDescription>Select a class and subject to begin entering mid-term scores.</CardDescription>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2">
              <Select onValueChange={setSelectedClass} value={selectedClass} disabled={isAcademicDataLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={isAcademicDataLoading ? 'Loading...' : 'Select Class'} />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select onValueChange={setSelectedSubject} value={selectedSubject} disabled={isAcademicDataLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={isAcademicDataLoading ? 'Loading...' : 'Select Subject'} />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => handleLoadData(selectedClass, selectedSubject)}
              disabled={isLoading || isAcademicDataLoading || isSubmitting}
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isLoading ? 'Loading...' : 'Load Data'}
            </Button>
            <div className="ml-auto">
              {students.length > 0 && (
                <Button onClick={handleSaveScores} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Scores
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
