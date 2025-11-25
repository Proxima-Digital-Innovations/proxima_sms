'use server';

import { admin } from '@/lib/firebase-admin';
import type { TahfeezScore } from '@/lib/schema';
import { revalidatePath } from 'next/cache';

const db = admin.firestore();

export async function saveTahfeezScores(scores: Omit<TahfeezScore, 'id' | 'createdAt'>[]) {
    try {
        const batch = db.batch();

        scores.forEach(score => {
            const docRef = db.collection('tahfeez').doc();
            batch.set(docRef, {
                ...score,
                createdAt: new Date()
            });
        });

        await batch.commit();
        revalidatePath('/dashboard/tahfeez');
        
        return { success: true };
    } catch (error) {
        console.error('Error saving Tahfeez scores:', error);
        return { success: false, error: 'Failed to save Tahfeez scores' };
    }
}

export async function updateTahfeezScore(scoreId: string, data: Partial<TahfeezScore>) {
    try {
        await db.collection('tahfeez').doc(scoreId).update({
            ...data,
            updatedAt: new Date()
        });
        
        revalidatePath('/dashboard/tahfeez');
        return { success: true };
    } catch (error) {
        console.error('Error updating Tahfeez score:', error);
        return { success: false, error: 'Failed to update Tahfeez score' };
    }
}

export async function deleteTahfeezScore(scoreId: string) {
    try {
        await db.collection('tahfeez').doc(scoreId).delete();
        revalidatePath('/dashboard/tahfeez');
        return { success: true };
    } catch (error) {
        console.error('Error deleting Tahfeez score:', error);
        return { success: false, error: 'Failed to delete Tahfeez score' };
    }
}
