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

  /**
   * Fetches Tertiary Institution (University/College) wards linked to this Parent via StudentProfile
   */
  async getTertiaryWards(userId?: string, email?: string) {
    const whereConditions: any[] = [];
    if (userId) whereConditions.push({ guardianUserId: userId });
    if (email) whereConditions.push({ guardianEmail: email });

    if (whereConditions.length > 0) {
      const profiles = await prisma.studentProfile.findMany({
        where: { OR: whereConditions },
        include: {
          user: true,
          program: {
            include: {
              department: { include: { faculty: true } },
              faculty: true,
            }
          },
          academicStandings: {
            orderBy: { updatedAt: 'desc' },
            take: 1,
          },
          registrations: {
            orderBy: { createdAt: 'desc' },
            include: {
              courses: {
                include: {
                  offering: {
                    include: { course: true }
                  }
                }
              },
              advisor: {
                include: { user: true }
              }
            }
          },
          grades: {
            include: {
              offering: {
                include: { course: true }
              }
            },
            orderBy: { updatedAt: 'desc' }
          },
          invoices: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (profiles.length > 0) {
        return profiles;
      }
    }

    // Fallback for demo/admin testing if any studentProfile has guardianEmail or guardianUserId set
    return prisma.studentProfile.findMany({
      where: {
        OR: [
          { guardianEmail: { not: null } },
          { guardianUserId: { not: null } }
        ]
      },
      take: 3,
      include: {
        user: true,
        program: {
          include: {
            department: { include: { faculty: true } },
            faculty: true,
          }
        },
        academicStandings: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
        registrations: {
          orderBy: { createdAt: 'desc' },
          include: {
            courses: {
              include: {
                offering: {
                  include: { course: true }
                }
              }
            },
            advisor: {
              include: { user: true }
            }
          }
        },
        grades: {
          include: {
            offering: {
              include: { course: true }
            }
          },
          orderBy: { updatedAt: 'desc' }
        },
        invoices: {
          orderBy: { createdAt: 'desc' }
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
