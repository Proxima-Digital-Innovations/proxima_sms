'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import {
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Fingerprint,
  Sparkles,
  ArrowRight
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
  identifier: z.string().min(1, { message: 'Enter your institutional email, matric number, or staff ID.' }),
  password: z.string().min(1, { message: 'Security password is required.' }),
  rememberMe: z.boolean().default(false),
});

// Quick preset credentials for enterprise evaluation
const DEMO_PERSONAS = [
  { label: 'Admin', role: 'Super Admin', id: 'admin@proximahub.com', pass: 'password123' },
  { label: 'Parent', role: 'Guardian Portal', id: 'parent@proximahub.com', pass: 'password123' },
  { label: 'Lecturer', role: 'Academic Faculty', id: 'aliyu.sani@proxima.edu.ng', pass: 'password123' },
  { label: 'Student', role: 'Computer Science', id: 'U2025/CSC/001', pass: 'password123' },
  { label: 'Finance', role: 'Bursar Officer', id: 'finance@proximahub.com', pass: 'password123' },
  { label: 'HOD / Senate', role: 'Dept. & Senate', id: 'hod@proxima.com', pass: 'password123' },
];

export function LoginForm({ schoolSlug }: { schoolSlug?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || (schoolSlug ? `/${schoolSlug}/dashboard` : '/dashboard');
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      identifier: searchParams.get('identifier') || searchParams.get('email') || 'admin@proximahub.com',
      password: searchParams.get('password') || 'password123',
      rememberMe: false,
    },
  });

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
        setError('Invalid credentials. Please verify your ID or password.');
        setIsSubmitting(false);
        return;
      }

      toast({
        title: 'Authentication Successful',
        description: 'Establishing cryptographic session token...',
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
    <div className="space-y-6">
      {/* Quick-Access Demo Personas */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
          <span className="flex items-center gap-1 uppercase tracking-wider text-[10px]">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            Quick Persona Switch (Demo)
          </span>
          <span className="text-[10px] text-slate-500 font-mono">1-Click Fill</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {DEMO_PERSONAS.map((p) => {
            const isCurrent = form.watch('identifier') === p.id;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPersona(p.id, p.pass)}
                className={`py-1.5 px-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-indigo-600/25 border-indigo-500 text-indigo-200 font-bold shadow-sm'
                    : 'bg-slate-800/50 hover:bg-slate-800 border-slate-700/60 text-slate-300'
                }`}
              >
                <span className="block font-bold text-xs truncate leading-tight">{p.label}</span>
                <span className="block text-[9px] text-slate-400 truncate leading-tight mt-0.5">{p.role}</span>
              </button>
            );
          })}
        </div>
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

      {/* Authentication Form */}
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
                  <span className="text-[10px] text-slate-500 font-normal">Email, Staff Code or Matric</span>
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <div className="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none">
                      <Mail className="w-4 h-4" />
                    </div>
                    <Input 
                      placeholder="e.g. admin@proximahub.com or U2025/CSC/001" 
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
                      placeholder="Enter security password" 
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
                <span>Authenticating Secure Session...</span>
              </>
            ) : (
              <>
                <span>Sign In to Portal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>

          {/* Biometric BAS / Kiosk Alternative Link */}
          <div className="pt-2 text-center">
            <a
              href="/dashboard/bas/kiosks"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-300 transition-colors font-medium"
            >
              <Fingerprint className="w-3.5 h-3.5 text-indigo-400" />
              <span>Biometric BAS Clock-In &bull; Fast Kiosk Terminal</span>
            </a>
          </div>

        </form>
      </Form>
    </div>
  );
}
