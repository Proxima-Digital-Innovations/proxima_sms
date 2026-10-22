'use client';

import {
  CalendarCheck,
  Megaphone,
  FileText,
  Users,
  Wallet,
  GraduationCap,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ArrowRight,
  Clock,
  BookOpen,
  Calendar,
  Receipt,
  User,
  ShieldCheck,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell } from 'recharts';
import { useLanguage } from '@/context/language-context';
import { useEffect, useState, useCallback } from 'react';
import { getParentDashboardData } from '@/actions/parent-actions';
import { payInvoiceWithWallet } from '@/actions/wallet-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function ParentDashboard() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);

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
          description: `₦${res.amountPaid?.toLocaleString()} settled from your School Wallet.`,
        });
        fetchParentData(selectedChildId || undefined);
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
        description: err.message,
      });
    } finally {
      setPayingInvoiceId(null);
    }
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

  const studentDisplayName = currentWard
    ? `${currentWard.firstName} ${currentWard.lastName}`
    : 'your child';

  const feeHistoryData = [
    { 
      name: 'Paid Fees', 
      value: feeSummary.totalPaid || (feeSummary.totalBilled === 0 ? 1 : 0), 
      fill: 'hsl(var(--chart-2))' 
    },
    { 
      name: 'Outstanding', 
      value: feeSummary.outstanding, 
      fill: feeSummary.outstanding > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--muted))' 
    },
  ];

  const chartConfig = {
    paid: { label: 'Paid', color: 'hsl(var(--chart-2))' },
    unpaid: { label: 'Outstanding', color: 'hsl(var(--destructive))' },
  };

  const getGradeBadge = (gradeStr?: string) => {
    const g = (gradeStr || '').toUpperCase();
    if (g.startsWith('A')) return <Badge className="bg-emerald-600 text-white font-mono">{gradeStr}</Badge>;
    if (g.startsWith('B')) return <Badge className="bg-blue-600 text-white font-mono">{gradeStr}</Badge>;
    if (g.startsWith('C')) return <Badge className="bg-amber-600 text-white font-mono">{gradeStr}</Badge>;
    return <Badge variant="secondary" className="font-mono">{gradeStr || '-'}</Badge>;
  };

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-300 w-full">
      {/* Top Header & Multi-Child Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            {language === 'ar' ? 'لوحة متابعة ولي الأمر' : 'Parent & Guardian Portal'}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Holistic oversight, academic report cards, attendance, and tuition wallet management for {isLoading ? '...' : studentDisplayName}.
          </p>
        </div>

        {/* Multi-Child Selector */}
        {wards.length > 1 && (
          <div className="flex items-center gap-2 bg-card p-2 rounded-2xl border border-border shadow-sm">
            <Users className="h-4 w-4 text-primary ml-1" />
            <span className="text-xs font-semibold text-muted-foreground">Select Ward:</span>
            <Select value={selectedChildId} onValueChange={(val) => setSelectedChildId(val)}>
              <SelectTrigger className="w-[190px] h-9 text-xs font-bold border-0 shadow-none focus:ring-0">
                <SelectValue placeholder="Select child" />
              </SelectTrigger>
              <SelectContent>
                {wards.map((ward: any) => (
                  <SelectItem key={ward.id} value={ward.id} className="text-xs font-medium">
                    {ward.firstName} {ward.lastName} ({ward.class?.name || 'Student'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Ward Profile Banner */}
      {currentWard && !isLoading && (
        <Card className="rounded-2xl border-border bg-card p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xl shadow-sm">
                {currentWard.firstName?.[0]}{currentWard.lastName?.[0]}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-foreground">
                    {currentWard.firstName} {currentWard.lastName}
                  </h2>
                  <Badge variant="secondary" className="font-semibold text-xs">
                    Class: {currentWard.class?.name || 'Class Assigned'}
                  </Badge>
                  <Badge variant="outline" className="font-mono text-[11px]">
                    ID: {currentWard.studentId || 'STU-PROX'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                  <span>Term: <strong>{activeTerm?.name || 'Active Session'}</strong></span>
                  <span>•</span>
                  <span>Form Tutor: <strong>{currentWard.classTeacher ? `${currentWard.classTeacher.firstName} ${currentWard.classTeacher.lastName}` : 'Assigned Tutor'}</strong></span>
                </p>
              </div>
            </div>

            {/* Quick Action Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1.5 shadow-sm">
                <Link href="/dashboard/parent/results">
                  <GraduationCap className="h-3.5 w-3.5 text-primary" />
                  Report Cards
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1.5 shadow-sm">
                <Link href="/dashboard/parent/invoices">
                  <Receipt className="h-3.5 w-3.5 text-indigo-500" />
                  Fee Invoices
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1.5 shadow-sm">
                <Link href="/dashboard/parent/attendance">
                  <CalendarCheck className="h-3.5 w-3.5 text-emerald-500" />
                  Attendance
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1.5 shadow-sm">
                <Link href="/dashboard/parent/timetable">
                  <Clock className="h-3.5 w-3.5 text-violet-500" />
                  Timetable
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 4 Hero Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Academic Standing Card */}
        <Card className="rounded-2xl border-border bg-card shadow-sm hover:border-primary/40 transition-colors">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Academic Standing
            </CardTitle>
            <GraduationCap className="h-5 w-5 text-primary shrink-0" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : averageGrade > 0 ? (
              <>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {averageGrade.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Term Average across {grades.length} Graded Subjects
                </p>
                <Button asChild size="sm" variant="outline" className="mt-3 rounded-lg w-full text-xs">
                  <Link href="/dashboard/parent/results">
                    View Full Report Card <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </>
            ) : (
              <div className="space-y-2 pt-1">
                <p className="text-xs text-muted-foreground">
                  Terminal Continuous Assessment in evaluation.
                </p>
                <Button asChild variant="outline" size="sm" className="w-full text-xs mt-2">
                  <Link href="/dashboard/parent/results">
                    View Report Cards
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overall Attendance Card */}
        <Card className="rounded-2xl border-border bg-card shadow-sm hover:border-emerald-500/40 transition-colors">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Attendance Rate
            </CardTitle>
            <CalendarCheck className="h-5 w-5 text-emerald-500 shrink-0" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {attendanceRate}%
                </div>
                <Progress value={attendanceRate} className="mt-2 h-1.5" />
                <p className="text-xs text-muted-foreground pt-2">
                  {attendanceCount} verified classroom days present
                </p>
                <Button asChild size="sm" variant="outline" className="mt-3 rounded-lg w-full text-xs">
                  <Link href="/dashboard/parent/attendance">
                    View Presence Log <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* School Tuition Wallet Card */}
        <Card className="rounded-2xl border-border bg-card shadow-sm hover:border-emerald-500/40 transition-colors">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tuition Wallet
            </CardTitle>
            <Wallet className="h-5 w-5 text-emerald-500 shrink-0" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold font-mono text-foreground">
                  ₦{(wallet.balance || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Zap className="h-3 w-3 text-emerald-500" />
                  Dedicated pre-funded tuition reserve
                </p>
                <Button asChild size="sm" className="mt-3 rounded-lg w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs">
                  <Link href="/dashboard/parent/wallet">
                    <Wallet className="h-3.5 w-3.5 mr-1" />
                    Fund & Manage Wallet
                  </Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Tuition & Fee Balance Card */}
        <Card className="rounded-2xl border-border bg-card shadow-sm hover:border-indigo-500/40 transition-colors">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Fee Billing Status
            </CardTitle>
            <CreditCard className="h-5 w-5 text-indigo-500 shrink-0" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : feeSummary.outstanding > 0 ? (
              <>
                <div className="text-2xl font-bold font-mono text-destructive">
                  ₦{feeSummary.outstanding.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  Pending invoice balance
                </p>
                <Button asChild size="sm" className="mt-3 rounded-lg w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                  <Link href="/dashboard/parent/invoices">
                    <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                    Review & Pay Invoices
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="h-6 w-6" />
                  All Settled
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  No outstanding school fee balances
                </p>
                <Button asChild variant="outline" size="sm" className="mt-3 rounded-lg w-full text-xs">
                  <Link href="/dashboard/parent/invoices">
                    <Receipt className="h-3.5 w-3.5 mr-1" />
                    View Official Receipts
                  </Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Subject Performance Table & Financial Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Active Term Subject Performance Table */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-2xl border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border/60 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Active Term Subject Assessment
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Continuous Assessment (CA1 & CA2) and Terminal Examination scores for {currentWard?.firstName || 'student'}.
                  </CardDescription>
                </div>
                <Button asChild variant="ghost" size="sm" className="text-xs text-primary">
                  <Link href="/dashboard/parent/results">
                    Full Report <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : grades.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <GraduationCap className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Scores for the current evaluation cycle are being compiled.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 border-b border-border text-xs text-muted-foreground uppercase font-semibold">
                      <tr>
                        <th className="py-2.5 px-4 text-left">Subject</th>
                        <th className="py-2.5 px-4 text-center">CA 1 (20)</th>
                        <th className="py-2.5 px-4 text-center">CA 2 (20)</th>
                        <th className="py-2.5 px-4 text-center">Exam (60)</th>
                        <th className="py-2.5 px-4 text-center">Total (100)</th>
                        <th className="py-2.5 px-4 text-center">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {grades.slice(0, 6).map((g: any) => (
                        <tr key={g.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-2.5 px-4 font-semibold text-foreground">
                            {g.subject?.name || 'Subject'}
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono text-xs">{g.ca1 ?? '-'}</td>
                          <td className="py-2.5 px-4 text-center font-mono text-xs">{g.ca2 ?? '-'}</td>
                          <td className="py-2.5 px-4 text-center font-mono text-xs">{g.exam ?? '-'}</td>
                          <td className="py-2.5 px-4 text-center font-mono font-bold text-foreground">
                            {g.total ?? '-'}
                          </td>
                          <td className="py-2.5 px-4 text-center">
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

          {/* Pending Invoices or Settle with Wallet */}
          <Card className="rounded-2xl border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border/60 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-indigo-500" />
                    Recent Fee Invoices & Receipts
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Settle pending tuition instantly with your pre-funded School Wallet.
                  </CardDescription>
                </div>
                <Button asChild variant="ghost" size="sm" className="text-xs text-primary">
                  <Link href="/dashboard/parent/invoices">
                    View All <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : invoices.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Receipt className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">No active invoices found.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {invoices.slice(0, 3).map((inv: any) => {
                    const isPaid = (inv.balance || 0) <= 0 || inv.status === 'PAID';
                    const canPayWallet = (wallet.balance || 0) >= (inv.balance || 0);

                    return (
                      <div key={inv.id} className="p-4 flex items-center justify-between gap-4">
                        <div>
                          <div className="font-semibold text-sm text-foreground">{inv.description}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Billed: ₦{inv.amount.toLocaleString()} • Term: {inv.term?.name || 'Academic Term'}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {isPaid ? (
                            <Badge className="bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs">
                              Paid in Full
                            </Badge>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-destructive text-sm">
                                ₦{inv.balance.toLocaleString()}
                              </span>
                              <Button
                                size="sm"
                                onClick={() => handlePayInvoice(inv.id)}
                                disabled={payingInvoiceId === inv.id || !canPayWallet}
                                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                              >
                                {payingInvoiceId === inv.id ? 'Paying...' : '1-Click Pay'}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Column: Wallet Virtual Account & Billing Pie Chart */}
        <div className="lg:col-span-1 space-y-6">
          {/* Virtual Account Card */}
          <Card className="rounded-2xl border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">Dedicated Virtual Account</h3>
                <p className="text-[11px] text-muted-foreground">Direct GTBank Collection Account</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/40 border border-border/80 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Bank:</span>
                <span className="font-bold text-foreground">Guaranty Trust Bank (GTBank)</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Account No:</span>
                <span className="font-mono font-extrabold text-primary text-sm tracking-wider">
                  {wallet.accountNumber || '0913090585'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Account Name:</span>
                <span className="font-medium text-foreground">Proxima Tuition / {currentWard?.lastName || 'Parent'}</span>
              </div>
            </div>

            <Button asChild size="sm" variant="outline" className="w-full mt-3 text-xs rounded-xl">
              <Link href="/dashboard/parent/wallet">
                Simulate Direct Transfer & Fund <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </Card>

          {/* Billing Breakdown Pie Chart */}
          <Card className="rounded-2xl border-border bg-card shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-foreground">
                Tuition Billing Ratio
              </CardTitle>
              <CardDescription className="text-xs">
                Paid vs outstanding fees across enrolled terms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[200px]">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie data={feeHistoryData} dataKey="value" nameKey="name" innerRadius={45}>
                    {feeHistoryData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent className="flex-wrap" nameKey="name" />} />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Official Announcements */}
          <Card className="rounded-2xl border-border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-primary" />
                School Notices
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="p-3 rounded-xl border border-border bg-muted/20">
                <div className="font-bold text-foreground">Term Examinations & Results</div>
                <p className="text-muted-foreground mt-0.5">
                  Official terminal report cards have been compiled. Download or print directly from your Report Cards tab.
                </p>
              </div>
              <div className="p-3 rounded-xl border border-border bg-muted/20">
                <div className="font-bold text-foreground">Next Term Resumption & Fees</div>
                <p className="text-muted-foreground mt-0.5">
                  Pre-fund your tuition wallet to avoid enrollment delays for next term.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
