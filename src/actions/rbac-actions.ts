'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getAccessRoles() {
    try {
        const roles = await prisma.accessRole.findMany({
            include: {
                permissions: true,
                _count: {
                    select: { users: true }
                }
            }
        });
        return { success: true, data: roles };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getAllPermissions() {
    try {
        const permissions = await prisma.permission.findMany();
        return { success: true, data: permissions };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function createPermission(data: { action: string; resource: string; description?: string }) {
    try {
        const perm = await prisma.permission.create({
            data: {
                action: data.action.toLowerCase(),
                resource: data.resource.toLowerCase(),
                description: data.description,
            }
        });
        revalidatePath('/dashboard/roles');
        return { success: true, data: perm };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function createAccessRole(data: { name: string; description: string; permissionIds: string[] }) {
    try {
        const role = await prisma.accessRole.create({
            data: {
                name: data.name,
                description: data.description,
                permissions: {
                    connect: data.permissionIds.map(id => ({ id }))
                }
            }
        });
        revalidatePath('/dashboard/settings/roles');
        return { success: true, data: role };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateAccessRole(id: string, data: { name: string; description: string; permissionIds: string[] }) {
    try {
        const role = await prisma.accessRole.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description,
                permissions: {
                    set: data.permissionIds.map(permId => ({ id: permId }))
                }
            }
        });
        revalidatePath('/dashboard/settings/roles');
        return { success: true, data: role };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteAccessRole(id: string) {
    try {
        await prisma.accessRole.delete({
            where: { id }
        });
        revalidatePath('/dashboard/settings/roles');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function assignRolesToUser(userId: string, roleIds: string[]) {
    try {
        await prisma.user.update({
            where: { id: userId },
            data: {
                accessRoles: {
                    set: roleIds.map(id => ({ id }))
                }
            }
        });
        revalidatePath('/dashboard/users');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
