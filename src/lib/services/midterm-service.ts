import { MidtermRepository } from '../dal/midterm-repository';
export class MidtermService {
  private repository = new MidtermRepository();
  async getMidtermResults(classLevel: string, term: string, session: string) {
    const termRecord = await this.repository.findTerm(term);
    if (!termRecord) return [];
    const results = await this.repository.getMidtermResults(termRecord.id, session, classLevel);
    return results.map(r => ({
      id: r.id, studentId: r.studentId, studentName: `${r.student.firstName} ${r.student.lastName}`,
      subjectId: r.subjectId, subjectName: r.subject.name, class: r.student.class?.name || classLevel,
      term: r.term.name, session: r.session, score: r.score, achievement: r.achievement
    }));
  }
  async saveMidtermResults(results: any[]) {
    for (const result of results) {
      const student = await this.repository.findStudent(result.studentId);
      if (!student) continue;
      const subject = await this.repository.findOrCreateSubject(result.subjectId, result.subjectName);
      const termRecord = await this.repository.findTerm(result.term);
      if (!termRecord) continue;
      await this.repository.upsertMidtermResult({
        where: { studentId_subjectId_termId: { studentId: student.id, subjectId: subject.id, termId: termRecord.id } },
        update: { score: result.score, achievement: result.achievement, session: result.session },
        create: { studentId: student.id, subjectId: subject.id, termId: termRecord.id, session: result.session, score: result.score, achievement: result.achievement }
      });
    }
    return { success: true };
  }
  calculateAchievement(score: number): string {
    if (score >= 0 && score <= 6) return 'Emerging';
    if (score >= 7 && score <= 9) return 'Emerging +';
    if (score >= 10 && score <= 12) return 'Expected';
    if (score >= 13 && score <= 16) return 'Expected +';
    if (score >= 17 && score <= 20) return 'Exceeding';
    return 'Invalid';
  }
  async getStudentMidtermReport(studentId: string, term: string, session: string) {
    const termRecord = await this.repository.findTerm(term);
    if (!termRecord) throw new Error('Term not found');
    const student = await this.repository.findStudent(studentId);
    if (!student) throw new Error('Student not found');
    const results = await this.repository.getMidtermResultsForStudent(student.id, termRecord.id, session);
    const mappedResults = results.map(r => ({
      id: r.id, studentId: student.id, studentName: `${student.firstName} ${student.lastName}`,
      subjectId: r.subjectId, subjectName: r.subject.name, class: student.class?.name || '',
      term: termRecord.name, session: r.session, score: r.score, achievement: r.achievement
    }));
    const totalScore = results.reduce((sum, r) => sum + r.score, 0);
    const averageScore = results.length > 0 ? totalScore / results.length : 0;
    return {
      student: { id: student.id, studentId: student.studentId, firstName: student.firstName, lastName: student.lastName, classLevel: student.class?.name || '', status: student.status },
      results: mappedResults, averageScore
    };
  }
  async getClassMidtermReports(classLevel: string, term: string, session: string) {
    const students = await this.repository.getActiveStudentsByClass(classLevel);
    const reports: any[] = [];
    for (const student of students) {
      try {
        const report = await this.getStudentMidtermReport(student.id, term, session);
        reports.push(report);
      } catch (e) {
        console.error(`Error generating report for student ${student.id}:`, e);
      }
    }
    return reports;
  }
}