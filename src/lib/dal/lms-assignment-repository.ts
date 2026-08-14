import { prisma } from "@/lib/prisma";

export class LmsAssignmentRepository {
  async createAssignment(data: any) {
    return await prisma.assignment.create({ data });
  }

  async createSubmission(data: any) {
    return await prisma.submission.create({ data });
  }

  async findSubmissionsByAssignmentId(assignmentId: string) {
    return await prisma.submission.findMany({
      where: { assignmentId },
      include: {
        student: true
      }
    });
  }

  async updateSubmissionScore(submissionId: string, score: number, feedback: string) {
    return await prisma.submission.update({
      where: { id: submissionId },
      data: { score, feedback, gradedAt: new Date() },
      include: {
        assignment: {
          include: {
            module: {
              include: { subject: true }
            }
          }
        },
        student: true
      }
    });
  }

  async findActiveTerm() {
    return await prisma.term.findFirst({ where: { isActive: true } });
  }

  async upsertTermGrade(studentId: string, subjectId: string, termId: string, score: number) {
    return await prisma.termGrade.upsert({
      where: {
        studentId_subjectId_termId: {
          studentId,
          subjectId,
          termId
        }
      },
      update: {
        ca1: score 
      },
      create: {
        studentId,
        subjectId,
        termId,
        ca1: score
      }
    });
  }
}
