'use server';
import { getExpectedClockIn, getExpectedClockOut, getGracePeriod, timeToMinutes, isLate, calculateDurationHours, formatDuration, calculateOvertimeHours } from '@/lib/bas-utils';

import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay, format, parseISO, differenceInMinutes, addMinutes, isAfter, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import { revalidatePath } from 'next/cache';

// ─── BAS UTILITY FUNCTIONS ────────────────────────────────────────────────────

/**
 * Determine the expected clock-in time for a staff member.
 * Hierarchy: Shift.startTime -> User.clockInTime -> default '08:00'
 */
export async function getHolidayDates(start: string, end: string): Promise<string[]> {
    const holidays = await prisma.holiday.findMany({
        where: {
            startDate: { lte: new Date(end) },
            endDate: { gte: new Date(start) }
        }
    });
    const dates: string[] = [];
    for (const h of holidays) {
        const days = eachDayOfInterval({
            start: new Date(Math.max(h.startDate.getTime(), new Date(start).getTime())),
            end: new Date(Math.min(h.endDate.getTime(), new Date(end).getTime()))
        });
        for (const d of days) {
            dates.push(format(d, 'yyyy-MM-dd'));
        }
    }
    return [...new Set(dates)];
}

// ─── DASHBOARD STATS ──────────────────────────────────────────────────────────

