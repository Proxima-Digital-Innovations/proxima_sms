'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { getExamResultsForPrint } from '@/actions/results-actions';
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
        const result = await getExamResultsForPrint(studentId, classId, term, session);
        if (result.success && result.data) {
            setData(result.data);
        }
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



  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900">
        <p className="text-lg text-slate-400">No results found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-8 print:p-0 print:bg-white">
      <div className="mb-8 flex justify-between items-center print:hidden max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-white">Print Exam Results</h1>
        <Button onClick={() => handlePrint()} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white">
          <Printer className="w-4 h-4" />
          Print / Save as PDF
        </Button>
      </div>

      <div ref={componentRef} className="bg-slate-900 print:bg-white max-w-5xl mx-auto">
        {data.map((item, index) => (
          <div key={item.student.id} className="print:break-after-page mb-8 print:mb-0 last:mb-0 shadow-2xl print:shadow-none">
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
              <div className="h-8 bg-slate-900 print:hidden" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
