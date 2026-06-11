'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSchoolId } from "@/lib/server-context";

export async function getLeaveRequests() {
  try {
    const schoolId = await requireSchoolId();
    const leaves = await prisma.leaveRequest.findMany({
      where: { schoolId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, leaves };
  } catch (error: any) {
    return { success: false, leaves: [], message: error.message };
  }
}

export async function createLeaveRequest(userId: string, startDate: Date, endDate: Date, reason: string) {
  try {
    const schoolId = await requireSchoolId();
    const leave = await prisma.leaveRequest.create({
      data: { userId, schoolId, startDate, endDate, reason }
    });
    revalidatePath("/admin/hr");
    return { success: true, leave };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function updateLeaveStatus(id: string, status: string) {
  try {
    const leave = await prisma.leaveRequest.update({
      where: { id },
      data: { status }
    });
    revalidatePath("/admin/hr");
    return { success: true, leave };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Finds all Timetable slots for a given date where the assigned teacher is on APPROVED leave
 */
export async function getOrphanedClasses(date: Date) {
  try {
    // 1. Get Day of Week (1-7 mapping. JS getDay() is 0=Sun. We use 1=Mon, 7=Sun)
    let jsDay = date.getDay();
    let dbDay = jsDay === 0 ? 7 : jsDay;

    const schoolId = await requireSchoolId();
    // 2. Find all approved leaves covering this date
    const leaves = await prisma.leaveRequest.findMany({
      where: {
        schoolId,
        status: 'APPROVED',
        startDate: { lte: date },
        endDate: { gte: date }
      }
    });

    const absentTeacherIds = leaves.map(l => l.userId);

    if (absentTeacherIds.length === 0) return { success: true, orphanedClasses: [] };

    // 3. Find all timetable slots on this DayOfWeek for the absent teachers
    const activeTerm = await prisma.term.findFirst({ where: { isActive: true, schoolId } });
    if (!activeTerm) throw new Error("No active term found.");

    const orphanedClasses = await prisma.timetable.findMany({
      where: {
        termId: activeTerm.id,
        dayOfWeek: dbDay,
        teacherId: { in: absentTeacherIds }
      },
      include: {
        class: true,
        subject: true,
        room: true,
        teacher: true,
        substitutes: {
          where: { date } // Only include substitutes assigned for this exact date
        }
      },
      orderBy: { startTime: 'asc' }
    });

    return { success: true, orphanedClasses };
  } catch (error: any) {
    return { success: false, orphanedClasses: [], message: error.message };
  }
}

export async function getAvailableSubstituteTeachers() {
  try {
    // In a real system, you'd filter out teachers who already have classes at specific times.
    // For now, we return all teachers who are NOT currently on leave.
    const schoolId = await requireSchoolId();
    const today = new Date();
    const onLeave = await prisma.leaveRequest.findMany({
      where: { schoolId, status: 'APPROVED', startDate: { lte: today }, endDate: { gte: today } },
      select: { userId: true }
    });
    const onLeaveIds = onLeave.map(l => l.userId);

    const available = await prisma.user.findMany({
      where: { 
        schoolId,
        role: 'TEACHER',
        id: { notIn: onLeaveIds }
      },
      select: { id: true, firstName: true, lastName: true }
    });
    
    return { success: true, teachers: available };
  } catch (error: any) {
    return { success: false, teachers: [], message: error.message };
  }
}

export async function assignSubstitute(timetableId: string, substituteId: string, date: Date) {
  try {
    const schoolId = await requireSchoolId();
    const assignment = await prisma.substituteAssignment.create({
      data: { timetableId, substituteId, date, schoolId }
    });
    revalidatePath("/admin/hr");
    return { success: true, assignment };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getHodDashboardData() {
  return { success: true, data: {} as any };
}
