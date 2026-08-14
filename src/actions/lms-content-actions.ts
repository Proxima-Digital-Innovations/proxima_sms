'use server';

import { revalidatePath } from "next/cache";
import { requireSchoolId } from "@/lib/server-context";
import { LmsContentService } from "@/lib/services/lms-content-service";

const service = new LmsContentService();

/**
 * Fetch all courses (Subject-Class pairs) for a teacher
 * For demo, returns all modules linked to subjects/classes
 */
export async function getLmsCourses(subjectId?: string, classId?: string) {
  try {
    
    const modules = await service.getLmsCourses(subjectId, classId);
    return { success: true, modules };
  } catch (error: any) {
    return { success: false, modules: [], message: error.message };
  }
}

/**
 * Create a new learning module
 */
export async function createLmsModule(title: string, subjectId: string, classId: string, order: number = 0) {
  try {
    
    const module = await service.createLmsModule(title, subjectId, classId, order);
    revalidatePath("/admin/lms");
    return { success: true, module };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Add content to a module
 */
export async function addLmsContent(
  moduleId: string, 
  title: string, 
  type: string, 
  url?: string, 
  body?: string, 
  order: number = 0
) {
  try {
    
    const content = await service.addLmsContent(moduleId, title, type, url, body, order);
    revalidatePath("/admin/lms");
    return { success: true, content };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Delete a module and its content
 */
export async function deleteLmsModule(moduleId: string) {
  try {
    
    await service.deleteLmsModule(moduleId);
    revalidatePath("/admin/lms");
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
