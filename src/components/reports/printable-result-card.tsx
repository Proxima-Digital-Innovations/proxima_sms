import React from 'react';
import { MidTermResult, Student } from '@/lib/schema';
import Image from 'next/image';

type PrintableResultCardProps = {
  student: Student;
  results: MidTermResult[];
  term: string;
  session: string;
  schoolHeaderUrl?: string;
  signatureUrl?: string;
  watermarkUrl?: string;
};

export function PrintableResultCard({
  student,
  results,
  term,
  session,
  schoolHeaderUrl = '/placeholder-header.jpg',
  signatureUrl = '/assets/legacy/school_images/USMAN_SANI_page-0001.jpg',
  watermarkUrl = '/placeholder-logo.png',
}: PrintableResultCardProps) {
  const averageScore =
    results.length > 0
      ? results.reduce((acc, curr) => acc + curr.score, 0) / results.length
      : 0;

  const getOverallEffort = (avg: number) => {
    if (avg >= 0 && avg < 6) return 'Emerging (Need Support)';
    if (avg >= 6 && avg < 9) return 'Emerging + (Satisfactory)';
    if (avg >= 9 && avg < 13) return 'Expected (Good)';
    if (avg >= 13 && avg < 17) return 'Expected + (Very Good)';
    if (avg >= 17 && avg <= 20) return 'Exceeding (Excellent)';
    return 'Invalid Score';
  };

  return (
    <div className="relative bg-white min-h-screen p-8 text-xs print:p-0 print:text-[10pt]">
      {/* Watermark */}
      <div
        className="absolute inset-0 z-0 opacity-[0.08] pointer-events-none flex items-center justify-center"
        style={{
          backgroundImage: `url(${watermarkUrl})`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundSize: '60%',
        }}
      />

      <div className="relative z-10 container mx-auto">
        <div className="mb-4 overflow-x-auto">
          <table className="w-full border-collapse border border-black text-left">
            {/* Header Image */}
            <thead>
              <tr>
                <th colSpan={14} className="border border-black p-2 text-center">
                  {schoolHeaderUrl && (
                    <div className="flex justify-center">
                      <img
                        src={schoolHeaderUrl}
                        alt="School Header"
                        className="w-4/5 h-auto object-contain"
                      />
                    </div>
                  )}
                </th>
              </tr>
              <tr>
                <th colSpan={14} className="border border-black p-2 text-center bg-gray-100 print:bg-gray-100">
                  <h1 className="text-xl font-bold m-0">STUDENT PROGRESS REPORT</h1>
                </th>
              </tr>
              <tr>
                <th colSpan={14} className="border border-black p-2 text-center bg-gray-50 print:bg-gray-50">
                  STUDENT INFORMATION
                </th>
              </tr>
            </thead>

            {/* Student Info */}
            <tbody>
              <tr>
                <th className="border border-black p-2 font-bold w-32">Student Name</th>
                <td colSpan={9} className="border border-black p-2">
                  {student.firstName} {student.lastName} [{student.studentId}]
                </td>
                <th className="border border-black p-2 font-bold w-24">Term</th>
                <td colSpan={3} className="border border-black p-2">
                  {term}
                </td>
              </tr>
              <tr>
                <th className="border border-black p-2 font-bold">Current Class</th>
                <td colSpan={9} className="border border-black p-2">
                  {student.classLevel}
                </td>
                <th className="border border-black p-2 font-bold">Session</th>
                <td colSpan={3} className="border border-black p-2">
                  {session}
                </td>
              </tr>
            </tbody>

            {/* Subject Headers */}
            <thead>
              <tr>
                <th colSpan={14} className="border-0 h-4"></th>
              </tr>
              <tr>
                <th colSpan={4} className="border border-black p-2 font-bold">
                  SUBJECT
                </th>
                <th colSpan={5} className="border border-black p-2 text-center font-bold">
                  EFFORTS
                </th>
                <th colSpan={5} className="border border-black p-2 font-bold">
                  ACHIEVEMENT
                </th>
              </tr>
              <tr>
                <th colSpan={4} className="border border-black p-2"></th>
                <th className="border border-black p-1 text-center text-[10px] bg-[#da3d3d] text-white print:bg-[#da3d3d] print:text-white w-16">
                  EMERGING
                </th>
                <th className="border border-black p-1 text-center text-[10px] bg-[#f5b85d] text-black print:bg-[#f5b85d] print:text-black w-16">
                  EMERGING +
                </th>
                <th className="border border-black p-1 text-center text-[10px] bg-[#f0e36f] text-black print:bg-[#f0e36f] print:text-black w-16">
                  EXPECTED
                </th>
                <th className="border border-black p-1 text-center text-[10px] bg-[#93da42] text-black print:bg-[#93da42] print:text-black w-16">
                  EXPECTED +
                </th>
                <th className="border border-black p-1 text-center text-[10px] bg-[#46af4b] text-white print:bg-[#46af4b] print:text-white w-16">
                  EXCEEDING
                </th>
                <th colSpan={5} className="border border-black p-2"></th>
              </tr>
            </thead>

            {/* Results */}
            <tbody>
              {results.map((result, index) => (
                <tr key={index}>
                  <td colSpan={4} className="border border-black p-2 font-medium">
                    {result.subjectName}
                  </td>
                  <td className="border border-black p-2 text-center font-bold text-green-600">
                    {result.score >= 0 && result.score <= 6 ? '✔️' : ''}
                  </td>
                  <td className="border border-black p-2 text-center font-bold text-green-600">
                    {result.score >= 7 && result.score <= 9 ? '✔️' : ''}
                  </td>
                  <td className="border border-black p-2 text-center font-bold text-green-600">
                    {result.score >= 10 && result.score <= 12 ? '✔️' : ''}
                  </td>
                  <td className="border border-black p-2 text-center font-bold text-green-600">
                    {result.score >= 13 && result.score <= 16 ? '✔️' : ''}
                  </td>
                  <td className="border border-black p-2 text-center font-bold text-green-600">
                    {result.score >= 17 && result.score <= 20 ? '✔️' : ''}
                  </td>
                  <td colSpan={5} className="border border-black p-2">
                    {result.achievement}
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Key */}
            <thead>
              <tr>
                <th colSpan={14} className="border border-black p-4 text-center font-bold bg-gray-50 print:bg-gray-50">
                  KEY: Emerging = 0 - 6, Emerging + = 7 - 9, Expected = 10 - 12, Expected + = 13 - 16, Exceeding = 17 - 20
                </th>
              </tr>
            </thead>

            {/* Overall Effort */}
            <thead>
              <tr>
                <th colSpan={14} className="border border-black p-4 text-center font-bold text-sm">
                  Overall Effort: {getOverallEffort(averageScore)}
                </th>
              </tr>
            </thead>

            {/* Signature */}
            <thead>
              <tr>
                <th colSpan={7} className="border border-black p-4 text-center font-bold align-middle h-32">
                  Head of School's Signature
                </th>
                <td colSpan={7} className="border border-black p-4 text-center align-middle h-32">
                  {signatureUrl ? (
                    <div className="flex justify-center">
                      <img src={signatureUrl} alt="Signature" className="w-32 h-auto" />
                    </div>
                  ) : (
                    <div className="text-gray-400 italic">Signature</div>
                  )}
                </td>
              </tr>
            </thead>
          </table>
        </div>
      </div>
    </div>
  );
}
