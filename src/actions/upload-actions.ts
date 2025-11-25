'use server';

import * as XLSX from 'xlsx';
import { collection, writeBatch, doc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function uploadScoresFromExcel(file: File, subject: string, classLevel: string, term: string, session: string) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet);

        const batch = writeBatch(db);
        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

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

                const totalScore = caScore + examScore;
                let grade = 'F';
                if (totalScore >= 80) grade = 'A';
                else if (totalScore >= 70) grade = 'B';
                else if (totalScore >= 60) grade = 'C';
                else if (totalScore >= 50) grade = 'D';
                else if (totalScore >= 40) grade = 'E';

                // Check if score exists
                const existingQuery = query(
                    collection(db, 'scores'),
                    where('studentId', '==', studentId),
                    where('subject', '==', subject),
                    where('term', '==', term)
                );
                const existing = await getDocs(existingQuery);

                if (existing.empty) {
                    const docRef = doc(collection(db, 'scores'));
                    batch.set(docRef, {
                        studentId,
                        subject,
                        class: classLevel,
                        term,
                        session,
                        caScore,
                        examScore,
                        totalScore,
                        grade,
                        status: 'Approved',
                        createdAt: Timestamp.now()
                    });
                } else {
                    const docRef = doc(db, 'scores', existing.docs[0].id);
                    batch.update(docRef, {
                        caScore,
                        examScore,
                        totalScore,
                        grade
                    });
                }

                successCount++;
            } catch (error) {
                errors.push(`Error processing row: ${error}`);
                errorCount++;
            }
        }

        await batch.commit();

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

export async function uploadMidtermFromExcel(file: File, subject: string, classLevel: string, term: string, session: string) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet);

        const batch = writeBatch(db);
        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

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

                const existingQuery = query(
                    collection(db, 'midterm_results'),
                    where('studentId', '==', studentId),
                    where('subjectId', '==', subject),
                    where('term', '==', term),
                    where('session', '==', session)
                );
                const existing = await getDocs(existingQuery);

                if (existing.empty) {
                    const docRef = doc(collection(db, 'midterm_results'));
                    batch.set(docRef, {
                        studentId,
                        subjectId: subject,
                        class: classLevel,
                        term,
                        session,
                        score,
                        achievement,
                        createdAt: Timestamp.now()
                    });
                } else {
                    const docRef = doc(db, 'midterm_results', existing.docs[0].id);
                    batch.update(docRef, { score, achievement });
                }

                successCount++;
            } catch (error) {
                errors.push(`Error processing row: ${error}`);
                errorCount++;
            }
        }

        await batch.commit();

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

export async function generateScoreTemplate(classLevel: string) {
    try {
        // Get students
        const studentsSnap = await getDocs(
            query(collection(db, 'students'), where('classLevel', '==', classLevel), where('status', '==', 'Active'))
        );
        
        const students = studentsSnap.docs.map(doc => ({
            'Student ID': doc.id,
            'Student Name': `${doc.data().firstName} ${doc.data().lastName}`,
            'Admission Number': doc.data().studentId,
            'CA Score': 0,
            'Exam Score': 0
        }));

        const worksheet = XLSX.utils.json_to_sheet(students);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    } catch (error) {
        console.error('Error generating template:', error);
        throw new Error('Failed to generate template');
    }
}

export async function generateMidtermTemplate(classLevel: string) {
    try {
        const studentsSnap = await getDocs(
            query(collection(db, 'students'), where('classLevel', '==', classLevel), where('status', '==', 'Active'))
        );
        
        const students = studentsSnap.docs.map(doc => ({
            'Student ID': doc.id,
            'Student Name': `${doc.data().firstName} ${doc.data().lastName}`,
            'Admission Number': doc.data().studentId,
            'Score': 0,
            'Achievement': ''
        }));

        const worksheet = XLSX.utils.json_to_sheet(students);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    } catch (error) {
        console.error('Error generating template:', error);
        throw new Error('Failed to generate template');
    }
}
