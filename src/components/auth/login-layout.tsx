'use client';

import React from 'react';
import Image from 'next/image';
import {
  ShieldCheck,
  GraduationCap,
  Landmark,
  Layers,
  Sparkles,
  Lock,
  Cpu,
  CheckCircle2,
  Building,
  School,
  ExternalLink
} from 'lucide-react';

interface LoginLayoutProps {
  children: React.ReactNode;
  schoolName?: string;
  logo?: string;
  tagline?: string;
}

export function LoginLayout({
  children,
  schoolName = 'Proxima SMS',
  logo,
  tagline = 'Enterprise Institutional Management System',
}: LoginLayoutProps) {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-950 text-slate-100 overflow-x-hidden">
      
      {/* ============================================================== */}
      {/* LEFT SIDE: TIER-1 WORLD-CLASS ENTERPRISE HERO PANEL (DESKTOP)   */}
      {/* ============================================================== */}
      <div className="hidden lg:flex lg:flex-1 relative flex-col justify-between p-10 xl:p-14 overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 border-r border-slate-800/80">
        
        {/* Dynamic Ambient Mesh Lighting & Glows */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 -right-32 w-[32rem] h-[32rem] bg-blue-500/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Delicate Coordinate Grid Background Texture */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }}
        />

        {/* 1. TOP BRAND MASTHEAD & LIVE STATUS BADGE */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 p-0.5 shadow-xl shadow-indigo-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                {logo ? (
                  <img src={logo} alt={schoolName} className="w-7 h-7 object-contain" />
                ) : (
                  <GraduationCap className="w-6 h-6 text-indigo-400" />
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-wider text-white uppercase font-sans">
                  {schoolName}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-[10px] font-mono text-indigo-300 font-bold uppercase">
                  Enterprise
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium tracking-tight">
                Academic Governance &amp; Institutional ERP
              </p>
            </div>
          </div>

          {/* Real-time System Status Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/60 backdrop-blur-md shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-mono font-medium text-slate-300">
              OPERATIONAL &bull; 99.99% SLA
            </span>
          </div>
        </div>

        {/* 2. CENTERPIECE: INSTITUTIONAL VALUE & ARCHITECTURAL HIGHLIGHTS */}
        <div className="relative z-10 my-auto py-8 space-y-8 max-w-2xl">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500/10 via-blue-500/10 to-transparent border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Tier-1 Unified Educational Architecture
            </div>

            <h1 className="text-3xl xl:text-4xl 2xl:text-5xl font-black text-white tracking-tight leading-[1.15]">
              Architecting the Future of Academic Governance &amp; Financial Integrity.
            </h1>

            <p className="text-sm xl:text-base text-slate-300 font-normal leading-relaxed max-w-xl">
              A comprehensive institutional cloud orchestrating automated Senate broadsheets, double-entry payment vouchers, interactive continuous assessment LMS, and zero-trust biometric attendance.
            </p>
          </div>

          {/* 3 Luxury Glassmorphic Architecture Cards */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3.5 pt-2">
            
            {/* Card 1 */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl hover:bg-white/[0.06] transition-all hover:border-indigo-500/40 group">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 mb-3 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="font-bold text-white text-xs tracking-tight mb-1">
                Cryptographic Senate Seals
              </h3>
              <p className="text-[11px] text-slate-400 leading-normal">
                SHA-256 Merkle root batch seals, tamper-evident degree verification, and blind exam grading.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl hover:bg-white/[0.06] transition-all hover:border-emerald-500/40 group">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 mb-3 group-hover:scale-110 transition-transform">
                <Landmark className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="font-bold text-white text-xs tracking-tight mb-1">
                Double-Entry Disbursement
              </h3>
              <p className="text-[11px] text-slate-400 leading-normal">
                Multi-stage audit lifecycle (Create &rarr; Check &rarr; Verify &rarr; Approve &rarr; Post) balancing general ledger accounts.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl hover:bg-white/[0.06] transition-all hover:border-amber-500/40 group">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 mb-3 group-hover:scale-110 transition-transform">
                <Cpu className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="font-bold text-white text-xs tracking-tight mb-1">
                Digital LMS &amp; Audio Broadcasts
              </h3>
              <p className="text-[11px] text-slate-400 leading-normal">
                Course notes streaming, audio podcast lectures, online assignment submissions, and instant student clearance.
              </p>
            </div>

          </div>
        </div>

        {/* 3. BOTTOM FOOTER & COMPLIANCE BADGES */}
        <div className="relative z-10 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-slate-300">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              AES-256 TLS 1.3 ENCRYPTION
            </span>
            <span className="hidden xl:inline text-slate-600">&bull;</span>
            <span className="hidden xl:inline font-mono text-[11px] text-slate-300">
              CCMAS NUC 5.0 COMPLIANT
            </span>
          </div>

          <p className="text-[11px] text-slate-500 font-medium">
            &copy; {new Date().getFullYear()} Proxima Systems &bull; Enterprise Institutional Edition
          </p>
        </div>

      </div>

      {/* ============================================================== */}
      {/* RIGHT SIDE: PRECISION-ENGINEERED AUTHENTICATION DESK          */}
      {/* ============================================================== */}
      <div className="w-full lg:w-[480px] xl:w-[540px] 2xl:w-[580px] flex-shrink-0 flex flex-col justify-between p-6 sm:p-10 md:p-12 min-h-screen bg-slate-900/60 lg:bg-slate-950/40 backdrop-blur-2xl relative border-l border-slate-800/80">
        
        {/* Subtle radial ambient glow on the form container */}
        <div className="absolute top-1/4 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Mobile Masthead Header */}
        <div className="lg:hidden flex items-center justify-between pb-6 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <GraduationCap className="w-5 h-5 text-indigo-100" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-tight">{schoolName}</h2>
              <p className="text-xs text-slate-400">{tagline}</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold">
            Portal v2.6
          </span>
        </div>

        {/* Center Container */}
        <div className="my-auto w-full max-w-md mx-auto relative z-10 py-4">
          
          {/* Header Typography */}
          <div className="mb-6 space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold uppercase tracking-wider">
              <Lock className="w-3 h-3 text-indigo-400" />
              Authenticated Session Access
            </div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              Sign In
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 font-normal">
              Enter your institutional credentials, matriculation number, or staff ID to access your portal.
            </p>
          </div>

          {/* Form Injection with Glassmorphic Card Backing */}
          <div className="w-full bg-slate-900/90 border border-slate-800/90 shadow-2xl rounded-3xl p-6 sm:p-7 backdrop-blur-md">
            {children}
          </div>

        </div>

        {/* Footer Links & Regulatory Notice */}
        <div className="relative z-10 pt-6 mt-6 border-t border-slate-800/80 flex flex-col items-center space-y-3 w-full max-w-md mx-auto text-center">
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-slate-400 font-medium">
            <a href="#" className="hover:text-indigo-400 transition-colors">Privacy Protocol</a>
            <span className="text-slate-700">&bull;</span>
            <a href="#" className="hover:text-indigo-400 transition-colors">Terms of Governance</a>
            <span className="text-slate-700">&bull;</span>
            <a href="#" className="hover:text-indigo-400 transition-colors">Institutional Help Desk</a>
          </div>

          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Zero-Trust Enterprise Access Management &bull; Proxima Digital</span>
          </div>
        </div>

      </div>

    </div>
  );
}
