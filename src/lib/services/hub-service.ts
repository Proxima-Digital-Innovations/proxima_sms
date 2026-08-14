import { HubRepository } from "../dal/hub-repository";

const hubRepository = new HubRepository();

export class HubService {
  async getHubStats() {
    const [totalSchools, totalUsers, totalStudents, totalTeachers, recentSchools] = await Promise.all([
      hubRepository.countSchools(),
      hubRepository.countUsers(),
      hubRepository.countStudents(),
      hubRepository.countTeachers(),
      hubRepository.getRecentSchools(5)
    ]);

    return {
      totalSchools,
      totalUsers,
      totalStudents,
      totalTeachers,
      recentSchools,
    };
  }

  async getAllSchools() {
    return hubRepository.getAllSchools();
  }

  async createTenant(data: { name: string; slug: string; email: string; phone: string; address: string }) {
    return hubRepository.createSchool(data);
  }
}
