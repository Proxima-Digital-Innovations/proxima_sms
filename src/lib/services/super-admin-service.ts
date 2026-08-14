import { SuperAdminRepository } from '../dal/super-admin-repository';
import bcrypt from "bcryptjs";

export class SuperAdminService {
  private repo = new SuperAdminRepository();

  async createSchool(validatedData: any) {
    const existingSchool = await this.repo.getSchoolBySubdomainOrSlug(validatedData.subdomain);
    if (existingSchool) {
      return { success: false, error: "Subdomain or slug already in use" };
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validatedData.trialDays);

    const school = await this.repo.createSchool({
      name: validatedData.name,
      subdomain: validatedData.subdomain,
      slug: validatedData.subdomain,
      primaryColor: validatedData.primaryColor,
      secondaryColor: validatedData.secondaryColor,
      licenseStatus: 'TRIAL',
      expiresAt: expiresAt,
      maxUsers: 50,
      maxStudents: 500
    });

    const session = await this.repo.createAcademicSession({
      name: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
      isActive: true,
      startDate: new Date(),
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    });

    await this.repo.createTerm({
      sessionId: session.id,
      name: "First Term",
      isActive: true,
      startDate: new Date(),
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
    });

    const passwordHash = await bcrypt.hash('password123', 10);
    await this.repo.createUser({
      firstName: "Admin",
      lastName: "User",
      email: `admin@${validatedData.subdomain}.proximahub.com`,
      passwordHash: passwordHash,
      role: "ADMIN",
      status: "active",
    });

    return { success: true, school };
  }

  async updateSchoolLicense(data: { licenseStatus: string, expiresAt: string, activeModules: string[] }) {
    await this.repo.updateSchoolLicense({
      licenseStatus: data.licenseStatus,
      expiresAt: new Date(data.expiresAt),
      activeModules: JSON.stringify(data.activeModules)
    });
    return { success: true };
  }
}
