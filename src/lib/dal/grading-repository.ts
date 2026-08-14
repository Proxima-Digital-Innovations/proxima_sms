import { prisma } from "@/lib/prisma";
export class GradingRepository {
  async getStudentsInClass(classId: string) {
    return prisma.student.findMany({
      where: { classId, status: "Active" },
      orderBy: { lastName: 'asc' },
      select: { id: true, studentId: true, firstName: true, lastName: true }
    });
  }
  async getTermGrades(termId: string, subjectId: string, studentIds: string[]) {
    return prisma.termGrade.findMany({
      where: { termId, subjectId, studentId: { in: studentIds } },
      include: { student: { select: { firstName: true, lastName: true, studentId: true } } },
      orderBy: { student: { lastName: 'asc' } }
    });
  }
  async createMissingGrades(data: any[]) {
    return prisma.termGrade.createMany({ data });
  }
  async updateGradesTransaction(updates: {where: any, data: any}[]) {
    const promises = updates.map(u => prisma.termGrade.update({ where: u.where, data: u.data }));
    return prisma.$transaction(promises);
  }
  async getStudentWithClass(studentId: string) {
    return prisma.student.findUnique({ where: { id: studentId }, include: { class: true } });
  }
  async getStudentTermGrades(studentId: string, termId: string) {
    return prisma.termGrade.findMany({ where: { studentId, termId }, include: { subject: true } });
  }
  async getStudentAttendanceCount(studentId: string) {
    return prisma.attendance.count({ where: { studentId } });
  }
  async getTermWithSession(termId: string) {
    return prisma.term.findUnique({ where: { id: termId }, include: { session: true } });
  }
}