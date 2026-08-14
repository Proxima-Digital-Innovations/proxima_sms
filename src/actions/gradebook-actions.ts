'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// --- Assignment Categories ---

export async function getAssignmentCategories() {
  try {
    const categories = await prisma.assignmentCategory.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return { success: true, categories };
  } catch (error: any) {
    return { success: false, categories: [], message: error.message };
  }
}

export async function saveAssignmentCategory(data: {
  id?: string;
  name: string;
  weight: number;
  maxScore: number;
  sortOrder?: number;
}) {
  try {
    if (data.id) {
      await prisma.assignmentCategory.update({
        where: { id: data.id },
        data: { name: data.name, weight: data.weight, maxScore: data.maxScore, sortOrder: data.sortOrder ?? 0 },
      });
    } else {
      await prisma.assignmentCategory.create({
        data: { name: data.name, weight: data.weight, maxScore: data.maxScore, sortOrder: data.sortOrder ?? 0 },
      });
    }
    revalidatePath('/dashboard/scores');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// --- Gradebook Assignments ---

export async function createGradebookAssignment(data: {
  title: string;
  categoryId: string;
  subjectId: string;
  classId: string;
  termId: string;
  maxScore: number;
  dueDate?: string;
  createdById: string;
}) {
  try {
    const assignment = await prisma.gradebookAssignment.create({
      data: {
        title: data.title,
        categoryId: data.categoryId,
        subjectId: data.subjectId,
        classId: data.classId,
        termId: data.termId,
        maxScore: data.maxScore,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        createdById: data.createdById,
        isPublished: true,
      },
    });
    revalidatePath('/dashboard/scores');
    return { success: true, assignment };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getGradebookAssignments(classId: string, subjectId: string, termId: string) {
  try {
    const assignments = await prisma.gradebookAssignment.findMany({
      where: { classId, subjectId, termId },
      include: {
        category: true,
        scores: true,
      },
      orderBy: [{ category: { sortOrder: 'asc' } }, { createdAt: 'asc' }],
    });
    return { success: true, assignments };
  } catch (error: any) {
    return { success: false, assignments: [], message: error.message };
  }
}

export async function deleteGradebookAssignment(assignmentId: string) {
  try {
    await prisma.gradebookAssignment.delete({ where: { id: assignmentId } });
    revalidatePath('/dashboard/scores');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// --- Gradebook Scores ---

export async function saveGradebookScores(
  assignmentId: string,
  scores: Array<{
    studentId: string;
    score: number | null;
    isMissing?: boolean;
    isExcused?: boolean;
    isExempt?: boolean;
    comment?: string;
  }>
) {
  try {
    for (const entry of scores) {
      await prisma.gradebookScore.upsert({
        where: {
          assignmentId_studentId: {
            assignmentId,
            studentId: entry.studentId,
          },
        },
        update: {
          score: entry.score,
          isMissing: entry.isMissing ?? false,
          isExcused: entry.isExcused ?? false,
          isExempt: entry.isExempt ?? false,
          comment: entry.comment ?? null,
          gradedAt: new Date(),
        },
        create: {
          assignmentId,
          studentId: entry.studentId,
          score: entry.score,
          isMissing: entry.isMissing ?? false,
          isExcused: entry.isExcused ?? false,
          isExempt: entry.isExempt ?? false,
          comment: entry.comment ?? null,
        },
      });
    }
    revalidatePath('/dashboard/scores');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Returns the full gradebook data for a class/subject/term combo.
 * This is the main data feed for the spreadsheet-style gradebook UI.
 */
export async function getGradebookData(classId: string, subjectId: string, termId: string) {
  try {
    // Get students in this class
    const students = await prisma.student.findMany({
      where: { classId, status: 'Active' },
      select: { id: true, studentId: true, firstName: true, lastName: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    // Get assignments with their scores and categories
    const assignments = await prisma.gradebookAssignment.findMany({
      where: { classId, subjectId, termId },
      include: {
        category: true,
        scores: true,
      },
      orderBy: [{ category: { sortOrder: 'asc' } }, { createdAt: 'asc' }],
    });

    // Get the categories for weight calculation
    const categories = await prisma.assignmentCategory.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return { success: true, students, assignments, categories };
  } catch (error: any) {
    return { success: false, students: [], assignments: [], categories: [], message: error.message };
  }
}

// --- Grading Scale ---

export async function getGradingScale() {
  try {
    const scale = await prisma.gradingScale.findFirst({
      where: { isDefault: true },
      include: {
        entries: { orderBy: { minPercentage: 'desc' } },
      },
    });
    return { success: true, scale };
  } catch (error: any) {
    return { success: false, scale: null, message: error.message };
  }
}

export async function getGradingScales() {
  try {
    const scales = await prisma.gradingScale.findMany({
      include: {
        entries: { orderBy: { minPercentage: 'desc' } },
      },
    });
    return { success: true, scales };
  } catch (error: any) {
    return { success: false, scales: [], message: error.message };
  }
}
