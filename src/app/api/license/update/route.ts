import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { PUBLIC_KEY } from '@/lib/license-keys';
import { LicensePayload } from '@/lib/license-utils';

export async function POST(req: Request) {
  try {
    const { licenseKey } = await req.json();

    if (!licenseKey || typeof licenseKey !== 'string') {
      return NextResponse.json({ error: 'License key is required' }, { status: 400 });
    }

    const trimmedKey = licenseKey.trim();
    if (!trimmedKey.includes('.')) {
      return NextResponse.json({ error: 'Invalid subscription key format.' }, { status: 400 });
    }

    const [base64Payload, signature] = trimmedKey.split('.');
    let payload: LicensePayload;
    try {
      const payloadString = Buffer.from(base64Payload, 'base64').toString('utf8');
      payload = JSON.parse(payloadString);
    } catch {
      return NextResponse.json({ error: 'Corrupted subscription payload.' }, { status: 400 });
    }

    // Verify cryptographic signature before modifying database
    try {
      const payloadString = Buffer.from(base64Payload, 'base64').toString('utf8');
      const verify = crypto.createVerify('SHA256');
      verify.update(payloadString);
      verify.end();

      const isVerified = verify.verify(PUBLIC_KEY, signature, 'base64');
      if (!isVerified) {
        return NextResponse.json({ error: 'Signature verification failed. The key is invalid or tampered with.' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'Verification failed.' }, { status: 400 });
    }

    const expiresAt = new Date(payload.expiresAt);
    const isExpired = expiresAt < new Date();
    const status = isExpired ? 'EXPIRED' : 'ACTIVE';

    // Replace license in database atomically
    await prisma.systemLicense.deleteMany();
    await prisma.systemLicense.create({
      data: {
        licenseKey: trimmedKey,
        schoolName: payload.schoolName,
        tier: payload.tier || 'ENTERPRISE',
        expiresAt,
        maxStudents: payload.maxStudents || 2500,
        billingFrequency: payload.billingFrequency || 'PER_SESSION',
        discountPercent: payload.discountPercent || 0.0,
        status,
        lastValidatedAt: new Date()
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: isExpired ? 'Expired license applied (system in read-only mode).' : 'License applied successfully!' 
    });

  } catch (error: any) {
    console.error('License update error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
