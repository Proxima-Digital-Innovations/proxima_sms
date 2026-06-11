'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireSchoolId } from '@/lib/server-context';
import { Role } from '@prisma/client';

export async function runPayroll(month: number, year: number): Promise<{success?: boolean, employeeCount?: number, totalAmount?: number, error?: string}> {
    try {
        const schoolId = await requireSchoolId();
        
        // 1. Check if payroll for this month/year has already been run
        const existingRuns = await prisma.payroll.findMany({
            where: { schoolId, month, year },
        });
        if (existingRuns.length > 0) {
            throw new Error(`Payroll for ${month}/${year} has already been executed.`);
        }

        // 2. Fetch all staff with a contract
        const staffWithContracts = await prisma.contract.findMany({
            where: { schoolId, status: 'active' },
            include: { user: true }
        });

        if (staffWithContracts.length === 0) {
            return { error: 'No staff members with active contracts found.' };
        }

        // 3. Create Payroll records in a transaction
        await prisma.$transaction(
            staffWithContracts.map(contract => prisma.payroll.create({
                data: {
                    schoolId,
                    userId: contract.userId,
                    month,
                    year,
                    amount: contract.salary,
                    status: 'paid', // Or 'pending' depending on flow
                    paidAt: new Date()
                }
            }))
        );
        
        revalidatePath('/admin/payroll');

        return { 
            success: true, 
            employeeCount: staffWithContracts.length,
        };

    } catch (error: any) {
        console.error('Error running payroll:', error);
        return { error: error.message || 'An unexpected error occurred.' };
    }
}

export async function getPayrollHistory() {
    try {
        const schoolId = await requireSchoolId();
        const history = await prisma.payroll.findMany({
            where: { schoolId },
            include: { user: { select: { firstName: true, lastName: true, email: true } } },
            orderBy: [{ year: 'desc' }, { month: 'desc' }]
        });
        return { success: true, history };
    } catch (error: any) {
        return { success: false, history: [], message: error.message };
    }
}
