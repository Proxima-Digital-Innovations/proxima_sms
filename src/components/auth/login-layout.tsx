'use client';

import React from 'react';
import {
  GraduationCap,
  ShieldCheck,
  BookOpen,
  Users,
  Lock,
  Building2,
  HelpCircle,
  FileText
} from 'lucide-react';

interface LoginLayoutProps {
  children: React.ReactNode;
  schoolName?: string;
  logo?: string;
  tagline?: string;
}

export function LoginLayout({
  children,
  schoolName = 'School Management Portal',
  logo,
  tagline = 'Academic & Administrative System',
}: LoginLayoutProps) {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-background text-foreground">
      
      {/* LEFT SIDE: INSTITUTIONAL IDENTITY PANEL (DESKTOP) */}
      <div className="hidden lg:flex lg:flex-1 relative flex-col justify-between p-10 xl:p-14 bg-slate-900 text-slate-100 border-r border-slate-800">
        
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }}
        />

        {/* 1. Header / School Masthead */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center p-2 shadow-sm">
              {logo ? (
                <img src={logo} alt={schoolName} className="w-full h-full object-contain" />
              ) : (
                <GraduationCap className="w-6 h-6 text-primary" />
              )}
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight text-white">
                {schoolName}
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                {tagline}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Institutional Portal</span>
          </div>
        </div>

        {/* 2. Value Proposition / Institutional Scope */}
        <div className="relative z-10 my-auto py-8 max-w-xl space-y-6">
          <div className="space-y-3">
            <h2 className="text-3xl xl:text-4xl font-bold tracking-tight text-white leading-tight">
              Unified Academic &amp; Administrative Management
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed font-normal">
              A centralized digital gateway connecting students, faculty, and administrators to coursework, academic records, and institutional services.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-primary shrink-0 mt-0.5">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-white">Academic Records &amp; Assessment</h3>
                <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                  Course registrations, continuous assessments, broadsheets, and degree audits in one verified system.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-primary shrink-0 mt-0.5">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-white">Faculty &amp; Virtual Classroom</h3>
                <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                  Digital course materials, lecture notes, interactive assignments, and live virtual classroom streaming.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-primary shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-white">Role-Based Access &amp; Governance</h3>
                <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                  Granular permissions for students, lecturers, bursary, HODs, and administrative leadership.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Footer info */}
        <div className="relative z-10 pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px]">256-Bit Encrypted Session</span>
          </div>
          <span className="text-[11px] text-slate-500">
            Institutional Edition &bull; &copy; {new Date().getFullYear()}
          </span>
        </div>

      </div>

      {/* RIGHT SIDE: AUTHENTICATION FORM */}
      <div className="w-full lg:w-[480px] xl:w-[520px] flex-shrink-0 flex flex-col justify-between p-6 sm:p-10 md:p-12 min-h-screen bg-card text-card-foreground">
        
        {/* Mobile Header (Hidden on Desktop) */}
        <div className="lg:hidden flex items-center gap-3 pb-6 border-b border-border mb-6">
          <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center p-2 shrink-0">
            {logo ? (
              <img src={logo} alt={schoolName} className="w-full h-full object-contain" />
            ) : (
              <GraduationCap className="w-5 h-5 text-primary" />
            )}
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground tracking-tight">{schoolName}</h2>
            <p className="text-xs text-muted-foreground">{tagline}</p>
          </div>
        </div>

        {/* Center Auth Card */}
        <div className="my-auto w-full max-w-sm mx-auto py-4">
          <div className="mb-6 space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Sign in
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Enter your institutional credentials to access your account.
            </p>
          </div>

          <div className="w-full">
            {children}
          </div>
        </div>

        {/* Footer Support Notice */}
        <div className="pt-6 mt-6 border-t border-border flex flex-col items-center space-y-2 text-center text-xs text-muted-foreground">
          <p className="text-[11px]">
            Need assistance logging in? Contact your institution&apos;s ICT Helpdesk or Student Affairs.
          </p>
        </div>

      </div>

    </div>
  );
}
