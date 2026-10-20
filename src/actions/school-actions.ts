'use server';

import fs from 'fs';
import path from 'path';
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
        revalidatePath('/dashboard/system');
        revalidatePath('/dashboard');
        revalidatePath('/login');
        return { success: true };
    } catch (error: any) {
        console.error('Error updating school info:', error);
        return { success: false, error: error.message };
    }
}

export async function uploadSchoolLogo(formData: FormData) {
    try {
        const file = formData.get('logo') as File | null;
        if (!file || !(file instanceof File)) {
            return { success: false, error: 'No logo file provided.' };
        }

        const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'image/gif'];
        if (!validTypes.includes(file.type.toLowerCase())) {
            return { success: false, error: 'Invalid file format. Please upload a PNG, JPEG, WEBP, or SVG image.' };
        }

        const MAX_SIZE = 5 * 1024 * 1024; // 5MB
        if (file.size > MAX_SIZE) {
            return { success: false, error: 'Logo file exceeds the 5MB limit.' };
        }

        let ext = path.extname(file.name).toLowerCase();
        if (!ext) {
            if (file.type === 'image/png') ext = '.png';
            else if (file.type === 'image/webp') ext = '.webp';
            else if (file.type === 'image/svg+xml') ext = '.svg';
            else ext = '.jpg';
        }

        const fileName = `school-logo-${Date.now()}${ext}`;
        const targetDir = path.join(process.cwd(), 'public', 'uploads', 'logos');
        await fs.promises.mkdir(targetDir, { recursive: true });

        const targetPath = path.join(targetDir, fileName);
        const arrayBuffer = await file.arrayBuffer();
        await fs.promises.writeFile(targetPath, Buffer.from(arrayBuffer));

        const logoUrl = `/api/uploads/logos/${fileName}`;

        await updateSystemSettings({ schoolLogoUrl: logoUrl });

        revalidatePath('/dashboard/system/school-info');
        revalidatePath('/dashboard/system');
        revalidatePath('/dashboard');
        revalidatePath('/login');
        return { success: true, logoUrl };
    } catch (error: any) {
        console.error('Error uploading school logo:', error);
        return { success: false, error: error.message || 'Failed to upload logo.' };
    }
}

export async function removeSchoolLogo() {
    try {
        await updateSystemSettings({ schoolLogoUrl: null });
        revalidatePath('/dashboard/system/school-info');
        revalidatePath('/dashboard/system');
        revalidatePath('/dashboard');
        revalidatePath('/login');
        return { success: true };
    } catch (error: any) {
        console.error('Error removing school logo:', error);
        return { success: false, error: error.message || 'Failed to remove logo.' };
    }
}

