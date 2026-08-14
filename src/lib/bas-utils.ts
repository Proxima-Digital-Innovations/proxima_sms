import { format, startOfDay } from 'date-fns';

export function getExpectedClockIn(staff: any): string {
    if (staff.shift?.startTime) return staff.shift.startTime;
    return staff.clockInTime || '08:00';
}

export function getExpectedClockOut(staff: any): string {
    if (staff.shift?.endTime) return staff.shift.endTime;
    return staff.clockOutTime || '17:00';
}

export function getGracePeriod(staff: any): number {
    if (staff.gracePeriod != null) return staff.gracePeriod;
    if (staff.shift?.gracePeriod != null) return staff.shift.gracePeriod;
    return 15;
}

export function timeToMinutes(time: string): number {
    if (!time) return 0;
    const parts = time.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || '0', 10);
}

export function isLate(record: any, staff: any): boolean {
    if (!record.timeIn || !staff) return false;
    try {
        const clockInMinutes = timeToMinutes(record.timeIn);
        const expectedMinutes = timeToMinutes(getExpectedClockIn(staff));
        const grace = getGracePeriod(staff);
        return clockInMinutes > (expectedMinutes + grace);
    } catch {
        return false;
    }
}

export function calculateDurationHours(record: any): number {
    if (!record.timeIn) return 0;
    let timeOutStr = record.timeOut;
    if (!timeOutStr) {
        const recordDate = new Date(record.date || new Date());
        if (recordDate < startOfDay(new Date())) {
            timeOutStr = '17:00';
        } else {
            return 0;
        }
    }
    const inMins = timeToMinutes(record.timeIn);
    const outMins = timeToMinutes(timeOutStr);
    if (outMins <= inMins) return 0;
    const diff = (outMins - inMins) / 60;
    return diff > 18 ? 8 : Math.round(diff * 10) / 10;
}

export function formatDuration(hours: number): string {
    if (hours <= 0) return '-';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
}

export function calculateOvertimeHours(record: any, staff: any, holidayDates: string[]): number {
    if (!record.timeIn || !record.timeOut || !staff) return 0;

    const dateStr = format(new Date(record.date || new Date()), 'yyyy-MM-dd');
    const dayOfWeekIso = (new Date(record.date || new Date())).getDay(); 
    const isoDay = dayOfWeekIso === 0 ? 7 : dayOfWeekIso;
    const restDays = (staff.restDays || '6,7').split(',').map((d: string) => parseInt(d.trim()));
    const isHoliday = holidayDates.includes(dateStr);
    const isRestDay = restDays.includes(isoDay);

    const inMins = timeToMinutes(record.timeIn);
    const outMins = timeToMinutes(record.timeOut);
    if (outMins <= inMins) return 0;
    const durationHours = (outMins - inMins) / 60;

    if (isHoliday || isRestDay) {
        return Math.min(12, Math.round(durationHours * 100) / 100);
    }

    const expectedOutMins = timeToMinutes(getExpectedClockOut(staff));
    const threshold = expectedOutMins + 30;

    if (outMins > threshold) {
        return Math.round(((outMins - expectedOutMins) / 60) * 100) / 100;
    }

    return 0;
}
