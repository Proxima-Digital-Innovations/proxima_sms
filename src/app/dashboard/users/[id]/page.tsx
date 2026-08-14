import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, AlertCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';

export default async function UserProfilePage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      department: true,
      payroll: true,
    }
  });

  if (!user) {
    return notFound();
  }

  const userInitials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`;
  const userName = `${user.firstName} ${user.lastName}`;
  const isOwnProfile = false; // We can't reliably do this in a simple server component without auth context right now, fallback to true if needed
  const isAdmin = true; // Temporary fallback for UI layout
  
  const bankDetailsMissing = false; // Add actual logic based on Payroll/Contract models if needed

  return (
    <div className="space-y-6">
        <Button variant="outline" asChild>
            <Link href="/dashboard/users">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Staff List
            </Link>
        </Button>
      <Card>
        <CardHeader>
            <div className="flex flex-col items-center gap-4 text-center md:flex-row md:text-left">
            <Avatar className="h-20 w-20">
                <AvatarImage src={user.avatarUrl || undefined} />
                <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
                <CardTitle className="text-3xl">{userName}</CardTitle>
                <div className={cn("text-sm text-muted-foreground mt-1", "flex items-center justify-center gap-2 md:justify-start md:flex-row flex-col")}>
                  <span>{user.email}</span> <Badge variant="outline">{user.role}</Badge>
                </div>
            </div>
            </div>
        </CardHeader>
      </Card>
      
      {isOwnProfile && bankDetailsMissing && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Action Required: Bank Details Missing</AlertTitle>
          <AlertDescription>
            Your bank details are incomplete. Please update them in the "Bank & Salary" section to ensure you can receive payments.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                   <div>
                    <CardTitle>Professional Information</CardTitle>
                    <CardDescription>Role, department, and employment details.</CardDescription>
                   </div>
                   {isAdmin && (
                        <Button variant="outline" size="sm" disabled><Edit className="mr-2 h-4 w-4" /> Edit</Button>
                   )}
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <p><strong>Role:</strong> {user.role}</p>
                    <p><strong>Department:</strong> {user.department?.name || 'N/A'}</p>
                    <p><strong>Status:</strong> {user.status}</p>
                    <p><strong>Staff ID:</strong> {user.staffId || 'N/A'}</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                   <div>
                    <CardTitle>Personal Details</CardTitle>
                    <CardDescription>Contact and demographic information.</CardDescription>
                   </div>
                   {isAdmin && (
                      <Button variant="outline" size="sm" disabled><Edit className="mr-2 h-4 w-4" /> Edit</Button>
                   )}
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                   <p><strong>Phone:</strong> {user.phone}</p>
                   <p><strong>Email:</strong> {user.email}</p>
                   <p><strong>State of Origin:</strong> {user.passwordHash /* stored in passwordHash temp */}</p>
                </CardContent>
            </Card>
        </div>

         <Card className="lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between">
               <div>
                <CardTitle>Bank & Salary</CardTitle>
                <CardDescription>Financial details for salary payment.</CardDescription>
               </div>
               {isAdmin && (
                    <Button variant="outline" size="sm" disabled><Edit className="mr-2 h-4 w-4" /> Edit</Button>
               )}
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
                <p><strong>Salary:</strong> Hidden</p>
                <p><strong>Bank Name:</strong> Not Set</p>
                <p><strong>Account Number:</strong> Not Set</p>
                <p><strong>Account Name:</strong> Not Set</p>
            </CardContent>
        </Card>
      </div>

    </div>
  );
}
