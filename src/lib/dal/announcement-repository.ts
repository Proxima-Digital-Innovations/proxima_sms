import { prisma } from "@/lib/prisma";

export class AnnouncementRepository {
  async getAnnouncement(id: string) {
    return prisma.announcement.findUnique({ where: { id } });
  }

  async createAnnouncement(data: any) {
    return prisma.announcement.create({ data });
  }

  async updateAnnouncement(id: string, data: any) {
    return prisma.announcement.update({ where: { id }, data });
  }

  async deleteAnnouncement(id: string) {
    return prisma.announcement.delete({ where: { id } });
  }
}
