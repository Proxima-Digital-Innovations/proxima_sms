'use server';

// Import the Prisma client
import { prisma } from '@/lib/prisma';

/**
 * Saves or updates a student's behavioural assessment in the PostgreSQL database via Prisma.
 */
export async function saveBehaviouralAssessment(data: {
    studentId: string;
    studentName: string;
    class: string;
    term: string;
    session: string;
    conduct: number;
    punctuality: number;
    dedication: number;
    participation: number;
    hospitality: number;
    neatness: number;
    creativity: number;
    physical: number;
}) {
    try {
        // Resolve student in Prisma database (matches by cuid or display studentId)
        const student = await prisma.student.findFirst({
            where: {
                OR: [
                    { id: data.studentId },
                    { studentId: data.studentId }
                ]
            }
        });

        if (!student) {
            throw new Error(`Student with ID ${data.studentId} not found`);
        }

        // Resolve term record in Prisma database (supports ID, name, or alternative term names)
        const termRecord = await prisma.term.findFirst({
            where: {
                OR: [
                    { id: data.term },
                    { name: data.term },
                    { name: data.term.replace("First Term", "Term 1").replace("Second Term", "Term 2").replace("Third Term", "Term 3") },
                    { name: data.term.replace("Term 1", "First Term").replace("Term 2", "Second Term").replace("Term 3", "Third Term") }
                ]
            }
        });

        if (!termRecord) {
            throw new Error(`Term ${data.term} not found`);
        }

        // Perform upsert of behavioural assessment using composite key
        await prisma.behaviouralAssessment.upsert({
            where: {
                studentId_termId: {
                    studentId: student.id,
                    termId: termRecord.id
                }
            },
            update: {
                session: data.session,
                conduct: data.conduct,
                punctuality: data.punctuality,
                dedication: data.dedication,
                participation: data.participation,
                hospitality: data.hospitality,
                neatness: data.neatness,
                creativity: data.creativity,
                physical: data.physical
            },
            create: {
                schoolId: student.schoolId,
                studentId: student.id,
                termId: termRecord.id,
                session: data.session,
                conduct: data.conduct,
                punctuality: data.punctuality,
                dedication: data.dedication,
                participation: data.participation,
                hospitality: data.hospitality,
                neatness: data.neatness,
                creativity: data.creativity,
                physical: data.physical
            }
        });

        return { success: true };
    } catch (error) {
        console.error('Error saving behavioural assessment:', error);
        throw new Error('Failed to save behavioural assessment');
    }
}

/**
 * Saves or updates a student's Tahfeez score in the PostgreSQL database via Prisma.
 */
export async function saveTahfeezScore(data: {
    studentId: string;
    studentName: string;
    class: string;
    term: string;
    session: string;
    surah?: string;
    juz?: number;
    page?: number;
    marks: number;
}) {
    try {
        // Resolve student in Prisma database
        const student = await prisma.student.findFirst({
            where: {
                OR: [
                    { id: data.studentId },
                    { studentId: data.studentId }
                ]
            }
        });

        if (!student) {
            throw new Error(`Student with ID ${data.studentId} not found`);
        }

        // Resolve term record in Prisma database
        const termRecord = await prisma.term.findFirst({
            where: {
                OR: [
                    { id: data.term },
                    { name: data.term },
                    { name: data.term.replace("First Term", "Term 1").replace("Second Term", "Term 2").replace("Third Term", "Term 3") },
                    { name: data.term.replace("Term 1", "First Term").replace("Term 2", "Second Term").replace("Term 3", "Third Term") }
                ]
            }
        });

        if (!termRecord) {
            throw new Error(`Term ${data.term} not found`);
        }

        // Check if there is an existing score for student + term + session
        const existingScore = await prisma.tahfeezScore.findFirst({
            where: {
                studentId: student.id,
                termId: termRecord.id,
                session: data.session
            }
        });

        if (existingScore) {
            // Update the existing score record
            await prisma.tahfeezScore.update({
                where: { id: existingScore.id },
                data: {
                    surah: data.surah || null,
                    juz: data.juz || null,
                    page: data.page || null,
                    marks: data.marks
                }
            });
        } else {
            // Create a new score record
            await prisma.tahfeezScore.create({
                data: {
                    schoolId: student.schoolId,
                    studentId: student.id,
                    termId: termRecord.id,
                    session: data.session,
                    surah: data.surah || null,
                    juz: data.juz || null,
                    page: data.page || null,
                    marks: data.marks
                }
            });
        }

        return { success: true };
    } catch (error) {
        console.error('Error saving tahfeez score:', error);
        throw new Error('Failed to save tahfeez score');
    }
}

/**
 * Fetches all behavioural assessments for students in a given class, term, and session.
 * Returns an array with studentId (display ID) and rating fields for each record found.
 */
export async function getBehaviouralAssessments(
    className: string,
    term: string,
    session: string
) {
    // Look up the term record by name or ID
    const termRecord = await prisma.term.findFirst({
        where: {
            OR: [
                { id: term },
                { name: term },
                // Support alternate term naming conventions
                { name: term.replace('First Term', 'Term 1').replace('Second Term', 'Term 2').replace('Third Term', 'Term 3') },
                { name: term.replace('Term 1', 'First Term').replace('Term 2', 'Second Term').replace('Term 3', 'Third Term') }
            ]
        }
    });

    // If the term doesn't exist yet, return an empty array
    if (!termRecord) return [];

    return prisma.behaviouralAssessment.findMany({
        where: {
            // Scope to students who belong to the specified class
            student: { class: { name: className } },
            termId: termRecord.id,
            session,
        },
        include: {
            // Include the student's display studentId so the page can key records
            student: { select: { studentId: true } },
        },
    });
}

/**
 * Fetches all Tahfeez scores for students in a given class, term, and session.
 * Returns an array with studentId (display ID) and marks for each record found.
 */
export async function getTahfeezScores(
    className: string,
    term: string,
    session: string
) {
    // Look up the term record by name or ID
    const termRecord = await prisma.term.findFirst({
        where: {
            OR: [
                { id: term },
                { name: term },
                { name: term.replace('First Term', 'Term 1').replace('Second Term', 'Term 2').replace('Third Term', 'Term 3') },
                { name: term.replace('Term 1', 'First Term').replace('Term 2', 'Second Term').replace('Term 3', 'Third Term') }
            ]
        }
    });

    // If the term doesn't exist yet, return an empty array
    if (!termRecord) return [];

    return prisma.tahfeezScore.findMany({
        where: {
            // Scope to students who belong to the specified class
            student: { class: { name: className } },
            termId: termRecord.id,
            session,
        },
        include: {
            // Include the student's display studentId so the page can key records
            student: { select: { studentId: true } },
        },
    });
}
