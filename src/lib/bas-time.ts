import { formatInTimeZone, toDate, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { startOfDay, endOfDay, format, getDay, differenceInMinutes, parse, eachDayOfInterval } from 'date-fns';

const DEFAULT_TIMEZONE = 'Africa/Lagos';

export function getLocalNow(): Date {
    return toZonedTime(new Date(), DEFAULT_TIMEZONE);
}

export function getLocalStartOfDay(dateStr?: string): Date {
    const targetDate = dateStr ? parse(dateStr, 'yyyy-MM-dd', new Date()) : new Date();
    return toZonedTime(startOfDay(targetDate), DEFAULT_TIMEZONE);
}

export function getLocalEndOfDay(dateStr?: string): Date {
    const targetDate = dateStr ? parse(dateStr, 'yyyy-MM-dd', new Date()) : new Date();
    return toZonedTime(endOfDay(targetDate), DEFAULT_TIMEZONE);
}

export function formatLocalDate(date: Date, formatStr: string = 'yyyy-MM-dd'): string {
    return formatInTimeZone(date, DEFAULT_TIMEZONE, formatStr);
}

export function getLocalDayOfWeek(date: Date): number {
    return getDay(toZonedTime(date, DEFAULT_TIMEZONE));
}
