
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
import { collection, getDocs, query, where, writeBatch, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Student, Score } from '@/lib/schema';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ThumbsDown, ThumbsUp, Save, Loader2, Send, Upload } from 'lucide-react';
import { BulkScoresUploadDialog } from '@/components/dashboard/scores/bulk-scores-upload-dialog';
import { createActionNotification } from '@/lib/notifications';
import usePersistentState from '@/hooks/use-persistent-state';


export default function ScoresPage() {
  const { role, user } = useRole();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [scores, setScores] = useState<Record<string, Score>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = usePersistentState('scores-bulk-upload-open', false);
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
      // 1. Fetch students for the selected class
      const studentsQuery = query(collection(db, 'students'), where('classLevel', '==', cls));
      const studentsSnapshot = await getDocs(studentsQuery);
      const studentsList = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      setStudents(studentsList);
      
      // 2. Fetch existing scores for these students, for this subject/term
      const studentIds = studentsList.map(s => s.studentId);
      if (studentIds.length === 0) {
        setScores({});
        setIsLoading(false);
        return;
      }
      
      const scoresQuery = query(
        collection(db, 'scores'),
        where('studentId', 'in', studentIds),
        where('subject', '==', subj),
        where('class', '==', cls)
      );
      const scoresSnapshot = await getDocs(scoresQuery);
      const existingScores: Record<string, Score> = {};
      scoresSnapshot.forEach(doc => {
        const data = doc.data();
        existingScores[data.studentId] = { id: doc.id, ...data } as Score;
      });

      // 3. Initialize scores for all students, using existing data or defaults
      const initialScores: Record<string, Score> = {};
      studentsList.forEach((student) => {
        initialScores[student.studentId] = existingScores[student.studentId] || { id: '', caScore: 0, examScore: 0, totalScore: 0, status: 'Draft' };
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
  
  // Load initial state from localStorage and auto-fetch data
  useEffect(() => {
    const savedClass = localStorage.getItem('scores-selectedClass');
    const savedSubject = localStorage.getItem('scores-selectedSubject');
    if (savedClass) {
        setSelectedClass(savedClass);
    }
    if (savedSubject) {
        setSelectedSubject(savedSubject);
    }
    if (savedClass && savedSubject) {
        handleLoadData(savedClass, savedSubject);
    }
  }, [handleLoadData]);

  // Save selection to localStorage whenever it changes
  useEffect(() => {
    if (selectedClass) {
        localStorage.setItem('scores-selectedClass', selectedClass);
    } else {
        localStorage.removeItem('scores-selectedClass');
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedSubject) {
        localStorage.setItem('scores-selectedSubject', selectedSubject);
    } else {
        localStorage.removeItem('scores-selectedSubject');
    }
  }, [selectedSubject]);


  const handleScoreChange = (studentId: string, field: 'caScore' | 'examScore', value: string) => {
    const numericValue = Number(value) || 0;
    setScores(prevScores => {
      const studentScore = { ...prevScores[studentId] };
      
      if (field === 'caScore' && (numericValue < 0 || numericValue > 40)) return prevScores;
      if (field === 'examScore' && (numericValue < 0 || numericValue > 60)) return prevScores;

      studentScore[field] = numericValue;
      studentScore.totalScore = (studentScore.caScore || 0) + (studentScore.examScore || 0);
      
      return { ...prevScores, [studentId]: studentScore };
    });
  };

  const handleSaveScores = async (asDraft: boolean) => {
    if (!user) return;
    setIsSubmitting(true);
    const batch = writeBatch(db);
    const newStatus = asDraft ? 'Draft' : 'Pending';

    Object.entries(scores).forEach(([studentId, score]) => {
        const scoreRef = score.id ? doc(db, 'scores', score.id) : doc(collection(db, 'scores'));
        const scoreData: Partial<Score> = {
          caScore: score.caScore || 0,
          examScore: score.examScore || 0,
          totalScore: (score.caScore || 0) + (score.examScore || 0),
          status: score.status === 'Approved' ? 'Approved' : newStatus, // Don't change approved scores
        };

        if (score.id) {
          batch.update(scoreRef, scoreData);
        } else {
          const newScoreData: Omit<Score, 'id'> = {
            ...scoreData,
            studentId,
            subject: selectedSubject,
            class: selectedClass,
            teacherId: user.uid,
            term: "First Term", // Placeholder term
            caScore: scoreData.caScore || 0,
            examScore: scoreData.examScore || 0,
            totalScore: scoreData.totalScore || 0,
            status: scoreData.status || 'Draft',
          };
          batch.set(scoreRef, newScoreData);
        }
    });

    try {
      await batch.commit();
      toast({
        title: asDraft ? 'Scores Saved as Draft' : 'Scores Submitted!',
        description: asDraft ? 'Your progress has been saved.' : 'The scores have been submitted to the Exam Officer for review.',
      });
      await handleLoadData(selectedClass, selectedSubject);
    } catch (error) {
      console.error('Error saving scores:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save scores.' });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  const handleReview = async (studentId: string, newStatus: 'Approved' | 'Rejected') => {
    const score = scores[studentId];
    const student = students.find(s => s.studentId === studentId);
    if (!score || !score.id || !student) return;
    setIsSubmitting(true);
    try {
        const scoreRef = doc(db, 'scores', score.id);
        await updateDoc(scoreRef, { status: newStatus });
        
        await createActionNotification({
            userId: score.teacherId,
            title: `Score ${newStatus}`,
            body: `Your score for ${student.firstName} ${student.lastName} in ${score.subject} has been ${newStatus.toLowerCase()}.`,
            ref: {
                collection: 'scores',
                id: score.id,
            },
            type: newStatus === 'Approved' ? 'APPROVAL' : 'REJECTION'
        });

        setScores(prev => ({ 
            ...prev, 
            [studentId]: { ...prev[studentId], status: newStatus } 
        }));
        toast({ title: `Score ${newStatus}` });
    } catch (error) {
        console.error('Error reviewing score:', error);
        toast({ variant: 'destructive', title: 'Error', description: `Could not update score to ${newStatus}.` });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleApproveAll = async () => {
    setIsSubmitting(true);
    const batch = writeBatch(db);
    let updatedCount = 0;
    const updatedScores = { ...scores };
    const notificationPromises: Promise<void>[] = [];

    Object.entries(scores).forEach(([studentId, score]) => {
      const student = students.find(s => s.studentId === studentId);
      if (score.status === 'Pending' && score.id && student) {
        const scoreRef = doc(db, 'scores', score.id);
        batch.update(scoreRef, { status: 'Approved' });
        updatedScores[studentId].status = 'Approved';
        updatedCount++;
        
        notificationPromises.push(createActionNotification({
            userId: score.teacherId,
            title: 'Score Approved',
            body: `Your score for ${student.firstName} ${student.lastName} in ${score.subject} has been approved.`,
            ref: {
                collection: 'scores',
                id: score.id,
            },
            type: 'APPROVAL'
        }));
      }
    });

    if (updatedCount === 0) {
        toast({ title: 'No scores to approve.' });
        setIsSubmitting(false);
        return;
    }

    try {
        await batch.commit();
        await Promise.all(notificationPromises);
        setScores(updatedScores);
        toast({ title: 'All Pending Scores Approved', description: `${updatedCount} scores were updated.` });
    } catch (error) {
        console.error('Error approving all scores:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not approve all scores.' });
    } finally {
        setIsSubmitting(false);
    }
  };


  const statusVariant = (status: Score['status']) => {
    if (status === 'Approved') return 'default';
    if (status === 'Pending') return 'secondary';
    if (status === 'Rejected') return 'destructive';
    return 'outline';
  };
  
  const isSheetEditable = (status: Score['status']) => {
    if (role === 'Teacher') {
        return status === 'Draft' || status === 'Rejected';
    }
    return false;
  };
  
  const onUploadComplete = () => {
    setIsBulkUploadOpen(false);
    if(selectedClass && selectedSubject) {
        handleLoadData(selectedClass, selectedSubject);
    }
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4 pt-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 w-16" />
            </div>
          ))}
        </div>
      );
    }

    if (students.length === 0 && (selectedClass || selectedSubject)) {
      return (
        <div className="flex h-48 flex-col items-center justify-center rounded-md border border-dashed text-center">
          <h3 className="text-lg font-medium">No Students Found</h3>
          <p className="text-sm text-muted-foreground">There are no students enrolled in {selectedClass}.</p>
        </div>
      );
    }
    
    if (students.length === 0) {
      return (
        <div className="flex h-48 flex-col items-center justify-center rounded-md border border-dashed text-center">
          <h3 className="text-lg font-medium">No Students Loaded</h3>
          <p className="text-sm text-muted-foreground">Please select a class and subject, then click "Load Data".</p>
        </div>
      );
    }
    
    if (role === 'Teacher') {
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student Name</TableHead>
              <TableHead className="w-[120px]">CA (40%)</TableHead>
              <TableHead className="w-[120px]">Exam (60%)</TableHead>
              <TableHead className="w-[100px] text-right">Total</TableHead>
              <TableHead className="w-[150px] text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.id}>
                <TableCell className="font-medium">{student.firstName} {student.lastName}</TableCell>
                <TableCell>
                  <Input type="number" max={40} value={scores[student.studentId]?.caScore || 0} onChange={(e) => handleScoreChange(student.studentId, 'caScore', e.target.value)} disabled={!isSheetEditable(scores[student.studentId]?.status)} />
                </TableCell>
                <TableCell>
                  <Input type="number" max={60} value={scores[student.studentId]?.examScore || 0} onChange={(e) => handleScoreChange(student.studentId, 'examScore', e.target.value)} disabled={!isSheetEditable(scores[student.studentId]?.status)} />
                </TableCell>
                <TableCell className="text-right font-medium">
                  {scores[student.studentId]?.totalScore || 0}
                </TableCell>
                <TableCell className="text-right">
                    <Badge variant={statusVariant(scores[student.studentId]?.status)}>{scores[student.studentId]?.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }

    if (role === 'ExamOfficer') {
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student Name</TableHead>
              <TableHead className="w-[120px]">CA (40%)</TableHead>
              <TableHead className="w-[120px]">Exam (60%)</TableHead>
              <TableHead className="w-[100px]">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.id}>
                <TableCell className="font-medium">{student.firstName} {student.lastName}</TableCell>
                <TableCell>{scores[student.studentId]?.caScore || 0}</TableCell>
                 <TableCell>{scores[student.studentId]?.examScore || 0}</TableCell>
                <TableCell>{scores[student.studentId]?.totalScore || 0}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant(scores[student.studentId]?.status)}>{scores[student.studentId]?.status}</Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="outline" onClick={() => handleReview(student.studentId, 'Approved')} disabled={scores[student.studentId]?.status !== 'Pending' || isSubmitting}>
                    <ThumbsUp className="mr-2 h-4 w-4" /> Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleReview(student.studentId, 'Rejected')} disabled={scores[student.studentId]?.status !== 'Pending' || isSubmitting}>
                    <ThumbsDown className="mr-2 h-4 w-4" /> Reject
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold">
          {role === 'Teacher' ? 'Enter Student Scores' : 'Review Student Scores'}
        </h1>
        <p className="text-muted-foreground">
          {role === 'Teacher' ? 'Input Continuous Assessment (CA) and exam scores for your students.' : 'Review scores submitted by teachers before result generation.'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gradebook</CardTitle>
          <CardDescription>Select a class and subject to begin entering or reviewing scores.</CardDescription>
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
            <div className="ml-auto flex gap-2">
               {role === 'Teacher' && students.length > 0 && (
                <>
                  <BulkScoresUploadDialog 
                      open={isBulkUploadOpen}
                      onOpenChange={setIsBulkUploadOpen}
                      students={students} 
                      class={selectedClass}
                      subject={selectedSubject}
                      onUploadComplete={onUploadComplete} 
                  />
                  <Button variant="outline" onClick={() => handleSaveScores(true)} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                    Save Draft
                  </Button>
                  <Button onClick={() => handleSaveScores(false)} disabled={isSubmitting}>
                     {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4" />}
                    Submit to Exam Officer
                  </Button>
                </>
              )}
              {role === 'ExamOfficer' && students.length > 0 && (
                <Button onClick={handleApproveAll} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ThumbsUp className="mr-2 h-4 w-4" />}
                  Approve All Pending
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
