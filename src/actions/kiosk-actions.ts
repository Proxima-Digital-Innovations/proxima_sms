'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getKiosks() {
    try {
        const kiosks = await prisma.kiosk.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, data: kiosks };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getKiosk(id: string) {
    try {
        const kiosk = await prisma.kiosk.findUnique({
            where: { id }
        });
        if (!kiosk) return { success: false, error: 'Kiosk not found' };
        return { success: true, data: kiosk };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function activateKiosk(id: string, name: string) {
    try {
        const updated = await prisma.kiosk.update({
            where: { id },
            data: { 
                isActive: true,
                name: name
            }
        });
        revalidatePath('/dashboard/system/kiosks');
        return { success: true, data: updated };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deactivateKiosk(id: string) {
    try {
        const updated = await prisma.kiosk.update({
            where: { id },
            data: { isActive: false }
        });
        revalidatePath('/dashboard/system/kiosks');
        return { success: true, data: updated };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateKioskName(id: string, name: string) {
    try {
        const updated = await prisma.kiosk.update({
            where: { id },
            data: { name }
        });
        revalidatePath('/dashboard/system/kiosks');
        return { success: true, data: updated };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateKioskMode(id: string, mode: string) {
    try {
        const isMaintenance = mode === 'maintenance';
        const operatingMode = mode === 'maintenance' ? 'AUTO' : mode.toUpperCase();

        const updated = await prisma.kiosk.update({
            where: { id },
            data: { 
                operatingMode,
                maintenanceMode: isMaintenance
            }
        });
        revalidatePath('/dashboard/system/kiosks');
        return { success: true, data: updated };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteKiosk(id: string) {
    try {
        await prisma.kiosk.delete({
            where: { id }
        });
        revalidatePath('/dashboard/system/kiosks');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getKioskLogs(terminalId: string, limit: number = 100) {
    try {
        const logs = await prisma.staffAttendance.findMany({
            where: { terminalId },
            include: {
                staff: {
                    select: {
                        firstName: true,
                        lastName: true,
                        staffId: true,
                        department: {
                            select: { name: true }
                        }
                    }
                }
            },
            orderBy: { date: 'desc' },
            take: limit
        });
        return { success: true, data: logs };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
