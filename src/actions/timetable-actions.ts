'use server';

import { prisma } from '@/lib/prisma';

export async function getMasterTimetable(classId?: string) {
  try {
    const classes = await prisma.class.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true }
    });

    const activeClassId = classId || classes[0]?.id;

    if (!activeClassId) {
      return { success: true, classes: [], schedule: [] };
    }

    const entries = await prisma.timetable.findMany({
      where: { classId: activeClassId },
      include: {
        subject: true,
        teacher: { select: { firstName: true, lastName: true } },
        room: true,
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    });

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const schedule = [1, 2, 3, 4, 5].map(dayNum => ({
      dayNumber: dayNum,
      dayName: dayNames[dayNum],
      periods: entries.filter(e => e.dayOfWeek === dayNum)
    }));

    return {
      success: true,
      classes,
      selectedClassId: activeClassId,
      schedule
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
