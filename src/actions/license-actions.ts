'use server';

import { validateSystemLicense, LicenseValidationResult } from '@/lib/license-utils';
import { getLicenseCapacityStatus, snapshotTermBaseline, LicenseCapacityStatus } from '@/lib/services/license-capacity';
import { issueAndApplyEnterpriseLicense } from '@/lib/license-issuer';

export async function checkLicenseStatus(): Promise<LicenseValidationResult> {
  return await validateSystemLicense();
}

export async function getLicenseCapacity(): Promise<LicenseCapacityStatus> {
  return await getLicenseCapacityStatus();
}

export async function recordTermSnapshot(termId: string) {
  return await snapshotTermBaseline(termId);
}

export async function activateEnterpriseLicense(params?: {
  schoolName?: string;
  maxStudents?: number;
  tier?: string;
  billingFrequency?: 'PER_TERM' | 'PER_SESSION';
}) {
  try {
    const res = await issueAndApplyEnterpriseLicense(params);
    return { success: true, message: 'Enterprise license generated and activated successfully.', data: res };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to activate enterprise license.' };
  }
}
