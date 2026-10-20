import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    try {
        const terminalId = req.headers.get('x-terminal-id');
        const apiSecret = req.headers.get('x-api-secret');

        if (!terminalId) return NextResponse.json({ success: false, message: 'Missing Terminal ID' }, { status: 400 });

        let kiosk = await prisma.kiosk.findUnique({ where: { terminalId } });
        if (!kiosk) {
            kiosk = await prisma.kiosk.create({
                data: {
                    terminalId,
                    name: 'New Kiosk ' + terminalId.substring(0, 4),
                    isActive: false
                }
            });
        } else {
            await prisma.kiosk.update({
                where: { terminalId },
                data: { lastSeenAt: new Date() }
            });
        }

        const system = await prisma.systemProfile.findFirst();
        
        let status = 'PENDING';
        let command = 'SCAN';
        if (kiosk.isActive) status = 'ACTIVE';
        if (kiosk.maintenanceMode) status = 'MAINTENANCE';
        if (kiosk.operatingMode?.toUpperCase() === 'ENROLLMENT') command = 'ENROLL';

        return NextResponse.json({
            success: true,
            status,
            command,
            branch_name: system?.name || 'Main Campus',
            schoolName: system?.name || 'School Hub',
            logo_url: system?.logoUrl || '',
            school_address: system?.address || '',
            time: new Date().toLocaleTimeString('en-GB')
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}