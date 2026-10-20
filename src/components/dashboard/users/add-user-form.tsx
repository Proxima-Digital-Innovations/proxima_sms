
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
import { 
  CalendarIcon, 
  Loader2, 
  UploadCloud, 
  Banknote, 
  Clock, 
  KeyRound, 
  Building2, 
  User, 
  Phone, 
  ShieldCheck 
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAcademicData } from '@/hooks/use-academic-data';
import {
  Card,
  CardContent,
  CardDescription,
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
import { Badge } from '@/components/ui/badge';

const roleDefaultSalaries: Record<string, number> = {
  ADMIN: 250000,
  SLT: 280000,
  HOD: 200000,
  ACCOUNTANT: 220000,
  EXAM_OFFICER: 190000,
  TEACHER: 150000,
};

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
  role: z.enum(['ADMIN', 'SLT', 'HOD', 'TEACHER', 'ACCOUNTANT', 'EXAM_OFFICER'], { required_error: 'Role is required.' }),
  departmentId: z.string().optional(),
  dateOfEmployment: z.date({ required_error: 'Employment date is required.' }),
  staffId: z.string().optional(),

  // Compensation & Payroll
  baseSalary: z.coerce.number().min(0, 'Base salary must be 0 or greater.'),

  // Biometrics & Attendance (BAS)
  kioskPin: z.string().max(8, 'PIN must be at most 8 digits.').optional(),
  clockInTime: z.string().default('08:00'),
  clockOutTime: z.string().default('17:00'),

  // Initial Account Credentials
  initialPassword: z.string().min(6, 'Password must be at least 6 characters.').default('Password123!'),

  // Documents
  documents: typeof window !== 'undefined' ? z.instanceof(FileList).optional() : z.any().optional(),
}).refine(data => {
  if (['HOD', 'TEACHER'].includes(data.role)) {
    return !!data.departmentId && data.departmentId.length > 0;
  }
  return true;
}, {
  message: "Department is required for Teacher and HOD roles.",
  path: ["departmentId"],
});

