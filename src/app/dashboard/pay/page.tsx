'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  getParentFeeInvoices, 
  initiatePaystackPayment, 
  verifyPaystackReference 
} from '@/actions/paystack-actions';
import { getParentWalletDetails, payInvoiceWithWallet } from '@/actions/wallet-actions';
import { 
  getInvoiceVirtualAccount, 
  confirmBankTransferArrival, 
  submitManualOfflineTransferProof 
} from '@/actions/betastack-actions';
import { 
  CreditCard, 
  Wallet, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Receipt, 
  Users, 
  Clock, 
  Printer, 
  Copy, 
  Check, 
  Landmark, 
  Building2, 
  ArrowRight,
  Lock,
  RefreshCw,
  FileText,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/context/language-context';
import Link from 'next/link';

function ParentPaymentsContent() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedWardId, setSelectedWardId] = useState<string>('ALL');

  // Checkout Dialog State
  const [activeInvoice, setActiveInvoice] = useState<any>(null);
  const [checkoutTab, setCheckoutTab] = useState<string>('TRANSFER');
  const [paymentType, setPaymentType] = useState<'FULL' | 'CUSTOM'>('FULL');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [payerEmail, setPayerEmail] = useState<string>('parent@proximahub.com');

  // Virtual Account state
  const [virtualAccount, setVirtualAccount] = useState<any>(null);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [hasCopiedAccount, setHasCopiedAccount] = useState(false);
  const [isVerifyingTransfer, setIsVerifyingTransfer] = useState(false);

  // Manual Transfer Form state
  const [manualSenderName, setManualSenderName] = useState('');
  const [manualTxRef, setManualTxRef] = useState('');
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [isWalletPaying, setIsWalletPaying] = useState(false);

  // Card payment processing
  const [isCardProcessing, setIsCardProcessing] = useState(false);

  // Verification & Success Modal state
  const [verificationResult, setVerificationResult] = useState<any>(null);

  // Load Invoices
  const loadInvoices = useCallback(async (wardId?: string) => {
    setIsLoading(true);
    try {
      const res = await getParentFeeInvoices(wardId === 'ALL' ? undefined : wardId);
      if (res.success) {
        setData(res);
      }
    } catch (err: any) {
      toast({ title: 'Error loading invoices', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadInvoices(selectedWardId);
  }, [loadInvoices, selectedWardId]);

  // Handle URL callback verification if redirected back from online checkout
  useEffect(() => {
    const ref = searchParams.get('reference');
    if (ref) {
      async function verify(reference: string) {
        try {
          const res = await verifyPaystackReference(reference);
          if (res.success) {
            setVerificationResult(res);
            toast({
              title: 'Payment Confirmed',
              description: `Receipt reference ${reference} has been successfully verified.`,
            });
            loadInvoices(selectedWardId);
          } else {
            toast({
              title: 'Verification Failed',
              description: res.error || 'Could not verify payment reference.',
              variant: 'destructive',
            });
          }
        } catch (err: any) {
          toast({ title: 'Error', description: err.message, variant: 'destructive' });
        } finally {
          router.replace('/dashboard/pay');
        }
      }
      verify(ref);
    }
  }, [searchParams, router, loadInvoices, selectedWardId, toast]);

  // When opening checkout modal, load dedicated virtual account
  const handleOpenCheckout = async (invoice: any) => {
    setActiveInvoice(invoice);
    setPaymentType('FULL');
    setCustomAmount(invoice.balance.toString());
    setVirtualAccount(null);
    setCheckoutTab('WALLET');
    getParentWalletDetails().then((res) => {
      if (res.success && res.wallet) {
        setWalletBalance(res.wallet.balance);
      }
    });

    // Fetch or generate dedicated virtual account
    setLoadingAccount(true);
    try {
      const res = await getInvoiceVirtualAccount(invoice.id);
      if (res.success) {
        setVirtualAccount(res.virtualAccount);
      }
    } catch (err: any) {
      console.error('Failed to load virtual account:', err);
    } finally {
      setLoadingAccount(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setHasCopiedAccount(true);
    toast({ title: 'Copied to Clipboard', description: `Account number ${text} copied.` });
    setTimeout(() => setHasCopiedAccount(false), 2500);
  };

  // Confirm Bank Transfer Arrival (Instant DVA check / simulation)
  const handleConfirmTransfer = async () => {
    if (!activeInvoice || !virtualAccount) return;
    setIsVerifyingTransfer(true);
    try {
      const amount = paymentType === 'FULL' ? activeInvoice.balance : parseFloat(customAmount);
      const res = await confirmBankTransferArrival({
        invoiceId: activeInvoice.id,
        accountNumber: virtualAccount.accountNumber,
        amountTransferred: amount,
      });

      if (res.success) {
        setVerificationResult(res);
        setActiveInvoice(null);
        toast({
          title: 'Transfer Received & Verified!',
          description: 'Payment has settled into the school account and the invoice is updated.',
        });
        loadInvoices(selectedWardId);
      } else {
        toast({ title: 'Check Failed', description: res.error || 'Could not confirm transfer yet.', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsVerifyingTransfer(false);
    }
  };

  // Submit Manual Offline Proof
  const handleSubmitManualProof = async () => {
    if (!activeInvoice) return;
    if (!manualSenderName.trim() || !manualTxRef.trim()) {
      toast({ title: 'Missing Details', description: 'Please enter sender name and transaction reference.', variant: 'destructive' });
      return;
    }

    setIsSubmittingProof(true);
    try {
      const amount = paymentType === 'FULL' ? activeInvoice.balance : parseFloat(customAmount);
      const res = await submitManualOfflineTransferProof({
        invoiceId: activeInvoice.id,
        amount,
        transferDate: new Date().toISOString(),
        bankName: virtualAccount?.settlementDestination?.bankName || 'GTBank',
        senderAccountName: manualSenderName,
        transactionReference: manualTxRef,
      });

      if (res.success) {
        setActiveInvoice(null);
        toast({
          title: 'Proof Submitted to Bursary',
          description: res.message,
        });
        loadInvoices(selectedWardId);
      } else {
        toast({ title: 'Submission Failed', description: res.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmittingProof(false);
    }
  };

  // Pay with School Wallet (Instant 1-Click)
  const handlePayWithWallet = async () => {
    if (!activeInvoice) return;
    const amountToPay = paymentType === 'FULL' ? activeInvoice.balance : parseFloat(customAmount);
    if (isNaN(amountToPay) || amountToPay <= 0) {
      toast({ title: 'Invalid Amount', description: 'Please enter a valid amount.', variant: 'destructive' });
      return;
    }
    setIsWalletPaying(true);
    try {
      const res = await payInvoiceWithWallet(activeInvoice.id, amountToPay);
      if (res.success) {
        toast({
          title: 'Settled from School Wallet',
          description: `₦${amountToPay.toLocaleString()} settled. Receipt: ${res.receipt?.reference}`,
        });
        setActiveInvoice(null);
        loadInvoices(selectedWardId);
      } else {
        toast({ title: 'Payment Failed', description: res.error || 'Could not pay from wallet.', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Payment Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsWalletPaying(false);
    }
  };

  // Pay with Card / Online Gateway
  const handlePayWithCard = async () => {
    if (!activeInvoice) return;
    const amountToPay = paymentType === 'FULL' ? activeInvoice.balance : parseFloat(customAmount);

    if (isNaN(amountToPay) || amountToPay <= 0) {
      toast({ title: 'Invalid Amount', description: 'Please enter a valid amount.', variant: 'destructive' });
      return;
    }

    setIsCardProcessing(true);
    try {
      const res = await initiatePaystackPayment({
        invoiceId: activeInvoice.id,
        amount: amountToPay,
        email: payerEmail,
        studentName: `${activeInvoice.student.firstName} ${activeInvoice.student.lastName}`,
        callbackUrl: typeof window !== 'undefined' ? `${window.location.origin}/dashboard/pay` : undefined,
      });

      if (res.success && 'authorizationUrl' in res && res.authorizationUrl) {
        toast({ title: 'Connecting to Gateway', description: 'Redirecting to payment checkout...' });
        window.location.href = res.authorizationUrl as string;
      } else {
        toast({ title: 'Payment Error', description: res.error || 'Failed to initialize payment.', variant: 'destructive' });
        setIsCardProcessing(false);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      setIsCardProcessing(false);
    }
  };

  const wards = data?.wards || [];
  const invoices = data?.invoices || [];
  const stats = data?.stats || { totalBilled: 0, totalPaid: 0, outstanding: 0 };

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              {language === 'ar' ? 'بوابة سداد الرسوم المدرسية' : 'School Fee Payment Portal'}
            </h1>
            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1 flex items-center">
              <ShieldCheck className="h-3.5 w-3.5" />
              Automated Bank Transfer
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {language === 'ar'
              ? 'سداد الرسوم مباشرة إلى حساب المدرسة عبر التحويل البنكي الفوري مع التأكيد الآلي.'
              : 'Direct bank transfer to the school with automated confirmation and instant receipt issuance.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-3 py-1 text-xs gap-1.5 flex items-center">
            <Lock className="h-3 w-3 text-muted-foreground" />
            GTBank & Betastack Infrastructure
          </Badge>
        </div>
      </div>

      {/* Ward Selector Pills */}
      {wards.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Button
            type="button"
            variant={selectedWardId === 'ALL' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedWardId('ALL')}
            className="rounded-xl text-xs gap-1.5"
          >
            <Users className="h-3.5 w-3.5" />
            All Children ({wards.length})
          </Button>
          {wards.map((w: any) => (
            <Button
              key={w.id}
              type="button"
              variant={selectedWardId === w.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedWardId(w.id)}
              className="rounded-xl text-xs gap-1.5"
            >
              {w.firstName} {w.lastName} ({w.class?.name || 'Student'})
            </Button>
          ))}
        </div>
      )}

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Invoiced</p>
              <p className="text-2xl font-bold font-mono mt-1">
                ₦{stats.totalBilled.toLocaleString()}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{invoices.length} billing statements</p>
            </div>
            <Receipt className="h-8 w-8 text-muted-foreground opacity-50 shrink-0" />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Total Settled</p>
              <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                ₦{stats.totalPaid.toLocaleString()}
              </p>
              <p className="text-[11px] text-emerald-600/80 mt-0.5">Verified receipts generated</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-emerald-500 shrink-0" />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-rose-600 dark:text-rose-400">Outstanding Balance</p>
              <p className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
                ₦{stats.outstanding.toLocaleString()}
              </p>
              <p className="text-[11px] text-rose-600/80 mt-0.5">
                {stats.outstanding > 0 ? 'Payment required' : 'All accounts settled'}
              </p>
            </div>
            <Wallet className="h-8 w-8 text-rose-500 shrink-0" />
          </CardContent>
        </Card>
      </div>

      {/* Invoices List */}
      <Card className="rounded-2xl border-border bg-card shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border p-5">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">Tuition & Fee Statements</CardTitle>
              <CardDescription>
                Transfer directly to the dedicated school account below for automated instant confirmation.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              {invoices.length} Statement(s)
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm">Retrieving fee statements...</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="text-base font-semibold text-foreground">No Outstanding Invoices</p>
              <p className="text-xs text-muted-foreground mt-1">
                All school fees for your registered wards have been fully settled.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {invoices.map((inv: any) => {
                const isPaid = inv.status === 'PAID';
                const isPartial = inv.status === 'PARTIALLY_PAID' || inv.status === 'PARTIAL';
                const percentPaid = inv.amount > 0 ? Math.round((inv.amountPaid / inv.amount) * 100) : 100;

                return (
                  <div key={inv.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
                    {/* Invoice Info */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-foreground">{inv.description}</span>
                        <Badge variant="secondary" className="text-[11px] font-mono">
                          {inv.term?.name || 'Current Term'}
                        </Badge>
                        {isPaid ? (
                          <Badge className="bg-emerald-600 text-white text-[11px] gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Fully Paid
                          </Badge>
                        ) : isPartial ? (
                          <Badge className="bg-amber-600 text-white text-[11px] gap-1">
                            <Clock className="h-3 w-3" /> Partially Paid ({percentPaid}%)
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-600 text-white text-[11px] gap-1">
                            <AlertCircle className="h-3 w-3" /> Unpaid
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <span>Student: <strong className="text-foreground">{inv.student?.firstName} {inv.student?.lastName}</strong></span>
                        <span>Class: <strong className="text-foreground">{inv.student?.class?.name || 'General'}</strong></span>
                        <span>Due Date: <strong>{new Date(inv.dueDate).toLocaleDateString()}</strong></span>
                      </div>

                      {!isPaid && (
                        <div className="max-w-md pt-1">
                          <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                            <span>Paid: ₦{inv.amountPaid.toLocaleString()}</span>
                            <span>Remaining: ₦{inv.balance.toLocaleString()}</span>
                          </div>
                          <Progress value={percentPaid} className="h-1.5" />
                        </div>
                      )}
                    </div>

                    {/* Amount & Actions */}
                    <div className="flex flex-row md:flex-col items-end justify-between md:justify-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Amount Due</p>
                        <p className="text-lg font-bold font-mono text-foreground">
                          ₦{inv.balance.toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {isPaid ? (
                          <Button asChild variant="outline" size="sm" className="rounded-xl text-xs gap-1.5">
                            <Link href={`/dashboard/finance/invoices/${inv.id}`}>
                              <Printer className="h-3.5 w-3.5" /> View Receipt
                            </Link>
                          </Button>
                        ) : (
                          <Button 
                            onClick={() => handleOpenCheckout(inv)} 
                            className="rounded-xl text-xs px-4 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                          >
                            <Landmark className="h-3.5 w-3.5" />
                            Pay via Bank Transfer
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Payment Dialog */}
      <Dialog open={!!activeInvoice} onOpenChange={(open) => !open && setActiveInvoice(null)}>
        <DialogContent className="sm:max-w-[540px] rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <Landmark className="h-4 w-4" />
              </div>
              <DialogTitle className="text-lg font-bold">School Fee Settlement</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Direct transfer to the school's account for {activeInvoice?.student?.firstName} {activeInvoice?.student?.lastName}.
            </DialogDescription>
          </DialogHeader>

          {activeInvoice && (
            <div className="space-y-4 py-1">
              {/* Invoice Summary */}
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Fee Item:</span>
                  <span className="font-semibold text-foreground">{activeInvoice.description}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Outstanding Balance:</span>
                  <span className="font-bold font-mono text-rose-600 dark:text-rose-400">
                    ₦{activeInvoice.balance.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Payment Type Selection */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentType('FULL');
                    setCustomAmount(activeInvoice.balance.toString());
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    paymentType === 'FULL'
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 ring-2 ring-emerald-600/20'
                      : 'border-border bg-card'
                  }`}
                >
                  <p className="text-[11px] font-semibold text-muted-foreground">Pay Full Balance</p>
                  <p className="text-sm font-bold font-mono text-emerald-600 mt-0.5">
                    ₦{activeInvoice.balance.toLocaleString()}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentType('CUSTOM');
                    setCustomAmount(Math.min(activeInvoice.balance, 25000).toString());
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    paymentType === 'CUSTOM'
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 ring-2 ring-emerald-600/20'
                      : 'border-border bg-card'
                  }`}
                >
                  <p className="text-[11px] font-semibold text-muted-foreground">Pay Installment</p>
                  <p className="text-xs text-foreground mt-0.5">Custom Amount</p>
                </button>
              </div>

              {paymentType === 'CUSTOM' && (
                <div className="space-y-1 animate-in fade-in">
                  <Label className="text-xs">Amount to Pay (₦)</Label>
                  <Input
                    type="number"
                    min="1000"
                    max={activeInvoice.balance}
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="h-9 font-mono text-sm font-bold rounded-xl"
                  />
                </div>
              )}

              {/* Multi-Channel Tabs */}
              <Tabs value={checkoutTab} onValueChange={setCheckoutTab} className="w-full">
                <TabsList className="grid grid-cols-2 sm:grid-cols-4 h-auto sm:h-10 gap-1 rounded-xl bg-muted p-1">
                  <TabsTrigger value="WALLET" className="text-xs rounded-lg gap-1.5">
                    <Wallet className="h-3.5 w-3.5" />
                    Wallet
                  </TabsTrigger>
                  <TabsTrigger value="TRANSFER" className="text-xs rounded-lg gap-1.5">
                    <Landmark className="h-3.5 w-3.5" />
                    Auto-Transfer
                  </TabsTrigger>
                  <TabsTrigger value="CARD" className="text-xs rounded-lg gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" />
                    Card / Online
                  </TabsTrigger>
                  <TabsTrigger value="OFFLINE" className="text-xs rounded-lg gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    School Bank
                  </TabsTrigger>
                </TabsList>

                {/* TAB 0: SCHOOL TUITION WALLET 1-CLICK PAY */}
                <TabsContent value="WALLET" className="space-y-4 pt-2">
                  <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2 border border-primary/20">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-slate-400 uppercase font-semibold">Available School Wallet</span>
                      <Badge className="bg-emerald-600 text-white text-[10px]">Instant 1-Click</Badge>
                    </div>
                    <div className="text-3xl font-extrabold font-mono text-emerald-400">
                      ₦{(walletBalance ?? 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Instant settlement directly from your tuition wallet reserve.
                    </p>
                  </div>

                  {(walletBalance ?? 0) >= (paymentType === 'FULL' ? activeInvoice.balance : (parseFloat(customAmount) || 0)) ? (
                    <Button
                      type="button"
                      onClick={handlePayWithWallet}
                      disabled={isWalletPaying}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-10 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-950/20"
                    >
                      {isWalletPaying ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                      Pay ₦{(paymentType === 'FULL' ? activeInvoice.balance : (parseFloat(customAmount) || 0)).toLocaleString()} from Wallet
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
                        Insufficient wallet balance. You need an additional ₦{Math.max(0, (paymentType === 'FULL' ? activeInvoice.balance : (parseFloat(customAmount) || 0)) - (walletBalance ?? 0)).toLocaleString()} to pay this fee.
                      </div>
                      <Button asChild variant="outline" className="w-full text-xs rounded-xl">
                        <Link href="/dashboard/parent/wallet">
                          <ArrowRight className="h-3.5 w-3.5 mr-1" />
                          Top Up School Wallet First
                        </Link>
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* TAB 1: DEDICATED VIRTUAL ACCOUNT AUTO-CONFIRMATION */}
                <TabsContent value="TRANSFER" className="space-y-3 pt-2">
                  {loadingAccount ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-xs">Generating dedicated GTBank virtual account...</p>
                    </div>
                  ) : virtualAccount ? (
                    <div className="space-y-3">
                      {/* Virtual Account Box */}
                      <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-500/30 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                            Dedicated Transfer Account
                          </span>
                          <Badge className="bg-emerald-600 text-white text-[10px] h-5">
                            Auto-Confirmed
                          </Badge>
                        </div>

                        {/* Account Number with Copy Button */}
                        <div className="flex items-center justify-between bg-card p-3 rounded-xl border border-emerald-500/20">
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Account Number</p>
                            <p className="text-2xl font-black font-mono tracking-widest text-foreground">
                              {virtualAccount.accountNumber}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => copyToClipboard(virtualAccount.accountNumber)}
                            className="rounded-lg gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            {hasCopiedAccount ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            {hasCopiedAccount ? 'Copied!' : 'Copy'}
                          </Button>
                        </div>

                        {/* Bank & Name Details */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-muted-foreground text-[11px]">Bank Name:</p>
                            <p className="font-bold text-foreground">{virtualAccount.bankName}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-[11px]">Account Name:</p>
                            <p className="font-bold text-foreground truncate">{virtualAccount.accountName}</p>
                          </div>
                        </div>

                        {/* Settlement Destination Info */}
                        <div className="pt-2 border-t border-emerald-500/20 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            Auto-sweeps directly to: <strong>{virtualAccount.settlementDestination?.bankName} ({virtualAccount.settlementDestination?.accountNumber})</strong>
                          </span>
                        </div>
                      </div>

                      {/* Instructions */}
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Open your <strong>GTWorld, Kuda, Zenith, OPay</strong>, or any banking app on your phone and transfer the exact fee amount to the account number above.
                      </p>

                      {/* Action Button: Check Transfer Arrival */}
                      <Button
                        type="button"
                        onClick={handleConfirmTransfer}
                        disabled={isVerifyingTransfer}
                        className="w-full rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                      >
                        {isVerifyingTransfer ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Checking with Gateway...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            I Have Sent the Transfer — Verify Now
                          </>
                        )}
                      </Button>
                    </div>
                  ) : null}
                </TabsContent>

                {/* TAB 2: PAYSTACK CARD / USSD */}
                <TabsContent value="CARD" className="space-y-3 pt-2">
                  <div className="space-y-2">
                    <Label className="text-xs">Receipt Email</Label>
                    <Input
                      type="email"
                      value={payerEmail}
                      onChange={(e) => setPayerEmail(e.target.value)}
                      placeholder="parent@example.com"
                      className="h-9 rounded-xl text-xs"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground space-y-1">
                    <p className="font-semibold text-foreground">Instant Debit Card / USSD Payment</p>
                    <p>Supports all Nigerian Mastercard, Visa, Verve, and bank USSD codes (*737#, etc.).</p>
                  </div>

                  <Button
                    type="button"
                    onClick={handlePayWithCard}
                    disabled={isCardProcessing}
                    className="w-full rounded-xl gap-2 bg-primary font-semibold"
                  >
                    <CreditCard className="h-4 w-4" />
                    {isCardProcessing ? 'Connecting...' : `Pay Online (₦${(paymentType === 'FULL' ? activeInvoice.balance : parseFloat(customAmount) || 0).toLocaleString()})`}
                  </Button>
                </TabsContent>

                {/* TAB 3: SCHOOL CORPORATE PHYSICAL ACCOUNT */}
                <TabsContent value="OFFLINE" className="space-y-3 pt-2">
                  {/* Master Account Info */}
                  <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-2 text-xs">
                    <p className="font-bold text-foreground flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-primary" />
                      School Official Corporate Account
                    </p>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Bank:</span>
                        <span className="font-semibold text-foreground">{virtualAccount?.settlementDestination?.bankName || 'Guaranty Trust Bank (GTBank)'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Account Number:</span>
                        <span className="font-mono font-bold text-foreground">{virtualAccount?.settlementDestination?.accountNumber || '0123456789'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Account Name:</span>
                        <span className="font-semibold text-foreground">{virtualAccount?.settlementDestination?.accountName || 'Proxima International Academy Ltd'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Submit Proof Form */}
                  <div className="space-y-2 pt-1">
                    <Label className="text-xs">Sender Account Name</Label>
                    <Input
                      placeholder="e.g. Alhaji Ibrahim Mohammed"
                      value={manualSenderName}
                      onChange={(e) => setManualSenderName(e.target.value)}
                      className="h-9 rounded-xl text-xs"
                    />

                    <Label className="text-xs">Transaction Session ID / Reference</Label>
                    <Input
                      placeholder="e.g. 100004240902123456789"
                      value={manualTxRef}
                      onChange={(e) => setManualTxRef(e.target.value)}
                      className="h-9 rounded-xl text-xs font-mono"
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={handleSubmitManualProof}
                    disabled={isSubmittingProof}
                    className="w-full rounded-xl text-xs gap-1.5 bg-slate-800 hover:bg-slate-900 text-white"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    {isSubmittingProof ? 'Submitting...' : 'Submit Transfer Proof for Bursar Approval'}
                  </Button>
                </TabsContent>
              </Tabs>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveInvoice(null)}
              className="rounded-xl text-xs w-full sm:w-auto"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Success Confirmation Modal */}
      <Dialog open={!!verificationResult} onOpenChange={() => setVerificationResult(null)}>
        <DialogContent className="sm:max-w-[460px] rounded-2xl text-center">
          <div className="py-4 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10 animate-in zoom-in" />
            </div>

            <div>
              <DialogTitle className="text-xl font-bold">Payment Verified Successfully!</DialogTitle>
              <DialogDescription className="text-xs mt-1">
                Your bank transfer has been confirmed and settled into the school corporate account.
              </DialogDescription>
            </div>

            {verificationResult?.receipt && (
              <div className="p-4 rounded-xl bg-muted/30 border border-border text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Reference:</span>
                  <span className="font-mono font-bold text-foreground">{verificationResult.receipt.reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount Paid:</span>
                  <span className="font-mono font-bold text-emerald-600">
                    ₦{verificationResult.receipt.amount?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Channel:</span>
                  <span className="font-semibold text-foreground">{verificationResult.receipt.method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span>{new Date(verificationResult.receipt.date).toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 mt-2">
                  <span className="text-muted-foreground">Remaining Balance:</span>
                  <span className="font-mono font-bold text-foreground">
                    ₦{verificationResult.invoice?.balance?.toLocaleString() || 0}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-center pt-2">
              {verificationResult?.receipt?.invoiceId && (
                <Button asChild className="rounded-xl text-xs gap-1.5 bg-primary">
                  <Link href={`/dashboard/finance/invoices/${verificationResult.receipt.invoiceId}`}>
                    <Printer className="h-3.5 w-3.5" /> Print Official Receipt
                  </Link>
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setVerificationResult(null)}
                className="rounded-xl text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ParentPaymentsPage() {
  return (
    <Suspense fallback={
      <div className="p-12 text-center text-muted-foreground">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Loading fee portal...</p>
      </div>
    }>
      <ParentPaymentsContent />
    </Suspense>
  );
}
