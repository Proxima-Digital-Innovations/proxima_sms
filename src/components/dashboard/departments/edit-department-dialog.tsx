'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { updateDepartment, getStaffUsers } from '@/actions/user-actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Loader2, Save } from 'lucide-react';
import { useState, useEffect } from 'react';

const formSchema = z.object({
  name: z.string().min(1, 'Department name is required.'),
  facultyId: z.string().optional(),
  hodId: z.string().optional(),
});

type Department = {
  id: string;
  name: string;
  hodId?: string | null;
  hodName?: string;
  facultyId?: string | null;
  facultyName?: string;
};

interface EditDepartmentDialogProps {
  department: Department | null;
  faculties?: { id: string; code: string; name: string }[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDepartmentUpdated: () => void;
}

export function EditDepartmentDialog({
  department,
  faculties = [],
  isOpen,
  onOpenChange,
  onDepartmentUpdated,
}: EditDepartmentDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teachers, setTeachers] = useState<any[]>([]);

  useEffect(() => {
    async function fetchTeachers() {
      const result = await getStaffUsers();
      if (result.success && result.data) {
        const eligible = result.data.filter((u: any) =>
          ['TEACHER', 'LECTURER', 'HOD', 'SLT', 'ADMIN', 'HEADOFDEPARTMENT'].includes(u.role?.toUpperCase())
        );
        setTeachers(eligible);
      }
    }
    if (isOpen) {
      fetchTeachers();
    }
  }, [isOpen]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      facultyId: 'NONE',
      hodId: 'NONE',
    },
  });

  useEffect(() => {
    if (department) {
      form.reset({
        name: department.name,
        facultyId: department.facultyId || 'NONE',
        hodId: department.hodId || 'NONE',
      });
    }
  }, [department, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!department) return;
    setIsSubmitting(true);
    try {
      const result = await updateDepartment({
        id: department.id,
        name: values.name.trim(),
        facultyId: values.facultyId === 'NONE' ? null : (values.facultyId || null),
        hodId: values.hodId === 'NONE' ? null : (values.hodId || null),
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to update department');
      }

      toast({
        title: 'Department Updated',
        description: `"${values.name}" has been successfully updated.`,
      });
      onOpenChange(false);
      onDepartmentUpdated();
    } catch (e: any) {
      console.error('Error updating department:', e);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: e.message || 'There was a problem updating the department.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-background text-foreground max-w-md w-[95vw] rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl font-bold">Edit Department</DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs sm:text-sm">
            Modify the department title, assign its Faculty, or reassign the Head of Department.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-foreground">Department Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Computer Science"
                      className="bg-background border-border text-foreground rounded-xl"
                      {...field}
                    />
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
                  <FormLabel className="text-xs font-semibold text-foreground">Parent Faculty / College</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || 'NONE'}>
                    <FormControl>
                      <SelectTrigger className="bg-background border-border text-foreground rounded-xl">
                        <SelectValue placeholder="Select Faculty / School" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-background border-border text-foreground">
                      <SelectItem value="NONE" className="text-muted-foreground italic">
                        General / No Faculty Assigned
                      </SelectItem>
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
                  <FormLabel className="text-xs font-semibold text-foreground">Head of Department (HOD)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || 'NONE'}>
                    <FormControl>
                      <SelectTrigger className="bg-background border-border text-foreground rounded-xl">
                        <SelectValue placeholder="Select an educator" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-background border-border text-foreground">
                      <SelectItem value="NONE" className="text-muted-foreground italic">
                        Unassigned (No HOD)
                      </SelectItem>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.name || `${teacher.firstName} ${teacher.lastName}`} ({teacher.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-border hover:bg-muted"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-500/20 rounded-xl"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Save Changes
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
