'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireSchoolId } from '@/lib/server-context';
import { revalidatePath } from 'next/cache';

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
    const schoolId = await requireSchoolId();
    const parsed = attendanceSheetSchema.safeParse(values);
    if (!parsed.success) {
      return { error: 'Invalid data provided.' };
    }

    const { date, classId, records } = parsed.data;
    
    // Get active term
    const activeTerm = await prisma.term.findFirst({ where: { isActive: true, schoolId } });
    if (!activeTerm) throw new Error("No active academic term found.");

    // Define the date bounds for the day to delete any pre-existing records for updates
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Delete existing records to support simple sheet re-submission/updating
    await prisma.attendance.deleteMany({
      where: {
        schoolId,
        classId,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    // Bulk insert the new attendance sheet records
    await prisma.attendance.createMany({
      data: records.map(record => ({
        studentId: record.studentId,
        classId,
        termId: activeTerm.id,
        schoolId,
        date,
        status: record.status
      }))
    });

    revalidatePath('/admin/attendance');
    return { success: true };

  } catch (error: any) {
    console.error('Error saving attendance:', error);
    return { error: error.message || 'An unexpected error occurred.' };
  }
}
