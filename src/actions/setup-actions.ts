'use server';

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function setupSuperAdmin(data: any) {
    try {
        const existingAdmin = await prisma.user.findFirst({
            where: { role: 'SUPER_ADMIN' }
        });
        
        if (existingAdmin) {
            return { success: false, error: 'Super Admin already exists.' };
        }
        
        const hashedPassword = await bcrypt.hash(data.password, 10);
        
        const admin = await prisma.user.create({
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                passwordHash: hashedPassword,
                role: 'SUPER_ADMIN',
                isSuperAdmin: true,
                status: 'ACTIVE'
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
            where: { role: 'SUPER_ADMIN' }
        });
        return { success: true, data: !!existingAdmin };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
