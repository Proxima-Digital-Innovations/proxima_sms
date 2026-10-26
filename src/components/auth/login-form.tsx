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
  Lock,
  User,
  ArrowRight,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Info
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
  identifier: z.string().trim().min(1, { message: 'Please enter your email, matric number, or staff code.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
  rememberMe: z.boolean().default(false),
});

// Discreet sample personas for testing / evaluation environments
const DEMO_PERSONAS = [
  { label: 'Super Admin', role: 'System Admin', id: 'admin@proximahub.com', pass: 'password123' },
  { label: 'Parent / Guardian', role: 'Guardian Portal', id: 'parent@proximahub.com', pass: 'password123' },
  { label: 'Tertiary Lecturer', role: 'Faculty / TIMS', id: 'aliyu.sani@proxima.edu.ng', pass: 'password123' },
  { label: 'Secondary Teacher', role: 'K-12 Educator', id: 'teacher@proximahub.com', pass: 'password123' },
  { label: 'Tertiary Student', role: 'Undergraduate', id: 'U2025/CSC/001', pass: 'password123' },
  { label: 'Secondary Student', role: 'Basic Student', id: 'student1@school.edu', pass: 'password123' },
  { label: 'Bursar / Finance', role: 'Treasury & Bursary', id: 'finance@proximahub.com', pass: 'password123' },
  { label: 'HOD / Senate', role: 'Department Head', id: 'hod@proxima.com', pass: 'password123' },
  { label: 'Exam Officer', role: 'Grading & Exams', id: 'exam@proxima.com', pass: 'password123' },
];

export function LoginForm({ schoolSlug }: { schoolSlug?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || (schoolSlug ? `/${schoolSlug}/dashboard` : '/dashboard');
  const { toast } = useToast();

  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDemoDrawer, setShowDemoDrawer] = useState(false);
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
        setError('Invalid credentials. Please verify your identifier and password.');
        setIsSubmitting(false);
        return;
      }

      toast({
        title: 'Authentication Successful',
        description: 'Redirecting to your dashboard...',
      });

      const defaultDashboard = schoolSlug ? `/${schoolSlug}/dashboard` : '/dashboard';
      const idLower = values.identifier.toLowerCase();
      const isSuperAdminLogin = idLower.startsWith('admin@');
      const destination = isSuperAdminLogin ? callbackUrl : defaultDashboard;

      router.push(destination);
      router.refresh();
    } catch {
      setError('An unexpected connection error occurred. Please try again.');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="py-2.5 px-3 rounded-xl border border-destructive/30">
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
          <AlertDescription className="text-xs font-medium ml-2">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Authentication Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          
          {/* Identifier Input */}
          <FormField
            control={form.control}
            name="identifier"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel htmlFor="login-identifier" className="text-xs font-semibold text-foreground">
                  Institutional Identifier
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <User className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      id="login-identifier"
                      placeholder="Email, Staff ID, or Matric Number"
                      autoComplete="username"
                      autoFocus
                      {...field}
                      className="h-10 pl-9 pr-3 rounded-xl text-xs font-medium bg-background border-input focus-visible:ring-2 focus-visible:ring-primary/20"
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-[11px]" />
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
                  <FormLabel htmlFor="login-password" className="text-xs font-semibold text-foreground">
                    Password
                  </FormLabel>
                  <button
                    type="button"
                    onClick={() => setIsForgotOpen(true)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <FormControl>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      {...field}
                      className="h-10 pl-9 pr-10 rounded-xl text-xs font-medium bg-background border-input focus-visible:ring-2 focus-visible:ring-primary/20"
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
                <FormMessage className="text-[11px]" />
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
                  Keep me signed in on this device
                </FormLabel>
              </FormItem>
            )}
          />

          {/* Submit Action */}
          <Button
            type="submit"
            className="w-full h-10 rounded-xl font-semibold shadow-xs transition-all flex items-center justify-center gap-2 mt-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>

          {/* Discreet Evaluation Personas Drawer */}
          <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
            <span className="text-[11px] text-muted-foreground">Evaluation or testing?</span>
            <button
              type="button"
              onClick={() => setShowDemoDrawer(!showDemoDrawer)}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              <span>Test Accounts</span>
              {showDemoDrawer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {showDemoDrawer && (
            <div className="space-y-2 pt-1 animate-in fade-in duration-150">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {DEMO_PERSONAS.map((p) => {
                  const isCurrent = form.watch('identifier') === p.id;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => applyPersona(p.id, p.pass)}
                      className={`p-2 rounded-lg text-left border transition-all text-xs ${
                        isCurrent
                          ? 'bg-primary/10 border-primary text-foreground font-semibold shadow-xs'
                          : 'bg-muted/40 hover:bg-muted border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span className="block font-medium text-[11px] truncate">{p.label}</span>
                      <span className="block text-[10px] text-muted-foreground truncate">{p.role}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </form>
      </Form>

      {/* Forgot Password Help Dialog */}
      <Dialog open={isForgotOpen} onOpenChange={setIsForgotOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <HelpCircle className="w-4 h-4 text-primary" />
              Password Reset Assistance
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Institutional security protocol for account recovery.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs text-muted-foreground leading-relaxed">
            <div className="p-3 bg-muted/50 rounded-xl border border-border flex items-start gap-2.5 text-foreground">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs leading-normal">
                To protect student records and institutional finances, password resets must be verified through your authorized institutional administrator.
              </p>
            </div>

            <div className="space-y-1.5">
              <h4 className="font-semibold text-foreground">Next Steps:</h4>
              <ul className="list-disc pl-4 space-y-1 text-xs">
                <li><strong>Students:</strong> Contact your departmental exam officer or student affairs helpdesk with your matriculation number.</li>
                <li><strong>Faculty &amp; Staff:</strong> Contact the ICT Directorate or HR department for an administrative credential reset.</li>
              </ul>
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
