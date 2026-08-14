import { prisma } from '@/lib/prisma';
export class MidtermRepository {
  async findTerm(term: string) {
    return prisma.term.findFirst({
      where: {
        OR: [
          { id: term },
          { name: term },
          { name: term.replace("First Term", "Term 1").replace("Second Term", "Term 2").replace("Third Term", "Term 3") },
          { name: term.replace("Term 1", "First Term").replace("Term 2", "Second Term").replace("Term 3", "Third Term") }
        ]
      }
    });
  }
  async getMidtermResults(termId: string, session: string, classLevel: string) {
    return prisma.midtermResult.findMany({
      where: { student: { class: { name: classLevel } }, termId, session },
      include: { student: { include: { class: true } }, subject: true, term: true }
    });
  }
  async findStudent(identifier: string) {
    return prisma.student.findFirst({
      where: { OR: [{ id: identifier }, { studentId: identifier }] },
      include: { class: true }
    });
  }
  async findOrCreateSubject(idOrName: string, nameFallback: string) {
    let subject = await prisma.subject.findFirst({ where: { OR: [{ id: idOrName }, { name: idOrName }, { name: nameFallback }] } });
    if (!subject) subject = await prisma.subject.create({ data: { name: nameFallback || idOrName } });
    return subject;
  }
  async upsertMidtermResult(data: any) { return prisma.midtermResult.upsert(data); }
  async getMidtermResultsForStudent(studentId: string, termId: string, session: string) {
    return prisma.midtermResult.findMany({ where: { studentId, termId, session }, include: { subject: true, term: true } });
  }
  async getActiveStudentsByClass(classLevel: string) {
    return prisma.student.findMany({ where: { class: { name: classLevel }, status: 'Active' } });
  }
}