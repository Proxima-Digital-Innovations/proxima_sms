'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

export async function getCbtExams(courseOfferingId?: string) {
  try {
    const session = await auth();
    let where: any = courseOfferingId ? { courseOfferingId } : {};

    // If the user is a STUDENT, strictly filter CBT exams to ONLY the courses they registered for
    if (session?.user?.id && (session.user as any).role === 'STUDENT' && !courseOfferingId) {
      const student = await prisma.studentProfile.findUnique({
        where: { userId: session.user.id },
        include: {
          registrations: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { courses: true },
          },
        },
      });

      const registeredOfferingIds = student?.registrations?.[0]?.courses.map((c) => c.offeringId) || [];
      where = {
        courseOfferingId: { in: registeredOfferingIds },
      };
    }

    const [exams, offerings] = await Promise.all([
      prisma.cbtExam.findMany({
        where,
        include: {
          courseOffering: {
            include: { course: true },
          },
          _count: { select: { questions: true, submissions: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.courseOffering.findMany({
        include: { course: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      success: true,
      data: exams,
      offerings: offerings.map((o) => ({
        id: o.id,
        code: o.course.code,
        title: o.course.title,
        session: o.academicSession,
        semester: o.semester,
      })),
    };
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

/**
 * Full exam details for Lecturers / Admins / Exam Officers:
 * Includes correctOption on every question + full list of student submissions.
 */
export async function getCbtExamForManagement(examId: string) {
  try {
    const exam = await prisma.cbtExam.findUnique({
      where: { id: examId },
      include: {
        courseOffering: { include: { course: true } },
        questions: {
          orderBy: { orderIndex: 'asc' },
        },
        submissions: {
          include: {
            studentProfile: {
              include: { user: true },
            },
          },
          orderBy: { submittedAt: 'desc' },
        },
      },
    });

    if (!exam) throw new Error('Exam not found.');

    return {
      success: true,
      data: {
        ...exam,
        submissions: exam.submissions.map((s) => ({
          id: s.id,
          studentId: s.studentProfileId,
          matricNumber: s.studentProfile?.matricNumber || 'N/A',
          studentName: s.studentProfile?.user
            ? `${s.studentProfile.user.firstName} ${s.studentProfile.user.lastName}`
            : 'Student',
          scoreAchieved: s.scoreAchieved,
          percentageScore: s.percentageScore,
          tabSwitchCount: s.tabSwitchCount,
          status: s.status,
          isPipedToGrades: s.isPipedToGrades,
          submittedAt: s.submittedAt,
        })),
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addCbtQuestionAction(data: {
  examId: string;
  questionText: string;
  options: { id: string; text: string }[];
  correctOption: string;
  points: number;
}) {
  try {
    const count = await prisma.cbtQuestion.count({ where: { examId: data.examId } });
    const question = await prisma.cbtQuestion.create({
      data: {
        examId: data.examId,
        questionText: data.questionText.trim(),
        questionType: 'MULTIPLE_CHOICE',
        optionsJson: JSON.stringify(data.options),
        correctOption: data.correctOption.toUpperCase(),
        points: Number(data.points) || 5,
        orderIndex: count + 1,
      },
    });
    revalidatePath('/dashboard/tertiary/cbt');
    return { success: true, data: question };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteCbtQuestionAction(questionId: string) {
  try {
    await prisma.cbtQuestion.delete({ where: { id: questionId } });
    revalidatePath('/dashboard/tertiary/cbt');
    return { success: true };
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
        courseOfferingId: data.courseOfferingId && data.courseOfferingId !== 'none' ? data.courseOfferingId : null,
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
  studentProfileId?: string;
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

    // Resolve logged-in student's profile if not explicitly provided
    let resolvedStudentId = data.studentProfileId;
    const session = await auth();
    if (session?.user?.id) {
      const profile = await prisma.studentProfile.findUnique({
        where: { userId: session.user.id },
      });
      if (profile) {
        resolvedStudentId = profile.id;
      }
    }
    if (!resolvedStudentId) {
      const firstStudent = await prisma.studentProfile.findFirst({ orderBy: { matricNumber: 'asc' } });
      resolvedStudentId = firstStudent?.id || '93e0878e-891f-4a60-ad1a-b0019b6c17f2';
    }

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
            studentProfileId: resolvedStudentId!,
          },
        },
        create: {
          examId: data.examId,
          studentProfileId: resolvedStudentId!,
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
          isPipedToGrades: !!exam.courseOfferingId,
          status: isDisqualified ? 'DISQUALIFIED' : 'SUBMITTED',
          submittedAt: new Date(),
        },
      });

      // Pipe Continuous Assessment (CA) or Exam score directly into TIMS StudentGrade if offering exists
      if (exam.courseOfferingId && !isDisqualified) {
        const existingGrade = await tx.studentGrade.findUnique({
          where: {
            studentId_offeringId: {
              studentId: resolvedStudentId!,
              offeringId: exam.courseOfferingId,
            },
          },
        });

        const isExamCategory = exam.targetCategory === 'EXAM';
        const caScore = isExamCategory
          ? (existingGrade ? Number(existingGrade.caScore) : 0)
          : scaledScore;
        const examScore = isExamCategory
          ? scaledScore
          : (existingGrade ? Number(existingGrade.examScore) : 0);
        const totalScore = Number((caScore + examScore).toFixed(2));

        let letterGrade = 'F';
        let gradePoint = 0.0;
        if (totalScore >= 70) { letterGrade = 'A'; gradePoint = 5.0; }
        else if (totalScore >= 60) { letterGrade = 'B'; gradePoint = 4.0; }
        else if (totalScore >= 50) { letterGrade = 'C'; gradePoint = 3.0; }
        else if (totalScore >= 45) { letterGrade = 'D'; gradePoint = 2.0; }

        const dataHash = crypto.createHash('sha256').update(`${resolvedStudentId}-${totalScore}-SUBMITTED`).digest('hex');

        await tx.studentGrade.upsert({
          where: {
            studentId_offeringId: {
              studentId: resolvedStudentId!,
              offeringId: exam.courseOfferingId,
            },
          },
          create: {
            studentId: resolvedStudentId!,
            offeringId: exam.courseOfferingId,
            caScore,
            examScore,
            totalScore,
            letterGrade,
            gradePoint,
            status: 'SUBMITTED',
            dataHash,
          },
          update: {
            caScore,
            examScore,
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
    revalidatePath('/dashboard/tertiary/senate');
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
