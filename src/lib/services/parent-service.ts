import { ParentRepository } from "../dal/parent-repository";
import { prisma } from "../prisma";

export class ParentService {
  private repo = new ParentRepository();

  async getParentDashboardData(userId?: string, email?: string, selectedStudentId?: string) {
    const guardians = await this.repo.getGuardianWards(userId, email);
    const wards = guardians.map(g => g.student).filter(Boolean);

    if (wards.length === 0) {
      return {
        wards: [],
        currentWard: null,
        grades: [],
        attendanceCount: 0,
        activeTerm: null,
        invoices: [],
        feeSummary: { totalBilled: 0, totalPaid: 0, outstanding: 0 },
      };
    }

    const currentWard = (selectedStudentId ? wards.find(w => w.id === selectedStudentId) : null) || wards[0];
    const activeTerm = (await this.repo.getActiveTerm()) || await prisma.term.findFirst({ orderBy: { startDate: 'desc' } });

    let grades: any[] = [];
    let attendanceCount = 0;

    if (activeTerm) {
      grades = await this.repo.getTermGrades(currentWard.id, activeTerm.id);
      attendanceCount = await this.repo.getAttendanceCount(currentWard.id, activeTerm.id);
    }

    const studentInvoices = await prisma.invoice.findMany({
      where: { studentId: currentWard.id },
      include: { term: true, payments: true }
    });

    const totalBilled = studentInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const totalPaid = studentInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const outstanding = Math.max(0, totalBilled - totalPaid);

    return {
      wards: wards.map(w => ({
        id: w.id,
        studentId: w.studentId,
        firstName: w.firstName,
        lastName: w.lastName,
        class: w.class,
      })),
      currentWard,
      student: currentWard,
      activeTerm,
      grades,
      attendanceCount,
      recentIncidents: currentWard.incidents || [],
      health: currentWard.healthRecord || null,
      invoices: studentInvoices,
      feeSummary: {
        totalBilled,
        totalPaid,
        outstanding
      }
    };
  }
}
