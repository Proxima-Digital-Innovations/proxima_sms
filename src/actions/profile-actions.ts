'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function updateProfileInfo(userId: string, data: any) {
    try {
        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                phone: data.phone,
                // Assuming more fields map directly to user schema or a profile model
            }
        });
        revalidatePath('/dashboard/settings');
        return { success: true, data: user };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
