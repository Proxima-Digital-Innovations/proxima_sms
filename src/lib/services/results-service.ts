import { ResultsRepository } from '../dal/results-repository';

export class ResultsService {
  private repository = new ResultsRepository();

  calculateGradeSync(score: number): string {
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    if (score >= 40) return 'E';
    return 'F';
  }

  async getScoresByClassSubjectAndTerm(classId: string, subjectId: string, termName: string, sessionName: string) {
    const term = await this.repository.getTermBySession(termName, sessionName);
    if (!term) return { success: true, scores: [], termId: null };
    const students = await this.repository.getActiveStudentsByClass(classId, { id: true });
    const scores = await this.repository.getTermGradesForStudents(term.id, subjectId, students.map((s: any) => s.id));
    return { success: true, scores, termId: term.id };
  }

  async calculateClassPositions(classId: string, termId: string) {
    const students = await this.repository.getStudentsWithGrades(classId, termId);
    const studentTotals = students.map(student => {
      const total = student.termGrades.reduce((sum, g) => sum + (g.total || 0), 0);
      const average = student.termGrades.length > 0 ? total / student.termGrades.length : 0;
      return { studentId: student.id, total, average, subjectCount: student.termGrades.length };
    });
    studentTotals.sort((a, b) => b.total - a.total);
    const positions: Record<string, number> = {};
    let currentPosition = 1;
    for (let i = 0; i < studentTotals.length; i++) {
      if (i > 0 && studentTotals[i].total < studentTotals[i - 1].total) currentPosition = i + 1;
      positions[studentTotals[i].studentId] = currentPosition;
    }
    return positions;
  }

  async saveScores(scores: any[]) {
    const txData = scores.map((score: any) => {
      const total = (score.ca1 || 0) + (score.ca2 || 0) + (score.exam || 0);
      const grade = this.calculateGradeSync(total);
      return {
        where: { studentId_subjectId_termId: { studentId: score.studentId, subjectId: score.subjectId, termId: score.termId } },
        update: { ca1: score.ca1, ca2: score.ca2, exam: score.exam, total, grade, status: score.status || 'Draft' },
        create: { studentId: score.studentId, subjectId: score.subjectId, termId: score.termId, ca1: score.ca1, ca2: score.ca2, exam: score.exam, total, grade, status: score.status || 'Draft' }
      };
    });
    await this.repository.upsertTermGrades(txData);
    return { success: true };
  }

  async reviewScore(termGradeId: string, status: 'Approved' | 'Rejected') {
    await this.repository.updateTermGradeStatus(termGradeId, status);
    return { success: true };
  }

  async approveAllPendingScores(classId: string, subjectId: string, termId: string) {
    const result = await this.repository.approvePendingScores(classId, subjectId, termId);
    return { success: true, count: result.count };
  }

  async getBroadsheetData(classId: string, termName: string, sessionName: string) {
    const term = await this.repository.getTermBySession(termName, sessionName);
    if (!term) return { success: false, error: 'Term not found' };
    const students = await this.repository.getActiveStudentsByClass(classId, { id: true, studentId: true, firstName: true, lastName: true });
    const scores = await this.repository.getAllTermGradesWithSubject(term.id, students.map((s: any) => s.id));
    const scoresData = scores.map((s: any) => ({
      id: s.id, studentId: s.studentId, subject: s.subject.name, caScore: (s.ca1 || 0) + (s.ca2 || 0),
      examScore: s.exam || 0, totalScore: s.total || 0, grade: s.grade, status: s.status, term: term.name, class: classId
    }));
    return { success: true, students, scoresData };
  }

  async getClassResults(classId: string, termName: string, sessionName: string) {
    const term = await this.repository.getTermBySession(termName, sessionName);
    if (!term) return { success: false, error: 'Term not found' };
    const students = await this.repository.getActiveStudentsByClass(classId, { id: true, studentId: true, firstName: true, lastName: true, classLevel: true });
    const studentIds = students.map((s: any) => s.id);
    const scores = await this.repository.getAllTermGradesWithSubject(term.id, studentIds);
    const behavioural = await this.repository.getBehaviouralAssessments(term.id, studentIds);
    const data = students.map((student: any) => {
      const studentScores = scores.filter((s: any) => s.studentId === student.id).map((s: any) => ({
        subject: s.subject.name, caScore: (s.ca1 || 0) + (s.ca2 || 0), examScore: s.exam || 0,
        totalScore: s.total || 0, grade: s.grade || 'F'
      }));
      const studentBehavioural = behavioural.find(b => b.studentId === student.id) || null;
      const totalScore = studentScores.reduce((sum, s) => sum + s.totalScore, 0);
      const averageScore = studentScores.length > 0 ? totalScore / studentScores.length : 0;
      return {
        student: { id: student.id, studentId: student.studentId, firstName: student.firstName, lastName: student.lastName, classLevel: student.classLevel },
        results: studentScores, behavioral_assessment: studentBehavioural, total_score: totalScore,
        average_score: averageScore, overall_grade: this.calculateGradeSync(averageScore)
      };
    });
    return { success: true, data };
  }

