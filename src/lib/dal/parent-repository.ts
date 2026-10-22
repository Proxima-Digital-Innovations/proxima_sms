import { prisma } from "@/lib/prisma";

export class ParentRepository {
  async getGuardianWards(userId?: string, email?: string) {
    const whereConditions: any[] = [];
    if (userId) whereConditions.push({ userId });
    if (email) whereConditions.push({ email });

    if (whereConditions.length > 0) {
      const guardians = await prisma.guardian.findMany({
        where: { OR: whereConditions },
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
                include: { term: true }
              }
            }
          }
        }
      });
      if (guardians.length > 0) {
        return guardians;
      }
    }

    // Fallback for demo or administrative testing
    return prisma.guardian.findMany({
      take: 5,
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
              include: { term: true }
            }
          }
        }
      }
    });
  }

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
      where: { studentId, termId, status: { in: ['Present', 'PRESENT'] } }
    });
  }
}
