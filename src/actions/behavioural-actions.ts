'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getBehavioralIncidents(studentId?: string) {
    try {
        const whereClause = studentId ? { studentId } : {};
        const incidents = await prisma.behavioralIncident.findMany({
            where: whereClause,
            include: { student: true, reporter: true }
        });
        return { success: true, data: incidents };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function saveBehavioralIncident(data: any) {
    try {
        const incident = await prisma.behavioralIncident.create({
            data: {
                studentId: data.studentId,
                title: data.title,
                description: data.description,
                severity: data.severity || 'MINOR',
                status: 'ACTIVE',
                reporterId: data.reporterId || 'system',
                date: new Date(data.date || new Date())
            }
        });
        revalidatePath('/dashboard/behavioural');
        return { success: true, data: incident };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// --- Behavioural Traits & Scores (for Report Cards) ---

export async function getBehaviouralTraits() {
  try {
    const traits = await prisma.behaviouralTrait.findMany({
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
    return { success: true, traits };
  } catch (error: any) {
    return { success: false, traits: [], message: error.message };
  }
}

export async function saveBehaviouralScores(
  scores: Array<{
    studentId: string;
    traitId: string;
    termId: string;
    score: number;
  }>
) {
  try {
    for (const entry of scores) {
      await prisma.behaviouralScore.upsert({
        where: {
          studentId_traitId_termId: {
            studentId: entry.studentId,
            traitId: entry.traitId,
            termId: entry.termId,
          },
        },
        update: { score: entry.score },
        create: {
          studentId: entry.studentId,
          traitId: entry.traitId,
          termId: entry.termId,
          score: entry.score,
        },
      });
    }
    revalidatePath('/dashboard/behavioural');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getBehaviouralScores(classId: string, termId: string) {
  try {
    const students = await prisma.student.findMany({
      where: { classId, status: 'Active' },
      select: { id: true, studentId: true, firstName: true, lastName: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    const traits = await prisma.behaviouralTrait.findMany({
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });

    const scores = await prisma.behaviouralScore.findMany({
      where: {
        termId,
        studentId: { in: students.map(s => s.id) },
      },
    });

    return { success: true, students, traits, scores };
  } catch (error: any) {
    return { success: false, students: [], traits: [], scores: [], message: error.message };
  }
}
