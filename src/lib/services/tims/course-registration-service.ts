import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export interface RegisterCoursesInput {
  studentProfileId: string;
  academicSession: string;
  semester: number;
  offeringIds: string[];
  isDeanApprovedOverload?: boolean;
}

export class CourseRegistrationService {
  private MIN_CREDITS = 15;
  private MAX_CREDITS = 24;

  /**
   * Evaluates if a student has met all prerequisites for a given course offering.
   */
  async validatePrerequisites(studentProfileId: string, courseId: string): Promise<{ valid: boolean; missing: string[] }> {
    const prerequisites = await prisma.coursePrerequisite.findMany({
      where: { courseId },
      include: { prerequisite: true },
    });

    if (prerequisites.length === 0) {
      return { valid: true, missing: [] };
    }

    const passedGrades = await prisma.studentGrade.findMany({
      where: {
        studentId: studentProfileId,
        letterGrade: { not: 'F' },
      },
      include: {
        offering: { select: { courseId: true } },
      },
    });

    const passedCourseIds = new Set(passedGrades.map((g) => g.offering.courseId));
    const missing: string[] = [];

    for (const prereq of prerequisites) {
      if (!passedCourseIds.has(prereq.prerequisiteId)) {
        missing.push(`${prereq.prerequisite.code} - ${prereq.prerequisite.title}`);
      }
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Concurrently register course offerings for a student with row-level locks and strict bounds.
   */
  async registerCourses(input: RegisterCoursesInput) {
    const { studentProfileId, academicSession, semester, offeringIds, isDeanApprovedOverload } = input;

    if (!offeringIds || offeringIds.length === 0) {
      throw new Error('You must select at least one course offering.');
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Fetch Student and Program
      const student = await tx.studentProfile.findUnique({
        where: { id: studentProfileId },
        include: { program: true },
      });
      if (!student) throw new Error('Student profile not found.');

      // 2. Fetch Selected Offerings with Courses
      const offerings = await tx.courseOffering.findMany({
        where: { id: { in: offeringIds } },
        include: { course: true },
      });

      if (offerings.length !== offeringIds.length) {
        throw new Error('One or more selected course offerings are invalid.');
      }

      // 3. Calculate Total Credit Units
      const totalCredits = offerings.reduce((acc, curr) => acc + curr.course.creditUnits, 0);

      if (totalCredits < this.MIN_CREDITS) {
        throw new Error(
          `Minimum required semester credit load is ${this.MIN_CREDITS} units. Selected: ${totalCredits} units.`
        );
      }

      if (totalCredits > this.MAX_CREDITS && !isDeanApprovedOverload) {
        throw new Error(
          `Credit overload detected (${totalCredits} units). Maximum permitted is ${this.MAX_CREDITS} units without Dean approval.`
        );
      }

      // 4. Validate Prerequisites for Each Course
      for (const off of offerings) {
        const prereqCheck = await this.validatePrerequisites(studentProfileId, off.courseId);
        if (!prereqCheck.valid) {
          throw new Error(
            `Prerequisite requirement unmet for ${off.course.code}: Must pass [${prereqCheck.missing.join(', ')}] first.`
          );
        }
      }

      // 5. Concurrency Check & Row Lock for Seat Reservation
      // We run SELECT ... FOR UPDATE on MySQL CourseOffering rows to prevent race conditions during rush hours
      for (const off of offerings) {
        const rows: any[] = await tx.$queryRawUnsafe(
          'SELECT id, enrolledCount, maxCapacity, isRegistrationOpen FROM CourseOffering WHERE id = ? FOR UPDATE',
          off.id
        );

        const currentOffering = rows[0];
        if (!currentOffering) {
          throw new Error(`Offering ${off.id} no longer available.`);
        }

        if (!currentOffering.isRegistrationOpen) {
          throw new Error(`Registration for ${off.course.code} is closed.`);
        }

        if (currentOffering.enrolledCount >= currentOffering.maxCapacity) {
          throw new Error(
            `Course capacity exhausted for ${off.course.code} (${currentOffering.enrolledCount}/${currentOffering.maxCapacity} seats taken).`
          );
        }
      }

      // 6. Upsert SemesterRegistration Header
      const registration = await tx.semesterRegistration.upsert({
        where: {
          studentId_academicSession_semester: {
            studentId: studentProfileId,
            academicSession,
            semester,
          },
        },
        create: {
          studentId: studentProfileId,
          academicSession,
          semester,
          status: 'SUBMITTED',
          totalCredits,
          isDeanApprovedOverload: !!isDeanApprovedOverload,
        },
        update: {
          status: 'SUBMITTED',
          totalCredits,
          isDeanApprovedOverload: !!isDeanApprovedOverload,
          rejectionReason: null,
        },
      });

      // 7. Remove previous registrations for this semester if any
      await tx.studentRegisteredCourse.deleteMany({
        where: { registrationId: registration.id },
      });

      // 8. Create Registered Course Entries and Generate Anonymous Candidate Tokens
      for (const off of offerings) {
        const barcode = `DKT-${academicSession.replace('/', '')}-S${semester}-${student.matricNumber.slice(-4)}-${off.course.code}`;

        await tx.studentRegisteredCourse.create({
          data: {
            registrationId: registration.id,
            offeringId: off.id,
            creditUnits: off.course.creditUnits,
            isClearedForExam: false,
            examDocketBarcode: barcode,
          },
        });

        // Ensure Collision-resistant Anonymous Candidate Token exists for blind grading
        const randomSalt = crypto.randomBytes(3).toString('hex').toUpperCase();
        const anonymousToken = `CIN-${student.currentLevel}-${randomSalt}`;

        await tx.examCandidateToken.upsert({
          where: {
            studentId_offeringId: {
              studentId: studentProfileId,
              offeringId: off.id,
            },
          },
          create: {
            studentId: studentProfileId,
            offeringId: off.id,
            anonymousToken,
          },
          update: {},
        });

        // Increment enrolled seat count safely within transaction lock
        await tx.courseOffering.update({
          where: { id: off.id },
          data: { enrolledCount: { increment: 1 } },
        });
      }

      return {
        success: true,
        registrationId: registration.id,
        totalCredits,
        status: registration.status,
        enrolledCount: offerings.length,
      };
    });
  }

  /**
   * Advisor Approval State Transition
   */
  async approveRegistration(registrationId: string, advisorStaffProfileId: string) {
    const reg = await prisma.semesterRegistration.findUnique({
      where: { id: registrationId },
    });

    if (!reg) throw new Error('Registration record not found.');
    if (reg.status === 'LOCKED') throw new Error('Registration is locked and cannot be modified.');

    return await prisma.semesterRegistration.update({
      where: { id: registrationId },
      data: {
        status: 'ADVISOR_APPROVED',
        advisorId: advisorStaffProfileId,
        rejectionReason: null,
      },
    });
  }

  /**
   * Lock Registration at Add/Drop Deadline
   */
  async lockRegistration(registrationId: string) {
    return await prisma.semesterRegistration.update({
      where: { id: registrationId },
      data: { status: 'LOCKED' },
    });
  }
}
