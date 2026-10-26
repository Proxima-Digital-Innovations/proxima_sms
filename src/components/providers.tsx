'use client';

import { RoleProvider } from '@/context/role-context';
import { ThemeProvider } from '@/context/theme-context';
import { MaintenanceProvider } from '@/context/maintenance-context';
import { LanguageProvider } from '@/context/language-context';
import { NavigationLoaderProvider } from '@/context/navigation-loader-context';
import { SessionProvider } from 'next-auth/react';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LanguageProvider>
        <ThemeProvider>
          <MaintenanceProvider>
            <RoleProvider>
              <NavigationLoaderProvider>
                {children}
              </NavigationLoaderProvider>
            </RoleProvider>
          </MaintenanceProvider>
        </ThemeProvider>
      </LanguageProvider>
    </SessionProvider>
  );
}
