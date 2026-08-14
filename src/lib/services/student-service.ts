import { StudentRepository } from '../dal/student-repository';

export class StudentService {
  /**
   * Compiles all necessary data for the student dashboard.
   * Enforces business rules like attendance calculation and invoice balancing.
   */
  static async compileDashboardData(studentId: string, ) {
    // 1. Validate Student Exists
    const student = await StudentRepository.findStudentWithClass(studentId);
    if (!student) {
      throw new Error("Student not found or access denied.");
    }

    // 2. Business Logic: Attendance Rate Calculation
    const attendanceCount = await StudentRepository.countTotalAttendance(studentId);
    const attendancePresent = await StudentRepository.countPresentAttendance(studentId);
    const attendanceRate = attendanceCount > 0 
      ? (attendancePresent / attendanceCount) * 100 
      : 100;

    // 3. Business Logic: Financial Balance Calculation
    const invoices = await StudentRepository.getInvoices(studentId);
    const totalBalance = invoices.reduce((sum, inv) => sum + (inv.amount - inv.amountPaid), 0);

    // 4. Business Logic: Extract Upcoming LMS Tasks
    let upcomingAssignments: any[] = [];
    let availableQuizzes: any[] = [];
    
    if (student.classId) {
      const modules = await StudentRepository.getLmsModulesWithStudentData(student.classId, studentId);
      const now = new Date();
      
      // Rule: An assignment is upcoming if the student hasn't submitted it, and the due date is in the future (or no due date)
      upcomingAssignments = modules.flatMap(m => m.assignments)
        .filter(as => as.submissions.length === 0 && (!as.dueDate || as.dueDate > now))
        .slice(0, 5);

      // Rule: A quiz is available if the student hasn't attempted it yet
      availableQuizzes = modules.flatMap(m => m.quizzes)
        .filter(q => q.attempts.length === 0)
        .slice(0, 5);
    }

    // 5. Return compiled data to the presentation layer
    return {
      student,
      attendanceRate,
      totalBalance,
      upcomingAssignments,
      availableQuizzes
    };
  }
}
