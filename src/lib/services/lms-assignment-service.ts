import { LmsAssignmentRepository } from '../dal/lms-assignment-repository';

const repository = new LmsAssignmentRepository();

export class LmsAssignmentService {
  async createAssignment(moduleId: string, title: string, points: number, description?: string, dueDate?: Date) {
    return await repository.createAssignment({ moduleId, title, points, description, dueDate });
  }

  async submitWork(
    assignmentId: string,
    studentId: string,
    fileUrl?: string,
    body?: string,
    telemetry?: {
      pasteCount?: number;
      tabSwitchCount?: number;
      isPasteFlagged?: boolean;
      similarityScore?: number | null;
    }
  ) {
    return await repository.upsertSubmission({
      assignmentId,
      studentId,
      fileUrl,
      body,
      pasteCount: telemetry?.pasteCount,
      tabSwitchCount: telemetry?.tabSwitchCount,
      isPasteFlagged: telemetry?.isPasteFlagged,
      similarityScore: telemetry?.similarityScore,
    });
  }

  async getSubmissions(assignmentId: string) {
    return await repository.findSubmissionsByAssignmentId(assignmentId);
  }

  async gradeSubmission(submissionId: string, score: number, feedback: string) {
    const submission = await repository.updateSubmissionScore(submissionId, score, feedback);

    const currentTerm = await repository.findActiveTerm();
    if (currentTerm) {
      const subjectId = submission.assignment.module.subjectId;
      const studentId = submission.studentId;

      await repository.upsertTermGrade(studentId, subjectId, currentTerm.id, score);
    }

    return submission;
  }
}
