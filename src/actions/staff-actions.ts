'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireSchoolId } from '@/lib/server-context';
import { StaffService } from '@/lib/services/staff-service';
import { CommEngine } from '@/lib/services/comm-engine';

const staffSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  gender: z.enum(['Male', 'Female']),
  dateOfBirth: z.string(),
  stateOfOrigin: z.string().min(1, 'State of origin is required.'),
  phone: z.string().min(1, 'Phone number is required.'),
  email: z.string().email('Invalid email address.'),
  address: z.string().min(1, 'Address is required.'),
  role: z.enum(['ADMIN', 'SLT', 'HOD', 'LECTURER', 'TEACHER', 'ACCOUNTANT', 'EXAM_OFFICER']),
  departmentId: z.string().optional().nullable(),
  dateOfEmployment: z.string(),
  baseSalary: z.string().optional(),
  staffId: z.string().optional(),
  kioskPin: z.string().optional(),
  clockInTime: z.string().optional(),
  clockOutTime: z.string().optional(),
  initialPassword: z.string().optional(),
});

export async function createStaff(formData: FormData) {
  try {
    const rawData = Object.fromEntries(formData.entries());
    const parsed = staffSchema.safeParse(rawData);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstError = Object.values(fieldErrors).flat()[0] || 'Invalid form data';
      return { error: firstError, details: fieldErrors };
    }
    
    const user = await StaffService.createStaff(parsed.data);
    
    // Dispatch welcome and login credentials notification
    if (user && user.email && user.email.includes('@')) {
      const initialPass = parsed.data.initialPassword?.trim() || parsed.data.stateOfOrigin?.trim() || 'Password123!';
      CommEngine.sendStaffWelcomeNotification({
        staffName: `${user.firstName} ${user.lastName}`,
        staffEmail: user.email,
        staffId: user.staffId || 'PENDING',
        role: user.role,
        temporaryPassword: initialPass,
      }).catch(err => console.error('[createStaff] Welcome email error:', err));
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/analytics");
    revalidatePath("/dashboard/slt");
    revalidatePath("/dashboard/finance/payroll");
    revalidatePath("/dashboard/bas/dashboard");
    revalidatePath("/dashboard/bas/staff");
    return { success: true, user };
  } catch (error: any) {
    console.error('Error creating staff:', error);
    if (error.code === 'P2002') {
      const target = error.meta?.target;
      if (Array.isArray(target) && target.includes('staffId')) {
        return { error: 'Staff ID already in use. Please specify a unique ID.' };
      }
      return { error: 'A staff member with this email or Staff ID already exists.' };
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
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/analytics");
    revalidatePath("/dashboard/slt");
    revalidatePath("/dashboard/finance/payroll");
    revalidatePath("/dashboard/bas/dashboard");
    return { success: true, ...result };
  } catch (error: any) {
    console.error('Error bulk creating staff:', error);
    return { error: error.message || 'An unexpected error occurred.' };
  }
}

export async function deleteStaff(userId: string) {
  try {
    await StaffService.deleteStaff(userId);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/analytics");
    revalidatePath("/dashboard/slt");
    revalidatePath("/dashboard/finance/payroll");
    revalidatePath("/dashboard/bas/dashboard");
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