export async function getBasDashboardStats(dateStr?: string) {
    try {
        const viewDate = dateStr || format(new Date(), 'yyyy-MM-dd');
        const dayStart = startOfDay(new Date(viewDate));
        const dayEnd = endOfDay(new Date(viewDate));

        const totalActiveStaff = await prisma.user.count({ where: { status: 'active' } });

        const todaysLogs = await prisma.staffAttendance.findMany({
            where: { date: { gte: dayStart, lte: dayEnd } },
            include: { staff: { include: { shift: true } } }
        });

        const clockIns = todaysLogs.filter(r => r.type === 1);
        const presentStaffIds = [...new Set(clockIns.map(r => r.staffId))];
        const presentCount = presentStaffIds.length;

        let lateCount = 0;
        for (const record of clockIns) {
            if (record.isLate || isLate(record, record.staff)) lateCount++;
        }

        const holidayDates = await getHolidayDates(viewDate, viewDate);
        const isHoliday = holidayDates.includes(viewDate);
        const dayOfWeek = getDay(new Date(viewDate));
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        let absentCount = 0;
        if (!isHoliday && !isWeekend) {
            const isoDay = dayOfWeek === 0 ? 7 : dayOfWeek;
            const allActive = await prisma.user.findMany({
                where: { status: 'active' },
                select: { id: true, restDays: true }
            });
            absentCount = allActive.filter(u => {
                if (presentStaffIds.includes(u.id)) return false;
                const restDays = (u.restDays || '6,7').split(',').map(d => parseInt(d.trim()));
                return !restDays.includes(isoDay);
            }).length;
        }

        const enrolledCount = await prisma.user.count({
            where: { OR: [{ biometricTemplate: { not: null } }, { kioskPin: { not: null } }] }
        });

        const activeKiosks = await prisma.kiosk.count({ where: { isActive: true } });

        const presenceRate = totalActiveStaff > 0 ? Math.round((presentCount / totalActiveStaff) * 100) : 0;

        return {
            success: true,
            data: { presenceRate, lateCount, presentCount, absentCount, enrolledCount, activeKiosks, totalActiveStaff, isHoliday, isWeekend }
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ─── ATTENDANCE LOGS (DASHBOARD TABLE) ────────────────────────────────────────

export async function getAttendanceLogs(dateStr: string, status?: string, departmentId?: string) {
    try {
        const dayStart = startOfDay(new Date(dateStr));
        const dayEnd = endOfDay(new Date(dateStr));

        if (status === 'absent') {
            return getAbsentStaff(dateStr, departmentId);
        }

        if (status === 'enrolled') {
            return getEnrolledStaff();
        }

        const where: any = { date: { gte: dayStart, lte: dayEnd } };

        const logs = await prisma.staffAttendance.findMany({
            where,
            include: {
                staff: { include: { shift: true, department: true } },
                kiosk: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        const enriched = logs.map(record => {
            const late = record.isLate || (record.type === 1 && isLate(record, record.staff));
            const duration = record.durationHours || calculateDurationHours(record);
            return {
                id: record.id,
                staffName: `${record.staff.firstName} ${record.staff.lastName}`,
                staffId: record.staff.staffId,
                department: record.staff.department?.name || 'N/A',
                timeIn: record.timeIn,
                timeOut: record.timeOut,
                duration: formatDuration(duration),
                durationHours: duration,
                isLate: late,
                type: record.type,
                source: record.source,
                kioskName: record.kiosk?.name || 'Manual',
                isDisputed: record.isDisputed
            };
        });

        const filtered = status === 'late' ? enriched.filter(r => r.isLate && r.type === 1) : enriched;

        return { success: true, data: filtered, type: 'logs' };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ─── ABSENT STAFF ─────────────────────────────────────────────────────────────

export async function getAbsentStaff(dateStr: string, departmentId?: string) {
    try {
        const dayStart = startOfDay(new Date(dateStr));
        const dayEnd = endOfDay(new Date(dateStr));

        const presentStaffIds = await prisma.staffAttendance.findMany({
            where: { date: { gte: dayStart, lte: dayEnd } },
            distinct: ['staffId'],
            select: { staffId: true }
        });
        const presentIds = presentStaffIds.map(r => r.staffId);

        const dayOfWeek = getDay(new Date(dateStr));
        const isoDay = dayOfWeek === 0 ? 7 : dayOfWeek;

        const where: any = {
            status: 'active',
            NOT: { id: { in: presentIds } }
        };
        if (departmentId) where.departmentId = departmentId;

        const absentStaff = await prisma.user.findMany({
            where,
            select: {
                id: true, firstName: true, lastName: true, staffId: true, restDays: true,
                department: { select: { name: true } }
            }
        });

        const filtered = absentStaff.filter(s => {
            const restDays = (s.restDays || '6,7').split(',').map(d => parseInt(d.trim()));
            return !restDays.includes(isoDay);
        });

        return { success: true, data: filtered.map(s => ({
            id: s.id,
            staffName: `${s.firstName} ${s.lastName}`,
            staffId: s.staffId,
            department: s.department?.name || 'N/A'
        })), type: 'absent' };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ─── ENROLLED STAFF ───────────────────────────────────────────────────────────

export async function getEnrolledStaff() {
    try {
        const staff = await prisma.user.findMany({
            where: { OR: [{ biometricTemplate: { not: null } }, { kioskPin: { not: null } }, { isBiometricEnrolled: true }] },
            select: {
                id: true, firstName: true, lastName: true, email: true, role: true, staffId: true,
                kioskPin: true, biometricTemplate: true, isBiometricEnrolled: true,
                department: { select: { name: true } }
            },
            orderBy: { firstName: 'asc' }
        });
        return { success: true, data: staff, type: 'enrolled' };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ─── ATTENDANCE REPORT (Date Range) ───────────────────────────────────────────

export async function getAttendanceReport(startDate: string, endDate: string, staffId?: string, departmentId?: string) {
    try {
        const where: any = {
            date: { gte: new Date(startDate), lte: endOfDay(new Date(endDate)) }
        };
        if (staffId) where.staffId = staffId;
        if (departmentId) {
            where.staff = { departmentId };
        }

        const records = await prisma.staffAttendance.findMany({
            where,
            include: {
                staff: { include: { shift: true, department: true } },
                kiosk: { select: { name: true } }
            },
            orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
        });

        let lateCount = 0;
        let totalHours = 0;
        const enriched = records.map(record => {
            const late = record.type === 1 && isLate(record, record.staff);
            if (late) lateCount++;
            const duration = calculateDurationHours(record);
            totalHours += duration;
            return {
                id: record.id,
                staffName: `${record.staff.firstName} ${record.staff.lastName}`,
                staffId: record.staff.staffId,
                department: record.staff.department?.name || 'N/A',
                date: format(new Date(record.date), 'yyyy-MM-dd'),
                timeIn: record.timeIn,
                timeOut: record.timeOut,
                duration: formatDuration(duration),
                durationHours: duration,
                isLate: late,
                source: record.source,
                kioskName: record.kiosk?.name || 'Manual'
            };
        });

        const totalLogs = records.length;
        const lateRate = totalLogs > 0 ? Math.round((lateCount / totalLogs) * 1000) / 10 : 0;
        const uniqueStaff = [...new Set(records.map(r => r.staffId))].length;

        return {
            success: true,
            data: enriched,
            periodStats: {
                totalLogs,
                lateCount,
                lateRate,
                staffCount: uniqueStaff,
                totalHours: Math.round(totalHours * 10) / 10
            }
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ─── LEADERBOARD ──────────────────────────────────────────────────────────────

export async function getLeaderboard(month: number, year: number) {
    try {
        const start = startOfMonth(new Date(year, month - 1));
        const end = new Date() < endOfMonth(start) ? new Date() : endOfMonth(start);

        const staff = await prisma.user.findMany({
            where: { status: 'active' },
            include: { shift: true, department: true }
        });

        const allRecords = await prisma.staffAttendance.findMany({
            where: {
                date: { gte: start, lte: end },
                type: 1
            }
        });

        const recordsByStaff = new Map<string, any[]>();
        for (const r of allRecords) {
            if (!recordsByStaff.has(r.staffId)) recordsByStaff.set(r.staffId, []);
            recordsByStaff.get(r.staffId)!.push(r);
        }

        const leaderboard = staff.map(s => {
            const records = recordsByStaff.get(s.id) || [];
            const totalDays = records.length;
            if (totalDays === 0) return { id: s.id, name: `${s.firstName} ${s.lastName}`, department: s.department?.name || 'N/A', punctualityScore: 0, totalWorkingDays: 0 };

            let onTimeDays = 0;
            for (const r of records) {
                if (!isLate(r, s)) onTimeDays++;
            }

            return {
                id: s.id,
                name: `${s.firstName} ${s.lastName}`,
                department: s.department?.name || 'N/A',
                punctualityScore: Math.round((onTimeDays / totalDays) * 100),
                totalWorkingDays: totalDays
            };
        })
        .filter(s => s.totalWorkingDays > 0)
        .sort((a, b) => b.punctualityScore - a.punctualityScore);

        return { success: true, data: leaderboard };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ─── INCOMPLETE LOGS ──────────────────────────────────────────────────────────

export async function getIncompleteLogs() {
    try {
        const today = startOfDay(new Date());
        const logs = await prisma.staffAttendance.findMany({
            where: {
                timeIn: { not: null },
                timeOut: null,
                date: { lt: today }
            },
            include: {
                staff: { select: { firstName: true, lastName: true, staffId: true, department: { select: { name: true } } } },
                kiosk: { select: { name: true } }
            },
            orderBy: { date: 'desc' },
            take: 100
        });

        return {
            success: true,
            data: logs.map(l => ({
                id: l.id,
                staffName: `${l.staff.firstName} ${l.staff.lastName}`,
                staffId: l.staff.staffId,
                department: l.staff.department?.name || 'N/A',
                date: format(new Date(l.date), 'yyyy-MM-dd'),
                timeIn: l.timeIn,
                kioskName: l.kiosk?.name || 'Manual'
            }))
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ─── OVERTIME REPORT ──────────────────────────────────────────────────────────

export async function getOvertimeReport(month: number, year: number) {
    try {
        const start = startOfMonth(new Date(year, month - 1));
        const end = endOfMonth(start);
        const startStr = format(start, 'yyyy-MM-dd');
        const endStr = format(end, 'yyyy-MM-dd');

        const holidayDates = await getHolidayDates(startStr, endStr);

        const records = await prisma.staffAttendance.findMany({
            where: {
                date: { gte: start, lte: end },
                timeIn: { not: null },
                timeOut: { not: null }
            },
            include: { staff: { include: { shift: true, department: true } } }
        });

        const overtimeByStaff = new Map<string, { staff: any, totalHours: number, records: any[] }>();

        for (const record of records) {
            const otHours = calculateOvertimeHours(record, record.staff, holidayDates);
            if (otHours > 0) {
                if (!overtimeByStaff.has(record.staffId)) {
                    overtimeByStaff.set(record.staffId, {
                        staff: { name: `${record.staff.firstName} ${record.staff.lastName}`, staffId: record.staff.staffId, department: record.staff.department?.name || 'N/A' },
                        totalHours: 0,
                        records: []
                    });
                }
                const entry = overtimeByStaff.get(record.staffId)!;
                entry.totalHours += otHours;
                entry.records.push({
                    date: format(new Date(record.date), 'yyyy-MM-dd'),
                    timeIn: record.timeIn,
                    timeOut: record.timeOut,
                    hours: Math.round(otHours * 100) / 100
                });
            }
        }

        const data = [...overtimeByStaff.values()].sort((a, b) => b.totalHours - a.totalHours)
            .map(d => ({ ...d, totalHours: Math.round(d.totalHours * 10) / 10 }));

        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ─── OFF-DAY REPORT ───────────────────────────────────────────────────────────

export async function getOffDayReport(startDate: string, endDate: string) {
    try {
        const holidayDates = await getHolidayDates(startDate, endDate);

        const records = await prisma.staffAttendance.findMany({
            where: { date: { gte: new Date(startDate), lte: endOfDay(new Date(endDate)) } },
            include: { staff: { include: { shift: true, department: true } } },
            orderBy: { date: 'desc' }
        });

        const offDayRecords = records.filter(record => {
            const dateStr = format(new Date(record.date), 'yyyy-MM-dd');
            const dayOfWeek = getDay(new Date(record.date));
            const isoDay = dayOfWeek === 0 ? 7 : dayOfWeek;
            const isHoliday = holidayDates.includes(dateStr);
            const restDays = (record.staff.restDays || '6,7').split(',').map(d => parseInt(d.trim()));
            const isRestDay = restDays.includes(isoDay);
            return isHoliday || isRestDay;
        });

        return {
            success: true,
            data: offDayRecords.map(r => ({
                id: r.id,
                staffName: `${r.staff.firstName} ${r.staff.lastName}`,
                staffId: r.staff.staffId,
                department: r.staff.department?.name || 'N/A',
                date: format(new Date(r.date), 'yyyy-MM-dd'),
                timeIn: r.timeIn,
                timeOut: r.timeOut,
                duration: formatDuration(calculateDurationHours(r)),
                reason: holidayDates.includes(format(new Date(r.date), 'yyyy-MM-dd')) ? 'Holiday' : 'Rest Day'
            }))
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ─── SUMMARY REPORT ───────────────────────────────────────────────────────────

export async function getSummaryReport(startDate: string, endDate: string, departmentId?: string, staffId?: string) {
    try {
        const where: any = { status: 'active' };
        if (departmentId) where.departmentId = departmentId;
        if (staffId) where.id = staffId;

        const staffMembers = await prisma.user.findMany({
            where,
            include: { shift: true, department: true }
        });

        const staffIds = staffMembers.map(s => s.id);

        const allRecords = await prisma.staffAttendance.findMany({
            where: {
                staffId: { in: staffIds },
                date: { gte: new Date(startDate), lte: endOfDay(new Date(endDate)) }
            }
        });

        const recordsByStaff = new Map<string, any[]>();
        for (const r of allRecords) {
            if (!recordsByStaff.has(r.staffId)) recordsByStaff.set(r.staffId, []);
            recordsByStaff.get(r.staffId)!.push(r);
        }

        const holidayDates = await getHolidayDates(startDate, endDate);
        const interval = eachDayOfInterval({ start: new Date(startDate), end: new Date(endDate) });

        const summaryData = staffMembers.map(staff => {
            const records = recordsByStaff.get(staff.id) || [];
            const recordsByDate = new Map<string, any>();
            for (const r of records) {
                const d = format(new Date(r.date), 'yyyy-MM-dd');
                if (!recordsByDate.has(d) || r.type === 1) recordsByDate.set(d, r);
            }

            const restDays = (staff.restDays || '6,7').split(',').map(d => parseInt(d.trim()));
            const shiftHours = staff.shift
                ? Math.max(0, (timeToMinutes(staff.shift.endTime) - timeToMinutes(staff.shift.startTime)) / 60)
                : 8;

            let daysPresent = 0, expectedWorkDays = 0, expectedHoursTotal = 0, totalHours = 0, lateCount = 0, daysAbsent = 0;

            for (const day of interval) {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayOfWeek = getDay(day);
                const isoDay = dayOfWeek === 0 ? 7 : dayOfWeek;
                const isRestDay = restDays.includes(isoDay);
                const isHoliday = holidayDates.includes(dateStr);

                if (isRestDay || isHoliday) continue;

                expectedWorkDays++;
                expectedHoursTotal += shiftHours;

                const rec = recordsByDate.get(dateStr);
                if (rec && rec.timeIn) {
                    daysPresent++;
                    if (isLate(rec, staff)) lateCount++;
                    totalHours += calculateDurationHours(rec);
                } else {
                    daysAbsent++;
                }
            }

            const absenceRate = expectedWorkDays > 0 ? Math.round((daysAbsent / expectedWorkDays) * 1000) / 10 : 0;

            return {
                staffName: `${staff.firstName} ${staff.lastName}`,
                staffId: staff.staffId,
                department: staff.department?.name || 'N/A',
                shiftName: staff.shift?.name || `Standard (${shiftHours}h/day)`,
                daysPresent,
                expectedWorkDays,
                daysAbsent,
                lateCount,
                totalHours: Math.round(totalHours * 10) / 10,
                expectedHours: Math.round(expectedHoursTotal * 10) / 10,
                hoursVariance: Math.round((totalHours - expectedHoursTotal) * 10) / 10,
                absenceRate: Math.max(0, absenceRate)
            };
        });

        return { success: true, data: summaryData };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ─── MY ATTENDANCE ────────────────────────────────────────────────────────────

export async function getMyAttendanceLogs(userId: string) {
    try {
        const start = startOfMonth(new Date());
        const now = new Date();

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { shift: true }
        });
        if (!user) return { success: false, error: 'User not found' };

        const records = await prisma.staffAttendance.findMany({
            where: { staffId: userId },
            orderBy: { date: 'desc' },
            take: 50
        });

        const monthlyRecords = records.filter(r => new Date(r.date) >= start && new Date(r.date) <= now);
        const clockIns = monthlyRecords.filter(r => r.type === 1);
        const totalDays = [...new Set(clockIns.map(r => format(new Date(r.date), 'yyyy-MM-dd')))].length;

        let totalMinutes = 0;
        let onTimeCount = 0;
        for (const r of clockIns) {
            totalMinutes += calculateDurationHours(r) * 60;
            if (!isLate(r, user)) onTimeCount++;
        }

        const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
        const avgHoursPerDay = totalDays > 0 ? Math.round((totalHours / totalDays) * 10) / 10 : 0;
        const punctuality = clockIns.length > 0 ? Math.round((onTimeCount / clockIns.length) * 100) : 100;

        return {
            success: true,
            data: records.map(r => ({
                id: r.id,
                date: format(new Date(r.date), 'yyyy-MM-dd'),
                timeIn: r.timeIn,
                timeOut: r.timeOut,
                duration: formatDuration(calculateDurationHours(r)),
                isLate: r.type === 1 && isLate(r, user),
                type: r.type
            })),
            monthlyStats: { totalDays, totalHours, avgHoursPerDay, punctuality }
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ─── HOLIDAY CRUD ─────────────────────────────────────────────────────────────

export async function getHolidays() {
    try {
        const holidays = await prisma.holiday.findMany({ orderBy: { startDate: 'asc' } });
        return { success: true, data: holidays };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function createHoliday(data: { name: string; startDate: string; endDate: string }) {
    try {
        await prisma.holiday.create({
            data: { name: data.name, startDate: new Date(data.startDate), endDate: new Date(data.endDate) }
        });
        revalidatePath('/dashboard/bas/holidays');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteHoliday(id: string) {
    try {
        await prisma.holiday.delete({ where: { id } });
        revalidatePath('/dashboard/bas/holidays');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ─── DEPARTMENTS (for filter dropdowns) ───────────────────────────────────────

export async function getDepartments() {
    try {
        const departments = await prisma.department.findMany({ orderBy: { name: 'asc' } });
        return { success: true, data: departments };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ─── STAFF LIST (for filter dropdowns) ────────────────────────────────────────

export async function getStaffList() {
    try {
        const staff = await prisma.user.findMany({
            where: { role: { not: 'STUDENT' } },
            orderBy: { firstName: 'asc' },
            include: { department: true }
        });
        return { success: true, staff };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ─── SHIFT MANAGEMENT ────────────────────────────────────────────────────────

export async function getShifts() {
    try {
        const shifts = await prisma.shift.findMany({
            include: { _count: { select: { users: true } } },
            orderBy: { startTime: 'asc' }
        });
        return { success: true, data: shifts };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function createShift(data: { name: string; startTime: string; endTime: string; gracePeriod: number }) {
    try {
        await prisma.shift.create({ data });
        revalidatePath('/dashboard/bas/shifts');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteShift(id: string) {
    try {
        await prisma.shift.delete({ where: { id } });
        revalidatePath('/dashboard/bas/shifts');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateShift(id: string, data: { name: string; startTime: string; endTime: string; gracePeriod: number }) {
    try {
        await prisma.shift.update({
            where: { id },
            data
        });
        revalidatePath('/dashboard/bas/shifts');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function assignStaffToShift(staffId: string, shiftId: string) {
    try {
        await prisma.user.update({
            where: { id: staffId },
            data: { shiftId }
        });
        revalidatePath('/dashboard/bas/staff');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
