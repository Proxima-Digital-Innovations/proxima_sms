import { prisma } from '@/lib/prisma';

export class UploadRepository {
    async findSubject(idOrName: string) {
        return await prisma.subject.findFirst({
            where: {
                OR: [
                    { id: idOrName },
                    { name: idOrName }
                ]
            }
        });
    }

    async getFirstSchool() {
        return await prisma.systemProfile.findFirst();
    }

    async createSubject(name: string) {
        return await prisma.subject.create({
            data: {
                name: name
            }
        });
    }

    async findTerm(term: string) {
        return await prisma.term.findFirst({
            where: {
                OR: [
                    { id: term },
                    { name: term },
                    { name: term.replace("First Term", "Term 1").replace("Second Term", "Term 2").replace("Third Term", "Term 3") },
                    { name: term.replace("Term 1", "First Term").replace("Term 2", "Second Term").replace("Term 3", "Third Term") }
                ]
            }
        });
    }

    async findStudent(idOrStudentId: string) {
        return await prisma.student.findFirst({
            where: {
                OR: [
                    { id: idOrStudentId },
                    { studentId: idOrStudentId }
                ]
            }
        });
    }

    async upsertTermGrade(studentId: string, subjectId: string, termId: string, ca1: number, exam: number, total: number, grade: string) {
        return await prisma.termGrade.upsert({
            where: {
                studentId_subjectId_termId: {
                    studentId,
                    subjectId,
                    termId
                }
            },
            update: {
                ca1,
                exam,
                total,
                grade
            },
            create: {
                studentId,
                subjectId,
                termId,
                ca1,
                exam,
                total,
                grade
            }
        });
    }

    async upsertMidtermResult(studentId: string, subjectId: string, termId: string, score: number, achievement: string, session: string) {
        return await prisma.midtermResult.upsert({
            where: {
                studentId_subjectId_termId: {
                    studentId,
                    subjectId,
                    termId
                }
            },
            update: {
                score,
                achievement,
                session
            },
            create: {
                studentId,
                subjectId,
                termId,
                session,
                score,
                achievement
            }
        });
    }

    async findStudentsByClassLevel(classLevel: string) {
        return await prisma.student.findMany({
            where: {
                class: {
                    name: classLevel
                },
                status: 'Active'
            }
        });
    }
}
