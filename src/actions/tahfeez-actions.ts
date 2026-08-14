'use server';

import { revalidatePath } from 'next/cache';
import { requireSchoolId } from '@/lib/server-context';
import { TahfeezService } from '@/lib/services/tahfeez-service';

type TahfeezScoreInput = {
  studentId: string;
  termId:    string;
  session:   string;
  surah?:    string;
  juz?:      number;
  page?:     number;
  marks:     number;
};

function revalidateTahfeez() {
  revalidatePath('/dashboard/tahfeez');
}

const tahfeezService = new TahfeezService();

export async function saveTahfeezScores(scores: TahfeezScoreInput[]) {
  try {
    
    await tahfeezService.saveTahfeezScores(scores, );
    revalidateTahfeez();
    return { success: true };
  } catch (error) {
    console.error('Error saving Tahfeez scores:', error);
    return { success: false, error: 'Failed to save Tahfeez scores' };
  }
}

export async function updateTahfeezScore(
  scoreId: string,
  data: Partial<TahfeezScoreInput>
) {
  try {
    const updateData = {
      ...(data.studentId !== undefined && { studentId: data.studentId }),
      ...(data.termId    !== undefined && { termId:    data.termId }),
      ...(data.session   !== undefined && { session:   data.session }),
      ...(data.surah     !== undefined && { surah:     data.surah }),
      ...(data.juz       !== undefined && { juz:       data.juz }),
      ...(data.page      !== undefined && { page:      data.page }),
      ...(data.marks     !== undefined && { marks:     data.marks }),
    };
    await tahfeezService.updateTahfeezScore(scoreId, updateData);
    revalidateTahfeez();
    return { success: true };
  } catch (error) {
    console.error('Error updating Tahfeez score:', error);
    return { success: false, error: 'Failed to update Tahfeez score' };
  }
}

export async function deleteTahfeezScore(scoreId: string) {
  try {
    await tahfeezService.deleteTahfeezScore(scoreId);
    revalidateTahfeez();
    return { success: true };
  } catch (error) {
    console.error('Error deleting Tahfeez score:', error);
    return { success: false, error: 'Failed to delete Tahfeez score' };
  }
}
