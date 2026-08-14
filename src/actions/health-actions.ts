'use server';

import { revalidatePath } from "next/cache";
import { requireSchoolId } from "@/lib/server-context";
import { HealthService } from "@/lib/services/health-service";

const healthService = new HealthService();

export async function getStudentHealthRecord(studentId: string) {
  try {
    
    const record = await healthService.getStudentHealthRecord(studentId, );
    return { success: true, record };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function updateHealthProfile(studentId: string, data: any) {
  try {
    
    const record = await healthService.updateHealthProfile(studentId, data, );
    revalidatePath("/admin/health");
    return { success: true, record };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function logClinicVisit(healthRecordId: string, data: { symptoms: string, diagnosis?: string, treatment?: string, sentHome: boolean, notes?: string }) {
  try {
    
    const visit = await healthService.logClinicVisit(healthRecordId, data);
    revalidatePath("/admin/health");
    return { success: true, visit };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function addImmunization(healthRecordId: string, data: { vaccineName: string, dateGiven?: Date, status: string, notes?: string }) {
  try {
    
    const immunization = await healthService.addImmunization(healthRecordId, data);
    revalidatePath("/admin/health");
    return { success: true, immunization };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getStudentsForHealthDashboard(searchQuery?: string) {
  try {
    
    const students = await healthService.getStudentsForHealthDashboard(searchQuery);
    return { success: true, students };
  } catch (error: any) {
    return { success: false, students: [], message: error.message };
  }
}
