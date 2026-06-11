
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
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
import { CalendarIcon, Loader2, UploadCloud } from 'lucide-react';
import { useState } from 'react';
import { useAcademicData } from '@/hooks/use-academic-data';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { createStaff } from '@/actions/staff-actions';
import { NIGERIAN_STATES } from '@/lib/nigerian-states';
import { Combobox } from '@/components/ui/combobox';
import { DateOfBirthInput } from '@/components/ui/date-of-birth-input';


const formSchema = z.object({
  // Personal Info
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  gender: z.enum(['Male', 'Female'], { required_error: 'Gender is required.' }),
  dateOfBirth: z.date({ required_error: 'Date of birth is required.' }),
  stateOfOrigin: z.string().min(1, 'State of origin is required.'),
  profilePicture: z.instanceof(File).optional().refine(file => !file || file.size < 2 * 1024 * 1024, 'Max size is 2MB.'),

  // Contact Info
  phone: z.string().min(1, 'Phone number is required.'),
  email: z.string().email('Invalid email address.'),
  address: z.string().min(1, 'Address is required.'),

  // Professional Info
  role: z.enum(['Admin', 'SLT', 'HeadOfDepartment', 'Teacher', 'Accountant', 'ExamOfficer'], { required_error: 'Role is required.' }),
  department: z.string().optional(),
  dateOfEmployment: z.date({ required_error: 'Employment date is required.' }),

  // Documents
  documents: z.instanceof(FileList).optional(),
}).refine(data => {
    if (['HeadOfDepartment', 'Teacher'].includes(data.role)) {
      return !!data.department && data.department.length > 0;
    }
    return true;
  }, {
    message: "Department is required for Teacher and HOD roles.",
    path: ["department"],
  });


export function AddUserForm({ onUserAdded }: { onUserAdded: () => void }) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { departments, isLoading: isAcademicDataLoading } = useAcademicData();
  
  const departmentOptions = departments.map(d => ({ value: d.name, label: d.name }));

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      address: '',
      department: '',
      stateOfOrigin: '',
    },
  });

  const selectedRole = useWatch({
    control: form.control,
    name: 'role'
  });

  const showDepartmentField = ['HeadOfDepartment', 'Teacher'].includes(selectedRole);


   async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    
    const formData = new FormData();
    const finalValues = { ...values };
    
    Object.entries(finalValues).forEach(([key, value]) => {
      if (value) {
        if (value instanceof Date) {
          formData.append(key, value.toISOString());
        } else if (value instanceof File) {
          formData.append(key, value);
        } else if (value instanceof FileList) {
          for (let i = 0; i < value.length; i++) {
             formData.append(`${key}[${i}]`, value[i]);
          }
        } else {
          formData.append(key, value);
        }
      }
    });

    try {
      const result = await createStaff(formData);

      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: 'Staff Created Successfully',
        description: `An account for ${values.firstName} has been created.`,
      });
      form.reset();
      onUserAdded();
      
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Creation Failed',
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
            {/* Left Column */}
            <div className="space-y-6">
                 <Card>
                    <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField control={form.control} name="firstName" render={({ field }) => ( <FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="Amina" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="lastName" render={({ field }) => ( <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input placeholder="Sadiq" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <FormField control={form.control} name="gender" render={({ field }) => ( <FormItem><FormLabel>Gender</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
                            <FormField
                                control={form.control}
                                name="dateOfBirth"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col pt-2">
                                        <FormLabel className="mb-1">Date of Birth</FormLabel>
                                            <DateOfBirthInput
                                                value={field.value}
                                                onChange={field.onChange}
                                            />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                         <FormField control={form.control} name="stateOfOrigin" render={({ field }) => (<FormItem><FormLabel>State of Origin</FormLabel><FormControl><Combobox options={NIGERIAN_STATES} placeholder="Select State" searchPlaceholder="Search states..." notFoundText="No state found." {...field} /></FormControl><FormDescription>This will be the user's default password.</FormDescription><FormMessage /></FormItem>)}/>
                         <FormField control={form.control} name="profilePicture" render={({ field: { onChange, value, ...rest }}) => ( <FormItem><FormLabel>Profile Photo</FormLabel><FormControl><Input type="file" accept="image/png, image/jpeg" onChange={(e) => onChange(e.target.files?.[0])} {...rest} /></FormControl><FormDescription>Max file size 2MB.</FormDescription><FormMessage /></FormItem>)}/>
                    </CardContent>
                </Card>
            </div>
            {/* Right Column */}
            <div className="space-y-6">
                <Card>
                    <CardHeader><CardTitle>Contact & Account Details</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                         <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" placeholder="amina.sadiq@school.edu" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                         <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="08012345678" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                         <FormField control={form.control} name="address" render={({ field }) => ( <FormItem><FormLabel>Home Address</FormLabel><FormControl><Input placeholder="123, Main Street, Lagos" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Professional Information</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className={cn("grid grid-cols-1 gap-4", showDepartmentField ? "sm:grid-cols-2" : "grid-cols-1")}>
                            <FormField control={form.control} name="role" render={({ field }) => ( <FormItem><FormLabel>Role</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Assign a role" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Admin">Admin</SelectItem><SelectItem value="SLT">SLT</SelectItem><SelectItem value="HeadOfDepartment">Head of Department</SelectItem><SelectItem value="Teacher">Teacher</SelectItem><SelectItem value="Accountant">Accountant</SelectItem><SelectItem value="ExamOfficer">Exam Officer</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
                            {showDepartmentField && (
                               <FormField control={form.control} name="department" render={({ field }) => (<FormItem><FormLabel>Department</FormLabel><FormControl><Combobox options={departmentOptions} placeholder="Select Department" searchPlaceholder="Search..." notFoundText="No department found." {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="dateOfEmployment"
                                render={({ field }) => (
                                <FormItem className="flex flex-col pt-2">
                                    <FormLabel className="mb-1">Employment Date</FormLabel>
                                    <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                            "w-full pl-3 text-left font-normal",
                                            !field.value && "text-muted-foreground"
                                            )}
                                        >
                                            {field.value ? (
                                            format(field.value, "PPP")
                                            ) : (
                                            <span>Pick a date</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <DateOfBirthInput
                                            value={field.value}
                                            onChange={field.onChange}
                                        />
                                    </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                         <FormField control={form.control} name="documents" render={({ field: { onChange, value, ...rest }}) => ( <FormItem><FormLabel>Upload Documents</FormLabel><FormControl><Input type="file" multiple onChange={(e) => onChange(e.target.files)} {...rest} /></FormControl><FormDescription>CV, credentials, etc.</FormDescription><FormMessage /></FormItem>)}/>
                    </CardContent>
                </Card>
            </div>
        </div>
         <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isSubmitting} size="lg">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                Create Staff Account
            </Button>
        </div>
      </form>
    </Form>
  );
}
