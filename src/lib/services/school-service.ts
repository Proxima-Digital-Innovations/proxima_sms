import { SchoolRepository } from "../dal/school-repository";

const schoolRepository = new SchoolRepository();

export class SchoolService {
  async getSchoolInfo() {
    const school = await schoolRepository.getSchoolById();
    if (!school) {
      throw new Error('School not found');
    }
    return school;
  }

  async updateSchoolInfo(data: { name: string; address?: string; phone?: string; email?: string; logoUrl?: string }) {
    return schoolRepository.updateSchool(data);
  }
}
