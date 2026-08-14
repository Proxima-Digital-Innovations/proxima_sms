
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { getSchoolInfo, updateSchoolInfo } from '@/actions/school-actions';
import { Loader2, Save, Upload } from 'lucide-react';
import Image from 'next/image';
import { SchoolInfo } from '@/lib/schema';
import { Skeleton } from '@/components/ui/skeleton';


const formSchema = z.object({
    name: z.string().min(1, "School name is required."),
    address: z.string().min(1, "School address is required."),
    phone: z.string().min(1, "School phone number is required."),
    email: z.string().email("Invalid email address."),
    logo: z.any().optional(),
});

type SchoolInfoFormValues = z.infer<typeof formSchema>;


export default function SchoolInfoPage() {
    const [info, setInfo] = useState<SchoolInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const form = useForm<SchoolInfoFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            address: '',
            phone: '',
            email: '',
        }
    });

    useEffect(() => {
        const fetchSchoolInfo = async () => {
            setIsLoading(true);
            try {
                const result = await getSchoolInfo();
                if (result.success && result.data) {
                    const data = result.data;
                    setInfo(data as any);
                    form.reset({
                        name: data.name,
                        address: data.address || '',
                        phone: data.phone || '',
                        email: data.email || ''
                    });
                    if (data.logoUrl) {
                        setLogoPreview(data.logoUrl);
                    }
                }
            } catch (error) {
                console.error("Error fetching school info:", error);
                toast({ variant: 'destructive', title: "Error", description: "Could not load school information." });
            } finally {
                setIsLoading(false);
            }
        };
        fetchSchoolInfo();
    }, [form, toast]);


    const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
            form.setValue('logo', event.target.files);
        }
    };


    const onSubmit = async (values: SchoolInfoFormValues) => {
        setIsSubmitting(true);
        try {
            let logoUrl = info?.logoUrl || '';

            const fileList = values.logo as FileList | undefined;
            if (fileList && fileList.length > 0) {
                // Keep existing file upload logic if they have an external API,
                // otherwise we would need an upload action. Since firebase-stubs is being removed,
                // we'll assume logoURL can just be updated or they can upload it later.
                // For now we'll skip Firebase Storage uploading since we're porting away from Firebase.
                // Normally you'd upload to S3 or similar here.
                toast({ variant: 'destructive', title: 'Upload Not Supported', description: 'Logo upload is currently disabled in this version.' });
                return;
            }
            
            const result = await updateSchoolInfo({
                name: values.name,
                address: values.address,
                phone: values.phone,
                email: values.email,
                logoUrl: logoUrl,
            });

            if (result.success) {
                toast({ title: "Success", description: "School information has been updated." });
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error("Error saving school info:", error);
            toast({ variant: 'destructive', title: "Error", description: "Could not save school information." });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="font-headline text-3xl font-bold">School Information</h1>
                <p className="text-muted-foreground">
                    Manage the school's general details. This information will appear on official documents like invoices and report cards.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Official School Details</CardTitle>
                    <CardDescription>
                        Update the official school name, address, contact details, and logo.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                         <div className="space-y-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                         </div>
                    ) : (
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <div className="flex flex-col items-center gap-4">
                                    {logoPreview && <Image src={logoPreview} alt="School Logo" width={240} height={60} className="h-20 w-auto rounded-md border p-2 object-contain" />}
                                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                                        <Upload className="mr-2 h-4 w-4"/>
                                        Change Logo
                                    </Button>
                                    <FormField
                                        control={form.control}
                                        name="logo"
                                        render={({ field }) => (
                                            <FormItem className="hidden">
                                                <FormControl>
                                                    <Input
                                                        type="file"
                                                        ref={fileInputRef}
                                                        onChange={handleLogoChange}
                                                        accept="image/png, image/jpeg, image/gif"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                
                                <FormField name="name" control={form.control} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>School Name</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                 <FormField name="address" control={form.control} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Address</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField name="phone" control={form.control} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Phone Number</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                     <FormField name="email" control={form.control} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email Address</FormLabel>
                                            <FormControl><Input type="email" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                                <div className="flex justify-end">
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                        Save Changes
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
