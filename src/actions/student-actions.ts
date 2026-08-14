'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getStudents(classId?: string) {
    try {
        const whereClause = classId ? { classId } : {};
        const students = await prisma.student.findMany({
            where: whereClause,
            include: { class: true }
        });
        return { success: true, data: students };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getStudentDashboardData() { return { success: true, data: {} }; }
export async function createStudent(data: any) { return admitStudent(data); }
export async function bulkCreateStudents(data: any[]): Promise<{ success: boolean; error?: string; importedCount?: number; errorCount?: number; invalidRecords?: any[]; data?: any }> { return { success: true }; }
export async function admitStudent(data: any) {
    try {
        const student = await prisma.student.create({
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                studentId: data.studentId || `STU${Date.now()}`,
                gender: data.gender || 'NOT_SPECIFIED',
                dateOfBirth: new Date(data.dateOfBirth || new Date()),
                admissionDate: new Date(),
                status: 'ACTIVE',
                sessionYear: '2023/2024',
                classId: data.classId || null
            }
        });
        revalidatePath('/dashboard/students');
        return { success: true, data: student };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function promoteStudents(studentIds: string[], targetClassId: string) {
    try {
        await prisma.student.updateMany({
            where: { id: { in: studentIds } },
            data: { classId: targetClassId }
        });
        revalidatePath('/dashboard/students');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
