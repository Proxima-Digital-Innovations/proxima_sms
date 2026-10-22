'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { AttendanceService } from '@/lib/services/attendance-service';

const attendanceRecordSchema = z.object({
  studentId: z.string(),
  status: z.string(),
  remark: z.string().optional(),
});

const attendanceSheetSchema = z.object({
  date: z.union([z.date(), z.string()]),
  classId: z.string(),
  records: z.array(attendanceRecordSchema),
});

export async function saveAttendance(values: z.infer<typeof attendanceSheetSchema>) {
  try {
    const parsed = attendanceSheetSchema.safeParse(values);
    if (!parsed.success) {
      return { success: false, error: 'Invalid attendance data format.' };
    }

    const { classId, records } = parsed.data;
    const date = new Date(parsed.data.date);

    await AttendanceService.saveAttendance(date, classId, records);

    try {
      revalidatePath('/dashboard/attendance');
      revalidatePath('/dashboard/students');
    } catch {}

    return { success: true };
  } catch (error: any) {
    console.error('Error saving student attendance:', error);
    return { success: false, error: error.message || 'An unexpected error occurred.' };
  }
}

export async function getClassAttendanceRoster(classId: string, dateStr?: string) {
  try {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const [classData, students, existingAttendance] = await Promise.all([
      prisma.class.findUnique({
        where: { id: classId },
        select: { id: true, name: true, code: true },
      }),
      prisma.student.findMany({
        where: { classId, status: { in: ['Active', 'ACTIVE'] } },
        select: {
          id: true,
          studentId: true,
          firstName: true,
          lastName: true,
          gender: true,
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
      prisma.attendance.findMany({
        where: {
          classId,
          date: { gte: startOfDay, lte: endOfDay },
        },
        select: {
          studentId: true,
          status: true,
        },
      }),
    ]);

    const attendanceMap = new Map<string, string>();
    for (const record of existingAttendance) {
      attendanceMap.set(record.studentId, record.status.toUpperCase());
    }

    const roster = students.map((s) => ({
      ...s,
      status: attendanceMap.get(s.id) || 'PRESENT',
      isRecorded: attendanceMap.has(s.id),
    }));

    const presentCount = roster.filter((r) => r.status === 'PRESENT').length;
    const absentCount = roster.filter((r) => r.status === 'ABSENT').length;
    const lateCount = roster.filter((r) => r.status === 'LATE').length;
    const excusedCount = roster.filter((r) => r.status === 'EXCUSED').length;

    return {
      success: true,
      classData,
      date: startOfDay.toISOString(),
      roster,
      stats: {
        total: roster.length,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        excused: excusedCount,
        rate: roster.length > 0 ? Math.round((presentCount / roster.length) * 100) : 100,
        alreadySubmitted: existingAttendance.length > 0,
      },
    };
  } catch (error: any) {
    console.error('Error fetching class roster:', error);
    return { success: false, error: error.message, roster: [], stats: { total: 0, present: 0, absent: 0, late: 0, excused: 0, rate: 100, alreadySubmitted: false } };
  }
}

export async function getAttendanceClasses() {
  try {
    const classes = await prisma.class.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        _count: {
          select: { currentStudents: { where: { status: { in: ['Active', 'ACTIVE'] } } } },
        },
      },
      orderBy: { name: 'asc' },
    });

    return {
      success: true,
      classes: classes.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        studentCount: c._count.currentStudents,
      })),
    };
  } catch (error: any) {
    return { success: false, classes: [], error: error.message };
  }
}
