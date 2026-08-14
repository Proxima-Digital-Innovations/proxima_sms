import { GradingRepository } from '../dal/grading-repository';
function calculateGrade(ca1: number | null, ca2: number | null, exam: number | null) {
  const total = (ca1 || 0) + (ca2 || 0) + (exam || 0);
  let letter = 'F';
  if (total >= 75) letter = 'A';
  else if (total >= 60) letter = 'B';
  else if (total >= 50) letter = 'C';
  else if (total >= 40) letter = 'D';
  else if (total >= 30) letter = 'E';
  return { total, letter };
}
export class GradingService {
  private repository = new GradingRepository();
  async getGradeSheet(classId: string, subjectId: string, termId: string) {
    const students = await this.repository.getStudentsInClass(classId);
    if (students.length === 0) return { success: false, grades: [], message: "No active students in this class." };
    const studentIds = students.map(s => s.id);
    let grades = await this.repository.getTermGrades(termId, subjectId, studentIds);
    const missingStudentIds = students.filter(s => !grades.some(g => g.studentId === s.id)).map(s => s.id);
    if (missingStudentIds.length > 0) {
      const newGrades = missingStudentIds.map(sId => ({ studentId: sId, subjectId, termId }));
      await this.repository.createMissingGrades(newGrades);
      grades = await this.repository.getTermGrades(termId, subjectId, studentIds);
    }
    grades.sort((a, b) => a.student.lastName.localeCompare(b.student.lastName));
    return { success: true, grades };
  }
  async saveGradeSheet(gradesUpdate: { id: string, ca1: number|null, ca2: number|null, exam: number|null, remarks: string }[]) {
    const updates = gradesUpdate.map(update => {
      const { total, letter } = calculateGrade(update.ca1, update.ca2, update.exam);
      return { where: { id: update.id }, data: { ca1: update.ca1, ca2: update.ca2, exam: update.exam, total, grade: letter, remarks: update.remarks } };
    });
    return this.repository.updateGradesTransaction(updates);
  }
  async getStudentReportCard(studentId: string, termId: string) {
    const [student, grades, attendance, term] = await Promise.all([
      this.repository.getStudentWithClass(studentId),
      this.repository.getStudentTermGrades(studentId, termId),
      this.repository.getStudentAttendanceCount(studentId),
      this.repository.getTermWithSession(termId)
    ]);
    if (!student || !term) return { success: false, message: "Record not found" };
    const totalScore = grades.reduce((sum, g) => sum + (g.total || 0), 0);
    const average = grades.length > 0 ? (totalScore / grades.length).toFixed(1) : 0;
    return { success: true, report: { student, term, grades, attendance, totalScore, average } };
  }
}