'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getExamResultsForPrint } from '@/actions/results-actions';
import { PrintableExamResultCard } from '@/components/reports/printable-exam-result-card';
import { Button } from '@/components/ui/button';
import { Loader2, Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';

function PrintExamResultsContent() {
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
    documentTitle: `Terminal_Report_${session}_${term}`,
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
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4">
        <p className="text-lg font-semibold text-foreground">No examination results found.</p>
        <p className="text-xs text-muted-foreground mt-1">Please ensure results have been submitted and generated for this term.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-background p-4 sm:p-8 print:p-0 print:bg-white">
      <div className="mb-6 flex justify-between items-center print:hidden max-w-4xl mx-auto">
        <div>
          <h1 className="text-xl font-bold text-foreground">Terminal Academic Report Cards</h1>
          <p className="text-xs text-muted-foreground">Showing {data.length} candidate record(s) ready for high-fidelity A4 printing.</p>
        </div>
        <Button onClick={() => handlePrint()} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
          <Printer className="w-4 h-4" />
          Print / Save as PDF
        </Button>
      </div>

      <div ref={componentRef} className="bg-white print:bg-white max-w-4xl mx-auto space-y-8 print:space-y-0">
        {data.map((item, index) => (
          <div key={item.student.id} className="print:break-after-page shadow-md print:shadow-none">
            <PrintableExamResultCard
              student={item.student}
              results={item.results}
              term={term}
              session={session}
              feeInfo={item.feeInfo}
              behaviouralAssessment={item.behavioralAssessment}
              behaviouralScores={item.behaviouralScores}
              summary={item.summary}
              school={item.school}
            />
            {index < data.length - 1 && (
              <div className="h-6 bg-slate-200 dark:bg-muted/50 print:hidden my-6" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PrintExamResultsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <PrintExamResultsContent />
    </Suspense>
  );
}
