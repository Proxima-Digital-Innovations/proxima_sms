import { ParentRepository } from "../dal/parent-repository";

export class ParentService {
  private repo = new ParentRepository();

  async getParentDashboardData() {
    const parentUser = await this.repo.getParentUserWithProfile();

    if (!parentUser || !parentUser.guardianProfile) {
      throw new Error("No parent profile found or not linked to a student.");
    }

    const student = parentUser.guardianProfile.student;
    const activeTerm = await this.repo.getActiveTerm();

    let grades: any[] = [];
    let attendanceCount = 0;

    if (activeTerm) {
      grades = await this.repo.getTermGrades(student.id, activeTerm.id);
      attendanceCount = await this.repo.getAttendanceCount(student.id, activeTerm.id);
    }

    return {
      parent: parentUser,
      guardianInfo: parentUser.guardianProfile,
      student,
      activeTerm,
      grades,
      attendanceCount,
      recentIncidents: student.incidents,
      health: student.healthRecord,
      outstandingInvoices: student.invoices
    };
  }
}
