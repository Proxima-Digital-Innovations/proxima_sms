'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { AttendanceService } from '@/lib/services/attendance-service';

const attendanceRecordSchema = z.object({
  studentId: z.string(),
  status: z.enum(['Present', 'Absent', 'Late', 'Excused']),
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

    revalidatePath('/dashboard/teacher/attendance');
    return { success: true };
  } catch (error: any) {
    console.error('Error saving attendance:', error);
    return { error: error.message || 'An unexpected error occurred.' };
  }
}

export async function getAttendanceContext(userId?: string) {
  try {
    const [classes, activeTerm, activeSession, staffProfile] = await Promise.all([
      prisma.class.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          teacherId: true,
          _count: { select: { students: true } }
        }
      }),
      prisma.term.findFirst({ where: { isActive: true } }),
      prisma.academicSession.findFirst({ where: { isActive: true } }),
      userId ? prisma.staffProfile.findFirst({
        where: { userId },
        include: {
          offerings: {
            include: {
              offering: {
                include: {
                  course: true,
                  _count: { select: { registeredCourses: true } }
                }
              }
            }
          }
        }
      }) : null
    ]);

    const tertiaryOfferings = staffProfile?.offerings?.map(o => ({
      id: o.offering.id,
      courseCode: o.offering.course.code,
      courseTitle: o.offering.course.title,
      session: o.offering.academicSession,
      semester: o.offering.semester,
      studentCount: o.offering._count.registeredCourses
    })) || [];

    // Fallback: If no staff offerings linked directly to lecturer, fetch recent course offerings
    let fallbackOfferings = tertiaryOfferings;
    if (fallbackOfferings.length === 0) {
      const allOfferings = await prisma.courseOffering.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          course: true,
          _count: { select: { registeredCourses: true } }
        }
      });
      fallbackOfferings = allOfferings.map(o => ({
        id: o.id,
        courseCode: o.course.code,
        courseTitle: o.course.title,
        session: o.academicSession,
        semester: o.semester,
        studentCount: o._count.registeredCourses
      }));
    }

    return {
      success: true,
      classes: classes.map(c => ({
        id: c.id,
        name: c.name,
        teacherId: c.teacherId,
        studentCount: c._count.students
      })),
      tertiaryOfferings: fallbackOfferings,
      activeTerm: activeTerm?.name || 'Current Term',
      activeSession: activeSession?.name || '2025/2026',
      isTertiaryFaculty: Boolean(staffProfile || fallbackOfferings.length > 0)
    };
  } catch (error: any) {
    console.error('Error getting attendance context:', error);
    return {
      success: false,
      error: error.message || 'Failed to load attendance context',
      classes: [],
      tertiaryOfferings: [],
      activeTerm: '',
      activeSession: '',
      isTertiaryFaculty: false
    };
  }
}

