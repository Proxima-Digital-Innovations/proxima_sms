
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Download, Loader2, AlertCircle, ArrowLeft, Printer } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InvoiceTemplate } from '@/components/dashboard/invoices/invoice-template';
import { Skeleton } from '@/components/ui/skeleton';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { dbService } from '@/lib/dbService';
import type { Invoice, SchoolInfo } from '@/lib/schema';

export default function IndividualInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const { invoiceId } = params;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (typeof invoiceId !== 'string') return;
    
    setIsLoading(true);
    setError(null);
    try {
      const [invoiceData, schoolInfoData] = await Promise.all([
        dbService.getDoc<Invoice>('invoices', invoiceId),
        dbService.getDoc<SchoolInfo>('system', 'schoolInfo'),
      ]);

      if (invoiceData) {
        setInvoice(invoiceData);
      } else {
        setError('Invoice not found.');
        notFound();
      }

      if (schoolInfoData) {
        setSchoolInfo(schoolInfoData);
      } else {
        console.warn("School information is not configured in System > School Info.");
      }
    } catch (e: any) {
      console.error('Error fetching data:', e);
      setError(e.message || 'An error occurred while fetching the invoice.');
    } finally {
      setIsLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    const contentElement = document.getElementById('printable-area');
    if (!contentElement || !invoice) return;
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

        pdf.save(`Invoice-${invoice.invoiceId}.pdf`);

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

  if (!invoice) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="print-hidden flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Invoices
          </Button>
          <div className="flex gap-2">
            <Button onClick={handlePrint} variant="outline">
                <Printer className="mr-2 h-4 w-4" />
                Print
            </Button>
            <Button onClick={handleDownload} size="lg" disabled={isDownloading}>
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
        <InvoiceTemplate invoice={invoice} schoolInfo={schoolInfo} />
      </div>
    </div>
  );
}
