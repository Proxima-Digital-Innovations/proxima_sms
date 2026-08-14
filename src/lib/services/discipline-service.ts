import { DisciplineRepository } from '../dal/discipline-repository';

export class DisciplineService {
  private repo = new DisciplineRepository();

  async getRecentIncidents(limit: number = 50) {
    return await this.repo.getRecentIncidents(limit);
  }

  async getStudentIncidents(studentId: string) {
    return await this.repo.getStudentIncidents(studentId);
  }

  async logIncident(data: any) {
    const defaultReporter = await this.repo.getAdminReporter();
    if (!defaultReporter) throw new Error("No reporter found.");

    return await this.repo.createIncident(defaultReporter.id, data);
  }

  async addIncidentAction(incidentId: string, actionTaken: string, details?: string) {
    return await this.repo.createIncidentAction(incidentId, actionTaken, details);
  }

  async updateIncidentStatus(incidentId: string, status: string) {
    return await this.repo.updateIncidentStatus(incidentId, status);
  }
}
