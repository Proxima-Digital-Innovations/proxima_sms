
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

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
  email: z.string().email({ message: 'Enter a valid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

export function LoginForm({ schoolSlug }: { schoolSlug?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || (schoolSlug ? `/${schoolSlug}/dashboard` : '/dashboard');
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setError(null);
    try {
      const result = await signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password.');
        return;
      }

      toast({
        title: 'Success',
        description: 'Signing you in...',
      });

      router.push(callbackUrl);
      router.refresh();
    } catch (err: any) {
      setError('An unexpected error occurred.');
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive" className="py-2 bg-red-50 border-red-200 text-red-600">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs font-semibold">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs font-bold text-slate-700">
                  Email Address
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder="name@school.edu" 
                    {...field} 
                    className="h-10 border-slate-200 focus:border-slate-400 focus:ring-0 transition-all rounded-lg"
                  />
                </FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs font-bold text-slate-700">
                  Password
                </FormLabel>
                <FormControl>
                  <Input 
                    type="password" 
                    placeholder="••••••••" 
                    {...field} 
                    className="h-10 border-slate-200 focus:border-slate-400 focus:ring-0 transition-all rounded-lg"
                  />
                </FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />
          
          <Button
            type="submit"
            className="w-full h-10 rounded-lg font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all mt-2"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Sign In'
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
