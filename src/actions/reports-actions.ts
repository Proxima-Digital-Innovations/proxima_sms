'use server';

import { prisma } from '@/lib/prisma';

export async function getStaffDirectory() {
    try {
        const staff = await prisma.user.findMany({
            where: {
                role: { in: ['TEACHER', 'HOD', 'ACCOUNTANT', 'EXAM_OFFICER'] }
            },
            orderBy: { firstName: 'asc' }
        });
        return { success: true, data: staff };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getStudentDemographics() {
    try {
        const students = await prisma.student.findMany({
            include: { class: true }
        });
        
        // Compute demographics
        let totalActive = 0;
        let maleCount = 0;
        let femaleCount = 0;
        
        students.forEach(s => {
            if (s.status === 'ACTIVE') totalActive++;
            if (s.gender === 'MALE') maleCount++;
            if (s.gender === 'FEMALE') femaleCount++;
        });
        
        return { 
            success: true, 
            data: { 
                totalActive, 
                maleCount, 
                femaleCount, 
                totalStudents: students.length,
                students 
            } 
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
