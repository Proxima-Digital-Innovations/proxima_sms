'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { getMidtermResultsForPrint } from '@/actions/results-actions';
import { MidTermResult, Student } from '@/lib/schema';
import { PrintableResultCard } from '@/components/reports/printable-result-card';
import { Button } from '@/components/ui/button';
import { Loader2, Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';

export default function PrintMidtermResultsPage() {
  const searchParams = useSearchParams();
  const studentId = searchParams.get('studentId');
  const classId = searchParams.get('classId');
  const term = searchParams.get('term') || 'First Term';
  const session = searchParams.get('session') || '2024/2025';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ student: Student; results: MidTermResult[] }[]>([]);
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Midterm_Results_${session}_${term}`,
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await getMidtermResultsForPrint(studentId, classId, term, session);
        if (result.success && 'data' in result && result.data) {
          setData((result as any).data as any);
        } else {
          console.error('Error fetching data:', result.error);
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
        <h1 className="text-2xl font-bold">Print Midterm Results</h1>
        <Button onClick={() => handlePrint()} className="flex items-center gap-2">
          <Printer className="w-4 h-4" />
          Print / Save as PDF
        </Button>
      </div>

      <div ref={componentRef} className="bg-white print:bg-white">
        {data.map((item, index) => (
          <div key={item.student.id} className="print:break-after-page mb-8 print:mb-0 last:mb-0">
            <PrintableResultCard
              student={item.student}
              results={item.results}
              term={term}
              session={session}
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
