'use client';

import React from 'react';
import type { Announcement, SchoolInfo } from '@/lib/schema';
import Image from 'next/image';
import { format } from 'date-fns';
import { School, Megaphone, ShieldCheck } from 'lucide-react';

interface AnnouncementTemplateProps {
  announcement: Announcement;
  schoolInfo: SchoolInfo | null;
}

export function AnnouncementTemplate({ announcement, schoolInfo }: AnnouncementTemplateProps) {
  const announcementDate = announcement.createdAt?.seconds 
    ? format(new Date(announcement.createdAt.seconds * 1000), 'PPP') 
    : 'N/A';

  return (
    <div className="printable-announcement-sheet bg-white text-slate-900 font-sans max-w-4xl mx-auto border-2 border-slate-900 rounded-lg p-6 md:p-8 print:border-none print:p-0 print:max-w-none shadow-md print:shadow-none select-text relative">
      {/* Background Crest Watermark */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] overflow-hidden select-none">
        <School className="w-[500px] h-[500px] text-slate-900" />
      </div>

      {/* Official Header */}
      <div className="border-b-2 border-slate-900 pb-4 mb-5">
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
                Phone: {schoolInfo?.phone || '+234 800 PROXIMA'} | Email: {schoolInfo?.email || 'admin@proximasms.com'}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="border-2 border-slate-900 px-3.5 py-1.5 rounded-md bg-slate-50 text-right">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">Office of the Registrar</span>
              <span className="text-base font-black uppercase tracking-wider text-slate-900 block">Official Circular</span>
              <span className="text-xs font-mono font-bold text-slate-700 block mt-0.5">
                Ref: SCH/CIR/{announcement.id?.substring(0, 6).toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Date & Metadata Bar */}
      <div className="flex justify-between items-center bg-slate-50 border border-slate-800 p-2.5 rounded-md text-xs mb-6">
        <div>
          <span className="text-slate-500 font-semibold uppercase text-[10px]">Date of Publication: </span>
          <span className="font-bold text-slate-900">{announcementDate}</span>
        </div>
        <div>
          <span className="text-slate-500 font-semibold uppercase text-[10px]">Circulation: </span>
          <span className="font-bold text-slate-900">All Parents, Guardians &amp; Faculty</span>
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-6">
        <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-slate-900 inline-block border-b-2 border-slate-900 pb-1">
          {announcement.title}
        </h2>
      </div>

      {/* Content */}
      <div className="space-y-4 text-sm leading-relaxed text-slate-800 mb-8 whitespace-pre-wrap text-justify">
        {announcement.content
          .split('\n')
          .filter((line: string) => line.trim() !== '')
          .map((line: string, index: number) => (
            <p key={index}>{line}</p>
          ))}
      </div>

      {/* Sign-off / Signature */}
      <div className="flex justify-end pt-6 mb-8">
        <div className="text-right space-y-1">
          <p className="font-bold text-sm text-slate-900">{announcement.authorName || 'School Administrator'}</p>
          <p className="text-xs font-medium text-slate-600">For: Central School Management</p>
          <div className="pt-2 flex items-center justify-end gap-1.5 text-[10px] font-mono text-emerald-700 font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>OFFICIALLY VERIFIED BROADCAST</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-slate-300 text-center text-xs text-slate-500">
        <p>This is an official administrative publication issued by {schoolInfo?.name || 'Proxima Academy'}.</p>
      </div>

      {/* Print CSS */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          body {
            background: white !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .printable-announcement-sheet {
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

export default AnnouncementTemplate;
