import type { Metadata } from 'next';
import './globals.css';
import { AppProviders } from '@/components/providers';
import { Toaster } from '@/components/ui/toaster';
import { Analytics } from "@vercel/analytics/react"
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { Poppins, Cairo } from 'next/font/google';

export const metadata: Metadata = {
  title: {
    template: "%s | Proxima SMS",
    default: "Proxima SMS Dashboard",
  },
  description: "Global Oversight and School Management System",
};

const poppins = Poppins({ 
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-poppins',
});

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-cairo',
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
      <body className={`${poppins.variable} ${cairo.variable} font-body antialiased`}>
        <AppProviders>
          {children}
          <Toaster />
        </AppProviders>
        {process.env.VERCEL && <Analytics />}
      </body>
    </html>
  );
}
