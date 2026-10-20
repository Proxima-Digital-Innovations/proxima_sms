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

export async function updateDepartment(data: { id: string; name: string; hodId?: string | null }) {
    try {
        const existing = await prisma.department.findUnique({ where: { id: data.id } });
        if (!existing) {
            return { success: false, error: 'Department not found' };
        }

        const updated = await prisma.department.update({
            where: { id: data.id },
            data: {
                name: data.name,
                hodId: data.hodId || null,
            }
        });

        if (data.hodId) {
            await prisma.user.update({
                where: { id: data.hodId },
                data: {
                    departmentId: updated.id,
                    role: 'HOD'
                }
            });
        }

        revalidatePath('/dashboard/departments');
        return { success: true, data: updated };
    } catch (error: any) {
        console.error('Error updating department:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteDepartment(id: string) {
    try {
        const jobPostingsCount = await prisma.jobPosting.count({ where: { departmentId: id } });
        if (jobPostingsCount > 0) {
            return { 
                success: false, 
                error: `Cannot delete department: ${jobPostingsCount} job recruitment posting(s) are currently attached.` 
            };
        }

        await prisma.user.updateMany({
            where: { departmentId: id },
            data: { departmentId: null }
        });

        await prisma.subject.updateMany({
            where: { departmentId: id },
            data: { departmentId: null }
        });

        await prisma.department.delete({
            where: { id }
        });

        revalidatePath('/dashboard/departments');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting department:', error);
        return { success: false, error: error.message };
    }
}

import * as argon2 from 'argon2';

export async function adminResetUserPassword(userId: string) {
    try {
        // Find user first
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error("User not found");

        const defaultPassword = "password123";
        const passwordHash = await argon2.hash(defaultPassword);

        await prisma.user.update({
            where: { id: userId },
            data: { 
                passwordHash,
                requiresPasswordChange: true 
            }
        });

        revalidatePath('/dashboard/staff');
        revalidatePath('/dashboard/students');
        return { success: true, message: "Password reset to default (password123)" };
    } catch (error: any) {
        console.error('Error resetting password:', error);
        return { success: false, error: error.message };
    }
}

export async function changeOwnPassword(userId: string, newPassword: string) {
    try {
        const passwordHash = await argon2.hash(newPassword);

        await prisma.user.update({
            where: { id: userId },
            data: { 
                passwordHash,
                requiresPasswordChange: false 
            }
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error changing password:', error);
        return { success: false, error: error.message };
    }
}