  async generateResultCard(studentId: string, termName: string, sessionName: string) {
    const term = await this.repository.getTermBySession(termName, sessionName);
    const student = await this.repository.getStudentWithClass(studentId);
    if (!student) throw new Error("Student not found");

    let scores: any[] = [];
    let behavioural = null;
    let position = "N/A";

    if (term) {
      const rawScores = await this.repository.getTermGradeForStudentSubject(studentId, term.id);
      scores = rawScores.map(s => ({
        subject: s.subject.name, caScore: (s.ca1 || 0) + (s.ca2 || 0),
        examScore: (s.exam || 0), totalScore: s.total || 0, grade: s.grade || 'F',
      }));
      behavioural = await this.repository.getBehaviouralAssessmentForStudent(studentId, term.id);
      if (student.classId) {
        try {
          const positions = await this.calculateClassPositions(student.classId, term.id);
          const posNum = positions[studentId];
          if (posNum) {
            const j = posNum % 10, k = posNum % 100;
            if (j == 1 && k != 11) position = posNum + "st";
            else if (j == 2 && k != 12) position = posNum + "nd";
            else if (j == 3 && k != 13) position = posNum + "rd";
            else position = posNum + "th";
          }
        } catch (e) { console.error("Could not calculate position", e); }
      }
    }
    const totalMarks = scores.reduce((sum, s) => sum + s.totalScore, 0);
    const average = scores.length > 0 ? totalMarks / scores.length : 0;
    return {
      student: { firstName: student.firstName, lastName: student.lastName, studentId: student.studentId, classLevel: student.class?.name || 'N/A', gender: student.gender },
      scores, totalMarks, average, overallGrade: this.calculateGradeSync(average), attendance: 95, position
    };
  }

  async getMidtermResultsForPrint(studentId: string | null, classId: string | null, termName: string, sessionName: string) {
    const term = await this.repository.getTermBySession(termName, sessionName);
    if (!term) return { success: false, error: 'Term not found' };
    let students: any[] = [];
    if (studentId) {
      const s = await this.repository.getStudent(studentId, { id: true, studentId: true, firstName: true, lastName: true, classLevel: true });
      if (s) students.push(s);
    } else if (classId) {
      students = await this.repository.getActiveStudentsByClass(classId, { id: true, studentId: true, firstName: true, lastName: true, classLevel: true });
    }
    const results = await this.repository.getMidtermResultsForStudents(term.id, students.map((s: any) => s.id));
    const data = students.map((student: any) => ({
      student: { id: student.id, studentId: student.studentId, firstName: student.firstName, lastName: student.lastName, classLevel: student.classLevel },
      results: results.filter((r: any) => r.studentId === student.id).map((r: any) => ({ id: r.id, subject: r.subject.name, score: r.score, achievement: r.achievement }))
    }));
    return { success: true, data };
  }

  async getTahfeezResultsForPrint(classId: string, termName: string, sessionName: string) {
    const term = await this.repository.getTermBySession(termName, sessionName);
    if (!term) return { success: false, error: 'Term not found' };
    const students = await this.repository.getActiveStudentsByClass(classId, { id: true, studentId: true, firstName: true, lastName: true, classLevel: true });
    const results = await this.repository.getTahfeezScoresForStudents(term.id, students.map((s: any) => s.id));
    const data = students.map((student: any) => {
      const studentScore = results.find((r: any) => r.studentId === student.id);
      return {
        student: { id: student.id, studentId: student.studentId, firstName: student.firstName, lastName: student.lastName, classLevel: student.classLevel },
        score: studentScore || { marks: 0, surah: '', juz: 0, page: 0 }
      };
    }).filter(d => 'marks' in d.score && d.score.marks > 0);
    return { success: true, data };
  }
}