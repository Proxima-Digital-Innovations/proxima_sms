'use server';

import * as XLSX from 'xlsx';
// Import Prisma client
import { prisma } from '@/lib/prisma';

/**
 * Uploads student ca/exam scores from an uploaded Excel file and upserts them into TermGrade.
 */
export async function uploadScoresFromExcel(
    file: File, 
    subject: string, 
    classLevel: string, 
    term: string, 
    session: string
) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet);

        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        // Resolve subject
        let subjectRecord = await prisma.subject.findFirst({
            where: {
                OR: [
                    { id: subject },
                    { name: subject }
                ]
            }
        });

        if (!subjectRecord) {
            const firstSchool = await prisma.school.findFirst();
            if (!firstSchool) throw new Error("No school found in the system");
            
            subjectRecord = await prisma.subject.create({
                data: {
                    schoolId: firstSchool.id,
                    name: subject
                }
            });
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
            throw new Error(`Term ${term} not found`);
        }

        for (const rowData of data) {
            try {
                const row = rowData as any;
                const studentId = row['Student ID'] || row['studentId'];
                const caScore = Number(row['CA Score'] || row['caScore'] || 0);
                const examScore = Number(row['Exam Score'] || row['examScore'] || 0);
                
                if (!studentId) {
                    errors.push(`Row missing student ID`);
                    errorCount++;
                    continue;
                }

                // Validate scores
                if (caScore < 0 || caScore > 40 || examScore < 0 || examScore > 60) {
                    errors.push(`Invalid scores for student ${studentId}`);
                    errorCount++;
                    continue;
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
                    errors.push(`Student ${studentId} not found`);
                    errorCount++;
                    continue;
                }

                const totalScore = caScore + examScore;
                let grade = 'F';
                if (totalScore >= 80) grade = 'A';
                else if (totalScore >= 70) grade = 'B';
                else if (totalScore >= 60) grade = 'C';
                else if (totalScore >= 50) grade = 'D';
                else if (totalScore >= 40) grade = 'E';

                // Upsert term grade
                await prisma.termGrade.upsert({
                    where: {
                        studentId_subjectId_termId: {
                            studentId: student.id,
                            subjectId: subjectRecord.id,
                            termId: termRecord.id
                        }
                    },
                    update: {
                        ca1: caScore,
                        exam: examScore,
                        total: totalScore,
                        grade: grade
                    },
                    create: {
                        schoolId: student.schoolId,
                        studentId: student.id,
                        subjectId: subjectRecord.id,
                        termId: termRecord.id,
                        ca1: caScore,
                        exam: examScore,
                        total: totalScore,
                        grade: grade
                    }
                });

                successCount++;
            } catch (error) {
                errors.push(`Error processing row: ${error}`);
                errorCount++;
            }
        }

        return {
            success: true,
            successCount,
            errorCount,
            errors
        };
    } catch (error) {
        console.error('Error uploading scores:', error);
        throw new Error('Failed to upload scores');
    }
}

/**
 * Uploads midterm scores from an uploaded Excel file and upserts them into MidtermResult.
 */
export async function uploadMidtermFromExcel(
    file: File, 
    subject: string, 
    classLevel: string, 
    term: string, 
    session: string
) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet);

        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        // Resolve subject
        let subjectRecord = await prisma.subject.findFirst({
            where: {
                OR: [
                    { id: subject },
                    { name: subject }
                ]
            }
        });

        if (!subjectRecord) {
            const firstSchool = await prisma.school.findFirst();
            if (!firstSchool) throw new Error("No school found in the system");
            
            subjectRecord = await prisma.subject.create({
                data: {
                    schoolId: firstSchool.id,
                    name: subject
                }
            });
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
            throw new Error(`Term ${term} not found`);
        }

        for (const rowData of data) {
            try {
                const row = rowData as any;
                const studentId = row['Student ID'] || row['studentId'];
                const score = Number(row['Score'] || row['score'] || 0);
                const achievement = row['Achievement'] || row['achievement'] || '';
                
                if (!studentId) {
                    errors.push(`Row missing student ID`);
                    errorCount++;
                    continue;
                }

                if (score < 0 || score > 20) {
                    errors.push(`Invalid score for student ${studentId}`);
                    errorCount++;
                    continue;
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
                    errors.push(`Student ${studentId} not found`);
                    errorCount++;
                    continue;
                }

                // Upsert MidtermResult
                await prisma.midtermResult.upsert({
                    where: {
                        studentId_subjectId_termId: {
                            studentId: student.id,
                            subjectId: subjectRecord.id,
                            termId: termRecord.id
                        }
                    },
                    update: {
                        score: score,
                        achievement: achievement,
                        session: session
                    },
                    create: {
                        schoolId: student.schoolId,
                        studentId: student.id,
                        subjectId: subjectRecord.id,
                        termId: termRecord.id,
                        session: session,
                        score: score,
                        achievement: achievement
                    }
                });

                successCount++;
            } catch (error) {
                errors.push(`Error processing row: ${error}`);
                errorCount++;
            }
        }

        return {
            success: true,
            successCount,
            errorCount,
            errors
        };
    } catch (error) {
        console.error('Error uploading midterm:', error);
        throw new Error('Failed to upload midterm results');
    }
}

/**
 * Generates an Excel template with student details for recording term grades.
 */
export async function generateScoreTemplate(classLevel: string) {
    try {
        // Query active students in the selected class level
        const students = await prisma.student.findMany({
            where: {
                class: {
                    name: classLevel
                },
                status: 'Active'
            }
        });
        
        const studentsData = students.map(s => ({
            'Student ID': s.id,
            'Student Name': `${s.firstName} ${s.lastName}`,
            'Admission Number': s.studentId,
            'CA Score': 0,
            'Exam Score': 0
        }));

        const worksheet = XLSX.utils.json_to_sheet(studentsData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    } catch (error) {
        console.error('Error generating template:', error);
        throw new Error('Failed to generate template');
    }
}

/**
 * Generates an Excel template with student details for recording midterm scores.
 */
export async function generateMidtermTemplate(classLevel: string) {
    try {
        // Query active students in the selected class level
        const students = await prisma.student.findMany({
            where: {
                class: {
                    name: classLevel
                },
                status: 'Active'
            }
        });
        
        const studentsData = students.map(s => ({
            'Student ID': s.id,
            'Student Name': `${s.firstName} ${s.lastName}`,
            'Admission Number': s.studentId,
            'Score': 0,
            'Achievement': ''
        }));

        const worksheet = XLSX.utils.json_to_sheet(studentsData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    } catch (error) {
        console.error('Error generating template:', error);
        throw new Error('Failed to generate template');
    }
}
