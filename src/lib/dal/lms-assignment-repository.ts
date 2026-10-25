import { prisma } from "@/lib/prisma";

export class LmsAssignmentRepository {
  async createAssignment(data: any) {
    return await prisma.assignment.create({ data });
  }

  async createSubmission(data: any) {
    return await prisma.submission.create({ data });
  }

  async upsertSubmission(data: {
    assignmentId: string;
    studentId: string;
    fileUrl?: string;
    body?: string;
    pasteCount?: number;
    tabSwitchCount?: number;
    isPasteFlagged?: boolean;
    similarityScore?: number | null;
  }) {
    const existing = await prisma.submission.findFirst({
      where: {
        assignmentId: data.assignmentId,
        studentId: data.studentId,
      },
    });

    if (existing) {
      return await prisma.submission.update({
        where: { id: existing.id },
        data: {
          fileUrl: data.fileUrl ?? existing.fileUrl,
          body: data.body ?? existing.body,
          pasteCount: data.pasteCount ?? existing.pasteCount,
          tabSwitchCount: data.tabSwitchCount ?? existing.tabSwitchCount,
          isPasteFlagged: data.isPasteFlagged ?? existing.isPasteFlagged,
          similarityScore: data.similarityScore !== undefined ? data.similarityScore : existing.similarityScore,
          submittedAt: new Date(),
        },
      });
    }

    return await prisma.submission.create({
      data: {
        assignmentId: data.assignmentId,
        studentId: data.studentId,
        fileUrl: data.fileUrl,
        body: data.body,
        pasteCount: data.pasteCount ?? 0,
        tabSwitchCount: data.tabSwitchCount ?? 0,
        isPasteFlagged: data.isPasteFlagged ?? false,
        similarityScore: data.similarityScore ?? null,
      },
    });
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
