'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

import { requireSchoolId } from "@/lib/server-context";

/**
 * Fetch all courses (Subject-Class pairs) for a teacher
 * For demo, returns all modules linked to subjects/classes
 */
export async function getLmsCourses(subjectId?: string, classId?: string) {
  try {
    const schoolId = await requireSchoolId();
    const modules = await prisma.lmsModule.findMany({
      where: {
        schoolId,
        ...(subjectId && { subjectId }),
        ...(classId && { classId })
      },
      include: {
        subject: true,
        class: true,
        content: {
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { order: 'asc' }
    });
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
    const schoolId = await requireSchoolId();
    const module = await prisma.lmsModule.create({
      data: { title, subjectId, classId, order, schoolId }
    });
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
    const schoolId = await requireSchoolId();
    const content = await prisma.lmsContent.create({
      data: { moduleId, title, type, url, body, order, schoolId }
    });
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
    const schoolId = await requireSchoolId();
    // Delete content first due to relations (or use Cascade if defined)
    await prisma.lmsContent.deleteMany({ where: { moduleId, schoolId } });
    await prisma.lmsModule.delete({ where: { id: moduleId, schoolId } });
    revalidatePath("/admin/lms");
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
