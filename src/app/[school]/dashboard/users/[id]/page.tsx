

'use client';

import { useEffect, useState, useCallback } from 'react';
import { notFound, useParams, useRouter } from 'next/navigation';
import { collection, query, where, getDocs, onSnapshot, doc } from '@/lib/firebase-stubs';
import { db, auth, storage } from "@/lib/firebase";
import type { MockUser } from '@/lib/schema';
import { useRole } from '@/context/role-context';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, FileText, User, Home, HeartPulse, Briefcase, Mail, Phone, AlertCircle, Banknote } from 'lucide-react';
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
import { PersonalInfoForm } from '@/components/dashboard/profile/personal-info-form';
import { ProfessionalInfoForm } from '@/components/dashboard/profile/professional-info-form';
import { BankDetailsForm } from '@/components/dashboard/profile/bank-details-form';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { authService } from '@/lib/authService';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export default function UserProfilePage() {
  const params = useParams();
  const { id } = params;
  const router = useRouter();
  const [user, setUser] = useState<MockUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [personalInfoModalOpen, setPersonalInfoModalOpen] = useState(false);
  const [profInfoModalOpen, setProfInfoModalOpen] = useState(false);
  const [bankInfoModalOpen, setBankInfoModalOpen] = useState(false);
  const { role: currentUserRole, user: authUser } = useRole();

  const staffId = Array.isArray(id) ? id[0] : id;

  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    if (!staffId) return;

    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('staffId', '==', staffId));

        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const userData = { id: userDoc.id, ...userDoc.data() } as MockUser;
            setUser(userData);
        } else {
            notFound();
        }
    } catch(error) {
        console.error("Error fetching user by staffId:", error);
        notFound();
    } finally {
        setIsLoading(false);
    }
  }, [staffId]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleUpdate = () => {
    fetchUser(); // Re-fetch to ensure data is fresh
    setPersonalInfoModalOpen(false);
    setProfInfoModalOpen(false);
    setBankInfoModalOpen(false);
  };
  
  const isOwnProfile = user && authUser?.uid === user.id;
  const isAdmin = currentUserRole === 'Admin';
  
  const canEditPersonalInfo = isAdmin || isOwnProfile;
  const canEditBankDetails = isAdmin || isOwnProfile;
  
  const bankDetailsMissing = !user?.salary?.bankName || !user?.salary?.accountNumber || !user?.salary?.accountName;


  if (isLoading) {
    return (
      <div className="space-y-6">
         <Skeleton className="h-9 w-48" />
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
             <Skeleton className="h-20 w-20 rounded-full" />
             <div className="space-y-2">
                <Skeleton className="h-7 w-40" />
                <Skeleton className="h-5 w-60" />
             </div>
          </CardHeader>
          <CardContent>
             <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return notFound();
  }

  const userInitials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
    : '';

  return (
    <div className="space-y-6">
        <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
        </Button>
      <Card>
        <CardHeader>
            <div className="flex flex-col items-center gap-4 text-center md:flex-row md:text-left">
            <Avatar className="h-20 w-20">
                <AvatarImage src={user.personalInfo?.profilePicture || undefined} />
                <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
                <CardTitle className="text-3xl">{user.name}</CardTitle>
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
                        <Dialog open={profInfoModalOpen} onOpenChange={setProfInfoModalOpen}>
                            <DialogTrigger asChild><Button variant="outline" size="sm"><Edit className="mr-2 h-4 w-4" /> Edit</Button></DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Edit Professional Information</DialogTitle>
                                </DialogHeader>
                                <ProfessionalInfoForm user={user} onUpdate={handleUpdate} />
                            </DialogContent>
                        </Dialog>
                   )}
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <p><strong>Role:</strong> {user.role}</p>
                    <p><strong>Department:</strong> {user.department}</p>
                    <p><strong>Employment Type:</strong> {user.employmentType || 'N/A'}</p>
                    <p><strong>Employment Date:</strong> {user.employmentDate?.seconds ? new Date(user.employmentDate.seconds * 1000).toLocaleDateString() : 'N/A'}</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                   <div>
                    <CardTitle>Personal Details</CardTitle>
                    <CardDescription>Contact and demographic information.</CardDescription>
                   </div>
                   {canEditPersonalInfo && (
                     <Dialog open={personalInfoModalOpen} onOpenChange={setPersonalInfoModalOpen}>
                        <DialogTrigger asChild><Button variant="outline" size="sm"><Edit className="mr-2 h-4 w-4" /> Edit</Button></DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Edit Personal Information</DialogTitle>
                            </DialogHeader>
                            <PersonalInfoForm user={user} onUpdate={handleUpdate} />
                        </DialogContent>
                    </Dialog>
                   )}
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                   <p><strong>Phone:</strong> {user.phone}</p>
                   <p><strong>Address:</strong> {user.personalInfo?.address}</p>
                   <p><strong>Date of Birth:</strong> {user.personalInfo?.dob?.seconds ? new Date(user.personalInfo.dob.seconds * 1000).toLocaleDateString() : 'N/A'}</p>
                   <p><strong>Gender:</strong> {user.personalInfo?.gender}</p>
                   <p><strong>Next of Kin:</strong> {user.personalInfo?.nextOfKin || 'N/A'}</p>
                   <p><strong>State of Origin:</strong> {user.stateOfOrigin}</p>
                </CardContent>
            </Card>
        </div>

         <Card className="lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between">
               <div>
                <CardTitle>Bank & Salary</CardTitle>
                <CardDescription>Financial details for salary payment.</CardDescription>
               </div>
               {canEditBankDetails && (
                    <Dialog open={bankInfoModalOpen} onOpenChange={setBankInfoModalOpen}>
                        <DialogTrigger asChild><Button variant="outline" size="sm"><Edit className="mr-2 h-4 w-4" /> Edit</Button></DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Edit Bank & Salary Details</DialogTitle>
                            </DialogHeader>
                            <BankDetailsForm user={user} onUpdate={handleUpdate} />
                        </DialogContent>
                    </Dialog>
               )}
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
                <p><strong>Salary:</strong> {isAdmin ? `NGN ${user.salary?.amount.toLocaleString() || '0'}` : 'Hidden'}</p>
                <p><strong>Bank Name:</strong> {user.salary?.bankName || 'Not Set'}</p>
                <p><strong>Account Number:</strong> {user.salary?.accountNumber || 'Not Set'}</p>
                <p><strong>Account Name:</strong> {user.salary?.accountName || 'Not Set'}</p>
            </CardContent>
        </Card>
      </div>

    </div>
  );
}
