
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Users, Briefcase } from 'lucide-react';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { collection, getDocs, query, where } from '@/lib/firebase-stubs';
import { db, auth, storage } from "@/lib/firebase";
import type { MockUser } from '@/lib/schema';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function StaffDirectoryReportPage() {
  const [staff, setStaff] = useState<MockUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchStaff = useCallback(async () => {
    setIsLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('staffId', '!=', null));
      const querySnapshot = await getDocs(q);
      const staffList = querySnapshot.docs.map(
        (doc: any) => ({ id: doc.id, ...doc.data() } as MockUser)
      );
      setStaff(staffList);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not fetch staff data for the report.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const staffStats = useMemo(() => {
    if (isLoading) return { total: 0, roles: {} };
    const roles: Record<string, number> = {};
    staff.forEach((user) => {
      roles[user.role] = (roles[user.role] || 0) + 1;
    });
    return {
      total: staff.length,
      roles,
    };
  }, [staff, isLoading]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold">Staff Directory Report</h1>
        <p className="text-muted-foreground">
          An overview of all staff members and their roles.
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
        <CardHeader>
          <CardTitle>Full Staff Directory</CardTitle>
          <CardDescription>A detailed list of all staff members.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Profile</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="ml-auto h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : (
                staff.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono text-xs">{user.staffId}</TableCell>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell><Badge variant="outline">{user.role}</Badge></TableCell>
                    <TableCell>{user.department}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="icon">
                        <Link href={`/dashboard/users/${user.staffId}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
              {!isLoading && staff.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">No staff data found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
