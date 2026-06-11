

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { dbService } from '@/lib/dbService';
import type { Invoice, Payment, Student } from '@/lib/schema';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Loader2, Search, CheckCircle, RefreshCw, Eye, Trash2, Upload, Download, FileCheck2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { recordPayment, deletePayment } from '@/actions/payment-actions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DatePicker } from '@/components/ui/date-picker';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format, addDays, differenceInDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useRole } from '@/context/role-context';
import * as XLSX from 'xlsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


const paymentSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice ID is required'),
  amountPaid: z.coerce.number().positive('Payment amount must be positive'),
  paymentDate: z.date({ required_error: 'Payment date is required' }),
  paymentMethod: z.enum(['Bank Transfer', 'POS', 'Cash'], { required_error: 'Payment method is required' }),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

type BankTransaction = {
  Date: Date;
  Description: string;
  Amount: number;
  __rowNum__: number;
};

type MatchedTransaction = {
  bankTx: BankTransaction;
  portalTx: Payment;
  matchType: 'Exact';
};

type ReconciliationResult = {
  matched: MatchedTransaction[];
  unmatchedBank: BankTransaction[];
  unmatchedPortal: Payment[];
};


export default function PaymentsPage() {
  const [invoiceIdToSearch, setInvoiceIdToSearch] = useState('');
  const [foundInvoice, setFoundInvoice] = useState<Invoice | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);
  const { user } = useRole();

  const { toast } = useToast();
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      invoiceId: '',
      amountPaid: 0,
      paymentMethod: 'Bank Transfer',
      notes: '',
      paymentDate: undefined,
    }
  });

    const [isReconciling, setIsReconciling] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [reconciliationResult, setReconciliationResult] = useState<ReconciliationResult | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchRecentPayments = useCallback(async () => {
    setIsLoadingPayments(true);
    try {
        const payments = await dbService.getDocs<Payment>('payments', [
            { type: 'orderBy', fieldPath: 'paymentDate', direction: 'desc' },
            { type: 'limit', limitCount: 20 }
        ]);
        setRecentPayments(payments);
    } catch (error) {
        console.error("Error fetching recent payments:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch recent payments.' });
    } finally {
        setIsLoadingPayments(false);
    }
  }, [toast]);
  
  useEffect(() => {
    fetchRecentPayments();
  }, [fetchRecentPayments]);


  const handleSearchInvoice = useCallback(async (id?: string) => {
    const searchId = id || invoiceIdToSearch;
    if (!searchId) {
      setSearchError('Please enter an Invoice ID to search.');
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    setFoundInvoice(null);
    form.reset({
      paymentMethod: 'Bank Transfer',
      notes: '',
      amountPaid: 0,
      paymentDate: undefined,
      invoiceId: ''
    });

    try {
      const invoices = await dbService.getDocs<Invoice>('invoices', [
        { type: 'where', fieldPath: 'invoiceId', opStr: '==', value: searchId.trim() },
        { type: 'limit', limitCount: 1 }
      ]);
      const invoice = invoices[0];
      if (invoice) {
        if (invoice.status === 'Paid') {
            setSearchError(`This invoice has already been fully paid.`);
        } else {
            setFoundInvoice(invoice);
            form.setValue('invoiceId', invoice.invoiceId);
        }
      } else {
        setSearchError(`No invoice found with ID: ${searchId}`);
      }
    } catch (error: any) {
      setSearchError(error.message || 'An error occurred during search.');
    } finally {
      setIsSearching(false);
    }
  }, [invoiceIdToSearch, form]);

  const onSubmit = async (values: PaymentFormValues) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
        return;
    }
    try {
        const result = await recordPayment({ ...values, userId: user.uid });
        if(result.error) throw new Error(result.error);

        toast({
            title: 'Payment Recorded!',
            description: result.message,
            duration: 8000,
        });
        setFoundInvoice(null);
        setInvoiceIdToSearch('');
        form.reset();
        fetchRecentPayments();

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Payment Failed',
            description: error.message,
        });
    }
  }

  const handleDelete = async (paymentId: string) => {
    try {
      const result = await deletePayment(paymentId);
      if (result.error) {
        throw new Error(result.error);
      }
      toast({ title: 'Success', description: 'Payment record deleted successfully.' });
      fetchRecentPayments();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

   const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsReconciling(true);
        setFileName(file.name);
        setReconciliationResult(null);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, {
                    raw: false,
                });

                const bankTransactions: BankTransaction[] = rawJson
                    .map((row, index) => {
                        if (!row.Date || !row.Amount) {
                            return null;
                        }
                        
                        let date: Date;
                        if (row.Date instanceof Date) {
                            date = row.Date;
                        } else {
                            // Attempt to parse string dates (common in CSVs)
                            const parsedDate = new Date(row.Date);
                             if (isNaN(parsedDate.getTime())) {
                                console.warn(`Skipping row ${index + 2} due to invalid date format:`, row.Date);
                                return null;
                            }
                            date = parsedDate;
                        }

                        return {
                            Date: date,
                            Description: row.Description || '',
                            Amount: row.Amount,
                            __rowNum__: index + 2,
                        };
                    })
                    .filter((tx): tx is BankTransaction => tx !== null);


                if (bankTransactions.length === 0) {
                    throw new Error("No valid transactions found in the file. Ensure 'Date' and 'Amount' columns exist and are populated.");
                }

                await runReconciliation(bankTransactions);
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'File Read Error',
                    description: error.message || 'Could not parse the uploaded file.',
                });
                setIsReconciling(false);
                setFileName(null);
            }
        };
        reader.onerror = () => {
            toast({
                variant: 'destructive',
                title: 'File Read Error',
                description: 'There was a problem reading the file.',
            });
            setIsReconciling(false);
            setFileName(null);
        };
        reader.readAsBinaryString(file);
    };

    const runReconciliation = async (bankTransactions: BankTransaction[]) => {
        const validBankTxs = bankTransactions.filter(tx => tx.Amount > 0);
        if (validBankTxs.length === 0) {
            toast({ title: "No credit transactions found", description: "The statement contains no incoming payments to reconcile." });
            setIsReconciling(false);
            return;
        }

        const dates = validBankTxs.map(tx => tx.Date).sort((a, b) => a.getTime() - b.getTime());
        const minDate = dates[0];
        const maxDate = addDays(dates[dates.length - 1], 1); 

        try {
            const portalPayments = await dbService.getDocs<Payment>('payments', [
                { type: 'where', fieldPath: 'paymentDate', opStr: '>=', value: minDate },
                { type: 'where', fieldPath: 'paymentDate', opStr: '<=', value: maxDate },
            ]);
            
            const result: ReconciliationResult = {
                matched: [],
                unmatchedBank: [],
                unmatchedPortal: [...portalPayments]
            };
            
            const mutableBankTxs = [...validBankTxs];

            // Pass 1: Exact match on amount and date
            for (let i = mutableBankTxs.length - 1; i >= 0; i--) {
                const bankTx = mutableBankTxs[i];
                let foundMatch = false;
                for (let j = result.unmatchedPortal.length - 1; j >= 0; j--) {
                    const portalTx = result.unmatchedPortal[j];
                    const portalDate = new Date(portalTx.paymentDate.seconds * 1000);
                    
                    const amountMatches = portalTx.amountPaid === bankTx.Amount;
                    const dateDifference = Math.abs(differenceInDays(bankTx.Date, portalDate));

                    if (amountMatches && dateDifference <= 2) {
                        result.matched.push({ bankTx, portalTx, matchType: 'Exact' });
                        result.unmatchedPortal.splice(j, 1);
                        mutableBankTxs.splice(i, 1);
                        foundMatch = true;
                        break;
                    }
                }
            }
            
            result.unmatchedBank = mutableBankTxs;

            setReconciliationResult(result);
            toast({ title: 'Reconciliation Complete', description: 'Review the matched and unmatched transactions below.' });

        } catch (error: any) {
            console.error("Error during reconciliation:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch portal payment records.' });
        } finally {
            setIsReconciling(false);
        }
    };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold">Payments & Reconciliation</h1>
        <p className="text-muted-foreground">
          Record fee payments and reconcile bank statements.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Record New Payment</CardTitle>
          <CardDescription>Search for an invoice by its ID to record a payment against it.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="flex gap-2">
                 <div className="flex-1">
                    <Label htmlFor="invoice-search">Invoice ID</Label>
                    <Input
                        id="invoice-search"
                        placeholder="e.g., INV-2024-00123"
                        value={invoiceIdToSearch}
                        onChange={(e) => setInvoiceIdToSearch(e.target.value)}
                        disabled={isSearching}
                    />
                 </div>
                 <Button onClick={() => handleSearchInvoice()} disabled={isSearching || !invoiceIdToSearch} className="self-end">
                     {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                    Search
                 </Button>
            </div>
            
            {searchError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{searchError}</AlertDescription></Alert>}
            
            {foundInvoice && (
                <Card className="bg-secondary/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-600"><CheckCircle /> Invoice Found</CardTitle>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                            <p><strong>Student:</strong> {foundInvoice.studentName}</p>
                            <p><strong>Class:</strong> {foundInvoice.class}</p>
                            <p><strong>Total Due:</strong> NGN {foundInvoice.totalAmount.toLocaleString()}</p>
                            <p><strong>Balance:</strong> NGN {foundInvoice.balance.toLocaleString()}</p>
                        </div>
                    </CardHeader>
                    <CardContent>
                       <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <FormField control={form.control} name="amountPaid" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Amount Being Paid (NGN)</FormLabel>
                                            <FormControl><Input type="number" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                     <FormField control={form.control} name="paymentDate" render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel className="mb-1">Payment Date</FormLabel>
                                            <DatePicker value={field.value} onChange={field.onChange} />
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Payment Method</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                                    <SelectItem value="POS">POS</SelectItem>
                                                    <SelectItem value="Cash">Cash</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                     <FormField control={form.control} name="notes" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Notes / Reference</FormLabel>
                                            <FormControl><Input placeholder="e.g., Transfer reference number" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                 </div>

                                <Button type="submit" disabled={form.formState.isSubmitting}>
                                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Record Payment
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            )}
        </CardContent>
      </Card>
      
       <Card>
          <CardHeader>
              <CardTitle>Bank Statement Reconciliation</CardTitle>
              <CardDescription>
                  Upload a bank statement (CSV or Excel) to automatically match transactions with portal payments.
              </CardDescription>
          </CardHeader>
          <CardContent>
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
                  <Input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleFileSelect}
                      disabled={isReconciling}
                  />
                   <div className="mb-4">
                      {isReconciling ? (
                          <Loader2 className="h-12 w-12 animate-spin text-primary" />
                      ) : (
                          <FileCheck2 className="h-12 w-12 text-muted-foreground" />
                      )}
                  </div>
                  <h3 className="text-lg font-semibold">{fileName || "Upload Your Bank Statement"}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                     {isReconciling ? "Processing file, please wait..." : "Or use our sample file for testing."}
                  </p>
                  <div className="flex gap-4">
                    <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isReconciling}
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        {fileName ? 'Upload Different File' : 'Choose File'}
                    </Button>
                    <Button variant="secondary" asChild>
                        <a href="/sample-bank-statement.csv" download>
                           <Download className="mr-2 h-4 w-4" />
                           Download Sample
                        </a>
                    </Button>
                  </div>
              </div>
          </CardContent>
      </Card>

        {reconciliationResult && (
            <Tabs defaultValue="unmatched-bank">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="unmatched-bank">Unmatched from Bank ({reconciliationResult.unmatchedBank.length})</TabsTrigger>
                    <TabsTrigger value="matched">Matched ({reconciliationResult.matched.length})</TabsTrigger>
                    <TabsTrigger value="unmatched-portal">Unmatched from Portal ({reconciliationResult.unmatchedPortal.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="unmatched-bank">
                    <Card>
                        <CardHeader><CardTitle>Unmatched from Bank Statement</CardTitle><CardDescription>These transactions appeared on the bank statement but have no corresponding record in the portal. You may need to record these payments manually above.</CardDescription></CardHeader>
                        <CardContent>
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Bank Date</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reconciliationResult.unmatchedBank.map(tx => (
                                        <TableRow key={tx.__rowNum__}>
                                            <TableCell>{format(tx.Date, 'PPP')}</TableCell>
                                            <TableCell>{tx.Description}</TableCell>
                                            <TableCell className="font-medium text-right">NGN {tx.Amount.toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                    {reconciliationResult.unmatchedBank.length === 0 && <TableRow><TableCell colSpan={3} className="h-24 text-center">All bank transactions were matched.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="matched">
                    <Card>
                        <CardHeader><CardTitle>Matched Transactions</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Portal Date</TableHead>
                                        <TableHead>Student Name</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Match Type</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reconciliationResult.matched.map(({ portalTx, matchType }) => (
                                        <TableRow key={portalTx.id}>
                                            <TableCell>{format(new Date(portalTx.paymentDate.seconds * 1000), 'PPP')}</TableCell>
                                            <TableCell>{portalTx.studentName}</TableCell>
                                            <TableCell className="font-medium">NGN {portalTx.amountPaid.toLocaleString()}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{matchType}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                     {reconciliationResult.matched.length === 0 && <TableRow><TableCell colSpan={4} className="h-24 text-center">No transactions were automatically matched.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="unmatched-portal">
                     <Card>
                        <CardHeader><CardTitle>Unmatched from Portal Records</CardTitle><CardDescription>These payments were recorded in the portal but could not be found on the bank statement for the period. This may be due to date discrepancies or payments not yet reflecting in the bank.</CardDescription></CardHeader>
                        <CardContent>
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Portal Date</TableHead>
                                        <TableHead>Student Name</TableHead>
                                        <TableHead>Amount</TableHead>
                                         <TableHead>Method</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reconciliationResult.unmatchedPortal.map(tx => (
                                        <TableRow key={tx.id}>
                                             <TableCell>{format(new Date(tx.paymentDate.seconds * 1000), 'PPP')}</TableCell>
                                            <TableCell>{tx.studentName}</TableCell>
                                            <TableCell className="font-medium">NGN {tx.amountPaid.toLocaleString()}</TableCell>
                                            <TableCell><Badge variant="secondary">{tx.paymentMethod}</Badge></TableCell>
                                        </TableRow>
                                    ))}
                                     {reconciliationResult.unmatchedPortal.length === 0 && <TableRow><TableCell colSpan={4} className="h-24 text-center">All portal payments were matched.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Recent Payments</CardTitle>
                <CardDescription>A log of the most recently recorded payments.</CardDescription>
            </div>
            <Button variant="outline" size="icon" onClick={fetchRecentPayments} disabled={isLoadingPayments}>
                <RefreshCw className="h-4 w-4" />
            </Button>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Amount Paid (NGN)</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead>Payment Date</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                     {isLoadingPayments ? (
                        Array.from({length: 5}).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                            </TableRow>
                        ))
                    ) : recentPayments.length > 0 ? (
                        recentPayments.map(payment => (
                            <TableRow key={payment.id}>
                                <TableCell>
                                    <div className="font-medium">{payment.studentName}</div>
                                    <div className="text-xs text-muted-foreground">{payment.invoiceId}</div>
                                </TableCell>
                                <TableCell>{payment.amountPaid.toLocaleString()}</TableCell>
                                <TableCell><Badge variant="secondary">{payment.paymentMethod}</Badge></TableCell>
                                <TableCell>{format(new Date(payment.paymentDate.seconds * 1000), 'PPP')}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={`/dashboard/receipts/${payment.id}`}>
                                            <Eye className="mr-2 h-4 w-4" /> View
                                        </Link>
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="sm">
                                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete the payment record and reverse its effect on the invoice balance.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleDelete(payment.id)}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                No payments have been recorded yet.
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
