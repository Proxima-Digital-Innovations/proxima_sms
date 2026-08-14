import { prisma } from "@/lib/prisma";

export class BehaviouralRepository {
  async createIncident(data: {
    studentId: string;
    title: string;
    severity: string;
    description: string;
    reporterId: string;
  }) {
    return prisma.behavioralIncident.create({ data });
  }

  async findIncidentById(id: string) {
    return prisma.behavioralIncident.findUnique({ where: { id } });
  }

  async resolveIncident(incidentId: string, actionTaken: string) {
    return prisma.behavioralIncident.update({
      where: { id: incidentId },
      data: {
        status: 'RESOLVED',
        actions: {
          create: {
            actionTaken: actionTaken
          }
        }
      }
    });
  }
}
