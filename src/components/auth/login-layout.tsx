
import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { School, CheckCircle2 } from 'lucide-react';

interface LoginLayoutProps {
  children: React.ReactNode;
  schoolName?: string;
  logo?: string;
  tagline?: string;
}

export function LoginLayout({
  children,
  schoolName = 'Proxima One',
  logo,
  tagline,
}: LoginLayoutProps) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center relative bg-slate-50 p-4 sm:p-8 overflow-hidden sm:overflow-y-auto">
      {/* Dynamic Grid Background */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.4]"
        style={{
          backgroundImage: 'linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)',
          backgroundSize: '4rem 4rem',
          maskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, #000 70%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, #000 70%, transparent 100%)',
        }}
      />
      
      {/* Decorative Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md p-8 sm:p-12 bg-white/80 backdrop-blur-xl sm:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 sm:border-slate-200/60">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-6 mb-8">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 relative overflow-hidden">
            {logo ? (
              <Image src={logo} alt={schoolName} fill className="object-contain p-2" />
            ) : (
              <School className="text-indigo-600 w-8 h-8" />
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">{schoolName}</h2>
            {tagline && <p className="text-sm font-medium text-slate-500 mt-1">{tagline}</p>}
          </div>
        </div>

        {/* Form Container */}
        <div className="w-full">
          {children}
        </div>

        {/* Footer */}
        <div className="flex flex-col items-center space-y-4 pt-8 mt-8 border-t border-slate-100">
          <div className="flex justify-center gap-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
             <span className="hover:text-slate-900 cursor-pointer transition-colors">Privacy</span>
             <span className="hover:text-slate-900 cursor-pointer transition-colors">Terms</span>
             <span className="hover:text-slate-900 cursor-pointer transition-colors">Help</span>
          </div>
          <p className="text-[11px] text-slate-400 text-center font-medium">
            Powered by Proxima Digital Innovation
          </p>
        </div>

      </div>
    </div>
  );
}
