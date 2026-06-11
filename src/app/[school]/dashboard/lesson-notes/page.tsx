
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
import { useEffect, useState, useCallback } from 'react';
import { dbService } from '@/lib/dbService';
import type { MockLessonNote } from '@/lib/schema';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DocumentSubmissionForm } from '@/components/dashboard/lesson-notes/add-lesson-note-form';
import usePersistentState from '@/hooks/use-persistent-state';
import { format } from 'date-fns';


export default function LessonNotesPage() {
  const { role, user } = useRole();
  const [notes, setNotes] = useState<MockLessonNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = usePersistentState('lesson-notes-modal-open', false);

  const fetchNotes = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      let constraints: Parameters<typeof dbService.getDocs>[1] = [];
      if (role === 'Teacher') {
        constraints.push({ type: 'where', fieldPath: 'teacherId', opStr: '==', value: user.uid });
      }
      
      const notesList = await dbService.getDocs<MockLessonNote>('lessonNotes', constraints);

      // Sort client-side to avoid composite index requirement
      notesList.sort((a, b) => (b.submittedOn?.seconds || 0) - (a.submittedOn?.seconds || 0));

      setNotes(notesList);
    } catch (error) {
      console.error("Error fetching lesson notes:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch lesson notes. This might be due to a missing database index.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, role, toast]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const statusVariant = (status: string) => {
    if (status.includes('Approved')) return 'default';
    if (status.includes('Pending')) return 'secondary';
    if (status.includes('Rejected') || status.includes('Revision')) return 'destructive';
    return 'outline';
  };

  const getActionText = (noteStatus: string) => {
    if (role === 'Teacher' || noteStatus.includes('Approved')) {
        return 'View';
    }
    if (role === 'HeadOfDepartment' || role === 'Admin' || role === 'SLT') {
        return 'Review';
    }
    return 'View';
  }

  const handleNoteAdded = () => {
    fetchNotes();
    setIsModalOpen(false);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold">Lesson Plans</h1>
        <p className="text-muted-foreground">
          {role === 'Teacher' ? 'Manage and track your lesson plan submissions.' : 'Review and manage all lesson plans.'}
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>All Submissions</CardTitle>
            <CardDescription>
              A complete list of all lesson plans.
            </CardDescription>
          </div>
          {role === 'Teacher' && (
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="mr-2 h-4 w-4" /> Upload Document
                </Button>
              </DialogTrigger>
              <DialogContent>
                 <DialogHeader>
                    <DialogTitle>Upload Document</DialogTitle>
                    <DialogDescription>
                      Select the class, subject, document type, and upload your file. It will be routed to the correct reviewer.
                    </DialogDescription>
                 </DialogHeader>
                 <DocumentSubmissionForm onNoteAdded={handleNoteAdded} documentType="Lesson Plan" />
              </DialogContent>
            </Dialog>
            
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                {role !== 'Teacher' && <TableHead>Teacher</TableHead>}
                <TableHead>Subject</TableHead>
                <TableHead>Submitted On</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                 Array.from({ length: 3 }).map((_, i) => (
                   <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                     {role !== 'Teacher' && <TableCell><Skeleton className="h-5 w-24" /></TableCell>}
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20" /></TableCell>
                  </TableRow>
                 ))
              ) : notes.map((note) => (
                <TableRow key={note.id}>
                  <TableCell className="font-medium">{note.title}</TableCell>
                  {role !== 'Teacher' && <TableCell>{note.teacherName}</TableCell>}
                  <TableCell>{note.subject}</TableCell>
                  <TableCell>{note.submittedOn ? format(new Date(note.submittedOn.seconds * 1000), 'PPP') : 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(note.status)}>{note.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/lesson-notes/${note.id}`}>{getActionText(note.status)}</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
               {!isLoading && notes.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={role !== 'Teacher' ? 6: 5}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No lesson notes found.
                      </TableCell>
                    </TableRow>
                  )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
