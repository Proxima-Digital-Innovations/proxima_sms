
'use client';

import type { Announcement, SchoolInfo } from '@/lib/schema';
import Image from 'next/image';
import { format } from 'date-fns';

interface AnnouncementTemplateProps {
  announcement: Announcement;
  schoolInfo: SchoolInfo | null;
}

export function AnnouncementTemplate({ announcement, schoolInfo }: AnnouncementTemplateProps) {
  const announcementDate = announcement.createdAt?.seconds 
    ? format(new Date(announcement.createdAt.seconds * 1000), 'PPP') 
    : 'N/A';
  
  const formatContent = (content: string) => {
    return content
      .split('\n')
      .filter(line => line.trim() !== '')
      .map((line, index) => `<p key=${index}>${line}</p>`)
      .join('');
  };

  return (
      <div className="bg-white text-black font-serif">
        <style jsx global>{`
            @media print {
              .printable-header-announcement, .printable-footer-announcement {
                position: fixed;
                width: 100%;
                left: 0;
                padding-left: 2rem;
                padding-right: 2rem;
                background-color: white;
              }
              .printable-header-announcement {
                top: 0;
              }
              .printable-footer-announcement {
                bottom: 0;
              }
              .printable-main-announcement {
                padding-top: 150px;
                padding-bottom: 50px;
              }
            }
        `}</style>
        
        <header className="printable-header-announcement p-8 text-center border-b-4 border-black pb-4">
            {schoolInfo?.logoUrl && (
              <div className="flex justify-center mb-4">
                <Image src={schoolInfo.logoUrl} alt="School Logo" width={250} height={60} className="h-20 w-auto object-contain" />
              </div>
            )}
            <h1 className="text-4xl font-bold" style={{color: "hsl(var(--primary))"}}>{schoolInfo?.name || 'School Name'}</h1>
            <p className="text-sm text-gray-600 mt-1">{schoolInfo?.address}</p>
        </header>

        <main className="printable-main-announcement p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold uppercase tracking-wider underline">Public Announcement</h2>
          </div>

          <div className="flex justify-between items-baseline mb-8 text-sm">
            <span><strong>Ref:</strong> SCHOOL/ANNC/{announcement.id.substring(0, 5).toUpperCase()}</span>
            <span><strong>Date:</strong> {announcementDate}</span>
          </div>
          
          <div className="space-y-4 text-base leading-relaxed">
            <h3 className="text-xl font-bold text-center mb-4">{announcement.title}</h3>
            
            <div 
              className="whitespace-pre-wrap text-justify space-y-4"
              dangerouslySetInnerHTML={{ __html: formatContent(announcement.content) }}
            />
          </div>

          <div className="mt-16 text-right">
             <p className="font-semibold">{announcement.authorName}</p>
             <p className="text-sm text-gray-700">For: Management</p>
          </div>
        </main>
        
         <footer className="printable-footer-announcement p-8 text-center text-xs text-gray-500 border-t pt-4">
            <p>Phone: {schoolInfo?.phone} | Email: {schoolInfo?.email}</p>
        </footer>
      </div>
  );
}
