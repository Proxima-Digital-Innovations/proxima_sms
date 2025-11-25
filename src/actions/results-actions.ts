'use server';

import { collection, getDocs, query, where, writeBatch, doc, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function calculateGrade(score: number): Promise<string> {
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    if (score >= 40) return 'E';
    return 'F';
}

export async function calculateClassPositions(classLevel: string, term: string, session: string) {
    try {
        // Get all students in class
        const studentsSnap = await getDocs(
            query(collection(db, 'students'), where('classLevel', '==', classLevel), where('status', '==', 'Active'))
        );
        
        const students = studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Get all scores for this class/term/session
        const scoresSnap = await getDocs(
            query(
                collection(db, 'scores'),
                where('class', '==', classLevel),
                where('term', '==', term)
            )
        );
        
        const scores = scoresSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Calculate total for each student
        const studentTotals = students.map(student => {
            const studentScores = scores.filter((s: any) => s.studentId === student.id);
            const total = studentScores.reduce((sum: number, s: any) => sum + (s.totalScore || 0), 0);
            const average = studentScores.length > 0 ? total / studentScores.length : 0;
            
            return {
                studentId: student.id,
                total,
                average,
                subjectCount: studentScores.length
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

export async function generateResultCard(studentId: string, term: string, session: string) {
    try {
        // Get student
        const studentSnap = await getDocs(
            query(collection(db, 'students'), where('id', '==', studentId))
        );
        const student = studentSnap.docs[0]?.data();
        
        if (!student) throw new Error('Student not found');
        
        // Get scores
        const scoresSnap = await getDocs(
            query(
                collection(db, 'scores'),
                where('studentId', '==', studentId),
                where('term', '==', term)
            )
        );
        
        const scores = scoresSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Calculate totals
        const totalMarks = scores.reduce((sum: number, s: any) => sum + (s.totalScore || 0), 0);
        const average = scores.length > 0 ? totalMarks / scores.length : 0;
        const overallGrade = await calculateGrade(average);
        
        // Get position
        const positions = await calculateClassPositions(student.classLevel, term, session);
        const position = positions[studentId] || 0;
        
        // Get behavioural assessment
        const behaviouralSnap = await getDocs(
            query(
                collection(db, 'behavioural_assessments'),
                where('studentId', '==', studentId),
                where('term', '==', term),
                where('session', '==', session)
            )
        );
        
        const behavioural = behaviouralSnap.docs[0]?.data();
        
        return {
            student,
            scores,
            totalMarks,
            average,
            overallGrade,
            position,
            behavioural
        };
    } catch (error) {
        console.error('Error generating result card:', error);
        throw new Error('Failed to generate result card');
    }
}

export async function saveScores(scores: Array<{
    studentId: string;
    studentName: string;
    subject: string;
    class: string;
    teacherId: string;
    term: string;
    caScore: number;
    examScore: number;
}>) {
    try {
        const batch = writeBatch(db);
        
        for (const score of scores) {
            const totalScore = score.caScore + score.examScore;
            const grade = await calculateGrade(totalScore);
            
            // Check if exists
            const q = query(
                collection(db, 'scores'),
                where('studentId', '==', score.studentId),
                where('subject', '==', score.subject),
                where('term', '==', score.term)
            );
            
            const existing = await getDocs(q);
            
            if (existing.empty) {
                const docRef = doc(collection(db, 'scores'));
                batch.set(docRef, {
                    ...score,
                    totalScore,
                    grade,
                    status: 'Approved',
                    createdAt: Timestamp.now()
                });
            } else {
                const docRef = doc(db, 'scores', existing.docs[0].id);
                batch.update(docRef, {
                    caScore: score.caScore,
                    examScore: score.examScore,
                    totalScore,
                    grade
                });
            }
        }
        
        await batch.commit();
        return { success: true };
    } catch (error) {
        console.error('Error saving scores:', error);
        throw new Error('Failed to save scores');
    }
}
