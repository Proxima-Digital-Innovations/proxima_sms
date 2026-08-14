'use server';

import { requireSchoolId } from "@/lib/server-context";
import { ParentService } from "@/lib/services/parent-service";

const service = new ParentService();

/**
 * Fetches the holistic dashboard data for a Parent
 */
export async function getParentDashboardData() {
  try {
    
    const data = await service.getParentDashboardData();

    return {
      success: true,
      ...data
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
