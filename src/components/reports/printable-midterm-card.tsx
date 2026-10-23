'use client';

import React, { forwardRef } from 'react';
import { School } from 'lucide-react';

export type MidtermResult = {
  subjectName: string;
  score: number;
  achievement?: string;
  subject?: { name: string };
};

export type PrintableMidtermCardProps = {
  student: {
    firstName: string;
    lastName: string;
    studentId?: string;
    classLevel?: string;
    class?: { name: string };
  };
  results: MidtermResult[];
  term: string;
  session: string;
  averageScore?: number;
  school?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    logoUrl?: string | null;
  } | null;
  headerImage?: string;
  signatureImage?: string;
  watermarkImage?: string;
};

const PrintableMidtermCard = forwardRef<HTMLDivElement, PrintableMidtermCardProps>(
  ({ student, results, term, session, averageScore: passedAverage, school }, ref) => {
    const schoolName = school?.name || 'Proxima Academy';
    const schoolAddress = school?.address || 'Victoria Island, Lagos, Nigeria';
    const schoolPhone = school?.phone || '+234 800 PROXIMA';
    const schoolEmail = school?.email || 'admin@proximahub.com';
    const schoolLogo = school?.logoUrl;

    const averageScore =
      passedAverage !== undefined
        ? passedAverage
        : results.length > 0
        ? results.reduce((acc, curr) => acc + curr.score, 0) / results.length
        : 0;

    const getOverallEffort = (avg: number) => {
      if (avg >= 17) return 'Exceeding Expectations (Excellent)';
      if (avg >= 13) return 'Expected + (Very Good Progress)';
      if (avg >= 10) return 'Expected (Good Progress)';
      if (avg >= 7) return 'Emerging + (Satisfactory)';
      return 'Emerging (Requires Academic Support)';
    };

    const getEffortBucket = (score: number) => {
      if (score >= 17) return 'EXCEEDING';
      if (score >= 13) return 'EXPECTED+';
      if (score >= 10) return 'EXPECTED';
      if (score >= 7) return 'EMERGING+';
      return 'EMERGING';
    };

    return (
      <div
        ref={ref}
        className="report-card-sheet bg-white text-slate-900 p-6 md:p-8 font-sans max-w-4xl mx-auto border border-slate-300 print:border-none print:p-0 print:max-w-none shadow-sm print:shadow-none"
      >
        {/* School Header */}
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
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">Progress Assessment</span>
                <span className="text-sm font-black uppercase tracking-wider text-slate-900 block">Mid-Term Progress Report</span>
                <span className="text-[11px] font-bold text-slate-700 block mt-0.5">
                  {term} • {session}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Student Details Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-300 p-3 rounded-lg text-xs mb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Student Name</span>
            <span className="font-bold text-slate-900 text-sm">
              {student.firstName} {student.lastName}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Student ID / Reg</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              {student.studentId || 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Current Class</span>
            <span className="font-bold text-slate-900 text-sm">
              {student.class?.name || student.classLevel || 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Session & Term</span>
            <span className="font-bold text-slate-900 text-sm">
              {term}
            </span>
          </div>
        </div>

        {/* Assessment Table */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Continuous Assessment & Progress Rubric
            </h2>
            <span className="text-[10px] font-mono text-slate-500">
              Scale: 0 - 20 Continuous Assessment Marks
            </span>
          </div>

          <div className="border border-slate-300 rounded-lg overflow-hidden">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-[11px]">
                  <th className="p-2.5 border-r border-slate-300 w-10 text-center">#</th>
                  <th className="p-2.5 border-r border-slate-300">Subject</th>
                  <th className="p-2.5 border-r border-slate-300 text-center w-20">Score (/20)</th>
                  <th className="p-2.5 border-r border-slate-300 text-center w-28">Effort Rating</th>
                  <th className="p-2.5 text-left">Learning Achievement & Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {results.map((result, index) => {
                  const subName = result.subject?.name || result.subjectName || 'Subject';
                  const effort = getEffortBucket(result.score);

                  return (
                    <tr key={index} className="even:bg-slate-50/50">
                      <td className="p-2.5 text-center font-mono text-slate-500 border-r border-slate-200">{index + 1}</td>
                      <td className="p-2.5 font-semibold text-slate-900 border-r border-slate-200 uppercase">{subName}</td>
                      <td className="p-2.5 text-center font-mono font-bold text-slate-900 border-r border-slate-200">
                        {result.score}
                      </td>
                      <td className="p-2.5 text-center border-r border-slate-200">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          effort === 'EXCEEDING' ? 'bg-emerald-100 text-emerald-800' :
                          effort === 'EXPECTED+' ? 'bg-blue-100 text-blue-800' :
                          effort === 'EXPECTED' ? 'bg-indigo-100 text-indigo-800' :
                          effort === 'EMERGING+' ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {effort}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-600 text-[11px] italic">
                        {result.achievement || (result.score >= 15 ? 'Demonstrates high comprehension and active engagement.' : 'Satisfactory progress. Continued review encouraged.')}
                      </td>
                    </tr>
                  );
                })}
                {results.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500 italic">
                      No mid-term results recorded for this student.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Progress Rubric Key */}
        <div className="border border-slate-300 rounded-lg p-2.5 bg-slate-50 text-[10px] mb-4">
          <span className="font-bold text-slate-800 uppercase tracking-wider mr-2">Effort Scale:</span>
          <span className="text-slate-600">
            <strong>Emerging</strong> (0 - 6) • <strong>Emerging +</strong> (7 - 9) • <strong>Expected</strong> (10 - 12) • <strong>Expected +</strong> (13 - 16) • <strong>Exceeding</strong> (17 - 20)
          </span>
        </div>

        {/* Overall Assessment KPI */}
        <div className="border border-slate-300 rounded-lg p-3.5 bg-slate-50 mb-6 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500 uppercase text-[10px] font-bold block">Terminal Mid-Term Average</span>
            <span className="text-base font-bold text-slate-900 font-mono">
              {averageScore.toFixed(1)} / 20 ({((averageScore / 20) * 100).toFixed(1)}%)
            </span>
          </div>
          <div className="text-right">
            <span className="text-slate-500 uppercase text-[10px] font-bold block">Cumulative Assessment</span>
            <span className="text-sm font-bold text-slate-900">
              {getOverallEffort(averageScore)}
            </span>
          </div>
        </div>

        {/* Signature & Seal */}
        <div className="grid grid-cols-2 gap-8 pt-4 text-center text-[10px] font-bold uppercase tracking-wider text-slate-600 border-t border-slate-300">
          <div>
            <div className="h-8 flex items-end justify-center pb-1">
              <span className="font-serif italic text-slate-400 font-normal">Certified</span>
            </div>
            <div className="border-t border-slate-400 pt-1">Academic Coordinator Signature</div>
          </div>
          <div>
            <div className="h-8 flex items-end justify-center pb-1">
              <span className="font-serif italic text-slate-400 font-normal">Approved</span>
            </div>
            <div className="border-t border-slate-400 pt-1">Head of School Endorsement</div>
          </div>
        </div>

        {/* Print CSS */}
        <style jsx global>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm 12mm;
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
);

PrintableMidtermCard.displayName = 'PrintableMidtermCard';

export default PrintableMidtermCard;
