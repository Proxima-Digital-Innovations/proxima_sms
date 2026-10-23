'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { DashboardHeader } from '@/components/dashboard/header';
import DashboardSidebar from '@/components/dashboard/sidebar';
import { MobileBottomNav } from '@/components/dashboard/mobile-bottom-nav';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import { useRole } from '@/context/role-context';
import { useLanguage } from '@/context/language-context';
import { cn } from '@/lib/utils';
import { Loader2, ShieldAlert, Layers } from 'lucide-react';
import { MaintenanceBanner } from '@/components/maintenance-banner';
import { isPathAuthorized, navConfig, ROUTE_MODULE_MAP } from '@/lib/auth-guard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SupportBot } from '@/components/dashboard/support-bot/SupportBot';
import { ForcePasswordChangeModal } from '@/components/auth/force-password-change-modal';
import { DynamicPageTitle } from '@/components/dashboard/dynamic-title';
import { checkLicenseStatus } from '@/actions/license-actions';
import { LicenseProvider } from '@/components/license/license-provider';

function ModuleDisabledNotice({ moduleName }: { moduleName: string }) {
    const router = useRouter();
    return (
        <div className="flex flex-1 items-center justify-center h-full p-4">
            <Card className="w-full max-w-md text-center border-amber-500/30 bg-card shadow-xl">
                <CardHeader>
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 mx-auto mb-2">
                        <Layers className="h-7 w-7 text-amber-600" />
                    </div>
                    <CardTitle className="text-xl font-bold text-foreground">
                        Module Deactivated
                    </CardTitle>
                    <CardDescription className="text-sm mt-1">
                        The <span className="font-semibold text-foreground">{moduleName}</span> module is currently disabled by institution administrators.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Workflows and navigation links for this module are cleanly hidden to prevent system bloating. You can re-enable this domain at any time in Module Settings.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                        <Button onClick={() => router.push('/dashboard')} variant="default" className="text-xs">
                            Return to Dashboard
                        </Button>
                        <Button onClick={() => router.push('/dashboard/system/modules')} variant="outline" className="text-xs border-amber-500/30">
                            Module Settings
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function AccessDenied() {
    const router = useRouter();
    const { language } = useLanguage();
    return (
        <div className="flex flex-1 items-center justify-center h-full">
            <Card className="w-full max-w-md text-center rounded-2xl shadow-lg border-border">
                <CardHeader>
                    <CardTitle className="flex items-center justify-center gap-2 text-2xl font-bold text-destructive">
                        <ShieldAlert className="h-7 w-7" />
                        {language === 'ar' ? 'غير مصرح بالوصول' : 'Access Denied'}
                    </CardTitle>
                    <CardDescription>
                        {language === 'ar' 
                            ? 'ليس لديك الصلاحيات الكافية للوصول إلى هذه الصفحة أو هذا القسم.' 
                            : 'You do not have the necessary permissions to view this page.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        {language === 'ar'
                            ? 'هذه الصفحة مخصصة لأدوار أخرى ضمن إدارة المدرسة.'
                            : 'The page you are trying to access is restricted to other user roles.'}
                    </p>
                    <Button onClick={() => router.push('/dashboard')} className="mt-6 rounded-xl">
                        {language === 'ar' ? 'العودة للوحة التحكم' : 'Return to Dashboard'}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

const AuthLoader = () => {
    const { language } = useLanguage();
    return (
        <div className="flex flex-1 items-center justify-center h-full">
            <div className="flex flex-col items-center gap-4">
                 <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 <p className="text-muted-foreground text-sm font-medium">
                    {language === 'ar' ? 'جاري التحقق من الصلاحيات...' : 'Verifying permissions...'}
                 </p>
            </div>
        </div>
    );
};

function MainLayout({ 
  children, 
  isCheckingAuth, 
  isAuthorized,
  disabledModuleName
}: { 
  children: React.ReactNode; 
  isCheckingAuth: boolean; 
  isAuthorized: boolean; 
  disabledModuleName: string | null;
}) {
  const { state } = useSidebar();
  const { isRtl } = useLanguage();
  const isCollapsed = state === "collapsed";

  const marginClass = isRtl
    ? (isCollapsed ? "lg:mr-[80px]" : "lg:mr-[270px]")
    : (isCollapsed ? "lg:ml-[80px]" : "lg:ml-[270px]");

  return (
    <div className="flex h-full overflow-hidden print:h-auto print:overflow-visible">
      <div className="print-hidden">
        <DashboardSidebar />
      </div>
      <div 
        className={cn(
          "flex flex-1 flex-col overflow-y-auto overflow-x-hidden relative transition-all duration-300 ease-in-out min-w-0 bg-slate-50/70 dark:bg-slate-950 print:ml-0 print:mr-0 print:w-full print:h-auto print:overflow-visible print:bg-white",
          marginClass
        )}
      >
          <div className="print-hidden sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
            <MaintenanceBanner />
            <DashboardHeader />
          </div>
          <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 pb-24 lg:pb-8 flex flex-col w-full print:p-0 print:m-0 print:block min-w-0 overflow-x-hidden">
            {isCheckingAuth ? (
              <AuthLoader />
            ) : disabledModuleName ? (
              <ModuleDisabledNotice moduleName={disabledModuleName} />
            ) : isAuthorized ? (
              children
            ) : (
              <AccessDenied />
            )}
          </main>
          <MobileBottomNav />
      </div>
    </div>
  );
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role, rbacPermissions, activeModules, isLoading: isRoleLoading } = useRole();
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [disabledModuleName, setDisabledModuleName] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    if (isRoleLoading) return;

    if (!role) {
      router.push('/');
      return;
    }

    const matchingModule = ROUTE_MODULE_MAP.find(m => pathname === m.prefix || pathname.startsWith(m.prefix + '/'));
    if (matchingModule && activeModules && activeModules.length > 0 && !activeModules.includes(matchingModule.module) && pathname !== '/dashboard/system/modules') {
      setIsAuthorized(false);
      setDisabledModuleName(matchingModule.label);
      setIsCheckingAuth(false);
      return;
    }

    setDisabledModuleName(null);
    const authorized = isPathAuthorized(pathname, role, rbacPermissions, activeModules);
    if (!authorized && pathname !== '/dashboard') {
      router.replace('/dashboard');
      return;
    }
    setIsAuthorized(authorized);
    setIsCheckingAuth(false);
    
  }, [role, rbacPermissions, activeModules, isRoleLoading, router, pathname]);

  const [licenseStatus, setLicenseStatus] = useState<any>('ACTIVE');
  const [licenseMessage, setLicenseMessage] = useState<string>('');
  
  useEffect(() => {
    async function checkLicense() {
      try {
        const res = await checkLicenseStatus();
        setLicenseStatus(res.status);
        setLicenseMessage(res.message);
      } catch (e) {
        console.error('Failed to check license status', e);
      }
    }
    checkLicense();
  }, []);

  if (isRoleLoading || !role) {
    return (
      <div className="flex h-[100dvh] w-full flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div className="text-center space-y-1">
            <h2 className="text-xl font-semibold text-foreground">Loading Portal...</h2>
            <p className="text-muted-foreground">Please wait a moment.</p>
        </div>
      </div>
    );
  }

  return (
    <LicenseProvider status={licenseStatus} message={licenseMessage}>
      <SidebarProvider>
      <div className="font-body h-[100dvh] flex flex-col print:h-auto print:overflow-visible">
        <style jsx global>{`
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .print-hidden {
              display: none !important;
            }
            @page {
              margin: 0;
            }
          }
        `}</style>
         <DynamicPageTitle />
         
         <MainLayout isCheckingAuth={isCheckingAuth} isAuthorized={isAuthorized} disabledModuleName={disabledModuleName}>
           {children}
         </MainLayout>
        <div className="print-hidden">
          <SupportBot />
        </div>
        <ForcePasswordChangeModal />
      </div>
    </SidebarProvider>
    </LicenseProvider>
  );
}
