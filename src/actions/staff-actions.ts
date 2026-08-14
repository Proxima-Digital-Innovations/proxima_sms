'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireSchoolId } from '@/lib/server-context';
import { StaffService } from '@/lib/services/staff-service';

const staffSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  gender: z.enum(['Male', 'Female']),
  dateOfBirth: z.string(),
  stateOfOrigin: z.string().min(1, 'State of Origin is required.'),
  phone: z.string().min(1),
  email: z.string().email(),
  address: z.string().min(1),
  role: z.enum(['ADMIN', 'SLT', 'HOD', 'TEACHER', 'ACCOUNTANT', 'EXAM_OFFICER']),
  departmentId: z.string().optional(),
  dateOfEmployment: z.string(),
});

export async function createStaff(formData: FormData) {
  try {
    
    const rawData = Object.fromEntries(formData.entries());
    const parsed = staffSchema.safeParse(rawData);

    if (!parsed.success) {
        return { error: 'Invalid form data: ' + JSON.stringify(parsed.error.flatten().fieldErrors) };
    }
    
    const user = await StaffService.createStaff(parsed.data);
    revalidatePath("/admin/staff");
    return { success: true, user };
  } catch (error: any) {
    console.error('Error creating staff:', error);
    if (error.code === 'P2002') {
      return { error: 'Email already exists.' };
    }
    return { error: error.message || 'An unexpected error occurred.' };
  }
}

export async function getStaffList() {
  try {
    
    const staff = await StaffService.getStaffList();
    return { success: true, staff };
  } catch (error: any) {
    return { success: false, staff: [], message: error.message };
  }
}

export async function bulkCreateStaff(staffList: any[]) {
  try {
    
    const result = await StaffService.bulkCreateStaff(staffList);
    revalidatePath("/admin/staff");
    return { success: true, ...result };
  } catch (error: any) {
    console.error('Error bulk creating staff:', error);
    return { error: error.message || 'An unexpected error occurred.' };
  }
}

export async function deleteStaff(userId: string) {
  try {
    
    await StaffService.deleteStaff(userId);
    revalidatePath("/[school]/dashboard/users");
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting staff:', error);
    return { error: error.message || 'An unexpected error occurred.' };
  }
}

export async function getSLTAssignmentsData() {
    try {
        const { dbService } = await import('@/lib/dbService');
        const [depts, users] = await Promise.all([
            dbService.getDocs('departments', {}),
            dbService.getDocs('users', { status: 'active' }),
        ]);

        const deptWithHodNames = depts.map((dept: any) => {
            const hod = (users as any[]).find((u: any) => u.id === dept.hodId);
            return { ...dept, hodName: (hod as any)?.name || 'Not Assigned' };
        });

        const teachersOnly = users.filter((u: any) => u.role === 'Teacher');
        const hodCandidates = users.filter((u: any) => ['Teacher', 'HeadOfDepartment', 'SLT'].includes(u.role));

        return { 
            success: true, 
            data: { 
                departments: deptWithHodNames, 
                teachers: teachersOnly, 
                potentialHods: hodCandidates 
            } 
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

