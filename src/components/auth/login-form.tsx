'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useState, useEffect } from 'react';
import {
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  UserCheck,
  Fingerprint,
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
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
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

const formSchema = z.object({
  identifier: z.string().min(1, { message: 'Enter your institutional email, matric number, admission ID, or staff code.' }),
  password: z.string().min(1, { message: 'Security password is required.' }),
  rememberMe: z.boolean().default(false),
});

// Optional collapsible test accounts for evaluation
const DEMO_PERSONAS = [
  { label: 'Super Admin', role: 'Executive Oversight', id: 'admin@proximahub.com', pass: 'password123' },
  { label: 'Parent / Guardian', role: 'Family & Wallet Portal', id: 'parent@proximahub.com', pass: 'password123' },
  { label: 'Tertiary Lecturer', role: 'University Faculty (TIMS)', id: 'aliyu.sani@proxima.edu.ng', pass: 'password123' },
  { label: 'Secondary Teacher', role: 'K-12 / Basic Educator', id: 'teacher@proximahub.com', pass: 'password123' },
  { label: 'Tertiary Student', role: 'University Undergrad', id: 'U2025/CSC/001', pass: 'password123' },
  { label: 'Secondary Student', role: 'High School Student', id: 'student1@school.edu', pass: 'password123' },
  { label: 'Bursar / Finance', role: 'Treasury & Clearance', id: 'finance@proximahub.com', pass: 'password123' },
  { label: 'HOD / Senate', role: 'Department & Senate', id: 'hod@proxima.com', pass: 'password123' },
  { label: 'Exam Officer', role: 'Blind Grading & CBT', id: 'exam@proxima.com', pass: 'password123' },
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
    form.setValue('identifier', id);
    form.setValue('password', pass);
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
        setError('Invalid credentials. Please verify your institutional ID, email, or password.');
        setIsSubmitting(false);
        return;
      }

      toast({
        title: 'Identity Verified',
        description: 'Routing you to your assigned institutional workspace...',
      });

      const defaultDashboard = schoolSlug ? `/${schoolSlug}/dashboard` : '/dashboard';
      const idLower = values.identifier.toLowerCase();
      const isSuperAdminLogin = idLower.startsWith('admin@');
      const destination = isSuperAdminLogin ? callbackUrl : defaultDashboard;

      router.push(destination);
      router.refresh();
    } catch (err: any) {
      setError('An unexpected authentication error occurred.');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Universal Role-Aware Identity Banner */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 text-slate-300">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed text-slate-300">
          <span className="font-semibold text-white">Universal Single Sign-On:</span> Sign in with your assigned credential. Your account role automatically routes you to the{' '}
          <span className="text-indigo-300 font-medium">Admin, Parent, Tertiary Lecturer, Secondary Teacher, or Student</span> portal.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="py-2.5 px-3 bg-red-950/60 border-red-500/40 text-red-300 rounded-xl">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-xs font-semibold ml-2">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Universal Authentication Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Identifier Input */}
          <FormField
            control={form.control}
            name="identifier"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Institutional Identifier</span>
                  <span className="text-[10px] text-slate-400 font-normal">Email, Staff ID, Matric or Admission No.</span>
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <div className="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <Input
                      placeholder="Enter email, Staff ID, or Matric / Admission No."
                      autoComplete="username"
                      {...field}
                      className="h-11 pl-10 pr-4 rounded-xl bg-slate-800/70 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500 transition-all text-xs font-medium shadow-inner"
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-[11px] text-red-400" />
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
                  <FormLabel className="text-xs font-semibold text-slate-300">
                    Security Password
                  </FormLabel>
                  <a
                    href="/reset-password"
                    className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Forgot password?
                  </a>
                </div>
                <FormControl>
                  <div className="relative">
                    <div className="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none">
                      <Lock className="w-4 h-4" />
                    </div>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      {...field}
                      className="h-11 pl-10 pr-10 rounded-xl bg-slate-800/70 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500 transition-all text-xs font-medium shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage className="text-[11px] text-red-400" />
              </FormItem>
            )}
          />

          {/* Remember Me Checkbox */}
          <FormField
            control={form.control}
            name="rememberMe"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-2.5 space-y-0 pt-1">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="h-4 w-4 rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-indigo-500/40 focus:ring-offset-0 transition-all cursor-pointer"
                  />
                </FormControl>
                <FormLabel className="text-xs font-medium text-slate-300 cursor-pointer select-none">
                  Remember this device for 30 days
                </FormLabel>
              </FormItem>
            )}
          />

          {/* Submit Action Button */}
          <Button
            type="submit"
            className="w-full h-11 rounded-xl font-bold bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-lg shadow-indigo-600/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Verifying Role &amp; Routing...</span>
              </>
            ) : (
              <>
                <span>Sign In to Portal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>

          {/* Biometric BAS / Kiosk Alternative Link */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-800/80 text-xs">
            <a
              href="/dashboard/bas/kiosks"
              className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-indigo-300 transition-colors font-medium"
            >
              <Fingerprint className="w-3.5 h-3.5 text-indigo-400" />
              <span>Biometric BAS Kiosk</span>
            </a>

            <button
              type="button"
              onClick={() => setShowDemoDrawer(!showDemoDrawer)}
              className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>Demo Accounts</span>
              {showDemoDrawer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Discreet Collapsible Demo Credentials Helper */}
          {showDemoDrawer && (
            <div className="pt-2 space-y-2 animate-in fade-in duration-200">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {DEMO_PERSONAS.map((p) => {
                  const isCurrent = form.watch('identifier') === p.id;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => applyPersona(p.id, p.pass)}
                      className={`py-1.5 px-2.5 rounded-lg text-left border transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-indigo-600/25 border-indigo-500 text-indigo-200 font-bold shadow-sm'
                          : 'bg-slate-800/50 hover:bg-slate-800 border-slate-700/60 text-slate-300'
                      }`}
                    >
                      <span className="block font-bold text-[11px] truncate leading-tight">{p.label}</span>
                      <span className="block text-[9px] text-slate-400 truncate leading-tight mt-0.5">{p.role}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}
