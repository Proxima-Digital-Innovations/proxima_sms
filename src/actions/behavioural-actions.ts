'use server';

import { collection, getDocs, query, where, writeBatch, doc, Timestamp, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
        // Check if exists
        const q = query(
            collection(db, 'behavioural_assessments'),
            where('studentId', '==', data.studentId),
            where('term', '==', data.term),
            where('session', '==', data.session)
        );
        
        const existing = await getDocs(q);
        
        if (existing.empty) {
            await addDoc(collection(db, 'behavioural_assessments'), {
                ...data,
                createdAt: Timestamp.now()
            });
        } else {
            await updateDoc(doc(db, 'behavioural_assessments', existing.docs[0].id), data);
        }
        
        return { success: true };
    } catch (error) {
        console.error('Error saving behavioural assessment:', error);
        throw new Error('Failed to save behavioural assessment');
    }
}

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
        // Check if exists
        const q = query(
            collection(db, 'tahfeez_scores'),
            where('studentId', '==', data.studentId),
            where('term', '==', data.term),
            where('session', '==', data.session)
        );
        
        const existing = await getDocs(q);
        
        if (existing.empty) {
            await addDoc(collection(db, 'tahfeez_scores'), {
                ...data,
                createdAt: Timestamp.now()
            });
        } else {
            await updateDoc(doc(db, 'tahfeez_scores', existing.docs[0].id), data);
        }
        
        return { success: true };
    } catch (error) {
        console.error('Error saving tahfeez score:', error);
        throw new Error('Failed to save tahfeez score');
    }
}
