import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isLate, calculateDurationHours, calculateOvertimeHours } from '@/lib/bas-utils';
import { getHolidayDates } from "@/actions/bas-actions";
import { format, startOfDay as dateFnsStartOfDay } from 'date-fns';

export async function POST(req: NextRequest) {
    try {
        const terminalId = req.headers.get('x-terminal-id');
        const kiosk = await prisma.kiosk.findUnique({ where: { terminalId: terminalId || '' } });
        if (!kiosk || !kiosk.isActive) return NextResponse.json({ success: false, message: 'Terminal Not Activated.' });

        const body = await req.json();
        const staff = await prisma.user.findUnique({ 
            where: { id: String(body.staff_id) },
            include: { shift: true } 
        });

        if (!staff) return NextResponse.json({ success: false, message: 'Staff not found.' });

        // Logic for Clock-In vs Clock-Out based on existing records today
        const startOfDay = dateFnsStartOfDay(new Date());

        const existingLog = await prisma.staffAttendance.findFirst({
            where: { staffId: staff.id, date: { gte: startOfDay } },
            orderBy: { createdAt: 'desc' }
        });

        let type = 'Clock-In';
        if (existingLog && !existingLog.timeOut) {
             type = 'Clock-Out';
             const updatedRecord = { ...existingLog, timeOut: new Date().toLocaleTimeString('en-GB') };
             const durationHours = calculateDurationHours(updatedRecord);
             const holidayDates = await getHolidayDates(format(startOfDay, 'yyyy-MM-dd'), format(startOfDay, 'yyyy-MM-dd'));
             const overtimeHours = calculateOvertimeHours(updatedRecord, staff, holidayDates);

             await prisma.staffAttendance.update({
                 where: { id: existingLog.id },
                 data: { 
                    timeOut: updatedRecord.timeOut,
                    durationHours,
                    overtimeHours
                 }
             });
        } else if (!existingLog) {
            const timeIn = new Date().toLocaleTimeString('en-GB');
            const late = isLate({ timeIn }, staff);

            await prisma.staffAttendance.create({
                data: {
                    staffId: staff.id,
                    timeIn,
                    source: 'KIOSK',
                    kioskId: kiosk.id,
                    isLate: late
                }
            });
        } else {
             return NextResponse.json({ success: false, message: 'Already completed attendance cycle today.' });
        }

        return NextResponse.json({
            success: true,
            name: `${staff.firstName} ${staff.lastName}`,
            type,
            time: new Date().toLocaleTimeString('en-GB'),
            message: `${type} successful!`,
            staff_id: staff.id
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}