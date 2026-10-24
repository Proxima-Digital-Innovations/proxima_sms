'use client';

import React, { useEffect, useState } from 'react';
import type { Payment, SchoolInfo } from '@/lib/schema';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import { format } from 'date-fns';
import { School, ShieldCheck, CheckCircle2 } from 'lucide-react';
import QRCode from 'qrcode';

interface ReceiptTemplateProps {
  payment: Payment;
  schoolInfo: SchoolInfo | null;
}

export function ReceiptTemplate({ payment, schoolInfo }: ReceiptTemplateProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const paymentDate = payment.paymentDate?.seconds
    ? format(new Date(payment.paymentDate.seconds * 1000), 'PPP')
    : 'N/A';

  useEffect(() => {
    async function genQR() {
      try {
        const verifyUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/verify/receipt/${payment.id}`;
        const dataUrl = await QRCode.toDataURL(verifyUrl, {
          width: 140,
          margin: 1,
          color: { dark: '#0f172a', light: '#ffffff' },
        });
        setQrDataUrl(dataUrl);
      } catch (err) {
        console.error('Failed to generate receipt QR', err);
      }
    }
    genQR();
  }, [payment]);

  return (
    <div className="printable-receipt-sheet bg-white text-slate-900 font-sans max-w-4xl mx-auto border-2 border-slate-900 rounded-lg p-6 md:p-8 print:border-none print:p-0 print:max-w-none shadow-md print:shadow-none select-text relative">
      {/* Background Crest Watermark */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] overflow-hidden select-none">
        <School className="w-[500px] h-[500px] text-slate-900" />
      </div>

      {/* Official Header */}
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
              <span className="text-base font-black uppercase tracking-wider text-slate-900 block">Official Fee Receipt</span>
              <span className="text-xs font-mono font-bold text-slate-700 block mt-0.5">
                Receipt No: #{payment.id}
              </span>
            </div>
            {qrDataUrl && (
              <div className="p-0.5 border border-slate-300 rounded bg-white shrink-0" title="Scan to verify online">
                <img src={qrDataUrl} alt="Receipt QR" className="w-14 h-14 object-contain" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Details Banner */}
      <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-800 p-3.5 rounded-md text-xs mb-5">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Received From</span>
          <p className="font-black text-base text-slate-900 mt-0.5">{payment.studentName}</p>
          <p className="text-slate-600 font-medium font-mono mt-0.5">Invoice Reference: <span className="font-bold text-slate-900">{payment.invoiceId}</span></p>
        </div>
        <div className="text-right space-y-1">
          <p className="text-slate-600"><strong>Payment Date:</strong> <span className="text-slate-900 font-semibold">{paymentDate}</span></p>
          <p className="text-slate-600"><strong>Payment Method:</strong> <span className="uppercase text-slate-900 font-semibold">{payment.paymentMethod}</span></p>
          <div className="flex justify-end pt-1">
            <span className="inline-flex items-center text-[10px] font-black text-emerald-700 uppercase tracking-wider bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-md">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Payment Confirmed
            </span>
          </div>
        </div>
      </div>

      {/* Amount Highlight Box */}
      <div className="text-center py-6 px-4 my-5 bg-slate-50 border-2 border-slate-900 rounded-lg">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Total Amount Received</p>
        <p className="text-4xl sm:text-5xl font-black text-slate-950 font-mono tracking-tight">
          NGN {payment.amountPaid.toLocaleString()}
        </p>
        <p className="text-xs text-slate-600 font-medium italic mt-2">
          Payment processed and credited to institutional ledger in full.
        </p>
      </div>

      {/* Notes & Memo */}
      <div className="border border-slate-300 rounded-md p-3 bg-white text-xs mb-6">
        <h4 className="font-bold uppercase tracking-wider text-slate-900 text-[11px] mb-1">Transaction Remarks / Purpose:</h4>
        <p className="text-slate-700 italic text-xs">{payment.notes || 'Tuition and institutional maintenance levy settlement.'}</p>
      </div>

      {/* Signatures & Verification Seal */}
      <div className="grid grid-cols-2 gap-8 pt-4 text-center text-[9.5px] font-bold uppercase tracking-wider text-slate-700 border-t border-slate-800">
        <div>
          <div className="h-6 flex items-end justify-center pb-0.5">
            <span className="font-serif italic text-slate-500 font-normal text-xs">Bursar (Electronic Voucher)</span>
          </div>
          <div className="border-t border-slate-800 pt-1">Authorized Cashier / Bursar</div>
        </div>
        <div>
          <div className="h-6 flex items-end justify-center pb-0.5 text-[8.5px] text-emerald-700 font-mono flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>OFFICIAL ELECTRONIC RECEIPT</span>
          </div>
          <div className="border-t border-slate-800 pt-1">Official Seal &amp; Cryptographic Stamp</div>
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
          .printable-receipt-sheet {
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

export default ReceiptTemplate;
