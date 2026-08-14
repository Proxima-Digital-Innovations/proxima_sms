'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createLessonNote(data: {
  title: string;
  subjectId: string;
  classId: string;
  teacherId: string;
  termId: string;
  weekNumber?: number;
  content?: string;
  objectives?: string;
  activities?: string;
  resources?: string;
  evaluation?: string;
  fileUrl?: string;
}) {
  try {
    const note = await prisma.lessonNote.create({
      data: {
        title: data.title,
        subjectId: data.subjectId,
        classId: data.classId,
        teacherId: data.teacherId,
        termId: data.termId,
        weekNumber: data.weekNumber ?? null,
        content: data.content ?? null,
        objectives: data.objectives ?? null,
        activities: data.activities ?? null,
        resources: data.resources ?? null,
        evaluation: data.evaluation ?? null,
        fileUrl: data.fileUrl ?? null,
        status: 'DRAFT',
      },
    });
    revalidatePath('/dashboard/lesson-notes');
    return { success: true, note };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function updateLessonNote(
  noteId: string,
  data: {
    title?: string;
    content?: string;
    objectives?: string;
    activities?: string;
    resources?: string;
    evaluation?: string;
    fileUrl?: string;
    weekNumber?: number;
  }
) {
  try {
    await prisma.lessonNote.update({
      where: { id: noteId },
      data,
    });
    revalidatePath('/dashboard/lesson-notes');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function submitLessonNote(noteId: string) {
  try {
    await prisma.lessonNote.update({
      where: { id: noteId },
      data: { status: 'SUBMITTED', submissionDate: new Date() },
    });
    revalidatePath('/dashboard/lesson-notes');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function reviewLessonNote(data: {
  noteId: string;
  reviewerId: string;
  action: 'APPROVED' | 'REJECTED';
  reviewNote?: string;
}) {
  try {
    await prisma.lessonNote.update({
      where: { id: data.noteId },
      data: {
        status: data.action,
        reviewerId: data.reviewerId,
        reviewNote: data.reviewNote ?? null,
        reviewedAt: new Date(),
      },
    });
    revalidatePath('/dashboard/lesson-notes');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getLessonNotes(filters?: {
  teacherId?: string;
  classId?: string;
  subjectId?: string;
  termId?: string;
  status?: string;
}) {
  try {
    const where: any = {};
    if (filters?.teacherId) where.teacherId = filters.teacherId;
    if (filters?.classId) where.classId = filters.classId;
    if (filters?.subjectId) where.subjectId = filters.subjectId;
    if (filters?.termId) where.termId = filters.termId;
    if (filters?.status) where.status = filters.status;

    const notes = await prisma.lessonNote.findMany({
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
    return { success: true, notes };
  } catch (error: any) {
    return { success: false, notes: [], message: error.message };
  }
}

export async function getLessonNoteById(noteId: string) {
  try {
    const note = await prisma.lessonNote.findUnique({
      where: { id: noteId },
      include: {
        subject: true,
        class: true,
        teacher: { select: { id: true, firstName: true, lastName: true } },
        reviewer: { select: { id: true, firstName: true, lastName: true } },
        term: true,
      },
    });
    return { success: true, note };
  } catch (error: any) {
    return { success: false, note: null, message: error.message };
  }
}

export async function deleteLessonNote(noteId: string) {
  try {
    await prisma.lessonNote.delete({ where: { id: noteId } });
    revalidatePath('/dashboard/lesson-notes');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
