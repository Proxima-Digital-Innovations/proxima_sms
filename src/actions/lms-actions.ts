'use server';

import { requireSchoolId } from '@/lib/server-context';
import { revalidatePath } from 'next/cache';
import { LmsService } from '@/lib/services/lms-service';
import { dbService } from '@/lib/dbService';

const lmsService = new LmsService();

export async function getLessonNotes(role: string, teacherId?: string) {
    try {
        
        const notes = await lmsService.getLessonNotes(role, teacherId);
        return { success: true, notes };
    } catch (error: any) {
        return { success: false, notes: [], error: error.message };
    }
}

export async function submitLessonNote(formData: FormData) {
    try {
        
        const note = await lmsService.submitLessonNote(formData);

        revalidatePath('/dashboard/lesson-notes');
        return { success: true, note };
    } catch (error: any) {
        console.error('Submit note error:', error);
        return { success: false, error: error.message };
    }
}

export async function getLessonNote(id: string) {
    try {
        
        const note = await lmsService.getLessonNote(id);
        return { success: true, note };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateLessonNoteStatus(id: string, status: string, feedback?: string) {
    try {
        
        const note = await lmsService.updateLessonNoteStatus(id, status, feedback);
        
        revalidatePath(`/dashboard/lesson-notes/${id}`);
        revalidatePath('/dashboard/lesson-notes');
        
        return { success: true, note };
    } catch (error: any) {
        console.error('Update note error:', error);
        return { success: false, error: error.message };
    }
}

export async function getExamQuestion(collectionName: string, id: string) {
  try {
    const question = await dbService.getDoc(collectionName, id);
    if (!question) return { success: false, error: 'Question not found' };
    
    const students = await dbService.getDocs('students', {
      classLevel: (question as any).class
    });
    
    let male = 0, female = 0;
    students.forEach((s: any) => {
      if (s.gender === 'Male') male++;
      if (s.gender === 'Female') female++;
    });

    return { success: true, data: { question, genderCount: { male, female } } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateExamQuestionStatus(collectionName: string, id: string, status: string) {
  try {
    await dbService.updateDoc(collectionName, id, { status });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getExamQuestionsData(collectionName: string = 'examQuestions') {
  try {
    const questions = await dbService.getDocs(collectionName, {});
    return { success: true, data: questions };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
