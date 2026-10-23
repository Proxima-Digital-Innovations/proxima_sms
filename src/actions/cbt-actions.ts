'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

export async function getCbtExams(courseOfferingId?: string) {
  try {
    const where = courseOfferingId ? { courseOfferingId } : {};
    const exams = await prisma.cbtExam.findMany({
      where,
      include: {
        courseOffering: {
          include: { course: true },
        },
        _count: { select: { questions: true, submissions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: exams };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getCbtExamDetails(examId: string, studentProfileId?: string) {
  try {
    const exam = await prisma.cbtExam.findUnique({
      where: { id: examId },
      include: {
        courseOffering: { include: { course: true } },
        questions: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            questionText: true,
            questionType: true,
            optionsJson: true,
            points: true,
            orderIndex: true,
            // Exclude correctOption so students cannot inspect payload
          },
        },
      },
    });

    if (!exam) throw new Error('Exam not found.');

    let submission: any = null;
    if (studentProfileId) {
      submission = await prisma.cbtSubmission.findUnique({
        where: {
          examId_studentProfileId: {
            examId,
            studentProfileId,
          },
        },
      });
    }

    return { success: true, data: { exam, submission } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createCbtExam(data: {
  title: string;
  description?: string;
  courseOfferingId?: string;
  durationMinutes: number;
  totalMarks: number;
  targetCategory?: 'CA' | 'EXAM';
  antiCheatLevel?: 'NONE' | 'STANDARD' | 'STRICT';
  maxTabSwitches?: number;
  questions: {
    questionText: string;
    options: { id: string; text: string }[];
    correctOption: string;
    points: number;
  }[];
}) {
  try {
    const exam = await prisma.cbtExam.create({
      data: {
        title: data.title,
        description: data.description || null,
        courseOfferingId: data.courseOfferingId || null,
        durationMinutes: data.durationMinutes || 60,
        totalMarks: data.totalMarks || 40.0,
        targetCategory: data.targetCategory || 'CA',
        antiCheatLevel: data.antiCheatLevel || 'STRICT',
        maxTabSwitches: data.maxTabSwitches || 3,
        isPublished: true,
        questions: {
          create: data.questions.map((q, idx) => ({
            questionText: q.questionText,
            questionType: 'MULTIPLE_CHOICE',
            optionsJson: JSON.stringify(q.options),
            correctOption: q.correctOption,
            points: q.points || 2.0,
            orderIndex: idx + 1,
          })),
        },
      },
    });

    revalidatePath('/dashboard/tertiary/cbt');
    return { success: true, data: exam };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function submitCbtExamAction(data: {
  examId: string;
  studentProfileId: string;
  answers: Record<string, string>; // questionId -> selectedOption ("A", "B", etc.)
  tabSwitchCount: number;
  isAutoSubmitted?: boolean;
}) {
  try {
    const exam = await prisma.cbtExam.findUnique({
      where: { id: data.examId },
      include: { questions: true },
    });

    if (!exam) throw new Error('Exam not found.');

    // Compute Score
    let pointsEarned = 0;
    let maxPoints = 0;

    for (const q of exam.questions) {
      maxPoints += q.points;
      const studentAnswer = data.answers[q.id];
      if (studentAnswer && studentAnswer.trim().toUpperCase() === q.correctOption.trim().toUpperCase()) {
        pointsEarned += q.points;
      }
    }

    const percentageScore = maxPoints > 0 ? (pointsEarned / maxPoints) * 100 : 0;
    // Scale points to target totalMarks (e.g. 40 CA cap)
    const scaledScore = Number(((percentageScore / 100) * exam.totalMarks).toFixed(2));

    const isDisqualified =
      exam.antiCheatLevel === 'STRICT' && data.tabSwitchCount > exam.maxTabSwitches;

    const submission = await prisma.$transaction(async (tx) => {
      const sub = await tx.cbtSubmission.upsert({
        where: {
          examId_studentProfileId: {
            examId: data.examId,
            studentProfileId: data.studentProfileId,
          },
        },
        create: {
          examId: data.examId,
          studentProfileId: data.studentProfileId,
          scoreAchieved: isDisqualified ? 0 : scaledScore,
          percentageScore: isDisqualified ? 0 : percentageScore,
          answersJson: JSON.stringify(data.answers),
          tabSwitchCount: data.tabSwitchCount,
          isAutoSubmitted: data.isAutoSubmitted || false,
          isPipedToGrades: !!exam.courseOfferingId,
          status: isDisqualified ? 'DISQUALIFIED' : 'SUBMITTED',
          submittedAt: new Date(),
        },
        update: {
          scoreAchieved: isDisqualified ? 0 : scaledScore,
          percentageScore: isDisqualified ? 0 : percentageScore,
          answersJson: JSON.stringify(data.answers),
          tabSwitchCount: data.tabSwitchCount,
          isAutoSubmitted: data.isAutoSubmitted || false,
          status: isDisqualified ? 'DISQUALIFIED' : 'SUBMITTED',
          submittedAt: new Date(),
        },
      });

      // Pipe Continuous Assessment (CA) directly into TIMS StudentGrade if offering exists
      if (exam.courseOfferingId && !isDisqualified) {
        const existingGrade = await tx.studentGrade.findUnique({
          where: {
            studentId_offeringId: {
              studentId: data.studentProfileId,
              offeringId: exam.courseOfferingId,
            },
          },
        });

        const examScore = existingGrade ? Number(existingGrade.examScore) : 0;
        const totalScore = Number((scaledScore + examScore).toFixed(2));

        let letterGrade = 'F';
        let gradePoint = 0.0;
        if (totalScore >= 70) { letterGrade = 'A'; gradePoint = 5.0; }
        else if (totalScore >= 60) { letterGrade = 'B'; gradePoint = 4.0; }
        else if (totalScore >= 50) { letterGrade = 'C'; gradePoint = 3.0; }
        else if (totalScore >= 45) { letterGrade = 'D'; gradePoint = 2.0; }

        const dataHash = crypto.createHash('sha256').update(`${data.studentProfileId}-${totalScore}-SUBMITTED`).digest('hex');

        await tx.studentGrade.upsert({
          where: {
            studentId_offeringId: {
              studentId: data.studentProfileId,
              offeringId: exam.courseOfferingId,
            },
          },
          create: {
            studentId: data.studentProfileId,
            offeringId: exam.courseOfferingId,
            caScore: scaledScore,
            examScore: 0,
            totalScore: scaledScore,
            letterGrade: 'F', // Incomplete until final exam
            gradePoint: 0.0,
            status: 'SUBMITTED',
            dataHash,
          },
          update: {
            caScore: scaledScore,
            totalScore,
            letterGrade,
            gradePoint,
            dataHash,
          },
        });
      }

      return sub;
    });

    revalidatePath('/dashboard/tertiary/cbt');
    revalidatePath('/dashboard/tertiary/exams');
    return {
      success: true,
      data: {
        scoreAchieved: submission.scoreAchieved,
        totalMarks: exam.totalMarks,
        percentageScore: submission.percentageScore,
        isDisqualified,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
