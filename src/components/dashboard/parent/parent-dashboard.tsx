'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap,
  CalendarCheck,
  Wallet,
  Receipt,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Clock,
  Printer,
  Zap,
  Building2,
  User,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Lock
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { getParentDashboardData } from '@/actions/parent-actions';
import { payInvoiceWithWallet, confirmWalletTransferArrival } from '@/actions/wallet-actions';
import Link from 'next/link';

export function ParentDashboard() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('academics');

  // Top-Up Dialog State
  const [topupDialogOpen, setTopupDialogOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState<number>(50000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isProcessingTopup, setIsProcessingTopup] = useState(false);

  const fetchParentData = useCallback(async (childId?: string) => {
    setIsLoading(true);
    try {
      const response = await getParentDashboardData(childId);
      if (response.success && 'currentWard' in response) {
        setData(response);
        if (!childId && response.currentWard) {
          setSelectedChildId((response.currentWard as any).id);
        }
      }
    } catch (error) {
      console.error("Error fetching parent data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchParentData(selectedChildId || undefined);
  }, [fetchParentData, selectedChildId]);

  const handlePayInvoice = async (invoiceId: string) => {
    setPayingInvoiceId(invoiceId);
    try {
      const res = await payInvoiceWithWallet(invoiceId);
      if (res.success) {
        toast({
          title: "Payment Successful",
          description: `₦${res.amountPaid?.toLocaleString()} settled directly from your School Wallet.`,
        });
        fetchParentData(selectedChildId || undefined);
      } else {
        toast({
          variant: "destructive",
          title: "Payment Failed",
          description: res.error || "Unable to settle invoice with wallet.",
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

  const handleSimulateTopup = async (amount: number) => {
    setIsProcessingTopup(true);
    try {
      const res = await confirmWalletTransferArrival({
        amount,
        payerName: data?.wallet?.accountName || 'Parent',
      });

      if (res.success) {
        toast({
          title: "Wallet Funded Successfully",
          description: `₦${amount.toLocaleString()} received via Betastack GTBank virtual collection.`,
        });
        setTopupDialogOpen(false);
        fetchParentData(selectedChildId || undefined);
      } else {
        throw new Error(res.error || "Failed to fund wallet.");
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Funding Failed",
        description: err.message || "Could not complete wallet credit.",
      });
    } finally {
      setIsProcessingTopup(false);
    }
  };

  const copyAccountNumber = (accNo: string) => {
    if (!accNo) return;
    navigator.clipboard.writeText(accNo);
    setCopiedAccount(true);
    toast({
      title: "Account Number Copied!",
      description: "Transfer funds to this account number from your bank app (GTBank, Access, Kuda, Zenith) to credit your wallet instantly via Betastack.",
    });
    setTimeout(() => setCopiedAccount(false), 2500);
  };

  const wards = data?.wards || [];
  const currentWard = data?.currentWard;
  const grades = data?.grades || [];
  const invoices = data?.invoices || [];
  const feeSummary = data?.feeSummary || { totalBilled: 0, totalPaid: 0, outstanding: 0 };
  const attendanceCount = data?.attendanceCount || 0;
  const wallet = data?.wallet || { balance: 0, accountNumber: '', bankName: '', accountName: '' };
  const activeTerm = data?.activeTerm;

  const averageGrade = grades.length > 0
    ? (grades.reduce((acc: number, g: any) => acc + (g.total || 0), 0) / grades.length)
    : 0;

  const attendanceRate = attendanceCount > 0 ? Math.min(100, Math.round((attendanceCount / 22) * 100)) : 95;

  const canPayWallet = (inv: any) => (wallet.balance || 0) >= (inv.balance || 0);

  const getGradeBadge = (gradeStr?: string) => {
    const g = (gradeStr || '').toUpperCase();
    if (g.startsWith('A')) return <Badge className="bg-emerald-600 text-white font-mono text-xs">Grade A</Badge>;
    if (g.startsWith('B')) return <Badge className="bg-blue-600 text-white font-mono text-xs">Grade B</Badge>;
    if (g.startsWith('C')) return <Badge className="bg-amber-600 text-white font-mono text-xs">Grade C</Badge>;
    if (g.startsWith('D')) return <Badge className="bg-orange-600 text-white font-mono text-xs">Grade D</Badge>;
    return <Badge variant="secondary" className="font-mono text-xs">{gradeStr || 'Pass'}</Badge>;
  };

  if (isLoading && !data) {
    return (
      <div className="w-full space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 lg:col-span-2 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      
      {/* 1. TOP HEADER: School Tuition Wallet Priority Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
              School Tuition Wallet
            </h1>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-semibold px-2.5 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1.5 inline-block" />
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
            onClick={() => fetchParentData(selectedChildId || undefined)} 
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button 
            onClick={() => setTopupDialogOpen(true)} 
            className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-1.5 text-xs font-semibold h-9 shadow-sm"
          >
            <ArrowUpRight className="h-4 w-4" />
            Fund Wallet
          </Button>
        </div>
      </div>

      {/* 2. THE HERO WALLET & BETASTACK DEDICATED ACCOUNT SECTION (TOP PRIORITY) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* HERO CARD: Available Educational Balance */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-7 shadow-xl flex flex-col justify-between min-h-[230px]">
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10">
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

              <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-xs font-medium text-slate-200 flex items-center gap-1.5 shadow-sm">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                NDIC Insured
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-6 border-t border-white/10 mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Wallet Holder</span>
              <span className="text-sm font-semibold text-slate-100">{wallet?.accountName || 'Proxima SMS / Parent (Wallet)'}</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button 
                size="sm" 
                onClick={() => setTopupDialogOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-9 px-4 shadow-md shadow-emerald-950/40"
              >
                <ArrowUpRight className="h-4 w-4 mr-1.5" />
                Add Funds
              </Button>

              <Button 
                size="sm" 
                variant="secondary"
                onClick={() => {
                  setActiveTab('invoices');
                  const el = document.getElementById('invoices-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/10 font-semibold text-xs h-9 px-4"
              >
                <Receipt className="h-4 w-4 mr-1.5" />
                Direct Pay
              </Button>
            </div>
          </div>
        </div>

        {/* DEDICATED VIRTUAL ACCOUNT CARD (Betastack & GTBank Auto-Credit) */}
        <Card className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <CardTitle className="text-sm font-bold text-foreground">
                  Dedicated Virtual Account
                </CardTitle>
              </div>
              <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-0 font-semibold">
                Auto-Credit
              </Badge>
            </div>
            <CardDescription className="text-xs leading-relaxed text-muted-foreground">
              Transfer funds from any Nigerian mobile bank app to credit your wallet in seconds via Betastack.
            </CardDescription>

            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 space-y-2.5 mt-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Bank Name</span>
                <span className="font-bold text-foreground">Guaranty Trust Bank (GTBank)</span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-border/60">
                <span className="text-xs text-muted-foreground">Account Number</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-extrabold tracking-wider text-primary">
                    {wallet?.accountNumber || '0913090585'}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
                    onClick={() => copyAccountNumber(wallet?.accountNumber || '0913090585')}
                  >
                    {copiedAccount ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-border/60 text-xs">
                <span className="text-muted-foreground">Account Name</span>
                <span className="font-semibold text-foreground text-right text-[11px] truncate max-w-[170px]">
                  {wallet?.accountName || 'Proxima Tuition / Parent'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSimulateTopup(50000)}
              disabled={isProcessingTopup}
              className="w-full text-xs font-semibold h-8 rounded-xl border-dashed hover:border-primary"
            >
              <Zap className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
              {isProcessingTopup ? 'Processing...' : 'Simulate Direct Bank Transfer (₦50k)'}
            </Button>
            <div className="text-[10px] text-center text-muted-foreground mt-2 flex items-center justify-center gap-1">
              <Lock className="w-3 h-3 text-emerald-500" />
              Wired to Betastack & Zainpay Automated Webhook
            </div>
          </div>
        </Card>

      </div>

      {/* 3. MULTI-CHILD SELECTION BAR */}
      <div className="bg-card border border-border p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-base text-foreground flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-primary" />
            Enrolled Children & Academic Overview
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select a child to view terminal grades, attendance, and settle specific class invoices.
          </p>
        </div>

        {/* Multi-Child Selector Chips */}
        {wards.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {wards.map((ward: any) => {
              const isSelected = selectedChildId === ward.id;
              return (
                <button
                  key={ward.id}
                  onClick={() => setSelectedChildId(ward.id)}
                  className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm scale-[1.02]'
                      : 'bg-muted/40 hover:bg-muted text-foreground border-border/80'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black ${
                    isSelected ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/10 text-primary'
                  }`}>
                    {ward.firstName?.[0]}{ward.lastName?.[0]}
                  </div>
                  <span>{ward.firstName} {ward.lastName}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                    isSelected ? 'bg-primary-foreground/15 text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {ward.class?.name || 'Student'}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. FEE DUE ALERT BANNER (Only shows when current ward has balance) */}
      {feeSummary.outstanding > 0 ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/15 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-base text-foreground flex items-center gap-2">
                <span>Tuition Payment Due for {currentWard?.firstName || 'your child'}</span>
                <Badge variant="destructive" className="text-xs font-mono">
                  ₦{feeSummary.outstanding.toLocaleString()}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {wallet.balance >= feeSummary.outstanding
                  ? `You have ₦${wallet.balance.toLocaleString()} in your Tuition Wallet ready for 1-click settlement.`
                  : `Your wallet balance is ₦${wallet.balance.toLocaleString()}. Please add funds to settle this bill.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
            {invoices.filter((i: any) => (i.balance || 0) > 0).slice(0, 1).map((inv: any) => (
              <Button
                key={inv.id}
                size="sm"
                onClick={() => handlePayInvoice(inv.id)}
                disabled={payingInvoiceId === inv.id || !canPayWallet(inv)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-4 shadow-sm"
              >
                <Zap className="w-3.5 h-3.5 mr-1.5" />
                {payingInvoiceId === inv.id ? 'Settling...' : '1-Click Pay with Wallet'}
              </Button>
            ))}
            <Button
              asChild
              size="sm"
              variant="outline"
              className="text-xs h-9 px-3"
            >
              <Link href="/dashboard/parent/invoices">
                View Invoices <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/15 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-foreground">
                All School Fees Up to Date
              </div>
              <p className="text-xs text-muted-foreground">
                All term invoices for {currentWard?.firstName || 'student'} have been settled in full.
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="text-xs h-8">
            <Link href="/dashboard/parent/invoices">
              View Receipts
            </Link>
          </Button>
        </div>
      )}

      {/* 5. THREE SIMPLE CONTENT TABS */}
      <Tabs defaultValue="academics" value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <TabsList className="bg-card border border-border p-1 rounded-2xl h-12 w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
          <TabsTrigger value="academics" className="rounded-xl font-bold text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Subject</span> Grades
          </TabsTrigger>
          <TabsTrigger value="invoices" className="rounded-xl font-bold text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Receipt className="w-4 h-4" />
            Invoices & Pay
          </TabsTrigger>
          <TabsTrigger value="attendance" className="rounded-xl font-bold text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Clock className="w-4 h-4" />
            Attendance & Schedule
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Subject Grades Table */}
        <TabsContent value="academics" className="m-0">
          <Card className="rounded-2xl border-border bg-card shadow-sm overflow-hidden">
            <CardHeader className="border-b border-border/80 pb-4 bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    Academic Evaluation — {currentWard?.firstName} {currentWard?.lastName}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Continuous Assessments (CA1 & CA2) and Terminal Examination scores for {activeTerm?.name || 'Active Term'}.
                  </CardDescription>
                </div>
                <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-xl">
                  <Link href="/dashboard/parent/results">
                    <Printer className="w-3.5 h-3.5 mr-1.5" />
                    Print Official Report Card
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {grades.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <GraduationCap className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-semibold">Scores are currently being uploaded by teachers.</p>
                  <p className="text-xs mt-1">Check back once the examination committee publishes this term’s grades.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 border-b border-border text-xs text-muted-foreground uppercase font-semibold">
                      <tr>
                        <th className="py-3 px-4 text-left">Subject</th>
                        <th className="py-3 px-4 text-center">CA 1 (20)</th>
                        <th className="py-3 px-4 text-center">CA 2 (20)</th>
                        <th className="py-3 px-4 text-center">Exam (60)</th>
                        <th className="py-3 px-4 text-center">Total (100)</th>
                        <th className="py-3 px-4 text-center">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {grades.map((g: any) => (
                        <tr key={g.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 font-semibold text-foreground">
                            {g.subject?.name || 'Subject'}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-xs">{g.ca1 ?? '-'}</td>
                          <td className="py-3 px-4 text-center font-mono text-xs">{g.ca2 ?? '-'}</td>
                          <td className="py-3 px-4 text-center font-mono text-xs">{g.exam ?? '-'}</td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-base text-foreground">
                            {g.total ?? '-'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {getGradeBadge(g.grade)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Fee Invoices & Payment History */}
        <TabsContent value="invoices" id="invoices-section" className="m-0 space-y-4">
          <Card className="rounded-2xl border-border bg-card shadow-sm overflow-hidden">
            <CardHeader className="border-b border-border/80 pb-4 bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-indigo-500" />
                    School Billing Invoices — {currentWard?.firstName} {currentWard?.lastName}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Settle tuition instantly with 1 click using your school wallet.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setTopupDialogOpen(true)}
                    className="text-xs font-semibold rounded-xl"
                  >
                    <Wallet className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                    Wallet (₦{(wallet?.balance || 0).toLocaleString()})
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {invoices.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <Receipt className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-semibold">No invoices generated for this student yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {invoices.map((inv: any) => {
                    const isPaid = (inv.balance || 0) <= 0 || inv.status === 'PAID';
                    const canAfford = canPayWallet(inv);

                    return (
                      <div key={inv.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors">
                        <div>
                          <div className="font-bold text-sm text-foreground flex items-center gap-2">
                            <span>{inv.description}</span>
                            {isPaid ? (
                              <Badge className="bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px] font-semibold gap-1 inline-flex items-center">
                                <CheckCircle2 className="w-3 h-3" />
                                Paid in Full
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-[11px] font-semibold">
                                Pending Payment
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                            <span>Total Billed: <strong>₦{inv.amount.toLocaleString()}</strong></span>
                            <span>•</span>
                            <span>Term: {inv.term?.name || 'Academic Term'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {!isPaid ? (
                            <>
                              <div className="text-right">
                                <div className="text-xs text-muted-foreground">Outstanding</div>
                                <div className="font-mono font-extrabold text-destructive text-base">
                                  ₦{(inv.balance || inv.amount).toLocaleString()}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handlePayInvoice(inv.id)}
                                disabled={payingInvoiceId === inv.id || !canAfford}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-sm"
                              >
                                <Zap className="w-3.5 h-3.5 mr-1" />
                                {payingInvoiceId === inv.id
                                  ? 'Settling...'
                                  : canAfford
                                    ? '1-Click Pay'
                                    : 'Insufficient Balance'}
                              </Button>
                            </>
                          ) : (
                            <Button asChild size="sm" variant="outline" className="text-xs h-9 rounded-xl">
                              <Link href="/dashboard/parent/invoices">
                                View Official Receipt
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Daily Attendance & Schedule */}
        <TabsContent value="attendance" className="m-0 space-y-4">
          <Card className="rounded-2xl border-border bg-card shadow-sm p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  Presence & Classroom Schedule
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Verified school presence and weekly timetable for {currentWard?.firstName} ({currentWard?.class?.name || 'Student'}).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button asChild size="sm" variant="outline" className="text-xs rounded-xl">
                  <Link href="/dashboard/parent/attendance">
                    Full Attendance Log
                  </Link>
                </Button>
                <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs rounded-xl">
                  <Link href="/dashboard/parent/timetable">
                    Weekly Timetable
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Classroom Teacher:</span>
                  <span className="text-xs font-bold text-foreground">
                    {currentWard?.classTeacher
                      ? `${currentWard.classTeacher.firstName} ${currentWard.classTeacher.lastName}`
                      : 'Assigned Form Tutor'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Term Attendance Rate:</span>
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">{attendanceRate}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Verified Days Present:</span>
                  <span className="text-xs font-mono font-bold text-foreground">{attendanceCount} Days</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/40 border border-border/80 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Weekly Timetable Schedule</div>
                  <p className="text-xs text-muted-foreground">
                    View subject periods, class timings, and subject teachers for each school day.
                  </p>
                </div>
                <Button asChild size="sm" variant="outline" className="w-full text-xs mt-3 rounded-lg">
                  <Link href="/dashboard/parent/timetable">
                    Open Weekly Timetable <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

      </Tabs>

      {/* 6. FUND WALLET DIALOG (Modal directly on Dashboard) */}
      <Dialog open={topupDialogOpen} onOpenChange={setTopupDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Wallet className="h-5 w-5 text-primary" />
              Fund School Tuition Wallet
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

            <div className="p-3.5 rounded-xl bg-muted/60 border border-border text-xs space-y-1.5 text-muted-foreground">
              <span className="font-semibold text-foreground block">Funding Options:</span>
              <div>1. <strong>Direct Bank Transfer:</strong> Transfer to your dedicated GTBank account <span className="font-mono font-bold text-foreground">{wallet?.accountNumber || '0913090585'}</span>. Funds arrive instantly via Betastack.</div>
              <div>2. <strong>Instant Online Top-Up:</strong> Simulate or trigger instant payment credit below.</div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => handleSimulateTopup(topupAmount)}
              disabled={isProcessingTopup}
              className="w-full sm:w-auto text-xs"
            >
              Simulate Instant Credit
            </Button>

            <Button
              onClick={() => handleSimulateTopup(topupAmount)}
              disabled={isProcessingTopup}
              className="w-full sm:w-auto bg-primary text-primary-foreground font-semibold text-xs flex items-center justify-center gap-1.5"
            >
              {isProcessingTopup ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              Top Up ₦{topupAmount.toLocaleString()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
