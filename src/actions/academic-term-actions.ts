'use server';

import { revalidatePath } from "next/cache";
import { requireSchoolId } from "@/lib/server-context";
import { AcademicTermService } from "@/lib/services/academic-term-service";

const service = new AcademicTermService();

/**
 * Creates a new Academic Session (e.g, 2026/2027)
 */
export async function createAcademicSession(data: { name: string, startDate: Date, endDate: Date, isActive: boolean }) {
  try {
    
    const session = await service.createSession(data, );
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
    
    const term = await service.createTerm(data, );
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
    const sessions = await service.getAcademicCalendar();
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
    await service.setSessionActive(id);
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
    await service.setTermActive(id);
    revalidatePath("/admin/academic-setup");
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
