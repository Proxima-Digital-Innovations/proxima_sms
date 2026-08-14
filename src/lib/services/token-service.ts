import { TokenRepository } from '../dal/token-repository';
import { randomBytes } from 'node:crypto';

export class TokenService {
  private repo = new TokenRepository();
  async generateResultToken(studentId: string, term: string, session: string) {
    const token = randomBytes(4).toString('hex').toUpperCase();
    const termRecord = await this.repo.getTerm(term);
    if (!termRecord) throw new Error(`Term ${term} not found`);
    const student = await this.repo.getStudent(studentId);
    if (!student) throw new Error(`Student ${studentId} not found`);
    await this.repo.upsertToken(student.id, termRecord.id, session, token);
    return token;
  }
  async validateAndUseToken(admissionNumber: string, token: string, term: string, session: string) {
    const student = await this.repo.getStudent(admissionNumber);
    if (!student) return { success: false, error: 'Student not found' };
    const termRecord = await this.repo.getTerm(term);
    if (!termRecord) return { success: false, error: 'Term not found' };
    const tokenRecord = await this.repo.findToken(student.id, token, termRecord.id, session);
    if (!tokenRecord) return { success: false, error: 'Invalid token' };
    if (tokenRecord.usageCount >= tokenRecord.maxUsage) return { success: false, error: 'Token usage limit exceeded' };
    await this.repo.incrementTokenUsage(tokenRecord.id, tokenRecord.usageCount + 1);
    const scores = await this.repo.getStudentScores(student.id, termRecord.id);
    const mappedScores = scores.map(s => ({
      id: s.id, subjectId: s.subjectId, subjectName: s.subject.name,
      ca1: s.ca1, ca2: s.ca2, exam: s.exam, totalScore: s.total, grade: s.grade, remarks: s.remarks
    }));
    const behavioural = await this.repo.getBehaviouralAssessment(student.id, termRecord.id, session);
    const totalMarks = mappedScores.reduce((sum, s) => sum + (s.totalScore || 0), 0);
    const average = mappedScores.length > 0 ? totalMarks / mappedScores.length : 0;
    let overallGrade = 'F';
    if (average >= 80) overallGrade = 'A';
    else if (average >= 70) overallGrade = 'B';
    else if (average >= 60) overallGrade = 'C';
    else if (average >= 50) overallGrade = 'D';
    else if (average >= 40) overallGrade = 'E';
    return {
      success: true,
      data: {
        student: { id: student.id, studentId: student.studentId, firstName: student.firstName, lastName: student.lastName, classLevel: student.class?.name || '', status: student.status },
        scores: mappedScores, behavioural, totalMarks, average, overallGrade,
        remainingUses: tokenRecord.maxUsage - (tokenRecord.usageCount + 1)
      }
    };
  }
}
