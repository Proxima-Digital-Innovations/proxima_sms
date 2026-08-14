'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getSuppliers() {
    try {
        const suppliers = await prisma.supplier.findMany();
        return { success: true, data: suppliers };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function addSupplier(data: any) {
    try {
        const supplier = await prisma.supplier.create({ data });
        revalidatePath('/dashboard/inventory/suppliers');
        return { success: true, data: supplier };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getInventoryOrders() {
    try {
        const orders = await prisma.inventoryOrder.findMany({ include: { supplier: true } });
        return { success: true, data: orders };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function addInventoryOrder(data: any) {
    try {
        const order = await prisma.inventoryOrder.create({ data: { ...data, items: JSON.stringify(data.items) } });
        revalidatePath('/dashboard/inventory/orders');
        return { success: true, data: order };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateSupplier(id: string, data: any) {
    try {
        const supplier = await prisma.supplier.update({ where: { id }, data });
        revalidatePath('/dashboard/inventory/suppliers');
        return { success: true, data: supplier };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteSupplier(id: string) {
    try {
        await prisma.supplier.delete({ where: { id } });
        revalidatePath('/dashboard/inventory/suppliers');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateInventoryOrder(id: string, data: any) {
    try {
        const order = await prisma.inventoryOrder.update({ where: { id }, data });
        revalidatePath('/dashboard/inventory/orders');
        return { success: true, data: order };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getInventoryItems() {
    try {
        const items = await prisma.inventoryItem.findMany();
        return { success: true, data: items };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateInventoryItemQuantity(id: string, quantityToAdd: number) {
    try {
        const item = await prisma.inventoryItem.update({
            where: { id },
            data: { quantity: { increment: quantityToAdd } }
        });
        return { success: true, data: item };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function createInventoryItem(data: any) {
    try {
        const item = await prisma.inventoryItem.create({ data });
        revalidatePath('/dashboard/inventory/items');
        return { success: true, data: item };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateInventoryItem(id: string, data: any) {
    try {
        const item = await prisma.inventoryItem.update({ where: { id }, data });
        revalidatePath('/dashboard/inventory/items');
        return { success: true, data: item };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteInventoryItem(id: string) {
    try {
        await prisma.inventoryItem.delete({ where: { id } });
        revalidatePath('/dashboard/inventory/items');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getInventoryTransactions() {
    return { success: true, data: [] };
}

export async function recordInventoryTransaction(data: any): Promise<{ success: boolean; data?: any; error?: string }> {
    return { success: true, data: null };
}
