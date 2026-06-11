'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSchoolId } from "@/lib/server-context";

/**
 * Creates a new Academic Session (e.g., 2026/2027)
 */
export async function createAcademicSession(data: { name: string, startDate: Date, endDate: Date, isActive: boolean }) {
  try {
    const schoolId = await requireSchoolId();

    // If making this active, deactivate others for the current school context
    if (data.isActive) {
      await prisma.academicSession.updateMany({
        where: { schoolId },
        data: { isActive: false }
      });
    }

    const session = await prisma.academicSession.create({
      data: {
        ...data,
        schoolId
      },
    });

    revalidatePath("/admin/academic-setup");
    return { success: true, session };
  } catch (error: any) {
    console.error("Error creating session:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Creates a new Term under an Academic Session
 */
export async function createTerm(data: { name: string, sessionId: string, startDate: Date, endDate: Date, isActive: boolean }) {
  try {
    const schoolId = await requireSchoolId();

    // If making this active, deactivate other terms for the current school context
    if (data.isActive) {
      await prisma.term.updateMany({
        where: { schoolId },
        data: { isActive: false }
      });
    }

    const term = await prisma.term.create({
      data: {
        ...data,
        schoolId
      },
    });


    revalidatePath("/admin/academic-setup");
    return { success: true, term };
  } catch (error: any) {
    console.error("Error creating term:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Fetches all sessions with their nested terms
 */
export async function getAcademicCalendar() {
  try {
    const sessions = await prisma.academicSession.findMany({
      include: {
        terms: {
          orderBy: { startDate: 'asc' }
        }
      },
      orderBy: { startDate: 'desc' }
    });
    return { success: true, sessions };
  } catch (error: any) {
    return { success: false, sessions: [], message: error.message };
  }
}

/**
 * Toggles a session's active status. Will deactivate all others.
 */
export async function setSessionActive(id: string) {
  try {
    await prisma.$transaction([
      prisma.academicSession.updateMany({ data: { isActive: false } }),
      prisma.academicSession.update({ where: { id }, data: { isActive: true } })
    ]);
    revalidatePath("/admin/academic-setup");
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Toggles a term's active status. Will deactivate all others globally.
 */
export async function setTermActive(id: string) {
  try {
    await prisma.$transaction([
      prisma.term.updateMany({ data: { isActive: false } }),
      prisma.term.update({ where: { id }, data: { isActive: true } })
    ]);
    revalidatePath("/admin/academic-setup");
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
