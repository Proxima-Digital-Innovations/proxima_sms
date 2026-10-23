'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { addDepartment, getStaffUsers } from '@/actions/user-actions';
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
import { PlusCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { MockUser } from '@/lib/schema';

const formSchema = z.object({
  name: z.string().min(1, 'Department name is required.'),
  facultyId: z.string().optional(),
  hodId: z.string().optional(),
});

export function AddDepartmentForm({
  onDepartmentAdded,
  faculties = [],
}: {
  onDepartmentAdded: () => void;
  faculties?: { id: string; code: string; name: string }[];
}) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teachers, setTeachers] = useState<MockUser[]>([]);

  useEffect(() => {
    const fetchTeachers = async () => {
      const result = await getStaffUsers();
      if (result.success && result.data) {
        const eligible = result.data.filter((u: any) =>
          ['TEACHER', 'LECTURER', 'HOD', 'SLT', 'ADMIN', 'HEADOFDEPARTMENT'].includes(u.role?.toUpperCase())
        );
        setTeachers(eligible as any);
      }
    };
    fetchTeachers();
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      facultyId: 'NONE',
      hodId: 'NONE',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const result = await addDepartment({
        name: values.name,
        facultyId: values.facultyId && values.facultyId !== 'NONE' ? values.facultyId : null,
        hodId: values.hodId && values.hodId !== 'NONE' ? values.hodId : undefined,
      });

      if (!result.success) {
        throw new Error(result.error);
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
        description: e.message || 'There was a problem creating the department.',
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
                <Input placeholder="e.g. Computer Science" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="facultyId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Parent Faculty / College (Optional)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value || 'NONE'}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Faculty / School" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="NONE">General / No Faculty Assigned</SelectItem>
                  {faculties.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      [{f.code}] {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Select onValueChange={field.onChange} defaultValue={field.value || 'NONE'}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an educator to be HOD" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="NONE">Unassigned (No HOD)</SelectItem>
                  {teachers.map((teacher: any) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name || `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || teacher.email} ({teacher.role})
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
