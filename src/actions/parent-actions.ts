'use server';

import { ParentService } from "@/lib/services/parent-service";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const service = new ParentService();

/**
 * Fetches the holistic dashboard data for a Parent
 */
export async function getParentDashboardData(selectedStudentId?: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const userEmail = session?.user?.email;

    const data = await service.getParentDashboardData(userId || undefined, userEmail || undefined, selectedStudentId);

    return {
      success: true,
      ...data
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Fetches the complete terminal report card for the parent's ward
 */
export async function getWardReportCard(studentId?: string, termId?: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const userEmail = session?.user?.email;

    const data = await service.getWardReportCard(userId || undefined, userEmail || undefined, studentId, termId);

    return {
      success: true,
      ...data
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Fetches invoices and official receipts for the parent's ward
 */
export async function getWardInvoicesAndReceipts(studentId?: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const userEmail = session?.user?.email;

    const data = await service.getWardInvoicesAndReceipts(userId || undefined, userEmail || undefined, studentId);

    return {
      success: true,
      ...data
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Fetches daily attendance records and stats for the parent's ward
 */
export async function getWardAttendanceHistory(studentId?: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const userEmail = session?.user?.email;

    const data = await service.getWardAttendanceHistory(userId || undefined, userEmail || undefined, studentId);

    return {
      success: true,
      ...data
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Fetches the class timetable for the parent's ward
 */
export async function getWardTimetable(studentId?: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const userEmail = session?.user?.email;

    const data = await service.getWardTimetable(userId || undefined, userEmail || undefined, studentId);

    return {
      success: true,
      ...data
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Fetches guardian profile details and linked wards for the parent profile page
 */
export async function getParentProfile() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const userEmail = session?.user?.email;

    const data = await service.getParentDashboardData(userId || undefined, userEmail || undefined);

    const guardian = await prisma.guardian.findFirst({
      where: {
        OR: [
          ...(userId ? [{ userId }] : []),
          ...(userEmail ? [{ email: userEmail }] : [])
        ]
      }
    });

    return {
      success: true,
      guardian: guardian ? {
        fullName: guardian.fullName,
        phone: guardian.phone,
        email: guardian.email,
        address: guardian.address,
        relationship: guardian.relationship,
      } : null,
      wards: data.wards || [],
      wallet: data.wallet || null
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
