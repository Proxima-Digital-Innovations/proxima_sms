import type { Metadata } from 'next';
import './globals.css';
import { AppProviders } from '@/components/providers';
import { Toaster } from '@/components/ui/toaster';
import { NavigationProgress } from '@/components/navigation-progress';
import { Analytics } from "@vercel/analytics/react"
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: {
    template: "%s | Proxima SMS",
    default: "Proxima SMS Dashboard",
  },
  description: "Global Oversight and School Management System",
};

import { Poppins } from 'next/font/google';

const poppins = Poppins({ 
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-poppins',
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  // License check for single-tenant ownership
  const systemProfile = await prisma.systemProfile.findFirst();

  if (systemProfile) {
    const isExpired = systemProfile.expiresAt ? new Date() > systemProfile.expiresAt : false;
    const isSuspended = systemProfile.licenseStatus === 'SUSPENDED';
    const isLicenseExpiredStatus = systemProfile.licenseStatus === 'EXPIRED';

    if (isExpired || isSuspended || isLicenseExpiredStatus) {
      redirect(`/license-expired?school=${encodeURIComponent(systemProfile.name)}`);
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.variable} font-body antialiased`}>
        <AppProviders>
          <NavigationProgress />
          {children}
          <Toaster />
        </AppProviders>
        <Analytics />
      </body>
    </html>
  );
}
