'use server';

import { revalidatePath } from "next/cache";
import { requireSchoolId } from "@/lib/server-context";
import { HrService } from "@/lib/services/hr-service";

export async function getLeaveRequests() {
  try {
    
    const leaves = await HrService.getLeaveRequests();
    return { success: true, leaves };
  } catch (error: any) {
    return { success: false, leaves: [], message: error.message };
  }
}

export async function createLeaveRequest(userId: string, startDate: Date, endDate: Date, reason: string) {
  try {
    
    const leave = await HrService.createLeaveRequest(userId, startDate, endDate, reason);
    revalidatePath("/admin/hr");
    return { success: true, leave };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function updateLeaveStatus(id: string, status: string) {
  try {
    const leave = await HrService.updateLeaveStatus(id, status);
    revalidatePath("/admin/hr");
    return { success: true, leave };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getOrphanedClasses(date: Date) {
  try {
    
    const orphanedClasses = await HrService.getOrphanedClasses(date);
    return { success: true, orphanedClasses };
  } catch (error: any) {
    return { success: false, orphanedClasses: [], message: error.message };
  }
}

export async function getAvailableSubstituteTeachers() {
  try {
    
    const teachers = await HrService.getAvailableSubstituteTeachers();
    return { success: true, teachers };
  } catch (error: any) {
    return { success: false, teachers: [], message: error.message };
  }
}

export async function assignSubstitute(timetableId: string, substituteId: string, date: Date) {
  try {
    
    const assignment = await HrService.assignSubstitute(timetableId, substituteId, date);
    revalidatePath("/admin/hr");
    return { success: true, assignment };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getHodDashboardData() {
  try {
    const data = await HrService.getHodDashboardData();
    return { success: true, data };
  } catch (error: any) {
    return { success: false, data: {}, message: error.message };
  }
}

export async function getStaffProfiles() {
  try {
    
    const staff = await HrService.getStaffProfiles();
    return { success: true, staff };
  } catch (error: any) {
    return { success: false, staff: [], message: error.message };
  }
}
