import { SubmissionRepository } from '../dal/submission-repository';
import { storageService } from '@/lib/storageService';

const repo = new SubmissionRepository();

type FileMetadata = {
  name:    string;
  title:   string;
  type:    'Lesson Plan' | 'Exam Question' | 'Test Question';
  class:   string;
  subject: string;
};

export class SubmissionService {
    async processBulkUpload(userId: string, metadata: FileMetadata[], files: (File | null)[], ) {
        const teacher = await repo.getTeacher(userId);
        if (!teacher) {
            throw new Error('User not found.');
        }

        const activeTerm = await repo.getActiveTerm();
        let successCount = 0;

        for (let i = 0; i < metadata.length; i++) {
            const meta = metadata[i];
            const file = files[i];

            if (!file) continue;

            let folder = 'lessonNotes';
            let status = 'Pending HOD Approval';

            if (meta.type === 'Exam Question') {
                folder = 'examQuestions';
                status = 'Pending Review';
            } else if (meta.type === 'Test Question') {
                folder = 'testQuestions';
                status = 'Pending Review';
            }

            const { downloadURL } = await storageService.uploadFile(
                `${folder}/${userId}/${Date.now()}-${file.name}`,
                file
            );

            const subjectRecord = await repo.getSubjectByName(meta.subject);
            if (!subjectRecord) {
                console.warn(`[bulkUploadDocuments] Subject "${meta.subject}" not found. Skipping file "${file.name}".`);
                continue;
            }

            const classRecord = await repo.getClassByName(meta.class);
            if (!classRecord) {
                console.warn(`[bulkUploadDocuments] Class "${meta.class}" not found. Skipping file "${file.name}".`);
                continue;
            }

            const docTitle = meta.type === 'Lesson Plan' ? meta.title : `[${meta.type}] ${meta.title}`;

            await repo.createLessonNote({
                title: docTitle,
                subjectId: subjectRecord.id,
                classId: classRecord.id,
                teacherId: userId,
                status,
                fileUrl: downloadURL,
                content: meta.type,
                termId: activeTerm?.id ?? null,
            });

            successCount++;
        }

        return successCount;
    }
}
