
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Download, Loader2, AlertCircle, ArrowLeft, Printer } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ReportCardTemplate } from '@/components/dashboard/results/report-card-template';
import { Skeleton } from '@/components/ui/skeleton';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { dbService } from '@/lib/dbService';
import type { ReportCard, SchoolInfo } from '@/lib/schema';

export default function IndividualReportPage() {
  const params = useParams();
  const router = useRouter();
  const { reportId } = params;

  const [reportCard, setReportCard] = useState<ReportCard | null>(null);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (typeof reportId !== 'string') return;
    
    setIsLoading(true);
    setError(null);
    try {
      const [reportCardData, schoolInfoData] = await Promise.all([
        dbService.getDoc<ReportCard>('reportCards', reportId),
        dbService.getDoc<SchoolInfo>('system', 'schoolInfo'),
      ]);

      if (reportCardData) {
        setReportCard(reportCardData);
      } else {
        setError('Report card not found.');
        notFound();
      }
      
      if (schoolInfoData) {
        setSchoolInfo(schoolInfoData);
      } else {
        console.warn("School information is not configured in System > School Info.");
      }
    } catch (e: any) {
      console.error('Error fetching report card:', e);
      setError(e.message || 'An error occurred while fetching the report.');
    } finally {
      setIsLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    const contentElement = document.getElementById('printable-area');
    if (!contentElement || !reportCard) return;
    setIsDownloading(true);

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'a4',
      });

      const pageHeight = pdf.internal.pageSize.getHeight();
      const pageWidth = pdf.internal.pageSize.getWidth();
      
      const canvas = await html2canvas(contentElement, {
        scale: 2,
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pageWidth;
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      let heightLeft = pdfHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft > 0) {
        position = -heightLeft;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Report-Card-${reportCard.studentName.replace(/ /g, '-')}.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF", error);
      setError("Could not generate the PDF for download.");
    } finally {
      setIsDownloading(false);
    }
  };


  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-8 w-64" />
        <div className="space-y-8">
          <Skeleton className="h-[800px] w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!reportCard) {
    return null;
  }

  return (
      <div className="space-y-6">
        <div className="print-hidden flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
            </Button>
            <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={handlePrint} variant="outline" className="w-full sm:w-auto">
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                </Button>
                <Button onClick={handleDownload} size="lg" disabled={isDownloading} className="w-full sm:w-auto">
                    {isDownloading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Downloading...
                        </>
                    ) : (
                        <>
                            <Download className="mr-2 h-4 w-4" />
                            Download PDF
                        </>
                    )}
                </Button>
            </div>
        </div>

        <div id="printable-area">
            <ReportCardTemplate reportCard={reportCard} schoolInfo={schoolInfo} />
        </div>

      </div>
  );
}
