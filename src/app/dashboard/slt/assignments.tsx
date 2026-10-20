
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getSLTAssignmentsData } from '@/actions/staff-actions';
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
      const result = await getSLTAssignmentsData();
      if (!result.success || !result.data) {
        throw new Error(result.error || "Could not fetch data");
      }

      setDepartments(result.data.departments as any[]);
      setTeachers(result.data.teachers as any[]);
      setPotentialHods(result.data.potentialHods as any[]);
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
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="shadow-md border-border overflow-hidden relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 to-transparent z-0 pointer-events-none" />
        <CardHeader className="bg-background border-b border-slate-100 pb-4 relative z-10">
          <CardTitle className="text-lg font-bold text-foreground">Head of Department Assignments</CardTitle>
          <CardDescription className="font-medium text-muted-foreground">Assign a leader to each academic department.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 relative z-10">
          <Table>
            <TableHeader className="bg-background">
              <TableRow>
                <TableHead className="font-semibold text-slate-600 pl-6">Department</TableHead>
                <TableHead className="font-semibold text-slate-600 pr-6">Head of Department (HOD)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map(dept => (
                <TableRow key={dept.id} className="hover:bg-background transition-colors">
                  <TableCell className="font-semibold text-slate-900 pl-6">{dept.name}</TableCell>
                  <TableCell className="pr-6 py-4">
                    {isUpdating === `hod-${dept.id}` ? (
                        <div className="flex items-center space-x-2 text-indigo-600 text-sm font-medium">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Updating...</span>
                        </div>
                    ) : (
                        <Select onValueChange={(newHodId) => handleHodChange(dept.id, newHodId)} value={dept.hodId || ''}>
                            <SelectTrigger className="w-full bg-white border-border focus:ring-indigo-500 font-medium text-slate-700 h-10 shadow-sm">
                                <SelectValue placeholder="Assign HOD" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="remove" className="text-rose-600 font-medium">Remove HOD</SelectItem>
                                {potentialHods.map(hod => (
                                    <SelectItem key={hod.id} value={hod.id} className="font-medium text-slate-700">
                                        {hod.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {departments.length === 0 && !isLoading && (
                 <TableRow>
                    <TableCell colSpan={2} className="h-32 text-center text-muted-foreground font-medium">No departments found.</TableCell>
                 </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Card className="shadow-md border-border overflow-hidden relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/30 to-transparent z-0 pointer-events-none" />
        <CardHeader className="bg-background border-b border-slate-100 pb-4 relative z-10">
          <CardTitle className="text-lg font-bold text-foreground">Teacher Department Assignments</CardTitle>
          <CardDescription className="font-medium text-muted-foreground">Assign each teacher to their respective department.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 relative z-10">
          <Table>
            <TableHeader className="bg-background">
              <TableRow>
                <TableHead className="font-semibold text-slate-600 pl-6">Teacher</TableHead>
                <TableHead className="font-semibold text-slate-600 pr-6">Department</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachers.map(teacher => (
                <TableRow key={teacher.id} className="hover:bg-background transition-colors">
                  <TableCell className="font-semibold text-slate-900 pl-6">{teacher.name}</TableCell>
                  <TableCell className="pr-6 py-4">
                     {isUpdating === `teacher-${teacher.id}` ? (
                        <div className="flex items-center space-x-2 text-emerald-600 text-sm font-medium">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Updating...</span>
                        </div>
                    ) : (
                        <Select onValueChange={(deptName) => handleDepartmentChange(teacher.id, deptName)} value={teacher.department || ''}>
                            <SelectTrigger className="w-full bg-white border-border focus:ring-emerald-500 font-medium text-slate-700 h-10 shadow-sm">
                                <SelectValue placeholder="Assign Department" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="remove" className="text-muted-foreground font-medium italic">Unassigned</SelectItem>
                                {departments.map(dept => (
                                    <SelectItem key={dept.id} value={dept.name} className="font-medium text-slate-700">
                                        {dept.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {teachers.length === 0 && !isLoading && (
                 <TableRow>
                    <TableCell colSpan={2} className="h-32 text-center text-muted-foreground font-medium">No teachers found.</TableCell>
                 </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
