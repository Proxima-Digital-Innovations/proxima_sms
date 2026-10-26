'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  identifier: z.string().trim().min(1, { message: 'Enter your email, staff ID, or matric number.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
  rememberMe: z.boolean().default(false),
});

const DEMO_PERSONAS = [
  { label: 'Admin', id: 'admin@proximahub.com', pass: 'password123' },
  { label: 'Lecturer', id: 'aliyu.sani@proxima.edu.ng', pass: 'password123' },
  { label: 'Teacher', id: 'teacher@proximahub.com', pass: 'password123' },
  { label: 'Student (Tertiary)', id: 'U2025/CSC/001', pass: 'password123' },
  { label: 'Student (Basic)', id: 'student1@school.edu', pass: 'password123' },
  { label: 'Parent', id: 'parent@proximahub.com', pass: 'password123' },
  { label: 'Finance', id: 'finance@proximahub.com', pass: 'password123' },
  { label: 'HOD', id: 'hod@proxima.com', pass: 'password123' },
  { label: 'Exam Officer', id: 'exam@proxima.com', pass: 'password123' },
];

export function LoginForm({ schoolSlug }: { schoolSlug?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || (schoolSlug ? `/${schoolSlug}/dashboard` : '/dashboard');
  const { toast } = useToast();

  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);

  const urlIdentifier = searchParams.get('identifier') || searchParams.get('email') || '';
  const urlPassword = searchParams.get('password') || (urlIdentifier ? 'password123' : '');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      identifier: urlIdentifier,
      password: urlPassword,
      rememberMe: false,
    },
  });

  useEffect(() => {
    if (urlIdentifier) {
      form.setValue('identifier', urlIdentifier);
      if (urlPassword) {
        form.setValue('password', urlPassword);
      }
    }
  }, [urlIdentifier, urlPassword, form]);

  const applyPersona = (id: string, pass: string) => {
    setError(null);
    form.setValue('identifier', id, { shouldValidate: true });
    form.setValue('password', pass, { shouldValidate: true });
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await signIn('credentials', {
        identifier: values.identifier,
        password: values.password,
        rememberMe: values.rememberMe ? 'true' : 'false',
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid credentials. Please verify your details.');
        setIsSubmitting(false);
        return;
      }

      toast({
        title: 'Signed in successfully',
        description: 'Redirecting to your dashboard...',
      });

      const defaultDashboard = schoolSlug ? `/${schoolSlug}/dashboard` : '/dashboard';
      const idLower = values.identifier.toLowerCase();
      const isSuperAdminLogin = idLower.startsWith('admin@');
      const destination = isSuperAdminLogin ? callbackUrl : defaultDashboard;

      router.push(destination);
      router.refresh();
    } catch {
      setError('Connection error. Please try again.');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      {error && (
        <Alert variant="destructive" className="py-2.5 px-3 rounded-lg">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <AlertDescription className="text-xs font-medium ml-2">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          
          {/* Identifier Input */}
          <FormField
            control={form.control}
            name="identifier"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel htmlFor="login-identifier" className="text-xs font-medium text-foreground">
                  Email or ID Number
                </FormLabel>
                <FormControl>
                  <Input
                    id="login-identifier"
                    placeholder="e.g. matric number, staff ID, or email"
                    autoComplete="username"
                    autoFocus
                    {...field}
                    className="h-10 text-sm bg-background border-input"
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          {/* Password Input */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <FormLabel htmlFor="login-password" className="text-xs font-medium text-foreground">
                    Password
                  </FormLabel>
                  <button
                    type="button"
                    onClick={() => setIsForgotOpen(true)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <FormControl>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      {...field}
                      className="h-10 text-sm pr-10 bg-background border-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          {/* Remember Me Checkbox */}
          <FormField
            control={form.control}
            name="rememberMe"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2 space-y-0 pt-1">
                <FormControl>
                  <Checkbox
                    id="remember-me"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel htmlFor="remember-me" className="text-xs text-muted-foreground font-normal cursor-pointer select-none">
                  Remember this device
                </FormLabel>
              </FormItem>
            )}
          />

          {/* Submit Action */}
          <Button
            type="submit"
            className="w-full h-10 font-medium text-sm mt-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Signing in...</span>
              </div>
            ) : (
              'Sign in'
            )}
          </Button>

          {/* Optional Test Accounts Toggle */}
          <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>Demo or test access?</span>
            <button
              type="button"
              onClick={() => setShowDemoAccounts(!showDemoAccounts)}
              className="inline-flex items-center gap-1 hover:text-foreground transition-colors font-medium"
            >
              <span>Test Accounts</span>
              {showDemoAccounts ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showDemoAccounts && (
            <div className="pt-2 grid grid-cols-3 gap-1.5 animate-in fade-in duration-100">
              {DEMO_PERSONAS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPersona(p.id, p.pass)}
                  className="px-2 py-1.5 rounded-md border border-border bg-muted/40 hover:bg-muted text-xs text-left truncate transition-colors"
                  title={`${p.label} (${p.id})`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

        </form>
      </Form>

      {/* Forgot Password Dialog */}
      <Dialog open={isForgotOpen} onOpenChange={setIsForgotOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Password Reset
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Institutional account recovery
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm text-muted-foreground leading-relaxed">
            <p>
              To reset your password, contact your school administrator or ICT helpdesk with your verified ID card or matriculation number.
            </p>
            <div className="text-xs space-y-1">
              <div>&bull; <strong>Students:</strong> Contact Student Affairs or Examination Office.</div>
              <div>&bull; <strong>Staff / Faculty:</strong> Contact ICT or Human Resources.</div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsForgotOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
