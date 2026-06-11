
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { doc, updateDoc } from '@/lib/firebase-stubs';
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
import { useToast } from '@/hooks/use-toast';
import { db, auth, storage } from "@/lib/firebase";
import type { MockUser } from '@/lib/schema';
import { Save } from 'lucide-react';
import { useState } from 'react';
import { useRole } from '@/context/role-context';

const formSchema = z.object({
  role: z.string().min(1, { message: 'Role is required.' }),
  department: z.string().min(1, { message: 'Department is required.' }),
  employmentType: z.enum(['Full-Time', 'Part-Time'], { required_error: 'Employment type is required.' }),
});

type ProfessionalInfoFormValues = z.infer<typeof formSchema>;

const departmentCodes: { [key: string]: string } = {
  Science: 'SCI',
  Arts: 'ART',
  Commercial: 'COM',
  Administration: 'ADM',
  Accounts: 'ACC',
  Management: 'MGT'
};

const availableRoles = [
  'SLT',
  'HeadOfDepartment',
  'Teacher',
  'ExamOfficer',
  'Accountant',
  'Parent',
  'Student',
  'Admin',
];

export function ProfessionalInfoForm({
  user,
  onUpdate,
}: {
  user: MockUser;
  onUpdate: () => void;
}) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { role: currentUserRole } = useRole();
  const isAdmin = currentUserRole === 'Admin';


  const form = useForm<ProfessionalInfoFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: user.role || '',
      department: user.department || '',
      employmentType: user.employmentType || 'Full-Time',
    },
  });

  async function onSubmit(values: ProfessionalInfoFormValues) {
    setIsSubmitting(true);
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        role: values.role,
        department: values.department,
        employmentType: values.employmentType,
      });

      toast({
        title: 'Success',
        description: "The user's professional information has been updated.",
      });
      onUpdate();
    } catch (e: any) {
      console.error('Error updating professional info: ', e);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'There was a problem updating the details.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  if (!isAdmin) {
    return (
        <div className="space-y-4 text-sm pt-4">
            <p><strong>Role:</strong> {user.role}</p>
            <p><strong>Department:</strong> {user.department}</p>
            <p><strong>Employment Type:</strong> {user.employmentType || 'N/A'}</p>
            <p><strong>Employment Date:</strong> {user.employmentDate?.seconds ? new Date(user.employmentDate.seconds * 1000).toLocaleDateString() : 'N/A'}</p>
             <p className="text-xs text-muted-foreground pt-4">Only administrators can modify this information.</p>
        </div>
    )
  }


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
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
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a department" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.keys(departmentCodes).map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
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
            name="employmentType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Employment Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employment type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Full-Time">Full-Time</SelectItem>
                    <SelectItem value="Part-Time">Part-Time</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            'Saving...'
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> Save Changes
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
