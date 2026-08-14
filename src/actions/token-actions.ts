'use server';
import { TokenService } from '@/lib/services/token-service';
const tokenService = new TokenService();
export async function generateResultToken(studentId: string, term: string, session: string) {
  try {
    const token = await tokenService.generateResultToken(studentId, term, session);
    return { success: true, token };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to generate token' };
  }
}
export async function validateAndUseToken(admissionNumber: string, token: string, term: string, session: string) {
  try {
    return await tokenService.validateAndUseToken(admissionNumber, token, term, session);
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to validate token' };
  }
}
