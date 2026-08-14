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
            await prisma.staffAttendance.create({
                data: {
                    staffId: String(log.staff_id),
                    timeIn: new Date(log.time).toLocaleTimeString('en-GB'),
                    source: 'KIOSK_OFFLINE',
                    kioskId: kiosk?.id
                }
            });
            synced++;
        }

        return NextResponse.json({ success: true, synced });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}