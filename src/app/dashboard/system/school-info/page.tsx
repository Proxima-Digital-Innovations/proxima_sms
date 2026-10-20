
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { getSchoolInfo, updateSchoolInfo, uploadSchoolLogo, removeSchoolLogo } from '@/actions/school-actions';
import { Loader2, Save, Upload, School, Trash2, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import { SchoolInfo } from '@/lib/schema';
import { Skeleton } from '@/components/ui/skeleton';

const formSchema = z.object({
    name: z.string().min(1, "School name is required."),
    address: z.string().min(1, "School address is required."),
    phone: z.string().min(1, "School phone number is required."),
    email: z.string().email("Invalid email address."),
});

type SchoolInfoFormValues = z.infer<typeof formSchema>;

export default function SchoolInfoPage() {
    const [info, setInfo] = useState<SchoolInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isLogoRemoved, setIsLogoRemoved] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
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
            // Validate type
            const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'image/gif'];
            if (!validTypes.includes(file.type.toLowerCase())) {
                toast({
                    variant: 'destructive',
                    title: 'Invalid Format',
                    description: 'Please upload a PNG, JPEG, WEBP, or SVG image file.'
                });
                return;
            }

            // Validate size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast({
                    variant: 'destructive',
                    title: 'File Too Large',
                    description: 'Logo file size exceeds the 5MB limit.'
                });
                return;
            }

            setSelectedFile(file);
            setIsLogoRemoved(false);

            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveLogo = () => {
        setSelectedFile(null);
        setLogoPreview(null);
        setIsLogoRemoved(true);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const onSubmit = async (values: SchoolInfoFormValues) => {
        setIsSubmitting(true);
        try {
            let finalLogoUrl = info?.logoUrl || '';

            // 1. If user selected a new logo file, upload it
            if (selectedFile) {
                const formData = new FormData();
                formData.append('logo', selectedFile);
                const uploadRes = await uploadSchoolLogo(formData);
                if (!uploadRes.success) {
                    throw new Error(uploadRes.error || 'Failed to upload new logo.');
                }
                finalLogoUrl = uploadRes.logoUrl!;
            } else if (isLogoRemoved) {
                await removeSchoolLogo();
                finalLogoUrl = '';
            }

            // 2. Update general school details
            const result = await updateSchoolInfo({
                name: values.name.trim(),
                address: values.address.trim(),
                phone: values.phone.trim(),
                email: values.email.trim(),
                logoUrl: finalLogoUrl,
            });

            if (result.success) {
                toast({
                    title: "Changes Saved",
                    description: "School information and official branding have been updated successfully."
                });
                setSelectedFile(null);
                setIsLogoRemoved(false);
            } else {
                throw new Error(result.error || 'Failed to update school info.');
            }
        } catch (error: any) {
            console.error("Error saving school info:", error);
            toast({
                variant: 'destructive',
                title: "Update Failed",
                description: error.message || "Could not save school information."
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8 max-w-4xl">
            <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight text-foreground">
                    School Information
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Manage official institutional details and branding. This data populates system headers, student report cards, and fee receipts.
                </p>
            </div>
            <Card className="border border-border">
                <CardHeader>
                    <CardTitle className="text-xl">Official School Details & Branding</CardTitle>
                    <CardDescription>
                        Update the official school name, campus address, contact phone/email, and institutional crest.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                         <div className="space-y-4">
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                         </div>
                    ) : (
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                {/* School Logo Upload & Preview Section */}
                                <div className="p-4 rounded-xl border border-border bg-card/60 flex flex-col sm:flex-row items-center sm:items-start gap-5">
                                    {logoPreview ? (
                                        <div className="w-28 h-28 rounded-xl border-2 border-dashed border-border p-2 flex items-center justify-center bg-background shadow-sm overflow-hidden flex-shrink-0">
                                            <Image
                                                src={logoPreview}
                                                alt="School Logo"
                                                width={112}
                                                height={112}
                                                className="w-full h-full object-contain"
                                                unoptimized
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-28 h-28 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center bg-muted/30 text-muted-foreground flex-shrink-0">
                                            <School className="w-8 h-8 opacity-40 mb-1" />
                                            <span className="text-[11px] font-medium">No Logo</span>
                                        </div>
                                    )}

                                    <div className="space-y-2 flex-1 text-center sm:text-left">
                                        <div>
                                            <h4 className="text-sm font-semibold text-foreground">Institutional Crest / Logo</h4>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                Accepted formats: PNG, JPEG, WEBP, or SVG. Maximum file size: 5MB.
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="flex items-center gap-2"
                                            >
                                                <Upload className="h-4 w-4" />
                                                {logoPreview ? 'Replace Logo' : 'Upload Logo'}
                                            </Button>

                                            {logoPreview && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleRemoveLogo}
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10 flex items-center gap-1.5"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    Remove
                                                </Button>
                                            )}
                                        </div>

                                        {selectedFile && (
                                            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB) - will upload upon saving
                                            </p>
                                        )}

                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleLogoChange}
                                            accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml, image/gif"
                                            className="hidden"
                                        />
                                    </div>
                                </div>
                                
                                <FormField name="name" control={form.control} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Official School Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Proxima International Academy" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <FormField name="address" control={form.control} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Campus Physical Address</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. No. 12 School Road, GRA, Kaduna" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField name="phone" control={form.control} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Official Phone Number</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. 08012345678" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    <FormField name="email" control={form.control} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Official Inquiries Email</FormLabel>
                                            <FormControl>
                                                <Input type="email" placeholder="e.g. admin@school.edu.ng" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>

                                <div className="flex justify-end pt-2">
                                    <Button type="submit" disabled={isSubmitting} className="flex items-center gap-2">
                                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                        Save All Changes
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

