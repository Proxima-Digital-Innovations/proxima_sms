'use client';

import React, { useEffect, useState } from 'react';
import type { Invoice, SchoolInfo } from '@/lib/schema';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { School, ShieldCheck } from 'lucide-react';
import QRCode from 'qrcode';

interface InvoiceTemplateProps {
  invoice: Invoice;
  schoolInfo: SchoolInfo | null;
}

export function InvoiceTemplate({ invoice, schoolInfo }: InvoiceTemplateProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const getStatusVariant = (status: Invoice['status']) => {
    switch (status) {
      case 'Paid': return 'default';
      case 'Unpaid': return 'secondary';
      case 'Overdue': return 'destructive';
      default: return 'outline';
    }
  };

  const dueDate = invoice.dueDate?.seconds
    ? format(new Date(invoice.dueDate.seconds * 1000), 'PPP')
    : 'N/A';
  const issueDate = invoice.createdAt?.seconds
    ? format(new Date(invoice.createdAt.seconds * 1000), 'PPP')
    : 'N/A';

  useEffect(() => {
    async function genQR() {
      try {
        const verifyUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/verify/receipt/${invoice.id || invoice.invoiceId}`;
        const dataUrl = await QRCode.toDataURL(verifyUrl, {
          width: 140,
          margin: 1,
          color: { dark: '#0f172a', light: '#ffffff' },
        });
        setQrDataUrl(dataUrl);
      } catch (err) {
        console.error('Failed to generate invoice QR', err);
      }
    }
    genQR();
  }, [invoice]);

  return (
    <div className="printable-invoice-sheet bg-white text-slate-900 font-sans max-w-4xl mx-auto border-2 border-slate-900 rounded-lg p-6 md:p-8 print:border-none print:p-0 print:max-w-none shadow-md print:shadow-none select-text relative">
      {/* Background Crest Watermark */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] overflow-hidden select-none">
        <School className="w-[500px] h-[500px] text-slate-900" />
      </div>

      {/* Official School Header */}
      <div className="border-b-2 border-slate-900 pb-4 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {schoolInfo?.logoUrl ? (
              <Image
                src={schoolInfo.logoUrl}
                alt="School Logo"
                width={80}
                height={80}
                className="h-16 w-auto object-contain rounded-md border border-slate-300 p-0.5"
                unoptimized
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                <School className="w-8 h-8" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-black uppercase tracking-wider text-slate-900 leading-tight">
                {schoolInfo?.name || 'Proxima Academy'}
              </h1>
              <p className="text-xs font-medium text-slate-600 mt-0.5 uppercase tracking-wide">
                {schoolInfo?.address || 'Victoria Island, Lagos, Nigeria'}
              </p>
              <p className="text-xs text-slate-500 font-mono">
                Phone: {schoolInfo?.phone || '+234 800 PROXIMA'} | Email: {schoolInfo?.email || 'bursary@proximasms.com'}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0 flex items-center gap-3">
            <div className="border-2 border-slate-900 px-3.5 py-1.5 rounded-md bg-slate-50 text-right">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">Bursary Office</span>
              <span className="text-base font-black uppercase tracking-wider text-slate-900 block">Student Fee Invoice</span>
              <span className="text-xs font-mono font-bold text-slate-700 block mt-0.5">
                #{invoice.invoiceId}
              </span>
            </div>
            {qrDataUrl && (
              <div className="p-0.5 border border-slate-300 rounded bg-white shrink-0" title="Scan to verify online">
                <img src={qrDataUrl} alt="Invoice QR" className="w-14 h-14 object-contain" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bill To & Metadata Strip */}
      <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-800 p-3 rounded-md text-xs mb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Billed To (Student)</span>
          <p className="font-black text-sm text-slate-900 mt-0.5">{invoice.studentName}</p>
          <p className="text-slate-600 font-medium">Class / Cohort: <span className="font-semibold text-slate-900">{invoice.class}</span></p>
          <p className="text-slate-600 font-medium font-mono">Student Reg ID: <span className="font-bold text-slate-900">{invoice.studentId}</span></p>
        </div>
        <div className="text-right flex flex-col justify-between items-end">
          <div className="space-y-0.5">
            <p className="text-slate-600"><strong>Issue Date:</strong> {issueDate}</p>
            <p className="text-slate-600"><strong>Due Date:</strong> {dueDate}</p>
          </div>
          <Badge variant={getStatusVariant(invoice.status)} className="mt-1 text-xs uppercase px-3 py-0.5 font-bold">
            {invoice.status}
          </Badge>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="border border-slate-800 rounded-md overflow-hidden mb-4">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-900 hover:bg-slate-900 text-white">
              <TableHead className="font-bold text-white text-xs uppercase tracking-wider">Item Description</TableHead>
              <TableHead className="text-right font-bold text-white text-xs uppercase tracking-wider w-40">Amount (NGN)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.items.map((item, index) => (
              <TableRow key={index} className="hover:bg-slate-50/70 border-b border-slate-200">
                <TableCell className="font-medium text-slate-900 text-xs py-2">{item.name}</TableCell>
                <TableCell className="text-right font-mono text-slate-900 text-xs py-2">{item.amount.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter className="bg-slate-100 border-t-2 border-slate-900 font-sans">
            <TableRow className="border-b border-slate-300">
              <TableCell className="font-black text-slate-900 text-sm py-2">Total Amount Payable</TableCell>
              <TableCell className="text-right font-mono font-black text-slate-950 text-base py-2">
                NGN {invoice.totalAmount.toLocaleString()}
              </TableCell>
            </TableRow>
            {invoice.status !== 'Unpaid' && (
              <>
                <TableRow className="border-b border-slate-200 text-xs font-medium">
                  <TableCell className="text-slate-600 py-1.5">Amount Credited / Paid</TableCell>
                  <TableCell className="text-right font-mono text-emerald-700 font-bold py-1.5">
                    NGN {((invoice.status === 'Paid' && invoice.balance === 0) ? invoice.totalAmount : invoice.amountPaid).toLocaleString()}
                  </TableCell>
                </TableRow>
                <TableRow className="text-xs font-bold">
                  <TableCell className="text-slate-800 py-1.5">Outstanding Balance Due</TableCell>
                  <TableCell className="text-right font-mono text-rose-700 font-black py-1.5">
                    NGN {invoice.balance.toLocaleString()}
                  </TableCell>
                </TableRow>
              </>
            )}
          </TableFooter>
        </Table>
      </div>

      {/* Payment Instructions & Bank Details */}
      <div className="border border-slate-300 rounded-md p-3 bg-slate-50 text-xs mb-4">
        <h4 className="font-bold uppercase tracking-wider text-slate-900 text-[11px] mb-1">Official Remittance Instructions:</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-700">
          <div>
            <p><strong>Bank:</strong> First Bank of Nigeria / Zenith Bank</p>
            <p><strong>Account Name:</strong> {schoolInfo?.name || 'Proxima Academy Collections'}</p>
          </div>
          <div>
            <p><strong>Account Number:</strong> 2012345678</p>
            <p><strong>Payment Reference:</strong> <span className="font-mono font-bold text-slate-900">{invoice.invoiceId}</span></p>
          </div>
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-8 pt-2 text-center text-[9.5px] font-bold uppercase tracking-wider text-slate-700 border-t border-slate-800">
        <div>
          <div className="h-6 flex items-end justify-center pb-0.5">
            <span className="font-serif italic text-slate-500 font-normal text-xs">Bursary Office</span>
          </div>
          <div className="border-t border-slate-800 pt-1">Authorized Bursar Signature</div>
        </div>
        <div>
          <div className="h-6 flex items-end justify-center pb-0.5 text-[8.5px] text-emerald-700 font-mono flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>OFFICIAL ELECTRONIC INVOICE</span>
          </div>
          <div className="border-t border-slate-800 pt-1">Official Stamp &amp; Date</div>
        </div>
      </div>

      {/* Print CSS */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          body {
            background: white !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .printable-invoice-sheet {
            width: 100% !important;
            max-width: none !important;
            border: 2px solid #0f172a !important;
            padding: 16px 20px !important;
            margin: 0 !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: always !important;
            break-after: page !important;
          }
        }
      `}</style>
    </div>
  );
}

export default InvoiceTemplate;
