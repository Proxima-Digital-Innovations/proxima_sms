'use server';

import { prisma } from '@/lib/prisma';
import argon2 from 'argon2';

export async function setupSuperAdmin(data: any) {
    try {
        const existingAdmin = await prisma.user.findFirst({
            where: {
                OR: [
                    { isSuperAdmin: true },
                    { role: 'SUPER_ADMIN' }
                ]
            }
        });
        
        if (existingAdmin) {
            return { success: false, error: 'Super Admin already exists.' };
        }
        
        const hashedPassword = await argon2.hash(data.password);
        
        const admin = await prisma.user.create({
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                passwordHash: hashedPassword,
                role: 'ADMIN',
                isSuperAdmin: true,
                status: 'active',
                requiresPasswordChange: false,
            }
        });
        
        return { success: true, data: admin };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function checkSuperAdminExists() {
    try {
        const existingAdmin = await prisma.user.findFirst({
            where: {
                OR: [
                    { isSuperAdmin: true },
                    { role: 'SUPER_ADMIN' },
                    { role: 'ADMIN' }
                ]
            }
        });
        return { success: true, data: !!existingAdmin };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
