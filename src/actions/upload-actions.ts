'use server';

import * as XLSX from 'xlsx';
import { UploadService } from '@/lib/services/upload-service';

const uploadService = new UploadService();

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

        const subjectRecord = await uploadService.resolveSubject(subject);
        const termRecord = await uploadService.resolveTerm(term);

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

                if (caScore < 0 || caScore > 40 || examScore < 0 || examScore > 60) {
                    errors.push(`Invalid scores for student ${studentId}`);
                    errorCount++;
                    continue;
                }

                await uploadService.processScoreRow(studentId, caScore, examScore, subjectRecord, termRecord);
                successCount++;
            } catch (error: any) {
                errors.push(`Error processing row: ${error.message}`);
                errorCount++;
            }
        }

        return { success: true, successCount, errorCount, errors };
    } catch (error) {
        console.error('Error uploading scores:', error);
        throw new Error('Failed to upload scores');
    }
}

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

        const subjectRecord = await uploadService.resolveSubject(subject);
        const termRecord = await uploadService.resolveTerm(term);

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

                await uploadService.processMidtermRow(studentId, score, achievement, session, subjectRecord, termRecord);
                successCount++;
            } catch (error: any) {
                errors.push(`Error processing row: ${error.message}`);
                errorCount++;
            }
        }

        return { success: true, successCount, errorCount, errors };
    } catch (error) {
        console.error('Error uploading midterm:', error);
        throw new Error('Failed to upload midterm results');
    }
}

export async function generateScoreTemplate(classLevel: string) {
    try {
        const studentsData = await uploadService.getStudentsDataForTemplate(classLevel, false);
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

export async function generateMidtermTemplate(classLevel: string) {
    try {
        const studentsData = await uploadService.getStudentsDataForTemplate(classLevel, true);
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
