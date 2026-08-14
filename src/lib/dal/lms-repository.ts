import { prisma } from '@/lib/prisma';

export class LmsRepository {
    async findLessonNotes(role: string, teacherId?: string) {
        let whereClause: any = {};
        if (role === 'TEACHER' && teacherId) {
            whereClause.teacherId = teacherId;
        }

        return await prisma.lessonNote.findMany({
            where: whereClause,
            include: {
                teacher: { select: { firstName: true, lastName: true } },
                subject: { select: { name: true } },
                class: { select: { name: true } }
            },
            orderBy: { submissionDate: 'desc' }
        });
    }

    async findSubjectByName(name: string) {
        return await prisma.subject.findFirst({ where: { name } });
    }

    async findClassByName(name: string) {
        return await prisma.class.findFirst({ where: { name } });
    }

    async createLessonNote(data: any) {
        return await prisma.lessonNote.create({
            data
        });
    }

    async findLessonNoteById(id: string, ) {
        return await prisma.lessonNote.findUnique({
            where: { id },
            include: {
                teacher: { select: { firstName: true, lastName: true, email: true } },
                subject: { select: { name: true } },
                class: { select: { name: true } }
            }
        });
    }

    async updateLessonNote(id: string, data: any) {
        return await prisma.lessonNote.update({
            where: { id },
            data
        });
    }
}
