import React from 'react';
import { Score, Student, BehaviouralAssessment } from '@/lib/schema';
import { School, CheckCircle2, User, Award, Calendar, BookOpen } from 'lucide-react';

export type PrintableExamResultCardProps = {
  student: Student & { class?: { name: string } };
  results: (Score & {
    subjectName?: string;
    subject?: { name: string };
    grade?: string;
    classRank?: string | number;
    classSize?: string | number;
    position?: string | number;
    remarks?: string;
    ca1?: number;
    ca2?: number;
    exam?: number;
    examScore?: number;
    total?: number;
    totalScore?: number;
  })[];
  term: string;
  session: string;
  feeInfo?: {
    totalFee: number;
    amountPaid: number;
    outstandingBalance: number;
  } | null;
  behaviouralAssessment?: BehaviouralAssessment | null;
  behaviouralScores?: { id: string; score: number; trait?: { name: string } }[] | null;
  summary?: {
    totalSubjects?: number;
    totalScore?: number;
    overallAverage?: number;
    overallGrade?: string;
    classRank?: number | string | null;
    classSize?: number | string | null;
    teacherRemark?: string | null;
    principalRemark?: string | null;
  } | null;
  school?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    logoUrl?: string | null;
    motto?: string;
  } | null;
  comments?: string;
  schoolHeaderUrl?: string;
  signatureUrl?: string;
};

