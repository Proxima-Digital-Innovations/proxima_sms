'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getStaffUsers() {
    try {
        const users = await prisma.user.findMany({
            where: {
                role: {
                    not: 'STUDENT'
                },
                staffId: {
                    not: null
                }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                staffId: true
            }
        });
        
        const formattedUsers = users.map(user => ({
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            role: user.role,
            staffId: user.staffId
        }));

        return { success: true, data: formattedUsers };
    } catch (error: any) {
        console.error('Error fetching staff users:', error);
        return { success: false, error: error.message };
    }
}

export async function updateUserRole(userId: string, newRole: string) {
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { role: newRole }
        });
        
        revalidatePath('/dashboard/system/roles');
        return { success: true };
    } catch (error: any) {
        console.error('Error updating user role:', error);
        return { success: false, error: error.message };
    }
}

export async function addDepartment(data: { name: string, hodId?: string }) {
    try {
        const department = await prisma.department.create({
            data: {
                name: data.name,
                hodId: data.hodId || null,
            }
        });

        if (data.hodId) {
            await prisma.user.update({
                where: { id: data.hodId },
                data: {
                    departmentId: department.id,
                    role: 'HeadOfDepartment'
                }
            });
        }

        revalidatePath('/dashboard/departments');
        return { success: true, data: department };
    } catch (error: any) {
        console.error('Error adding department:', error);
        return { success: false, error: error.message };
    }
}
