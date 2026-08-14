'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireSchoolId } from '@/lib/server-context';
import { feeService } from '@/lib/services/fee-service';

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
    
    const parsed = feeStructureSchema.safeParse(values);
    if (!parsed.success) {
      return { error: parsed.error.flatten().fieldErrors };
    }

    await feeService.saveFeeStructure(parsed.data);

    revalidatePath('/admin/fees');
    return { success: true };

  } catch (error: any) {
    console.error('Error saving fee structure:', error);
    return { error: { _errors: [error.message || 'An unexpected error occurred.'] } };
  }
}

export async function deleteFeeStructure(id: string) {
  try {
    
    await feeService.deleteFeeStructure(id, );
    revalidatePath('/admin/fees');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting fee structure:', error);
    return { error: 'An unexpected error occurred while deleting.' };
  }
}

export async function getFeeStructures() {
  try {
    
    const fees = await feeService.getFeeStructures();
    return { success: true, fees };
  } catch (error: any) {
    return { success: false, fees: [], message: error.message };
  }
}
