

'use client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { useRole } from '@/context/role-context';
import { Upload } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { DocumentSubmissionForm } from '@/components/dashboard/lesson-notes/add-lesson-note-form';
import { format } from 'date-fns';
import { dbService, QueryConstraint } from '@/lib/dbService';
import usePersistentState from '@/hooks/use-persistent-state';
import type { MockLessonNote } from '@/lib/schema';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


type Question = MockLessonNote & { type: 'Exam Question' | 'Test Question' };


export default function ExamQuestionsPage() {
  const { role, user } = useRole();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = usePersistentState('exam-questions-modal-open', false);
  const [modalType, setModalType] = useState<'Exam Question' | 'Test Question'>('Test Question');
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [testQuestions, setTestQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchQuestions = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
        const constraints: QueryConstraint[] = role === 'Teacher'
            ? [{ type: 'where', fieldPath: 'teacherId', opStr: '==', value: user.uid }]
            : [];
        
        const [examData, testData] = await Promise.all([
             dbService.getDocs<Question>('examQuestions', constraints),
             dbService.getDocs<Question>('testQuestions', constraints)
        ]);
        
        examData.sort((a, b) => (b.submittedOn?.seconds || 0) - (a.submittedOn?.seconds || 0));
        testData.sort((a, b) => (b.submittedOn?.seconds || 0) - (a.submittedOn?.seconds || 0));

        setExamQuestions(examData);
        setTestQuestions(testData);

    } catch (error) {
        console.error("Error fetching questions:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not fetch questions."
        });
    } finally {
        setIsLoading(false);
    }
  }, [user, role, toast]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleSubmissionAdded = () => {
    fetchQuestions();
    setIsModalOpen(false);
  }

  const statusVariant = (status: string) => {
    if (status.includes('Approved')) return 'default';
    if (status.includes('Pending')) return 'secondary';
    if (status.includes('Rejected')) return 'destructive';
    return 'outline';
  };

  const getActionButtons = (q: Question) => {
     const collectionName = q.type === 'Exam Question' ? 'examQuestions' : 'testQuestions';
     const reviewPath = `/dashboard/exam-questions/${collectionName}/${q.id}`;
     
     if (role === 'Teacher') {
         return (
             <Button asChild variant="outline" size="sm">
                <Link href={reviewPath}>View</Link>
             </Button>
         )
     }
     return (
        <Button asChild variant="outline" size="sm">
            <Link href={reviewPath}>Review</Link>
        </Button>
     );
  }
  
  const openUploadModal = (type: 'Exam Question' | 'Test Question') => {
      setModalType(type);
      setIsModalOpen(true);
  }

  const renderTable = (questions: Question[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Subject</TableHead>
          <TableHead>Class</TableHead>
           {role !== 'Teacher' && <TableHead className="hidden md:table-cell">Teacher</TableHead>}
          <TableHead className="hidden md:table-cell">Submitted On</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                {role !== 'Teacher' && <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>}
                <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
              </TableRow>
            ))
        ) : questions.map((q) => (
          <TableRow key={q.id}>
            <TableCell className="font-medium">{q.subject}</TableCell>
            <TableCell>{q.class}</TableCell>
             {role !== 'Teacher' && <TableCell className="hidden md:table-cell">{q.teacherName}</TableCell>}
            <TableCell className="hidden md:table-cell">{q.submittedOn ? format(new Date(q.submittedOn.seconds * 1000), 'PPP') : 'N/A'}</TableCell>
            <TableCell>
              <Badge variant={statusVariant(q.status)}>{q.status}</Badge>
            </TableCell>
            <TableCell className="text-right">
              {getActionButtons(q)}
            </TableCell>
          </TableRow>
        ))}
         {!isLoading && questions.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={role !== 'Teacher' ? 6 : 5}
                  className="h-24 text-center text-muted-foreground"
                >
                  No questions found.
                </TableCell>
              </TableRow>
            )}
      </TableBody>
    </Table>
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold">Question Bank</h1>
        <p className="text-muted-foreground">
          {role === 'Teacher' ? 'Manage your submissions for Tests (CAs) and Exams.' : 'Review and manage all submitted questions.'}
        </p>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Submissions</CardTitle>
              <CardDescription>
                A complete list of all submitted questions, categorized by type.
              </CardDescription>
            </div>
            {role === 'Teacher' && (
              <div className="flex gap-2">
                 <Button onClick={() => openUploadModal('Test Question')}>
                    <Upload className="mr-2 h-4 w-4" /> Upload Test (CA)
                 </Button>
                 <Button variant="outline" onClick={() => openUploadModal('Exam Question')}>
                    <Upload className="mr-2 h-4 w-4" /> Upload Exam
                 </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="tests">
                <TabsList>
                    <TabsTrigger value="tests">Test Questions</TabsTrigger>
                    <TabsTrigger value="exams">Exam Questions</TabsTrigger>
                </TabsList>
                <TabsContent value="tests" className="pt-4">
                    {renderTable(testQuestions)}
                </TabsContent>
                <TabsContent value="exams" className="pt-4">
                    {renderTable(examQuestions)}
                </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        <DialogContent>
           <DialogHeader>
              <DialogTitle>Upload {modalType}</DialogTitle>
              <DialogDescription>
                Select the class, subject, and upload your file. It will be routed to the correct reviewer.
              </DialogDescription>
           </DialogHeader>
           <DocumentSubmissionForm onNoteAdded={handleSubmissionAdded} documentType={modalType} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
