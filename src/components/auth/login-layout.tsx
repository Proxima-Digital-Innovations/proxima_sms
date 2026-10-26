'use client';

import React from 'react';
import { GraduationCap } from 'lucide-react';

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
  tagline,
}: LoginLayoutProps) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-muted/30 px-4 py-8 sm:py-12">
      
      {/* Brand Header */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center p-2 mb-3 shadow-xs">
          {logo ? (
            <img src={logo} alt={schoolName} className="w-full h-full object-contain" />
          ) : (
            <GraduationCap className="w-6 h-6 text-primary" />
          )}
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {schoolName}
        </h1>
        {tagline && (
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {tagline}
          </p>
        )}
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-sm sm:max-w-md bg-card text-card-foreground border border-border shadow-xs rounded-2xl p-6 sm:p-8">
        {children}
      </div>

      {/* Footer Support */}
      <div className="mt-6 text-center text-xs text-muted-foreground">
        <p>
          Need help? Contact your institution&apos;s administration or ICT desk.
        </p>
      </div>

    </div>
  );
}
