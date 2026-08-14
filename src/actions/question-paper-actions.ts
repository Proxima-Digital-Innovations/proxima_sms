'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createQuestionPaper(data: {
  title: string;
  subjectId: string;
  classId: string;
  teacherId: string;
  termId: string;
  content?: string;
  fileUrl?: string;
  paperType?: string;
}) {
  try {
    const paper = await prisma.lessonNote.create({
      data: {
        title: data.title,
        subjectId: data.subjectId,
        classId: data.classId,
        teacherId: data.teacherId,
        termId: data.termId,
        content: data.content ?? null,
        fileUrl: data.fileUrl ?? null,
        evaluation: `QUESTION_PAPER:${data.paperType || 'CA Test'}`,
        status: 'DRAFT',
      },
    });
    revalidatePath('/dashboard/exam-questions');
    return { success: true, paper };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getQuestionPapers(filters?: {
  teacherId?: string;
  status?: string;
}) {
  try {
    const where: any = {
      evaluation: { startsWith: 'QUESTION_PAPER' },
    };
    if (filters?.teacherId) where.teacherId = filters.teacherId;
    if (filters?.status) where.status = filters.status;

    const papers = await prisma.lessonNote.findMany({
      where,
      include: {
        subject: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        reviewer: { select: { id: true, firstName: true, lastName: true } },
        term: { select: { id: true, name: true } },
      },
      orderBy: { submissionDate: 'desc' },
    });
    return { success: true, papers };
  } catch (error: any) {
    return { success: false, papers: [], message: error.message };
  }
}

export async function reviewQuestionPaper(data: {
  paperId: string;
  reviewerId: string;
  action: 'APPROVED' | 'REJECTED';
  reviewNote?: string;
}) {
  try {
    await prisma.lessonNote.update({
      where: { id: data.paperId },
      data: {
        status: data.action,
        reviewerId: data.reviewerId,
        reviewNote: data.reviewNote ?? null,
        reviewedAt: new Date(),
      },
    });
    revalidatePath('/dashboard/exam-questions');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function deleteQuestionPaper(paperId: string) {
  try {
    await prisma.lessonNote.delete({ where: { id: paperId } });
    revalidatePath('/dashboard/exam-questions');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getQuestionPaperById(id: string) {
  try {
    const paper = await prisma.lessonNote.findUnique({
      where: { id },
      include: {
        subject: true,
        class: true,
        teacher: { select: { id: true, firstName: true, lastName: true } },
        reviewer: { select: { id: true, firstName: true, lastName: true } },
        term: true,
      },
    });
    return { success: true, paper };
  } catch (error: any) {
    return { success: false, paper: null, message: error.message };
  }
}

export async function updateQuestionPaper(id: string, data: { content?: string; fileUrl?: string }) {
  try {
    await prisma.lessonNote.update({
      where: { id },
      data: {
        content: data.content ?? null,
        fileUrl: data.fileUrl ?? null,
      },
    });
    revalidatePath('/dashboard/exam-questions');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function submitQuestionPaper(id: string) {
  try {
    await prisma.lessonNote.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        submissionDate: new Date(),
      },
    });
    revalidatePath('/dashboard/exam-questions');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