export function AddUserForm({ onUserAdded }: { onUserAdded: () => void }) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { departments, isLoading: isAcademicDataLoading } = useAcademicData();
  
  const departmentOptions = departments.map(d => ({ value: d.id, label: d.name }));

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      address: '',
      departmentId: '',
      stateOfOrigin: '',
      staffId: '',
      baseSalary: 150000,
      kioskPin: '1234',
      clockInTime: '08:00',
      clockOutTime: '17:00',
      initialPassword: 'Password123!',
      role: 'TEACHER',
      dateOfEmployment: new Date(),
    },
  });

  const selectedRole = useWatch({
    control: form.control,
    name: 'role'
  });

  const showDepartmentField = ['HOD', 'TEACHER'].includes(selectedRole);

  // Automatically update suggested salary when role changes if value is default
  useEffect(() => {
    if (selectedRole && roleDefaultSalaries[selectedRole]) {
      const currentSalary = form.getValues('baseSalary');
      if (!currentSalary || Object.values(roleDefaultSalaries).includes(currentSalary)) {
        form.setValue('baseSalary', roleDefaultSalaries[selectedRole]);
      }
    }
  }, [selectedRole, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    
    const formData = new FormData();
    const finalValues = { ...values };
    
    Object.entries(finalValues).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (value instanceof Date) {
          formData.append(key, value.toISOString());
        } else if (value instanceof File) {
          formData.append(key, value);
        } else if (typeof window !== 'undefined' && typeof FileList !== 'undefined' && value instanceof FileList) {
          for (let i = 0; i < value.length; i++) {
             formData.append(`${key}[${i}]`, value[i]);
          }
        } else {
          formData.append(key, String(value));
        }
      }
    });

    try {
      const result = await createStaff(formData);

      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: 'Staff Profile Created',
        description: `Account for ${values.firstName} ${values.lastName} successfully provisioned with payroll & biometrics.`,
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
            {/* Personal Information */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                  <User className="h-4 w-4 text-violet-500" /> Personal Information
                </CardTitle>
                <CardDescription>Basic demographic and identity details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField 
                    control={form.control} 
                    name="firstName" 
                    render={({ field }) => ( 
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl><Input placeholder="Amina" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem> 
                    )}
                  />
                  <FormField 
                    control={form.control} 
                    name="lastName" 
                    render={({ field }) => ( 
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl><Input placeholder="Sadiq" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem> 
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField 
                    control={form.control} 
                    name="gender" 
                    render={({ field }) => ( 
                      <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem> 
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem className="flex flex-col pt-1">
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
                <FormField 
                  control={form.control} 
                  name="stateOfOrigin" 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State of Origin</FormLabel>
                      <FormControl>
                        <Combobox 
                          options={NIGERIAN_STATES} 
                          placeholder="Select State" 
                          searchPlaceholder="Search states..." 
                          notFoundText="No state found." 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField 
                  control={form.control} 
                  name="profilePicture" 
                  render={({ field: { onChange, value, ...rest }}) => ( 
                    <FormItem>
                      <FormLabel>Profile Photo</FormLabel>
                      <FormControl>
                        <Input type="file" accept="image/png, image/jpeg" onChange={(e) => onChange(e.target.files?.[0])} {...rest} />
                      </FormControl>
                      <FormDescription className="text-xs">Max file size 2MB (PNG or JPEG).</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Contact Details */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                  <Phone className="h-4 w-4 text-blue-500" /> Contact & Residence
                </CardTitle>
                <CardDescription>Direct communication coordinates.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField 
                  control={form.control} 
                  name="email" 
                  render={({ field }) => ( 
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl><Input type="email" placeholder="amina.sadiq@school.edu" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem> 
                  )}
                />
                <FormField 
                  control={form.control} 
                  name="phone" 
                  render={({ field }) => ( 
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl><Input placeholder="08012345678" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem> 
                  )}
                />
                <FormField 
                  control={form.control} 
                  name="address" 
                  render={({ field }) => ( 
                    <FormItem>
                      <FormLabel>Residential Address</FormLabel>
                      <FormControl><Input placeholder="123 Main Street, Victoria Island, Lagos" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem> 
                  )}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Professional Information */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                  <Building2 className="h-4 w-4 text-amber-500" /> Professional Role & Assignment
                </CardTitle>
                <CardDescription>Designation, department, and employment status.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={cn("grid grid-cols-1 gap-4", showDepartmentField ? "sm:grid-cols-2" : "grid-cols-1")}>
                  <FormField 
                    control={form.control} 
                    name="role" 
                    render={({ field }) => ( 
                      <FormItem>
                        <FormLabel>Staff Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Assign a role" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ADMIN">Administrator</SelectItem>
                            <SelectItem value="SLT">Senior Leadership Team (SLT)</SelectItem>
                            <SelectItem value="HOD">Head of Department (HOD)</SelectItem>
                            <SelectItem value="TEACHER">Teacher / Educator</SelectItem>
                            <SelectItem value="ACCOUNTANT">Accountant / Finance</SelectItem>
                            <SelectItem value="EXAM_OFFICER">Examination Officer</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem> 
                    )}
                  />
                  {showDepartmentField && (
                    <FormField 
                      control={form.control} 
                      name="departmentId" 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department</FormLabel>
                          <FormControl>
                            <Combobox 
                              options={departmentOptions} 
                              placeholder="Select Department" 
                              searchPlaceholder="Search departments..." 
                              notFoundText="No department found." 
                              value={field.value}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="staffId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custom Staff ID (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Auto-generated if blank" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs">e.g. PROX-24TEA0001</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dateOfEmployment"
                    render={({ field }) => (
                      <FormItem className="flex flex-col pt-1">
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
              </CardContent>
            </Card>

            {/* Compensation & Payroll */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                    <Banknote className="h-4 w-4 text-emerald-500" /> Compensation & Payroll
                  </CardTitle>
                  <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                    ₦ Active Payroll
                  </Badge>
                </div>
                <CardDescription>
                  Base salary required for payroll batch processing, payslip vouchers, and staff loans.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField 
                  control={form.control} 
                  name="baseSalary" 
                  render={({ field }) => ( 
                    <FormItem>
                      <FormLabel>Monthly Base Salary (₦)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground text-sm">₦</span>
                          <Input 
                            type="number" 
                            min="0" 
                            step="1000" 
                            placeholder="150000" 
                            className="pl-8 text-foreground font-mono font-bold" 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormDescription className="text-xs flex items-center justify-between">
                        <span>Baseline starting salary.</span>
                        <span className="text-muted-foreground">Standard for {selectedRole}: ₦{(roleDefaultSalaries[selectedRole] || 150000).toLocaleString()}</span>
                      </FormDescription>
                      <FormMessage />
                    </FormItem> 
                  )}
                />
              </CardContent>
            </Card>

            {/* Biometric Attendance (BAS) & Schedule */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                    <Clock className="h-4 w-4 text-indigo-500" /> Biometrics & Attendance (BAS)
                  </CardTitle>
                  <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
                    Kiosk Ready
                  </Badge>
                </div>
                <CardDescription>
                  Kiosk PIN clock-in credentials and daily scheduled shift window.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <FormField 
                    control={form.control} 
                    name="kioskPin" 
                    render={({ field }) => ( 
                      <FormItem>
                        <FormLabel>Kiosk PIN</FormLabel>
                        <FormControl>
                          <Input maxLength={8} placeholder="1234" className="font-mono text-center tracking-widest font-bold" {...field} />
                        </FormControl>
                        <FormDescription className="text-[11px]">4-8 digit clock-in PIN</FormDescription>
                        <FormMessage />
                      </FormItem> 
                    )}
                  />
                  <FormField 
                    control={form.control} 
                    name="clockInTime" 
                    render={({ field }) => ( 
                      <FormItem>
                        <FormLabel>Shift Start</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormDescription className="text-[11px]">Punctuality cutoff</FormDescription>
                        <FormMessage />
                      </FormItem> 
                    )}
                  />
                  <FormField 
                    control={form.control} 
                    name="clockOutTime" 
                    render={({ field }) => ( 
                      <FormItem>
                        <FormLabel>Shift End</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormDescription className="text-[11px]">Standard sign-out</FormDescription>
                        <FormMessage />
                      </FormItem> 
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Account Credentials & Security */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                    <KeyRound className="h-4 w-4 text-violet-500" /> Initial Login Credentials
                  </CardTitle>
                  <Badge variant="outline" className="text-xs bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20">
                    Argon2
                  </Badge>
                </div>
                <CardDescription>
                  Temporary sign-in password. Staff member will be prompted to change it on first login.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField 
                  control={form.control} 
                  name="initialPassword" 
                  render={({ field }) => ( 
                    <FormItem>
                      <FormLabel>Temporary Password</FormLabel>
                      <FormControl>
                        <Input type="text" placeholder="Password123!" className="font-mono" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Default: Password123!. Securely encrypted with Argon2.
                      </FormDescription>
                      <FormMessage />
                    </FormItem> 
                  )}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button type="submit" disabled={isSubmitting} size="lg" className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-md">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            Create & Provision Staff Member
          </Button>
        </div>
      </form>
    </Form>
  );
}
