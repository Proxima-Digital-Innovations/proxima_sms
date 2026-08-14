import { prisma } from '@/lib/prisma';
export class ResultRepository {
  async getStudentsByClass(className: string) {
    return prisma.student.findMany({
      where: { class: { name: className }, status: 'Active' },
      select: { id: true, studentId: true, firstName: true, lastName: true }
    });
  }
  async getSubjects() {
    return prisma.subject.findMany({ where: {}, select: { id: true, name: true } });
  }
  async getTermByName(termName: string) {
    return prisma.term.findFirst({ where: { name: termName }, select: { id: true } });
  }
  async getTermGradesForStudents(termId: string, studentCuids: string[]) {
    return prisma.termGrade.findMany({
      where: { studentId: { in: studentCuids }, termId },
      select: { id: true, studentId: true, subjectId: true, ca1: true, ca2: true, exam: true, total: true }
    });
  }
  async updateTermGrade(id: string, data: any) {
    return prisma.termGrade.update({ where: { id }, data });
  }
}