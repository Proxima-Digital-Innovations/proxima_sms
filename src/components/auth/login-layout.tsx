import React from 'react';
import Image from 'next/image';
import { School, CheckCircle2, Quote } from 'lucide-react';

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
  tagline,
}: LoginLayoutProps) {
  return (
    <div className="h-screen w-full flex overflow-hidden bg-background">
      {/* LEFT SIDE: BRANDING & VISUALS */}
      <div className="hidden lg:flex lg:flex-1 relative bg-slate-900 h-full overflow-hidden">
        <Image 
          src="/auth-bg.jpg" 
          alt="School Management Graphic" 
          fill 
          priority
          className="object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-slate-900/10 mix-blend-multiply" />
      </div>

      {/* RIGHT SIDE: AUTHENTICATION FORM */}
      <div className="w-full lg:w-[480px] xl:w-[560px] flex-shrink-0 flex flex-col items-center justify-center p-4 sm:p-8 h-full overflow-y-auto bg-background shadow-2xl z-10">
        
        {/* Mobile Branding */}
        <div className="lg:hidden flex flex-col items-center text-center space-y-3 mb-6">
          <div className="w-12 h-12 bg-card rounded-lg flex items-center justify-center shadow-sm border border-border">
            {logo ? (
              <Image src={logo} alt={schoolName} width={32} height={32} className="object-contain" />
            ) : (
              <School className="text-primary w-6 h-6" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">{schoolName}</h2>
            {tagline && <p className="text-xs font-medium text-muted-foreground mt-1">{tagline}</p>}
          </div>
        </div>

        <div className="w-full max-w-md bg-card text-card-foreground p-6 sm:p-8 rounded-xl shadow-sm border border-border relative z-20">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-foreground tracking-tight">Sign In</h3>
            <p className="text-sm text-muted-foreground mt-1">Enter your credentials to access your portal</p>
          </div>

          {/* Form Container */}
          <div className="w-full">
            {children}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex flex-col items-center space-y-3 w-full max-w-md">
          <div className="flex justify-center gap-4 text-xs font-medium text-muted-foreground">
             <span className="hover:text-foreground cursor-pointer transition-colors">Privacy Policy</span>
             <span className="hover:text-foreground cursor-pointer transition-colors">Terms of Service</span>
             <span className="hover:text-foreground cursor-pointer transition-colors">Help Center</span>
          </div>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            Powered by Proxima Digital
          </p>
        </div>

      </div>
    </div>
  );
}
