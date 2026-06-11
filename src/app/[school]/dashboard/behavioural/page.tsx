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
import {
  getBehaviouralAssessments,
  saveBehaviouralAssessment,
} from '@/actions/behavioural-actions';

/**
 * Inline student type — only the fields we need in this page.
 * Avoids pulling in the full Firebase-based schema type.
 */
type StudentSlim = {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
};

/** The 8 behavioural rating categories, each scored 0-10. */
type Rating = {
  conduct: number;
  punctuality: number;
  dedication: number;
  participation: number;
  hospitality: number;
  neatness: number;
  creativity: number;
  physical: number;
};

/** Hardcoded academic term and session used when saving/fetching records. */
const TERM = 'First Term';
const SESSION = '2024/2025';

export default function BehaviouralPage() {
  const { role } = useRole();
  const [selectedClass, setSelectedClass] = useState('');
  // List of slim student objects for the selected class
  const [students, setStudents] = useState<StudentSlim[]>([]);
  // Map of display studentId -> rating (with optional existing record id)
  const [assessments, setAssessments] = useState<Record<string, Rating & { id?: string }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { classes, isLoading: isAcademicDataLoading } = useAcademicData();

  /**
   * Loads students and their existing behavioural assessments for the given class.
   * Uses server actions instead of Firebase client calls.
   */
  const handleLoadData = useCallback(async (cls: string) => {
    if (!cls) {
      toast({
        variant: 'destructive',
        title: 'Selection Required',
        description: 'Please select a class.',
      });
      return;
    }
    setIsLoading(true);
    try {
      // Fetch active students in this class via server action
      const studentsList = await getStudentsByClass(cls);
      setStudents(studentsList as StudentSlim[]);

      if (studentsList.length === 0) {
        setAssessments({});
        return;
      }

      // Fetch existing assessments for this class/term/session
      const existingRecords = await getBehaviouralAssessments(cls, TERM, SESSION);

      // Build a lookup from display studentId -> existing assessment fields
      const existingMap: Record<string, Rating & { id: string }> = {};
      for (const record of existingRecords) {
        existingMap[record.student.studentId] = {
          conduct: record.conduct,
          punctuality: record.punctuality,
          dedication: record.dedication,
          participation: record.participation,
          hospitality: record.hospitality,
          neatness: record.neatness,
          creativity: record.creativity,
          physical: record.physical,
          id: record.id,
        };
      }

      // Initialise assessment state; fall back to zeros for students without existing records
      const initialAssessments: Record<string, Rating & { id?: string }> = {};
      for (const student of studentsList) {
        initialAssessments[student.studentId] = existingMap[student.studentId] ?? {
          conduct: 0,
          punctuality: 0,
          dedication: 0,
          participation: 0,
          hospitality: 0,
          neatness: 0,
          creativity: 0,
          physical: 0,
        };
      }
      setAssessments(initialAssessments);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not load student or assessment data.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Restore the last selected class from localStorage on mount
  useEffect(() => {
    const savedClass = localStorage.getItem('behavioural-selectedClass');
    if (savedClass) {
      setSelectedClass(savedClass);
      handleLoadData(savedClass);
    }
  }, [handleLoadData]);

  // Persist the selected class to localStorage whenever it changes
  useEffect(() => {
    if (selectedClass) {
      localStorage.setItem('behavioural-selectedClass', selectedClass);
    } else {
      localStorage.removeItem('behavioural-selectedClass');
    }
  }, [selectedClass]);

  /** Updates a single rating field for a student in local state. */
  const handleRatingChange = (studentId: string, field: keyof Rating, value: string) => {
    const numericValue = Number(value) || 0;
    // Clamp value to 0-10 range
    if (numericValue < 0 || numericValue > 10) return;
    setAssessments(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: numericValue },
    }));
  };

  /**
   * Saves all assessments via the saveBehaviouralAssessment server action.
   * Uses Promise.all to parallelise upserts for each student.
   */
  const handleSaveAssessments = async () => {
    setIsSubmitting(true);
    try {
      await Promise.all(
        students.map(student => {
          const assessment = assessments[student.studentId];
          if (!assessment) return Promise.resolve();
          // Call server action — it handles upsert internally
          return saveBehaviouralAssessment({
            studentId: student.studentId,
            studentName: `${student.firstName} ${student.lastName}`,
            class: selectedClass,
            term: TERM,
            session: SESSION,
            conduct: assessment.conduct,
            punctuality: assessment.punctuality,
            dedication: assessment.dedication,
            participation: assessment.participation,
            hospitality: assessment.hospitality,
            neatness: assessment.neatness,
            creativity: assessment.creativity,
            physical: assessment.physical,
          });
        })
      );
      toast({
        title: 'Assessments Saved',
        description: 'All behavioural assessments have been saved successfully.',
      });
      // Refresh data to pick up generated IDs
      await handleLoadData(selectedClass);
    } catch (error) {
      console.error('Error saving assessments:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save assessments.' });
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
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      );
    }

    if (students.length === 0) {
      return (
        <div className="flex h-48 flex-col items-center justify-center rounded-md border border-dashed text-center">
          <h3 className="text-lg font-medium">No Students Found</h3>
          <p className="text-sm text-muted-foreground">
            {selectedClass ? `There are no students enrolled in ${selectedClass}.` : 'Please select a class.'}
          </p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background">Student Name</TableHead>
              <TableHead className="w-[100px]">Conduct</TableHead>
              <TableHead className="w-[100px]">Punctuality</TableHead>
              <TableHead className="w-[100px]">Dedication</TableHead>
              <TableHead className="w-[120px]">Participation</TableHead>
              <TableHead className="w-[100px]">Hospitality</TableHead>
              <TableHead className="w-[100px]">Neatness</TableHead>
              <TableHead className="w-[100px]">Creativity</TableHead>
              <TableHead className="w-[100px]">Physical</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.id}>
                <TableCell className="sticky left-0 bg-background font-medium">
                  {student.firstName} {student.lastName}
                </TableCell>
                {/* Render an input for each of the 8 rating categories */}
                {(['conduct', 'punctuality', 'dedication', 'participation', 'hospitality', 'neatness', 'creativity', 'physical'] as (keyof Rating)[]).map(field => (
                  <TableCell key={field}>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      value={assessments[student.studentId]?.[field] ?? 0}
                      onChange={(e) => handleRatingChange(student.studentId, field, e.target.value)}
                      disabled={role !== 'Teacher' && role !== 'Admin'}
                      className="w-20"
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold">Behavioural Assessment</h1>
        <p className="text-muted-foreground">Rate student behaviour across 8 categories (0-10 scale).</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assessment Sheet</CardTitle>
          <CardDescription>Select a class and rate students on various behavioural aspects.</CardDescription>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <Select onValueChange={setSelectedClass} value={selectedClass} disabled={isAcademicDataLoading}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={isAcademicDataLoading ? 'Loading...' : 'Select Class'} />
              </SelectTrigger>
              <SelectContent>
                {classes.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              onClick={() => handleLoadData(selectedClass)}
              disabled={isLoading || isAcademicDataLoading || isSubmitting}
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isLoading ? 'Loading...' : 'Load Data'}
            </Button>
            <div className="ml-auto">
              {students.length > 0 && (
                <Button onClick={handleSaveAssessments} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Assessments
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
