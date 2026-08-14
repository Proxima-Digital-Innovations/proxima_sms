'use server';

import { validateSystemLicense, LicenseValidationResult } from '@/lib/license-utils';

export async function checkLicenseStatus(): Promise<LicenseValidationResult> {
  return await validateSystemLicense();
}
