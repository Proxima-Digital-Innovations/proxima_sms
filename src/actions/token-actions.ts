'use server';

import { collection, addDoc, getDocs, query, where, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { randomBytes } from 'crypto';

export async function generateResultToken(studentId: string, term: string, session: string) {
    try {
        // Generate unique 8-character token
        const token = randomBytes(4).toString('hex').toUpperCase();

        // Check if token already exists for this student/term/session
        const existingQuery = query(
            collection(db, 'result_tokens'),
            where('studentId', '==', studentId),
            where('term', '==', term),
            where('session', '==', session)
        );
        const existing = await getDocs(existingQuery);

        if (!existing.empty) {
            // Update existing token
            const docRef = doc(db, 'result_tokens', existing.docs[0].id);
            await updateDoc(docRef, {
                token,
                usageCount: 0,
                maxUsage: 5,
                createdAt: Timestamp.now()
            });
            return { success: true, token };
        }

        // Create new token
        await addDoc(collection(db, 'result_tokens'), {
            studentId,
            term,
            session,
            token,
            usageCount: 0,
            maxUsage: 5,
            createdAt: Timestamp.now()
        });

        return { success: true, token };
    } catch (error) {
        console.error('Error generating token:', error);
        throw new Error('Failed to generate token');
    }
}

export async function validateAndUseToken(admissionNumber: string, token: string, term: string, session: string) {
    try {
        // Find student by admission number
        const studentsQuery = query(
            collection(db, 'students'),
            where('studentId', '==', admissionNumber)
        );
        const studentsSnap = await getDocs(studentsQuery);

        if (studentsSnap.empty) {
            return { success: false, error: 'Student not found' };
        }

        const student = { id: studentsSnap.docs[0].id, ...studentsSnap.docs[0].data() };

        // Find token
        const tokensQuery = query(
            collection(db, 'result_tokens'),
            where('studentId', '==', student.id),
            where('token', '==', token),
            where('term', '==', term),
            where('session', '==', session)
        );
        const tokensSnap = await getDocs(tokensQuery);

        if (tokensSnap.empty) {
            return { success: false, error: 'Invalid token' };
        }

        const tokenData = tokensSnap.docs[0].data();

        // Check usage count
        if (tokenData.usageCount >= tokenData.maxUsage) {
            return { success: false, error: 'Token usage limit exceeded' };
        }

        // Increment usage count
        const tokenDocRef = doc(db, 'result_tokens', tokensSnap.docs[0].id);
        await updateDoc(tokenDocRef, {
            usageCount: tokenData.usageCount + 1
        });

        // Fetch result data
        const scoresQuery = query(
            collection(db, 'scores'),
            where('studentId', '==', student.id),
            where('term', '==', term)
        );
        const scoresSnap = await getDocs(scoresQuery);
        const scores = scoresSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Fetch behavioural
        const behaviouralQuery = query(
            collection(db, 'behavioural_assessments'),
            where('studentId', '==', student.id),
            where('term', '==', term),
            where('session', '==', session)
        );
        const behaviouralSnap = await getDocs(behaviouralQuery);
        const behavioural = behaviouralSnap.empty ? null : behaviouralSnap.docs[0].data();

        const totalMarks = scores.reduce((sum, s: any) => sum + (s.totalScore || 0), 0);
        const average = scores.length > 0 ? totalMarks / scores.length : 0;

        let overallGrade = 'F';
        if (average >= 80) overallGrade = 'A';
        else if (average >= 70) overallGrade = 'B';
        else if (average >= 60) overallGrade = 'C';
        else if (average >= 50) overallGrade = 'D';
        else if (average >= 40) overallGrade = 'E';

        return {
            success: true,
            data: {
                student,
                scores,
                behavioural,
                totalMarks,
                average,
                overallGrade,
                remainingUses: tokenData.maxUsage - (tokenData.usageCount + 1)
            }
        };
    } catch (error) {
        console.error('Error validating token:', error);
        return { success: false, error: 'Failed to validate token' };
    }
}
