import { prisma } from '@/lib/prisma';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { GradingEngine } from './grading-engine';

export interface ExamDocketData {
  student: {
    id: string;
    matricNumber: string;
    fullName: string;
    programName: string;
    currentLevel: number;
    avatarUrl?: string | null;
  };
  registration: {
    id: string;
    academicSession: string;
    semester: number;
    status: string;
    totalCredits: number;
    advisorName?: string;
    isBursaryCleared: boolean;
    bursaryReference?: string | null;
  };
  courses: {
    code: string;
    title: string;
    creditUnits: number;
    isCleared: boolean;
    barcode: string;
  }[];
  verification: {
    qrCodeDataUrl: string;
    verificationToken: string;
    hmacSignature: string;
    issuedAt: string;
  };
}

export class DocketService {
  private SECRET = process.env.NEXTAUTH_SECRET || 'proxima-tims-docket-secure-salt-2026';

  /**
   * Generates a tamper-proof verification signature.
   */
  private generateHMAC(payload: string): string {
    return crypto.createHmac('sha256', this.SECRET).update(payload).digest('hex').substring(0, 32);
  }

  /**
   * Generates a fully populated and verified digital examination docket.
   */
  async generateExamDocket(studentProfileId: string, academicSession: string, semester: number): Promise<ExamDocketData> {
    const student = await prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      include: {
        user: true,
        program: true,
      },
    });

    if (!student) {
      throw new Error('Student profile not found.');
    }

    // 1. Fetch Semester Registration & Registered Courses
    const registration = await prisma.semesterRegistration.findUnique({
      where: {
        studentId_academicSession_semester: {
          studentId: studentProfileId,
          academicSession,
          semester,
        },
      },
      include: {
        advisor: { include: { user: true } },
        courses: {
          include: {
            offering: { include: { course: true } },
          },
        },
      },
    });

    if (!registration) {
      throw new Error(`No course registration found for ${academicSession} Semester ${semester}.`);
    }

    if (!registration.isBursaryCleared) {
      throw new Error(`Examination Docket Withheld: Bursary tuition clearance not verified for ${academicSession} Semester ${semester}. Please contact the Accounts/Bursary office.`);
    }

    // 2. Build Cryptographic Payload
    const issuedAt = new Date().toISOString();
    const rawPayload = `${student.id}:${student.matricNumber}:${academicSession}:${semester}:${registration.id}`;
    const hmacSignature = this.generateHMAC(rawPayload);

    // Encoded token used by mobile invigilator scanners
    const tokenPayload = Buffer.from(
      JSON.stringify({
        sid: student.id,
        mat: student.matricNumber,
        ses: academicSession,
        sem: semester,
        rid: registration.id,
        sig: hmacSignature,
      })
    ).toString('base64url');

    const verifyUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/verify/exam-docket?token=${tokenPayload}`;
    const qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 250,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });

    // 3. Mark courses as cleared for exam
    await prisma.studentRegisteredCourse.updateMany({
      where: { registrationId: registration.id },
      data: { isClearedForExam: true },
    });

    return {
      student: {
        id: student.id,
        matricNumber: student.matricNumber,
        fullName: `${student.user.firstName} ${student.user.lastName}`,
        programName: student.program.name,
        currentLevel: student.currentLevel,
        avatarUrl: student.user.avatarUrl,
      },
      registration: {
        id: registration.id,
        academicSession: registration.academicSession,
        semester: registration.semester,
        status: registration.status,
        totalCredits: registration.totalCredits,
        advisorName: registration.advisor ? `${registration.advisor.user.firstName} ${registration.advisor.user.lastName}` : 'Academic Advisor Assigned',
        isBursaryCleared: registration.isBursaryCleared,
        bursaryReference: registration.bursaryReference,
      },
      courses: registration.courses.map((c) => ({
        code: c.offering.course.code,
        title: c.offering.course.title,
        creditUnits: c.offering.course.creditUnits,
        isCleared: true,
        barcode: c.examDocketBarcode || `DKT-${c.offering.course.code}`,
      })),
      verification: {
        qrCodeDataUrl,
        verificationToken: tokenPayload,
        hmacSignature,
        issuedAt,
      },
    };
  }

  /**
   * Decodes and validates a scanned QR token at the examination entrance.
   */
  async verifyScannedToken(token: string) {
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
      const { sid, mat, ses, sem, rid, sig } = decoded;

      const rawPayload = `${sid}:${mat}:${ses}:${sem}:${rid}`;
      const expectedSig = this.generateHMAC(rawPayload);

      if (sig !== expectedSig) {
        return {
          valid: false,
          error: 'Tamper Alert: Cryptographic signature mismatch. Digital docket may be counterfeit.',
        };
      }

      // Check live database registration state
      const reg = await prisma.semesterRegistration.findUnique({
        where: { id: rid },
        include: {
          student: { include: { user: true, program: true } },
          courses: { include: { offering: { include: { course: true } } } },
        },
      });

      if (!reg) {
        return { valid: false, error: 'Registration record revoked or not found.' };
      }

      const isApproved = reg.status === 'ADVISOR_APPROVED' || reg.status === 'LOCKED' || reg.status === 'SUBMITTED';

      return {
        valid: true,
        student: {
          fullName: `${reg.student.user.firstName} ${reg.student.user.lastName}`,
          matricNumber: reg.student.matricNumber,
          program: reg.student.program.name,
          level: reg.student.currentLevel,
        },
        registration: {
          session: reg.academicSession,
          semester: reg.semester,
          status: reg.status,
          isApproved,
          courseCount: reg.courses.length,
        },
        courses: reg.courses.map((c) => ({
          code: c.offering.course.code,
          title: c.offering.course.title,
          credits: c.creditUnits,
        })),
      };
    } catch (e: any) {
      return {
        valid: false,
        error: 'Malformed QR Code payload: ' + e.message,
      };
    }
  }

  /**
   * Generates a comprehensive official academic transcript.
   */
  async getStudentTranscript(studentProfileId: string) {
    const student = await prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      include: {
        user: true,
        program: true,
        academicStandings: { orderBy: [{ academicSession: 'asc' }, { semester: 'asc' }] },
        grades: {
          include: {
            offering: { include: { course: true } },
          },
          orderBy: { offering: { course: { code: 'asc' } } },
        },
      },
    });

    if (!student) throw new Error('Student record not found.');

    const gradingStandard = student.program.gradingStandard || 'NIGERIA_NUC_5_0';
    const gradingEngine = new GradingEngine(gradingStandard);

    // Group grades by session and semester
    const termsMap: Record<string, any[]> = {};
    for (const g of student.grades) {
      const key = `${g.offering.academicSession}__Sem${g.offering.semester}`;
      if (!termsMap[key]) termsMap[key] = [];
      termsMap[key].push({
        code: g.offering.course.code,
        title: g.offering.course.title,
        creditUnits: g.offering.course.creditUnits,
        totalScore: Number(g.totalScore),
        letterGrade: g.letterGrade,
        gradePoint: Number(g.gradePoint),
      });
    }

    const semesters = Object.entries(termsMap).map(([key, courses]) => {
      const [session, semStr] = key.split('__');
      const semester = Number(semStr.replace('Sem', ''));
      const { gpa, totalCreditsAttempted, totalCreditsEarned } = gradingEngine.calculateGPA(courses);
      const standing = gradingEngine.calculateStanding(gpa);

      return {
        academicSession: session,
        semester,
        courses,
        gpa,
        totalCreditsAttempted,
        totalCreditsEarned,
        standing: standing.standing,
        classification: standing.degreeClassification,
      };
    });

    // Compute Overall Cumulative
    const allCourses = student.grades.map((g) => ({
      code: g.offering.course.code,
      creditUnits: g.offering.course.creditUnits,
      totalScore: Number(g.totalScore),
    }));

    const overall = gradingEngine.calculateGPA(allCourses);
    const overallStanding = gradingEngine.calculateStanding(overall.gpa);

    return {
      student: {
        id: student.id,
        matricNumber: student.matricNumber,
        fullName: `${student.user.firstName} ${student.user.lastName}`,
        email: student.user.email,
        programName: student.program.name,
        gradingStandard: student.program.gradingStandard,
        totalCreditsRequired: student.program.totalCreditsRequired,
      },
      semesters,
      cumulative: {
        cgpa: overall.gpa,
        totalCreditsAttempted: overall.totalCreditsAttempted,
        totalCreditsEarned: overall.totalCreditsEarned,
        degreeClassification: overallStanding.degreeClassification,
        standing: overallStanding.standing,
        isGraduationQualified: overall.totalCreditsEarned >= student.program.totalCreditsRequired,
      },
    };
  }
}
