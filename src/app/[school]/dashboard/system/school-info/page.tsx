
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
import { db, auth, storage } from "@/lib/firebase";
import { doc, getDoc, setDoc } from '@/lib/firebase-stubs';
import { ref, uploadBytes, getDownloadURL } from '@/lib/firebase-stubs';
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
                const docRef = doc(db, 'system', 'schoolInfo');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data() as SchoolInfo;
                    setInfo(data);
                    form.reset(data);
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
            const docRef = doc(db, 'system', 'schoolInfo');
            let logoUrl = info?.logoUrl || '';

            const fileList = values.logo as FileList | undefined;
            if (fileList && fileList.length > 0) {
                const file = fileList[0];
                const storageRef = ref(storage, `school/logo/${file.name}`);
                const uploadResult = await uploadBytes(storageRef, file);
                logoUrl = await getDownloadURL(uploadResult.ref);
            }
            
            const dataToSave: SchoolInfo = {
                name: values.name,
                address: values.address,
                phone: values.phone,
                email: values.email,
                logoUrl: logoUrl,
            };

            await setDoc(docRef, dataToSave);

            toast({ title: "Success", description: "School information has been updated." });

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
