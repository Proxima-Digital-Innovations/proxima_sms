'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSchoolId } from "@/lib/server-context";

/**
 * Ensures a HealthRecord exists for the given student, then fetches it.
 */
export async function getStudentHealthRecord(studentId: string) {
  try {
    const schoolId = await requireSchoolId();
    let record = await prisma.healthRecord.findUnique({
      where: { studentId },
      include: {
        immunizations: { orderBy: { dateGiven: 'desc' } },
        clinicVisits: { 
          orderBy: { date: 'desc' },
          include: { nurse: true }
        },
        student: true
      }
    });

    if (!record) {
      record = await prisma.healthRecord.create({
        data: { studentId, schoolId },
        include: {
          immunizations: true,
          clinicVisits: { include: { nurse: true } },
          student: true
        }
      });
    }

    return { success: true, record };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Updates basic health profile information
 */
export async function updateHealthProfile(studentId: string, data: any) {
  try {
    const schoolId = await requireSchoolId();
    const record = await prisma.healthRecord.update({
      where: { studentId },
      data: { ...data, schoolId }
    });
    revalidatePath("/admin/health");
    return { success: true, record };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Logs a new Clinic Visit
 */
export async function logClinicVisit(healthRecordId: string, data: { symptoms: string, diagnosis?: string, treatment?: string, sentHome: boolean, notes?: string }) {
  try {
    const schoolId = await requireSchoolId();
    const visit = await prisma.clinicVisit.create({
      data: {
        healthRecordId,
        schoolId,
        ...data,
      }
    });
    revalidatePath("/admin/health");
    return { success: true, visit };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Adds an Immunization record
 */
export async function addImmunization(healthRecordId: string, data: { vaccineName: string, dateGiven?: Date, status: string, notes?: string }) {
  try {
    const schoolId = await requireSchoolId();
    const immunization = await prisma.immunization.create({
      data: {
        healthRecordId,
        schoolId,
        ...data
      }
    });
    revalidatePath("/admin/health");
    return { success: true, immunization };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Fetch all students with minimal health summary for the list view
 */
export async function getStudentsForHealthDashboard(searchQuery?: string) {
  try {
    const schoolId = await requireSchoolId();
    const students = await prisma.student.findMany({
      where: {
        schoolId,
        ...(searchQuery ? {
          OR: [
            { firstName: { contains: searchQuery, mode: 'insensitive' } },
            { lastName: { contains: searchQuery, mode: 'insensitive' } },
            { studentId: { contains: searchQuery, mode: 'insensitive' } }
          ]
        } : {})
      },
      include: {
        healthRecord: {
          select: { allergies: true, chronicIllness: true }
        },
        class: true
      },
      take: 50,
      orderBy: { lastName: 'asc' }
    });
    return { success: true, students };
  } catch (error: any) {
    return { success: false, students: [], message: error.message };
  }
}
