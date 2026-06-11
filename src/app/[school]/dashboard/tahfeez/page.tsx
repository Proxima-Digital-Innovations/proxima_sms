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
import { collection, getDocs, query, where, writeBatch, doc } from '@/lib/firebase-stubs';
import { db, auth, storage } from "@/lib/firebase";
import type { Student, TahfeezScore } from '@/lib/schema';
import { Skeleton } from '@/components/ui/skeleton';
import { Save, Loader2 } from 'lucide-react';

export default function TahfeezPage() {
  const { role } = useRole();
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [scores, setScores] = useState<Record<string, { marks: number; id?: string }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { classes, isLoading: isAcademicDataLoading } = useAcademicData();

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
      // 1. Fetch students for the selected class
      const studentsQuery = query(collection(db, 'students'), where('classLevel', '==', cls));
      const studentsSnapshot = await getDocs(studentsQuery);
      const studentsList = studentsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Student));
      setStudents(studentsList);
      
      // 2. Fetch existing Tahfeez scores
      const studentIds = studentsList.map((s: any) => s.studentId);
      if (studentIds.length === 0) {
        setScores({});
        setIsLoading(false);
        return;
      }
      
      const scoresQuery = query(
        collection(db, 'tahfeez'),
        where('studentId', 'in', studentIds),
        where('class', '==', cls)
      );
      const scoresSnapshot = await getDocs(scoresQuery);
      const existingScores: Record<string, { marks: number; id: string }> = {};
      scoresSnapshot.forEach((doc: any) => {
        const data = doc.data();
        existingScores[data.studentId] = { marks: data.marks, id: doc.id };
      });

      // 3. Initialize scores for all students
      const initialScores: Record<string, { marks: number; id?: string }> = {};
      studentsList.forEach((student: any) => {
        initialScores[student.studentId] = existingScores[student.studentId] || { marks: 0 };
      });
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

  // Load initial state from localStorage
  useEffect(() => {
    const savedClass = localStorage.getItem('tahfeez-selectedClass');
    if (savedClass) {
      setSelectedClass(savedClass);
      handleLoadData(savedClass);
    }
  }, [handleLoadData]);

  // Save selection to localStorage
  useEffect(() => {
    if (selectedClass) {
      localStorage.setItem('tahfeez-selectedClass', selectedClass);
    } else {
      localStorage.removeItem('tahfeez-selectedClass');
    }
  }, [selectedClass]);

  const handleScoreChange = (studentId: string, value: string) => {
    const numericValue = Number(value) || 0;
    if (numericValue < 0 || numericValue > 100) return;
    
    setScores(prevScores => ({
      ...prevScores,
      [studentId]: { ...prevScores[studentId], marks: numericValue }
    }));
  };

  const handleSaveScores = async () => {
    setIsSubmitting(true);
    const batch = writeBatch(db);

    Object.entries(scores).forEach(([studentId, score]) => {
      const student = students.find(s => s.studentId === studentId);
      if (!student) return;

      const scoreRef = score.id ? doc(db, 'tahfeez', score.id) : doc(collection(db, 'tahfeez'));
      const scoreData = {
        studentId,
        studentName: `${student.firstName} ${student.lastName}`,
        marks: score.marks,
        class: selectedClass,
        session: "2024/2025", // Placeholder
        term: "First Term", // Placeholder
        ...(score.id ? {} : { createdAt: new Date() })
      };

      if (score.id) {
        batch.update(scoreRef, scoreData);
      } else {
        batch.set(scoreRef, scoreData);
      }
    });

    try {
      await batch.commit();
      toast({
        title: 'Tahfeez Scores Saved',
        description: 'All scores have been saved successfully.',
      });
      await handleLoadData(selectedClass);
    } catch (error) {
      console.error('Error saving scores:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save scores.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4 pt-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 w-32" />
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
            {selectedClass ? `There are no students enrolled in ${selectedClass}.` : 'Please select a class.'}
          </p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student Name</TableHead>
            <TableHead className="w-[150px]">Marks (100)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => (
            <TableRow key={student.id}>
              <TableCell className="font-medium">{student.firstName} {student.lastName}</TableCell>
              <TableCell>
                <Input
                  type="number"
                  max={100}
                  value={scores[student.studentId]?.marks || 0}
                  onChange={(e) => handleScoreChange(student.studentId, e.target.value)}
                  disabled={role !== 'Teacher' && role !== 'Admin'}
                />
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
        <h1 className="font-headline text-3xl font-bold">Tahfeez (Quran) Tracking</h1>
        <p className="text-muted-foreground">Track Quran memorization scores for students.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tahfeez Gradebook</CardTitle>
          <CardDescription>Select a class to begin entering Tahfeez scores.</CardDescription>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <Select onValueChange={setSelectedClass} value={selectedClass} disabled={isAcademicDataLoading}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={isAcademicDataLoading ? "Loading..." : "Select Class"} />
              </SelectTrigger>
              <SelectContent>
                {classes.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={() => handleLoadData(selectedClass)} disabled={isLoading || isAcademicDataLoading || isSubmitting}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
              {isLoading ? 'Loading...' : 'Load Data'}
            </Button>
            <div className="ml-auto">
              {students.length > 0 && (
                <Button onClick={handleSaveScores} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
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
