import { TokenRepository } from '../dal/token-repository';
import { prisma } from '@/lib/prisma';
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
      id: s.id,
      subjectId: s.subjectId,
      subject: s.subject.name,
      subjectName: s.subject.name,
      ca1: s.ca1,
      ca2: s.ca2,
      caScore: (s.ca1 ?? 0) + (s.ca2 ?? 0),
      exam: s.exam,
      examScore: s.exam,
      totalScore: s.total,
      grade: s.grade,
      remarks: s.remarks,
    }));
    const behavioural = await this.repo.getBehaviouralAssessment(student.id, termRecord.id, session);
    const totalMarks = mappedScores.reduce((sum, s) => sum + (s.totalScore || 0), 0);
    const average = mappedScores.length > 0 ? totalMarks / mappedScores.length : 0;
    
    let overallGrade = 'F9';
    if (average >= 75) overallGrade = 'A1';
    else if (average >= 70) overallGrade = 'B2';
    else if (average >= 65) overallGrade = 'B3';
    else if (average >= 60) overallGrade = 'C4';
    else if (average >= 55) overallGrade = 'C5';
    else if (average >= 50) overallGrade = 'C6';
    else if (average >= 45) overallGrade = 'D7';
    else if (average >= 40) overallGrade = 'E8';

    const schoolProfile = await prisma.systemProfile.findFirst();
    const school = {
      name: schoolProfile?.schoolName || 'Proxima SMS School',
      address: schoolProfile?.address || 'Nigeria',
      phone: schoolProfile?.phone || '',
      email: schoolProfile?.email || '',
      logoUrl: schoolProfile?.logoUrl || schoolProfile?.crestUrl || null,
      motto: schoolProfile?.motto || '',
    };

    return {
      success: true,
      data: {
        student: {
          id: student.id,
          studentId: student.studentId,
          firstName: student.firstName,
          lastName: student.lastName,
          classLevel: student.class?.name || '',
          status: student.status,
        },
        scores: mappedScores,
        behavioural,
        totalMarks,
        average,
        overallGrade,
        school,
        termName: termRecord.name,
        sessionName: session,
        remainingUses: tokenRecord.maxUsage - (tokenRecord.usageCount + 1),
      },
    };
  }
}
