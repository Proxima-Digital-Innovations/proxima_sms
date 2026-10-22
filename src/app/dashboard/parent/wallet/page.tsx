'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Building2, 
  CreditCard, 
  Copy, 
  Check, 
  Clock, 
  ShieldCheck, 
  Zap, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  ChevronRight,
  Receipt,
  GraduationCap
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  getParentWalletDetails, 
  confirmWalletTransferArrival, 
  payInvoiceWithWallet, 
  initiateWalletTopupOnline 
} from '@/actions/wallet-actions';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

export default function ParentWalletPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [topupDialogOpen, setTopupDialogOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState<number>(50000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);

  const { toast } = useToast();

  const loadWallet = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getParentWalletDetails();
      if (res.success) {
        setData(res);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error Loading Wallet',
          description: res.error || 'Could not load wallet information.',
        });
      }
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Network Error',
        description: 'Failed to communicate with wallet service.',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: 'Account Number Copied',
      description: 'Copied to clipboard. Transfer funds to this account to credit your wallet.',
    });
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSimulateTopup = async (amount: number) => {
    setIsProcessing(true);
    try {
      const res = await confirmWalletTransferArrival({
        amount,
        payerName: data?.wallet?.accountName || 'Parent',
      });

      if (res.success) {
        toast({
          title: 'Wallet Funded Successfully!',
          description: `₦${amount.toLocaleString()} has been credited to your school wallet.`,
        });
        setTopupDialogOpen(false);
        await loadWallet();
      } else {
        throw new Error(res.error || 'Failed to fund wallet.');
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Funding Failed',
        description: err.message || 'Could not complete wallet credit.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayInvoice = async (invoiceId: string, balance: number) => {
    if (!data?.wallet || data.wallet.balance < balance) {
      toast({
        variant: 'destructive',
        title: 'Insufficient Balance',
        description: `Your wallet balance (₦${(data?.wallet?.balance || 0).toLocaleString()}) is less than the invoice amount (₦${balance.toLocaleString()}). Please top up first.`,
      });
      setTopupAmount(Math.max(10000, balance - (data?.wallet?.balance || 0)));
      setTopupDialogOpen(true);
      return;
    }

    setPayingInvoiceId(invoiceId);
    try {
      const res = await payInvoiceWithWallet(invoiceId);
      if (res.success) {
        toast({
          title: 'Payment Successful! 🎉',
          description: `Invoice settled directly from your school wallet. Receipt reference: ${res.receipt?.reference}`,
        });
        await loadWallet();
      } else {
        throw new Error(res.error || 'Payment failed.');
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Payment Error',
        description: err.message || 'Could not settle invoice from wallet.',
      });
    } finally {
      setPayingInvoiceId(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-6 max-w-6xl pb-16">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-56 md:col-span-2 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  const wallet = data?.wallet;
  const pendingInvoices = data?.pendingInvoices || [];
  const transactions = wallet?.transactions || [];

  return (
    <div className="space-y-8 max-w-6xl pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-headline text-3xl font-bold tracking-tight text-foreground">
              School Tuition Wallet
            </h1>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium text-xs">
              Instant Settlement Active
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Pre-fund school fees, manage tuition reserves for your children, and enjoy instant 1-click invoice clearance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadWallet} 
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button 
            onClick={() => setTopupDialogOpen(true)} 
            className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2 font-medium"
          >
            <Zap className="h-4 w-4" />
            Fund Wallet
          </Button>
        </div>
      </div>

      {/* Main Grid: Hero Wallet Card & DVA Bank Transfer Box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hero Card */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-7 shadow-xl">
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col justify-between h-full min-h-[220px]">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5 text-primary" />
                  Available Educational Balance
                </span>
                <div className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white font-mono mt-1">
                  ₦{(wallet?.balance || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-xs font-medium text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                NDIC Insured
              </div>
            </div>

            <div className="pt-6 border-t border-white/10 mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Wallet Holder</span>
                <span className="text-sm font-semibold text-slate-100">{wallet?.accountName || 'Parent Account'}</span>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  onClick={() => setTopupDialogOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md shadow-emerald-900/30"
                >
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  Add Funds
                </Button>

                <Link href="/dashboard/pay">
                  <Button size="sm" variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border border-white/10">
                    <Receipt className="h-4 w-4 mr-1" />
                    Direct Pay
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Dedicated Virtual Account Funding Box */}
        <Card className="border border-border flex flex-col justify-between shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Dedicated Funding Account
              </CardTitle>
              <Badge variant="secondary" className="text-[10px]">Auto-Credit</Badge>
            </div>
            <CardDescription className="text-xs">
              Transfer funds from any Nigerian mobile bank app to credit your wallet in seconds.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-0">
            <div className="p-3.5 rounded-xl bg-muted/50 border border-border space-y-2">
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>Bank Name</span>
                <span className="font-semibold text-foreground text-right">{wallet?.bankName || 'Guaranty Trust Bank'}</span>
              </div>

              <div className="flex justify-between items-center pt-1 border-t border-border/60">
                <span className="text-xs text-muted-foreground">Account Number</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-bold tracking-wider text-foreground">
                    {wallet?.accountNumber}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => copyToClipboard(wallet?.accountNumber || '')}
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs text-muted-foreground pt-1 border-t border-border/60">
                <span>Account Name</span>
                <span className="font-medium text-foreground text-right text-[11px] truncate max-w-[180px]">
                  {wallet?.accountName}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground leading-relaxed flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
              Supported: GTBank, Zenith, Kuda, OPay, PalmPay, FirstBank, Access & all NIBSS apps.
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              className="w-full text-xs font-medium"
              onClick={() => handleSimulateTopup(25000)}
              disabled={isProcessing}
            >
              {isProcessing ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Zap className="h-3.5 w-3.5 text-primary mr-1.5" />}
              Simulate ₦25,000 Transfer (Instant Demo)
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Pending Wards Invoices: Instant 1-Click Pay */}
      <Card className="border border-border shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                Pending Tuition & Ward Invoices
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Settle outstanding fees with a single click directly from your available wallet balance.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              {pendingInvoices.length} Unpaid
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {pendingInvoices.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground flex flex-col items-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2 opacity-80" />
              <p className="font-semibold text-sm text-foreground">All Wards Fees are Up to Date!</p>
              <p className="text-xs text-muted-foreground mt-0.5">There are no outstanding invoices requiring settlement right now.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingInvoices.map((inv: any) => {
                const canAfford = (wallet?.balance || 0) >= inv.balance;
                const isPaying = payingInvoiceId === inv.id;

                return (
                  <div 
                    key={inv.id} 
                    className="p-4 rounded-xl border border-border bg-card/60 hover:bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">{inv.studentName}</span>
                        <Badge variant="secondary" className="text-[10px]">{inv.className}</Badge>
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">{inv.termName}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{inv.description}</p>
                      <div className="text-xs text-muted-foreground">
                        Total: ₦{inv.amount.toLocaleString()} • Paid: ₦{inv.amountPaid.toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="text-right">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Balance Due</span>
                        <span className="text-lg font-bold font-mono text-destructive">
                          ₦{inv.balance.toLocaleString()}
                        </span>
                      </div>

                      <Button
                        size="sm"
                        disabled={isPaying}
                        onClick={() => handlePayInvoice(inv.id, inv.balance)}
                        className={`font-medium text-xs flex items-center gap-1.5 ${
                          canAfford 
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm' 
                            : 'bg-primary/90 text-primary-foreground'
                        }`}
                      >
                        {isPaying ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            Settling...
                          </>
                        ) : canAfford ? (
                          <>
                            <Zap className="h-3.5 w-3.5" />
                            Pay with Wallet
                          </>
                        ) : (
                          <>
                            <ArrowUpRight className="h-3.5 w-3.5" />
                            Top Up & Settle
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Ledger */}
      <Card className="border border-border shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Wallet Transaction Ledger
            </CardTitle>
            <span className="text-xs text-muted-foreground">Real-time ledger audit</span>
          </div>
          <CardDescription className="text-xs">
            Complete record of credits (top-ups, bank transfers) and debits (invoice settlements).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground flex flex-col items-center">
              <Clock className="h-10 w-10 text-muted-foreground/40 mb-2" />
              <p className="font-semibold text-sm text-foreground">No Transactions Yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">Fund your wallet or settle an invoice to see movements here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="pb-3 font-medium">Type</th>
                    <th className="pb-3 font-medium">Description</th>
                    <th className="pb-3 font-medium">Reference</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {transactions.map((tx: any) => {
                    const isCredit = tx.type === 'CREDIT';
                    return (
                      <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            isCredit 
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          }`}>
                            {isCredit ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-3 font-medium text-foreground text-xs sm:text-sm">
                          {tx.description}
                        </td>
                        <td className="py-3 font-mono text-xs text-muted-foreground">
                          {tx.reference}
                        </td>
                        <td className="py-3 text-xs text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className={`py-3 text-right font-mono font-bold text-sm ${
                          isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {isCredit ? '+' : '-'}₦{tx.amount.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fund Wallet Modal Dialog */}
      <Dialog open={topupDialogOpen} onOpenChange={setTopupDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Wallet className="h-5 w-5 text-primary" />
              Fund School Wallet
            </DialogTitle>
            <DialogDescription className="text-xs">
              Select or enter an amount to credit to your school tuition reserve.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-muted-foreground">Preset Amounts</Label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {[20000, 50000, 100000, 200000, 350000, 500000].map((amt) => (
                  <Button
                    key={amt}
                    type="button"
                    variant={topupAmount === amt ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs font-mono font-medium"
                    onClick={() => {
                      setTopupAmount(amt);
                      setCustomAmount('');
                    }}
                  >
                    ₦{amt.toLocaleString()}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="customAmt" className="text-xs">Custom Amount (₦)</Label>
              <Input
                id="customAmt"
                type="number"
                placeholder="e.g. 75000"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  const parsed = parseFloat(e.target.value);
                  if (!isNaN(parsed) && parsed > 0) setTopupAmount(parsed);
                }}
              />
            </div>

            <div className="p-3.5 rounded-xl bg-muted/60 border border-border text-xs space-y-1 text-muted-foreground">
              <span className="font-semibold text-foreground block">Funding Channel Options:</span>
              <div>1. <strong>Direct Bank Transfer:</strong> Transfer to your personal virtual account <span className="font-mono font-bold text-foreground">{wallet?.accountNumber}</span>.</div>
              <div>2. <strong>Instant Online Top-Up:</strong> Pay via Card, USSD or Bank app instantly.</div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => handleSimulateTopup(topupAmount)}
              disabled={isProcessing}
              className="w-full sm:w-auto text-xs"
            >
              Simulate Instant Credit
            </Button>

            <Button
              onClick={() => handleSimulateTopup(topupAmount)}
              disabled={isProcessing}
              className="w-full sm:w-auto bg-primary text-primary-foreground font-semibold text-xs flex items-center justify-center gap-1.5"
            >
              {isProcessing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              Top Up ₦{topupAmount.toLocaleString()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
