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
import { collection, getDocs, query, where, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Student, MidTermResult } from '@/lib/schema';
import { Skeleton } from '@/components/ui/skeleton';
import { Save, Loader2 } from 'lucide-react';

const achievementOptions = ['Excellent', 'Good', 'Fair', 'Poor'];

export default function MidTermPage() {
  const { role } = useRole();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [scores, setScores] = useState<Record<string, { score: number; achievement: string; id?: string }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { classes, subjects, isLoading: isAcademicDataLoading } = useAcademicData();

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
      const studentsQuery = query(collection(db, 'students'), where('classLevel', '==', cls));
      const studentsSnapshot = await getDocs(studentsQuery);
      const studentsList = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      setStudents(studentsList);
      
      const studentIds = studentsList.map(s => s.studentId);
      if (studentIds.length === 0) {
        setScores({});
        setIsLoading(false);
        return;
      }
      
      const scoresQuery = query(
        collection(db, 'midterm'),
        where('studentId', 'in', studentIds),
        where('subjectName', '==', subj),
        where('class', '==', cls)
      );
      const scoresSnapshot = await getDocs(scoresQuery);
      const existingScores: Record<string, { score: number; achievement: string; id: string }> = {};
      scoresSnapshot.forEach(doc => {
        const data = doc.data();
        existingScores[data.studentId] = { score: data.score, achievement: data.achievement, id: doc.id };
      });

      const initialScores: Record<string, { score: number; achievement: string; id?: string }> = {};
      studentsList.forEach((student) => {
        initialScores[student.studentId] = existingScores[student.studentId] || { score: 0, achievement: 'Fair' };
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

  useEffect(() => {
    const savedClass = localStorage.getItem('midterm-selectedClass');
    const savedSubject = localStorage.getItem('midterm-selectedSubject');
    if (savedClass) setSelectedClass(savedClass);
    if (savedSubject) setSelectedSubject(savedSubject);
    if (savedClass && savedSubject) {
      handleLoadData(savedClass, savedSubject);
    }
  }, [handleLoadData]);

  useEffect(() => {
    if (selectedClass) {
      localStorage.setItem('midterm-selectedClass', selectedClass);
    } else {
      localStorage.removeItem('midterm-selectedClass');
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedSubject) {
      localStorage.setItem('midterm-selectedSubject', selectedSubject);
    } else {
      localStorage.removeItem('midterm-selectedSubject');
    }
  }, [selectedSubject]);

  const handleScoreChange = (studentId: string, field: 'score' | 'achievement', value: string) => {
    if (field === 'score') {
      const numericValue = Number(value) || 0;
      if (numericValue < 0 || numericValue > 100) return;
      setScores(prev => ({
        ...prev,
        [studentId]: { ...prev[studentId], score: numericValue }
      }));
    } else {
      setScores(prev => ({
        ...prev,
        [studentId]: { ...prev[studentId], achievement: value }
      }));
    }
  };

  const handleSaveScores = async () => {
    setIsSubmitting(true);
    const batch = writeBatch(db);

    Object.entries(scores).forEach(([studentId, score]) => {
      const student = students.find(s => s.studentId === studentId);
      if (!student) return;

      const scoreRef = score.id ? doc(db, 'midterm', score.id) : doc(collection(db, 'midterm'));
      const scoreData = {
        studentId,
        studentName: `${student.firstName} ${student.lastName}`,
        subjectId: selectedSubject,
        subjectName: selectedSubject,
        score: score.score,
        achievement: score.achievement,
        class: selectedClass,
        session: "2024/2025",
        term: "First Term",
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
        title: 'Mid-Term Scores Saved',
        description: 'All mid-term scores have been saved successfully.',
      });
      await handleLoadData(selectedClass, selectedSubject);
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
            Please select a class and subject, then click "Load Data".
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
                  max={100}
                  value={scores[student.studentId]?.score || 0}
                  onChange={(e) => handleScoreChange(student.studentId, 'score', e.target.value)}
                  disabled={role !== 'Teacher' && role !== 'Admin'}
                />
              </TableCell>
              <TableCell>
                <Select
                  value={scores[student.studentId]?.achievement || 'Fair'}
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
                  <SelectValue placeholder={isAcademicDataLoading ? "Loading..." : "Select Class"} />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select onValueChange={setSelectedSubject} value={selectedSubject} disabled={isAcademicDataLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={isAcademicDataLoading ? "Loading..." : "Select Subject"} />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => handleLoadData(selectedClass, selectedSubject)} disabled={isLoading || isAcademicDataLoading || isSubmitting}>
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
