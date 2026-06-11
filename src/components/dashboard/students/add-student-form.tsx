
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
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
import { Loader2, UploadCloud, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useAcademicData } from '@/hooks/use-academic-data';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { createStudent } from '@/actions/student-actions';
import { DateOfBirthInput } from '@/components/ui/date-of-birth-input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const formSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  middleName: z.string().optional(),
  gender: z.enum(['Male', 'Female'], {
    required_error: 'Gender is required.',
  }),
  dateOfBirth: z.date({ required_error: 'Date of birth is required.' }),
  address: z.string().min(1, 'Address is required.'),
  guardianName: z.string().min(1, "Guardian's name is required."),
  guardianContact: z.string().min(6, "Guardian's phone number must be at least 6 characters."),
  guardianEmail: z.string().email('Invalid email address.'),
  classId: z.string().min(1, 'Please select a class.'),
  admissionDate: z.date({ required_error: 'Admission date is required.' }),
  session: z
    .string()
    .min(1, 'Session is required.')
    .regex(/^\d{4}\/\d{4}$/, 'Format must be YYYY/YYYY (e.g. 2023/2024)'),
  medicalConditions: z.string().optional(),
});

export function AddStudentForm({ onStudentAdded }: { onStudentAdded?: () => void }) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { classes, isLoading: isAcademicDataLoading } = useAcademicData();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      middleName: '',
      address: '',
      guardianName: '',
      guardianContact: '',
      guardianEmail: '',
      session: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
      medicalConditions: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (value) {
        if (value instanceof Date) {
          formData.append(key, value.toISOString());
        } else {
          formData.append(key, value as string);
        }
      }
    });

    try {
        const result = await createStudent(formData);
        
        if (result.error) {
            throw new Error(result.error as string);
        }

        toast({
            title: 'Student Enrolled Successfully',
            description: `${values.firstName} ${values.lastName} has been added.`,
        });
        
        form.reset();
        if (onStudentAdded) onStudentAdded();

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Enrollment Failed',
            description: error.message || 'An unexpected error occurred.',
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-6">
                <Card className="shadow-none border-sidebar-border">
                    <CardHeader><CardTitle className="text-base">Personal Info</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="firstName" render={({ field }) => ( <FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="Fatima" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="lastName" render={({ field }) => ( <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input placeholder="Aliyu" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="gender" render={({ field }) => ( <FormItem><FormLabel>Gender</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="dateOfBirth" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel className="mt-2.5">DOB</FormLabel><DateOfBirthInput value={field.value} onChange={field.onChange} /><FormMessage /></FormItem> )}/>
                        </div>
                    </CardContent>
                </Card>
                 <Card className="shadow-none border-sidebar-border">
                    <CardHeader><CardTitle className="text-base">Academic</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <FormField control={form.control} name="classId" render={({ field }) => ( <FormItem><FormLabel>Assigned Class</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} disabled={isAcademicDataLoading}><FormControl><SelectTrigger><SelectValue placeholder={isAcademicDataLoading ? "Loading..." : "Select Class"} /></SelectTrigger></FormControl><SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="admissionDate" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel className="mt-2.5">Admission Date</FormLabel><DateOfBirthInput value={field.value} onChange={field.onChange} /><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="session" render={({ field }) => ( <FormItem><FormLabel>Session</FormLabel><FormControl><Input placeholder="2023/2024" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="space-y-6">
                 <Card className="shadow-none border-sidebar-border">
                    <CardHeader><CardTitle className="text-base">Guardian Info</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                         <FormField control={form.control} name="guardianName" render={({ field }) => ( <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Aisha Ibrahim" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                         <FormField control={form.control} name="guardianEmail" render={({ field }) => ( <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input placeholder="parent@example.com" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                         <FormField control={form.control} name="guardianContact" render={({ field }) => ( <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="08012345678" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                         <FormField control={form.control} name="address" render={({ field }) => ( <FormItem><FormLabel>Home Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </CardContent>
                </Card>
            </div>
        </div>

        <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                Enroll Student
            </Button>
        </div>
      </form>
    </Form>
  );
}
