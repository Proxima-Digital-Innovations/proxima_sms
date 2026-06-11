
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
import { Eye, User, Users } from 'lucide-react';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { collection, getDocs, query, orderBy } from '@/lib/firebase-stubs';
import { db, auth, storage } from "@/lib/firebase";
import type { Student } from '@/lib/schema';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function StudentDemographicsReportPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const studentsRef = collection(db, 'students');
      const q = query(studentsRef, orderBy('studentId', 'asc'));
      const querySnapshot = await getDocs(q);
      const studentsList = querySnapshot.docs.map(
        (doc: any) => ({ id: doc.id, ...doc.data() } as Student)
      );
      setStudents(studentsList);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not fetch student data for the report.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const studentStats = useMemo(() => {
    if (isLoading) return { total: 0, male: 0, female: 0, other: 0 };
    return students.reduce(
      (acc, student) => {
        acc.total++;
        if (student.gender === 'Male') acc.male++;
        else if (student.gender === 'Female') acc.female++;
        else acc.other++;
        return acc;
      },
      { total: 0, male: 0, female: 0, other: 0 }
    );
  }, [students, isLoading]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold">Student Demographics Report</h1>
        <p className="text-muted-foreground">
          An overview of student enrollment and demographic data.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{studentStats.total}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Male Students</CardTitle>
            <User className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{studentStats.male}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Female Students</CardTitle>
            <User className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{studentStats.female}</div>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Full Student Roster</CardTitle>
          <CardDescription>A detailed list of all enrolled students.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Profile</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="ml-auto h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : (
                students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-mono text-xs">{student.studentId}</TableCell>
                    <TableCell className="font-medium">{`${student.firstName} ${student.lastName}`}</TableCell>
                    <TableCell><Badge variant="outline">{student.classLevel}</Badge></TableCell>
                    <TableCell>{student.gender}</TableCell>
                    <TableCell>
                      <Badge variant={student.status === 'Active' ? 'secondary' : 'destructive'}>{student.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="icon">
                        <Link href={`/dashboard/students/${encodeURIComponent(student.studentId)}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
              {!isLoading && students.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">No student data found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
