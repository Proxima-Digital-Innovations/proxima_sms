import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { activation_code, terminal_id } = body;

        let kiosk = await prisma.kiosk.findUnique({ where: { terminalId: terminal_id } });
        if (kiosk) {
            kiosk = await prisma.kiosk.update({
                where: { terminalId: terminal_id },
                data: { isActive: true }
            });
        } else {
            kiosk = await prisma.kiosk.create({
                data: { terminalId: terminal_id, name: 'Activated Kiosk', isActive: true }
            });
        }

        const system = await prisma.systemProfile.findFirst();

        return NextResponse.json({
            success: true,
            message: 'Terminal activated successfully.',
            kiosk_id: kiosk.id,
            branch_name: system?.name || 'Main Campus',
            school_name: system?.name || 'School Hub',
            school_address: system?.address || '123 Edu Lane',
            logo_url: system?.logoUrl || '',
            token: 'KIOSK_AUTH_' + Date.now()
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}