'use server';

import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { CourseRegistrationService } from '@/lib/services/tims/course-registration-service';
import { ExamProcessingService, BlindGradeEntry } from '@/lib/services/tims/exam-processing-service';
import { GradingEngine, AccreditationStandard } from '@/lib/services/tims/grading-engine';

const regService = new CourseRegistrationService();
const examService = new ExamProcessingService();

// ==========================================
// 1. PROGRAMS & COURSES
// ==========================================

export async function getTimsPrograms() {
  try {
    const programs = await prisma.academicProgram.findMany({
      include: {
        department: true,
        _count: { select: { students: true, courses: true } },
      },
      orderBy: { code: 'asc' },
    });
    return { success: true, data: programs };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createTimsProgram(data: {
  code: string;
  name: string;
  gradingStandard: AccreditationStandard;
  totalCreditsRequired?: number;
  departmentId?: string;
}) {
  try {
    const program = await prisma.academicProgram.create({
      data: {
        code: data.code.toUpperCase(),
        name: data.name,
        gradingStandard: data.gradingStandard,
        totalCreditsRequired: data.totalCreditsRequired || 120,
        departmentId: data.departmentId || null,
      },
    });
    revalidatePath('/dashboard/tertiary/programs');
    return { success: true, data: program };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getTimsCourses(programId?: string) {
  try {
    const where = programId ? { programId } : {};
    const courses = await prisma.course.findMany({
      where,
      include: {
        program: true,
        prerequisites: { include: { prerequisite: true } },
        _count: { select: { offerings: true } },
      },
      orderBy: { code: 'asc' },
    });
    return { success: true, data: courses };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createTimsCourse(data: {
  code: string;
  title: string;
  creditUnits: number;
  level: number;
  semester: number;
  programId?: string;
  prerequisiteCourseIds?: string[];
}) {
  try {
    const course = await prisma.course.create({
      data: {
        code: data.code.toUpperCase().replace(/\s+/g, ''),
        title: data.title,
        creditUnits: data.creditUnits,
        level: data.level,
        semester: data.semester,
        programId: data.programId || null,
        prerequisites: data.prerequisiteCourseIds && data.prerequisiteCourseIds.length > 0
          ? {
              create: data.prerequisiteCourseIds.map((prereqId) => ({
                prerequisiteId: prereqId,
                minGradeRequired: 'D',
              })),
            }
          : undefined,
      },
    });
    revalidatePath('/dashboard/tertiary/courses');
    return { success: true, data: course };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ==========================================
// 2. COURSE OFFERINGS & REGISTRATION
// ==========================================

export async function getTimsOfferings(session?: string, semester?: number) {
  try {
    const where: any = {};
    if (session) where.academicSession = session;
    if (semester) where.semester = semester;

    const offerings = await prisma.courseOffering.findMany({
      where,
      include: {
        course: { include: { program: true } },
        _count: { select: { registeredCourses: true, grades: true } },
      },
      orderBy: { course: { code: 'asc' } },
    });
    return { success: true, data: offerings };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createTimsOffering(data: {
  courseId: string;
  academicSession: string;
  semester: number;
  maxCapacity: number;
}) {
  try {
    const offering = await prisma.courseOffering.create({
      data: {
        courseId: data.courseId,
        academicSession: data.academicSession,
        semester: data.semester,
        maxCapacity: data.maxCapacity,
      },
    });
    revalidatePath('/dashboard/tertiary/offerings');
    return { success: true, data: offering };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function registerStudentCoursesAction(data: {
  studentProfileId: string;
  academicSession: string;
  semester: number;
  offeringIds: string[];
  isDeanApprovedOverload?: boolean;
}) {
  try {
    const result = await regService.registerCourses(data);
    revalidatePath('/dashboard/tertiary/registration');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function approveStudentRegistrationAction(registrationId: string, advisorStaffProfileId: string) {
  try {
    const result = await regService.approveRegistration(registrationId, advisorStaffProfileId);
    revalidatePath('/dashboard/tertiary/registration');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ==========================================
// 3. BLIND EXAM GRADING & SENATE GOVERNANCE
// ==========================================

export async function submitBlindGradesAction(offeringId: string, entries: BlindGradeEntry[], graderUserId: string) {
  try {
    const result = await examService.submitBlindGrades(offeringId, entries, graderUserId);
    revalidatePath('/dashboard/tertiary/exams');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function advanceExamStageAction(
  offeringId: string,
  targetStage: 'HOD_APPROVED' | 'DEAN_APPROVED' | 'SENATE_RATIFIED' | 'PUBLISHED',
  authorizerUserId: string,
  passwordVerify: string
) {
  try {
    const result = await examService.advanceApprovalStage(offeringId, targetStage, authorizerUserId, passwordVerify);
    revalidatePath('/dashboard/tertiary/exams');
    revalidatePath('/dashboard/tertiary/senate');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function modifyRatifiedGradeAction(data: {
  gradeId: string;
  newScore: number;
  reason: string;
  senateApprovalRef: string;
  changedById: string;
  authorizerPasswordVerify: string;
}) {
  try {
    const result = await examService.modifyRatifiedGrade(data);
    revalidatePath('/dashboard/tertiary/senate');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getSenateBroadsheetData(academicSession: string, semester: number, programId?: string) {
  try {
    const where: any = { academicSession, semester };
    if (programId) {
      where.student = { programId };
    }

    const standings = await prisma.studentAcademicStanding.findMany({
      where,
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
            program: true,
            grades: {
              where: { offering: { academicSession, semester } },
              include: { offering: { include: { course: true } } },
            },
          },
        },
      },
      orderBy: { cgpa: 'desc' },
    });

    return { success: true, data: standings };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function toggleBursaryClearanceAction(registrationId: string, reference?: string) {
  try {
    const reg = await prisma.semesterRegistration.findUnique({
      where: { id: registrationId },
    });
    if (!reg) throw new Error('Registration not found.');

    const newStatus = !reg.isBursaryCleared;
    const updated = await prisma.semesterRegistration.update({
      where: { id: registrationId },
      data: {
        isBursaryCleared: newStatus,
        bursaryClearedAt: newStatus ? new Date() : null,
        bursaryReference: newStatus ? (reference || `BURS-${Date.now().toString().slice(-6)}`) : null,
      },
    });

    revalidatePath('/dashboard/tertiary/registration');
    revalidatePath('/dashboard/tertiary/docket');
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function sealSenateBatchAction(data: {
  academicSession: string;
  semester: number;
  sealedByUserId: string;
}) {
  try {
    const grades = await prisma.studentGrade.findMany({
      where: {
        offering: {
          academicSession: data.academicSession,
          semester: data.semester,
        },
      },
      orderBy: { id: 'asc' },
    });

    if (grades.length === 0) {
      throw new Error('No grades found to seal for this session and semester.');
    }

    // 1. Generate Merkle Tree Leaves
    let currentLevelHashes = grades.map((g) =>
      crypto
        .createHash('sha256')
        .update(`${g.id}:${g.studentId}:${g.totalScore}:${g.letterGrade}:${g.dataHash}`)
        .digest('hex')
    );

    // 2. Compute Merkle Root iteratively
    while (currentLevelHashes.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < currentLevelHashes.length; i += 2) {
        const left = currentLevelHashes[i];
        const right = i + 1 < currentLevelHashes.length ? currentLevelHashes[i + 1] : left;
        const parent = crypto
          .createHash('sha256')
          .update(left + right)
          .digest('hex');
        nextLevel.push(parent);
      }
      currentLevelHashes = nextLevel;
    }

    const merkleRootHash = currentLevelHashes[0] || 'GENESIS_MERKLE_ROOT';
    const batchReference = `SEN/SEAL/${data.academicSession.replace('/', '')}/S${data.semester}`;

    const seal = await prisma.senateBatchSeal.upsert({
      where: { batchReference },
      create: {
        academicSession: data.academicSession,
        semester: data.semester,
        batchReference,
        merkleRootHash,
        totalRecords: grades.length,
        sealedById: data.sealedByUserId,
        isImmutable: true,
      },
      update: {
        merkleRootHash,
        totalRecords: grades.length,
        sealedAt: new Date(),
      },
    });

    revalidatePath('/dashboard/tertiary/senate');
    return { success: true, data: seal };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
