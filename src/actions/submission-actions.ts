'use server';

/**
 * Document / file bulk-upload server action.
 * Replaces the old dbService/firebase-stubs approach with Prisma LessonNote.
 *
 * Prisma model used: LessonNote
 *   Fields: id, title, subjectId, classId, teacherId, status,
 *           fileUrl, content, termId, submissionDate
 *
 * NOTE: There is no separate ExamQuestion or TestQuestion table in Prisma.
 * Exam/test files are saved as LessonNote rows with a descriptive title that
 * includes the document type (e.g. "[Exam Question] Mathematics – JSS1").
 */

import { requireSchoolId } from '@/lib/server-context';
import { SubmissionService } from '@/lib/services/submission-service';

const service = new SubmissionService();

// ─── Types ────────────────────────────────────────────────────────────────────

/** Metadata submitted alongside each uploaded file. */
type FileMetadata = {
  name:    string;
  title:   string;
  type:    'Lesson Plan' | 'Exam Question' | 'Test Question';
  class:   string;   // class display name, e.g. "JSS 1A"
  subject: string;   // subject display name, e.g. "Mathematics"
};

// ─── Action ───────────────────────────────────────────────────────────────────

/**
 * Bulk-upload documents (lesson plans, exam questions, test questions) submitted
 * by a teacher.
 *
 * Steps per file:
 *  1. Upload the file to storage and obtain a download URL.
 *  2. Resolve the Subject and Class cuids from their display names.
 *  3. Find the currently active term for the school.
 *  4. Create a LessonNote row in Prisma.
 *
 * The `userId` field in the FormData is expected to be the Prisma cuid of the
 * teacher who is submitting the documents.
 */
export async function bulkUploadDocuments(formData: FormData) {
  // Extract required fields from the multipart form payload
  const userId         = formData.get('userId')   as string;
  const metadataString = formData.get('metadata') as string;

  if (!userId || !metadataString) {
    return { error: 'User ID and metadata are required.' };
  }

  try {
    
    const metadata: FileMetadata[] = JSON.parse(metadataString);
    
    // Extract files matching the metadata indices
    const files: (File | null)[] = [];
    for (let i = 0; i < metadata.length; i++) {
        files.push(formData.get(`file_${i}`) as File | null);
    }

    const successCount = await service.processBulkUpload(userId, metadata, files, );

    return { success: true, successCount };
  } catch (error: any) {
    console.error('Error during bulk upload:', error);
    return { error: error.message || 'An unexpected error occurred during the upload process.' };
  }
}
