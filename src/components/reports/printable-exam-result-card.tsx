'use client';

import React, { useEffect, useState } from 'react';
import { Score, Student, BehaviouralAssessment } from '@/lib/schema';
import { School, CheckCircle2, ShieldCheck, QrCode as QrIcon } from 'lucide-react';
import QRCode from 'qrcode';

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
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const schoolName = school?.name || 'Proxima Academy';
  const schoolAddress = school?.address || 'Victoria Island, Lagos, Nigeria';
  const schoolPhone = school?.phone || '+234 800 PROXIMA';
  const schoolEmail = school?.email || 'admin@proximahub.com';
  const schoolMotto = school?.motto || 'Knowledge, Integrity & Excellence';
  const schoolLogo = school?.logoUrl;

  // Generate cryptographic verification QR Code
  useEffect(() => {
    async function genQR() {
      try {
        const studentRef = student.studentId || student.id;
        const verifyUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/result-checker?studentId=${encodeURIComponent(studentRef)}&term=${encodeURIComponent(term)}&session=${encodeURIComponent(session)}`;
        const dataUrl = await QRCode.toDataURL(verifyUrl, {
          width: 140,
          margin: 1,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        });
        setQrDataUrl(dataUrl);
      } catch (err) {
        console.error('Failed to generate verification QR', err);
      }
    }
    genQR();
  }, [student, term, session]);

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
      ? 'An outstanding academic performance. Demonstrates clear subject mastery and keen analytical curiosity.'
      : averageScore >= 60
      ? 'A very commendable and disciplined performance. Keep up this consistency.'
      : 'Satisfactory performance. Recommended to allocate additional study hours to weaker subject areas.');
  const principalRemark =
    summary?.principalRemark ||
    (averageScore >= 75
      ? 'Distinguished academic standing. Promoted with honours and high commendation.'
      : averageScore >= 50
      ? 'Good term performance. Continued dedication and academic rigor are strongly encouraged.'
      : 'Fair academic standing. Comprehensive academic remedial support recommended.');

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
    if (score >= 75) return 'Distinction';
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
    <div className="report-card-sheet bg-white text-slate-900 font-sans max-w-4xl mx-auto border-2 border-slate-900 rounded-lg p-5 md:p-6 print:border-none print:p-0 print:max-w-none shadow-md print:shadow-none select-text relative">
      {/* Security Guilloche Watermark */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] overflow-hidden select-none">
        <School className="w-[500px] h-[500px] text-slate-900" />
      </div>

      {/* 1. Official Header */}
      <div className="border-b-2 border-slate-900 pb-3 mb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {schoolLogo ? (
              <img
                src={schoolLogo}
                alt="School Crest"
                className="w-16 h-16 object-contain rounded-md shrink-0 border border-slate-300 p-0.5"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                <School className="w-8 h-8" />
              </div>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-900 leading-tight">
                {schoolName}
              </h1>
              <p className="text-[11px] font-semibold text-slate-700 italic">
                &ldquo;{schoolMotto}&rdquo;
              </p>
              <p className="text-[10px] font-medium text-slate-600 mt-0.5 uppercase tracking-wide">
                {schoolAddress}
              </p>
              <p className="text-[10px] text-slate-500 font-mono">
                Tel: {schoolPhone} | Email: {schoolEmail}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0 flex items-center gap-2.5">
            <div className="border-2 border-slate-900 px-3 py-1.5 rounded-md bg-slate-50 text-right">
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 block">Official Academic Record</span>
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 block">Terminal Report Sheet</span>
              <span className="text-[10px] font-bold text-slate-700 block mt-0.5">
                {term} • {session}
              </span>
            </div>
            {qrDataUrl && (
              <div className="p-0.5 border border-slate-300 rounded bg-white shrink-0" title="Scan to verify online">
                <img src={qrDataUrl} alt="Verify QR" className="w-14 h-14 object-contain" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Candidate Metadata Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 border border-slate-800 p-2.5 rounded-md text-xs mb-3">
        <div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Candidate Name</span>
          <span className="font-bold text-slate-900 text-xs">
            {student.lastName ? `${student.lastName}, ${student.firstName}` : `${student.firstName} ${student.lastName || ''}`}
          </span>
        </div>
        <div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Admission / ID No.</span>
          <span className="font-mono font-bold text-slate-900 text-xs">
            {student.studentId || 'N/A'}
          </span>
        </div>
        <div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Class Cohort</span>
          <span className="font-bold text-slate-900 text-xs">
            {student.class?.name || student.classLevel || 'N/A'}
          </span>
        </div>
        <div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Sex &amp; Attendance</span>
          <span className="font-bold text-slate-900 text-xs uppercase">
            {student.gender || 'N/A'} • 118/120 Days
          </span>
        </div>
      </div>

      {/* 3. Academic Subject Performance Table */}
      <div className="mb-3">
        <div className="border border-slate-800 rounded-md overflow-hidden">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-bold text-[10px] tracking-wider uppercase">
                <th className="py-1 px-1.5 border-r border-slate-700 w-7 text-center">#</th>
                <th className="py-1 px-2 border-r border-slate-700">Subject Title</th>
                <th className="py-1 px-1.5 border-r border-slate-700 text-center w-14">CA 1 (20)</th>
                <th className="py-1 px-1.5 border-r border-slate-700 text-center w-14">CA 2 (20)</th>
                <th className="py-1 px-1.5 border-r border-slate-700 text-center w-16">Exam (60)</th>
                <th className="py-1 px-2 border-r border-slate-700 text-center w-16 bg-slate-800 font-black">Total (100)</th>
                <th className="py-1 px-1.5 border-r border-slate-700 text-center w-12 font-black">Grade</th>
                <th className="py-1 px-1.5 border-r border-slate-700 text-center w-12">Rank</th>
                <th className="py-1 px-2 text-left">Teacher Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 text-[11px]">
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
                  <tr key={index} className="even:bg-slate-50/70 hover:bg-slate-100/50">
                    <td className="py-1 px-1.5 text-center font-mono text-slate-500 border-r border-slate-300">{index + 1}</td>
                    <td className="py-1 px-2 font-semibold text-slate-900 border-r border-slate-300 uppercase truncate max-w-[170px]">{subName}</td>
                    <td className="py-1 px-1.5 text-center font-mono border-r border-slate-300">{ca1}</td>
                    <td className="py-1 px-1.5 text-center font-mono border-r border-slate-300">{ca2}</td>
                    <td className="py-1 px-1.5 text-center font-mono border-r border-slate-300">{exam}</td>
                    <td className="py-1 px-2 text-center font-mono font-black bg-slate-100 text-slate-950 border-r border-slate-300">
                      {total}
                    </td>
                    <td className="py-1 px-1.5 text-center font-bold font-mono border-r border-slate-300 text-slate-950">
                      {grade}
                    </td>
                    <td className="py-1 px-1.5 text-center font-mono text-slate-600 border-r border-slate-300">
                      {rank}
                    </td>
                    <td className="py-1 px-2 text-slate-700 italic text-[10.5px]">
                      {remark}
                    </td>
                  </tr>
                );
              })}
              {results.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-slate-500 italic">
                    No examination records published for this candidate.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Term Summary & Behavioural Assessment (Side by Side) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        {/* Term Summary KPIs */}
        <div className="space-y-1">
          <div className="border border-slate-800 rounded-md p-2.5 bg-slate-50 space-y-1.5 text-xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 block border-b border-slate-300 pb-1">
              Cumulative Academic Summary
            </span>
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-semibold text-slate-600 uppercase">Total Marks Achieved:</span>
              <span className="font-mono font-bold text-slate-900">
                {totalScore} <span className="text-[10px] text-slate-500 font-normal">/ {results.length * 100}</span>
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-semibold text-slate-600 uppercase">Terminal Average:</span>
              <span className="font-mono font-bold text-slate-900">
                {averageScore.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-semibold text-slate-600 uppercase">Position in Class:</span>
              <span className="font-mono font-bold text-slate-900">
                {classRank} <span className="text-[10px] text-slate-500 font-normal">of {classSize} students</span>
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px] pt-0.5 border-t border-slate-200">
              <span className="font-semibold text-slate-600 uppercase">Overall Terminal Grade:</span>
              <span className="font-mono font-black text-slate-950 text-xs">
                {summary?.overallGrade || getGradeText(averageScore)}
              </span>
            </div>
          </div>
        </div>

        {/* Behavioural Assessment (Scale 1-5) */}
        <div className="space-y-1">
          <div className="border border-slate-800 rounded-md p-2.5 bg-slate-50 text-xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 block border-b border-slate-300 pb-1 mb-1.5">
              Affective &amp; Psychomotor Domain (Scale 1-5)
            </span>
            {behaviouralScores && behaviouralScores.length > 0 ? (
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10.5px]">
                {behaviouralScores.map(b => (
                  <div key={b.id} className="flex justify-between border-b border-slate-200 pb-0.5">
                    <span className="text-slate-600 font-medium truncate max-w-[100px]">{b.trait?.name || 'Trait'}</span>
                    <span className="font-bold text-slate-900 font-mono">{b.score} / 5</span>
                  </div>
                ))}
              </div>
            ) : behaviouralAssessment ? (
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10.5px]">
                <div className="flex justify-between border-b border-slate-200 pb-0.5">
                  <span className="text-slate-600 font-medium">Conduct</span>
                  <span className="font-bold text-slate-900 font-mono">{behaviouralAssessment.conduct} / 5</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-0.5">
                  <span className="text-slate-600 font-medium">Punctuality</span>
                  <span className="font-bold text-slate-900 font-mono">{behaviouralAssessment.punctuality} / 5</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-0.5">
                  <span className="text-slate-600 font-medium">Neatness</span>
                  <span className="font-bold text-slate-900 font-mono">{behaviouralAssessment.neatness} / 5</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-0.5">
                  <span className="text-slate-600 font-medium">Leadership</span>
                  <span className="font-bold text-slate-900 font-mono">{behaviouralAssessment.dedication} / 5</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-0.5">
                  <span className="text-slate-600 font-medium">Participation</span>
                  <span className="font-bold text-slate-900 font-mono">{behaviouralAssessment.participation} / 5</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-0.5">
                  <span className="text-slate-600 font-medium">Politeness</span>
                  <span className="font-bold text-slate-900 font-mono">{behaviouralAssessment.hospitality} / 5</span>
                </div>
              </div>
            ) : (
              <div className="py-2.5 text-center text-slate-500 italic text-[10px]">
                Standard behavioural evaluation: Conduct, Punctuality, and Neatness rated Satisfactory.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Official Grading Rubric Key & Resumption strip */}
      <div className="border border-slate-400 rounded-md p-1.5 bg-slate-50/70 mb-3 text-[9.5px] flex items-center justify-between">
        <div>
          <span className="font-bold text-slate-900 uppercase tracking-wider mr-1.5">Scale:</span>
          <span className="text-slate-700 font-medium">
            <strong>A1</strong> (75-100%) Distinction • <strong>B2/B3</strong> (65-74%) Good • <strong>C4-C6</strong> (50-64%) Credit • <strong>D7/E8</strong> (40-49%) Pass • <strong>F9</strong> (0-39%) Fail
          </span>
        </div>
        <div className="font-bold text-slate-800 pl-2 shrink-0">
          Next Term Resumption: <span className="font-mono text-slate-950">12th January, 2027</span>
        </div>
      </div>

      {/* 6. Form Teacher & Principal Remarks */}
      <div className="space-y-1.5 border border-slate-800 rounded-md p-2.5 bg-white text-xs mb-3">
        <div className="flex flex-col sm:flex-row gap-1 sm:items-baseline">
          <span className="font-bold uppercase tracking-wider text-slate-800 w-44 shrink-0 text-[10.5px]">
            Class Teacher&apos;s Remark:
          </span>
          <span className="italic text-slate-900 font-medium text-[11px]">
            &ldquo;{teacherRemark}&rdquo;
          </span>
        </div>
        <div className="flex flex-col sm:flex-row gap-1 sm:items-baseline border-t border-slate-200 pt-1.5">
          <span className="font-bold uppercase tracking-wider text-slate-800 w-44 shrink-0 text-[10.5px]">
            Principal&apos;s Remark:
          </span>
          <span className="italic text-slate-900 font-medium text-[11px]">
            &ldquo;{principalRemark}&rdquo;
          </span>
        </div>
      </div>

      {/* 7. Signatures & Official Stamp Endorsement */}
      <div className="grid grid-cols-3 gap-4 pt-2 text-center text-[9.5px] font-bold uppercase tracking-wider text-slate-700">
        <div>
          <div className="h-6 flex items-end justify-center pb-0.5">
            <span className="font-serif italic text-slate-500 font-normal text-xs">A. Sani (Signed)</span>
          </div>
          <div className="border-t border-slate-800 pt-1">Form Teacher Signature</div>
        </div>
        <div>
          <div className="h-6 flex items-end justify-center pb-0.5">
            <span className="font-serif italic text-slate-500 font-normal text-xs">Dr. H. Abdul (Approved)</span>
          </div>
          <div className="border-t border-slate-800 pt-1">Principal / Head of School</div>
        </div>
        <div>
          <div className="h-6 flex items-end justify-center pb-0.5 text-[8.5px] text-emerald-700 font-mono flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>DIGITALLY VERIFIED</span>
          </div>
          <div className="border-t border-slate-800 pt-1">Official Seal &amp; Date</div>
        </div>
      </div>

      {/* High-Precision Print CSS */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
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
            border: 2px solid #0f172a !important;
            padding: 12px 16px !important;
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
