import { prisma } from "@/lib/prisma";

export class LmsContentRepository {
  async findModules(subjectId?: string, classId?: string) {
    return await prisma.lmsModule.findMany({
      where: {
        ...(subjectId && { subjectId }),
        ...(classId && { classId })
      },
      include: {
        subject: true,
        class: true,
        content: {
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { order: 'asc' }
    });
  }

  async createModule(data: any) {
    return await prisma.lmsModule.create({ data });
  }

  async createContent(data: any) {
    return await prisma.lmsContent.create({ data });
  }

  async deleteContentByModuleId(moduleId: string, ) {
    return await prisma.lmsContent.deleteMany({ where: { moduleId } });
  }

  async deleteModule(moduleId: string, ) {
    return await prisma.lmsModule.delete({ where: { id: moduleId } });
  }
}
