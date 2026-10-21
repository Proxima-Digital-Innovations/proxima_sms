'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { DashboardHeader } from '@/components/dashboard/header';
import DashboardSidebar from '@/components/dashboard/sidebar';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import { useRole } from '@/context/role-context';
import { useLanguage } from '@/context/language-context';
import { cn } from '@/lib/utils';
import { Loader2, ShieldAlert } from 'lucide-react';
import { MaintenanceBanner } from '@/components/maintenance-banner';
import { isPathAuthorized } from '@/lib/auth-guard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SupportBot } from '@/components/dashboard/support-bot/SupportBot';
import { ForcePasswordChangeModal } from '@/components/auth/force-password-change-modal';
import { DynamicPageTitle } from '@/components/dashboard/dynamic-title';
import { checkLicenseStatus } from '@/actions/license-actions';
import { LicenseProvider } from '@/components/license/license-provider';

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

function MainLayout({ children, isCheckingAuth, isAuthorized }: { children: React.ReactNode, isCheckingAuth: boolean, isAuthorized: boolean }) {
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
          "flex flex-1 flex-col overflow-y-auto overflow-x-hidden relative transition-all duration-300 ease-in-out min-w-0 print:ml-0 print:mr-0 print:w-full print:h-auto print:overflow-visible print:bg-white",
          marginClass
        )}
      >
          <div className="print-hidden sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
            <MaintenanceBanner />
            <DashboardHeader />
          </div>
          <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 flex flex-col max-w-7xl mx-auto w-full print:p-0 print:m-0 print:block min-w-0 overflow-x-hidden">
            {isCheckingAuth ? <AuthLoader /> : (isAuthorized ? children : <AccessDenied />)}
          </main>
      </div>
    </div>
  );
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role, rbacPermissions, isLoading: isRoleLoading } = useRole();
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    if (isRoleLoading) return;

    if (!role) {
      router.push('/');
      return;
    }

    const authorized = isPathAuthorized(pathname, role, rbacPermissions);
    setIsAuthorized(authorized);
    setIsCheckingAuth(false);
    
  }, [role, rbacPermissions, isRoleLoading, router, pathname]);

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
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background gap-4">
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
      <div className="font-body h-screen flex flex-col print:h-auto print:overflow-visible">
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
         
         <MainLayout isCheckingAuth={isCheckingAuth} isAuthorized={isAuthorized}>
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
