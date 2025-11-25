'use server';

import { collection, getDocs, query, where, addDoc, updateDoc, doc, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function getMidtermResults(classLevel: string, term: string, session: string) {
    try {
        const q = query(
            collection(db, 'midterm_results'),
            where('class', '==', classLevel),
            where('term', '==', term),
            where('session', '==', session)
        );
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error fetching midterm results:', error);
        throw new Error('Failed to fetch midterm results');
    }
}

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
        const batch = writeBatch(db);
        
        for (const result of results) {
            // Check if result already exists
            const q = query(
                collection(db, 'midterm_results'),
                where('studentId', '==', result.studentId),
                where('subjectId', '==', result.subjectId),
                where('term', '==', result.term),
                where('session', '==', result.session)
            );
            
            const existing = await getDocs(q);
            
            if (existing.empty) {
                // Create new
                const docRef = doc(collection(db, 'midterm_results'));
                batch.set(docRef, {
                    ...result,
                    createdAt: Timestamp.now()
                });
            } else {
                // Update existing
                const docRef = doc(db, 'midterm_results', existing.docs[0].id);
                batch.update(docRef, {
                    score: result.score,
                    achievement: result.achievement
                });
            }
        }
        
        await batch.commit();
        return { success: true };
    } catch (error) {
        console.error('Error saving midterm results:', error);
        throw new Error('Failed to save midterm results');
    }
}

export async function calculateAchievement(score: number): Promise<string> {
    if (score >= 0 && score <= 6) return 'Emerging';
    if (score >= 7 && score <= 9) return 'Emerging +';
    if (score >= 10 && score <= 12) return 'Expected';
    if (score >= 13 && score <= 16) return 'Expected +';
    if (score >= 17 && score <= 20) return 'Exceeding';
    return 'Invalid';
}

export async function getStudentMidtermReport(studentId: string, term: string, session: string) {
    try {
        const q = query(
            collection(db, 'midterm_results'),
            where('studentId', '==', studentId),
            where('term', '==', term),
            where('session', '==', session)
        );
        
        const snapshot = await getDocs(q);
        const results = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Calculate average score
        const totalScore = results.reduce((sum: number, r: any) => sum + r.score, 0);
        const averageScore = results.length > 0 ? totalScore / results.length : 0;
        
        // Get student info
        const studentSnap = await getDocs(query(collection(db, 'students'), where('id', '==', studentId)));
        const student = studentSnap.docs[0]?.data();
        
        return {
            student,
            results,
            averageScore
        };
    } catch (error) {
        console.error('Error fetching student report:', error);
        throw new Error('Failed to fetch student report');
    }
}

export async function getClassMidtermReports(classLevel: string, term: string, session: string) {
    try {
        // Get all students in class
        const studentsSnap = await getDocs(
            query(collection(db, 'students'), where('classLevel', '==', classLevel))
        );
        
        const students = studentsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        const reports = [];
        
        for (const student of students) {
            const report = await getStudentMidtermReport(student.id, term, session);
            reports.push(report);
        }
        
        return reports;
    } catch (error) {
        console.error('Error fetching class reports:', error);
        throw new Error('Failed to fetch class reports');
    }
}
