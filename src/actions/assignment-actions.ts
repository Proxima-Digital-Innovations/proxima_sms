'use server';

import { prisma } from "@/lib/prisma";
import { requireSchoolId } from "@/lib/server-context";
import { Role } from "@prisma/client";

export async function assignHod(departmentId: string, newHodId: string | null) {
    try {
        const schoolId = await requireSchoolId();
        
        const dept = await prisma.department.findUnique({
            where: { id: departmentId, schoolId }
        });
        if (!dept) throw new Error('Department not found.');

        if (newHodId === 'remove' || newHodId === null) {
            await prisma.department.update({
                where: { id: departmentId, schoolId },
                data: { hodId: null }
            });
        } else {
            await prisma.$transaction([
                prisma.department.update({
                    where: { id: departmentId, schoolId },
                    data: { hodId: newHodId }
                }),
                prisma.user.update({
                    where: { id: newHodId, schoolId },
                    data: { role: Role.HOD, departmentId }
                }),
                prisma.notification.create({
                    data: {
                        userId: newHodId,
                        schoolId,
                        title: 'New Responsibility Assigned',
                        body: `You have been assigned as the Head of Department for the ${dept.name} department.`,
                        type: 'INFO'
                    }
                })
            ]);
        }
        
        return { success: true };

    } catch (error: any) {
        console.error("Error assigning HOD:", error);
        return { error: error.message || 'An unexpected error occurred.' };
    }
}

export async function assignTeacherDepartment(teacherId: string, departmentId: string) {
    try {
        const schoolId = await requireSchoolId();
        
        const dept = await prisma.department.findUnique({ where: { id: departmentId, schoolId } });
        if (!dept) throw new Error("Department not found.");

        await prisma.$transaction([
            prisma.user.update({
                where: { id: teacherId, schoolId },
                data: { departmentId }
            }),
            prisma.notification.create({
                data: {
                    userId: teacherId,
                    schoolId,
                    title: 'Department Assigned',
                    body: `You have been assigned to the ${dept.name} department.`,
                    type: 'INFO'
                }
            })
        ]);

        return { success: true };
    } catch (error: any) {
        console.error("Error assigning teacher department:", error);
        return { error: error.message || 'An unexpected error occurred.' };
    }
}
