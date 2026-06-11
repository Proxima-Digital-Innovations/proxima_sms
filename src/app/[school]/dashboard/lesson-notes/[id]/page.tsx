

'use client';

import { useEffect, useState, useCallback } from 'react';
import { notFound, useParams } from 'next/navigation';
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from '@/lib/firebase-stubs';
import { dbService } from '@/lib/dbService';
import type { MockLessonNote } from '@/lib/schema';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Check, Send, ThumbsDown, ThumbsUp, User, File as FileIcon, AlertTriangle, Upload, Eye } from 'lucide-react';
import { ReviewForm } from '@/components/dashboard/lesson-notes/review-form';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/context/role-context';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DocumentSubmissionForm } from '@/components/dashboard/lesson-notes/add-lesson-note-form';
import { format } from 'date-fns';
import { LessonNoteSummarizer } from '@/components/lesson-note-summarizer';
import { createActionNotification } from '@/lib/notifications';


export default function LessonNoteDetailPage() {
  const params = useParams();
  const { id } = params;
  const [note, setNote] = useState<MockLessonNote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { role, user } = useRole();
  const [isResubmitModalOpen, setIsResubmitModalOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const fetchNote = useCallback(async () => {
    if (typeof id !== 'string') return;
    setIsLoading(true);
    try {
      const noteData = await dbService.getDoc<MockLessonNote>('lessonNotes', id);
      if (noteData) {
        setNote(noteData);
      } else {
        notFound();
      }
    } catch (error) {
      console.error("Error fetching document:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch the lesson note."
      });
    } finally {
      setIsLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  const handleReview = async (action: 'Revision', comment: string) => {
    if (typeof id !== 'string' || !note || !user) return;

    let newStatus: 'Needs Revision' = 'Needs Revision';

    const reviewerName = user.name || 'Reviewer';
    const reviewComment = `${newStatus} by ${reviewerName}: ${comment}`;
    
    let reviewData = {};

    if (role === 'HeadOfDepartment') {
      reviewData = { status: newStatus, hod_review: reviewComment, admin_review: null }; 
    } else if (role === 'Admin' || role === 'SLT') {
       reviewData = { status: newStatus, admin_review: reviewComment, hod_review: note.hod_review };
    } else {
      toast({ variant: "destructive", title: "Unauthorized", description: "You do not have permission to review this."});
      return;
    }


    try {
        await dbService.updateDoc('lessonNotes', id, reviewData);
        
        await createActionNotification({
            userId: note.teacherId,
            title: `Lesson Note: ${newStatus}`,
            body: `Your lesson note "${note.title}" has been marked for revision. Feedback: ${comment}`,
            ref: {
                collection: 'lessonNotes',
                id: note.id,
            },
            type: 'REJECTION'
        });

        toast({
            title: `Lesson Note ${newStatus}`,
            description: "The status has been updated and the teacher has been notified.",
        });
        fetchNote(); // Re-fetch the note to show updated status
    } catch (error) {
         console.error("Error updating document:", error);
         toast({
            variant: "destructive",
            title: "Error",
            description: "Could not update the lesson note.",
        });
    }
  }

  const handleApprove = async () => {
    if (typeof id !== 'string' || !note || !user) return;
    
    const reviewerName = user.name || 'Reviewer';
    const reviewComment = `Approved by ${reviewerName}`;
    let reviewData = {};

     if (role === 'HeadOfDepartment') {
      reviewData = { status: 'Approved', hod_review: reviewComment, admin_review: null };
    } else if (role === 'Admin' || role === 'SLT') {
       reviewData = { status: 'Approved', admin_review: reviewComment, hod_review: note.hod_review };
    } else {
      toast({ variant: "destructive", title: "Unauthorized", description: "You do not have permission to approve this."});
      return;
    }

    try {
        await dbService.updateDoc('lessonNotes', id, reviewData);
        
        await createActionNotification({
            userId: note.teacherId,
            title: `Lesson Note: Approved`,
            body: `Your lesson note "${note.title}" has been approved.`,
            ref: {
                collection: 'lessonNotes',
                id: note.id,
            },
            type: 'APPROVAL'
        });

        toast({
            title: `Lesson Note Approved`,
            description: "The status has been updated and the teacher has been notified.",
        });
        fetchNote(); // Re-fetch the note to show updated status
    } catch (error) {
        console.error("Error approving document:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not approve the lesson note.",
        });
    }
  };

  const handleResubmission = () => {
    fetchNote();
    setIsResubmitModalOpen(false);
  };

  const statusVariant = (status: string) => {
    if (status.includes('Approved')) return 'default';
    if (status.includes('Pending')) return 'secondary';
    if (status.includes('Rejected')) return 'destructive';
    if (status.includes('Revision')) return 'destructive';
    return 'outline';
  };
  
  const getReviewerFeedback = () => {
    if (note?.status.includes('Needs Revision')) {
      // Show the most recent feedback
      return note.admin_review || note.hod_review;
    }
    return null;
  }
  
  const getDocumentViewUrl = (fileUrl: string) => {
    const encodedUrl = encodeURIComponent(fileUrl);
    return `https://docs.google.com/gview?url=${encodedUrl}&embedded=true`;
  }
  
  const formattedSubmissionDate = note?.submittedOn ? format(new Date(note.submittedOn.seconds * 1000), 'PPP') : 'N/A';


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
             <Card><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><Skeleton className="h-24 w-full" /></CardContent></Card>
           </div>
           <div className="lg:col-span-1 space-y-8">
              <Card><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><Skeleton className="h-24 w-full" /></CardContent></Card>
              <Card><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><Skeleton className="h-32 w-full" /></CardContent></Card>
           </div>
         </div>
       </div>
    );
  }

  if (!note) {
    return notFound();
  }
  
  const reviewerFeedback = getReviewerFeedback();
  const canTeacherResubmit = role === 'Teacher' && note.status === 'Needs Revision';
  const canReview = (role === 'Admin' || role === 'HeadOfDepartment' || role === 'SLT') && !note.status.includes('Approved');
  const showSummarizer = (role === 'Admin' || role === 'HeadOfDepartment' || role === 'SLT');

  return (
    <div className="space-y-8">
       <div>
        <h1 className="font-headline text-3xl font-bold">{note.title}</h1>
        <p className="text-muted-foreground">
          Submitted by {note.teacherName} on {formattedSubmissionDate}
        </p>
      </div>

       {reviewerFeedback && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Revision Requested</AlertTitle>
          <AlertDescription>
            {reviewerFeedback.replace(/Needs Revision by.*?:/, 'Feedback:')}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Lesson Note Document</CardTitle>
                    <CardDescription>Subject: {note.subject}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {note.fileUrl ? (
                    <div className="flex items-center space-x-4 rounded-md border p-4">
                      <FileIcon className="h-10 w-10 text-muted-foreground" />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {note.title}.{note.fileUrl.split('.').pop()?.split('?')[0]}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Click to view or download the file.
                        </p>
                      </div>
                       <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
                        <DialogTrigger asChild>
                           <Button variant="outline"><Eye className="mr-2 h-4 w-4" /> View</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
                            <DialogHeader className="p-6 pb-0">
                                <DialogTitle>{note.title}</DialogTitle>
                                <DialogDescription>
                                  Viewing document. <a href={note.fileUrl} target="_blank" rel="noopener noreferrer" className="underline">Click here to download</a>.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex-1 overflow-hidden px-6 pb-6">
                              <iframe src={getDocumentViewUrl(note.fileUrl)} className="w-full h-full border rounded-md"></iframe>
                            </div>
                        </DialogContent>
                      </Dialog>
                      <Button asChild>
                        <a href={note.fileUrl} target="_blank" rel="noopener noreferrer">Download</a>
                      </Button>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No file was uploaded for this lesson note.</p>
                  )}
                   {canTeacherResubmit && (
                      <Dialog open={isResubmitModalOpen} onOpenChange={setIsResubmitModalOpen}>
                        <DialogTrigger asChild>
                          <Button className="w-full">
                            <Upload className="mr-2 h-4 w-4" />
                            Re-upload Corrected File
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Resubmit Corrected Document</DialogTitle>
                            <DialogDescription>
                              Upload the new version of your file. This will replace the previous one and restart the review process.
                            </DialogDescription>
                          </DialogHeader>
                          <DocumentSubmissionForm
                            onNoteAdded={handleResubmission}
                            existingNoteData={note}
                            isResubmission={true}
                          />
                        </DialogContent>
                      </Dialog>
                    )}
                </CardContent>
            </Card>
            {canReview && (
              <Card>
                  <CardHeader>
                      <CardTitle>Review & Approval</CardTitle>
                      <CardDescription>Approve this submission or request corrections from the teacher.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-end">
                       <Button onClick={handleApprove}>
                          <ThumbsUp className="mr-2 h-4 w-4" />
                          Approve
                        </Button>
                    </div>
                    <Separator />
                    <ReviewForm onSubmit={handleReview} />
                  </CardContent>
              </Card>
            )}
        </div>
        <div className="lg:col-span-1 space-y-8">
            {showSummarizer && note.content && (
              <LessonNoteSummarizer lessonNotes={note.content} subject={note.subject} className={note.class} />
            )}
            <Card>
                <CardHeader>
                    <CardTitle>Status & History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                       <span className="text-sm font-medium">Current Status</span>
                       <Badge variant={statusVariant(note.status)}>{note.status}</Badge>
                    </div>
                    <Separator />
                    <ul className="space-y-4">
                        <li className="flex gap-4">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                                <Send className="h-4 w-4"/>
                            </div>
                            <div>
                                <p className="font-medium">Submitted by Teacher</p>
                                <p className="text-sm text-muted-foreground">{note.teacherName} on {formattedSubmissionDate}</p>
                            </div>
                        </li>
                         {note.hod_review && (
                             <li className="flex gap-4">
                                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${note.status.includes('Approved') ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                    <User className="h-4 w-4"/>
                                </div>
                                <div>
                                    <p className="font-medium">HOD Review</p>
                                    <p className="text-sm text-muted-foreground">{note.hod_review}</p>
                                </div>
                            </li>
                         )}
                         {note.admin_review && (
                             <li className="flex gap-4">
                                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${note.status.includes('Approved') ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                    <Check className="h-4 w-4"/>
                                </div>
                                <div>
                                    <p className="font-medium">Admin Review</p>
                                    <p className="text-sm text-muted-foreground">{note.admin_review}</p>
                                </div>
                            </li>
                         )}
                         {note.status.includes('Approved') && (
                             <li className="flex gap-4">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
                                    <Check className="h-4 w-4"/>
                                </div>
                                <div>
                                    <p className="font-medium">Approved & Archived</p>
                                    <p className="text-sm text-muted-foreground">This lesson note is now official.</p>
                                </div>
                            </li>
                         )}
                    </ul>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
