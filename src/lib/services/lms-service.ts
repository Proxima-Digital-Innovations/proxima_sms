import { LmsRepository } from '../dal/lms-repository';

const lmsRepository = new LmsRepository();

export class LmsService {
    async getLessonNotes(role: string, teacherId?: string) {
        return await lmsRepository.findLessonNotes(role, teacherId);
    }

    async submitLessonNote(formData: FormData) {
        const teacherId = formData.get('teacherId') as string;
        const title = formData.get('title') as string;
        const subjectName = formData.get('subject') as string;
        const className = formData.get('class') as string;
        const type = formData.get('type') as string;
        
        const fileUrl = `/uploads/${Date.now()}-mock-file.pdf`; 

        const subject = await lmsRepository.findSubjectByName(subjectName);
        const cls = await lmsRepository.findClassByName(className);

        if (!subject || !cls) {
            throw new Error('Invalid subject or class selected.');
        }

        return await lmsRepository.createLessonNote({
            title,
            teacherId,
            subjectId: subject.id,
            classId: cls.id,
            fileUrl,
            status: 'Pending HOD Approval'
        });
    }

    async getLessonNote(id: string) {
        const note = await lmsRepository.findLessonNoteById(id);
        if (!note) throw new Error('Lesson note not found.');
        return note;
    }

    async updateLessonNoteStatus(id: string, status: string, feedback?: string) {
        return await lmsRepository.updateLessonNote(id, {
            status,
            ...(feedback ? { content: feedback } : {})
        });
    }
}
