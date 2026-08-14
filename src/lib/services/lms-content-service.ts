import { LmsContentRepository } from '../dal/lms-content-repository';

const repository = new LmsContentRepository();

export class LmsContentService {
  async getLmsCourses(subjectId?: string, classId?: string) {
    return await repository.findModules(subjectId, classId);
  }

  async createLmsModule(title: string, subjectId: string, classId: string, order: number = 0) {
    return await repository.createModule({ title, subjectId, classId, order });
  }

  async addLmsContent(moduleId: string, title: string, type: string, url?: string, body?: string, order: number = 0) {
    return await repository.createContent({ moduleId, title, type, url, body, order });
  }

  async deleteLmsModule(moduleId: string) {
    await repository.deleteContentByModuleId(moduleId);
    await repository.deleteModule(moduleId);
  }
}
