'use server';

import { revalidatePath } from 'next/cache';
import { getSystemSettings, updateSystemSettings } from './system-actions';

export async function getSchoolInfo() {
    try {
        const res = await getSystemSettings();
        if (!res.success || !res.data) {
            return { success: false, error: 'Could not fetch settings' };
        }
        const settings = res.data;
        const school = {
            name: settings.name,
            address: settings.address,
            phone: settings.phone,
            email: settings.email,
            logoUrl: settings.logoUrl,
        };
        return { success: true, data: school };
    } catch (error: any) {
        console.error('Error fetching school info:', error);
        return { success: false, error: error.message };
    }
}

export async function updateSchoolInfo(data: { name: string; address?: string; phone?: string; email?: string; logoUrl?: string }) {
    try {
        await updateSystemSettings({
            schoolName: data.name,
            schoolAddress: data.address,
            schoolPhone: data.phone,
            schoolEmail: data.email,
            schoolLogoUrl: data.logoUrl,
        });

        revalidatePath('/dashboard/system/school-info');
        return { success: true };
    } catch (error: any) {
        console.error('Error updating school info:', error);
        return { success: false, error: error.message };
    }
}
