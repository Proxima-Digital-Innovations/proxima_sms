import { prisma } from "@/lib/prisma";

export class SuperAdminRepository {
  async getSchoolBySubdomainOrSlug(name: string) {
    return await prisma.systemProfile.findFirst({
      where: {
        name: name
      }
    });
  }

  async createSchool(data: any) {
    return await prisma.systemProfile.create({ data });
  }

  async createAcademicSession(data: any) {
    return await prisma.academicSession.create({ data });
  }

  async createTerm(data: any) {
    return await prisma.term.create({ data });
  }

  async createUser(data: any) {
    return await prisma.user.create({ data });
  }

  async updateSchoolLicense(data: any) {
    const profile = await prisma.systemProfile.findFirst();
    if (!profile) throw new Error("No system profile found");
    return await prisma.systemProfile.update({
      where: { id: profile.id },
      data
    });
  }
}