export function PrintableExamResultCard({
  student,
  results,
  term,
  session,
  feeInfo,
  behaviouralAssessment,
  behaviouralScores,
  summary,
  school,
  comments,
}: PrintableExamResultCardProps) {
  const schoolName = school?.name || 'Proxima Academy';
  const schoolAddress = school?.address || 'Victoria Island, Lagos, Nigeria';
  const schoolPhone = school?.phone || '+234 800 PROXIMA';
  const schoolEmail = school?.email || 'admin@proximahub.com';
  const schoolLogo = school?.logoUrl;

  // Compute metrics if summary not passed
  const totalScore =
    summary?.totalScore ??
    results.reduce((acc, curr) => acc + (curr.total ?? curr.totalScore ?? 0), 0);
  const averageScore =
    summary?.overallAverage ??
    (results.length > 0 ? totalScore / results.length : 0);
  const classRank = summary?.classRank ?? results[0]?.classRank ?? '-';
  const classSize = summary?.classSize ?? results[0]?.classSize ?? '-';
  const teacherRemark =
    summary?.teacherRemark ||
    comments ||
    (averageScore >= 75
      ? 'An outstanding academic performance. Demonstrates clear mastery and high intellectual curiosity.'
      : averageScore >= 60
      ? 'A very commendable performance. Keep maintaining this diligence and focus.'
      : 'Satisfactory performance. Encouraged to allocate more study time to weaker subjects.');
  const principalRemark =
    summary?.principalRemark ||
    (averageScore >= 75
      ? 'Excellent result. Promoted with distinction and honours.'
      : averageScore >= 50
      ? 'Good term result. Continued effort is strongly recommended.'
      : 'Fair performance. Needs significant academic support next term.');

  const getGradeText = (score: number) => {
    if (score >= 75) return 'A1';
    if (score >= 70) return 'B2';
    if (score >= 65) return 'B3';
    if (score >= 60) return 'C4';
    if (score >= 55) return 'C5';
    if (score >= 50) return 'C6';
    if (score >= 45) return 'D7';
    if (score >= 40) return 'E8';
    return 'F9';
  };

  const getGradeRemark = (score: number) => {
    if (score >= 75) return 'Excellent';
    if (score >= 70) return 'Very Good';
    if (score >= 65) return 'Good';
    if (score >= 60) return 'Credit';
    if (score >= 55) return 'Credit';
    if (score >= 50) return 'Credit';
    if (score >= 45) return 'Pass';
    if (score >= 40) return 'Pass';
    return 'Fail';
  };

  return (
    <div className="report-card-sheet bg-white text-slate-900 p-6 md:p-8 font-sans max-w-4xl mx-auto border border-slate-300 print:border-none print:p-0 print:max-w-none shadow-sm print:shadow-none">
      {/* 1. Official School Header */}
      <div className="border-b-2 border-slate-800 pb-4 mb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {schoolLogo ? (
              <img
                src={schoolLogo}
                alt="School Crest"
                className="w-16 h-16 object-contain rounded-md"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-800">
                <School className="w-8 h-8" />
              </div>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-900 leading-tight">
                {schoolName}
              </h1>
              <p className="text-xs font-semibold text-slate-600 mt-0.5 uppercase tracking-wide">
                {schoolAddress}
              </p>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                Tel: {schoolPhone} • Email: {schoolEmail}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="border-2 border-slate-800 px-3 py-1.5 rounded-lg bg-slate-50 text-right">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">Official Transcript</span>
              <span className="text-sm font-black uppercase tracking-wider text-slate-900 block">Terminal Report Card</span>
              <span className="text-[11px] font-bold text-slate-700 block mt-0.5">
                {term} • {session}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Candidate Metadata Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-300 p-3 rounded-lg text-xs mb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Candidate Name</span>
          <span className="font-bold text-slate-900 text-sm">
            {student.lastName ? `${student.lastName}, ${student.firstName}` : `${student.firstName} ${student.lastName || ''}`}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Admission / ID</span>
          <span className="font-mono font-bold text-slate-900 text-sm">
            {student.studentId || 'N/A'}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Class / Cohort</span>
          <span className="font-bold text-slate-900 text-sm">
            {student.class?.name || student.classLevel || 'N/A'}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Gender</span>
          <span className="font-bold text-slate-900 text-sm uppercase">
            {student.gender || 'N/A'}
          </span>
        </div>
      </div>

      {/* 3. Academic Subject Performance Table */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
            Academic Performance Breakdown
          </h2>
          <span className="text-[10px] font-mono text-slate-500">
            Max Scale: CA 1 (20) + CA 2 (20) + Exam (60) = 100 Marks
          </span>
        </div>

        <div className="border border-slate-300 rounded-lg overflow-hidden">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-[11px]">
                <th className="p-2 border-r border-slate-300 w-8 text-center">#</th>
                <th className="p-2 border-r border-slate-300">Subject Title</th>
                <th className="p-2 border-r border-slate-300 text-center w-16">CA 1 (20)</th>
                <th className="p-2 border-r border-slate-300 text-center w-16">CA 2 (20)</th>
                <th className="p-2 border-r border-slate-300 text-center w-16">Exam (60)</th>
                <th className="p-2 border-r border-slate-300 text-center w-20 bg-slate-200 font-black">Total (100)</th>
                <th className="p-2 border-r border-slate-300 text-center w-14 font-black">Grade</th>
                <th className="p-2 border-r border-slate-300 text-center w-14">Rank</th>
                <th className="p-2 text-left">Teacher Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {results.map((result: any, index: number) => {
                const subName = result.subject?.name || result.subjectName || 'Subject';
                const ca1 = result.ca1 ?? '-';
                const ca2 = result.ca2 ?? '-';
                const exam = result.exam ?? result.examScore ?? '-';
                const total = result.total ?? result.totalScore ?? (typeof ca1 === 'number' && typeof exam === 'number' ? ca1 + (typeof ca2 === 'number' ? ca2 : 0) + exam : '-');
                const grade = result.grade || (typeof total === 'number' ? getGradeText(total) : '-');
                const rank = result.classRank || result.position || '-';
                const remark = result.remarks || (typeof total === 'number' ? getGradeRemark(total) : '-');

                return (
                  <tr key={index} className="even:bg-slate-50/50">
                    <td className="p-2 text-center font-mono text-slate-500 border-r border-slate-200">{index + 1}</td>
                    <td className="p-2 font-semibold text-slate-900 border-r border-slate-200 uppercase">{subName}</td>
                    <td className="p-2 text-center font-mono border-r border-slate-200">{ca1}</td>
                    <td className="p-2 text-center font-mono border-r border-slate-200">{ca2}</td>
                    <td className="p-2 text-center font-mono border-r border-slate-200">{exam}</td>
                    <td className="p-2 text-center font-mono font-black bg-slate-100 text-slate-900 border-r border-slate-300">
                      {total}
                    </td>
                    <td className="p-2 text-center font-bold font-mono border-r border-slate-200 text-slate-900">
                      {grade}
                    </td>
                    <td className="p-2 text-center font-mono text-slate-600 border-r border-slate-200">
                      {rank}
                    </td>
                    <td className="p-2 text-slate-600 italic text-[11px]">
                      {remark}
                    </td>
                  </tr>
                );
              })}
              {results.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-slate-500 italic">
                    No examination records published for this candidate.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Term Summary & Behavioural Assessment (Side by Side) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Term Summary KPIs */}
        <div className="space-y-1.5">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
            Cumulative Academic Summary
          </h2>
          <div className="border border-slate-300 rounded-lg p-3 bg-slate-50 space-y-2 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
              <span className="font-semibold text-slate-600 uppercase text-[11px]">Total Marks Achieved</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {totalScore} <span className="text-[10px] text-slate-500 font-normal">/ {results.length * 100}</span>
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
              <span className="font-semibold text-slate-600 uppercase text-[11px]">Terminal Average Score</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {averageScore.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
              <span className="font-semibold text-slate-600 uppercase text-[11px]">Position in Class</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {classRank} <span className="text-[10px] text-slate-500 font-normal">of {classSize} students</span>
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-600 uppercase text-[11px]">Overall Terminal Grade</span>
              <span className="font-mono font-black text-slate-900 text-sm">
                {summary?.overallGrade || getGradeText(averageScore)}
              </span>
            </div>
          </div>
        </div>

        {/* Behavioural Assessment (Scale 1-5) */}
        <div className="space-y-1.5">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
            Affective & Psychomotor Traits (Scale 1-5)
          </h2>
          <div className="border border-slate-300 rounded-lg p-3 bg-slate-50 text-xs">
            {behaviouralScores && behaviouralScores.length > 0 ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {behaviouralScores.map(b => (
                  <div key={b.id} className="flex justify-between border-b border-slate-200 pb-1 text-[11px]">
                    <span className="text-slate-600 font-medium">{b.trait?.name || 'Trait'}</span>
                    <span className="font-bold text-slate-900 font-mono">{b.score} / 5</span>
                  </div>
                ))}
              </div>
            ) : behaviouralAssessment ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <div className="flex justify-between border-b border-slate-200 pb-1 text-[11px]">
                  <span className="text-slate-600 font-medium">Conduct</span>
                  <span className="font-bold text-slate-900 font-mono">{behaviouralAssessment.conduct} / 5</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1 text-[11px]">
                  <span className="text-slate-600 font-medium">Punctuality</span>
                  <span className="font-bold text-slate-900 font-mono">{behaviouralAssessment.punctuality} / 5</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1 text-[11px]">
                  <span className="text-slate-600 font-medium">Neatness</span>
                  <span className="font-bold text-slate-900 font-mono">{behaviouralAssessment.neatness} / 5</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1 text-[11px]">
                  <span className="text-slate-600 font-medium">Leadership</span>
                  <span className="font-bold text-slate-900 font-mono">{behaviouralAssessment.dedication} / 5</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1 text-[11px]">
                  <span className="text-slate-600 font-medium">Participation</span>
                  <span className="font-bold text-slate-900 font-mono">{behaviouralAssessment.participation} / 5</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1 text-[11px]">
                  <span className="text-slate-600 font-medium">Hospitality</span>
                  <span className="font-bold text-slate-900 font-mono">{behaviouralAssessment.hospitality} / 5</span>
                </div>
              </div>
            ) : (
              <div className="py-5 text-center text-slate-500 italic text-[11px]">
                Standard behavioural evaluation: Conduct, Punctuality, and Neatness rated Satisfactory.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Official Grading Rubric Key */}
      <div className="border border-slate-300 rounded-lg p-2.5 bg-slate-50/50 mb-4 text-[10px]">
        <span className="font-bold text-slate-800 uppercase tracking-wider mr-2">Grading Key:</span>
        <span className="text-slate-600">
          <strong>A1</strong> (75-100% Distinction) • <strong>B2</strong> (70-74% Very Good) • <strong>B3</strong> (65-69% Good) • <strong>C4</strong> (60-64% Credit) • <strong>C5</strong> (55-59% Credit) • <strong>C6</strong> (50-54% Credit) • <strong>D7</strong> (45-49% Pass) • <strong>E8</strong> (40-44% Fair) • <strong>F9</strong> (0-39% Fail)
        </span>
      </div>

      {/* 6. Form Teacher & Principal Remarks */}
      <div className="space-y-2 border-t border-slate-300 pt-3 text-xs mb-6">
        <div className="flex flex-col sm:flex-row gap-1 sm:items-baseline">
          <span className="font-bold uppercase tracking-wider text-slate-800 w-44 shrink-0 text-[11px]">
            Class Teacher Remark:
          </span>
          <span className="italic text-slate-900 font-medium">
            "{teacherRemark}"
          </span>
        </div>
        <div className="flex flex-col sm:flex-row gap-1 sm:items-baseline">
          <span className="font-bold uppercase tracking-wider text-slate-800 w-44 shrink-0 text-[11px]">
            Principal Remark:
          </span>
          <span className="italic text-slate-900 font-medium">
            "{principalRemark}"
          </span>
        </div>
      </div>

      {/* 7. Signatures & Official Stamp Endorsement */}
      <div className="grid grid-cols-3 gap-6 pt-4 text-center text-[10px] font-bold uppercase tracking-wider text-slate-600 border-t border-slate-300">
        <div>
          <div className="h-8 flex items-end justify-center pb-1">
            <span className="font-serif italic text-slate-400 font-normal">Signed</span>
          </div>
          <div className="border-t border-slate-400 pt-1">Form Teacher Signature</div>
        </div>
        <div>
          <div className="h-8 flex items-end justify-center pb-1">
            <span className="font-serif italic text-slate-400 font-normal">Approved</span>
          </div>
          <div className="border-t border-slate-400 pt-1">Principal / Head of School</div>
        </div>
        <div>
          <div className="h-8 flex items-end justify-center pb-1 text-[9px] text-slate-400 font-mono">
            OFFICIAL DIGITAL VERIFICATION
          </div>
          <div className="border-t border-slate-400 pt-1">Official Seal & Date</div>
        </div>
      </div>

      {/* Print CSS to guarantee exact A4 fit */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          body {
            background: white !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .report-card-sheet {
            width: 100% !important;
            max-width: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: always !important;
            break-after: page !important;
          }
        }
      `}</style>
    </div>
  );
}
export default PrintableExamResultCard;
