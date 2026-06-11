
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from '@/lib/firebase-stubs';
import { collection, query, where, getDocs } from '@/lib/firebase-stubs';


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
import { db, auth, storage } from "@/lib/firebase";
import { MockUser } from '@/lib/schema';

const formSchema = z.object({
  identifier: z.string().min(1, { message: 'ID or Email is required.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

export function LoginForm() {
  const router = useRouter();
  const { setRole } = useRole();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      // 1. Determine if the identifier is an email or a Staff/Student ID
      const isEmail = values.identifier.includes('@');
      let userEmail = '';
      let userData: MockUser | null = null;

      const usersRef = collection(db, 'users');
      
      if (isEmail) {
        // If it's an email, we already have it. Find the user doc to get the role.
        userEmail = values.identifier.toLowerCase(); // Standardize email to lowercase
        const q = query(usersRef, where('email', '==', userEmail));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            throw new Error("auth/user-not-found");
        }
        userData = querySnapshot.docs[0].data() as MockUser;

      } else {
        // If it's a Staff/Student ID, find the user doc to get the email.
        const staffId = values.identifier.toUpperCase(); // Standardize staffId to uppercase
        const q = query(usersRef, where('staffId', '==', staffId));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
           throw new Error("auth/user-not-found");
        }
        userData = querySnapshot.docs[0].data() as MockUser;
        userEmail = userData.email;
      }
      

      if (!userEmail || !userData) {
        throw new Error("auth/user-not-found");
      }

      // 2. Sign in with the user's email and provided password
      const userCredential = await signInWithEmailAndPassword(
        auth,
        userEmail,
        values.password
      );
      
      const user = userCredential.user;

      if (user) {
        setRole(userData.role);

        // 3. Show password change reminder if needed (case-insensitive check)
        const isDefaultPassword = (userData.stateOfOrigin && values.password.toLowerCase() === userData.stateOfOrigin.toLowerCase()) || 
                                (userData.generatedPassword && values.password.toLowerCase() === userData.generatedPassword.toLowerCase());
        
        if (isDefaultPassword) {
           toast({
              title: 'Welcome!',
              description: 'For your security, please update your password in your profile settings.',
              duration: 9000,
            });
        } else {
             toast({
              title: 'Login Successful',
              description: `Welcome back! You are logged in as ${userData.role}.`,
            });
        }
        router.push('/dashboard');
      }
    } catch (error: any) {
        let description = 'An unexpected error occurred.';
        if (error.message === 'auth/user-not-found' || error.code === 'auth/user-not-found') {
            description = 'No user found with that ID or Email.';
        } else if (error.code === 'auth/wrong-password') {
            description = 'Incorrect password. Please try again.';
        } else if (error.code === 'auth/invalid-credential') {
             description = 'Invalid credentials provided.';
        }
       toast({
        variant: 'destructive',
        title: 'Login Failed',
        description,
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="identifier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Staff/Student ID or Email</FormLabel>
              <FormControl>
                <Input placeholder="e.g. SCHOOL24TEA0001 or name@school.edu" {...field} />
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
                <Input type="password" placeholder="••••••••" {...field} />
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
          {form.formState.isSubmitting ? 'Signing In...' : 'Sign In'}
        </Button>
      </form>
    </Form>
  );
}
