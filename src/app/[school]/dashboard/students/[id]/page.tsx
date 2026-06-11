
'use client';

import { useEffect, useState, useCallback } from 'react';
import { notFound, useParams, useRouter } from 'next/navigation';
import { collection, query, where, getDocs, onSnapshot, doc } from '@/lib/firebase-stubs';
import { db, auth, storage } from "@/lib/firebase";
import type { Student } from '@/lib/schema';
import { useRole } from '@/context/role-context';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, FileText, User, Home, HeartPulse, Briefcase, Mail, Phone } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';

export default function StudentProfilePage() {
  const params = useParams();
  const { id } = params;
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { role: currentUserRole } = useRole();

  const studentIdParam = Array.isArray(id) ? id[0] : id;

  const fetchStudent = useCallback(async () => {
    setIsLoading(true);
    if (!studentIdParam) return;
    
    // Decode the student ID from the URL parameter
    const studentId = decodeURIComponent(studentIdParam);

    const studentsRef = collection(db, 'students');
    const q = query(studentsRef, where('studentId', '==', studentId));

    try {
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const studentDoc = querySnapshot.docs[0];
            const studentData = { id: studentDoc.id, ...studentDoc.data() } as Student;
            setStudent(studentData);
        } else {
            notFound();
        }
    } catch(error) {
        console.error("Error fetching student by studentId:", error);
        notFound();
    } finally {
        setIsLoading(false);
    }
  }, [studentIdParam]);

  useEffect(() => {
    fetchStudent();
  }, [fetchStudent]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-24" />
        <Card>
          <CardHeader className="flex flex-row items-center gap-6">
             <Skeleton className="h-24 w-24 rounded-full" />
             <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-5 w-64" />
                <Skeleton className="h-5 w-32" />
             </div>
          </CardHeader>
          <CardContent className="mt-4">
             <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!student) {
    return notFound();
  }

  const canEdit = currentUserRole === 'Admin';
  const studentName = `${student.firstName} ${student.middleName || ''} ${student.lastName}`;
  const studentInitials = `${student.firstName?.[0] || ''}${student.lastName?.[0] || ''}`;
  const primaryGuardian = student.guardians.find(g => g.isPrimary) || student.guardians[0];


  return (
    <div className="space-y-6">
        <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Student List
        </Button>
      <Card>
        <CardHeader>
            <div className="flex flex-col items-center gap-6 md:flex-row">
            <Avatar className="h-24 w-24 border">
                <AvatarImage src={student.profilePicture || undefined} alt={studentName} data-ai-hint="person portrait" />
                <AvatarFallback>{studentInitials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center md:text-left">
                <CardTitle className="text-3xl font-bold">{studentName}</CardTitle>
                <div className="text-muted-foreground mt-1 space-x-2">
                  <span>{student.studentId}</span>
                  <span>&bull;</span>
                  <span>{student.classLevel}</span>
                  <span>&bull;</span>
                  <Badge variant={student.status === 'Active' ? 'secondary' : 'destructive'}>{student.status}</Badge>
                </div>
            </div>
             {canEdit && (
               <Button variant="outline" disabled>
                  <Edit className="mr-2 h-4 w-4" /> Edit Profile
               </Button>
              )}
            </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y rounded-md border bg-muted/20">
            <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2 flex items-center"><User className="mr-2 h-5 w-5 text-primary" /> Personal Details</h3>
                    <div className="text-sm space-y-1 text-muted-foreground">
                        <p><strong>Date of Birth:</strong> {student.dateOfBirth?.seconds ? format(new Date(student.dateOfBirth.seconds * 1000), 'PPP') : 'N/A'}</p>
                        <p><strong>Gender:</strong> {student.gender}</p>
                        <p><strong>Admission Date:</strong> {student.admissionDate?.seconds ? format(new Date(student.admissionDate.seconds * 1000), 'PPP') : 'N/A'}</p>
                        <p><strong>Session:</strong> {student.sessionYear}</p>
                    </div>
                </div>
                 <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2 flex items-center"><HeartPulse className="mr-2 h-5 w-5 text-primary" /> Health Information</h3>
                     <div className="text-sm space-y-1 text-muted-foreground">
                        <p><strong>Medical Conditions:</strong> {student.health?.medicalConditions || 'None specified'}</p>
                    </div>
                </div>
            </div>
             <Separator />
             {primaryGuardian && (
                <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2 flex items-center"><Briefcase className="mr-2 h-5 w-5 text-primary" /> Guardian Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div className="space-y-1">
                            <p><strong>Name:</strong> {primaryGuardian.fullName}</p>
                            <p><strong>Relationship:</strong> {primaryGuardian.relationship}</p>
                        </div>
                         <div className="space-y-1">
                           <p className="flex items-center gap-2"><Phone className="h-4 w-4" /> {primaryGuardian.phone}</p>
                           <p className="flex items-center gap-2"><Mail className="h-4 w-4" /> {primaryGuardian.email}</p>
                        </div>
                        <div className="col-span-full flex items-start gap-2">
                           <Home className="h-4 w-4 mt-1" />
                           <span><strong>Address:</strong> {primaryGuardian.address}</span>
                        </div>
                    </div>
                </div>
             )}
             <Separator />
             <div className="p-4">
                 <h3 className="font-semibold text-lg mb-2 flex items-center"><FileText className="mr-2 h-5 w-5 text-primary" /> Uploaded Documents</h3>
                 {student.documents && student.documents.length > 0 ? (
                    <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                        {student.documents.map((doc, index) => (
                            <li key={index}>
                                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">
                                    {doc.documentType}
                                </a>
                            </li>
                        ))}
                    </ul>
                 ) : (
                    <p className="text-sm text-muted-foreground">No documents uploaded.</p>
                 )}
             </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
