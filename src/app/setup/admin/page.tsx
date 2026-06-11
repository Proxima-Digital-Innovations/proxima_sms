'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from '@/lib/firebase-stubs';
import { collection, doc, getDocs, query, setDoc, where } from '@/lib/firebase-stubs';
import { useEffect } from 'react';

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
import { db, auth, storage } from "@/lib/firebase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Image from 'next/image';
import { useRole } from '@/context/role-context';

const formSchema = z.object({
  name: z.string().min(1, { message: 'Name is required.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters.' }),
});

export default function SetupAdminPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { role, isLoading } = useRole();

   useEffect(() => {
    // Redirect if a user is already logged in
    if (!isLoading && role) {
      router.push('/dashboard');
    }
  }, [role, isLoading, router]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      // Check if an admin account already exists
      const usersRef = collection(db, 'users');
      const adminQuery = query(usersRef, where('role', '==', 'Admin'));
      const adminSnapshot = await getDocs(adminQuery);

      if (!adminSnapshot.empty) {
        toast({
          variant: 'destructive',
          title: 'Admin Account Exists',
          description:
            'An administrator account has already been created. Please log in.',
        });
        router.push('/admin/login');
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        staffId: 'ADMIN001',
        name: values.name,
        email: values.email,
        role: 'Admin',
        status: 'active',
        createdAt: new Date(),
        department: 'Administration',
        stateOfOrigin: 'N/A',
      });

      toast({
        title: 'Admin Account Created!',
        description: `You can now log in as ${values.email}. This setup page should now be removed.`,
      });
      router.push('/admin/login');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Account Creation Failed',
        description:
          error.code === 'auth/email-already-in-use'
            ? 'This email is already in use by another account.'
            : error.message,
      });
    }
  }

  if (isLoading || role) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        {/* You can add a loader here if you want */}
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/school-background.jpg')" }}
      ></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/20 backdrop-blur-sm"></div>
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center bg-transparent p-4 font-body">
        <Card className="w-full max-w-sm shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Image
                src="/school-logo.png"
                alt="School OS Logo"
                width={250}
                height={60}
                priority
              />
            </div>
            <CardTitle className="font-headline text-3xl text-primary">
              Initial Admin Setup
            </CardTitle>
            <CardDescription>
              Create the first administrator account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Admin User" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="admin@school.edu" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting
                    ? 'Creating Account...'
                    : 'Create Admin Account'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
