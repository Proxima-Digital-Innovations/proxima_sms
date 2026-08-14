import { prisma } from '@/lib/prisma';

export class CalendarRepository {
    static async getEvents() {
        return prisma.calendarEvent.findMany({
            where: {},
            orderBy: { startDate: 'asc' }
        });
    }

    static async addEvent(data: any) {
        return prisma.calendarEvent.create({
            data
        });
    }

    static async deleteEvent(id: string, ) {
        return prisma.calendarEvent.delete({
            where: { id }
        });
    }
}
