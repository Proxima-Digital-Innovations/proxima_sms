'use server';

/**
 * Document / file bulk-upload server action.
 * Replaces the old dbService/firebase-stubs approach with Prisma LessonNote.
 *
 * Prisma model used: LessonNote
 *   Fields: id, schoolId, title, subjectId, classId, teacherId, status,
 *           fileUrl, content, termId, submissionDate
 *
 * NOTE: There is no separate ExamQuestion or TestQuestion table in Prisma.
 * Exam/test files are saved as LessonNote rows with a descriptive title that
 * includes the document type (e.g. "[Exam Question] Mathematics – JSS1").
 */

import { prisma } from '@/lib/prisma';
import { storageService } from '@/lib/storageService';
import { requireSchoolId } from '@/lib/server-context';

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
    // --- Resolve tenant school context -------------------------------------
    const schoolId = await requireSchoolId();

    // --- Verify that the teacher user exists -------------------------------
    const teacher = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!teacher) {
      return { error: 'User not found.' };
    }

    // --- Find the currently active term ------------------------------------
    const activeTerm = await prisma.term.findFirst({
      where: { schoolId, isActive: true },
      select: { id: true },
    });
    // termId is optional on LessonNote so we proceed even if there's no active term

    // --- Parse file metadata ------------------------------------------------
    const metadata: FileMetadata[] = JSON.parse(metadataString);
    let successCount = 0;

    for (let i = 0; i < metadata.length; i++) {
      const meta = metadata[i];
      const file = formData.get(`file_${i}`) as File | null;

      // Skip entries where no actual file was attached
      if (!file) continue;

      // Determine the storage folder and initial status based on document type
      let folder = 'lessonNotes';
      let status = 'Pending HOD Approval';

      if (meta.type === 'Exam Question') {
        folder = 'examQuestions';
        status = 'Pending Review';
      } else if (meta.type === 'Test Question') {
        folder = 'testQuestions';
        status = 'Pending Review';
      }

      // --- Upload to storage ----------------------------------------------
      const { downloadURL } = await storageService.uploadFile(
        `${folder}/${userId}/${Date.now()}-${file.name}`,
        file
      );

      // --- Resolve Subject by display name --------------------------------
      const subjectRecord = await prisma.subject.findFirst({
        where: { name: meta.subject, schoolId },
        select: { id: true },
      });

      if (!subjectRecord) {
        // Log and continue; caller can handle partial-success response
        console.warn(
          `[bulkUploadDocuments] Subject "${meta.subject}" not found for school ${schoolId}. Skipping file "${file.name}".`
        );
        continue;
      }

      // --- Resolve Class by display name ----------------------------------
      const classRecord = await prisma.class.findFirst({
        where: { name: meta.class, schoolId },
        select: { id: true },
      });

      if (!classRecord) {
        console.warn(
          `[bulkUploadDocuments] Class "${meta.class}" not found for school ${schoolId}. Skipping file "${file.name}".`
        );
        continue;
      }

      // --- Build the document title ---------------------------------------
      // For Exam/Test Questions there's no dedicated table, so prefix the
      // type into the title so it's distinguishable in the UI.
      const docTitle =
        meta.type === 'Lesson Plan'
          ? meta.title
          : `[${meta.type}] ${meta.title}`;

      // --- Create the LessonNote row in Prisma ----------------------------
      await prisma.lessonNote.create({
        data: {
          schoolId,
          title:     docTitle,
          subjectId: subjectRecord.id,
          classId:   classRecord.id,
          teacherId: userId,
          status,
          fileUrl:   downloadURL,
          // Store the raw doc type as content so it can be filtered/displayed
          content:   meta.type,
          termId:    activeTerm?.id ?? null,
        },
      });

      successCount++;
    }

    return { success: true, successCount };
  } catch (error: any) {
    console.error('Error during bulk upload:', error);
    return {
      error: error.message || 'An unexpected error occurred during the upload process.',
    };
  }
}
