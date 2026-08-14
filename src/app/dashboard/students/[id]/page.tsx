import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, FileText, User, Home, HeartPulse, Briefcase, Mail, Phone } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import Link from 'next/link';

export default async function StudentProfilePage(props: {
  params: Promise<{ id: string; school: string }>;
}) {
  const { id, school: schoolSlug } = await props.params;

  const student = await prisma.student.findUnique({
    where: { id: id },
    include: {
      guardians: true,
      healthRecord: true,
      class: true,
    },
  });

  if (!student) {
    return notFound();
  }

  const studentName = `${student.firstName} ${student.middleName || ''} ${student.lastName}`.trim();
  const studentInitials = `${student.firstName?.[0] || ''}${student.lastName?.[0] || ''}`;
  const primaryGuardian = student.guardians.find(g => g.isPrimary) || student.guardians[0];

  return (
    <div className="space-y-6">
      <Button variant="outline" asChild>
        <Link href={`/${schoolSlug}/dashboard/students`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Student List
        </Link>
      </Button>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col items-center gap-6 md:flex-row">
            <Avatar className="h-24 w-24 border">
              <AvatarImage src={undefined} alt={studentName} data-ai-hint="person portrait" />
              <AvatarFallback>{studentInitials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center md:text-left">
              <CardTitle className="text-3xl font-bold">{studentName}</CardTitle>
              <div className="text-muted-foreground mt-1 space-x-2">
                <span>{student.studentId}</span>
                <span>&bull;</span>
                <span>{student.class?.name || 'Unassigned Class'}</span>
                <span>&bull;</span>
                <Badge variant={student.status === 'Active' ? 'secondary' : 'destructive'}>{student.status}</Badge>
              </div>
            </div>
            <Button variant="outline" disabled>
              <Edit className="mr-2 h-4 w-4" /> Edit Profile
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y rounded-md border bg-muted/20">
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2 flex items-center"><User className="mr-2 h-5 w-5 text-primary" /> Personal Details</h3>
                <div className="text-sm space-y-1 text-muted-foreground">
                  <p><strong>Date of Birth:</strong> {student.dateOfBirth ? format(new Date(student.dateOfBirth), 'PPP') : 'N/A'}</p>
                  <p><strong>Gender:</strong> {student.gender}</p>
                  <p><strong>Admission Date:</strong> {student.admissionDate ? format(new Date(student.admissionDate), 'PPP') : 'N/A'}</p>
                  <p><strong>Session:</strong> {student.sessionYear}</p>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2 flex items-center"><HeartPulse className="mr-2 h-5 w-5 text-primary" /> Health Information</h3>
                <div className="text-sm space-y-1 text-muted-foreground">
                  <p><strong>Blood Group:</strong> {student.healthRecord?.bloodGroup || 'Not specified'}</p>
                  <p><strong>Genotype:</strong> {student.healthRecord?.genotype || 'Not specified'}</p>
                  <p><strong>Allergies:</strong> {student.healthRecord?.allergies || 'None specified'}</p>
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
