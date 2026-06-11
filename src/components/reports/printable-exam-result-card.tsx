import React from 'react';
import { Score, Student, BehaviouralAssessment } from '@/lib/schema';

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
    <div className="bg-white min-h-screen p-8 text-xs print:p-0 print:text-[10pt]">
      <div className="container mx-auto">
        <div className="mb-4 overflow-x-auto">
          <table className="w-full border-collapse border border-black text-left">
            {/* Header Image */}
            <thead>
              <tr>
                <th colSpan={10} className="border border-black p-2 text-center">
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
                <th colSpan={10} className="border border-black p-2 text-center bg-gray-100 print:bg-gray-100">
                  <h1 className="text-xl font-bold m-0">Examination Report Card</h1>
                </th>
              </tr>
              <tr>
                <th colSpan={10} className="border border-black p-2 text-center bg-gray-50 print:bg-gray-50">
                  Student Information
                </th>
              </tr>
            </thead>

            {/* Student Info */}
            <tbody>
              <tr>
                <th className="border border-black p-2 font-bold w-32">Student Name</th>
                <td colSpan={4} className="border border-black p-2">
                  {student.firstName} {student.lastName}
                </td>
                <th className="border border-black p-2 font-bold w-32">Admission Number</th>
                <td colSpan={4} className="border border-black p-2">
                  {student.studentId}
                </td>
              </tr>
              <tr>
                <th className="border border-black p-2 font-bold">Current Class</th>
                <td colSpan={4} className="border border-black p-2">
                  {student.classLevel}
                </td>
                <th className="border border-black p-2 font-bold">Gender</th>
                <td colSpan={4} className="border border-black p-2">
                  {student.gender}
                </td>
              </tr>
            </tbody>

            {/* Subject Results Header */}
            <thead>
              <tr>
                <th colSpan={10} className="border border-black p-2 text-center bg-gray-50 print:bg-gray-50">
                  Subject Results
                </th>
              </tr>
              <tr>
                <th colSpan={2} className="border border-black p-2 font-bold">Subject</th>
                <th className="border border-black p-2 font-bold">CA</th>
                <th className="border border-black p-2 font-bold">Exam</th>
                <th className="border border-black p-2 font-bold">Total</th>
                <th className="border border-black p-2 font-bold">Grade</th>
                <th className="border border-black p-2 font-bold">Position</th>
              </tr>
            </thead>

            {/* Results */}
            <tbody>
              {results.map((result, index) => (
                <tr key={index}>
                  <td colSpan={2} className="border border-black p-2">
                    {result.subjectName}
                  </td>
                  <td className="border border-black p-2">{result.caScore}</td>
                  <td className="border border-black p-2">{result.examScore}</td>
                  <td className="border border-black p-2">{result.totalScore}</td>
                  <td className="border border-black p-2">{result.grade}</td>
                  <td className="border border-black p-2">{result.position || '-'}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={5} className="border border-black p-2 font-bold text-right">
                  Total Score
                </td>
                <td className="border border-black p-2 font-bold">{totalScore}</td>
                <td colSpan={2} className="border border-black p-2 font-bold text-right">
                  Average:
                </td>
                <td colSpan={2} className="border border-black p-2 font-bold">
                  {averageScore.toFixed(2)}%
                </td>
              </tr>
            </tbody>

            {/* Fee Info */}
            {feeInfo && (
              <>
                <thead>
                  <tr>
                    <th colSpan={10} className="border border-black p-2 text-center bg-gray-50 print:bg-gray-50">
                      Fee Information
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th className="border border-black p-2 font-bold">Total Fee</th>
                    <td colSpan={2} className="border border-black p-2">
                      ₦{feeInfo.totalFee.toLocaleString()}
                    </td>
                    <th className="border border-black p-2 font-bold">Amount Paid</th>
                    <td colSpan={2} className="border border-black p-2">
                      ₦{feeInfo.amountPaid.toLocaleString()}
                    </td>
                    <th className="border border-black p-2 font-bold">Outstanding Balance</th>
                    <td colSpan={3} className="border border-black p-2 text-red-600 font-bold">
                      ₦{feeInfo.outstandingBalance.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </>
            )}

            {/* Behavioral Assessment */}
            {behaviouralAssessment && (
              <>
                <thead>
                  <tr>
                    <th colSpan={10} className="border border-black p-2 text-center bg-gray-50 print:bg-gray-50">
                      Behavioral Assessment
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th className="border border-black p-2 font-bold">Conduct</th>
                    <td className="border border-black p-2">{getBehavioralDisplay(behaviouralAssessment.conduct)}</td>
                    <th className="border border-black p-2 font-bold">Punctuality</th>
                    <td className="border border-black p-2">{getBehavioralDisplay(behaviouralAssessment.punctuality)}</td>
                    <th className="border border-black p-2 font-bold">Dedication</th>
                    <td colSpan={5} className="border border-black p-2">{getBehavioralDisplay(behaviouralAssessment.dedication)}</td>
                  </tr>
                  <tr>
                    <th className="border border-black p-2 font-bold">Participation</th>
                    <td className="border border-black p-2">{getBehavioralDisplay(behaviouralAssessment.participation)}</td>
                    <th className="border border-black p-2 font-bold">Hospitality</th>
                    <td className="border border-black p-2">{getBehavioralDisplay(behaviouralAssessment.hospitality)}</td>
                    <th className="border border-black p-2 font-bold">Neatness</th>
                    <td colSpan={5} className="border border-black p-2">{getBehavioralDisplay(behaviouralAssessment.neatness)}</td>
                  </tr>
                  <tr>
                    <th className="border border-black p-2 font-bold">Creativity</th>
                    <td className="border border-black p-2">{getBehavioralDisplay(behaviouralAssessment.creativity)}</td>
                    <th className="border border-black p-2 font-bold">Physical Fitness</th>
                    <td colSpan={8} className="border border-black p-2">{getBehavioralDisplay(behaviouralAssessment.physical)}</td>
                  </tr>
                </tbody>
              </>
            )}

            {/* Comments */}
            <thead>
              <tr>
                <th colSpan={10} className="border border-black p-2 text-center bg-gray-50 print:bg-gray-50">
                  General Comments
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={10} className="border border-black p-4 text-center italic">
                  {comments || 'No comments available.'}
                </td>
              </tr>
            </tbody>

            {/* Signature */}
            <thead>
              <tr>
                <th colSpan={5} className="border border-black p-4 text-center font-bold align-middle h-32">
                  Signature
                </th>
                <td colSpan={5} className="border border-black p-4 text-center align-middle h-32">
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
