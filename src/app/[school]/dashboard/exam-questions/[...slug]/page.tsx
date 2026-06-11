

'use client';

import { useEffect, useState, useCallback } from 'react';
import { notFound, useParams } from 'next/navigation';
import { dbService } from '@/lib/dbService';
import type { MockLessonNote, Student } from '@/lib/schema';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ThumbsDown, ThumbsUp, User, File as FileIcon, AlertTriangle, Download, Eye, Users, UserCheck, UserX } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/context/role-context';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { createActionNotification } from '@/lib/notifications';

type Question = MockLessonNote & { type: 'Exam Question' | 'Test Question' };
type ClassGenderCount = { male: number; female: number; };

export default function QuestionDetailPage() {
  const params = useParams();
  const { slug } = params;
  const [collectionName, id] = Array.isArray(slug) ? slug : [];

  const [question, setQuestion] = useState<Question | null>(null);
  const [genderCount, setGenderCount] = useState<ClassGenderCount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { role } = useRole();
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const fetchQuestionDetails = useCallback(async () => {
    if (!collectionName || !id) return;
    setIsLoading(true);
    try {
      const questionData = await dbService.getDoc<Question>(collectionName, id);
      if (questionData) {
        setQuestion(questionData);
        // Fetch student counts for the class
        const students = await dbService.getDocs<Student>('students', [
          { type: 'where', fieldPath: 'classLevel', opStr: '==', value: questionData.class }
        ]);
        const counts = students.reduce((acc, student) => {
          if (student.gender === 'Male') acc.male++;
          if (student.gender === 'Female') acc.female++;
          return acc;
        }, { male: 0, female: 0 });
        setGenderCount(counts);

      } else {
        notFound();
      }
    } catch (error) {
      console.error("Error fetching document:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch the question details."
      });
    } finally {
      setIsLoading(false);
    }
  }, [id, collectionName, toast]);

  useEffect(() => {
    fetchQuestionDetails();
  }, [fetchQuestionDetails]);

  const handleReview = async (newStatus: 'Approved' | 'Rejected') => {
    if (!collectionName || !id || !question) return;

    try {
        await dbService.updateDoc(collectionName, id, { status: newStatus });
        
        await createActionNotification({
            userId: question.teacherId,
            title: `Question ${newStatus}`,
            body: `Your ${question.type} submission "${question.title}" has been ${newStatus.toLowerCase()}.`,
            ref: { collection: collectionName, id },
            type: newStatus === 'Approved' ? 'APPROVAL' : 'REJECTION',
        });
        
        toast({
            title: `Question ${newStatus}`,
            description: "The submission has been updated and the teacher notified.",
        });
        fetchQuestionDetails(); // Re-fetch data
    } catch (error) {
        console.error("Error updating question status:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not update the submission.",
        });
    }
  };

  const statusVariant = (status: string) => {
    if (status.includes('Approved')) return 'default';
    if (status.includes('Pending')) return 'secondary';
    if (status.includes('Rejected')) return 'destructive';
    return 'outline';
  };
  
  const getDocumentViewUrl = (fileUrl: string) => {
    const encodedUrl = encodeURIComponent(fileUrl);
    return `https://docs.google.com/gview?url=${encodedUrl}&embedded=true`;
  }

  if (isLoading) {
    return (
       <div className="space-y-8">
        <div>
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="mt-2 h-5 w-1/3" />
        </div>
         <div className="grid gap-8 lg:grid-cols-3">
           <div className="lg:col-span-2 space-y-8">
             <Card><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>
           </div>
           <div className="lg:col-span-1 space-y-8">
              <Card><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><Skeleton className="h-24 w-full" /></CardContent></Card>
           </div>
         </div>
       </div>
    );
  }

  if (!question) {
    return notFound();
  }
  
  const canReview = role === 'ExamOfficer' && question.status === 'Pending Review';

  return (
    <div className="space-y-8">
       <div>
        <h1 className="font-headline text-3xl font-bold">{question.title}</h1>
        <p className="text-muted-foreground">
          {question.type} for {question.class} - {question.subject}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Submitted Document</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-4 rounded-md border p-4">
                    <FileIcon className="h-10 w-10 text-muted-foreground" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {question.title}.{question.fileUrl.split('.').pop()?.split('?')[0]}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Submitted by {question.teacherName} on {question.submittedOn ? format(new Date(question.submittedOn.seconds * 1000), 'PPP') : 'N/A'}
                      </p>
                    </div>
                     <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
                      <DialogTrigger asChild>
                         <Button variant="outline"><Eye className="mr-2 h-4 w-4" /> View</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
                          <DialogHeader className="p-6 pb-0">
                              <DialogTitle>{question.title}</DialogTitle>
                              <DialogDescription>
                                Viewing document. <a href={question.fileUrl} target="_blank" rel="noopener noreferrer" className="underline">Click here to download</a>.
                              </DialogDescription>
                          </DialogHeader>
                           <div className="flex-1 overflow-hidden px-6 pb-6">
                              <iframe src={getDocumentViewUrl(question.fileUrl)} className="w-full h-full border rounded-md"></iframe>
                           </div>
                      </DialogContent>
                    </Dialog>
                    <Button asChild>
                      <a href={question.fileUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="mr-2 h-4 w-4"/> Download
                      </a>
                    </Button>
                  </div>
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-1 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Status & Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                       <span className="text-sm font-medium">Current Status</span>
                       <Badge variant={statusVariant(question.status)}>{question.status}</Badge>
                    </div>
                    <Separator />
                     <div className="space-y-2">
                        <h4 className="text-sm font-medium">Printing Information</h4>
                        {genderCount ? (
                            <div className="flex justify-around rounded-md border p-2 text-center">
                                <div>
                                    <p className="text-xs text-muted-foreground">Male Students</p>
                                    <p className="font-bold text-lg flex items-center justify-center gap-1"><UserCheck /> {genderCount.male}</p>
                                </div>
                                 <div>
                                    <p className="text-xs text-muted-foreground">Female Students</p>
                                    <p className="font-bold text-lg flex items-center justify-center gap-1"><UserX /> {genderCount.female}</p>
                                </div>
                                 <div>
                                    <p className="text-xs text-muted-foreground">Total</p>
                                    <p className="font-bold text-lg flex items-center justify-center gap-1"><Users /> {genderCount.male + genderCount.female}</p>
                                </div>
                            </div>
                        ) : <Skeleton className="h-16 w-full" />}
                     </div>
                </CardContent>
            </Card>

            {canReview && (
              <Card>
                  <CardHeader>
                      <CardTitle>Review & Approval</CardTitle>
                      <CardDescription>Approve this submission or send it back to the teacher.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-end gap-2">
                    <Button variant="destructive" onClick={() => handleReview('Rejected')}>
                        <ThumbsDown className="mr-2 h-4 w-4" /> Reject
                    </Button>
                    <Button onClick={() => handleReview('Approved')}>
                        <ThumbsUp className="mr-2 h-4 w-4" /> Approve
                    </Button>
                  </CardContent>
              </Card>
            )}
        </div>
      </div>
    </div>
  );
}
