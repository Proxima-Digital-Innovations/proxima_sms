'use server';

import { prisma } from '@/lib/prisma';

export async function getHodDashboardData(uid?: string) {
  try {
    const user = uid ? await prisma.user.findUnique({
      where: { id: uid },
      include: { department: true },
    }) : null;

    const departmentId = user?.departmentId;
    const teacherWhere: any = { role: { in: ['TEACHER', 'HOD'] } };
    if (departmentId) {
      teacherWhere.departmentId = departmentId;
    }

    const departmentTeachers = await prisma.user.findMany({
      where: teacherWhere,
      select: { id: true, firstName: true, lastName: true, role: true },
    });

    const teacherIds = departmentTeachers.map(t => t.id);

    const notesList = await prisma.lessonNote.findMany({
      where: teacherIds.length > 0 ? { teacherId: { in: teacherIds } } : {},
      orderBy: { submissionDate: 'desc' },
      take: 20,
      include: {
        subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const approved = notesList.filter(n => n.status.toUpperCase() === 'APPROVED').length;
    const pending = notesList.filter(n => n.status.toUpperCase().includes('PENDING') || n.status.toUpperCase() === 'SUBMITTED').length;
    const rejected = notesList.filter(n => n.status.toUpperCase().includes('REJECT') || n.status.toUpperCase().includes('REVIS')).length;

    const recentNotes = notesList.slice(0, 5).map(n => ({
      id: n.id,
      title: n.title,
      subject: n.subject?.name || 'General',
      teacherName: `${n.teacher?.firstName || ''} ${n.teacher?.lastName || ''}`.trim(),
      status: n.status,
      submittedOn: n.submissionDate,
    }));

    return {
      stats: {
        pending,
        approved,
        rejected,
        staffCount: departmentTeachers.length || 1,
      },
      notes: recentNotes,
      staff: departmentTeachers,
      submissionStatusData: [
        { name: 'Approved', value: approved, fill: 'hsl(var(--chart-2))' },
        { name: 'Pending', value: pending, fill: 'hsl(var(--chart-4))' },
        { name: 'Rejected', value: rejected, fill: 'hsl(var(--destructive))' },
      ],
    };
  } catch (error: any) {
    return {
      stats: { pending: 0, approved: 0, rejected: 0, staffCount: 0 },
      notes: [],
      staff: [],
      submissionStatusData: [],
      error: error.message,
    };
  }
}

export async function getHodAnalyticsData(uid?: string) {
  try {
    const user = uid ? await prisma.user.findUnique({
      where: { id: uid },
      include: { department: true },
    }) : null;

    const departmentName = user?.department?.name || 'Science & Humanities';
    const departmentId = user?.departmentId;

    const teacherWhere: any = { role: { in: ['TEACHER', 'HOD'] } };
    if (departmentId) {
      teacherWhere.departmentId = departmentId;
    }

    const departmentTeachers = await prisma.user.findMany({
      where: teacherWhere,
      select: { id: true, firstName: true, lastName: true, role: true },
    });

    const teacherIds = departmentTeachers.map(t => t.id);

    const allNotes = await prisma.lessonNote.findMany({
      where: teacherIds.length > 0 ? { teacherId: { in: teacherIds } } : {},
      orderBy: { submissionDate: 'desc' },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const examQuestions = allNotes.filter(n => n.evaluation?.startsWith('QUESTION_PAPER'));
    const lessonNotes = allNotes.filter(n => !n.evaluation?.startsWith('QUESTION_PAPER'));

    return {
      success: true,
      data: {
        departmentName,
        departmentTeachers: departmentTeachers.map(t => ({
          id: t.id,
          name: `${t.firstName} ${t.lastName}`,
          role: t.role,
        })),
        lessonNotes,
        examQuestions,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      data: {
        departmentName: 'General',
        departmentTeachers: [],
        lessonNotes: [],
        examQuestions: [],
      },
    };
  }
}
