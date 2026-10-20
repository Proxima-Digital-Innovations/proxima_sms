'use server';

import { validateSystemLicense, LicenseValidationResult } from '@/lib/license-utils';
import { getLicenseCapacityStatus, snapshotTermBaseline, LicenseCapacityStatus } from '@/lib/services/license-capacity';

export async function checkLicenseStatus(): Promise<LicenseValidationResult> {
  return await validateSystemLicense();
}

export async function getLicenseCapacity(): Promise<LicenseCapacityStatus> {
  return await getLicenseCapacityStatus();
}

export async function recordTermSnapshot(termId: string) {
  return await snapshotTermBaseline(termId);
}
