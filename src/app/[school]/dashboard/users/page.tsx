
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AddUserForm } from '@/components/dashboard/users/add-user-form';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, Edit, Upload, Users, Briefcase } from 'lucide-react';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { collection, getDocs, deleteDoc, doc, query, where, updateDoc } from '@/lib/firebase-stubs';
import { db, auth, storage } from "@/lib/firebase";
import type { MockUser } from '@/lib/schema';
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
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { BulkStaffUploadDialog } from '@/components/dashboard/users/bulk-staff-upload-dialog';
import usePersistentState from '@/hooks/use-persistent-state';

export default function UsersPage() {
  const [users, setUsers] = useState<MockUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = usePersistentState('users-add-modal-open', false);
  const [isBulkModalOpen, setIsBulkModalOpen] = usePersistentState('users-bulk-modal-open', false);
  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const usersRef = collection(db, 'users');
      // Query for users that have a staffId field to ensure they are staff
      const q = query(usersRef, where('staffId', '!=', null));
      const querySnapshot = await getDocs(q);
      const usersList = querySnapshot.docs
        .map((doc: any) => ({ id: doc.id, ...doc.data() } as MockUser))
      setUsers(usersList);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not fetch users.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const removeUser = async (userId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this staff member? This action cannot be undone.'
      )
    )
      return;
    try {
      // Note: This does not delete the user from Firebase Auth, only Firestore.
      // A more robust solution would use a Cloud Function to delete the Auth user.
      await deleteDoc(doc(db, 'users', userId));
      toast({
        title: 'Staff Member Removed',
        description: 'The staff member has been successfully deleted.',
      });
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error('Error removing user:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not remove the staff member.',
      });
    }
  };

  const handleUserAdded = () => {
    fetchUsers();
    setIsAddModalOpen(false);
    setIsBulkModalOpen(false);
  };

  const staffStats = useMemo(() => {
    if (isLoading) return { total: 0, roles: {} };
    const roles: Record<string, number> = {};
    users.forEach(user => {
        roles[user.role] = (roles[user.role] || 0) + 1;
    });
    return {
        total: users.length,
        roles,
    };
  }, [users, isLoading]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold">Staff Directory</h1>
        <p className="text-muted-foreground">
          View, manage, and analyze all staff records.
        </p>
      </div>

       <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{staffStats.total}</div>}
          </CardContent>
        </Card>
         {Object.entries(staffStats.roles).map(([role, count]) => (
             <Card key={role}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{role}</CardTitle>
                    <Briefcase className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{count}</div>}
                </CardContent>
            </Card>
         ))}
      </div>


      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>All Staff ({users.length})</CardTitle>
            <CardDescription>
              A list of all staff members in the system.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Dialog open={isBulkModalOpen} onOpenChange={setIsBulkModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="mr-2 h-4 w-4" /> Bulk Upload
                </Button>
              </DialogTrigger>
              <BulkStaffUploadDialog onUploadComplete={handleUserAdded} />
            </Dialog>
           <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Staff
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <div className="mx-auto mb-4">
                        <Image
                            src="/school-logo.png"
                            alt="School OS Logo"
                            width={250}
                            height={60}
                        />
                    </div>
                    <DialogTitle>Create New Staff Profile</DialogTitle>
                    <DialogDescription>
                       Fill out the details to create a new staff account. The default password will be their State of Origin.
                    </DialogDescription>
                </DialogHeader>
                <AddUserForm onUserAdded={handleUserAdded} />
            </DialogContent>
          </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden sm:table-cell">Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-5 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-5 w-36" />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Skeleton className="h-6 w-24" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-8 w-20" />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono text-xs">{user.staffId || 'N/A'}</TableCell>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{user.email}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                       <Badge variant="outline">{user.role}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                       <Button asChild variant="outline" size="icon">
                         <Link href={`/dashboard/users/${user.staffId}`}>
                           <Edit className="h-4 w-4" />
                         </Link>
                       </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeUser(user.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
              {!isLoading && users.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No users found.
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
