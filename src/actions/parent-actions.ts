'use server';

import { prisma } from "@/lib/prisma";
import { requireSchoolId } from "@/lib/server-context";
import { Role } from "@prisma/client";

/**
 * Fetches the holistic dashboard data for a Parent
 * Mocks the authentication by finding the first PARENT user
 */
export async function getParentDashboardData() {
  try {
    const schoolId = await requireSchoolId();
    // MOCK AUTHENTICATION: Find a parent user in this school
    const parentUser = await prisma.user.findFirst({
      where: { role: Role.PARENT, schoolId },
      include: {
        guardianProfile: {
          include: {
            student: {
              include: {
                class: true,
                healthRecord: {
                  include: {
                    immunizations: true,
                    clinicVisits: { orderBy: { date: 'desc' }, take: 3 }
                  }
                },
                incidents: { orderBy: { date: 'desc' }, take: 3 },
                invoices: { 
                  where: { status: { not: 'PAID' } },
                  include: { term: true }
                },
              }
            }
          }
        }
      }
    });

    if (!parentUser || !parentUser.guardianProfile) {
      return { success: false, message: "No parent profile found or not linked to a student." };
    }

    const student = parentUser.guardianProfile.student;

    // Get Active Term for Grades & Attendance context
    const activeTerm = await prisma.term.findFirst({
      where: { isActive: true, schoolId },
      include: { session: true }
    });

    let grades: any[] = [];
    let attendanceCount = 0;

    if (activeTerm) {
      // Fetch Term Grades
      grades = await prisma.termGrade.findMany({
        where: { studentId: student.id, termId: activeTerm.id },
        include: { subject: true }
      });

      // Fetch Attendance
      attendanceCount = await prisma.attendance.count({
        where: { studentId: student.id, termId: activeTerm.id, status: 'Present', schoolId }
      });
    }

    return {
      success: true,
      parent: parentUser,
      guardianInfo: parentUser.guardianProfile,
      student,
      activeTerm,
      grades,
      attendanceCount,
      recentIncidents: student.incidents,
      health: student.healthRecord,
      outstandingInvoices: student.invoices
    };

  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
