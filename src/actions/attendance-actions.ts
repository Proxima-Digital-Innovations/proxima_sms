'use server';

import { z } from 'zod';
import { requireSchoolId } from '@/lib/server-context';
import { revalidatePath } from 'next/cache';
import { AttendanceService } from '@/lib/services/attendance-service';

const attendanceRecordSchema = z.object({
  studentId: z.string(),
  status: z.enum(['Present', 'Absent', 'Late']),
});

const attendanceSheetSchema = z.object({
  date: z.date(),
  classId: z.string(),
  records: z.array(attendanceRecordSchema),
});

export async function saveAttendance(values: z.infer<typeof attendanceSheetSchema>) {
  try {
    
    const parsed = attendanceSheetSchema.safeParse(values);
    if (!parsed.success) {
      return { error: 'Invalid data provided.' };
    }

    const { date, classId, records } = parsed.data;
    
    await AttendanceService.saveAttendance(date, classId, records);

    revalidatePath('/admin/attendance');
    return { success: true };

  } catch (error: any) {
    console.error('Error saving attendance:', error);
    return { error: error.message || 'An unexpected error occurred.' };
  }
}

export async function getTeacherClassData(teacherId: string) {
    try {
        const { dbService } = await import('@/lib/dbService');
        const teacherDoc = await dbService.getDoc('users', teacherId);
        const assignedClassName = (teacherDoc as any)?.className;

        if (!assignedClassName) {
            return { success: false, error: 'Not a Class Teacher' };
        }

        const classQuery = await dbService.getDocs('classes', { name: assignedClassName });
        const assignedClass = classQuery[0];

        const students = await dbService.getDocs('students', {
            classLevel: assignedClassName,
            status: 'Active'
        });

        return { success: true, data: { assignedClass, students } };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

