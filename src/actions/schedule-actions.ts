'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSchoolId } from "@/lib/server-context";

/**
 * Fetches the complete master schedule for a specific term
 */
export async function getMasterSchedule(termId: string) {
  try {
    
    const timetable = await prisma.timetable.findMany({
      where: { termId, },
      include: {
        class: true,
        subject: true,
        room: true,
        teacher: { select: { id: true, firstName: true, lastName: true } }
      }
    });
    return { success: true, timetable };
  } catch (error: any) {
    return { success: false, timetable: [], message: error.message };
  }
}

/**
 * Utility to fetch available entities for the scheduler UI
 */
export async function getScheduleResources() {
  try {
    
    const [classes, subjects, rooms, teachers, terms] = await Promise.all([
      prisma.class.findMany({ orderBy: { name: 'asc' } }),
      prisma.subject.findMany({ orderBy: { name: 'asc' } }),
      prisma.room.findMany({ orderBy: { name: 'asc' } }),
      prisma.user.findMany({ where: { role: 'TEACHER', }, orderBy: { lastName: 'asc' } }),
      prisma.term.findMany({ where: { isActive: true, }, include: { session: true } })
    ]);
    
    return { success: true, resources: { classes, subjects, rooms, teachers, activeTerms: terms } };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Assigns a specific time block. Includes strict Clash Detection.
 */
export async function assignClassBlock(data: {
  termId: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  roomId?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}) {
  try {
    
    // CLASH DETECTION 1: Is the teacher already booked at this exact time?
    const teacherClash = await prisma.timetable.findFirst({
      where: {
        termId: data.termId,
        teacherId: data.teacherId,
        dayOfWeek: data.dayOfWeek,
        OR: [
          { startTime: { lte: data.startTime }, endTime: { gt: data.startTime } },
          { startTime: { lt: data.endTime }, endTime: { gte: data.endTime } }
        ]
      },
      include: { class: true }
    });

    if (teacherClash) {
      return { success: false, message: `Clash Detected: This teacher is already teaching ${teacherClash.class.name} at this time.` };
    }

    // CLASH DETECTION 2: Is the room already booked at this exact time?
    if (data.roomId) {
      const roomClash = await prisma.timetable.findFirst({
        where: {
          termId: data.termId,
          roomId: data.roomId,
          dayOfWeek: data.dayOfWeek,
          OR: [
            { startTime: { lte: data.startTime }, endTime: { gt: data.startTime } },
            { startTime: { lt: data.endTime }, endTime: { gte: data.endTime } }
          ]
        },
        include: { class: true }
      });

      if (roomClash) {
        return { success: false, message: `Clash Detected: This room is already booked by ${roomClash.class.name} at this time.` };
      }
    }

    // CLASH DETECTION 3: Is the class already taking another subject at this time?
    const classClash = await prisma.timetable.findFirst({
      where: {
        termId: data.termId,
        classId: data.classId,
        dayOfWeek: data.dayOfWeek,
        OR: [
          { startTime: { lte: data.startTime }, endTime: { gt: data.startTime } },
          { startTime: { lt: data.endTime }, endTime: { gte: data.endTime } }
        ]
      },
      include: { subject: true }
    });

    if (classClash) {
      return { success: false, message: `Clash Detected: This class is already scheduled for ${classClash.subject.name} at this time.` };
    }

    // No clashes. Create the block.
    const block = await prisma.timetable.create({
      data: {
        ...data,
        }
    });

    revalidatePath("/admin/schedule");
    return { success: true, block };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Removes an existing class block
 */
export async function deleteClassBlock(id: string) {
  try {
    await prisma.timetable.delete({ where: { id } });
    revalidatePath("/admin/schedule");
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
