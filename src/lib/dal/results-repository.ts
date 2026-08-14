import { prisma } from "@/lib/prisma";

export class ResultsRepository {
  async getTermBySession(termName: string, sessionName: string) {
    return prisma.term.findFirst({ where: { name: termName, session: { name: sessionName } } });
  }
  async getActiveStudentsByClass(classId: string, selectFields?: any) {
    return prisma.student.findMany({
      where: { classId, status: 'Active' },
      select: selectFields || { id: true }
    });
  }
  async getTermGradesForStudents(termId: string, subjectId: string, studentIds: string[]) {
    return prisma.termGrade.findMany({ where: { termId, subjectId, studentId: { in: studentIds } } });
  }
  async getStudentsWithGrades(classId: string, termId: string) {
    return prisma.student.findMany({
      where: { classId, status: 'Active' },
      include: { termGrades: { where: { termId } } }
    });
  }
  async upsertTermGrades(scoresData: any[]) {
    return prisma.$transaction(scoresData.map(data => prisma.termGrade.upsert(data)));
  }
  async updateTermGradeStatus(termGradeId: string, status: string) {
    return null; // status removed from TermGrade model
  }
  async approvePendingScores(classId: string, subjectId: string, termId: string) {
    return { count: 0 }; // status removed from TermGrade model
  }
  async getAllTermGradesWithSubject(termId: string, studentIds: string[]) {
    return prisma.termGrade.findMany({
      where: { termId, studentId: { in: studentIds } },
      include: { subject: { select: { name: true } } }
    });
  }
  async getBehaviouralAssessments(termId: string, studentIds: string[]) {
    return prisma.behaviouralAssessment.findMany({ where: { termId, studentId: { in: studentIds } } });
  }
  async getStudentWithClass(studentId: string) {
    return prisma.student.findUnique({ where: { id: studentId }, include: { class: true } });
  }
  async getTermGradeForStudentSubject(studentId: string, termId: string) {
    return prisma.termGrade.findMany({ where: { studentId, termId }, include: { subject: true } });
  }
  async getBehaviouralAssessmentForStudent(studentId: string, termId: string) {
    return prisma.behaviouralAssessment.findUnique({ where: { studentId_termId: { studentId, termId } } });
  }
  async getStudent(studentId: string, selectFields?: any) {
    return prisma.student.findUnique({
      where: { id: studentId, status: 'Active' },
      select: selectFields
    });
  }
  async getMidtermResultsForStudents(termId: string, studentIds: string[]) {
    return prisma.midtermResult.findMany({
      where: { termId, studentId: { in: studentIds } },
      include: { subject: { select: { name: true } } }
    });
  }
  async getTahfeezScoresForStudents(termId: string, studentIds: string[]) {
    return prisma.tahfeezScore.findMany({ where: { termId, studentId: { in: studentIds } } });
  }
}