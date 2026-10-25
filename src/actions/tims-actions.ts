'use server';

import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { CourseRegistrationService } from '@/lib/services/tims/course-registration-service';
import { ExamProcessingService, BlindGradeEntry } from '@/lib/services/tims/exam-processing-service';
import { GradingEngine, AccreditationStandard } from '@/lib/services/tims/grading-engine';

const regService = new CourseRegistrationService();
const examService = new ExamProcessingService();

// ==========================================
// 0. DYNAMIC STUDENT & USER CONTEXT RESOLVER
// ==========================================

export async function getCurrentStudentContextAction(academicSession = '2025/2026', semester = 1) {
  try {
    const session = await auth();
    const userId = session?.user?.id as string | undefined;
    const userRole = ((session?.user as any)?.role || 'STUDENT').toUpperCase();

    const allStudents = await prisma.studentProfile.findMany({
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        program: { include: { department: true, faculty: true } },
        registrations: {
          where: { academicSession, semester },
          include: {
            courses: {
              include: {
                offering: { include: { course: true } },
              },
            },
          },
        },
        academicStandings: {
          orderBy: { createdAt: 'desc' },
        },
        grades: {
          include: { offering: { include: { course: true } } },
        },
      },
      orderBy: { matricNumber: 'asc' },
    });

    let activeStudent = allStudents.find((s) => s.userId === userId) || null;
    if (!activeStudent && allStudents.length > 0) {
      activeStudent = allStudents[0];
    }

    return {
      success: true,
      data: {
        userId,
        userRole,
        isStudentRole: userRole === 'STUDENT',
        activeStudent,
        student: activeStudent,
        allStudents: userRole === 'STUDENT' && activeStudent ? [activeStudent] : allStudents,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ==========================================
// 1. PROGRAMS & COURSES
// ==========================================

export async function getTimsPrograms() {
  try {
    const programs = await prisma.academicProgram.findMany({
      include: {
        department: { include: { faculty: true } },
        faculty: true,
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
  facultyId?: string;
}) {
  try {
    let resolvedFacultyId = data.facultyId && data.facultyId !== 'NONE' ? data.facultyId : null;
    const resolvedDeptId = data.departmentId && data.departmentId !== 'NONE' ? data.departmentId : null;

    if (!resolvedFacultyId && resolvedDeptId) {
      const dept = await prisma.department.findUnique({ where: { id: resolvedDeptId } });
      if (dept?.facultyId) resolvedFacultyId = dept.facultyId;
    }

    const program = await prisma.academicProgram.create({
      data: {
        code: data.code.toUpperCase().trim(),
        name: data.name.trim(),
        gradingStandard: data.gradingStandard,
        totalCreditsRequired: data.totalCreditsRequired || 120,
        departmentId: resolvedDeptId,
        facultyId: resolvedFacultyId,
      },
    });
    revalidatePath('/dashboard/tertiary/programs');
    revalidatePath('/dashboard/departments');
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
        program: { include: { department: true, faculty: true } },
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
// 2. COURSE OFFERINGS, LECTURERS & REGISTRATION
// ==========================================

export async function getTimsOfferings(session?: string, semester?: number) {
  try {
    const where: any = {};
    if (session) where.academicSession = session;
    if (semester) where.semester = semester;

    const offerings = await prisma.courseOffering.findMany({
      where,
      include: {
        course: {
          include: {
            program: {
              include: {
                department: { include: { faculty: true } },
                faculty: true,
              },
            },
          },
        },
        lecturers: {
          include: {
            staff: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
              },
            },
          },
        },
        schedules: {
          include: { venue: true },
        },
        _count: { select: { registeredCourses: true, grades: true } },
      },
      orderBy: { course: { code: 'asc' } },
    });
    return { success: true, data: offerings };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getEligibleLecturersAction() {
  try {
    // Auto-sync any LECTURER / HOD / SLT / ADMIN User who lacks a StaffProfile
    const academicUsers = await prisma.user.findMany({
      where: {
        role: { in: ['LECTURER', 'HOD', 'HeadOfDepartment', 'SLT', 'ADMIN'] },
      },
      include: { staffProfile: true },
    });

    for (const u of academicUsers) {
      if (!u.staffProfile) {
        const staffCode = u.staffId || `STF-${u.id.slice(0, 8).toUpperCase()}`;
        await prisma.staffProfile.upsert({
          where: { userId: u.id },
          create: {
            userId: u.id,
            staffCode,
            departmentId: u.departmentId || null,
          },
          update: {},
        });
      }
    }

    const profiles = await prisma.staffProfile.findMany({
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
        department: true,
      },
      orderBy: { staffCode: 'asc' },
    });

    return { success: true, data: profiles };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function assignLecturerToOfferingAction(data: {
  courseOfferingId: string;
  staffProfileId: string;
  role?: string;
}) {
  try {
    const record = await prisma.courseLecturer.upsert({
      where: {
        courseOfferingId_staffId: {
          courseOfferingId: data.courseOfferingId,
          staffId: data.staffProfileId,
        },
      },
      create: {
        courseOfferingId: data.courseOfferingId,
        staffId: data.staffProfileId,
        role: data.role || 'PRIMARY_LECTURER',
      },
      update: {
        role: data.role || 'PRIMARY_LECTURER',
      },
    });
    revalidatePath('/dashboard/tertiary/offerings');
    revalidatePath('/dashboard/tertiary/lecturer-studio');
    return { success: true, data: record };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function removeLecturerFromOfferingAction(courseLecturerId: string) {
  try {
    await prisma.courseLecturer.delete({ where: { id: courseLecturerId } });
    revalidatePath('/dashboard/tertiary/offerings');
    revalidatePath('/dashboard/tertiary/lecturer-studio');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createTimsOffering(data: {
  courseId: string;
  academicSession: string;
  semester: number;
  maxCapacity: number;
  lecturerStaffProfileId?: string;
}) {
  try {
    const offering = await prisma.courseOffering.create({
      data: {
        courseId: data.courseId,
        academicSession: data.academicSession,
        semester: data.semester,
        maxCapacity: data.maxCapacity,
        lecturers: data.lecturerStaffProfileId && data.lecturerStaffProfileId !== 'NONE'
          ? {
              create: {
                staffId: data.lecturerStaffProfileId,
                role: 'PRIMARY_LECTURER',
              },
            }
          : undefined,
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
    revalidatePath('/dashboard/tertiary/student-hub');
    revalidatePath('/dashboard/tertiary/cbt');
    revalidatePath('/dashboard/tertiary/docket');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getSemesterRegistrationsForApprovalAction(academicSession: string, semester: number) {
  try {
    const registrations = await prisma.semesterRegistration.findMany({
      where: { academicSession, semester },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
            program: true,
          },
        },
        advisor: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        courses: {
          include: {
            offering: { include: { course: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return { success: true, data: registrations };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function approveStudentRegistrationAction(registrationId: string, advisorStaffProfileId?: string) {
  try {
    const session = await auth();
    const fallbackUserId = advisorStaffProfileId || (session?.user?.id as string | undefined);
    const result = await regService.approveRegistration(registrationId, fallbackUserId);
    revalidatePath('/dashboard/tertiary/registration');
    revalidatePath('/dashboard/tertiary/docket');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ==========================================
// 3. BLIND EXAM GRADING & SENATE GOVERNANCE
// ==========================================

export async function getOfferingCandidateTokensAction(offeringId: string) {
  try {
    // 1. Ensure every registered student in this offering has an ExamCandidateToken
    const regCourses = await prisma.studentRegisteredCourse.findMany({
      where: { offeringId },
      include: {
        registration: {
          include: { student: true },
        },
      },
    });

    for (const rc of regCourses) {
      const student = rc.registration.student;
      if (!student) continue;
      const randomSalt = crypto.randomBytes(3).toString('hex').toUpperCase();
      await prisma.examCandidateToken.upsert({
        where: {
          studentId_offeringId: {
            studentId: student.id,
            offeringId,
          },
        },
        create: {
          studentId: student.id,
          offeringId,
          anonymousToken: `CIN-${student.currentLevel}-${randomSalt}`,
        },
        update: {},
      });
    }

    // 2. Fetch all candidate tokens and existing grades for this offering
    const [tokens, grades]: [any[], any[]] = await Promise.all([
      prisma.examCandidateToken.findMany({
        where: { offeringId },
        orderBy: { anonymousToken: 'asc' },
      }),
      prisma.studentGrade.findMany({
        where: { offeringId },
      }),
    ]);

    const gradeByStudent = new Map(grades.map((g: any) => [g.studentId, g]));

    const rows = tokens.map((t: any) => {
      const g = gradeByStudent.get(t.studentId);
      return {
        anonymousToken: t.anonymousToken,
        caScore: g ? String(Number(g.caScore)) : '0',
        examScore: g ? String(Number(g.examScore)) : '0',
        secondGraderScore: g?.secondGraderExamScore != null ? String(Number(g.secondGraderExamScore)) : '',
        status: g?.status || 'DRAFT',
        letterGrade: g?.letterGrade || null,
        totalScore: g ? Number(g.totalScore) : null,
        dataHash: g?.dataHash || '',
      };
    });

    return { success: true, data: rows };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function submitBlindGradesAction(offeringId: string, entries: BlindGradeEntry[], graderUserId?: string) {
  try {
    const session = await auth();
    const resolvedUserId = (session?.user?.id as string) || graderUserId || 'authorizer-id';
    const result = await examService.submitBlindGrades(offeringId, entries, resolvedUserId);
    revalidatePath('/dashboard/tertiary/exams');
    revalidatePath('/dashboard/tertiary/senate');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function advanceExamStageAction(
  offeringId: string,
  targetStage: 'HOD_APPROVED' | 'DEAN_APPROVED' | 'SENATE_RATIFIED' | 'PUBLISHED',
  authorizerUserId?: string,
  passwordVerify?: string
) {
  try {
    const session = await auth();
    const resolvedUserId = (session?.user?.id as string) || authorizerUserId || 'authorizer-id';
    const result = await examService.advanceApprovalStage(offeringId, targetStage, resolvedUserId, passwordVerify || '');
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

export async function enrollTertiaryStudentAction(data: {
  firstName: string;
  lastName: string;
  email: string;
  matricNumber: string;
  programId: string;
  currentLevel?: number;
  password?: string;
  guardianName?: string;
  guardianEmail?: string;
  guardianPhone?: string;
  guardianRelationship?: string;
}) {
  try {
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(data.password || 'student123', 10);

    const result = await prisma.$transaction(async (tx) => {
      let guardianUserId: string | null = null;

      // Handle optional Parent / Sponsor provisioning & linking
      if (data.guardianEmail) {
        const cleanGuardianEmail = data.guardianEmail.trim().toLowerCase();
        let parentUser = await tx.user.findUnique({
          where: { email: cleanGuardianEmail },
        });

        if (!parentUser) {
          const parentHash = await bcrypt.hash('Parent@123', 10);
          const nameParts = (data.guardianName || 'Parent Guardian').trim().split(' ');
          parentUser = await tx.user.create({
            data: {
              firstName: nameParts[0] || 'Parent',
              lastName: nameParts.slice(1).join(' ') || 'Guardian',
              email: cleanGuardianEmail,
              phone: data.guardianPhone || '+234 800 000 0000',
              passwordHash: parentHash,
              role: 'PARENT',
              status: 'active',
              requiresPasswordChange: false,
            },
          });
        }
        guardianUserId = parentUser.id;
      }

      const user = await tx.user.create({
        data: {
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          email: data.email.trim().toLowerCase(),
          passwordHash: hashedPassword,
          role: 'STUDENT',
        },
      });

      const profile = await tx.studentProfile.create({
        data: {
          userId: user.id,
          matricNumber: data.matricNumber.trim().toUpperCase(),
          programId: data.programId,
          currentLevel: data.currentLevel || 100,
          guardianUserId: guardianUserId,
          guardianName: data.guardianName?.trim() || null,
          guardianEmail: data.guardianEmail?.trim().toLowerCase() || null,
          guardianPhone: data.guardianPhone?.trim() || null,
          guardianRelationship: data.guardianRelationship?.trim() || 'Parent / Sponsor',
        },
      });

      return { user, profile };
    });

    revalidatePath('/dashboard/students');
    revalidatePath('/dashboard/tertiary/registration');
    revalidatePath('/dashboard');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}



// ==========================================
// 12. BULK ENROLL / MIGRATE TERTIARY UNDERGRADUATES
// ==========================================

export async function bulkEnrollTertiaryStudentsAction(studentsList: any[]): Promise<{
  success: boolean;
  error?: string;
  importedCount?: number;
  errorCount?: number;
  invalidRecords?: any[];
  data?: any;
}> {
  try {
    if (!Array.isArray(studentsList) || studentsList.length === 0) {
      return { success: false, error: 'No undergraduate records provided for migration.' };
    }

    const bcrypt = await import('bcryptjs');
    const defaultStudentHash = await bcrypt.hash('student123', 10);
    const defaultParentHash = await bcrypt.hash('Parent@123', 10);

    // Pre-cache all programs for fast code & name resolution
    const allPrograms = await prisma.academicProgram.findMany({
      include: { department: true, faculty: true },
    });
    const programMap = new Map<string, string>();
    for (const prog of allPrograms) {
      programMap.set(prog.id.toLowerCase().trim(), prog.id);
      programMap.set(prog.code.toLowerCase().trim(), prog.id);
      programMap.set(prog.name.toLowerCase().trim(), prog.id);
    }

    let importedCount = 0;
    const invalidRecords: any[] = [];

    for (const item of studentsList) {
      try {
        const firstName = item.firstName?.toString().trim();
        const lastName = item.lastName?.toString().trim();
        const matricNumber = (item.matricNumber || item.matric || item.registrationNumber)?.toString().trim().toUpperCase();
        let email = item.email?.toString().trim().toLowerCase();

        if (!firstName || !lastName || !matricNumber) {
          invalidRecords.push({
            matricNumber: matricNumber || 'N/A',
            name: `${firstName || ''} ${lastName || ''}`.trim() || 'N/A',
            error: 'Missing required first name, last name, or matriculation number',
          });
          continue;
        }

        // Auto-generate institutional email if missing
        if (!email) {
          const sanitizedMatric = matricNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          email = `${sanitizedMatric}@university.edu.ng`;
        }

        // Resolve Academic Program
        const targetProgram = (item.program || item.programCode || item.programId || item.department || 'CSC').toString().toLowerCase().trim();
        let resolvedProgramId = programMap.get(targetProgram) || null;
        if (!resolvedProgramId) {
          for (const [key, id] of programMap.entries()) {
            if (targetProgram.includes(key) || key.includes(targetProgram)) {
              resolvedProgramId = id;
              break;
            }
          }
        }
        if (!resolvedProgramId && allPrograms.length > 0) {
          resolvedProgramId = allPrograms[0].id;
        }
        if (!resolvedProgramId) {
          invalidRecords.push({
            matricNumber,
            name: `${firstName} ${lastName}`,
            error: `Could not match degree program "${targetProgram}". Ensure programs are defined in TIMS.`,
          });
          continue;
        }

        const currentLevel = parseInt(item.level || item.currentLevel || '100', 10) || 100;
        const guardianName = (item.guardianName || item.sponsorName || item.parentName)?.toString().trim() || null;
        const guardianEmail = (item.guardianEmail || item.sponsorEmail || item.parentEmail)?.toString().trim().toLowerCase() || null;
        const guardianPhone = (item.guardianPhone || item.sponsorPhone || item.parentPhone)?.toString().trim() || null;
        const guardianRelationship = (item.guardianRelationship || item.relationship || 'Parent / Sponsor').toString().trim();

        // Database write inside isolated transaction
        await prisma.$transaction(async (tx) => {
          // Check for existing student profile with this matric number
          const existingProfile = await tx.studentProfile.findUnique({
            where: { matricNumber },
          });
          if (existingProfile) {
            throw new Error(`Matriculation number ${matricNumber} already exists in the institution.`);
          }

          // Provision or resolve guardian user account if email supplied
          let guardianUserId: string | null = null;
          if (guardianEmail) {
            let parentUser = await tx.user.findUnique({ where: { email: guardianEmail } });
            if (!parentUser) {
              const nameParts = (guardianName || 'Parent Guardian').split(' ');
              parentUser = await tx.user.create({
                data: {
                  firstName: nameParts[0] || 'Parent',
                  lastName: nameParts.slice(1).join(' ') || 'Guardian',
                  email: guardianEmail,
                  phone: guardianPhone || '+234 800 000 0000',
                  passwordHash: defaultParentHash,
                  role: 'PARENT',
                  status: 'active',
                  requiresPasswordChange: false,
                },
              });
            }
            guardianUserId = parentUser.id;
          }

          // Provision user account (or link if email already exists)
          let studentUser = await tx.user.findUnique({ where: { email } });
          if (!studentUser) {
            studentUser = await tx.user.create({
              data: {
                firstName,
                lastName,
                email,
                phone: item.phone?.toString().trim() || null,
                passwordHash: defaultStudentHash,
                role: 'STUDENT',
                status: 'active',
                requiresPasswordChange: true,
              },
            });
          }

          // Create StudentProfile
          await tx.studentProfile.create({
            data: {
              userId: studentUser.id,
              matricNumber,
              programId: resolvedProgramId,
              currentLevel,
              guardianUserId,
              guardianName,
              guardianEmail,
              guardianPhone,
              guardianRelationship,
            },
          });
        });

        importedCount++;
      } catch (err: any) {
        invalidRecords.push({
          matricNumber: item.matricNumber || item.matric || 'N/A',
          name: `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'N/A',
          error: err.message || 'Error creating undergraduate student record',
        });
      }
    }

    revalidatePath('/dashboard/students');
    revalidatePath('/dashboard/tertiary/student-hub');
    revalidatePath('/dashboard/tertiary/registration');

    return {
      success: true,
      importedCount,
      errorCount: invalidRecords.length,
      invalidRecords,
    };
  } catch (error: any) {
    console.error('Error in bulkEnrollTertiaryStudentsAction:', error);
    return { success: false, error: error.message || 'Failed to complete bulk enrollment.' };
  }
}
