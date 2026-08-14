import crypto from 'crypto';
import { prisma } from './prisma';
import { PUBLIC_KEY } from './license-keys';

export type LicenseStatus = 'ACTIVE' | 'EXPIRED' | 'INVALID' | 'UNACTIVATED';

export interface LicenseValidationResult {
  status: LicenseStatus;
  payload: any | null;
  message: string;
}

export async function validateSystemLicense(): Promise<LicenseValidationResult> {
  try {
    const license = await prisma.systemLicense.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!license || !license.licenseKey) {
      return { status: 'UNACTIVATED', payload: null, message: 'System subscription not activated. Please provide an activation key.' };
    }

    if (!license.licenseKey.includes('.')) {
      return { status: 'INVALID', payload: null, message: 'Invalid subscription key format.' };
    }

    const [base64Payload, signature] = license.licenseKey.split('.');
    const payloadString = Buffer.from(base64Payload, 'base64').toString('utf8');
    
    let payload;
    try {
      payload = JSON.parse(payloadString);
    } catch (e) {
      return { status: 'INVALID', payload: null, message: 'Corrupted subscription payload.' };
    }

    // Verify signature
    const verify = crypto.createVerify('SHA256');
    verify.update(payloadString);
    verify.end();

    const isVerified = verify.verify(PUBLIC_KEY, signature, 'base64');
    
    if (!isVerified) {
      return { status: 'INVALID', payload: null, message: 'Subscription signature verification failed. The key has been tampered with.' };
    }

    // Check expiration
    const expiresAt = new Date(payload.expiresAt);
    if (expiresAt < new Date()) {
      return { status: 'EXPIRED', payload, message: 'Your enterprise subscription has expired. Please renew to restore full access.' };
    }

    return { status: 'ACTIVE', payload, message: 'Subscription is active.' };

  } catch (error: any) {
    console.error("Subscription validation error:", error);
    return { status: 'INVALID', payload: null, message: 'An error occurred while validating the subscription.' };
  }
}
