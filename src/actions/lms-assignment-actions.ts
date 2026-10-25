'use server';

import { revalidatePath } from "next/cache";
import { requireSchoolId } from "@/lib/server-context";
import { LmsAssignmentService } from "@/lib/services/lms-assignment-service";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const service = new LmsAssignmentService();

/**
 * Create a new assignment within a module
 */
export async function createAssignment(moduleId: string, title: string, points: number, description?: string, dueDate?: Date) {
  try {
    
    const assignment = await service.createAssignment(moduleId, title, points, description, dueDate);
    revalidatePath("/admin/lms");
    return { success: true, assignment };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Submit student work
 */
export async function submitWork(
  assignmentId: string,
  studentId: string,
  fileUrl?: string,
  body?: string,
  telemetry?: {
    pasteCount?: number;
    tabSwitchCount?: number;
    isPasteFlagged?: boolean;
    similarityScore?: number | null;
  }
) {
  try {
    const session = await auth();
    const resolvedStudentId = (studentId && studentId !== 'mock-student-id')
      ? studentId
      : (session?.user?.id || (await prisma.student.findFirst())?.id || 'student');
    
    const submission = await service.submitWork(assignmentId, resolvedStudentId, fileUrl, body, telemetry);
    revalidatePath("/student/lms");
    return { success: true, submission };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Fetch submissions for SpeedGrader
 */
export async function getSubmissions(assignmentId: string) {
  try {
    const submissions = await service.getSubmissions(assignmentId);
    return { success: true, submissions };
  } catch (error: any) {
    return { success: false, submissions: [], message: error.message };
  }
}

/**
 * Grade a submission and PASS BACK to SIS TermGrade
 */
export async function gradeSubmission(submissionId: string, score: number, feedback: string) {
  try {
    
    const submission = await service.gradeSubmission(submissionId, score, feedback);
    revalidatePath("/admin/lms/grading");
    return { success: true, submission };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
