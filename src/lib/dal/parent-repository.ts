import { prisma } from "@/lib/prisma";


export class ParentRepository {
  async getParentUserWithProfile() {
    return prisma.user.findFirst({
      where: { role: 'PARENT' },
      include: {
        guardianProfile: {
          include: {
            student: {
              include: {
                class: true,
                healthRecord: {
                  include: {
                    immunizations: true,
                    clinicVisits: { orderBy: { date: 'desc' }, take: 3 }
                  }
                },
                incidents: { orderBy: { date: 'desc' }, take: 3 },
                invoices: { 
                  where: { status: { not: 'PAID' } },
                  include: { term: true }
                },
              }
            }
          }
        }
      }
    });
  }

  async getActiveTerm() {
    return prisma.term.findFirst({
      where: { isActive: true },
      include: { session: true }
    });
  }

  async getTermGrades(studentId: string, termId: string) {
    return prisma.termGrade.findMany({
      where: { studentId, termId },
      include: { subject: true }
    });
  }

  async getAttendanceCount(studentId: string, termId: string) {
    return prisma.attendance.count({
      where: { studentId, termId, status: 'Present' }
    });
  }
}
