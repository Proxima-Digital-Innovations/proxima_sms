'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {}
}

import { auth } from '@/auth';

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
        let reporterId = data.reporterId;
        if (!reporterId || reporterId === 'system') {
            try {
                const session = await auth();
                reporterId = (session?.user as any)?.id;
            } catch {
                reporterId = undefined;
            }
        }
        if (reporterId) {
            const exists = await prisma.user.findUnique({ where: { id: reporterId }, select: { id: true } });
            if (!exists) reporterId = undefined;
        }
        if (!reporterId) {
            const fallback = await prisma.user.findFirst({
                where: { role: { in: ['TEACHER', 'ADMIN', 'SLT', 'HOD'] } },
                select: { id: true }
            }) || await prisma.user.findFirst({ select: { id: true } });
            reporterId = fallback?.id;
        }
        if (!reporterId) {
            return { success: false, error: "A valid staff user is required to record behavioral incidents." };
        }

        const incident = await prisma.behavioralIncident.create({
            data: {
                studentId: data.studentId,
                title: data.title,
                description: data.description,
                severity: data.severity || 'MINOR',
                status: 'ACTIVE',
                reporterId: reporterId,
                date: new Date(data.date || new Date())
            }
        });
        safeRevalidatePath('/dashboard/behavioural');
        return { success: true, data: incident };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// --- Behavioural Assessment (Legacy/Core) ---

export async function saveBehaviouralAssessments(
  termId: string,
  session: string,
  assessments: Array<{
    studentId: string;
    conduct?: number | null;
    punctuality?: number | null;
    dedication?: number | null;
    participation?: number | null;
    hospitality?: number | null;
    neatness?: number | null;
    creativity?: number | null;
    physical?: number | null;
    comment?: string | null;
  }>
) {
  try {
    let resolvedTermId = termId;
    const termObj = await prisma.term.findFirst({
      where: {
        OR: [{ id: termId }, { name: termId }],
      },
    });
    if (termObj) resolvedTermId = termObj.id;

    for (const entry of assessments) {
      await prisma.behaviouralAssessment.upsert({
        where: {
          studentId_termId: {
            studentId: entry.studentId,
            termId: resolvedTermId,
          },
        },
        update: {
          conduct: entry.conduct ?? 3,
          punctuality: entry.punctuality ?? 3,
          dedication: entry.dedication ?? 3,
          participation: entry.participation ?? 3,
          hospitality: entry.hospitality ?? 3,
          neatness: entry.neatness ?? 3,
          creativity: entry.creativity ?? 3,
          physical: entry.physical ?? 3,
          comment: entry.comment ?? null,
        },
        create: {
          studentId: entry.studentId,
          termId: resolvedTermId,
          session,
          conduct: entry.conduct ?? 3,
          punctuality: entry.punctuality ?? 3,
          dedication: entry.dedication ?? 3,
          participation: entry.participation ?? 3,
          hospitality: entry.hospitality ?? 3,
          neatness: entry.neatness ?? 3,
          creativity: entry.creativity ?? 3,
          physical: entry.physical ?? 3,
          comment: entry.comment ?? null,
        },
      });
    }
    safeRevalidatePath('/dashboard/behavioural');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getBehaviouralAssessments(classId: string, termId: string, session: string) {
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

    const assessments = await prisma.behaviouralAssessment.findMany({
      where: {
        termId: resolvedTermId,
        session,
        studentId: { in: students.map(s => s.id) },
      },
    });

    return { success: true, students, assessments };
  } catch (error: any) {
    return { success: false, students: [], assessments: [], message: error.message };
  }
}
