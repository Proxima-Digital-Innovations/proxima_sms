
import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LoginLayoutProps {
  children: React.ReactNode;
  schoolName?: string;
  logo?: string;
  tagline?: string;
}

export function LoginLayout({
  children,
  schoolName = 'Proxima Hub',
  logo,
  tagline,
}: LoginLayoutProps) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f8fafc] p-6">
      <div className="w-full max-w-md space-y-8 animate-in fade-in duration-500">
        {/* Simple Header */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-20 h-20 relative flex items-center justify-center bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
             {logo ? (
               <Image src={logo} alt={schoolName} fill className="object-contain p-3" />
             ) : (
               <div className="text-3xl font-bold text-slate-900">PH</div>
             )}
          </div>
          
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {schoolName}
            </h1>
            {tagline && (
              <p className="text-slate-500 text-sm font-medium">
                {tagline}
              </p>
            )}
          </div>
        </div>

        {/* Form Container (Clean, no glassmorphism) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          {children}
        </div>

        {/* Simple Footer */}
        <div className="flex flex-col items-center space-y-4">
          <div className="flex justify-center gap-6 text-xs font-semibold text-slate-400 uppercase tracking-widest">
             <span className="hover:text-slate-600 cursor-pointer transition-colors">Privacy</span>
             <span className="hover:text-slate-600 cursor-pointer transition-colors">Terms</span>
             <span className="hover:text-slate-600 cursor-pointer transition-colors">Help</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">
            © {new Date().getFullYear()} Proxima Hub. Secure Multi-Tenant Architecture.
          </p>
        </div>
      </div>
    </div>
  );
}
