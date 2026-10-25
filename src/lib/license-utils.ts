import crypto from 'crypto';
import { prisma } from './prisma';
import { PUBLIC_KEY } from './license-keys';

export type LicenseStatus = 'ACTIVE' | 'EXPIRED' | 'INVALID' | 'UNACTIVATED';

export interface LicensePayload {
  schoolName: string;
  maxStudents: number;
  tier: string;
  features?: string[];
  billingFrequency?: 'PER_TERM' | 'PER_SESSION';
  discountPercent?: number;
  termName?: string;
  sessionName?: string;
  expiresAt: string;
  issuedAt: string;
}

export interface LicenseValidationResult {
  status: LicenseStatus;
  payload: LicensePayload | null;
  message: string;
  daysUntilExpiry: number | null;
  isExpiringSoon: boolean;
  expiryWarningMessage: string | null;
  formattedExpiryDate: string | null;
}

async function notifyAdminsIfExpiring(daysUntilExpiry: number, formattedExpiryDate: string) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const admins = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        status: 'active'
      },
      select: { id: true }
    });

    for (const admin of admins) {
      const existing = await prisma.notification.findFirst({
        where: {
          userId: admin.id,
          title: 'Subscription Expiring Soon',
          createdAt: { gte: today }
        }
      });

      if (!existing) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            title: 'Subscription Expiring Soon',
            body: `Your enterprise subscription expires in ${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'day' : 'days'} on ${formattedExpiryDate}. Please renew soon to avoid read-only mode.`,
            type: 'WARNING'
          }
        });
      }
    }
  } catch (err) {
    // Non-blocking notification dispatch
    console.error('Failed to notify admins of subscription expiry:', err);
  }
}

export async function validateSystemLicense(): Promise<LicenseValidationResult> {
  try {
    const license = await prisma.systemLicense.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!license || !license.licenseKey) {
      return { 
        status: 'UNACTIVATED', 
        payload: null, 
        message: 'System subscription not activated. Please provide an activation key.',
        daysUntilExpiry: null,
        isExpiringSoon: false,
        expiryWarningMessage: null,
        formattedExpiryDate: null
      };
    }

    if (!license.licenseKey.includes('.')) {
      return { 
        status: 'INVALID', 
        payload: null, 
        message: 'Invalid subscription key format.',
        daysUntilExpiry: null,
        isExpiringSoon: false,
        expiryWarningMessage: null,
        formattedExpiryDate: null
      };
    }

    const [base64Payload, signature] = license.licenseKey.split('.');
    const payloadString = Buffer.from(base64Payload, 'base64').toString('utf8');
    
    let payload: LicensePayload;
    try {
      payload = JSON.parse(payloadString);
    } catch {
      return { 
        status: 'INVALID', 
        payload: null, 
        message: 'Corrupted subscription payload.',
        daysUntilExpiry: null,
        isExpiringSoon: false,
        expiryWarningMessage: null,
        formattedExpiryDate: null
      };
    }

    // Verify signature
    const verify = crypto.createVerify('SHA256');
    verify.update(payloadString);
    verify.end();

    const isVerified = verify.verify(PUBLIC_KEY, signature, 'base64');
    
    if (!isVerified) {
      return { 
        status: 'INVALID', 
        payload: null, 
        message: 'Subscription signature verification failed. The key has been tampered with.',
        daysUntilExpiry: null,
        isExpiringSoon: false,
        expiryWarningMessage: null,
        formattedExpiryDate: null
      };
    }

    // Check expiration
    const expiresAt = new Date(payload.expiresAt);
    const now = new Date();
    const formattedExpiryDate = expiresAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const diffMs = expiresAt.getTime() - now.getTime();
    const daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (expiresAt < now) {
      return { 
        status: 'EXPIRED', 
        payload, 
        message: `Your enterprise subscription expired on ${formattedExpiryDate}. System is in read-only mode until renewed.`,
        daysUntilExpiry: 0,
        isExpiringSoon: false,
        expiryWarningMessage: `Subscription expired on ${formattedExpiryDate}.`,
        formattedExpiryDate
      };
    }

    // Impending expiry threshold: 30 days
    const isExpiringSoon = daysUntilExpiry <= 30;
    const expiryWarningMessage = isExpiringSoon
      ? `Your enterprise subscription expires in ${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'day' : 'days'} on ${formattedExpiryDate}. Please renew early to prevent operational interruptions.`
      : null;

    if (isExpiringSoon) {
      // Async trigger in-app notification for administrators
      notifyAdminsIfExpiring(daysUntilExpiry, formattedExpiryDate).catch(() => {});
    }

    return { 
      status: 'ACTIVE', 
      payload, 
      message: 'Subscription is active.',
      daysUntilExpiry,
      isExpiringSoon,
      expiryWarningMessage,
      formattedExpiryDate
    };

  } catch (error: any) {
    console.error("Subscription validation error:", error);
    return { 
      status: 'INVALID', 
      payload: null, 
      message: 'An error occurred while validating the subscription.',
      daysUntilExpiry: null,
      isExpiringSoon: false,
      expiryWarningMessage: null,
      formattedExpiryDate: null
    };
  }
}
