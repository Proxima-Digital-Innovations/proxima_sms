'use server';
import { MidtermService } from '@/lib/services/midterm-service';
const midtermService = new MidtermService();
export async function getMidtermResults(classLevel: string, term: string, session: string) {
  try { return await midtermService.getMidtermResults(classLevel, term, session); }
  catch (error) { console.error('Error fetching midterm results:', error); throw new Error('Failed to fetch midterm results'); }
}
export async function saveMidtermResults(results: any[]) {
  try { return await midtermService.saveMidtermResults(results); }
  catch (error) { console.error('Error saving midterm results:', error); throw new Error('Failed to save midterm results'); }
}
export async function calculateAchievement(score: number): Promise<string> {
  return midtermService.calculateAchievement(score);
}
export async function getStudentMidtermReport(studentId: string, term: string, session: string) {
  try { return await midtermService.getStudentMidtermReport(studentId, term, session); }
  catch (error) { console.error('Error fetching student report:', error); throw new Error('Failed to fetch student report'); }
}
export async function getClassMidtermReports(classLevel: string, term: string, session: string) {
  try { return await midtermService.getClassMidtermReports(classLevel, term, session); }
  catch (error) { console.error('Error fetching class reports:', error); throw new Error('Failed to fetch class reports'); }
}