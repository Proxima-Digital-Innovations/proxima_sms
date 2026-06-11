'use server';

// Import Prisma client
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'node:crypto';

/**
 * Generates a unique 8-character token for a student to access their result.
 * Performs an upsert to either create a new token or reset an existing one for the student/term.
 */
export async function generateResultToken(studentId: string, term: string, session: string) {
    try {
        // Generate unique 8-character token
        const token = randomBytes(4).toString('hex').toUpperCase();

        // Resolve term record
        const termRecord = await prisma.term.findFirst({
            where: {
                OR: [
                    { id: term },
                    { name: term },
                    { name: term.replace("First Term", "Term 1").replace("Second Term", "Term 2").replace("Third Term", "Term 3") },
                    { name: term.replace("Term 1", "First Term").replace("Term 2", "Second Term").replace("Term 3", "Third Term") }
                ]
            }
        });

        if (!termRecord) {
            throw new Error(`Term ${term} not found`);
        }

        // Resolve student record
        const student = await prisma.student.findFirst({
            where: {
                OR: [
                    { id: studentId },
                    { studentId: studentId }
                ]
            }
        });

        if (!student) {
            throw new Error(`Student ${studentId} not found`);
        }

        // Perform upsert of ResultToken
        await prisma.resultToken.upsert({
            where: {
                studentId_termId: {
                    studentId: student.id,
                    termId: termRecord.id
                }
            },
            update: {
                token,
                usageCount: 0,
                maxUsage: 5,
                session
            },
            create: {
                schoolId: student.schoolId,
                studentId: student.id,
                termId: termRecord.id,
                session,
                token,
                usageCount: 0,
                maxUsage: 5
            }
        });

        return { success: true, token };
    } catch (error) {
        console.error('Error generating token:', error);
        throw new Error('Failed to generate token');
    }
}

/**
 * Validates a given result token and admission number, increments the usage count,
 * and returns the student's result data (TermGrades and Behavioural Assessment).
 */
export async function validateAndUseToken(admissionNumber: string, token: string, term: string, session: string) {
    try {
        // Find student by admission number
        const student = await prisma.student.findFirst({
            where: {
                OR: [
                    { id: admissionNumber },
                    { studentId: admissionNumber }
                ]
            },
            include: {
                class: true
            }
        });

        if (!student) {
            return { success: false, error: 'Student not found' };
        }

        // Resolve term record
        const termRecord = await prisma.term.findFirst({
            where: {
                OR: [
                    { id: term },
                    { name: term },
                    { name: term.replace("First Term", "Term 1").replace("Second Term", "Term 2").replace("Third Term", "Term 3") },
                    { name: term.replace("Term 1", "First Term").replace("Term 2", "Second Term").replace("Term 3", "Third Term") }
                ]
            }
        });

        if (!termRecord) {
            return { success: false, error: 'Term not found' };
        }

        // Find token record
        const tokenRecord = await prisma.resultToken.findFirst({
            where: {
                studentId: student.id,
                token: token,
                termId: termRecord.id,
                session: session
            }
        });

        if (!tokenRecord) {
            return { success: false, error: 'Invalid token' };
        }

        // Check usage count limit
        if (tokenRecord.usageCount >= tokenRecord.maxUsage) {
            return { success: false, error: 'Token usage limit exceeded' };
        }

        // Increment usage count
        await prisma.resultToken.update({
            where: { id: tokenRecord.id },
            data: {
                usageCount: tokenRecord.usageCount + 1
            }
        });

        // Fetch academic TermGrade data for the student
        const scores = await prisma.termGrade.findMany({
            where: {
                studentId: student.id,
                termId: termRecord.id
            },
            include: {
                subject: true
            }
        });

        const mappedScores = scores.map(s => ({
            id: s.id,
            subjectId: s.subjectId,
            subjectName: s.subject.name,
            ca1: s.ca1,
            ca2: s.ca2,
            exam: s.exam,
            totalScore: s.total,
            grade: s.grade,
            remarks: s.remarks
        }));

        // Fetch behavioural assessment data
        const behavioural = await prisma.behaviouralAssessment.findFirst({
            where: {
                studentId: student.id,
                termId: termRecord.id,
                session: session
            }
        });

        const totalMarks = mappedScores.reduce((sum, s) => sum + (s.totalScore || 0), 0);
        const average = mappedScores.length > 0 ? totalMarks / mappedScores.length : 0;

        // Calculate overall grade descriptor based on average score
        let overallGrade = 'F';
        if (average >= 80) overallGrade = 'A';
        else if (average >= 70) overallGrade = 'B';
        else if (average >= 60) overallGrade = 'C';
        else if (average >= 50) overallGrade = 'D';
        else if (average >= 40) overallGrade = 'E';

        return {
            success: true,
            data: {
                student: {
                    id: student.id,
                    studentId: student.studentId,
                    firstName: student.firstName,
                    lastName: student.lastName,
                    classLevel: student.class?.name || '',
                    status: student.status
                },
                scores: mappedScores,
                behavioural,
                totalMarks,
                average,
                overallGrade,
                remainingUses: tokenRecord.maxUsage - (tokenRecord.usageCount + 1)
            }
        };
    } catch (error) {
        console.error('Error validating token:', error);
        return { success: false, error: 'Failed to validate token' };
    }
}
