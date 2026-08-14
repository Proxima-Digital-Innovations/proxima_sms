'use server';

import { revalidatePath } from 'next/cache';
import { HubService } from '@/lib/services/hub-service';
import { requireSuperAdmin } from '@/lib/guards';

const hubService = new HubService();

export async function getHubStats() {
    try {
        await requireSuperAdmin();
        const data = await hubService.getHubStats();

        return {
            success: true,
            data
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getAllSchools() {
    try {
        await requireSuperAdmin();
        const schools = await hubService.getAllSchools();
        return { success: true, data: schools };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function createTenant(data: { name: string; slug: string; email: string; phone: string; address: string }) {
    try {
        await requireSuperAdmin();
        const newSchool = await hubService.createTenant(data);
        
        revalidatePath('/hub');
        revalidatePath('/hub/schools');
        
        return { success: true, data: newSchool };
    } catch (error: any) {
        if (error.code === 'P2002' && error.meta?.target?.includes('slug')) {
            return { success: false, error: 'A school with this slug already exists.' };
        }
        return { success: false, error: error.message };
    }
}