export async function getClassAttendanceRoster(classId: string, dateStr: string) {
  try {
    const targetDate = new Date(dateStr);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const [students, existingAttendance] = await Promise.all([
      prisma.student.findMany({
        where: {
          classId,
          status: 'Active'
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        select: {
          id: true,
          studentId: true,
          firstName: true,
          lastName: true,
          gender: true,
        }
      }),
      prisma.attendance.findMany({
        where: {
          classId,
          date: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      })
    ]);

    const attendanceMap = new Map<string, string>();
    existingAttendance.forEach(att => {
      attendanceMap.set(att.studentId, att.status);
    });

    const roster = students.map(st => ({
      id: st.id,
      regNumber: st.studentId,
      name: `${st.lastName} ${st.firstName}`,
      gender: st.gender,
      status: attendanceMap.get(st.id) || 'Unmarked'
    }));

    return {
      success: true,
      roster,
      isRecorded: existingAttendance.length > 0
    };
  } catch (error: any) {
    console.error('Error fetching class roster:', error);
    return {
      success: false,
      error: error.message || 'Failed to load student roster',
      roster: [],
      isRecorded: false
    };
  }
}

export async function getTertiaryAttendanceRoster(courseOfferingId: string, dateStr: string) {
  try {
    const targetDate = new Date(dateStr);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const offering = await prisma.courseOffering.findUnique({
      where: { id: courseOfferingId },
      include: {
        course: true,
        registeredCourses: {
          include: {
            student: {
              include: {
                user: true
              }
            }
          }
        }
      }
    });

    if (!offering) {
      return { success: false, error: 'Course offering not found', roster: [], isRecorded: false };
    }

    // Tertiary attendance records can be mapped from existing Attendance records or course attendance
    const existingAttendance = await prisma.attendance.findMany({
      where: {
        subjectId: offering.courseId,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    const attendanceMap = new Map<string, string>();
    existingAttendance.forEach(att => {
      attendanceMap.set(att.studentId, att.status);
    });

    const roster = offering.registeredCourses.map(rc => {
      const u = rc.student.user;
      const matric = rc.student.matricNumber;
      return {
        id: rc.student.id,
        regNumber: matric,
        name: `${u.lastName} ${u.firstName}`,
        gender: u.gender || 'N/A',
        status: attendanceMap.get(rc.student.id) || 'Unmarked'
      };
    });

    return {
      success: true,
      roster,
      courseName: `${offering.course.code} - ${offering.course.title}`,
      isRecorded: existingAttendance.length > 0
    };
  } catch (error: any) {
    console.error('Error fetching tertiary roster:', error);
    return {
      success: false,
      error: error.message || 'Failed to load course roster',
      roster: [],
      isRecorded: false
    };
  }
}

export async function submitClassAttendance(data: {
  classId: string;
  date: string;
  records: { studentId: string; status: 'Present' | 'Absent' | 'Late' | 'Excused' }[];
}) {
  try {
    const targetDate = new Date(data.date);
    await AttendanceService.saveAttendance(targetDate, data.classId, data.records);
    revalidatePath('/dashboard/teacher/attendance');
    return { success: true, count: data.records.length };
  } catch (error: any) {
    console.error('Submit class attendance error:', error);
    return { success: false, error: error.message || 'Failed to submit attendance' };
  }
}

export async function submitTertiaryAttendance(data: {
  courseOfferingId: string;
  date: string;
  records: { studentId: string; status: 'Present' | 'Absent' | 'Late' | 'Excused' }[];
}) {
  try {
    const targetDate = new Date(data.date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const offering = await prisma.courseOffering.findUnique({
      where: { id: data.courseOfferingId }
    });

    if (!offering) throw new Error('Course offering not found');

    const activeTerm = await prisma.term.findFirst({ where: { isActive: true } });

    await prisma.$transaction(async (tx) => {
      // Remove any for this offering course today
      await tx.attendance.deleteMany({
        where: {
          subjectId: offering.courseId,
          date: { gte: startOfDay, lte: endOfDay }
        }
      });

      if (data.records.length > 0) {
        // Need a classId reference for Attendance FK: fetch any default class or first class
        const defaultClass = await tx.class.findFirst();
        if (defaultClass) {
          await tx.attendance.createMany({
            data: data.records.map(r => ({
              studentId: r.studentId,
              classId: defaultClass.id,
              subjectId: offering.courseId,
              termId: activeTerm?.id || null,
              date: targetDate,
              status: r.status,
              method: 'TERTIARY_LECTURE'
            }))
          });
        }
      }
    });

    revalidatePath('/dashboard/teacher/attendance');
    return { success: true, count: data.records.length };
  } catch (error: any) {
    console.error('Submit tertiary attendance error:', error);
    return { success: false, error: error.message || 'Failed to submit course attendance' };
  }
}

export async function getTeacherClassData(teacherId: string) {
  try {
    const assignedClass = await prisma.class.findFirst({
      where: { teacherId },
      include: {
        students: {
          where: { status: 'Active' },
          orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
        }
      }
    });

    if (!assignedClass) {
      return { success: false, error: 'No class currently assigned to this teacher' };
    }

    return {
      success: true,
      data: {
        assignedClass: { id: assignedClass.id, name: assignedClass.name },
        students: assignedClass.students
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
