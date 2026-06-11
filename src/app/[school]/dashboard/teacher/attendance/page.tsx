
'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/context/role-context';
import { dbService } from '@/lib/dbService';
import type { Student, MockUser, ClassData } from '@/lib/schema';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Save } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { saveAttendance } from '@/actions/attendance-actions';

type AttendanceStatus = 'Present' | 'Absent' | 'Late';
type AttendanceRecord = Record<string, AttendanceStatus>;

export default function AttendancePage() {
  const { user, isLoading: isUserLoading } = useRole();
  const { toast } = useToast();
  
  const [teacherClass, setTeacherClass] = useState<ClassData | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord>({});
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch teacher's assigned class and the students in it
  const fetchClassData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const teacherDoc = await dbService.getDoc<MockUser>('users', user.uid);
      const assignedClassName = teacherDoc?.className;

      if (!assignedClassName) {
        toast({ variant: 'destructive', title: 'Not a Class Teacher', description: 'You have not been assigned as a class teacher.' });
        setIsLoading(false);
        return;
      }
      
      const classQuery = await dbService.getDocs<ClassData>('classes', [{ type: 'where', fieldPath: 'name', opStr: '==', value: assignedClassName }]);
      const assignedClass = classQuery[0];
      setTeacherClass(assignedClass);

      const studentQuery = await dbService.getDocs<Student>('students', [
        { type: 'where', fieldPath: 'classLevel', opStr: '==', value: assignedClassName },
        { type: 'where', fieldPath: 'status', opStr: '==', value: 'Active' }
      ]);
      setStudents(studentQuery);

    } catch (error) {
      console.error('Error fetching class data:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load your class data.' });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchClassData();
    }
  }, [user, fetchClassData]);

  // When students are loaded, initialize attendance state
  useEffect(() => {
    const initialAttendance: AttendanceRecord = {};
    students.forEach(student => {
      initialAttendance[student.id] = 'Present'; // Default to 'Present'
    });
    setAttendance(initialAttendance);
  }, [students]);


  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };
  
  const handleMarkAll = (status: AttendanceStatus) => {
    const newAttendance: AttendanceRecord = {};
    students.forEach(student => {
      newAttendance[student.id] = status;
    });
    setAttendance(newAttendance);
  }

  const handleSubmit = async () => {
    if (!teacherClass || students.length === 0) return;
    setIsSubmitting(true);
    
    const records = Object.entries(attendance).map(([studentId, status]) => {
        const student = students.find(s => s.id === studentId);
        return {
            studentId: student?.studentId || '',
            studentName: `${student?.firstName} ${student?.lastName}`,
            status,
        };
    });

    try {
        const result = await saveAttendance({
            date: selectedDate,
            classId: teacherClass.id,
            records,
        });

        if (result.error) throw new Error(result.error);
        
        toast({
            title: 'Attendance Saved!',
            description: `Attendance for ${teacherClass.name} on ${selectedDate.toLocaleDateString()} has been recorded.`,
        });

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to save attendance.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (isLoading || isUserLoading) {
    return <Skeleton className="h-96 w-full" />;
  }
  
  if (!teacherClass) {
    return (
        <Card>
            <CardHeader><CardTitle>Attendance</CardTitle></CardHeader>
            <CardContent>
                <p className="text-muted-foreground">You are not assigned as a class teacher, so you cannot take attendance.</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold">Take Attendance</h1>
        <p className="text-muted-foreground">
          Mark attendance for your assigned class: <span className="font-semibold text-primary">{teacherClass.name}</span>
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Attendance Sheet</CardTitle>
              <CardDescription>Mark each student as Present, Absent, or Late for the selected date.</CardDescription>
            </div>
             <div className="flex items-center gap-2">
                <DatePicker value={selectedDate} onChange={(date) => setSelectedDate(date || new Date())} />
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Attendance
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            <div className="flex justify-end gap-2 mb-4">
                <Button variant="outline" size="sm" onClick={() => handleMarkAll('Present')}>Mark All Present</Button>
                <Button variant="outline" size="sm" onClick={() => handleMarkAll('Absent')}>Mark All Absent</Button>
            </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead className="w-[200px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{`${student.firstName} ${student.lastName}`}</TableCell>
                  <TableCell>
                    <Select
                      value={attendance[student.id] || 'Present'}
                      onValueChange={(value) => handleStatusChange(student.id, value as AttendanceStatus)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Present">Present</SelectItem>
                        <SelectItem value="Absent">Absent</SelectItem>
                        <SelectItem value="Late">Late</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {students.length === 0 && (
                <TableRow>
                    <TableCell colSpan={2} className="text-center h-24">No students found in this class.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
