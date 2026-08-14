'use server';

import { dbService } from '@/lib/dbService';
import type { MockLessonNote, MockUser } from '@/lib/schema';
import { requireSchoolId } from '@/lib/server-context';

export async function getHodDashboardData(uid: string) {
  // Ensure tenant context is set or bypass it if this is global, 
  // but dbService already uses prisma so we should be good.
  

  const hodUser = await dbService.getDoc<MockUser>('users', uid);
  if (!hodUser || !hodUser.department) {
    return { error: 'Could not determine your department.' };
  }

  const departmentTeachers = await dbService.getDocs<MockUser>('users', {
      department: hodUser.department,
      role: 'Teacher',
  });
  const teacherIds = departmentTeachers.map(t => t.id);

  if (teacherIds.length === 0) {
    return {
      stats: { pending: 0, approved: 0, rejected: 0, staffCount: 0 },
      notes: [],
      staff: [],
      submissionStatusData: []
    };
  }

  // Simulate IN query for Prisma via dbService.
  // Wait, dbService.getDocs currently takes a basic object for filters,
  // so `{ teacherId: { in: teacherIds } }` works natively for Prisma.
  const notesList = await dbService.getDocs<MockLessonNote>('lessonNotes', {
    teacherId: { in: teacherIds }
  });

  // Sort notes
  notesList.sort((a, b) => {
    // Note: submittedOn in MockLessonNote is a Firestore timestamp object in some mock data?
    // In Prisma it's a DateTime. Let's handle both safely.
    const getSeconds = (date: any) => {
      if (!date) return 0;
      if (date.seconds) return date.seconds;
      if (date instanceof Date) return date.getTime() / 1000;
      return new Date(date).getTime() / 1000;
    };
    return getSeconds(b.submittedOn) - getSeconds(a.submittedOn);
  });

  const recentNotes = notesList.slice(0, 5);

  const approved = notesList.filter(n => n.status === 'Approved').length;
  const pending = notesList.filter(n => n.status.includes('Pending')).length;
  const rejected = notesList.filter(n => n.status.includes('Rejected') || n.status.includes('Revision')).length;
  
  const submissionStatusData = [
    { name: 'Approved', value: approved, fill: 'hsl(var(--chart-2))' },
    { name: 'Pending', value: pending, fill: 'hsl(var(--chart-4))' },
    { name: 'Rejected', value: rejected, fill: 'hsl(var(--destructive))' },
  ];

  return {
    stats: {
      pending,
      approved,
      rejected,
      staffCount: departmentTeachers.length,
    },
    notes: recentNotes,
    staff: departmentTeachers,
    submissionStatusData,
  };
}

export async function getHodAnalyticsData(uid: string) {
  const hodUser = await dbService.getDoc<MockUser>('users', uid);
  if (!hodUser || !hodUser.department) {
    return { success: false, error: 'Could not determine your department.' };
  }

  const departmentTeachers = await dbService.getDocs<MockUser>('users', {
      department: hodUser.department,
      role: 'Teacher',
  });
  const teacherIds = departmentTeachers.map(t => t.id);

  if (teacherIds.length === 0) {
    return { success: true, data: { departmentName: hodUser.department, lessonNotes: [], examQuestions: [], departmentTeachers: [] } };
  }

  const [lessonNotes, examQuestions] = await Promise.all([
    dbService.getDocs<MockLessonNote>('lessonNotes', { teacherId: { in: teacherIds } }),
    dbService.getDocs<any>('examQuestions', { teacherId: { in: teacherIds } })
  ]);

  return { success: true, data: { departmentName: hodUser.department, lessonNotes, examQuestions, departmentTeachers } };
}
