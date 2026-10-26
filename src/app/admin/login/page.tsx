'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLoginForm } from '@/components/auth/admin-login-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldAlert, GraduationCap, ArrowLeft } from 'lucide-react';
import { useRole } from '@/context/role-context';

export default function AdminLoginPage() {
  const { role, isLoading } = useRole();
  const router = useRouter();

  useEffect(() => {
    // Redirect if user is already authenticated
    if (!isLoading && role) {
      router.push('/dashboard');
    }
  }, [role, isLoading, router]);

  if (isLoading || role) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm space-y-4">
        
        <div className="text-center space-y-1 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary mx-auto flex items-center justify-center shadow-xs">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Administrative Portal
          </h1>
          <p className="text-xs text-muted-foreground">
            Sign in with your verified administrator credentials
          </p>
        </div>

        <Card className="shadow-sm border border-border">
          <CardHeader className="pb-4 pt-5 px-6">
            <CardTitle className="text-base font-semibold">
              Administrator Login
            </CardTitle>
            <CardDescription className="text-xs">
              Direct access for authorized executive and ICT staff.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <AdminLoginForm />
          </CardContent>
        </Card>

        <div className="text-center pt-2">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Unified Portal Login</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
