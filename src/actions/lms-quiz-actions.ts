'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Create a new quiz shell
 */
export async function createQuiz(moduleId: string, title: string, description?: string, timeLimit?: number) {
  try {
    // Resolve the schoolId from the parent LMS module
    const module = await prisma.lmsModule.findUnique({ where: { id: moduleId } });
    if (!module) throw new Error("Module not found.");

    const quiz = await prisma.quiz.create({
      data: { moduleId, title, description, timeLimit, schoolId: module.schoolId }
    });
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
    // Resolve schoolId from the parent quiz record
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) throw new Error("Quiz not found.");

    const q = await prisma.quizQuestion.create({
      data: { quizId, question, type, correctAnswer, options, points, schoolId: quiz.schoolId }
    });
    revalidatePath("/admin/lms");
    return { success: true, question: q };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Submit a quiz attempt and AUTO-GRADE
 */
export async function submitQuizAttempt(quizId: string, studentId: string, studentAnswers: Record<string, string>) {
  try {
    // 1. Fetch quiz questions
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { 
        questions: true,
        module: { include: { subject: true } }
      }
    });

    if (!quiz) throw new Error("Quiz not found.");
    const schoolId = quiz.schoolId;

    // 2. Auto-Grade Logic
    let totalScore = 0;
    let maxScore = 0;

    quiz.questions.forEach(q => {
      maxScore += q.points;
      const studentAnswer = studentAnswers[q.id];
      if (studentAnswer && studentAnswer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
        totalScore += q.points;
      }
    });

    const finalPercentage = (totalScore / maxScore) * 100;

    // 3. Save attempt including schoolId
    const attempt = await prisma.quizAttempt.create({
      data: {
        schoolId,
        quizId,
        studentId,
        answers: JSON.stringify(studentAnswers),
        score: finalPercentage,
        completedAt: new Date()
      }
    });

    // 4. GRADE PASSBACK to SIS (Update CA Score)
    const currentTerm = await prisma.term.findFirst({ where: { isActive: true, schoolId } });
    if (currentTerm) {
      await prisma.termGrade.upsert({
        where: {
          studentId_subjectId_termId: {
            studentId,
            subjectId: quiz.module.subjectId,
            termId: currentTerm.id
          }
        },
        update: { ca1: finalPercentage }, // Simplified: overwriting CA1
        create: {
          schoolId,
          studentId,
          subjectId: quiz.module.subjectId,
          termId: currentTerm.id,
          ca1: finalPercentage
        }
      });
    }

    revalidatePath("/student/lms");
    return { success: true, attempt, score: finalPercentage };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Fetch quizzes for a module
 */
export async function getQuizzes(moduleId: string) {
  try {
    const quizzes = await prisma.quiz.findMany({
      where: { moduleId },
      include: { questions: true }
    });
    return { success: true, quizzes };
  } catch (error: any) {
    return { success: false, quizzes: [], message: error.message };
  }
}
