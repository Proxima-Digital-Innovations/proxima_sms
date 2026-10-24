'use client';

import React, { useEffect, useState } from 'react';
import { MidTermResult, Student } from '@/lib/schema';
import { School, ShieldCheck } from 'lucide-react';
import QRCode from 'qrcode';

export type PrintableResultCardProps = {
  student: Student & { class?: { name: string } };
  results: (MidTermResult & { subject?: { name: string } })[];
  term: string;
  session: string;
  school?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    logoUrl?: string | null;
    motto?: string;
  } | null;
  schoolHeaderUrl?: string;
  signatureUrl?: string;
  watermarkUrl?: string;
};

export function PrintableResultCard({
  student,
  results,
  term,
  session,
  school,
}: PrintableResultCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const schoolName = school?.name || 'Proxima Academy';
  const schoolAddress = school?.address || 'Victoria Island, Lagos, Nigeria';
  const schoolPhone = school?.phone || '+234 800 PROXIMA';
  const schoolEmail = school?.email || 'admin@proximahub.com';
  const schoolMotto = school?.motto || 'Knowledge, Integrity & Excellence';
  const schoolLogo = school?.logoUrl;

  // Generate verification QR code
  useEffect(() => {
    async function genQR() {
      try {
        const studentRef = student.studentId || student.id;
        const verifyUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/result-checker?studentId=${encodeURIComponent(studentRef)}&term=${encodeURIComponent(term)}&session=${encodeURIComponent(session)}&type=midterm`;
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

  const averageScore =
    results.length > 0
      ? results.reduce((acc, curr) => acc + curr.score, 0) / results.length
      : 0;

  const getOverallEffort = (avg: number) => {
    if (avg >= 17) return 'Exceeding Expectations (Distinction)';
    if (avg >= 13) return 'Expected + (Very Good Progress)';
    if (avg >= 10) return 'Expected (Commendable Progress)';
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
    <div className="report-card-sheet bg-white text-slate-900 font-sans max-w-4xl mx-auto border-2 border-slate-900 rounded-lg p-5 md:p-6 print:border-none print:p-0 print:max-w-none shadow-md print:shadow-none select-text relative">
      {/* Background Crest Watermark */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] overflow-hidden select-none">
        <School className="w-[500px] h-[500px] text-slate-900" />
      </div>

      {/* School Header */}
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
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 block">Progress Assessment</span>
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 block">Mid-Term Academic Report</span>
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

      {/* Student Details Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 border border-slate-800 p-2.5 rounded-md text-xs mb-3">
        <div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Candidate Name</span>
          <span className="font-bold text-slate-900 text-xs">
            {student.firstName} {student.lastName}
          </span>
        </div>
        <div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Student ID / Reg</span>
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
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Academic Term</span>
          <span className="font-bold text-slate-900 text-xs">
            {term}
          </span>
        </div>
      </div>

      {/* Assessment Table */}
      <div className="mb-3">
        <div className="border border-slate-800 rounded-md overflow-hidden">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-bold text-[10px] tracking-wider uppercase">
                <th className="py-1 px-1.5 border-r border-slate-700 w-8 text-center">#</th>
                <th className="py-1 px-2 border-r border-slate-700">Subject Title</th>
                <th className="py-1 px-2 border-r border-slate-700 text-center w-24">CA Score (/20)</th>
                <th className="py-1 px-2 border-r border-slate-700 text-center w-28">Effort Rating</th>
                <th className="py-1 px-2 text-left">Learning Achievement &amp; Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 text-[11px]">
              {results.map((result, index) => {
                const subName = result.subject?.name || result.subjectName || 'Subject';
                const effort = getEffortBucket(result.score);

                return (
                  <tr key={index} className="even:bg-slate-50/70 hover:bg-slate-100/50">
                    <td className="py-1 px-1.5 text-center font-mono text-slate-500 border-r border-slate-300">{index + 1}</td>
                    <td className="py-1 px-2 font-semibold text-slate-900 border-r border-slate-300 uppercase">{subName}</td>
                    <td className="py-1 px-2 text-center font-mono font-black text-slate-950 border-r border-slate-300">
                      {result.score}
                    </td>
                    <td className="py-1 px-2 text-center border-r border-slate-300">
                      <span className={`inline-block px-2 py-0.5 rounded text-[9.5px] font-bold ${
                        effort === 'EXCEEDING' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                        effort === 'EXPECTED+' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                        effort === 'EXPECTED' ? 'bg-indigo-100 text-indigo-800 border border-indigo-300' :
                        effort === 'EMERGING+' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                        'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}>
                        {effort}
                      </span>
                    </td>
                    <td className="py-1 px-2 text-slate-700 text-[10.5px] italic">
                      {result.achievement || (result.score >= 15 ? 'Demonstrates high subject comprehension and active classroom engagement.' : 'Satisfactory progress. Continued review encouraged.')}
                    </td>
                  </tr>
                );
              })}
              {results.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500 italic">
                    No mid-term results recorded for this student.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Progress Rubric Key */}
      <div className="border border-slate-400 rounded-md p-1.5 bg-slate-50/70 mb-3 text-[9.5px]">
        <span className="font-bold text-slate-900 uppercase tracking-wider mr-2">Effort Scale Key:</span>
        <span className="text-slate-700 font-medium">
          <strong>Emerging</strong> (0 - 6) • <strong>Emerging +</strong> (7 - 9) • <strong>Expected</strong> (10 - 12) • <strong>Expected +</strong> (13 - 16) • <strong>Exceeding</strong> (17 - 20)
        </span>
      </div>

      {/* Overall Assessment KPI */}
      <div className="border border-slate-800 rounded-md p-2.5 bg-slate-50 mb-3 flex items-center justify-between text-xs">
        <div>
          <span className="text-slate-500 uppercase text-[9px] font-bold block">Terminal Mid-Term Average</span>
          <span className="text-sm font-black text-slate-950 font-mono">
            {averageScore.toFixed(1)} / 20 ({((averageScore / 20) * 100).toFixed(1)}%)
          </span>
        </div>
        <div className="text-right">
          <span className="text-slate-500 uppercase text-[9px] font-bold block">Cumulative Assessment</span>
          <span className="text-xs font-bold text-slate-900">
            {getOverallEffort(averageScore)}
          </span>
        </div>
      </div>

      {/* Signature & Seal */}
      <div className="grid grid-cols-2 gap-8 pt-3 text-center text-[9.5px] font-bold uppercase tracking-wider text-slate-700 border-t border-slate-800">
        <div>
          <div className="h-6 flex items-end justify-center pb-0.5">
            <span className="font-serif italic text-slate-500 font-normal text-xs">A. Sani (Certified)</span>
          </div>
          <div className="border-t border-slate-800 pt-1">Academic Coordinator Signature</div>
        </div>
        <div>
          <div className="h-6 flex items-end justify-center pb-0.5 text-[8.5px] text-emerald-700 font-mono flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>DIGITALLY VERIFIED</span>
          </div>
          <div className="border-t border-slate-800 pt-1">Head of School Endorsement &amp; Seal</div>
        </div>
      </div>

      {/* Print CSS */}
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

export default PrintableResultCard;
