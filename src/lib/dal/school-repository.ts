import { prisma } from "@/lib/prisma";

export class SchoolRepository {
  async getSchoolById() {
    return prisma.systemProfile.findFirst({
      select: { name: true, address: true, phone: true, email: true, logoUrl: true }
    });
  }

  async updateSchool(data: { name: string; address?: string; phone?: string; email?: string; logoUrl?: string }) {
    const profile = await prisma.systemProfile.findFirst();
    if (!profile) return null;
    return prisma.systemProfile.update({
      where: { id: profile.id },
      data
    });
  }
}
