import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { staff_id, template, pin } = body;

        let kioskPin = null;
        if (pin) {
            kioskPin = await bcrypt.hash(String(pin), 10);
        }

        await prisma.user.update({
            where: { id: String(staff_id) },
            data: {
                biometricTemplate: template,
                kioskPin: kioskPin || undefined
            }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}