'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSchoolId } from "@/lib/server-context";

/**
 * Create a new assignment within a module
 */
export async function createAssignment(moduleId: string, title: string, points: number, description?: string, dueDate?: Date) {
  try {
    const schoolId = await requireSchoolId();
    const assignment = await prisma.assignment.create({
      data: { moduleId, title, points, description, dueDate, schoolId }
    });
    revalidatePath("/admin/lms");
    return { success: true, assignment };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Submit student work
 */
export async function submitWork(assignmentId: string, studentId: string, fileUrl?: string, body?: string) {
  try {
    const schoolId = await requireSchoolId();
    const submission = await prisma.submission.create({
      data: { assignmentId, studentId, fileUrl, body, schoolId }
    });
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
    const submissions = await prisma.submission.findMany({
      where: { assignmentId },
      include: {
        student: true
      }
    });
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
    const submission = await prisma.submission.update({
      where: { id: submissionId },
      data: { score, feedback, gradedAt: new Date() },
      include: {
        assignment: {
          include: {
            module: {
              include: { subject: true }
            }
          }
        },
        student: true
      }
    });

    // --- GRADE PASSBACK LOGIC ---
    // In our SIS, we have TermGrade [studentId, subjectId, termId]
    // We'll find the current term and update the CA score
    
    const schoolId = await requireSchoolId();
    const currentTerm = await prisma.term.findFirst({ where: { isActive: true, schoolId } });
    if (currentTerm) {
      const subjectId = submission.assignment.module.subjectId;
      const studentId = submission.studentId;

      const termGrade = await prisma.termGrade.upsert({
        where: {
          studentId_subjectId_termId: {
            studentId,
            subjectId,
            termId: currentTerm.id
          }
        },
        update: {
          ca1: score 
        },
        create: {
          studentId,
          subjectId,
          termId: currentTerm.id,
          schoolId,
          ca1: score
        }
      });
    }

    revalidatePath("/admin/lms/grading");
    return { success: true, submission };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
