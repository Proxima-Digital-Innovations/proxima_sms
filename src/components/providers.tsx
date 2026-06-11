'use client';

import { RoleProvider } from '@/context/role-context';
import { ThemeProvider } from '@/context/theme-context';
import { MaintenanceProvider } from '@/context/maintenance-context';
import { SessionProvider } from 'next-auth/react';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <MaintenanceProvider>
          <RoleProvider>
            {children}
          </RoleProvider>
        </MaintenanceProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
