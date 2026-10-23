'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getWardInvoicesAndReceipts } from "@/actions/parent-actions";
import { payInvoiceWithWallet } from "@/actions/wallet-actions";
import { useToast } from "@/hooks/use-toast";
import { 
  Receipt, 
  CreditCard, 
  Wallet, 
  Users, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  Building2, 
  Clock, 
  FileText,
  Zap,
  ArrowRight
} from "lucide-react";
import Link from "next/link";

export default function ParentInvoicesPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);

  const fetchData = useCallback(async (studentId?: string) => {
    setIsLoading(true);
    try {
      const res: any = await getWardInvoicesAndReceipts(studentId);
      if (res.success) {
        setData(res);
        if (!studentId && res.selectedWard?.id) {
          setSelectedStudentId(res.selectedWard.id);
        }
      }
    } catch (err) {
      console.error("Error loading invoice data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(selectedStudentId || undefined);
  }, [fetchData, selectedStudentId]);

  const handlePayWithWallet = async (invoiceId: string) => {
    setPayingInvoiceId(invoiceId);
    try {
      const res = await payInvoiceWithWallet(invoiceId);
      if (res.success) {
        toast({
          title: "Invoice Settled Successfully!",
          description: `₦${res.amountPaid?.toLocaleString()} was paid from your School Wallet.`,
        });
        fetchData(selectedStudentId || undefined);
      } else {
        toast({
          variant: "destructive",
          title: "Payment Failed",
          description: res.error || "Unable to settle invoice.",
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "An unexpected error occurred.",
      });
    } finally {
      setPayingInvoiceId(null);
    }
  };

  const wards = data?.wards || [];
  const selectedWard = data?.selectedWard;
  const invoices = data?.invoices || [];
  const receipts = data?.receipts || [];
  const wallet = data?.wallet || { balance: 0, accountNumber: '' };
  const summary = data?.summary || { totalBilled: 0, totalPaid: 0, outstanding: 0 };

  return (
    <div className="space-y-5 w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button asChild variant="ghost" size="sm" className="-ml-2 h-7 text-xs text-muted-foreground">
              <Link href="/dashboard">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Receipt className="h-7 w-7 text-primary" />
            Fee Invoices & Official Receipts
          </h1>
          <p className="text-sm text-muted-foreground">
            Track tuition fee schedules, view payment history, and download official receipts.
          </p>
        </div>

        {/* Multi-Child Selector */}
        {wards.length > 1 && (
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-3 py-1.5 shadow-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground">Ward:</span>
            <Select value={selectedStudentId} onValueChange={(val) => setSelectedStudentId(val)}>
              <SelectTrigger className="w-[180px] h-8 text-xs font-medium border-0 shadow-none focus:ring-0">
                <SelectValue placeholder="Select child" />
              </SelectTrigger>
              <SelectContent>
                {wards.map((w: any) => (
                  <SelectItem key={w.id} value={w.id} className="text-xs">
                    {w.firstName} {w.lastName} ({w.class?.name || 'Class'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Summary Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Invoiced</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-foreground">
              ₦{summary.totalBilled.toLocaleString()}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Across all terms for {selectedWard?.firstName || 'student'}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Paid</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              ₦{summary.totalPaid.toLocaleString()}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Verified school payments</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Outstanding Due</CardTitle>
            <AlertCircle className={`h-4 w-4 ${summary.outstanding > 0 ? 'text-destructive' : 'text-emerald-500'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold font-mono ${summary.outstanding > 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
              ₦{summary.outstanding.toLocaleString()}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {summary.outstanding > 0 ? 'Pending invoice settlement' : 'All invoices fully settled'}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">School Wallet</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-primary">
              ₦{(wallet.balance || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center justify-between mt-2">
              <Button asChild variant="outline" size="sm" className="h-7 text-xs rounded-lg">
                <Link href="/dashboard/parent/wallet">
                  <Zap className="h-3 w-3 mr-1 text-primary" />
                  Fund Wallet
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs: Invoices vs Payment Receipts */}
      <Tabs defaultValue="invoices" className="space-y-6">
        <TabsList className="bg-muted p-1 rounded-xl">
          <TabsTrigger value="invoices" className="rounded-lg text-xs font-semibold px-4 py-2">
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Ward Invoices ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="receipts" className="rounded-lg text-xs font-semibold px-4 py-2">
            <Receipt className="h-3.5 w-3.5 mr-1.5" />
            Official Receipts ({receipts.length})
          </TabsTrigger>
        </TabsList>

        {/* INVOICES TAB */}
        <TabsContent value="invoices" className="space-y-4">
          {isLoading ? (
            <Card className="p-8">
              <Skeleton className="h-48 w-full" />
            </Card>
          ) : invoices.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
              <h3 className="text-lg font-semibold">No Invoices Found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                There are no fee invoices billed to {selectedWard?.firstName || 'this student'}.
              </p>
            </Card>
          ) : (
            <div className="border border-border rounded-2xl overflow-hidden bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3.5 px-4 text-left">Description</th>
                      <th className="py-3.5 px-4 text-left">Term</th>
                      <th className="py-3.5 px-4 text-right">Total Amount</th>
                      <th className="py-3.5 px-4 text-right">Amount Paid</th>
                      <th className="py-3.5 px-4 text-right">Balance Due</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {invoices.map((inv: any) => {
                      const isPaid = (inv.balance || 0) <= 0 || inv.status === 'PAID';
                      const canPayWallet = (wallet.balance || 0) >= (inv.balance || 0);

                      return (
                        <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-foreground">{inv.description}</div>
                            <div className="text-[11px] font-mono text-muted-foreground">ID: {inv.id.slice(-8).toUpperCase()}</div>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-muted-foreground font-medium">
                            {inv.term?.name || 'Academic Term'}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-medium">
                            ₦{inv.amount.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400">
                            ₦{(inv.amountPaid || 0).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-foreground">
                            ₦{(inv.balance || 0).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {isPaid ? (
                              <Badge className="bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs">
                                Paid
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs">
                                Pending
                              </Badge>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {isPaid ? (
                              <div className="inline-flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 gap-1">
                                <CheckCircle2 className="h-4 w-4" /> Settled
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handlePayWithWallet(inv.id)}
                                  disabled={payingInvoiceId === inv.id || !canPayWallet}
                                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                >
                                  <Wallet className="h-3 w-3" />
                                  {payingInvoiceId === inv.id ? 'Processing...' : 'Pay with Wallet'}
                                </Button>
                                <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                                  <Link href={`/dashboard/pay?invoiceId=${inv.id}`}>
                                    Card / Transfer
                                  </Link>
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* RECEIPTS TAB */}
        <TabsContent value="receipts" className="space-y-4">
          {isLoading ? (
            <Card className="p-8">
              <Skeleton className="h-48 w-full" />
            </Card>
          ) : receipts.length === 0 ? (
            <Card className="p-12 text-center">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
              <h3 className="text-lg font-semibold">No Receipts Issued Yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Completed payments will automatically generate official digital receipts here.
              </p>
            </Card>
          ) : (
            <div className="border border-border rounded-2xl overflow-hidden bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3.5 px-4 text-left">Receipt No</th>
                      <th className="py-3.5 px-4 text-left">Fee Item</th>
                      <th className="py-3.5 px-4 text-left">Date Issued</th>
                      <th className="py-3.5 px-4 text-center">Payment Channel</th>
                      <th className="py-3.5 px-4 text-right">Amount Paid</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {receipts.map((rec: any) => (
                      <tr key={rec.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                          {rec.receiptNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-foreground">{rec.invoiceDescription}</div>
                          <div className="text-[11px] text-muted-foreground">{rec.studentName} ({rec.className})</div>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-muted-foreground font-mono">
                          {new Date(rec.paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <Badge variant="secondary" className="font-mono text-[11px] uppercase">
                            {rec.method || 'DIRECT'}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          ₦{rec.amount.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedReceipt(rec)}
                            className="h-8 text-xs gap-1.5"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            View Receipt
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Official Receipt Modal */}
      {selectedReceipt && (
        <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
          <DialogContent className="max-w-lg p-0 overflow-hidden border-border bg-card">
            <div className="p-6 bg-primary/5 border-b border-border text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto mb-2">
                <Building2 className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-foreground font-headline">Proxima Academy</h2>
              <p className="text-xs text-muted-foreground">Official Electronic Payment Receipt</p>
              <div className="mt-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {selectedReceipt.receiptNumber}
                </Badge>
              </div>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <div className="flex justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">Student Name:</span>
                <span className="font-bold text-foreground">{selectedReceipt.studentName}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">Class:</span>
                <span className="font-medium text-foreground">{selectedReceipt.className}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">Fee Description:</span>
                <span className="font-medium text-foreground">{selectedReceipt.invoiceDescription}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">Payment Date:</span>
                <span className="font-mono text-foreground">
                  {new Date(selectedReceipt.paymentDate).toLocaleString('en-GB')}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">Payment Method:</span>
                <span className="font-mono uppercase text-foreground">{selectedReceipt.method || 'WALLET'}</span>
              </div>
              <div className="flex justify-between py-3 border-t border-b border-primary/20 bg-primary/5 px-3 rounded-lg">
                <span className="font-bold text-foreground">Amount Paid:</span>
                <span className="text-xl font-mono font-bold text-primary">
                  ₦{selectedReceipt.amount.toLocaleString()}
                </span>
              </div>

              <div className="text-center pt-2">
                <div className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="h-4 w-4" /> Verified Academic Bursary Clearance
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Computer generated official receipt. No signature required.
                </p>
              </div>
            </div>

            <div className="p-4 bg-muted/40 border-t border-border flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedReceipt(null)}>
                Close
              </Button>
              <Button size="sm" onClick={() => window.print()} className="gap-1.5">
                <Printer className="h-4 w-4" /> Print Receipt
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
