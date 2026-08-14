import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
    try {
        const terminalId = req.headers.get('x-terminal-id');
        const kiosk = await prisma.kiosk.findUnique({ where: { terminalId: terminalId || '' } });
        if (!kiosk || !kiosk.isActive) return NextResponse.json({ success: false, message: 'Terminal Not Activated.' });

        const body = await req.json();
        const { personnel_number, pin } = body;
        
        const staff = await prisma.user.findFirst({
            where: { OR: [ { staffId: personnel_number }, { username: personnel_number } ] }
        });

        if (!staff || !staff.kioskPin) return NextResponse.json({ success: false, message: 'Invalid ID or PIN' });

        const isValid = await bcrypt.compare(String(pin), staff.kioskPin);
        if (!isValid) return NextResponse.json({ success: false, message: 'Invalid ID or PIN' });

        return NextResponse.json({
            success: true,
            name: `${staff.firstName} ${staff.lastName}`,
            type: 'PIN Authenticated',
            time: new Date().toLocaleTimeString('en-GB'),
            message: 'Auth Successful',
            staff_id: staff.id
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}