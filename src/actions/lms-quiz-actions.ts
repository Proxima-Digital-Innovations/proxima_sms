'use server';

import { revalidatePath } from "next/cache";
import { LmsQuizService } from "@/lib/services/lms-quiz-service";

const service = new LmsQuizService();

/**
 * Create a new quiz shell
 */
export async function createQuiz(moduleId: string, title: string, description?: string, timeLimit?: number) {
  try {
    const quiz = await service.createQuiz(moduleId, title, description, timeLimit);
    revalidatePath("/admin/lms");
    return { success: true, quiz };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Add a question to a quiz
 */
export async function addQuizQuestion(
  quizId: string, 
  question: string, 
  type: string, 
  correctAnswer: string, 
  options?: string, // JSON string
  points: number = 10
) {
  try {
    const q = await service.addQuizQuestion(quizId, question, type, correctAnswer, options, points);
    revalidatePath("/admin/lms");
    return { success: true, question: q };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Submit a quiz attempt and AUTO-GRADE
 */
export async function submitQuizAttempt(
  quizId: string,
  studentId: string,
  studentAnswers: Record<string, string>,
  telemetry?: {
    pasteCount?: number;
    tabSwitchCount?: number;
    isPasteFlagged?: boolean;
  }
) {
  try {
    const session = await auth();
    const resolvedStudentId = (studentId && studentId !== 'mock-student-id')
      ? studentId
      : (session?.user?.id || (await prisma.student.findFirst())?.id || 'student');

    const result = await service.submitQuizAttempt(quizId, resolvedStudentId, studentAnswers, telemetry);
    revalidatePath("/student/lms");
    return { success: true, attempt: result.attempt, score: result.score };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Fetch quizzes for a module
 */
export async function getQuizzes(moduleId: string) {
  try {
    const quizzes = await service.getQuizzes(moduleId);
    return { success: true, quizzes };
  } catch (error: any) {
    return { success: false, quizzes: [], message: error.message };
  }
}
