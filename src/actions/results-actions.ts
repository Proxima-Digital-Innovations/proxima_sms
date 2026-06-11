'use server';

import { prisma } from "@/lib/prisma";
import { requireSchoolId } from "@/lib/server-context";
import { revalidatePath } from 'next/cache';

export async function calculateGrade(score: number): Promise<string> {
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    if (score >= 40) return 'E';
    return 'F';
}

export async function calculateClassPositions(classId: string, termId: string) {
    try {
        const schoolId = await requireSchoolId();
        
        // Get all students in class
        const students = await prisma.student.findMany({
            where: { classId, schoolId, status: 'Active' },
            include: { termGrades: { where: { termId } } }
        });
        
        // Calculate total for each student
        const studentTotals = students.map(student => {
            const total = student.termGrades.reduce((sum, g) => sum + (g.total || 0), 0);
            const average = student.termGrades.length > 0 ? total / student.termGrades.length : 0;
            
            return {
                studentId: student.id,
                total,
                average,
                subjectCount: student.termGrades.length
            };
        });
        
        // Sort by total (descending) and assign positions
        studentTotals.sort((a, b) => b.total - a.total);
        
        const positions: Record<string, number> = {};
        let currentPosition = 1;
        
        for (let i = 0; i < studentTotals.length; i++) {
            if (i > 0 && studentTotals[i].total < studentTotals[i - 1].total) {
                currentPosition = i + 1;
            }
            positions[studentTotals[i].studentId] = currentPosition;
        }
        
        return positions;
    } catch (error) {
        console.error('Error calculating positions:', error);
        throw new Error('Failed to calculate positions');
    }
}

export async function saveScores(scores: Array<{
    studentId: string;
    subjectId: string;
    termId: string;
    ca1?: number;
    ca2?: number;
    exam?: number;
}>) {
    try {
        const schoolId = await requireSchoolId();
        
        await prisma.$transaction(
            scores.map(score => {
                const total = (score.ca1 || 0) + (score.ca2 || 0) + (score.exam || 0);
                // Simple grade calculation (could be more complex based on school settings)
                let grade = 'F';
                if (total >= 80) grade = 'A';
                else if (total >= 70) grade = 'B';
                else if (total >= 60) grade = 'C';
                else if (total >= 50) grade = 'D';
                else if (total >= 40) grade = 'E';

                return prisma.termGrade.upsert({
                    where: {
                        studentId_subjectId_termId: {
                            studentId: score.studentId,
                            subjectId: score.subjectId,
                            termId: score.termId
                        }
                    },
                    update: {
                        ca1: score.ca1,
                        ca2: score.ca2,
                        exam: score.exam,
                        total,
                        grade
                    },
                    create: {
                        studentId: score.studentId,
                        subjectId: score.subjectId,
                        termId: score.termId,
                        schoolId,
                        ca1: score.ca1,
                        ca2: score.ca2,
                        exam: score.exam,
                        total,
                        grade
                    }
                });
            })
        );
        
        revalidatePath('/dashboard/teacher/grading');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function generateResultCard(studentId: string, classId: string, termId: string) {
    return { success: true, message: 'Result generated' };
}
