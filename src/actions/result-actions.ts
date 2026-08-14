'use server';
import { requireSchoolId } from '@/lib/server-context';
import { ResultService } from '@/lib/services/result-service';

const resultService = new ResultService();

export async function generateResultsForClass(className: string, session: string, term: string): Promise<any> {
  try {
    
    return await resultService.generateResultsForClass(className, session, term);
  } catch (error: any) {
    console.error('Error generating results:', error);
    return { error: error.message || 'An unexpected error occurred during result generation.' };
  }
}