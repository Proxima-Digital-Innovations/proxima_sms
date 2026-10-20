import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const terminalId = req.headers.get('x-terminal-id');
        const kiosk = await prisma.kiosk.findUnique({ where: { terminalId: terminalId || '' } });
        const body = await req.json();
        
        const logs = body.logs || [];
        let synced = 0;

        for (const log of logs) {
            const rawStaffId = String(log.staff_id || '');
            if (!rawStaffId) continue;

            const user = await prisma.user.findFirst({
                where: {
                    OR: [
                        { id: rawStaffId },
                        { staffId: rawStaffId }
                    ]
                },
                select: { id: true }
            });

            if (!user) {
                console.warn(`Sync attendance: User not found for staff_id: ${rawStaffId}`);
                continue;
            }

            const staffDbId = user.id;
            const dateStr = log.time.split(' ')[0]; // "yyyy-MM-dd"
            const logDate = new Date(dateStr);
            const timeStr = new Date(log.time).toLocaleTimeString('en-GB'); // "HH:mm:ss"

            const existingRecord = await prisma.staffAttendance.findFirst({
                where: {
                    staffId: staffDbId,
                    date: {
                        gte: new Date(`${dateStr}T00:00:00.000Z`),
                        lte: new Date(`${dateStr}T23:59:59.999Z`)
                    }
                }
            });

            if (log.type === 'Clock-Out') {
                if (existingRecord) {
                    await prisma.staffAttendance.update({
                        where: { id: existingRecord.id },
                        data: { timeOut: timeStr }
                    });
                } else {
                    await prisma.staffAttendance.create({
                        data: {
                            staffId: staffDbId,
                            date: logDate,
                            timeOut: timeStr,
                            source: 'KIOSK_OFFLINE',
                            kioskId: kiosk?.id
                        }
                    });
                }
            } else {
                if (!existingRecord) {
                    await prisma.staffAttendance.create({
                        data: {
                            staffId: staffDbId,
                            date: logDate,
                            timeIn: timeStr,
                            source: 'KIOSK_OFFLINE',
                            kioskId: kiosk?.id
                        }
                    });
                }
            }
            synced++;
        }

        return NextResponse.json({ success: true, synced });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}