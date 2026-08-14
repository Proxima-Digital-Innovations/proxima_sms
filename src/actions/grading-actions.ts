'use server';
import { revalidatePath } from "next/cache";
import { requireSchoolId } from "@/lib/server-context";
import { GradingService } from "@/lib/services/grading-service";
const gradingService = new GradingService();
export async function getGradeSheet(classId: string, subjectId: string, termId: string) {
  try {
    
    return await gradingService.getGradeSheet(classId, subjectId, termId);
  } catch (error: any) {
    return { success: false, grades: [], message: error.message };
  }
}
export async function saveGradeSheet(gradesUpdate: { id: string, ca1: number|null, ca2: number|null, exam: number|null, remarks: string }[]) {
  try {
    await gradingService.saveGradeSheet(gradesUpdate);
    revalidatePath("/admin/grading");
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
export async function getStudentReportCard(studentId: string, termId: string) {
  try {
    
    return await gradingService.getStudentReportCard(studentId, termId);
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}