import { AcademicTermRepository } from '../dal/academic-term-repository';

const repo = new AcademicTermRepository();

export class AcademicTermService {
  async createSession(data: { name: string, startDate: Date, endDate: Date, isActive: boolean }, ) {
    if (data.isActive) {
      await repo.deactivateSessions();
    }
    return await repo.createSession({ ...data });
  }

  async createTerm(data: { name: string, sessionId: string, startDate: Date, endDate: Date, isActive: boolean }, ) {
    if (data.isActive) {
      await repo.deactivateTerms();
    }
    return await repo.createTerm({ ...data });
  }

  async getAcademicCalendar() {
    return await repo.getSessionsWithTerms();
  }

  async setSessionActive(id: string) {
    return await repo.setSessionActive(id);
  }

  async setTermActive(id: string) {
    return await repo.setTermActive(id);
  }
}
