import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import argon2 from 'argon2';
import { GradingEngine } from './grading-engine';

export interface BlindGradeEntry {
  anonymousToken: string;
  caScore: number;    // 0 - 40
  examScore: number;  // 0 - 60
  secondGraderExamScore?: number;
}

export interface SenateAuditModificationInput {
  gradeId: string;
  newScore: number;
  reason: string;
  senateApprovalRef: string;
  changedById: string;
  authorizerPasswordVerify: string;
}

export class ExamProcessingService {
  /**
   * Helper to compute tamper-evident SHA-256 data hash.
   */
  static generateDataHash(studentId: string, totalScore: number, status: string, previousHash: string = 'GENESIS_HASH'): string {
    const payload = `${studentId}:${totalScore.toFixed(2)}:${status}:${previousHash}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Record blind score entry by Candidate Identification Number (CIN).
   * Prevents graders from accessing student names, matric numbers, or photos.
   */
  async submitBlindGrades(offeringId: string, entries: BlindGradeEntry[], graderUserId: string) {
    const offering = await prisma.courseOffering.findUnique({
      where: { id: offeringId },
      include: { course: { include: { program: true } } },
    });
    if (!offering) throw new Error('Course offering not found.');

    const gradingStandard = offering.course.program?.gradingStandard || 'NIGERIA_NUC_5_0';
    const gradingEngine = new GradingEngine(gradingStandard);

    return await prisma.$transaction(async (tx) => {
      const results: any[] = [];

      for (const entry of entries) {
        // 1. Resolve candidate token anonymously
        const tokenRecord = await tx.examCandidateToken.findUnique({
          where: { anonymousToken: entry.anonymousToken },
        });

        if (!tokenRecord || tokenRecord.offeringId !== offeringId) {
          throw new Error(`Invalid anonymous candidate token: ${entry.anonymousToken}`);
        }

        // 2. Validate CA and Exam Caps
        if (entry.caScore < 0 || entry.caScore > 40) {
          throw new Error(`CA score for token ${entry.anonymousToken} must be between 0 and 40.`);
        }
        if (entry.examScore < 0 || entry.examScore > 60) {
          throw new Error(`Exam score for token ${entry.anonymousToken} must be between 0 and 60.`);
        }

        // 3. Double-blind variance check
        let finalExamScore = entry.examScore;
        let isDoubleBlind = false;

        if (entry.secondGraderExamScore !== undefined && entry.secondGraderExamScore !== null) {
          isDoubleBlind = true;
          const scoreDelta = Math.abs(entry.examScore - entry.secondGraderExamScore);
          const percentDelta = (scoreDelta / 60) * 100;

          if (percentDelta > 5) {
            throw new Error(
              `Double-blind grading delta exceeded 5% (${scoreDelta.toFixed(1)} marks). Flagged for Chief Examiner arbitration.`
            );
          }
          finalExamScore = (entry.examScore + entry.secondGraderExamScore) / 2;
        }

        const totalScore = Number((entry.caScore + finalExamScore).toFixed(2));
        const gradeCalc = gradingEngine.calculateGrade(totalScore);

        // 4. Generate cryptographic SHA-256 data hash
        const dataHash = ExamProcessingService.generateDataHash(
          tokenRecord.studentId,
          totalScore,
          'SUBMITTED'
        );

        // 5. Upsert StudentGrade
        const grade = await tx.studentGrade.upsert({
          where: {
            studentId_offeringId: {
              studentId: tokenRecord.studentId,
              offeringId: offeringId,
            },
          },
          create: {
            studentId: tokenRecord.studentId,
            offeringId,
            caScore: entry.caScore,
            examScore: finalExamScore,
            totalScore,
            letterGrade: gradeCalc.letterGrade,
            gradePoint: gradeCalc.gradePoint,
            status: 'SUBMITTED',
            dataHash,
            isDoubleBlind,
            secondGraderExamScore: entry.secondGraderExamScore,
          },
          update: {
            caScore: entry.caScore,
            examScore: finalExamScore,
            totalScore,
            letterGrade: gradeCalc.letterGrade,
            gradePoint: gradeCalc.gradePoint,
            status: 'SUBMITTED',
            dataHash,
            isDoubleBlind,
            secondGraderExamScore: entry.secondGraderExamScore,
          },
        });

        results.push(grade);
      }

      return {
        success: true,
        processedCount: results.length,
      };
    });
  }

  /**
   * Advance Examination Governance Chain:
   * SUBMITTED -> HOD_APPROVED -> DEAN_APPROVED -> SENATE_RATIFIED -> PUBLISHED
   */
  async advanceApprovalStage(offeringId: string, targetStage: 'HOD_APPROVED' | 'DEAN_APPROVED' | 'SENATE_RATIFIED' | 'PUBLISHED', authorizerUserId: string, passwordVerify: string) {
    // 1. Step-up Credentials Verification
    const authorizer = await prisma.user.findUnique({
      where: { id: authorizerUserId },
    });
    if (!authorizer) throw new Error('Authorizer account not found.');

    const isMatch = await argon2.verify(authorizer.passwordHash, passwordVerify);
    if (!isMatch) {
      throw new Error('Step-up authorization failed: Invalid credentials.');
    }

    // 2. Fetch Grades for this Offering
    const grades = await prisma.studentGrade.findMany({
      where: { offeringId },
    });

    if (grades.length === 0) {
      throw new Error('No grades found for this course offering.');
    }

    // Check immutability
    const isAlreadyRatified = grades.some((g) => g.status === 'SENATE_RATIFIED' || g.status === 'PUBLISHED');
    if (isAlreadyRatified && targetStage !== 'PUBLISHED') {
      throw new Error('Grades have already been ratified by Senate and are cryptographically immutable.');
    }

    // 3. Batch Update Status with Hash Update
    return await prisma.$transaction(async (tx) => {
      for (const g of grades) {
        const newHash = ExamProcessingService.generateDataHash(
          g.studentId,
          Number(g.totalScore),
          targetStage,
          g.dataHash
        );

        await tx.studentGrade.update({
          where: { id: g.id },
          data: {
            status: targetStage,
            dataHash: newHash,
          },
        });
      }

      // If Ratifying, recalculate StudentAcademicStanding across registered students
      if (targetStage === 'SENATE_RATIFIED') {
        const offering = await tx.courseOffering.findUnique({
          where: { id: offeringId },
          include: { course: { include: { program: true } } },
        });

        if (offering) {
          const gradingStandard = offering.course.program?.gradingStandard || 'NIGERIA_NUC_5_0';
          const gradingEngine = new GradingEngine(gradingStandard);

          for (const g of grades) {
            // Find all ratified grades for this student
            const studentGrades = await tx.studentGrade.findMany({
              where: {
                studentId: g.studentId,
                status: { in: ['SENATE_RATIFIED', 'PUBLISHED'] },
              },
              include: { offering: { include: { course: true } } },
            });

            const courseScores = studentGrades.map((sg) => ({
              code: sg.offering.course.code,
              creditUnits: sg.offering.course.creditUnits,
              totalScore: Number(sg.totalScore),
              level: sg.offering.course.level,
            }));

            const { gpa, totalCreditsEarned } = gradingEngine.calculateGPA(courseScores);
            const standingResult = gradingEngine.calculateStanding(gpa);

            await tx.studentAcademicStanding.upsert({
              where: {
                studentId_academicSession_semester: {
                  studentId: g.studentId,
                  academicSession: offering.academicSession,
                  semester: offering.semester,
                },
              },
              create: {
                studentId: g.studentId,
                academicSession: offering.academicSession,
                semester: offering.semester,
                gpa,
                cgpa: gpa,
                totalCreditsEarned,
                standing: standingResult.standing,
                degreeClassification: standingResult.degreeClassification,
                isRatified: true,
                ratifiedAt: new Date(),
                senateBatchRef: `SEN-${offering.academicSession.replace('/', '')}-OFF${offering.id.slice(-6)}`,
              },
              update: {
                gpa,
                cgpa: gpa,
                totalCreditsEarned,
                standing: standingResult.standing,
                degreeClassification: standingResult.degreeClassification,
                isRatified: true,
                ratifiedAt: new Date(),
              },
            });
          }
        }
      }

      return {
        success: true,
        updatedStage: targetStage,
        affectedCount: grades.length,
      };
    });
  }

  /**
   * Post-Senate Grade Modification through Formal Audit Trail
   * Requires Senate Approval Reference and maintains cryptographic ledger chain.
   */
  async modifyRatifiedGrade(input: SenateAuditModificationInput) {
    const { gradeId, newScore, reason, senateApprovalRef, changedById, authorizerPasswordVerify } = input;

    const authorizer = await prisma.user.findUnique({ where: { id: changedById } });
    if (!authorizer) throw new Error('Authorizer not found.');

    const isMatch = await argon2.verify(authorizer.passwordHash, authorizerPasswordVerify);
    if (!isMatch) throw new Error('Step-up authorization failed.');

    return await prisma.$transaction(async (tx) => {
      const existingGrade = await tx.studentGrade.findUnique({
        where: { id: gradeId },
        include: { offering: { include: { course: { include: { program: true } } } } },
      });

      if (!existingGrade) throw new Error('Grade record not found.');

      const gradingStandard = existingGrade.offering.course.program?.gradingStandard || 'NIGERIA_NUC_5_0';
      const gradingEngine = new GradingEngine(gradingStandard);
      const gradeCalc = gradingEngine.calculateGrade(newScore);

      const previousRecordHash = existingGrade.dataHash;
      const newRecordHash = ExamProcessingService.generateDataHash(
        existingGrade.studentId,
        newScore,
        existingGrade.status,
        previousRecordHash
      );

      // 1. Update grade
      await tx.studentGrade.update({
        where: { id: gradeId },
        data: {
          totalScore: newScore,
          letterGrade: gradeCalc.letterGrade,
          gradePoint: gradeCalc.gradePoint,
          dataHash: newRecordHash,
        },
      });

      // 2. Append to immutable Audit Trail
      const audit = await tx.gradeAuditTrail.create({
        data: {
          gradeId,
          previousScore: existingGrade.totalScore,
          newScore,
          reason,
          senateApprovalRef,
          changedById,
          previousRecordHash,
          newRecordHash,
        },
      });

      return {
        success: true,
        auditId: audit.id,
        newRecordHash,
      };
    });
  }
}
