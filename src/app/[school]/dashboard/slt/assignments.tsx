
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { dbService } from '@/lib/dbService';
import type { MockUser, Department } from '@/lib/schema';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { assignHod, assignTeacherDepartment } from '@/actions/assignment-actions';
import { Loader2 } from 'lucide-react';

type DepartmentWithHod = Department & { id: string; hodName?: string };
type TeacherWithDepartment = MockUser;

export function SLTAssignments() {
  const [departments, setDepartments] = useState<DepartmentWithHod[]>([]);
  const [teachers, setTeachers] = useState<TeacherWithDepartment[]>([]);
  const [potentialHods, setPotentialHods] = useState<MockUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [depts, users] = await Promise.all([
        dbService.getDocs<Department>('departments'),
        dbService.getDocs<MockUser>('users', [{ type: 'where', fieldPath: 'status', opStr: '==', value: 'active' }]),
      ]);

      const deptWithHodNames = depts.map(dept => {
        const hod = users.find(u => u.id === dept.hodId);
        return { ...dept, hodName: hod?.name || 'Not Assigned' };
      });

      const teachersOnly = users.filter(u => u.role === 'Teacher');
      const hodCandidates = users.filter(u => ['Teacher', 'HeadOfDepartment', 'SLT'].includes(u.role));

      setDepartments(deptWithHodNames);
      setTeachers(teachersOnly);
      setPotentialHods(hodCandidates);
    } catch (error) {
      console.error('Error fetching assignment data:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load data for assignments.' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleHodChange = async (departmentId: string, newHodId: string) => {
    setIsUpdating(`hod-${departmentId}`);
    try {
      const result = await assignHod(departmentId, newHodId);
      if (result.error) throw new Error(result.error);
      toast({ title: 'Success', description: 'Head of Department assigned successfully.' });
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDepartmentChange = async (teacherId: string, newDepartmentName: string) => {
     setIsUpdating(`teacher-${teacherId}`);
     try {
        const result = await assignTeacherDepartment(teacherId, newDepartmentName);
        if (result.error) throw new Error(result.error);
        toast({ title: 'Success', description: "Teacher's department updated successfully." });
        fetchData();
     } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
     } finally {
        setIsUpdating(null);
     }
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Head of Department Assignments</CardTitle>
          <CardDescription>Assign a leader to each academic department.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead>Head of Department (HOD)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map(dept => (
                <TableRow key={dept.id}>
                  <TableCell className="font-medium">{dept.name}</TableCell>
                  <TableCell>
                    {isUpdating === `hod-${dept.id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Select onValueChange={(newHodId) => handleHodChange(dept.id, newHodId)} value={dept.hodId || ''}>
                            <SelectTrigger>
                                <SelectValue placeholder="Assign HOD" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="remove">Remove HOD</SelectItem>
                                {potentialHods.map(hod => (
                                    <SelectItem key={hod.id} value={hod.id}>
                                        {hod.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Teacher Department Assignments</CardTitle>
          <CardDescription>Assign each teacher to their respective department.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Teacher</TableHead>
                <TableHead>Department</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachers.map(teacher => (
                <TableRow key={teacher.id}>
                  <TableCell className="font-medium">{teacher.name}</TableCell>
                  <TableCell>
                     {isUpdating === `teacher-${teacher.id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Select onValueChange={(deptName) => handleDepartmentChange(teacher.id, deptName)} value={teacher.department || ''}>
                            <SelectTrigger>
                                <SelectValue placeholder="Assign Department" />
                            </SelectTrigger>
                            <SelectContent>
                                {departments.map(dept => (
                                    <SelectItem key={dept.id} value={dept.name}>
                                        {dept.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
