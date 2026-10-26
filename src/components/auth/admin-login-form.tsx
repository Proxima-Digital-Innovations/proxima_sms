'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { loginAction } from '@/actions/auth-actions';

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
import { useRole } from '@/context/role-context';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowRight } from 'lucide-react';

const formSchema = z.object({
  email: z.string().trim().email({ message: 'Please enter a valid administrator email.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

export function AdminLoginForm() {
  const router = useRouter();
  const { setRole } = useRole();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const res = await loginAction(values.email, values.password);

      if (res?.error) {
        toast({
          variant: 'destructive',
          title: 'Authentication Failed',
          description: 'Invalid administrator email or password.',
        });
        return;
      }

      toast({
        title: 'Authentication Verified',
        description: 'Entering administrative workspace...',
      });
      router.push('/dashboard');
      router.refresh();
      
    } catch {
      toast({
        variant: 'destructive',
        title: 'Connection Error',
        description: 'Unable to connect to authentication server.',
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel className="text-xs font-semibold">Administrator Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="admin@school.edu"
                  autoComplete="username"
                  autoFocus
                  className="h-10 text-xs rounded-xl"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-[11px]" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel className="text-xs font-semibold">Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="h-10 text-xs rounded-xl"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-[11px]" />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full h-10 rounded-xl font-semibold shadow-xs flex items-center justify-center gap-2 mt-2"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying...</span>
            </>
          ) : (
            <>
              <span>Sign In as Admin</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
