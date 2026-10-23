'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export interface SchoolBankConfig {
  bankName: string;
  accountNumber: string;
  accountName: string;
  settlementBankCode?: string;
  betastackZainboxCode?: string;
  betastackApiKey?: string;
  isAutoSettlementEnabled: boolean;
}

const DEFAULT_BANK_CONFIG: SchoolBankConfig = {
  bankName: 'Guaranty Trust Bank (GTBank)',
  accountNumber: '0123456789',
  accountName: 'Proxima International Academy Ltd',
  settlementBankCode: '058', // GTBank CBN code
  betastackZainboxCode: 'PROXIMA_SCH_COLLECTION',
  isAutoSettlementEnabled: true,
};

/**
 * Retrieves the school's corporate bank account and Betastack settlement settings
 */
export async function getSchoolBankSettings(): Promise<{ success: boolean; data: SchoolBankConfig }> {
  try {
    const profile = await prisma.systemProfile.findFirst({
      select: { commConfig: true },
    });

    if (profile?.commConfig) {
      try {
        const parsed = JSON.parse(profile.commConfig);
        if (parsed?.schoolBank) {
          return {
            success: true,
            data: {
              ...DEFAULT_BANK_CONFIG,
              ...parsed.schoolBank,
            },
          };
        }
      } catch {}
    }

    return { success: true, data: DEFAULT_BANK_CONFIG };
  } catch (error: any) {
    console.error('Error fetching school bank settings:', error);
    return { success: false, data: DEFAULT_BANK_CONFIG };
  }
}

/**
 * Updates the school's corporate bank account and Betastack settlement settings
 */
export async function updateSchoolBankSettings(config: Partial<SchoolBankConfig>) {
  try {
    const profile = await prisma.systemProfile.findFirst();
    if (!profile) throw new Error('System profile not found.');

    let currentConfig: any = {};
    if (profile.commConfig) {
      try {
        currentConfig = JSON.parse(profile.commConfig);
      } catch {}
    }

    const updatedBank = {
      ...DEFAULT_BANK_CONFIG,
      ...(currentConfig.schoolBank || {}),
      ...config,
    };

    currentConfig.schoolBank = updatedBank;

    await prisma.systemProfile.update({
      where: { id: profile.id },
      data: {
        commConfig: JSON.stringify(currentConfig),
      },
    });

    try {
      revalidatePath('/dashboard/system/school-info');
      revalidatePath('/dashboard/pay');
      revalidatePath('/dashboard/finance');
    } catch {}

    return { success: true, data: updatedBank };
  } catch (error: any) {
    console.error('Error updating school bank settings:', error);
    return { success: false, error: error.message };
  }
}
