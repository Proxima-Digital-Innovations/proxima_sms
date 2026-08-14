
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
import { getStudents } from '@/actions/student-actions';
import { getScoresByClassSubjectAndTerm, saveScores, reviewScore, approveAllPendingScores } from '@/actions/results-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ThumbsDown, ThumbsUp, Save, Loader2, Send, Upload } from 'lucide-react';
import { BulkScoresUploadDialog } from '@/components/dashboard/scores/bulk-scores-upload-dialog';
import { createActionNotification } from '@/lib/notifications';
import usePersistentState from '@/hooks/use-persistent-state';
import { Student, Score } from '@/lib/schema';


export default function ScoresPage() {
  const { role, user } = useRole();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [scores, setScores] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = usePersistentState('scores-bulk-upload-open', false);
  const { toast } = useToast();
  const { classes, subjects, isLoading: isAcademicDataLoading } = useAcademicData();

  const handleLoadData = useCallback(async (clsId: string, subjId: string) => {
    if (!clsId || !subjId) {
      toast({
        variant: 'destructive',
        title: 'Selection Required',
        description: 'Please select both a class and a subject.',
      });
      return;
    }
    setIsLoading(true);
    try {
      const classRecord = classes.find(c => c.id === clsId);
      if (!classRecord) throw new Error("Class not found");

      const studentsData = await getStudents(clsId);
      const studentsList = studentsData.success ? (studentsData.data as any[]) : [];
      setStudents(studentsList);
      
      const result = await getScoresByClassSubjectAndTerm(clsId, subjId, 'First Term', '2024/2025'); // Hardcoded for now based on original, or we can fetch active term.
      
      const existingScores: Record<string, any> = {};
      if (result.success && 'scores' in result && result.scores) {
        (result.scores as any[]).forEach((doc: any) => {
          existingScores[doc.studentId] = {
            id: doc.id,
            caScore: doc.ca1 || 0,
            examScore: doc.exam || 0,
            totalScore: doc.total || 0,
            status: doc.status || 'Draft',
            termId: doc.termId
          };
        });
      }

      const initialScores: Record<string, any> = {};
      studentsList.forEach((student: any) => {
        initialScores[student.studentId] = existingScores[student.id] || { 
            id: '', 
            studentId: student.id, 
            caScore: 0, 
            examScore: 0, 
            totalScore: 0, 
            status: 'Draft',
            termId: (result as any).termId
        };
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
  }, [toast, classes]);
  
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
    const newStatus = asDraft ? 'Draft' : 'Pending';

    const scoresToSave = Object.values(scores).map(s => {
        return {
            studentId: s.studentId,
            subjectId: selectedSubject,
            termId: s.termId,
            ca1: s.caScore,
            exam: s.examScore,
            status: s.status === 'Approved' ? 'Approved' : newStatus
        };
    });

    try {
      const result = await saveScores(scoresToSave);
      if (result.success) {
          toast({
            title: asDraft ? 'Scores Saved as Draft' : 'Scores Submitted!',
            description: asDraft ? 'Your progress has been saved.' : 'The scores have been submitted to the Exam Officer for review.',
          });
          await handleLoadData(selectedClass, selectedSubject);
      } else {
          throw new Error(result.error);
      }
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
        const result = await reviewScore(score.id, newStatus);
        
        if (result.success) {
            await createActionNotification(user?.id || '', {
                title: `Score ${newStatus}`,
                message: `Your score for ${student.firstName} ${student.lastName} has been ${newStatus.toLowerCase()}.`,
                type: newStatus === 'Approved' ? 'success' : 'error'
            });

            setScores(prev => ({ 
                ...prev, 
                [studentId]: { ...prev[studentId], status: newStatus } 
            }));
            toast({ title: `Score ${newStatus}` });
        } else {
            throw new Error('Failed to review score');
        }
    } catch (error) {
        console.error('Error reviewing score:', error);
        toast({ variant: 'destructive', title: 'Error', description: `Could not update score to ${newStatus}.` });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleApproveAll = async () => {
    setIsSubmitting(true);
    
    // We need termId. Use the termId from the first score available.
    const sampleScore = Object.values(scores)[0];
    if (!sampleScore || !sampleScore.termId) {
        toast({ title: 'No scores to approve.' });
        setIsSubmitting(false);
        return;
    }

    try {
        const result = await approveAllPendingScores(selectedClass, selectedSubject, sampleScore.termId);
        
        if (result.success) {
            const updatedScores = { ...scores };
            Object.keys(updatedScores).forEach(studentId => {
                if (updatedScores[studentId].status === 'Pending') {
                    updatedScores[studentId].status = 'Approved';
                }
            });
            setScores(updatedScores);
            toast({ title: 'All Pending Scores Approved', description: `${(result as any).count} scores were updated.` });
        } else {
            throw new Error((result as any).error);
        }
    } catch (error) {
        console.error('Error approving all scores:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not approve all scores.' });
    } finally {
        setIsSubmitting(false);
    }
  };


  const statusVariant = (status: string) => {
    if (status === 'Approved') return 'default';
    if (status === 'Pending') return 'secondary';
    if (status === 'Rejected') return 'destructive';
    return 'outline';
  };
  
  const isSheetEditable = (status: string) => {
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
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select onValueChange={setSelectedSubject} value={selectedSubject} disabled={isAcademicDataLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={isAcademicDataLoading ? "Loading..." : "Select Subject"} />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
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
