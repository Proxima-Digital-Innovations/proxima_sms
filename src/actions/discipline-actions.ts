'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSchoolId } from "@/lib/server-context";

/**
 * Fetches all recent incidents across the school
 */
export async function getRecentIncidents(limit = 50) {
  try {
    const schoolId = await requireSchoolId();
    const incidents = await prisma.behavioralIncident.findMany({
      where: { schoolId },
      take: limit,
      orderBy: { date: 'desc' },
      include: {
        student: { select: { firstName: true, lastName: true, studentId: true } },
        reporter: { select: { firstName: true, lastName: true } },
        actions: true
      }
    });
    return { success: true, incidents };
  } catch (error: any) {
    return { success: false, incidents: [], message: error.message };
  }
}

/**
 * Gets a specific student's behavioral record
 */
export async function getStudentIncidents(studentId: string) {
  try {
    const incidents = await prisma.behavioralIncident.findMany({
      where: { studentId },
      orderBy: { date: 'desc' },
      include: {
        reporter: { select: { firstName: true, lastName: true } },
        actions: { orderBy: { date: 'desc' } }
      }
    });
    return { success: true, incidents };
  } catch (error: any) {
    return { success: false, incidents: [], message: error.message };
  }
}

/**
 * Logs a new behavioral incident
 */
export async function logIncident(data: { studentId: string, title: string, description: string, severity: string, date?: Date }) {
  try {
    const schoolId = await requireSchoolId();
    // In a real scenario, this comes from Auth
    const defaultReporter = await prisma.user.findFirst({ where: { role: 'ADMIN', schoolId } });
    
    if (!defaultReporter) throw new Error("No reporter found.");

    const incident = await prisma.behavioralIncident.create({
      data: {
        reporterId: defaultReporter.id,
        schoolId,
        ...data,
      }
    });

    revalidatePath("/admin/discipline");
    return { success: true, incident };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Adds an administrative action to an incident (e.g., Suspension)
 */
export async function addIncidentAction(incidentId: string, actionTaken: string, details?: string) {
  try {
    const schoolId = await requireSchoolId();
    const action = await prisma.incidentAction.create({
      data: {
        incidentId,
        schoolId,
        actionTaken,
        details
      }
    });
    
    revalidatePath("/admin/discipline");
    return { success: true, action };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Updates the status of an incident (OPEN -> CLOSED)
 */
export async function updateIncidentStatus(incidentId: string, status: string) {
  try {
    await prisma.behavioralIncident.update({
      where: { id: incidentId },
      data: { status }
    });
    
    revalidatePath("/admin/discipline");
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
