import { prisma } from '@/lib/prisma';

export class SubmissionRepository {
    async getTeacher(id: string) {
        return await prisma.user.findUnique({
            where: { id },
            select: { id: true, firstName: true, lastName: true },
        });
    }

    async getActiveTerm() {
        return await prisma.term.findFirst({
            where: { isActive: true },
            select: { id: true },
        });
    }

    async getSubjectByName(name: string, ) {
        return await prisma.subject.findFirst({
            where: { name },
            select: { id: true },
        });
    }

    async getClassByName(name: string, ) {
        return await prisma.class.findFirst({
            where: { name },
            select: { id: true },
        });
    }

    async createLessonNote(data: any) {
        return await prisma.lessonNote.create({ data });
    }
}
