
'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useInactivityTimeout } from '@/hooks/useInactivityTimeout';
import { useSession, signOut } from 'next-auth/react';

type RoleContextType = {
  user: any;
  role: string | null;
  setRole: (role: string) => void;
  logout: () => void;
  isLoading: boolean;
};

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session, status } = useSession();
  const [role, setRoleState] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const isLoading = status === 'loading';

  const logout = useCallback(async (options?: { silent?: boolean }) => {
    try {
      // Cast redirect boolean value to any to bypass strict overload check in next-auth signOut
      await signOut({ redirect: !options?.silent as any });
      if (options?.silent) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Failed to log out', error);
    }
  }, [router]);

  useInactivityTimeout(() => {
    toast({
      title: 'Session Expired',
      description: 'You have been logged out due to inactivity.',
    });
    logout({ silent: true });
  }, 3600000); // 1 hour

  useEffect(() => {
    if (session?.user) {
      setRoleState(session.user.role as string);
    } else if (status === 'unauthenticated') {
      setRoleState(null);
    }
  }, [session, status]);

  const setRole = useCallback((newRole: string) => {
    // In Auth.js, we don't usually manually set the role on the client like this
    // but we'll keep the state sync for legacy components
    setRoleState(newRole);
  }, []);

  return (
    <RoleContext.Provider value={{ user: session?.user || null, role, setRole, logout, isLoading }}>
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
