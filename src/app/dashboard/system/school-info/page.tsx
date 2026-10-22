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
import { getSchoolBankSettings, updateSchoolBankSettings, SchoolBankConfig } from '@/actions/school-bank-actions';
import { 
    Loader2, 
    Save, 
    Upload, 
    School, 
    Trash2, 
    CheckCircle2, 
    Building2, 
    Landmark, 
    Zap, 
    ShieldCheck, 
    CreditCard, 
    ArrowRightLeft 
} from 'lucide-react';
import Image from 'next/image';
import { SchoolInfo } from '@/lib/schema';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

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

    // Banking & Betastack Settlement State
    const [bankSettings, setBankSettings] = useState<SchoolBankConfig>({
        bankName: 'Guaranty Trust Bank (GTBank)',
        accountNumber: '0123456789',
        accountName: 'Proxima International Academy Ltd',
        settlementBankCode: '058',
        betastackZainboxCode: 'PROXIMA_SCH_COLLECTION',
        isAutoSettlementEnabled: true,
    });
    const [isSavingBank, setIsSavingBank] = useState(false);

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
                const [infoResult, bankResult] = await Promise.all([
                    getSchoolInfo(),
                    getSchoolBankSettings(),
                ]);

                if (infoResult.success && infoResult.data) {
                    const data = infoResult.data;
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

                if (bankResult.success && bankResult.data) {
                    setBankSettings(bankResult.data);
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
            const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'image/gif'];
            if (!validTypes.includes(file.type.toLowerCase())) {
                toast({
                    variant: 'destructive',
                    title: 'Invalid Format',
                    description: 'Please upload a PNG, JPEG, WEBP, or SVG image file.'
                });
                return;
            }

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

    const handleSaveBankSettings = async () => {
        setIsSavingBank(true);
        try {
            const res = await updateSchoolBankSettings(bankSettings);
            if (res.success) {
                toast({
                    title: "Banking Settings Updated",
                    description: "School settlement account and Betastack collection settings saved successfully.",
                });
            } else {
                throw new Error(res.error || "Failed to save bank settings.");
            }
        } catch (error: any) {
            console.error("Error saving bank settings:", error);
            toast({
                variant: 'destructive',
                title: "Save Failed",
                description: error.message || "Could not save banking settings.",
            });
        } finally {
            setIsSavingBank(false);
        }
    };

    return (
        <div className="w-full space-y-6 pb-16">
            <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight text-foreground">
                    School Information
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Manage official institutional details, crest branding, and corporate settlement bank accounts for automated parent fee reconciliation.
                </p>
            </div>

            {/* Official School Details & Branding */}
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
                                        Save School Details
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    )}
                </CardContent>
            </Card>

            {/* School Bank Account & Betastack Settlement Configuration */}
            <Card className="border border-border">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Landmark className="h-5 w-5 text-primary" />
                                <CardTitle className="text-xl">Corporate Settlement Bank & Betastack Integration</CardTitle>
                            </div>
                            <CardDescription>
                                Configure the real commercial bank account (e.g. GTBank) that receives auto-swept funds when parents pay tuition fees.
                            </CardDescription>
                        </div>
                        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                            <Zap className="h-3.5 w-3.5" />
                            Auto-Sweep Active
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Information callout banner */}
                    <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-start gap-3">
                        <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div className="text-xs space-y-1 text-muted-foreground leading-relaxed">
                            <span className="font-semibold text-foreground block text-sm">
                                How Virtual Account Auto-Settlement Works:
                            </span>
                            Parents do not pay into random personal accounts. When a parent clicks to pay tuition, 
                            <strong className="text-foreground"> Betastack (Zainpay)</strong> assigns an instant Dedicated Virtual Account (GTBank / Providus). 
                            Once the parent transfers money via their bank app or USSD, the gateway automatically verifies receipt, clears the student invoice, 
                            and immediately sweeps the net funds directly into the School Corporate Bank Account configured below.
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="bankName">Settlement Bank Name</Label>
                            <Input
                                id="bankName"
                                value={bankSettings.bankName}
                                onChange={(e) => setBankSettings({ ...bankSettings, bankName: e.target.value })}
                                placeholder="e.g. Guaranty Trust Bank (GTBank)"
                            />
                            <p className="text-[11px] text-muted-foreground">The Nigerian commercial bank holding the school's account.</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="accountNumber">Corporate Account Number</Label>
                            <Input
                                id="accountNumber"
                                maxLength={10}
                                value={bankSettings.accountNumber}
                                onChange={(e) => setBankSettings({ ...bankSettings, accountNumber: e.target.value })}
                                placeholder="e.g. 0123456789"
                                className="font-mono tracking-wider font-semibold"
                            />
                            <p className="text-[11px] text-muted-foreground">10-digit NUBAN corporate account number.</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="accountName">Corporate Account Name</Label>
                            <Input
                                id="accountName"
                                value={bankSettings.accountName}
                                onChange={(e) => setBankSettings({ ...bankSettings, accountName: e.target.value })}
                                placeholder="e.g. Proxima International Academy Ltd"
                            />
                            <p className="text-[11px] text-muted-foreground">Registered company name as verified by CAC and NIBSS.</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="settlementBankCode">CBN Settlement Bank Code</Label>
                            <Input
                                id="settlementBankCode"
                                value={bankSettings.settlementBankCode || ''}
                                onChange={(e) => setBankSettings({ ...bankSettings, settlementBankCode: e.target.value })}
                                placeholder="e.g. 058 for GTBank, 057 for Zenith"
                                className="font-mono"
                            />
                            <p className="text-[11px] text-muted-foreground">3-digit CBN routing code (e.g. 058 = GTBank, 057 = Zenith, 011 = First Bank).</p>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-border">
                        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <ArrowRightLeft className="h-4 w-4 text-primary" />
                            Fintech Gateway Configuration (Betastack / Zainpay)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="zainboxCode">Betastack Zainbox Collection Code</Label>
                                <Input
                                    id="zainboxCode"
                                    value={bankSettings.betastackZainboxCode || ''}
                                    onChange={(e) => setBankSettings({ ...bankSettings, betastackZainboxCode: e.target.value })}
                                    placeholder="e.g. PROXIMA_SCH_COLLECTION"
                                    className="font-mono text-xs"
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    Assigned by Betastack dashboard to pool all student tuition deposits.
                                </p>
                            </div>

                            <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-card/40 mt-1">
                                <div className="space-y-0.5">
                                    <Label htmlFor="autoSweepToggle" className="text-sm font-medium cursor-pointer">
                                        Automated Auto-Sweep
                                    </Label>
                                    <p className="text-[11px] text-muted-foreground">
                                        Automatically forward all collected tuition into the school's GTBank account.
                                    </p>
                                </div>
                                <Switch
                                    id="autoSweepToggle"
                                    checked={bankSettings.isAutoSettlementEnabled}
                                    onCheckedChange={(checked) => setBankSettings({ ...bankSettings, isAutoSettlementEnabled: checked })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button 
                            onClick={handleSaveBankSettings} 
                            disabled={isSavingBank} 
                            className="flex items-center gap-2"
                        >
                            {isSavingBank ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save Banking & Settlement Settings
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
