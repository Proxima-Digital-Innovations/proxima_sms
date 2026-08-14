import { prisma } from "@/lib/prisma";

export class DisciplineRepository {
  async getRecentIncidents(limit: number) {
    return await prisma.behavioralIncident.findMany({
      where: {},
      take: limit,
      orderBy: { date: 'desc' },
      include: {
        student: { select: { firstName: true, lastName: true, studentId: true } },
        reporter: { select: { firstName: true, lastName: true } },
        actions: true
      }
    });
  }

  async getStudentIncidents(studentId: string) {
    return await prisma.behavioralIncident.findMany({
      where: { studentId },
      orderBy: { date: 'desc' },
      include: {
        reporter: { select: { firstName: true, lastName: true } },
        actions: { orderBy: { date: 'desc' } }
      }
    });
  }
  
  async getAdminReporter() {
    return await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  }

  async createIncident(reporterId: string, data: any) {
    return await prisma.behavioralIncident.create({
      data: {
        reporterId,
        ...data,
      }
    });
  }

  async createIncidentAction(incidentId: string, actionTaken: string, details?: string) {
    return await prisma.incidentAction.create({
      data: {
        incidentId,
        actionTaken,
        details
      }
    });
  }

  async updateIncidentStatus(incidentId: string, status: string) {
    return await prisma.behavioralIncident.update({
      where: { id: incidentId },
      data: { status }
    });
  }
}
