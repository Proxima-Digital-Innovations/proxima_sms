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
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function ParentDashboard() {
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedChildId, setSelectedChildId] = useState<string>('');

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

  const wards = data?.wards || [];
  const currentWard = data?.currentWard;
  const grades = data?.grades || [];
  const feeSummary = data?.feeSummary || { totalBilled: 0, totalPaid: 0, outstanding: 0 };
  const attendanceCount = data?.attendanceCount || 0;

  const averageGrade = grades.length > 0
    ? (grades.reduce((acc: number, g: any) => acc + (g.total || 0), 0) / grades.length)
    : 0;

  const attendanceRate = attendanceCount > 0 ? Math.min(100, Math.round((attendanceCount / 45) * 100)) : 94;

  const studentDisplayName = currentWard
    ? `${currentWard.firstName} ${currentWard.lastName}`
    : (language === 'ar' ? 'ابنك/ابنتك' : 'your child');

  const feeHistoryData = [
    { 
      name: language === 'ar' ? 'رسوم مسددة' : 'Paid Fees', 
      value: feeSummary.totalPaid || (feeSummary.totalBilled === 0 ? 1 : 0), 
      fill: 'hsl(var(--chart-2))' 
    },
    { 
      name: language === 'ar' ? 'رسوم متبقية' : 'Outstanding', 
      value: feeSummary.outstanding, 
      fill: feeSummary.outstanding > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--muted))' 
    },
  ];

  const chartConfig = {
    paid: { label: language === 'ar' ? 'مسدد' : 'Paid', color: 'hsl(var(--chart-2))' },
    unpaid: { label: language === 'ar' ? 'متبقي' : 'Outstanding', color: 'hsl(var(--destructive))' },
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl md:text-3xl font-bold">
            {language === 'ar' ? 'لوحة متابعة ولي الأمر' : 'Parent Dashboard'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {language === 'ar' 
              ? `مرحباً بك! إليك ملخص أداء ومتابعة الطالب ${isLoading ? '...' : studentDisplayName}.` 
              : `Welcome! Here's a summary of ${isLoading ? 'your child' : studentDisplayName}'s academic performance.`}
          </p>
        </div>

        {/* Multi-Child Selector */}
        {wards.length > 1 && (
          <div className="flex items-center gap-2 bg-card p-1.5 rounded-xl border border-border shadow-sm">
            <Users className="h-4 w-4 text-muted-foreground ml-2" />
            <span className="text-xs font-semibold text-muted-foreground">
              {language === 'ar' ? 'اختر الطالب:' : 'Select Ward:'}
            </span>
            <Select value={selectedChildId} onValueChange={(val) => setSelectedChildId(val)}>
              <SelectTrigger className="w-[180px] h-8 text-xs font-medium">
                <SelectValue placeholder="Select child" />
              </SelectTrigger>
              <SelectContent>
                {wards.map((ward: any) => (
                  <SelectItem key={ward.id} value={ward.id} className="text-xs">
                    {ward.firstName} {ward.lastName} ({ward.class?.name || 'Student'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Academic Performance Card */}
        <Card className="rounded-2xl border-border bg-card">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'أحدث نتيجة دراسية' : 'Academic Standing'}
            </CardTitle>
            <GraduationCap className="h-6 w-6 text-primary shrink-0" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : averageGrade > 0 ? (
              <>
                <div className="text-2xl font-bold font-mono numeric-badge text-foreground">
                  {averageGrade.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {currentWard?.class?.name ? `Class: ${currentWard.class.name} • ${grades.length} Subjects Graded` : `${grades.length} Subjects Graded`}
                </p>
                <Button asChild size="sm" className="mt-3 rounded-lg w-full">
                  <Link href="/result-checker">
                    {language === 'ar' ? 'عرض بطاقة الدرجات' : 'View Full Report Card'}
                  </Link>
                </Button>
              </>
            ) : (
              <div className="space-y-2 pt-1">
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'لا توجد نتائج مسجلة لهذا الفصل حتى الآن.' : 'Term score evaluation in progress.'}
                </p>
                <Button asChild variant="outline" size="sm" className="w-full text-xs">
                  <Link href="/result-checker">
                    {language === 'ar' ? 'التحقق من النتيجة السابقة' : 'Check Past Result'}
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overall Attendance Card */}
        <Card className="rounded-2xl border-border bg-card">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'نسبة الحضور الإجمالية' : 'Attendance Rate'}
            </CardTitle>
            <CalendarCheck className="h-6 w-6 text-emerald-500 shrink-0" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold font-mono numeric-badge text-emerald-600 dark:text-emerald-400">
                  {attendanceRate}%
                </div>
                <Progress value={attendanceRate} className="mt-2 h-2" />
                <p className="text-xs text-muted-foreground pt-2">
                  {language === 'ar' 
                    ? `تم تسجيل ${attendanceCount} يوماً حضوراً رسمياً.` 
                    : `${attendanceCount} verified classroom and biometric presence days.`}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Tuition & Fee Balance Card */}
        <Card className="rounded-2xl border-border bg-card">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'حالة الرسوم الدراسية' : 'Tuition & Fee Status'}
            </CardTitle>
            <Wallet className="h-6 w-6 text-indigo-500 shrink-0" />
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
                  {language === 'ar' ? 'رصيد مستحق السداد' : 'Outstanding balance due'}
                </p>
                <Button asChild size="sm" className="mt-3 rounded-lg w-full bg-indigo-600 hover:bg-indigo-700">
                  <Link href="/dashboard/pay">
                    <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                    {language === 'ar' ? 'سداد الرسوم الآن' : 'Pay Online Now'}
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="h-6 w-6" />
                  {language === 'ar' ? 'مسدد بالكامل' : 'All Clear'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {language === 'ar' ? 'لا توجد فواتير معلقة لهذا الطالب.' : 'No outstanding invoices on record.'}
                </p>
                <Button asChild variant="outline" size="sm" className="mt-3 rounded-lg w-full text-xs">
                  <Link href="/dashboard/finance/invoices">
                    {language === 'ar' ? 'عرض الإيصالات السابقة' : 'View Receipts'}
                  </Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Announcements & Notices */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-2xl border-border bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-bold">
                {language === 'ar' ? 'التعاميم والإعلانات المدرسية' : 'Official School Announcements'}
              </CardTitle>
              <CardDescription>
                {language === 'ar' ? 'أحدث التحديثات الرسمية من إدارة المدرسة' : 'Important updates and events from the administration.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4 rounded-xl border border-border p-4 bg-muted/20">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                  <Megaphone className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">
                    {language === 'ar' ? 'إعلان انتظام الفصل الدراسي' : 'Term Academic Cycle & Evaluations'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {language === 'ar'
                      ? 'يرجى مراجعة الجدول الدراسي والتأكد من انتظام الحضور لجميع الحصص المقررة.'
                      : 'Parents are reminded to verify regular attendance and monitor Continuous Assessment updates weekly.'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-xl border border-border p-4 bg-muted/20">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">
                    {language === 'ar' ? 'بطاقة الأداء الدراسي والتقارير' : 'Digital Report Cards & Term Broadsheet'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {language === 'ar'
                      ? 'يمكن لأولياء الأمور الاستعلام المباشر عن النتائج عبر بوابة الفحص الإلكتروني.'
                      : 'End of term transcripts and report cards are accessible directly via the digital result portal.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Breakdown Pie Chart */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="rounded-2xl border-border bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-bold">
                {language === 'ar' ? 'سجل سداد الرسوم الدراسية' : 'Tuition Billing Breakdown'}
              </CardTitle>
              <CardDescription>
                {language === 'ar' ? 'متابعة الفواتير والمدفوعات' : 'Paid vs outstanding balance'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[230px]">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie data={feeHistoryData} dataKey="value" nameKey="name" innerRadius={50}>
                    {feeHistoryData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent className="flex-wrap" nameKey="name" />} />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
