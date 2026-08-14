import { ResultRepository } from '../dal/result-repository';

type GradeBand = { grade: string; minScore: number; maxScore: number; };
type SubjectResult = { name: string; ca1: number; exam: number; total: number; grade: string; };
type StudentReport = { studentId: string; studentName: string; class: string; term: string; session: string; subjects: SubjectResult[]; totalMarks: number; average: number; overallGrade: string; classRank: number; };

const DEFAULT_GRADING_SCALE: GradeBand[] = [
  { grade: 'A', minScore: 75, maxScore: 100 },
  { grade: 'B', minScore: 65, maxScore: 74  },
  { grade: 'C', minScore: 55, maxScore: 64  },
  { grade: 'D', minScore: 45, maxScore: 54  },
  { grade: 'E', minScore: 40, maxScore: 44  },
  { grade: 'F', minScore: 0,  maxScore: 39  },
];

function getGrade(score: number, scale: GradeBand[] = DEFAULT_GRADING_SCALE): string {
  const band = scale.find((g) => score >= g.minScore && score <= g.maxScore);
  return band?.grade ?? 'N/A';
}

export class ResultService {
  private repository = new ResultRepository();

  async generateResultsForClass(className: string, session: string, term: string): Promise<any> {
    const students = await this.repository.getStudentsByClass(className);
    if (students.length === 0) return { error: `No active students found in class "${className}".` };

    const subjects = await this.repository.getSubjects();
    if (subjects.length === 0) return { error: 'No subjects configured for this school. Please add subjects first.' };

    const termRecord = await this.repository.getTermByName(term);
    if (!termRecord) return { error: `Term "${term}" not found. Please create the term first.` };

    const studentCuids = students.map((s) => s.id);
    const termGrades = await this.repository.getTermGradesForStudents(termRecord.id, studentCuids);

    const gradeMap = new Map<string, typeof termGrades[number]>();
    termGrades.forEach((tg) => gradeMap.set(`${tg.studentId}::${tg.subjectId}`, tg));

    for (const student of students) {
      for (const subject of subjects) {
        const key = `${student.id}::${subject.id}`;
        if (!gradeMap.has(key)) {
          return { error: `Missing score for student "${student.firstName} ${student.lastName}" in subject "${subject.name}". Please enter all scores before generating results.` };
        }
      }
    }

    const studentAverages: { studentId: string; average: number }[] = [];
    const reportMap = new Map<string, Omit<StudentReport, 'classRank'>>();

    for (const student of students) {
      let totalMarks = 0;
      const subjectResults: SubjectResult[] = [];

      for (const subject of subjects) {
        const key = `${student.id}::${subject.id}`;
        const tg  = gradeMap.get(key)!;
        const ca1   = tg.ca1   ?? 0;
        const exam  = tg.exam  ?? 0;
        const total = tg.total ?? ca1 + (tg.ca2 ?? 0) + exam;
        const grade = getGrade(total);

        totalMarks += total;
        await this.repository.updateTermGrade(tg.id, { total, grade });
        subjectResults.push({ name: subject.name, ca1, exam, total, grade });
      }

      const average = subjects.length > 0 ? totalMarks / subjects.length : 0;
      studentAverages.push({ studentId: student.id, average });

      reportMap.set(student.id, {
        studentId:   student.studentId,
        studentName: `${student.firstName} ${student.lastName}`,
        class:       className,
        term,
        session,
        subjects:    subjectResults,
        totalMarks,
        average,
        overallGrade: getGrade(average),
      });
    }

    studentAverages.sort((a, b) => b.average - a.average);
    const reports: StudentReport[] = studentAverages.map((sa, index) => ({
      ...reportMap.get(sa.studentId)!,
      classRank: index + 1,
    }));

    return { success: true, generatedCount: reports.length, class: className, reports };
  }
}