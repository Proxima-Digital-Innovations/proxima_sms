'use server';

import { CommEngine } from '@/lib/services/comm-engine';

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
  date: z.string().or(z.date()),
  classId: z.string(),
  records: z.array(attendanceRecordSchema),
});

export async function saveAttendance(values: {
  date: string | Date;
  classId: string;
  records: Array<{ studentId: string; status: string; remark?: string }>;
}) {
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
      revalidatePath('/dashboard/teacher/attendance');
    } catch {}

    return { success: true };
  } catch (error: any) {
    console.error('Error saving student attendance:', error);
    return { success: false, error: error.message || 'An unexpected error occurred.' };
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
          firstName: true,
          lastName: true,
          middleName: true,
          admissionNumber: true,
          gender: true,
          passportUrl: true,
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

    if (!classData) {
      return { success: false, error: 'Class not found', roster: [], stats: { total: 0, present: 0, absent: 0, late: 0, excused: 0, rate: 0, alreadySubmitted: false } };
    }

    const attendanceMap = new Map<string, string>();
    for (const record of existingAttendance) {
      attendanceMap.set(record.studentId, record.status.toUpperCase());
    }

    const roster = students.map((s) => {
      const existingStatus = attendanceMap.get(s.id);
      return {
        id: s.id,
        name: `${s.lastName.toUpperCase()} ${s.firstName} ${s.middleName || ''}`.trim(),
        admissionNumber: s.admissionNumber || 'N/A',
        gender: s.gender || 'Unknown',
        passportUrl: s.passportUrl,
        status: existingStatus || 'PRESENT',
      };
    });

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

export async function getTertiaryAttendanceRoster(courseOfferingId: string, dateStr?: string) {
  try {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
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
            registration: {
              include: {
                student: {
                  include: {
                    user: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!offering) throw new Error('Course offering not found');

    const registeredStudents = offering.registeredCourses.map(rc => ({
      studentId: rc.registration.studentId,
      name: `${rc.registration.student.user.firstName} ${rc.registration.student.user.lastName}`,
      matricNumber: rc.registration.student.matricNumber
    }));

    const existingAttendance = await prisma.attendance.findMany({
      where: {
        subjectId: offering.courseId,
        date: { gte: startOfDay, lte: endOfDay }
      }
    });

    const statusMap = new Map(existingAttendance.map(a => [a.studentId, a.status]));

    const roster = registeredStudents.map(s => ({
      ...s,
      status: (statusMap.get(s.studentId) || 'Present') as 'Present' | 'Absent' | 'Late' | 'Excused'
    }));

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

    // Asynchronously dispatch automated SMS / WhatsApp / Email alerts for absent students
    const absentStudentIds = data.records.filter(r => r.status === 'Absent').map(r => r.studentId);
    if (absentStudentIds.length > 0) {
      prisma.student.findMany({
        where: { id: { in: absentStudentIds } },
        include: { guardians: true, class: true },
      }).then(students => {
        for (const st of students) {
          const guardian = st.guardians[0];
          if (guardian) {
            CommEngine.sendAttendanceAbsenceAlert({
              guardianName: guardian.fullName || 'Parent / Guardian',
              guardianEmail: guardian.email,
              guardianPhone: guardian.phone,
              studentName: `${st.firstName} ${st.lastName}`,
              className: st.class?.name || 'Class',
              date: targetDate,
            }).catch(e => console.error('Automated absence alert error:', e));
          }
        }
      }).catch(err => console.error('Error querying absent students for notification:', err));
    }

    revalidatePath('/dashboard/teacher/attendance');
    revalidatePath('/dashboard/attendance');
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
      await tx.attendance.deleteMany({
        where: {
          subjectId: offering.courseId,
          date: { gte: startOfDay, lte: endOfDay }
        }
      });

      if (data.records.length > 0) {
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
