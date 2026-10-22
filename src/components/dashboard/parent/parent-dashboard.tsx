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
  BookOpen,
  Clock,
  Printer,
  Zap,
  Building2,
  User,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getParentDashboardData } from '@/actions/parent-actions';
import { payInvoiceWithWallet } from '@/actions/wallet-actions';
import Link from 'next/link';

export function ParentDashboard() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('academics');

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
          title: "Payment Successful! 🎉",
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

  const copyAccountNumber = (accNo: string) => {
    if (!accNo) return;
    navigator.clipboard.writeText(accNo);
    setCopiedAccount(true);
    toast({
      title: "Account Number Copied!",
      description: "Transfer funds to this account number from your bank app to fund your wallet.",
    });
    setTimeout(() => setCopiedAccount(false), 2500);
  };

  const wards = data?.wards || [];
  const currentWard = data?.currentWard;
  const grades = data?.grades || [];
  const invoices = data?.invoices || [];
  const feeSummary = data?.feeSummary || { totalBilled: 0, totalPaid: 0, outstanding: 0 };
  const attendanceCount = data?.attendanceCount || 0;
  const wallet = data?.wallet || { balance: 0, accountNumber: '', bankName: '' };
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
        <Skeleton className="h-12 w-72" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Header with Child Selection Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
              Parent Portal
            </h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold">
              {activeTerm?.name || 'Active Term'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Track your children’s school results, pay fees, and manage attendance in one simple place.
          </p>
        </div>

        {/* Multi-Child Selector Chips */}
        {wards.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground mr-1">Switch Child:</span>
            {wards.map((ward: any) => {
              const isSelected = selectedChildId === ward.id;
              return (
                <button
                  key={ward.id}
                  onClick={() => setSelectedChildId(ward.id)}
                  className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
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

      {/* 2. Urgent Attention Banner (Only shows when fees are due) */}
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
                  ? `You have ₦${wallet.balance.toLocaleString()} in your wallet ready for instant 1-click settlement.`
                  : `Your wallet balance is ₦${wallet.balance.toLocaleString()}. Fund your wallet or settle directly via bank transfer.`}
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

      {/* 3. Four Core Simple Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Academic Standing */}
        <Card className="rounded-2xl border-border bg-card shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Academic Standing
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-3xl font-extrabold text-foreground font-mono">
                {averageGrade > 0 ? `${averageGrade.toFixed(1)}%` : 'In Review'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {grades.length > 0
                  ? `Average across ${grades.length} evaluated subjects`
                  : 'Term evaluation results in progress'}
              </p>
            </div>
            <Button asChild size="sm" variant="outline" className="w-full text-xs font-semibold h-9 rounded-xl">
              <Link href="/dashboard/parent/results">
                View Report Card <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Card 2: Tuition & Fees */}
        <Card className="rounded-2xl border-border bg-card shadow-sm hover:border-indigo-500/40 transition-all flex flex-col justify-between">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              School Fees
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              {feeSummary.outstanding > 0 ? (
                <>
                  <div className="text-3xl font-extrabold text-destructive font-mono">
                    ₦{feeSummary.outstanding.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pending invoice balance
                  </p>
                </>
              ) : (
                <>
                  <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1.5">
                    <CheckCircle2 className="w-6 h-6" /> Settled
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    All current term fees paid
                  </p>
                </>
              )}
            </div>
            <Button asChild size="sm" variant="outline" className="w-full text-xs font-semibold h-9 rounded-xl">
              <Link href="/dashboard/parent/invoices">
                View Invoices & Pay <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Card 3: School Tuition Wallet */}
        <Card className="rounded-2xl border-border bg-card shadow-sm hover:border-emerald-500/40 transition-all flex flex-col justify-between">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Tuition Wallet
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-3xl font-extrabold text-foreground font-mono">
                ₦{(wallet?.balance || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-1 bg-muted/50 p-1.5 rounded-lg">
                <span className="font-mono font-bold text-foreground">
                  GTB: {wallet?.accountNumber || '0913090585'}
                </span>
                <button
                  type="button"
                  onClick={() => copyAccountNumber(wallet?.accountNumber || '0913090585')}
                  className="hover:text-foreground text-primary flex items-center gap-1 font-semibold text-[11px]"
                >
                  {copiedAccount ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  {copiedAccount ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <Button asChild size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 rounded-xl shadow-sm">
              <Link href="/dashboard/parent/wallet">
                <Wallet className="w-3.5 h-3.5 mr-1.5" />
                Fund Wallet
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Card 4: Attendance Rate */}
        <Card className="rounded-2xl border-border bg-card shadow-sm hover:border-emerald-500/40 transition-all flex flex-col justify-between">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Term Attendance
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-3xl font-extrabold text-foreground font-mono">
                {attendanceRate}%
              </div>
              <Progress value={attendanceRate} className="h-1.5 mt-1.5 bg-muted" />
              <p className="text-xs text-muted-foreground mt-1.5">
                {attendanceCount > 0 ? `${attendanceCount} verified classroom days` : 'Regular attendance record'}
              </p>
            </div>
            <Button asChild size="sm" variant="outline" className="w-full text-xs font-semibold h-9 rounded-xl">
              <Link href="/dashboard/parent/attendance">
                Attendance & Timetable <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>

      </div>

      {/* 4. Three Dedicated Simple Tabs */}
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
            Schedule
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
                    Academic Evaluation Summary — {currentWard?.firstName} {currentWard?.lastName}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Continuous Assessments (CA1 & CA2) and Terminal Examination scores.
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
        <TabsContent value="invoices" className="m-0 space-y-4">
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
                  <Button asChild size="sm" variant="outline" className="text-xs font-semibold rounded-xl">
                    <Link href="/dashboard/parent/wallet">
                      <Wallet className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                      Wallet (₦{(wallet?.balance || 0).toLocaleString()})
                    </Link>
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
                              <Badge className="bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px] font-semibold">
                                ✓ Paid in Full
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
                    View Full Attendance Log
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
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Quick Actions:</div>
                  <p className="text-xs text-muted-foreground">
                    Check which subjects and teachers your child has scheduled for each day of the week.
                  </p>
                </div>
                <Button asChild size="sm" variant="outline" className="w-full text-xs mt-3 rounded-lg">
                  <Link href="/dashboard/parent/timetable">
                    Open Class Schedule (Timetable) <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

      </Tabs>

    </div>
  );
}
