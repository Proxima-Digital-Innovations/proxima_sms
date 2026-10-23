import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, AlertCircle, Building2, User as UserIcon, Phone, Banknote, Clock, ShieldCheck } from 'lucide-react';
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
import { format } from 'date-fns';

export default async function UserProfilePage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      department: true,
      payroll: {
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        take: 3,
      },
    }
  });

  if (!user) {
    return notFound();
  }

  const userInitials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`;
  const userName = `${user.firstName} ${user.lastName}`;

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild className="rounded-xl">
          <Link href="/dashboard/users">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Staff Directory
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs px-3 py-1">
            {user.staffId || 'NO STAFF ID'}
          </Badge>
          <Badge className="bg-emerald-600 text-white">
            {user.status.toUpperCase()}
          </Badge>
        </div>
      </div>

      <Card className="border-border bg-card shadow-sm rounded-2xl">
        <CardHeader>
          <div className="flex flex-col items-center gap-5 text-center md:flex-row md:text-left">
            <Avatar className="h-24 w-24 border-2 border-violet-500/20 shadow-md">
              <AvatarImage src={user.avatarUrl || undefined} />
              <AvatarFallback className="text-2xl font-bold bg-violet-600 text-white">{userInitials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start">
                <CardTitle className="text-3xl font-extrabold text-foreground">{userName}</CardTitle>
                <Badge variant="outline" className="bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20">
                  {user.role}
                </Badge>
                {user.department && (
                  <Badge variant="outline" className="bg-muted text-muted-foreground">
                    {user.department.name}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{user.email} • {user.phone || 'No phone configured'}</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal & Demographic Details */}
        <Card className="border-border bg-card shadow-sm rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
              <UserIcon className="h-4 w-4 text-violet-500" /> Personal & Demographics
            </CardTitle>
            <CardDescription>Personal background and origin information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Gender</span>
              <span className="font-medium text-foreground">{user.gender || 'Not Specified'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Date of Birth</span>
              <span className="font-medium text-foreground">
                {user.dateOfBirth ? format(new Date(user.dateOfBirth), 'PPP') : 'Not Set'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">State of Origin</span>
              <span className="font-medium text-foreground">{user.stateOfOrigin || 'Not Specified'}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Residential Address</span>
              <span className="font-medium text-foreground text-right max-w-xs">{user.address || 'Not Configured'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Professional & Assignment */}
        <Card className="border-border bg-card shadow-sm rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
              <Building2 className="h-4 w-4 text-amber-500" /> Professional Assignment
            </CardTitle>
            <CardDescription>School designation and appointment timeline.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Official Role</span>
              <span className="font-medium text-foreground">{user.role}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Assigned Department</span>
              <span className="font-medium text-foreground">{user.department?.name || 'General / Unassigned'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Staff ID</span>
              <span className="font-mono font-bold text-foreground">{user.staffId || 'None'}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Date of Employment</span>
              <span className="font-medium text-foreground">
                {user.dateOfEmployment ? format(new Date(user.dateOfEmployment), 'PPP') : format(new Date(user.createdAt), 'PPP')}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Compensation & Payroll */}
        <Card className="border-border bg-card shadow-sm rounded-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                <Banknote className="h-4 w-4 text-emerald-500" /> Compensation & Payroll
              </CardTitle>
              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                Active
              </Badge>
            </div>
            <CardDescription>Monthly compensation details and salary baseline.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Monthly Base Salary</span>
              <span className="font-mono font-bold text-base text-emerald-600 dark:text-emerald-400">
                ₦{(user.baseSalary || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Payroll Status</span>
              <span className="font-medium text-foreground">Active Subscription</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Recent Payslips Generated</span>
              <span className="font-medium text-foreground">{user.payroll.length} records</span>
            </div>
          </CardContent>
        </Card>

        {/* Biometric Attendance & Shift Schedule */}
        <Card className="border-border bg-card shadow-sm rounded-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                <Clock className="h-4 w-4 text-indigo-500" /> Biometrics & Attendance (BAS)
              </CardTitle>
              <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
                {user.kioskPin ? 'PIN Enabled' : 'No PIN'}
              </Badge>
            </div>
            <CardDescription>Kiosk clock-in parameters and shift schedule.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Kiosk Clock-in PIN</span>
              <span className="font-mono font-bold text-foreground tracking-widest">
                {user.kioskPin ? '••••' : 'Not Set'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Scheduled Shift Window</span>
              <span className="font-mono font-medium text-foreground">
                {user.clockInTime || '08:00'} - {user.clockOutTime || '17:00'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Grace Period</span>
              <span className="font-medium text-foreground">{user.gracePeriod || 15} mins</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Biometric Enrollment</span>
              <span className="font-medium text-foreground">
                {user.isBiometricEnrolled ? 'Enrolled (Fingerprint/Face)' : 'PIN Clock-in Only'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

