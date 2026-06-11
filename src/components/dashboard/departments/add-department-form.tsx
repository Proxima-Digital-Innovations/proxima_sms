
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { collection, addDoc, doc, updateDoc, getDocs, query, where } from '@/lib/firebase-stubs';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { db, auth, storage } from "@/lib/firebase";
import { PlusCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { MockUser } from '@/lib/schema';

const formSchema = z.object({
  name: z.string().min(1, 'Department name is required.'),
  hodId: z.string().optional(),
});

export function AddDepartmentForm({ onDepartmentAdded }: { onDepartmentAdded: () => void }) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teachers, setTeachers] = useState<MockUser[]>([]);

  useEffect(() => {
    const fetchTeachers = async () => {
      // Fetches users who are HODs or Teachers to assign as HOD
      const q = query(collection(db, 'users'), where('role', 'in', ['HeadOfDepartment', 'Teacher']));
      const querySnapshot = await getDocs(q);
      const teacherList = querySnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as MockUser));
      setTeachers(teacherList);
    };
    fetchTeachers();
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      hodId: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const newDeptRef = await addDoc(collection(db, 'departments'), {
        name: values.name,
        hodId: values.hodId || null,
      });

      // If an HOD was assigned, update that user's department field
      if (values.hodId) {
        const userRef = doc(db, 'users', values.hodId);
        await updateDoc(userRef, {
          department: values.name,
          role: 'HeadOfDepartment' // Promote to HOD if they weren't already
        });
      }

      toast({
        title: 'Department Added',
        description: `The "${values.name}" department has been created.`,
      });
      form.reset();
      onDepartmentAdded();
    } catch (e: any) {
      console.error('Error adding department: ', e);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'There was a problem creating the department.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Department Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Science Department" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="hodId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Head of Department (Optional)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a teacher to be HOD" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Adding...' : <><PlusCircle className="mr-2 h-4 w-4" /> Add Department</>}
        </Button>
      </form>
    </Form>
  );
}
