'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireSchoolId } from '@/lib/server-context';

const feeItemSchema = z.object({
  name: z.string().min(1, 'Item name is required.'),
  amount: z.coerce.number().min(0, 'Amount must be a positive number.'),
});

const feeStructureSchema = z.object({
  id: z.string().optional(),
  className: z.string().min(1, 'Class is required.'),
  session: z.string().min(1, 'Session is required.'),
  term: z.string().min(1, 'Term is required.'),
  items: z.array(feeItemSchema).min(1, 'At least one fee item is required.'),
});

export async function saveFeeStructure(values: z.infer<typeof feeStructureSchema>) {
  try {
    const schoolId = await requireSchoolId();
    const parsed = feeStructureSchema.safeParse(values);
    if (!parsed.success) {
      return { error: parsed.error.flatten().fieldErrors };
    }

    const { id, items, ...rest } = parsed.data;
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

    if (id) {
      // Update fee structure
      await prisma.$transaction(async (tx) => {
        await tx.feeItem.deleteMany({ where: { feeStructureId: id } });
        await tx.feeStructure.update({
          where: { id, schoolId },
          data: {
            ...rest,
            totalAmount,
            items: {
              create: items
            }
          }
        });
      });
    } else {
      // Create new fee structure
      await prisma.feeStructure.create({
        data: {
          ...rest,
          schoolId,
          totalAmount,
          items: {
            create: items
          }
        }
      });
    }

    revalidatePath('/admin/fees');
    return { success: true };

  } catch (error: any) {
    console.error('Error saving fee structure:', error);
    return { error: { _errors: [error.message || 'An unexpected error occurred.'] } };
  }
}

export async function deleteFeeStructure(id: string) {
  try {
    const schoolId = await requireSchoolId();
    await prisma.$transaction([
      prisma.feeItem.deleteMany({ where: { feeStructureId: id } }),
      prisma.feeStructure.delete({ where: { id, schoolId } })
    ]);
    revalidatePath('/admin/fees');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting fee structure:', error);
    return { error: 'An unexpected error occurred while deleting.' };
  }
}

export async function getFeeStructures() {
  try {
    const schoolId = await requireSchoolId();
    const fees = await prisma.feeStructure.findMany({
      where: { schoolId },
      include: { items: true },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, fees };
  } catch (error: any) {
    return { success: false, fees: [], message: error.message };
  }
}
