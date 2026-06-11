'use server';

// Import Prisma database client
import { prisma } from '@/lib/prisma';

/**
 * Fetches midterm results for all students in a given class, term, and session.
 */
export async function getMidtermResults(classLevel: string, term: string, session: string) {
    try {
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

        if (!termRecord) return [];

        const results = await prisma.midtermResult.findMany({
            where: {
                student: {
                    class: {
                        name: classLevel
                    }
                },
                termId: termRecord.id,
                session: session
            },
            include: {
                student: {
                    include: {
                        class: true
                    }
                },
                subject: true,
                term: true
            }
        });

        return results.map(r => ({
            id: r.id,
            studentId: r.studentId,
            studentName: `${r.student.firstName} ${r.student.lastName}`,
            subjectId: r.subjectId,
            subjectName: r.subject.name,
            class: r.student.class?.name || classLevel,
            term: r.term.name,
            session: r.session,
            score: r.score,
            achievement: r.achievement
        }));
    } catch (error) {
        console.error('Error fetching midterm results:', error);
        throw new Error('Failed to fetch midterm results');
    }
}

/**
 * Saves a batch of midterm results, performing upserts to ensure uniqueness.
 */
export async function saveMidtermResults(results: Array<{
    studentId: string;
    studentName: string;
    subjectId: string;
    subjectName: string;
    class: string;
    term: string;
    session: string;
    score: number;
    achievement: string;
}>) {
    try {
        for (const result of results) {
            // Find student by ID or display studentId
            const student = await prisma.student.findFirst({
                where: {
                    OR: [
                        { id: result.studentId },
                        { studentId: result.studentId }
                    ]
                }
            });

            if (!student) continue;

            // Find or create the subject in the school
            let subject = await prisma.subject.findFirst({
                where: {
                    OR: [
                        { id: result.subjectId },
                        { name: result.subjectId },
                        { name: result.subjectName }
                    ],
                    schoolId: student.schoolId
                }
            });

            if (!subject) {
                subject = await prisma.subject.create({
                    data: {
                        schoolId: student.schoolId,
                        name: result.subjectName || result.subjectId
                    }
                });
            }

            // Find the term record
            const termRecord = await prisma.term.findFirst({
                where: {
                    OR: [
                        { id: result.term },
                        { name: result.term },
                        { name: result.term.replace("First Term", "Term 1").replace("Second Term", "Term 2").replace("Third Term", "Term 3") },
                        { name: result.term.replace("Term 1", "First Term").replace("Term 2", "Second Term").replace("Term 3", "Third Term") }
                    ]
                }
            });

            if (!termRecord) continue;

            // Upsert midterm result
            await prisma.midtermResult.upsert({
                where: {
                    studentId_subjectId_termId: {
                        studentId: student.id,
                        subjectId: subject.id,
                        termId: termRecord.id
                    }
                },
                update: {
                    score: result.score,
                    achievement: result.achievement,
                    session: result.session
                },
                create: {
                    schoolId: student.schoolId,
                    studentId: student.id,
                    subjectId: subject.id,
                    termId: termRecord.id,
                    session: result.session,
                    score: result.score,
                    achievement: result.achievement
                }
            });
        }
        
        return { success: true };
    } catch (error) {
        console.error('Error saving midterm results:', error);
        throw new Error('Failed to save midterm results');
    }
}

/**
 * Helper to compute achievement descriptor from raw midterm score.
 */
export async function calculateAchievement(score: number): Promise<string> {
    if (score >= 0 && score <= 6) return 'Emerging';
    if (score >= 7 && score <= 9) return 'Emerging +';
    if (score >= 10 && score <= 12) return 'Expected';
    if (score >= 13 && score <= 16) return 'Expected +';
    if (score >= 17 && score <= 20) return 'Exceeding';
    return 'Invalid';
}

/**
 * Generates a midterm report card summary for a specific student.
 */
export async function getStudentMidtermReport(studentId: string, term: string, session: string) {
    try {
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
            throw new Error('Term not found');
        }

        const student = await prisma.student.findFirst({
            where: {
                OR: [
                    { id: studentId },
                    { studentId: studentId }
                ]
            },
            include: {
                class: true
            }
        });

        if (!student) {
            throw new Error('Student not found');
        }

        const results = await prisma.midtermResult.findMany({
            where: {
                studentId: student.id,
                termId: termRecord.id,
                session: session
            },
            include: {
                subject: true,
                term: true
            }
        });

        const mappedResults = results.map(r => ({
            id: r.id,
            studentId: student.id,
            studentName: `${student.firstName} ${student.lastName}`,
            subjectId: r.subjectId,
            subjectName: r.subject.name,
            class: student.class?.name || '',
            term: termRecord.name,
            session: r.session,
            score: r.score,
            achievement: r.achievement
        }));

        const totalScore = results.reduce((sum, r) => sum + r.score, 0);
        const averageScore = results.length > 0 ? totalScore / results.length : 0;

        return {
            student: {
                id: student.id,
                studentId: student.studentId,
                firstName: student.firstName,
                lastName: student.lastName,
                classLevel: student.class?.name || '',
                status: student.status
            },
            results: mappedResults,
            averageScore
        };
    } catch (error) {
        console.error('Error fetching student report:', error);
        throw new Error('Failed to fetch student report');
    }
}

/**
 * Fetches midterm reports for all students enrolled in a class.
 */
export async function getClassMidtermReports(classLevel: string, term: string, session: string) {
    try {
        const students = await prisma.student.findMany({
            where: {
                class: {
                    name: classLevel
                },
                status: 'Active'
            }
        });

        const reports = [];
        for (const student of students) {
            try {
                const report = await getStudentMidtermReport(student.id, term, session);
                reports.push(report);
            } catch (e) {
                console.error(`Error generating report for student ${student.id}:`, e);
            }
        }
        
        return reports;
    } catch (error) {
        console.error('Error fetching class reports:', error);
        throw new Error('Failed to fetch class reports');
    }
}
