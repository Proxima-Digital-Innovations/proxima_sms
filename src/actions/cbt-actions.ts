'use server';

import { getActiveInstitutionalModules } from '@/lib/modules/module-registry';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

const OFFERING_HIERARCHY_INCLUDE = {
  course: {
    include: {
      program: {
        include: {
          department: true,
          faculty: true,
        },
      },
    },
  },
  lecturers: {
    include: {
      staff: { include: { user: true } },
    },
  },
};

export async function getCbtExams(courseOfferingId?: string) {
  try {
    const session = await auth();
    let where: any = courseOfferingId ? { courseOfferingId } : {};

    const activeModules = await getActiveInstitutionalModules();
    const hasTertiary = activeModules.includes('TERTIARY_INSTITUTION');

    // If Tertiary Institution module is disabled:
    // Strictly exclude any tertiary university course exams (courseOfferingId != null)
    if (!hasTertiary) {
      where = {
        ...where,
        courseOfferingId: null,
      };
    }

    // If the user is a STUDENT, strictly filter CBT exams to ONLY the courses they registered for
    if (session?.user?.id && (session.user as any).role === 'STUDENT' && !courseOfferingId) {
      if (hasTertiary) {
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
        if (registeredOfferingIds.length > 0) {
          where = {
            OR: [
              { courseOfferingId: { in: registeredOfferingIds } },
              { courseOfferingId: null },
            ],
            isPublished: true,
          };
        } else {
          where = {
            courseOfferingId: null,
            isPublished: true,
          };
        }
      } else {
        // Non-tertiary (Primary, JSS, SSS): show all published school CBT tests/exams
        where = {
          courseOfferingId: null,
          isPublished: true,
        };
      }
    }

    const [exams, offerings] = await Promise.all([
      prisma.cbtExam.findMany({
        where,
        include: {
          courseOffering: {
            include: OFFERING_HIERARCHY_INCLUDE,
          },
          _count: { select: { questions: true, submissions: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      hasTertiary
        ? prisma.courseOffering.findMany({
            include: OFFERING_HIERARCHY_INCLUDE,
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),
    ]);

    return {
      success: true,
      data: exams.map((e) => {
        const course = e.courseOffering?.course;
        const program = course?.program;
        return {
          ...e,
          courseCode: course?.code || (e.courseOfferingId ? 'TERTIARY' : 'K-12 CBT'),
          courseTitle: course?.title || 'Institutional CBT Assessment',
          departmentName: program?.department?.name || '',
          facultyName: program?.faculty?.name || '',
          programName: program?.name || 'B.Sc. Degree Program',
        };
      }),
      offerings: offerings.map((o) => {
        const program = o.course?.program;
        return {
          id: o.id,
          code: o.course.code,
          title: o.course.title,
          session: o.academicSession,
          semester: o.semester,
          departmentName: program?.department?.name || (o.course.code.startsWith('MTH') ? 'Mathematics' : o.course.code.startsWith('GST') ? 'General Studies' : 'Computer Science'),
          facultyName: program?.faculty?.name || (o.course.code.startsWith('GST') ? 'Directorate of General Studies' : 'Faculty of Computing & Sciences'),
        };
      }),
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
        courseOffering: { include: OFFERING_HIERARCHY_INCLUDE },
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
        courseOffering: { include: OFFERING_HIERARCHY_INCLUDE },
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

    const course = exam.courseOffering?.course;
    const program = course?.program;

    return {
      success: true,
      data: {
        ...exam,
        courseCode: course?.code || 'GENERAL',
        departmentName: program?.department?.name || 'Computer Science',
        facultyName: program?.faculty?.name || 'Faculty of Computing & Sciences',
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

function qOptionsFallback(options: { id: string; text: string }[]) {
  return options.map((o) => ({ id: o.id.toUpperCase(), text: o.text.trim() }));
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
        optionsJson: JSON.stringify(qOptionsFallback(data.options)),
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

export async function bulkAddCbtQuestionsAction(data: {
  examId: string;
  questions: {
    questionText: string;
    options: { id: string; text: string }[];
    correctOption: string;
    points: number;
  }[];
}) {
  try {
    if (!data.examId || !Array.isArray(data.questions) || data.questions.length === 0) {
      return { success: false, error: 'Exam ID and at least one valid question are required.' };
    }

    const existingCount = await prisma.cbtQuestion.count({ where: { examId: data.examId } });

    const created = await prisma.$transaction(
      data.questions.map((q, idx) =>
        prisma.cbtQuestion.create({
          data: {
            examId: data.examId,
            questionText: q.questionText.trim(),
            questionType: 'MULTIPLE_CHOICE',
            optionsJson: JSON.stringify(qOptionsFallback(q.options)),
            correctOption: (q.correctOption || 'A').trim().toUpperCase(),
            points: Number(q.points) || 10,
            orderIndex: existingCount + idx + 1,
          },
        })
      )
    );

    revalidatePath('/dashboard/tertiary/cbt');
    return {
      success: true,
      importedCount: created.length,
      message: `Successfully imported ${created.length} questions into the CBT Question Bank.`,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Master Multi-Faculty / Multi-Department / Multi-Course Question Bank Bulk Importer:
 * Routes questions from a single CSV/Excel upload to their respective Faculty -> Department -> Course -> CBT Exam!
 */
export async function bulkImportMultiCourseQuestionBankAction(data: {
  questions: {
    faculty?: string;
    department?: string;
    courseCode?: string;
    category?: 'CA' | 'EXAM';
    questionText: string;
    options: { id: string; text: string }[];
    correctOption: string;
    points: number;
  }[];
}) {
  try {
    if (!Array.isArray(data.questions) || data.questions.length === 0) {
      return { success: false, error: 'No valid questions found to import.' };
    }

    // Group questions by CourseCode + Category (e.g., "CSC301::CA", "MTH101::EXAM")
    const groups = new Map<
      string,
      {
        faculty: string;
        department: string;
        courseCode: string;
        category: 'CA' | 'EXAM';
        items: typeof data.questions;
      }
    >();

    for (const q of data.questions) {
      const code = (q.courseCode || 'CSC201').trim().toUpperCase().replace(/\s+/g, '');
      const cat = (q.category || 'CA').toUpperCase() === 'EXAM' ? 'EXAM' : 'CA';
      const key = `${code}::${cat}`;
      if (!groups.has(key)) {
        groups.set(key, {
          faculty: (q.faculty || 'Faculty of Computing').trim(),
          department: (q.department || 'Computer Science').trim(),
          courseCode: code,
          category: cat,
          items: [],
        });
      }
      groups.get(key)!.items.push(q);
    }

    let totalImported = 0;
    const summary: string[] = [];

    for (const [, grp] of groups) {
      // 1. Find or create Course & CourseOffering
      let course = await prisma.course.findUnique({
        where: { code: grp.courseCode },
      });

      if (!course) {
        // Resolve or create Department & Program for this course
        let dept = await prisma.department.findFirst({
          where: { name: { contains: grp.department } },
        });
        if (!dept) {
          dept = await prisma.department.create({
            data: { name: grp.department },
          });
        }

        let program = await prisma.academicProgram.findFirst({
          where: { departmentId: dept.id },
        });
        if (!program) {
          const progCode = `BSC-${grp.courseCode.slice(0, 3)}`;
          program = await prisma.academicProgram.upsert({
            where: { code: progCode },
            update: {},
            create: {
              code: progCode,
              name: `B.Sc. ${grp.department}`,
              departmentId: dept.id,
            },
          });
        }

        const parsedLevel = parseInt(grp.courseCode.replace(/[^0-9]/g, '').charAt(0) + '00') || 100;
        course = await prisma.course.create({
          data: {
            code: grp.courseCode,
            title: `${grp.department} (${grp.courseCode})`,
            creditUnits: 3,
            level: parsedLevel,
            semester: 1,
            programId: program.id,
          },
        });
      }

      let offering = await prisma.courseOffering.findFirst({
        where: { courseId: course.id },
        orderBy: { createdAt: 'desc' },
      });

      if (!offering) {
        offering = await prisma.courseOffering.create({
          data: {
            courseId: course.id,
            academicSession: '2025/2026',
            semester: 1,
            isRegistrationOpen: true,
          },
        });
      }

      // 2. Find or create CBT Exam for this CourseOffering + Category
      let exam = await prisma.cbtExam.findFirst({
        where: {
          courseOfferingId: offering.id,
          targetCategory: grp.category,
        },
      });

      if (!exam) {
        exam = await prisma.cbtExam.create({
          data: {
            courseOfferingId: offering.id,
            title: `${grp.courseCode} ${grp.category === 'EXAM' ? 'Semester Examination' : 'Continuous Assessment Test'} (${grp.department})`,
            description: `${grp.faculty} • Department of ${grp.department} — Proctored CBT ${grp.category} Assessment.`,
            durationMinutes: grp.category === 'EXAM' ? 60 : 30,
            totalMarks: grp.category === 'EXAM' ? 60 : 40,
            targetCategory: grp.category,
            antiCheatLevel: 'STRICT',
            maxTabSwitches: 3,
            isPublished: true,
          },
        });
      }

      const existingQCount = await prisma.cbtQuestion.count({ where: { examId: exam.id } });

      await prisma.$transaction(
        grp.items.map((q, idx) =>
          prisma.cbtQuestion.create({
            data: {
              examId: exam!.id,
              questionText: q.questionText.trim(),
              questionType: 'MULTIPLE_CHOICE',
              optionsJson: JSON.stringify(qOptionsFallback(q.options)),
              correctOption: (q.correctOption || 'A').trim().toUpperCase(),
              points: Number(q.points) || 10,
              orderIndex: existingQCount + idx + 1,
            },
          })
        )
      );

      totalImported += grp.items.length;
      summary.push(`${grp.courseCode} (${grp.department} - ${grp.category}): ${grp.items.length} Qs`);
    }

    revalidatePath('/dashboard/tertiary/cbt');
    return {
      success: true,
      importedCount: totalImported,
      message: `Routed ${totalImported} questions across ${groups.size} course(s): ${summary.join(' | ')}`,
    };
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
