import { HealthRepository } from '../dal/health-repository';

export class HealthService {
  private repo = new HealthRepository();

  async getStudentHealthRecord(studentId: string, ) {
    let record = await this.repo.getStudentHealthRecord(studentId);
    if (!record) {
      record = await this.repo.createStudentHealthRecord(studentId);
    }
    return record;
  }

  async updateHealthProfile(studentId: string, data: any, ) {
    return await this.repo.updateHealthProfile(studentId, data);
  }

  async logClinicVisit(healthRecordId: string, data: any) {
    return await this.repo.logClinicVisit(healthRecordId, data);
  }

  async addImmunization(healthRecordId: string, data: any) {
    return await this.repo.addImmunization(healthRecordId, data);
  }

  async getStudentsForHealthDashboard(searchQuery?: string) {
    return await this.repo.getStudentsForHealthDashboard(searchQuery);
  }
}
