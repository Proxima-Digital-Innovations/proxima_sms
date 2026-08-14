'use server';

import { revalidatePath } from "next/cache";
import { requireSchoolId } from "@/lib/server-context";
import { DisciplineService } from "@/lib/services/discipline-service";

const disciplineService = new DisciplineService();

export async function getRecentIncidents(limit = 50) {
  try {
    
    const incidents = await disciplineService.getRecentIncidents(limit);
    return { success: true, incidents };
  } catch (error: any) {
    return { success: false, incidents: [], message: error.message };
  }
}

export async function getStudentIncidents(studentId: string) {
  try {
    const incidents = await disciplineService.getStudentIncidents(studentId);
    return { success: true, incidents };
  } catch (error: any) {
    return { success: false, incidents: [], message: error.message };
  }
}

export async function logIncident(data: { studentId: string, title: string, description: string, severity: string, date?: Date }) {
  try {
    
    const incident = await disciplineService.logIncident(data);
    revalidatePath("/admin/discipline");
    return { success: true, incident };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function addIncidentAction(incidentId: string, actionTaken: string, details?: string) {
  try {
    
    const action = await disciplineService.addIncidentAction(incidentId, actionTaken, details);
    revalidatePath("/admin/discipline");
    return { success: true, action };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function updateIncidentStatus(incidentId: string, status: string) {
  try {
    await disciplineService.updateIncidentStatus(incidentId, status);
    revalidatePath("/admin/discipline");
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
