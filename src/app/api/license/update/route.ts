import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateSystemLicense } from '@/lib/license-utils';

export async function POST(req: Request) {
  try {
    const { licenseKey } = await req.json();

    if (!licenseKey) {
      return NextResponse.json({ error: 'License key is required' }, { status: 400 });
    }

    // Save the new license key
    await prisma.systemLicense.create({
      data: {
        licenseKey,
        schoolName: 'Validating...',
        tier: 'BASIC',
        expiresAt: new Date(), 
      }
    });

    // Validate it immediately
    const validation = await validateSystemLicense();

    if (validation.status === 'INVALID') {
      // Revert if invalid
      await prisma.systemLicense.deleteMany();
      return NextResponse.json({ error: validation.message }, { status: 400 });
    }

    // Update with actual payload data
    await prisma.systemLicense.updateMany({
      data: {
        schoolName: validation.payload.schoolName,
        tier: validation.payload.tier,
        expiresAt: new Date(validation.payload.expiresAt),
        maxStudents: validation.payload.maxStudents,
        status: 'ACTIVE'
      }
    });

    return NextResponse.json({ success: true, message: 'License applied successfully!' });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
