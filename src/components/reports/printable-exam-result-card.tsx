import React from 'react';
import { Score, Student, BehaviouralAssessment } from '@/lib/schema';
import { School } from 'lucide-react';

type PrintableExamResultCardProps = {
  student: Student;
  results: (Score & { subjectName: string; grade: string; position?: string })[];
  term: string;
  session: string;
  feeInfo?: {
    totalFee: number;
    amountPaid: number;
    outstandingBalance: number;
  };
  behaviouralAssessment?: BehaviouralAssessment;
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
  comments,
  schoolHeaderUrl = '/placeholder-header.jpg',
  signatureUrl = '/assets/legacy/school_images/USMAN_SANI_page-0001.jpg',
}: PrintableExamResultCardProps) {
  const totalScore = results.reduce((acc, curr) => acc + (curr.totalScore || 0), 0);
  const averageScore = results.length > 0 ? totalScore / results.length : 0;

  const getBehavioralDisplay = (val: number) => {
    if (val >= 5) return 'Excellent';
    if (val >= 4) return 'Very Good';
    if (val >= 3) return 'Good';
    if (val >= 2) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="bg-white min-h-screen p-8 text-sm print:p-0 print:text-[10pt] font-sans">
      <div className="container mx-auto max-w-4xl border-2 border-slate-900 print:border-none p-8 print:p-0">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b-4 border-slate-900 pb-6 mb-6">
            <div className="flex gap-4 items-center">
            <div className="p-3 border-2 border-slate-900">
                <School className="h-12 w-12 text-slate-900" />
            </div>
            <div>
                <h1 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-slate-900">Albabello International</h1>
                <p className="text-xs font-bold tracking-[0.2em] text-slate-600 uppercase mt-1">Excellence & Character</p>
                <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">123 Education Way, Knowledge City</p>
            </div>
            </div>
            <div className="text-right">
            <div className="bg-background text-foreground px-4 py-2 print:border-2 print:border-slate-900 print:bg-white print:text-slate-900">
                <h2 className="text-lg font-black uppercase tracking-widest">
                Term Report
                </h2>
            </div>
            <p className="text-xs font-bold mt-2 uppercase tracking-widest text-slate-600">{term} <span className="mx-1">•</span> {session}</p>
            </div>
        </div>

        {/* Student Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-background print:bg-transparent border-2 border-border p-4 mb-6">
            <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Student Name</p>
            <p className="font-black text-slate-900 uppercase text-sm">{student.firstName} {student.lastName}</p>
            </div>
            <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Admission No.</p>
            <p className="font-bold text-slate-900 uppercase font-mono text-sm">{student.studentId || 'N/A'}</p>
            </div>
            <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Current Class</p>
            <p className="font-bold text-slate-900 uppercase text-sm">{student.classLevel || 'N/A'}</p>
            </div>
            <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Gender</p>
            <p className="font-bold text-slate-900 uppercase text-sm">{student.gender || 'N/A'}</p>
            </div>
        </div>

        {/* Academic Performance */}
        <div className="mb-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-2 border-b-2 border-slate-900 inline-block pb-1">Academic Performance</h3>
            <div className="w-full overflow-x-auto custom-scrollbar"><table className="w-full text-sm border-collapse border-2 border-slate-900">
            <thead>
                <tr className="bg-background text-foreground print:bg-slate-200 print:text-slate-900">
                <th className="border border-border print:border-slate-400 p-2 text-left uppercase tracking-wider text-xs w-2/5">Subject</th>
                <th className="border border-border print:border-slate-400 p-2 text-center uppercase tracking-wider text-xs">CA</th>
                <th className="border border-border print:border-slate-400 p-2 text-center uppercase tracking-wider text-xs">Exam</th>
                <th className="border border-border print:border-slate-400 p-2 text-center uppercase tracking-wider text-xs bg-muted print:bg-slate-300">Total</th>
                <th className="border border-border print:border-slate-400 p-2 text-center uppercase tracking-wider text-xs">Grade</th>
                <th className="border border-border print:border-slate-400 p-2 text-center uppercase tracking-wider text-xs">Pos</th>
                </tr>
            </thead>
            <tbody>
                {results.map((result: any, index) => (
                <tr key={index} className="even:bg-background print:even:bg-transparent">
                    <td className="border border-slate-300 print:border-slate-400 p-2 font-bold text-foreground uppercase text-xs">{result.subject?.name || result.subjectName}</td>
                    <td className="border border-slate-300 print:border-slate-400 p-2 text-center font-medium">{(result.ca1 || 0) + (result.ca2 || 0) || '-'}</td>
                    <td className="border border-slate-300 print:border-slate-400 p-2 text-center font-medium">{result.exam || result.examScore || '-'}</td>
                    <td className="border border-slate-300 print:border-slate-400 p-2 text-center font-black bg-slate-100 print:bg-transparent">{result.total || result.totalScore || '-'}</td>
                    <td className="border border-slate-300 print:border-slate-400 p-2 text-center font-bold">{result.grade ?? '-'}</td>
                    <td className="border border-slate-300 print:border-slate-400 p-2 text-center font-medium">{result.classRank || result.position || '-'}</td>
                </tr>
                ))}
                {results.length === 0 && (
                <tr>
                    <td colSpan={6} className="border border-slate-300 p-4 text-center text-muted-foreground italic">No academic results found.</td>
                </tr>
                )}
            </tbody>
            </table></div>
        </div>

        {/* Summary & Behavioural Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Term Summary */}
            <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-2 border-b-2 border-slate-900 inline-block pb-1">Term Summary</h3>
                <div className="border-2 border-slate-900 p-4 bg-background print:bg-transparent">
                    <div className="flex justify-between items-center border-b border-slate-300 pb-2 mb-2">
                        <span className="font-bold text-slate-600 uppercase text-xs tracking-widest">Total Score</span>
                        <span className="text-lg font-black text-slate-900">{totalScore}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-300 pb-2 mb-2">
                        <span className="font-bold text-slate-600 uppercase text-xs tracking-widest">Average Score</span>
                        <span className="text-lg font-black text-slate-900">{averageScore.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-600 uppercase text-xs tracking-widest">Class Position</span>
                        <span className="text-lg font-black text-slate-900">-</span>
                    </div>
                </div>
            </div>

            {/* Behavioural Assessment */}
            {behaviouralAssessment && (
            <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-2 border-b-2 border-slate-900 inline-block pb-1">Behavioural Assessment</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs border-2 border-slate-900 p-4 bg-background print:bg-transparent">
                    <div className="flex justify-between border-b border-border pb-1">
                        <span className="font-bold text-slate-600 uppercase">Conduct</span>
                        <span className="font-black">{getBehavioralDisplay(behaviouralAssessment.conduct)}</span>
                    </div>
                    <div className="flex justify-between border-b border-border pb-1">
                        <span className="font-bold text-slate-600 uppercase">Punctuality</span>
                        <span className="font-black">{getBehavioralDisplay(behaviouralAssessment.punctuality)}</span>
                    </div>
                    <div className="flex justify-between border-b border-border pb-1">
                        <span className="font-bold text-slate-600 uppercase">Dedication</span>
                        <span className="font-black">{getBehavioralDisplay(behaviouralAssessment.dedication)}</span>
                    </div>
                    <div className="flex justify-between border-b border-border pb-1">
                        <span className="font-bold text-slate-600 uppercase">Participation</span>
                        <span className="font-black">{getBehavioralDisplay(behaviouralAssessment.participation)}</span>
                    </div>
                    <div className="flex justify-between border-b border-border pb-1">
                        <span className="font-bold text-slate-600 uppercase">Hospitality</span>
                        <span className="font-black">{getBehavioralDisplay(behaviouralAssessment.hospitality)}</span>
                    </div>
                    <div className="flex justify-between border-b border-border pb-1">
                        <span className="font-bold text-slate-600 uppercase">Neatness</span>
                        <span className="font-black">{getBehavioralDisplay(behaviouralAssessment.neatness)}</span>
                    </div>
                    <div className="flex justify-between col-span-2 border-b border-border pb-1">
                        <span className="font-bold text-slate-600 uppercase">Physical Fitness</span>
                        <span className="font-black">{getBehavioralDisplay(behaviouralAssessment.physical)}</span>
                    </div>
                </div>
            </div>
            )}
        </div>

        {/* Remarks */}
        <div className="mb-8 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 border-b-2 border-slate-900 inline-block pb-1">Official Remarks</h3>
            <div className="flex gap-4 items-end border-b-2 border-slate-300 pb-2">
                <div className="w-48 font-bold uppercase text-xs text-slate-600 tracking-widest">Class Teacher's Remark:</div>
                <div className="flex-1 font-medium italic text-foreground">{comments || '........................................................................................'}</div>
            </div>
            <div className="flex gap-4 items-end border-b-2 border-slate-300 pb-2">
                <div className="w-48 font-bold uppercase text-xs text-slate-600 tracking-widest">Principal's Remark:</div>
                <div className="flex-1 font-medium italic text-foreground">........................................................................................</div>
            </div>
        </div>

        {/* Signatures */}
        <div className="flex justify-between pt-12 text-xs font-black uppercase tracking-widest text-muted-foreground">
            <div className="text-center w-48">
                <div className="border-t-2 border-slate-400 pt-2">Form Teacher Signature</div>
            </div>
            <div className="text-center w-48">
                <div className="border-t-2 border-slate-400 pt-2">Principal Signature</div>
            </div>
            <div className="text-center w-48">
                <div className="border-t-2 border-slate-400 pt-2 text-foreground">Official Stamp</div>
            </div>
        </div>

      </div>
    </div>
  );
}
