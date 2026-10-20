import { prisma } from '@/lib/prisma';
import { STAFF_FILTER } from './staff-repository';

export class HrRepository {
    async getLeaveRequests() {
        return prisma.leaveRequest.findMany({
            where: {},
            include: {
                user: { select: { id: true, firstName: true, lastName: true, role: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async createLeaveRequest(data: any) {
        return prisma.leaveRequest.create({ data });
    }

    async updateLeaveStatus(id: string, status: string) {
        return prisma.leaveRequest.update({
            where: { id },
            data: { status }
        });
    }

    async getApprovedLeavesCoveringDate(date: Date) {
        return prisma.leaveRequest.findMany({
            where: {
                status: 'APPROVED',
                startDate: { lte: date },
                endDate: { gte: date }
            }
        });
    }

    async getActiveTerm() {
        return prisma.term.findFirst({ where: { isActive: true } });
    }

    async getOrphanedClasses(termId: string, dbDay: number, absentTeacherIds: string[], date: Date) {
        return prisma.timetable.findMany({
            where: {
                termId,
                dayOfWeek: dbDay,
                teacherId: { in: absentTeacherIds }
            },
            include: {
                class: true,
                subject: true,
                room: true,
                teacher: true,
                substitutes: {
                    where: { date }
                }
            },
            orderBy: { startTime: 'asc' }
        });
    }

    async getAvailableTeachers(onLeaveIds: string[]) {
        return prisma.user.findMany({
            where: { 
                role: 'TEACHER',
                id: { notIn: onLeaveIds }
            },
            select: { id: true, firstName: true, lastName: true }
        });
    }

    async assignSubstitute(data: any) {
        return prisma.substituteAssignment.create({ data });
    }

    async getStaffProfiles() {
        return prisma.user.findMany({
            where: STAFF_FILTER,
            include: {
                department: true,
                contracts: true
            },
            orderBy: { lastName: 'asc' }
        });
    }
}
