'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { dbService } from '@/lib/dbService';
import { Score, Student, BehaviouralAssessment } from '@/lib/schema';
import { PrintableExamResultCard } from '@/components/reports/printable-exam-result-card';
import { Button } from '@/components/ui/button';
import { Loader2, Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';

export default function PrintExamResultsPage() {
  const searchParams = useSearchParams();
  const studentId = searchParams.get('studentId');
  const classId = searchParams.get('classId');
  const term = searchParams.get('term') || 'First Term';
  const session = searchParams.get('session') || '2024/2025';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Exam_Results_${session}_${term}`,
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let studentsToFetch: Student[] = [];

        if (studentId) {
          const student = await dbService.getDoc<Student>('students', studentId);
          if (student) studentsToFetch = [student];
        } else if (classId) {
           const students = await dbService.getDocs<Student>('students', [
            { type: 'where', fieldPath: 'classLevel', opStr: '==', value: classId },
             { type: 'where', fieldPath: 'status', opStr: '==', value: 'Active' }
          ]);
          studentsToFetch = students;
        }

        const allData = await Promise.all(
          studentsToFetch.map(async (student) => {
            // Fetch Scores
            const scores = await dbService.getDocs<Score>('scores', [
              { type: 'where', fieldPath: 'studentId', opStr: '==', value: student.id },
              { type: 'where', fieldPath: 'term', opStr: '==', value: term },
              // { type: 'where', fieldPath: 'session', opStr: '==', value: session }, // Assuming session is in score or implied
            ]);

            // Fetch Behavioral
             const behavioralDocs = await dbService.getDocs<BehaviouralAssessment>('behaviouralAssessments', [
              { type: 'where', fieldPath: 'studentId', opStr: '==', value: student.id },
              { type: 'where', fieldPath: 'term', opStr: '==', value: term },
              { type: 'where', fieldPath: 'session', opStr: '==', value: session },
            ]);
            const behavioralAssessment = behavioralDocs[0];

            // Mock Fee Info (Replace with actual fetch if available)
            const feeInfo = {
                totalFee: 50000,
                amountPaid: 30000,
                outstandingBalance: 20000
            };

            // Map scores to include subjectName (assuming it's stored or fetched)
            // For now, using 'subject' field as name if it's a string, or fetching subject name if it's an ID
            const mappedScores = await Promise.all(scores.map(async (s) => {
                // If subject is an ID, fetch name. If name, use it.
                // Assuming 'subject' field in Score is the name for now based on schema
                return {
                    ...s,
                    subjectName: s.subject, 
                    grade: calculateGrade(s.totalScore),
                    position: '1st' // Placeholder
                };
            }));

            return { student, results: mappedScores, behavioralAssessment, feeInfo };
          })
        );

        setData(allData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (studentId || classId) {
      fetchData();
    }
  }, [studentId, classId, term, session]);

  const calculateGrade = (score: number) => {
      if (score >= 70) return 'A';
      if (score >= 60) return 'B';
      if (score >= 50) return 'C';
      if (score >= 45) return 'D';
      return 'F';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-lg text-gray-500">No results found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8 print:p-0 print:bg-white">
      <div className="mb-8 flex justify-between items-center print:hidden max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold">Print Exam Results</h1>
        <Button onClick={() => handlePrint()} className="flex items-center gap-2">
          <Printer className="w-4 h-4" />
          Print / Save as PDF
        </Button>
      </div>

      <div ref={componentRef} className="bg-white print:bg-white">
        {data.map((item, index) => (
          <div key={item.student.id} className="print:break-after-page mb-8 print:mb-0 last:mb-0">
            <PrintableExamResultCard
              student={item.student}
              results={item.results}
              term={term}
              session={session}
              feeInfo={item.feeInfo}
              behaviouralAssessment={item.behavioralAssessment}
            />
            {/* Add a page break visual in non-print mode if multiple students */}
            {index < data.length - 1 && (
              <div className="h-4 bg-gray-200 print:hidden my-8 border-t border-b border-gray-300" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
