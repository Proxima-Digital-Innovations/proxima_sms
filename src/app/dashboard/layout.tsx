
'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { DashboardHeader } from '@/components/dashboard/header';
import DashboardSidebar from '@/components/dashboard/sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useRole } from '@/context/role-context';
import { Loader2, ShieldAlert } from 'lucide-react';
import { MaintenanceBanner } from '@/components/maintenance-banner';
import { isPathAuthorized, navConfig } from '@/lib/auth-guard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SupportBot } from '@/components/dashboard/support-bot/SupportBot';
import { DynamicPageTitle } from '@/components/dashboard/dynamic-title';
import { checkLicenseStatus } from '@/actions/license-actions';
import { LicenseProvider } from '@/components/license/license-provider';

function AccessDenied() {
    const router = useRouter();
    return (
        <div className="flex flex-1 items-center justify-center h-full">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle className="flex items-center justify-center gap-2 text-3xl text-destructive">
                        <ShieldAlert className="h-8 w-8" />
                        Access Denied
                    </CardTitle>
                    <CardDescription>
                        You do not have the necessary permissions to view this page.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        The page you are trying to access is restricted to other user roles.
                    </p>
                    <Button onClick={() => router.push('/dashboard')} className="mt-6">
                        Return to Dashboard
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

const AuthLoader = () => (
    <div className="flex flex-1 items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
             <Loader2 className="h-8 w-8 animate-spin text-primary" />
             <p className="text-muted-foreground">Verifying permissions...</p>
        </div>
    </div>
);


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
      <div className="font-body h-screen flex flex-col">
        <style jsx global>{`
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .print-hidden {
              display: none !important;
            }
            main {
              margin: 0;
              padding: 0 !important;
              min-height: auto;
              overflow: visible !important;
            }
            body > div, 
            body > div > div, 
            body > div > div > div {
              display: block !important;
              height: auto !important;
              overflow: visible !important;
            }
          }
        `}</style>
         <DynamicPageTitle />
         {/* Solid clean background */}
         <div className="fixed inset-0 bg-slate-50 -z-10" />
         
         <div className="flex h-full overflow-hidden">
          <div className="print-hidden">
            <DashboardSidebar />
          </div>
          <div className="flex flex-1 flex-col overflow-y-auto lg:ml-72 relative">
              <div className="print-hidden sticky top-0 z-20 bg-white border-b border-gray-200">
                <MaintenanceBanner />
                <DashboardHeader />
              </div>
              <main className="flex-1 p-4 md:p-6 lg:p-8 flex flex-col max-w-7xl mx-auto w-full">
                {isCheckingAuth ? <AuthLoader /> : (isAuthorized ? children : <AccessDenied />)}
              </main>
          </div>
        </div>
        <SupportBot />
      </div>
    </SidebarProvider>
    </LicenseProvider>
  );
}
