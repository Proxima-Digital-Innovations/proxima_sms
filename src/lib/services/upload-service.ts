import { UploadRepository } from '../dal/upload-repository';

export class UploadService {
    private repo = new UploadRepository();

    async resolveSubject(subject: string) {
        let subjectRecord = await this.repo.findSubject(subject);
        if (!subjectRecord) {
            subjectRecord = await this.repo.createSubject(subject);
        }
        return subjectRecord;
    }

    async resolveTerm(term: string) {
        const termRecord = await this.repo.findTerm(term);
        if (!termRecord) throw new Error(`Term ${term} not found`);
        return termRecord;
    }

    async resolveStudent(studentId: string) {
        return await this.repo.findStudent(studentId);
    }

    async processScoreRow(studentId: string, caScore: number, examScore: number, subjectRecord: any, termRecord: any) {
        const student = await this.resolveStudent(studentId);
        if (!student) throw new Error(`Student ${studentId} not found`);

        const totalScore = caScore + examScore;
        let grade = 'F';
        if (totalScore >= 80) grade = 'A';
        else if (totalScore >= 70) grade = 'B';
        else if (totalScore >= 60) grade = 'C';
        else if (totalScore >= 50) grade = 'D';
        else if (totalScore >= 40) grade = 'E';

        await this.repo.upsertTermGrade(student.id, subjectRecord.id, termRecord.id, caScore, examScore, totalScore, grade);
    }

    async processMidtermRow(studentId: string, score: number, achievement: string, session: string, subjectRecord: any, termRecord: any) {
        const student = await this.resolveStudent(studentId);
        if (!student) throw new Error(`Student ${studentId} not found`);

        await this.repo.upsertMidtermResult(student.id, subjectRecord.id, termRecord.id, score, achievement, session);
    }

    async getStudentsDataForTemplate(classLevel: string, isMidterm: boolean) {
        const students = await this.repo.findStudentsByClassLevel(classLevel);
        return students.map(s => {
            const base = {
                'Student ID': s.id,
                'Student Name': `${s.firstName} ${s.lastName}`,
                'Admission Number': s.studentId
            };
            if (isMidterm) {
                return { ...base, 'Score': 0, 'Achievement': '' };
            } else {
                return { ...base, 'CA Score': 0, 'Exam Score': 0 };
            }
        });
    }
}
