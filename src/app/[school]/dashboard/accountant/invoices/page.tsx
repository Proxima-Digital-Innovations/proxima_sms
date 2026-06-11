
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, AlertCircle, Eye, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CLASS_GROUPS } from '@/components/dashboard/fees/fee-structure-form';
import { generateInvoicesForClassGroup } from '@/actions/invoice-actions';
import type { Invoice } from '@/lib/schema';
import { dbService } from '@/lib/dbService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';

const SESSIONS = ["2023/2024", "2024/2025", "2025/2026"];
const TERMS = ["First Term", "Second Term", "Third Term"];

export default function InvoicesPage() {
    const { toast } = useToast();

    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedClassGroup, setSelectedClassGroup] = useState('');
    const [selectedSession, setSelectedSession] = useState(SESSIONS[0]);
    const [selectedTerm, setSelectedTerm] = useState(TERMS[0]);

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);

    const fetchInvoices = useCallback(async () => {
        setIsLoadingInvoices(true);
        try {
            const fetchedInvoices = await dbService.getDocs<Invoice>('invoices', [{ type: 'orderBy', fieldPath: 'createdAt', direction: 'asc' }]);
            setInvoices(fetchedInvoices);
        } catch (error) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not fetch invoices.'
            });
        } finally {
            setIsLoadingInvoices(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);


    const handleGenerate = async () => {
        if (!selectedClassGroup) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a class group.' });
            return;
        }
        setIsGenerating(true);
        try {
            const result = await generateInvoicesForClassGroup(selectedClassGroup, selectedSession, selectedTerm);

            if (result.error) throw new Error(result.error);
            
            toast({
                title: 'Invoice Generation Complete',
                description: `${result.generatedCount} new invoices were created for ${selectedClassGroup}. ${result.skippedCount} students already had invoices and were skipped.`,
                duration: 7000
            });

            fetchInvoices(); // Refresh the list

        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Generation Failed',
                description: error.message || 'An unexpected error occurred.',
                duration: 9000,
            });
        } finally {
            setIsGenerating(false);
        }
    };
    
    const getStatusVariant = (status: Invoice['status']) => {
        switch (status) {
            case 'Paid': return 'default';
            case 'Unpaid': return 'secondary';
            case 'Overdue': return 'destructive';
            default: return 'outline';
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="font-headline text-3xl font-bold">Invoices</h1>
                <p className="text-muted-foreground">
                    Generate, send, and track student invoices.
                </p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Generate Invoices</CardTitle>
                    <CardDescription>
                        Select a class group, session, and term to generate invoices for all students based on the active fee structure.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Important Note</AlertTitle>
                        <AlertDescription>
                           The system will automatically skip any student who already has an invoice for the selected term and session to prevent duplicates.
                        </AlertDescription>
                    </Alert>

                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <Select onValueChange={setSelectedClassGroup} value={selectedClassGroup} disabled={isGenerating}>
                            <SelectTrigger>
                            <SelectValue placeholder="Select Class Group" />
                            </SelectTrigger>
                            <SelectContent>
                            {CLASS_GROUPS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                         <Select onValueChange={setSelectedSession} value={selectedSession} disabled={isGenerating}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Session" />
                            </SelectTrigger>
                            <SelectContent>
                                {SESSIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                         <Select onValueChange={setSelectedTerm} value={selectedTerm} disabled={isGenerating}>
                             <SelectTrigger>
                                <SelectValue placeholder="Select Term" />
                            </SelectTrigger>
                            <SelectContent>
                                {TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <Button onClick={handleGenerate} disabled={isGenerating || !selectedClassGroup} size="lg" className="w-full md:w-auto">
                        {isGenerating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating for {selectedClassGroup}...
                            </>
                        ) : (
                           <>
                             <FileText className="mr-2 h-4 w-4" />
                             Generate Invoices
                           </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            <Card>
                 <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Invoice History</CardTitle>
                        <CardDescription>
                           A list of all generated invoices.
                        </CardDescription>
                    </div>
                    <Button variant="outline" size="icon" onClick={fetchInvoices} disabled={isLoadingInvoices}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                 </CardHeader>
                 <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Student</TableHead>
                                <TableHead>Class</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                         <TableBody>
                            {isLoadingInvoices ? (
                                Array.from({length: 5}).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : invoices.length > 0 ? (
                                invoices.map(invoice => (
                                    <TableRow key={invoice.id}>
                                        <TableCell>
                                            <div className="font-medium">{invoice.studentName}</div>
                                            <div className="text-xs text-muted-foreground">{invoice.invoiceId}</div>
                                        </TableCell>
                                        <TableCell>{invoice.class}</TableCell>
                                        <TableCell>NGN {invoice.totalAmount.toLocaleString()}</TableCell>
                                        <TableCell>{invoice.dueDate?.seconds ? format(new Date(invoice.dueDate.seconds * 1000), 'PPP') : 'N/A'}</TableCell>
                                        <TableCell><Badge variant={getStatusVariant(invoice.status)}>{invoice.status}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <Button asChild variant="outline" size="sm">
                                                <Link href={`/dashboard/accountant/invoices/${invoice.id}`}>
                                                   <Eye className="mr-2 h-4 w-4" /> View
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                        No invoices found. Generate invoices to see them here.
                                    </TableCell>
                                </TableRow>
                            )}
                         </TableBody>
                    </Table>
                 </CardContent>
            </Card>
        </div>
    );
}
