'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useInactivityTimeout } from '@/hooks/useInactivityTimeout';
import { useSession, signOut } from 'next-auth/react';

type RoleContextType = {
  user: any;
  role: string | null;
  activeModules: string[];
  rbacPermissions: string[];
  requiresPasswordChange: boolean;
  setRole: (role: string) => void;
  setActiveModules: (modules: string[]) => void;
  logout: () => void;
  isLoading: boolean;
};

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session, status } = useSession();
  const [role, setRoleState] = useState<string | null>(null);
  const [activeModulesState, setActiveModulesState] = useState<string[]>([]);
  const router = useRouter();
  const { toast } = useToast();

  const isLoading = status === 'loading';
  const currentRole = (session?.user as any)?.role || role;

  // Sync live institutional modules on mount
  useEffect(() => {
    async function loadLiveModules() {
      try {
        const { getInstitutionalModulesAction } = await import('@/actions/module-actions');
        const res = await getInstitutionalModulesAction();
        if (res.success && res.activeModules) {
          setActiveModulesState(res.activeModules);
        }
      } catch (e) {
        console.warn('Could not sync institutional modules:', e);
      }
    }
    loadLiveModules();
  }, []);

  const setActiveModules = useCallback((modules: string[]) => {
    setActiveModulesState(modules);
  }, []);

  const logout = useCallback(async (options?: { silent?: boolean }) => {
    try {
      await signOut({ callbackUrl: '/login', redirect: !options?.silent as any });
      if (options?.silent) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Failed to log out', error);
    }
  }, [router]);

  useInactivityTimeout(() => {
    if (!session?.user) return;
    toast({
      title: 'Session Expired',
      description: 'You have been logged out after 15 minutes of inactivity.',
      variant: 'destructive',
    });
    logout({ silent: true });
  }, 15 * 60 * 1000); // 15 minutes of inactivity

  useEffect(() => {
    if (session?.user) {
      setRoleState(session.user.role as string);
    } else if (status === 'unauthenticated') {
      setRoleState(null);
    }
  }, [session, status]);

  const setRole = useCallback((newRole: string) => {
    setRoleState(newRole);
  }, []);

  const effectiveActiveModules = activeModulesState.length > 0 
    ? activeModulesState 
    : ((session?.user as any)?.activeModules || []);

  return (
    <RoleContext.Provider
      value={{
        user: session?.user || null,
        role: currentRole,
        activeModules: effectiveActiveModules,
        rbacPermissions: (session?.user as any)?.rbacPermissions || [],
        requiresPasswordChange: (session?.user as any)?.requiresPasswordChange || false,
        setRole,
        setActiveModules,
        logout,
        isLoading,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};
