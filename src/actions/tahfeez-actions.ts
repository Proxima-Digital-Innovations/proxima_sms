'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export type TahfeezScoreInput = {
  id?: string;
  studentId: string;
  termId: string;
  session: string;
  surah?: string;
  juz?: number;
  page?: number;
  startAyah?: number;
  endAyah?: number;
  tajweedScore?: number;
  fluencyScore?: number;
  memorizationScore?: number;
  marks: number;
  teacherNote?: string;
};

export async function getTahfeezScoresByClass(
  classId: string,
  termId: string,
  sessionName: string
) {
  try {
    const students = await prisma.student.findMany({
      where: { classId, status: 'Active' },
      select: {
        id: true,
        studentId: true,
        firstName: true,
        lastName: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    const studentIds = students.map(s => s.id);

    const scores = await prisma.tahfeezScore.findMany({
      where: {
        termId,
        session: sessionName,
        studentId: { in: studentIds },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return { success: true, students, scores };
  } catch (error: any) {
    console.error('Error fetching Tahfeez scores:', error);
    return { success: false, students: [], scores: [], error: error.message };
  }
}

export async function saveTahfeezScores(scores: TahfeezScoreInput[]) {
  try {
    for (const entry of scores) {
      // Find existing score for this student + term + session
      const existing = await prisma.tahfeezScore.findFirst({
        where: {
          studentId: entry.studentId,
          termId: entry.termId,
          session: entry.session,
        },
      });

      const totalMarks = entry.marks != null
        ? entry.marks
        : ((entry.tajweedScore || 0) + (entry.fluencyScore || 0) + (entry.memorizationScore || 0));

      if (existing) {
        await prisma.tahfeezScore.update({
          where: { id: existing.id },
          data: {
            surah: entry.surah ?? null,
            juz: entry.juz ?? null,
            page: entry.page ?? null,
            startAyah: entry.startAyah ?? null,
            endAyah: entry.endAyah ?? null,
            tajweedScore: entry.tajweedScore ?? null,
            fluencyScore: entry.fluencyScore ?? null,
            memorizationScore: entry.memorizationScore ?? null,
            marks: totalMarks,
            teacherNote: entry.teacherNote ?? null,
          },
        });
      } else {
        await prisma.tahfeezScore.create({
          data: {
            studentId: entry.studentId,
            termId: entry.termId,
            session: entry.session,
            surah: entry.surah ?? null,
            juz: entry.juz ?? null,
            page: entry.page ?? null,
            startAyah: entry.startAyah ?? null,
            endAyah: entry.endAyah ?? null,
            tajweedScore: entry.tajweedScore ?? null,
            fluencyScore: entry.fluencyScore ?? null,
            memorizationScore: entry.memorizationScore ?? null,
            marks: totalMarks,
            teacherNote: entry.teacherNote ?? null,
          },
        });
      }
    }

    revalidatePath('/dashboard/tahfeez');
    return { success: true };
  } catch (error: any) {
    console.error('Error saving Tahfeez scores:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteTahfeezScore(scoreId: string) {
  try {
    await prisma.tahfeezScore.delete({
      where: { id: scoreId },
    });
    revalidatePath('/dashboard/tahfeez');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting Tahfeez score:', error);
    return { success: false, error: error.message };
  }
}
