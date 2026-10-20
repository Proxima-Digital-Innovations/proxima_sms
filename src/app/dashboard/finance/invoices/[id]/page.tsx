"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getInvoiceById, recordPayment } from "@/actions/billing-actions";
import { getSystemSettings } from "@/actions/system-actions";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  CreditCard, 
  Printer, 
  CheckCircle2, 
  FileText, 
  Wallet, 
  Calendar, 
  User, 
  School, 
  Landmark, 
  Download,
  AlertCircle,
  Receipt,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<any>(null);
  const [schoolProfile, setSchoolProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchInvoiceAndSettings();
  }, [id]);

  const fetchInvoiceAndSettings = async () => {
    try {
      const [invoiceData, settingsRes] = await Promise.all([
        getInvoiceById(id),
        getSystemSettings(),
      ]);

      if (invoiceData) {
        setInvoice(invoiceData);
        setPaymentAmount(invoiceData.balance > 0 ? invoiceData.balance.toString() : "");
      } else {
        toast.error("Invoice not found");
        router.push("/dashboard/finance/invoices");
      }

      if (settingsRes.success && settingsRes.data) {
        setSchoolProfile(settingsRes.data);
      }
    } catch (e) {
      toast.error("Failed to load invoice details");
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount greater than zero");
      return;
    }
    if (amount > invoice.balance) {
      toast.error(`Payment cannot exceed outstanding balance of ₦${invoice.balance.toLocaleString()}`);
      return;
    }

    setProcessing(true);
    try {
      await recordPayment({
        invoiceId: id,
        amount,
        method: paymentMethod,
        reference: reference.trim() || undefined,
      });

      toast.success("Payment recorded successfully");
      const updated = await getInvoiceById(id);
      if (updated) {
        setInvoice(updated);
        setPaymentAmount(updated.balance > 0 ? updated.balance.toString() : "");
      }
      setReference("");
    } catch (e: any) {
      toast.error(e.message || "Failed to record payment");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-16">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">Loading verified invoice details...</p>
        </div>
      </div>
    );
  }

  if (!invoice) return null;

  const normalizedStatus = (invoice.status || "").toUpperCase();
  const isPaid = normalizedStatus === "PAID" || Number(invoice.balance) <= 0;
  const isPartial = !isPaid && (normalizedStatus === "PARTIAL" || Number(invoice.amountPaid) > 0);

  const schoolName = schoolProfile?.name || "Proxima SMS Academy";
  const schoolAddress = schoolProfile?.address || "Main Campus, Education Boulevard";
  const schoolEmail = schoolProfile?.email || "finance@school.edu";
  const schoolPhone = schoolProfile?.phone || "+234 800 000 0000";

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-5xl mx-auto">
      {/* Top Controls (Hidden on Print) */}
      <div className="flex items-center justify-between print:hidden gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push("/dashboard/finance/invoices")} 
          className="text-muted-foreground hover:text-foreground rounded-xl"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Invoices
        </Button>
        <div className="flex items-center gap-2.5">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.print()} 
            className="gap-2 rounded-xl border-border bg-background hover:bg-muted font-semibold text-xs h-9 shadow-sm"
          >
            <Printer className="h-4 w-4 text-muted-foreground" /> Print / Save PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* INVOICE PREVIEW CARD */}
        <div className="md:col-span-8 space-y-6">
          <Card className="border-border shadow-sm p-8 bg-card text-card-foreground print:shadow-none print:border-none print:p-0 rounded-2xl relative overflow-hidden">
            {/* Watermark for Print */}
            <div className="hidden print:block absolute inset-0 pointer-events-none opacity-5 flex items-center justify-center select-none">
              <span className="text-8xl font-black uppercase tracking-widest rotate-[-30deg]">
                {isPaid ? "PAID" : "INVOICE"}
              </span>
            </div>

            {/* Header: School Info & Invoice Title */}
            <div className="flex justify-between items-start mb-8 gap-4 border-b border-border pb-6">
              <div>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary print:hidden">
                    <FileText className="h-6 w-6" />
                  </div>
                  <h1 className="text-3xl font-black tracking-tight uppercase text-foreground">
                    OFFICIAL INVOICE
                  </h1>
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  #INV-{invoice.id.substring(0, 8).toUpperCase()}
                </p>
                <div className="mt-2.5">
                  {isPaid ? (
                    <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800 font-bold px-3 py-1 text-xs">
                      Paid in Full
                    </Badge>
                  ) : isPartial ? (
                    <Badge className="bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800 font-bold px-3 py-1 text-xs">
                      Partial Settlement
                    </Badge>
                  ) : (
                    <Badge className="bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/50 dark:text-rose-200 dark:border-rose-800 font-bold px-3 py-1 text-xs">
                      Unpaid
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right space-y-1">
                <h2 className="text-base font-bold text-foreground">{schoolName}</h2>
                <p className="text-xs text-muted-foreground">{schoolAddress}</p>
                <p className="text-xs text-muted-foreground">{schoolEmail}</p>
                {schoolPhone && <p className="text-xs text-muted-foreground">{schoolPhone}</p>}
              </div>
            </div>

            {/* Billed To & Dates */}
            <div className="grid grid-cols-2 gap-4 mb-8 pt-2">
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Billed To (Student)</p>
                <h3 className="text-base font-bold text-foreground">
                  {invoice.student.firstName} {invoice.student.lastName}
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  Admission ID: <span className="font-semibold text-foreground">{invoice.student.studentId}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Class: <span className="font-semibold text-foreground">{invoice.student.class?.name || "Unassigned"}</span>
                </p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Billing Metadata</p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Issued Date:</span> {new Date(invoice.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Due Date:</span>{" "}
                  <span className={new Date(invoice.dueDate) < new Date() && !isPaid ? "text-rose-600 font-bold" : ""}>
                    {new Date(invoice.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </p>
                {invoice.term && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Academic Cycle:</span> {invoice.term.name} {invoice.term.session?.name ? `(${invoice.term.session.name})` : ""}
                  </p>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div className="rounded-xl border border-border overflow-hidden mb-6">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">Fee Description</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-right">Assessment Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-semibold text-foreground py-4 text-sm">
                      {invoice.description || "Tuition & Academic Fees"}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold py-4 text-sm text-foreground">
                      ₦{invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Summary Totals */}
            <div className="flex justify-end pt-2">
              <div className="w-80 space-y-2 text-sm bg-muted/20 p-4 rounded-xl border border-border/80">
                <div className="flex justify-between text-muted-foreground text-xs">
                  <span>Subtotal Amount:</span>
                  <span className="font-mono font-semibold text-foreground">
                    ₦{invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 text-xs">
                  <span>Total Amount Paid:</span>
                  <span className="font-mono font-bold">
                    ₦{invoice.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-2.5 border-t border-border items-center">
                  <span className="text-foreground">Outstanding Balance:</span>
                  <span className={cn(
                    "font-mono text-base font-black",
                    isPaid ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  )}>
                    ₦{invoice.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Receipts History */}
            {invoice.receipts && invoice.receipts.length > 0 && (
              <div className="mt-8 pt-6 border-t border-border print:mt-6">
                <h4 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2 text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Verified Payment Receipts ({invoice.receipts.length})
                </h4>
                <div className="space-y-2">
                  {invoice.receipts.map((receipt: any) => (
                    <div key={receipt.id} className="flex justify-between items-center p-3 rounded-xl border border-border bg-muted/20 text-xs">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-foreground">
                          {new Date(receipt.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} • {receipt.method.replace("_", " ")}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {receipt.reference ? `Ref: ${receipt.reference} • ` : ""}
                          Logged by: {receipt.loggedBy ? `${receipt.loggedBy.firstName} ${receipt.loggedBy.lastName}` : "System Accountant"}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        +₦{receipt.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Official Footer / Signature Lines (Visible on Print) */}
            <div className="hidden print:grid grid-cols-2 gap-8 mt-12 pt-8 border-t border-border text-xs text-muted-foreground">
              <div>
                <p className="font-bold text-foreground mb-1">Official Payment Instructions:</p>
                <p>Payments can be made via bank transfer or direct POS at the bursary.</p>
                <p className="mt-1">Please retain this invoice as proof of billing assessment.</p>
              </div>
              <div className="text-right flex flex-col justify-end items-end">
                <div className="w-48 border-b border-foreground/60 mb-1" />
                <p className="font-semibold text-foreground">Bursar / Authorized Officer</p>
                <p className="text-[10px] text-muted-foreground">Stamp & Signature</p>
              </div>
            </div>
          </Card>
        </div>

        {/* PAYMENT TERMINAL / SETTLEMENT STATUS CARD (HIDDEN ON PRINT) */}
        <div className="md:col-span-4 space-y-4 print:hidden">
          {!isPaid ? (
            <Card className="border-border shadow-sm rounded-2xl overflow-hidden bg-card">
              <CardHeader className="pb-3 border-b border-border bg-muted/20">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Record Settlement
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Post a partial or full payment receipt to clear student balance.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {/* Outstanding Balance Banner */}
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                  <span className="text-amber-800 dark:text-amber-300 font-semibold block">Outstanding Amount:</span>
                  <p className="text-xl font-black font-mono text-amber-950 dark:text-amber-100 mt-0.5">
                    ₦{invoice.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Amount to Pay (₦)</label>
                    <button 
                      type="button" 
                      onClick={() => setPaymentAmount(invoice.balance.toString())}
                      className="text-[11px] text-primary hover:underline font-bold"
                    >
                      Pay Full Balance
                    </button>
                  </div>
                  <div className="relative">
                    <Wallet className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      className="pl-9 font-mono font-bold rounded-xl h-10"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0.00"
                      max={invoice.balance}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Payment Method</label>
                  <select
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CASH">Cash</option>
                    <option value="POS">POS / Debit Card</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="ONLINE">Online Portal</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Transaction Ref / Teller #</label>
                  <Input
                    placeholder="e.g. TRX-982341 or Teller ID"
                    className="rounded-xl h-10 text-xs"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </div>

                <Button
                  onClick={handlePayment}
                  disabled={processing || !paymentAmount || parseFloat(paymentAmount) <= 0}
                  className="w-full gap-2 font-bold shadow-sm rounded-xl h-10 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {processing ? "Recording Payment..." : "Confirm Payment"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-emerald-500/30 shadow-sm bg-emerald-500/5 text-card-foreground rounded-2xl overflow-hidden">
              <CardContent className="p-6 text-center space-y-3">
                <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
                  <Check className="h-7 w-7 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Invoice Cleared in Full</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    All financial obligations under this invoice have been fully settled.
                  </p>
                </div>
                <div className="p-3 bg-background rounded-xl border border-border/80 text-xs text-muted-foreground">
                  <div className="flex justify-between font-mono">
                    <span>Total Settled:</span>
                    <span className="font-bold text-foreground">₦{invoice.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-mono mt-1">
                    <span>Balance Remaining:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">₦0.00</span>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.print()}
                  className="w-full rounded-xl text-xs font-semibold gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Official Receipt
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
