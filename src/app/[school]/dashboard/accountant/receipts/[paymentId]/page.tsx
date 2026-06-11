
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Download, Loader2, AlertCircle, ArrowLeft, Printer } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ReceiptTemplate } from '@/components/dashboard/receipts/receipt-template';
import { Skeleton } from '@/components/ui/skeleton';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { dbService } from '@/lib/dbService';
import type { Payment, SchoolInfo } from '@/lib/schema';

export default function IndividualReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const { paymentId } = params;

  const [payment, setPayment] = useState<Payment | null>(null);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (typeof paymentId !== 'string') return;
    
    setIsLoading(true);
    setError(null);
    try {
      const [paymentData, schoolInfoData] = await Promise.all([
        dbService.getDoc<Payment>('payments', paymentId),
        dbService.getDoc<SchoolInfo>('system', 'schoolInfo'),
      ]);

      if (paymentData) {
        setPayment(paymentData);
      } else {
        setError('Payment record not found.');
        notFound();
      }

      if (schoolInfoData) {
        setSchoolInfo(schoolInfoData);
      } else {
        console.warn("School information is not configured in System > School Info.");
      }
    } catch (e: any) {
      console.error('Error fetching data:', e);
      setError(e.message || 'An error occurred while fetching the receipt data.');
    } finally {
      setIsLoading(false);
    }
  }, [paymentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    const contentElement = document.getElementById('printable-area');
    if (!contentElement || !payment) return;
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
        const imgProps= pdf.getImageProperties(imgData);
        const pdfWidth = pageWidth;
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        let position = 0;
        let heightLeft = pdfHeight;

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
            position = -heightLeft;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pageHeight;
        }

        pdf.save(`Receipt-${payment.invoiceId}.pdf`);

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

  if (!payment) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="print-hidden flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Payments
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
        <ReceiptTemplate payment={payment} schoolInfo={schoolInfo} />
      </div>
    </div>
  );
}
