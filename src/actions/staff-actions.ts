
'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireSchoolId } from '@/lib/server-context';
import { Role } from '@prisma/client';

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

async function generateStaffId(role: Role, schoolId: string, offset = 0): Promise<string> {
    const roleCode = role.slice(0, 3).toUpperCase();
    const year = new Date().getFullYear().toString().slice(-2);

    const staffCount = await prisma.user.count({
        where: { role, schoolId }
    });
    const nextId = (staffCount + offset + 1).toString().padStart(4, '0');

    return `PROX-${year}${roleCode}${nextId}`;
}

export async function createStaff(formData: FormData) {
  try {
    const schoolId = await requireSchoolId();
    
    const rawData = Object.fromEntries(formData.entries());
    const parsed = staffSchema.safeParse(rawData);

    if (!parsed.success) {
        return { error: 'Invalid form data: ' + JSON.stringify(parsed.error.flatten().fieldErrors) };
    }
    
    const data = parsed.data;
    const staffId = await generateStaffId(data.role as Role, schoolId);

    const user = await prisma.user.create({
      data: {
        schoolId,
        staffId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        role: data.role as Role,
        departmentId: data.departmentId,
        passwordHash: data.stateOfOrigin, // Default password
        status: 'active',
        // metadata or personal info could go here if needed, but keeping it simple for now
      }
    });

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
    const schoolId = await requireSchoolId();
    const staff = await prisma.user.findMany({
      where: { 
        schoolId,
        role: { not: Role.PARENT }
      },
      include: { department: true },
      orderBy: { lastName: 'asc' }
    });
    return { success: true, staff };
  } catch (error: any) {
    return { success: false, staff: [], message: error.message };
  }
}

/**
 * Bulk create staff accounts from a list of records parsed from a spreadsheet.
 * Generates structured IDs using generateStaffId with an offset to avoid collisions
 * during loop execution.
 */
export async function bulkCreateStaff(staffList: any[]) {
  try {
    // Ensure the school context is resolved
    const schoolId = await requireSchoolId();
    let importedCount = 0;
    let errorCount = 0;
    const invalidRecords: any[] = [];

    // Loop through each record to validate and create the user
    for (const record of staffList) {
      try {
        if (!record.email || !record.firstName || !record.lastName) {
          throw new Error('Email, First Name, and Last Name are required.');
        }

        // Standardize the role to uppercase matching the Role enum
        const roleStr = (record.role || 'TEACHER').toUpperCase();
        if (!['ADMIN', 'SLT', 'HOD', 'TEACHER', 'ACCOUNTANT', 'EXAM_OFFICER'].includes(roleStr)) {
          throw new Error(`Invalid role: ${record.role}`);
        }
        const role = roleStr as Role;

        // Generate a new unique staff ID with the current imported count as offset
        const staffId = await generateStaffId(role, schoolId, importedCount);

        // Write the new staff user record to the database
        await prisma.user.create({
          data: {
            schoolId,
            staffId,
            firstName: record.firstName,
            lastName: record.lastName,
            email: record.email,
            phone: record.phone ? String(record.phone) : null,
            role,
            passwordHash: record.stateOfOrigin || 'password123',
            status: 'active',
          }
        });
        importedCount++;
      } catch (err: any) {
        errorCount++;
        // Capture invalid record details along with error messages to show the user
        invalidRecords.push({
          firstName: record.firstName || '',
          lastName: record.lastName || '',
          email: record.email || '',
          error: err.code === 'P2002' ? 'Email already exists' : (err.message || 'Database error')
        });
      }
    }

    revalidatePath("/admin/staff");
    return { success: true, importedCount, errorCount, invalidRecords };
  } catch (error: any) {
    console.error('Error bulk creating staff:', error);
    return { error: error.message || 'An unexpected error occurred.' };
  }
}

