'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getSystemSettings() {
    try {
        const profile = await prisma.systemProfile.findFirst();
        return { success: true, data: profile };
    } catch (error: any) {
        console.error('Error fetching system settings:', error);
        return { success: false, error: error.message };
    }
}

export async function updateGradingScale(scale: any[]) {
    try {
        const profile = await prisma.systemProfile.findFirst();
        if (!profile) throw new Error('System profile not found');
        
        await prisma.systemProfile.update({
            where: { id: profile.id },
            data: { gradingScale: JSON.stringify(scale) }
        });
        
        revalidatePath('/dashboard/system/grading');
        return { success: true };
    } catch (error: any) {
        console.error('Error updating grading scale:', error);
        return { success: false, error: error.message };
    }
}

export async function updateAiConfig(config: any) {
    try {
        const profile = await prisma.systemProfile.findFirst();
        if (!profile) throw new Error('System profile not found');
        
        await prisma.systemProfile.update({
            where: { id: profile.id },
            data: { aiConfig: JSON.stringify(config) }
        });
        
        revalidatePath('/dashboard/system/ai-settings');
        return { success: true };
    } catch (error: any) {
        console.error('Error updating AI config:', error);
        return { success: false, error: error.message };
    }
}

export async function updateMaintenanceMode(active: boolean) {
    try {
        const profile = await prisma.systemProfile.findFirst();
        if (!profile) throw new Error('System profile not found');
        
        await prisma.systemProfile.update({
            where: { id: profile.id },
            data: { maintenanceMode: active }
        });
        
        revalidatePath('/dashboard/system/maintenance');
        return { success: true };
    } catch (error: any) {
        console.error('Error updating maintenance mode:', error);
        return { success: false, error: error.message };
    }
}

export async function updateSystemSettings(data: any) {
    try {
        const profile = await prisma.systemProfile.findFirst();
        if (!profile) throw new Error('System profile not found');
        
        const updateData: any = {};
        if (data.schoolName !== undefined) updateData.name = data.schoolName;
        if (data.schoolAddress !== undefined) updateData.address = data.schoolAddress;
        if (data.schoolPhone !== undefined) updateData.phone = data.schoolPhone;
        if (data.schoolEmail !== undefined) updateData.email = data.schoolEmail;
        if (data.schoolLogoUrl !== undefined) updateData.logoUrl = data.schoolLogoUrl;

        await prisma.systemProfile.update({
            where: { id: profile.id },
            data: updateData
        });
        
        revalidatePath('/dashboard/system');
        return { success: true };
    } catch (error: any) {
        console.error('Error updating system settings:', error);
        return { success: false, error: error.message };
    }
}
