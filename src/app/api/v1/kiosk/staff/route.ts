import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    try {
        const terminalId = req.headers.get('x-terminal-id');
        const kiosk = await prisma.kiosk.findUnique({ where: { terminalId: terminalId || '' } });
        if (!kiosk || !kiosk.isActive) return NextResponse.json({ success: false, message: 'Terminal not activated' }, { status: 403 });

        const staff = await prisma.user.findMany({
            where: { status: 'ACTIVE' },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                staffId: true,
                biometricTemplate: true,
                kioskPin: true
            }
        });

        const system = await prisma.systemProfile.findFirst();

        const formattedStaff = staff.map(s => ({
            id: s.id,
            name: `${s.firstName} ${s.lastName}`,
            personnel_number: s.staffId || s.id,
            photo_url: '', 
            template: s.biometricTemplate,
            is_enrolled: !!s.biometricTemplate,
            kiosk_pin: s.kioskPin,
            shift_start: '07:30:00',
            shift_end: '16:00:00',
            grace_period: 15
        }));

        return NextResponse.json({
            success: true,
            branch: system?.name || 'Main Campus',
            data: formattedStaff
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}