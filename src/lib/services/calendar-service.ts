import { CalendarRepository } from '../dal/calendar-repository';

export class CalendarService {
    static async getCalendarEvents() {
        return CalendarRepository.getEvents();
    }

    static async addCalendarEvent(data: {
        title: string;
        description?: string;
        eventType: string;
        startDate: Date;
        endDate?: Date;
    }) {
        return CalendarRepository.addEvent({
            title: data.title,
            description: data.description,
            eventType: data.eventType,
            startDate: data.startDate,
            endDate: data.endDate
        });
    }

    static async deleteCalendarEvent(id: string, ) {
        return CalendarRepository.deleteEvent(id);
    }
}
