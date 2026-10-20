'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {}
}

export async function calculateMidtermAchievement(score: number | null | undefined): Promise<string> {
  if (score == null || isNaN(score)) return 'Not Assessed';
  if (score >= 17) return 'Exceeding';
  if (score >= 13) return 'Expected +';
  if (score >= 10) return 'Expected';
  if (score >= 7) return 'Emerging +';
  if (score >= 0) return 'Emerging';
  return 'Not Assessed';
}

export async function getMidtermResults(
  classId: string,
  termId: string,
  arg3?: string,
  arg4?: string
): Promise<any> {
  try {
    let subjectId: string | undefined;
    let session: string | undefined;

    if (arg4) {
      subjectId = arg3;
      session = arg4;
    } else {
      session = arg3;
    }

    let resolvedTermId = termId;
    const termObj = await prisma.term.findFirst({
      where: {
        OR: [{ id: termId }, { name: termId }],
      },
    });
    if (termObj) resolvedTermId = termObj.id;

    let resolvedClassId = classId;
    const classObj = await prisma.class.findFirst({
      where: {
        OR: [{ id: classId }, { name: classId }],
      },
    });
    if (classObj) resolvedClassId = classObj.id;

    const students = await prisma.student.findMany({
      where: {
        OR: [
          { classId: resolvedClassId },
          { class: { name: classId } }
        ],
        status: { in: ['Active', 'ACTIVE'] },
      },
      select: { id: true, studentId: true, firstName: true, lastName: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    const where: any = {
      termId: resolvedTermId,
      studentId: { in: students.map(s => s.id) },
    };
    if (subjectId) where.subjectId = subjectId;
    if (session) where.session = session;

    const results = await prisma.midtermResult.findMany({
      where,
      include: { subject: true },
    });

    if (!arg4) {
      const arr: any = results;
      arr.success = true;
      arr.students = students;
      arr.results = results;
      return arr;
    }

    return { success: true, students, results };
  } catch (error: any) {
    if (!arg4) {
      const arr: any = [];
      arr.success = false;
      arr.students = [];
      arr.results = [];
      arr.message = error.message;
      return arr;
    }
    return { success: false, students: [], results: [], message: error.message };
  }
}

export async function saveMidtermResults(...args: any[]): Promise<{ success: boolean; message?: string }> {
  try {
    let items: Array<{
      studentId: string;
      subjectId: string;
      termId?: string;
      term?: string;
      session: string;
      score: number | null;
      achievement?: string;
    }> = [];

    if (Array.isArray(args[0])) {
      items = args[0].map((item: any) => ({
        studentId: item.studentId,
        subjectId: item.subjectId,
        termId: item.termId || item.term,
        session: item.session,
        score: item.score != null && item.score !== '' && !isNaN(Number(item.score)) ? Number(item.score) : null,
        achievement: item.achievement,
      }));
    } else {
      const [termId, subjectId, session, resultsList] = args;
      items = (resultsList || []).map((item: any) => ({
        studentId: item.studentId,
        subjectId,
        termId,
        session,
        score: item.score != null && item.score !== '' && !isNaN(Number(item.score)) ? Number(item.score) : null,
        achievement: item.achievement,
      }));
    }

    for (const entry of items) {
      const rawTerm = entry.termId || 'First Term';
      const termObj = await prisma.term.findFirst({
        where: {
          OR: [{ id: rawTerm }, { name: rawTerm }],
        },
      });
      const resolvedTermId = termObj ? termObj.id : rawTerm;

      // If score is blank or unassessed, remove any previous record so it doesn't count as 0
      if (entry.score === null || isNaN(entry.score)) {
        await prisma.midtermResult.deleteMany({
          where: {
            studentId: entry.studentId,
            subjectId: entry.subjectId,
            termId: resolvedTermId,
          },
        });
        continue;
      }

      const achievement =
        entry.achievement && entry.achievement !== 'Not Assessed'
          ? entry.achievement
          : await calculateMidtermAchievement(entry.score);

      await prisma.midtermResult.upsert({
        where: {
          studentId_subjectId_termId: {
            studentId: entry.studentId,
            subjectId: entry.subjectId,
            termId: resolvedTermId,
          },
        },
        update: {
          score: entry.score,
          achievement,
          session: entry.session,
        },
        create: {
          studentId: entry.studentId,
          subjectId: entry.subjectId,
          termId: resolvedTermId,
          session: entry.session,
          score: entry.score,
          achievement,
          status: 'PENDING',
        },
      });
    }

    safeRevalidatePath('/dashboard/midterm');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getClassMidtermReports(classId: string, termId: string, session: string) {
  try {
    let resolvedTermId = termId;
    const termObj = await prisma.term.findFirst({
      where: {
        OR: [{ id: termId }, { name: termId }],
      },
    });
    if (termObj) resolvedTermId = termObj.id;

    let resolvedClassId = classId;
    const classObj = await prisma.class.findFirst({
      where: {
        OR: [{ id: classId }, { name: classId }],
      },
    });
    if (classObj) resolvedClassId = classObj.id;

    const [students, systemProfile] = await Promise.all([
      prisma.student.findMany({
        where: {
          OR: [
            { classId: resolvedClassId },
            { class: { name: classId } }
          ],
          status: { in: ['Active', 'ACTIVE'] },
        },
        include: { class: true },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
      prisma.systemProfile.findFirst(),
    ]);

    const results = await prisma.midtermResult.findMany({
      where: {
        termId: resolvedTermId,
        session,
        studentId: { in: students.map(s => s.id) },
      },
      include: {
        subject: true,
      },
    });

    const schoolInfo = {
      name: systemProfile?.name || 'Proxima SMS',
      address: systemProfile?.address || 'Knowledge City, Nigeria',
      phone: systemProfile?.phone || '+234 800 000 0000',
      email: systemProfile?.email || 'admin@proximasms.com',
      logoUrl: systemProfile?.logoUrl || null,
    };

    return students.map(student => {
      const studentResults = results.filter(r => r.studentId === student.id);
      const validResults = studentResults.filter(r => r.score != null && !isNaN(r.score));
      const avg = validResults.length > 0
        ? Math.round((validResults.reduce((sum, r) => sum + r.score, 0) / validResults.length) * 10) / 10
        : 0;

      return {
        student,
        school: schoolInfo,
        results: studentResults.map(r => ({
          ...r,
          subjectName: r.subject?.name || 'Subject',
        })),
        averageScore: avg,
      };
    });
  } catch (error) {
    console.error('Error fetching class midterm reports:', error);
    return [];
  }
}
