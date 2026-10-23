'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import {
  AVAILABLE_MODULES,
  getActiveInstitutionalModules,
  invalidateActiveModulesCache,
} from '@/lib/modules/module-registry';

export async function getInstitutionalModulesAction() {
  const active = await getActiveInstitutionalModules();
  return {
    success: true,
    available: AVAILABLE_MODULES,
    activeModules: active,
  };
}

export async function toggleModuleAction(moduleId: string, enable: boolean) {
  try {
    const current = await getActiveInstitutionalModules();
    let updated: string[];

    if (enable) {
      updated = Array.from(new Set([...current, moduleId]));
    } else {
      updated = current.filter((m) => m !== moduleId);
    }

    const profile = await prisma.systemProfile.findFirst({ select: { id: true } });
    if (profile) {
      await prisma.systemProfile.update({
        where: { id: profile.id },
        data: { enabledModules: JSON.stringify(updated) },
      });
    }

    invalidateActiveModulesCache();
    revalidatePath('/dashboard', 'layout');
    revalidatePath('/dashboard/system/modules');

    return { success: true, activeModules: updated };
  } catch (error: any) {
    console.error('Failed to toggle module:', error);
    return { success: false, error: error.message || 'Failed to update module state' };
  }
}

export async function updateEnabledModulesAction(moduleIds: string[]) {
  try {
    const profile = await prisma.systemProfile.findFirst({ select: { id: true } });
    if (profile) {
      await prisma.systemProfile.update({
        where: { id: profile.id },
        data: { enabledModules: JSON.stringify(moduleIds) },
      });
    }

    invalidateActiveModulesCache();
    revalidatePath('/dashboard', 'layout');
    revalidatePath('/dashboard/system/modules');

    return { success: true, activeModules: moduleIds };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update modules' };
  }
}
