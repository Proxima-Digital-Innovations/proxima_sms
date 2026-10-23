'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export interface TimetableClash {
  courseA: { code: string; title: string; offeringId: string };
  courseB: { code: string; title: string; offeringId: string };
  dayOfWeek: string;
  timeA: string;
  timeB: string;
  venue?: string | null;
}

function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export async function checkTimetableClashesAction(offeringIds: string[]): Promise<{
  success: boolean;
  hasClashes: boolean;
  clashes: TimetableClash[];
  error?: string;
}> {
  try {
    if (!offeringIds || offeringIds.length < 2) {
      return { success: true, hasClashes: false, clashes: [] };
    }

    const schedules = await prisma.courseSchedule.findMany({
      where: { courseOfferingId: { in: offeringIds } },
      include: {
        courseOffering: { include: { course: true } },
        venue: true,
      },
    });

    const clashes: TimetableClash[] = [];

    // Compare each schedule pair
    for (let i = 0; i < schedules.length; i++) {
      for (let j = i + 1; j < schedules.length; j++) {
        const s1 = schedules[i];
        const s2 = schedules[j];

        // Only compare different course offerings
        if (s1.courseOfferingId === s2.courseOfferingId) continue;

        // Check if on the same day
        if (s1.dayOfWeek.toUpperCase() === s2.dayOfWeek.toUpperCase()) {
          const start1 = timeToMinutes(s1.startTime);
          const end1 = timeToMinutes(s1.endTime);
          const start2 = timeToMinutes(s2.startTime);
          const end2 = timeToMinutes(s2.endTime);

          // Overlap check
          if (Math.max(start1, start2) < Math.min(end1, end2)) {
            clashes.push({
              courseA: {
                code: s1.courseOffering.course.code,
                title: s1.courseOffering.course.title,
                offeringId: s1.courseOfferingId,
              },
              courseB: {
                code: s2.courseOffering.course.code,
                title: s2.courseOffering.course.title,
                offeringId: s2.courseOfferingId,
              },
              dayOfWeek: s1.dayOfWeek,
              timeA: `${s1.startTime} - ${s1.endTime}`,
              timeB: `${s2.startTime} - ${s2.endTime}`,
              venue: s1.venue?.name || s2.venue?.name,
            });
          }
        }
      }
    }

    return {
      success: true,
      hasClashes: clashes.length > 0,
      clashes,
    };
  } catch (error: any) {
    return { success: false, hasClashes: false, clashes: [], error: error.message };
  }
}

export async function getStudentWeeklyTimetable(studentProfileId: string, session: string, semester: number) {
  try {
    const reg = await prisma.semesterRegistration.findUnique({
      where: {
        studentId_academicSession_semester: {
          studentId: studentProfileId,
          academicSession: session,
          semester,
        },
      },
      include: {
        courses: {
          include: {
            offering: {
              include: {
                course: true,
                schedules: {
                  include: { venue: true },
                },
              },
            },
          },
        },
      },
    });

    if (!reg) return { success: true, data: [] };

    const schedulesList = reg.courses.flatMap((c) =>
      c.offering.schedules.map((s) => ({
        id: s.id,
        courseCode: c.offering.course.code,
        courseTitle: c.offering.course.title,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        scheduleType: s.scheduleType,
        venueName: s.venue?.name || 'TBA',
        venueCapacity: s.venue?.capacity,
      }))
    );

    return { success: true, data: schedulesList };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createCourseScheduleAction(data: {
  courseOfferingId: string;
  venueId?: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  scheduleType?: string;
}) {
  try {
    const schedule = await prisma.courseSchedule.create({
      data: {
        courseOfferingId: data.courseOfferingId,
        venueId: data.venueId || null,
        dayOfWeek: data.dayOfWeek.toUpperCase(),
        startTime: data.startTime,
        endTime: data.endTime,
        scheduleType: data.scheduleType || 'LECTURE',
      },
    });

    revalidatePath('/dashboard/tertiary/timetable');
    return { success: true, data: schedule };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
