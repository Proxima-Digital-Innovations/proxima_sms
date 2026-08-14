import { prisma } from "@/lib/prisma";

export class HealthRepository {
  async getStudentHealthRecord(studentId: string) {
    return await prisma.healthRecord.findUnique({
      where: { studentId },
      include: {
        immunizations: { orderBy: { dateGiven: 'desc' } },
        clinicVisits: { 
          orderBy: { date: 'desc' },
          include: { nurse: true }
        },
        student: true
      }
    });
  }

  async createStudentHealthRecord(studentId: string, ) {
    return await prisma.healthRecord.create({
      data: { studentId },
      include: {
        immunizations: true,
        clinicVisits: { include: { nurse: true } },
        student: true
      }
    });
  }

  async updateHealthProfile(studentId: string, data: any, ) {
    return await prisma.healthRecord.update({
      where: { studentId },
      data: { ...data }
    });
  }

  async logClinicVisit(healthRecordId: string, data: any) {
    return await prisma.clinicVisit.create({
      data: {
        healthRecordId,
        ...data,
      }
    });
  }

  async addImmunization(healthRecordId: string, data: any) {
    return await prisma.immunization.create({
      data: {
        healthRecordId,
        ...data
      }
    });
  }

  async getStudentsForHealthDashboard(searchQuery?: string) {
    return await prisma.student.findMany({
      where: {
        ...(searchQuery ? {
          OR: [
            { firstName: { contains: searchQuery } },
            { lastName: { contains: searchQuery } },
            { studentId: { contains: searchQuery } }
          ]
        } : {})
      },
      include: {
        healthRecord: {
          select: { allergies: true, chronicIllness: true }
        },
        class: true
      },
      take: 50,
      orderBy: { lastName: 'asc' }
    });
  }
}
