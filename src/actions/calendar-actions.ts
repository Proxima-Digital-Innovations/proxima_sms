'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getCalendarEvents() {
    try {
        const events = await prisma.calendarEvent.findMany({
            orderBy: { startDate: 'asc' }
        });
        
        return { success: true, data: events };
    } catch (error: any) {
        console.error('Error fetching calendar events:', error);
        return { success: false, error: error.message };
    }
}

export async function addCalendarEvent(data: {
    title: string;
    description?: string;
    eventType: string;
    startDate: Date;
    endDate?: Date;
}) {
    try {
        await prisma.calendarEvent.create({
            data: {
                title: data.title,
                description: data.description,
                eventType: data.eventType,
                startDate: data.startDate,
                endDate: data.endDate
            }
        });

        revalidatePath('/dashboard/system/academic-year');
        return { success: true };
    } catch (error: any) {
        console.error('Error adding calendar event:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteCalendarEvent(id: string) {
    try {
        await prisma.calendarEvent.delete({
            where: { id }
        });

        revalidatePath('/dashboard/system/academic-year');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting calendar event:', error);
        return { success: false, error: error.message };
    }
}
