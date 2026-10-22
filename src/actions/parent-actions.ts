'use server';

import { ParentService } from "@/lib/services/parent-service";
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
