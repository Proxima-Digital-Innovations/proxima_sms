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
import type { Student, BehaviouralAssessment } from '@/lib/schema';
import { Skeleton } from '@/components/ui/skeleton';
import { Save, Loader2 } from 'lucide-react';

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

export default function BehaviouralPage() {
  const { role } = useRole();
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [assessments, setAssessments] = useState<Record<string, Rating & { id?: string }>>({});
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
      const studentsQuery = query(collection(db, 'students'), where('classLevel', '==', cls));
      const studentsSnapshot = await getDocs(studentsQuery);
      const studentsList = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      setStudents(studentsList);
      
      const studentIds = studentsList.map(s => s.studentId);
      if (studentIds.length === 0) {
        setAssessments({});
        setIsLoading(false);
        return;
      }
      
      const assessmentsQuery = query(
        collection(db, 'behavioural'),
        where('studentId', 'in', studentIds),
        where('class', '==', cls)
      );
      const assessmentsSnapshot = await getDocs(assessmentsQuery);
      const existingAssessments: Record<string, Rating & { id: string }> = {};
      assessmentsSnapshot.forEach(doc => {
        const data = doc.data();
        existingAssessments[data.studentId] = {
          conduct: data.conduct,
          punctuality: data.punctuality,
          dedication: data.dedication,
          participation: data.participation,
          hospitality: data.hospitality,
          neatness: data.neatness,
          creativity: data.creativity,
          physical: data.physical,
          id: doc.id
        };
      });

      const initialAssessments: Record<string, Rating & { id?: string }> = {};
      studentsList.forEach((student) => {
        initialAssessments[student.studentId] = existingAssessments[student.studentId] || {
          conduct: 0,
          punctuality: 0,
          dedication: 0,
          participation: 0,
          hospitality: 0,
          neatness: 0,
          creativity: 0,
          physical: 0
        };
      });
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

  useEffect(() => {
    const savedClass = localStorage.getItem('behavioural-selectedClass');
    if (savedClass) {
      setSelectedClass(savedClass);
      handleLoadData(savedClass);
    }
  }, [handleLoadData]);

  useEffect(() => {
    if (selectedClass) {
      localStorage.setItem('behavioural-selectedClass', selectedClass);
    } else {
      localStorage.removeItem('behavioural-selectedClass');
    }
  }, [selectedClass]);

  const handleRatingChange = (studentId: string, field: keyof Rating, value: string) => {
    const numericValue = Number(value) || 0;
    if (numericValue < 0 || numericValue > 10) return;
    
    setAssessments(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: numericValue }
    }));
  };

  const handleSaveAssessments = async () => {
    setIsSubmitting(true);
    const batch = writeBatch(db);

    Object.entries(assessments).forEach(([studentId, assessment]) => {
      const assessmentRef = assessment.id ? doc(db, 'behavioural', assessment.id) : doc(collection(db, 'behavioural'));
      const assessmentData = {
        studentId,
        conduct: assessment.conduct,
        punctuality: assessment.punctuality,
        dedication: assessment.dedication,
        participation: assessment.participation,
        hospitality: assessment.hospitality,
        neatness: assessment.neatness,
        creativity: assessment.creativity,
        physical: assessment.physical,
        class: selectedClass,
        session: "2024/2025",
        term: "First Term",
        ...(assessment.id ? {} : { createdAt: new Date() })
      };

      if (assessment.id) {
        batch.update(assessmentRef, assessmentData);
      } else {
        batch.set(assessmentRef, assessmentData);
      }
    });

    try {
      await batch.commit();
      toast({
        title: 'Assessments Saved',
        description: 'All behavioural assessments have been saved successfully.',
      });
      await handleLoadData(selectedClass);
    } catch (error) {
      console.error('Error saving assessments:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save assessments.' });
    } finally {
      setIsSubmitting(false);
    }
  };

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
                <TableCell className="sticky left-0 bg-background font-medium">{student.firstName} {student.lastName}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    max={10}
                    value={assessments[student.studentId]?.conduct || 0}
                    onChange={(e) => handleRatingChange(student.studentId, 'conduct', e.target.value)}
                    disabled={role !== 'Teacher' && role !== 'Admin'}
                    className="w-20"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    max={10}
                    value={assessments[student.studentId]?.punctuality || 0}
                    onChange={(e) => handleRatingChange(student.studentId, 'punctuality', e.target.value)}
                    disabled={role !== 'Teacher' && role !== 'Admin'}
                    className="w-20"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    max={10}
                    value={assessments[student.studentId]?.dedication || 0}
                    onChange={(e) => handleRatingChange(student.studentId, 'dedication', e.target.value)}
                    disabled={role !== 'Teacher' && role !== 'Admin'}
                    className="w-20"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    max={10}
                    value={assessments[student.studentId]?.participation || 0}
                    onChange={(e) => handleRatingChange(student.studentId, 'participation', e.target.value)}
                    disabled={role !== 'Teacher' && role !== 'Admin'}
                    className="w-20"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    max={10}
                    value={assessments[student.studentId]?.hospitality || 0}
                    onChange={(e) => handleRatingChange(student.studentId, 'hospitality', e.target.value)}
                    disabled={role !== 'Teacher' && role !== 'Admin'}
                    className="w-20"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    max={10}
                    value={assessments[student.studentId]?.neatness || 0}
                    onChange={(e) => handleRatingChange(student.studentId, 'neatness', e.target.value)}
                    disabled={role !== 'Teacher' && role !== 'Admin'}
                    className="w-20"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    max={10}
                    value={assessments[student.studentId]?.creativity || 0}
                    onChange={(e) => handleRatingChange(student.studentId, 'creativity', e.target.value)}
                    disabled={role !== 'Teacher' && role !== 'Admin'}
                    className="w-20"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    max={10}
                    value={assessments[student.studentId]?.physical || 0}
                    onChange={(e) => handleRatingChange(student.studentId, 'physical', e.target.value)}
                    disabled={role !== 'Teacher' && role !== 'Admin'}
                    className="w-20"
                  />
                </TableCell>
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
                <Button onClick={handleSaveAssessments} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
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
