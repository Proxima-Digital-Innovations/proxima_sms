'use client';
import {
  CalendarCheck,
  Megaphone,
  FileText,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell } from 'recharts';
import { useRole } from '@/context/role-context';
import { useLanguage } from '@/context/language-context';
import { useEffect, useState, useCallback } from 'react';
import { getStudents } from '@/actions/student-actions';
import { Skeleton } from '@/components/ui/skeleton';
import type { Student, ReportCard } from '@/lib/schema';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// Mock announcements
const announcements: { id: number; title: string; content: string;}[] = [];

export function ParentDashboard() {
  const { user } = useRole();
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [childData, setChildData] = useState<Student | null>(null);
  const [latestReport, setLatestReport] = useState<ReportCard | null>(null);

  const feeHistoryData = [
    { name: language === 'ar' ? 'رسوم الفصل الأول' : 'Term 1 Fees', value: 0, fill: 'hsl(var(--chart-2))' },
    { name: language === 'ar' ? 'رسوم الفصل الثاني' : 'Term 2 Fees', value: 0, fill: 'hsl(var(--chart-2))' },
    { name: language === 'ar' ? 'رسوم الفصل الثالث' : 'Term 3 Fees', value: 0, fill: 'hsl(var(--destructive))' },
  ];

  const chartConfig = {
    average: { label: language === 'ar' ? 'المعدل %' : 'Average %', color: 'hsl(var(--chart-1))' },
    paid: { label: language === 'ar' ? 'مدفوع' : 'Paid', color: 'hsl(var(--chart-2))' },
    unpaid: { label: language === 'ar' ? 'متبقي' : 'Unpaid', color: 'hsl(var(--destructive))' },
  };

  const fetchChildAndReportData = useCallback(async () => {
    if (!user) {
        setIsLoading(false);
        return;
    };
    setIsLoading(true);
    try {
      const response = await getStudents();
      if (response.success && response.data) {
          const student = response.data[0];
          setChildData(student as any);
      }
    } catch (error) {
      console.error("Error fetching child's data or report:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchChildAndReportData();
  }, [fetchChildAndReportData]);
  
  const studentDisplayName = childData 
    ? `${childData.firstName} ${childData.lastName}` 
    : (language === 'ar' ? 'ابنك/ابنتك' : 'your child');
  const overallAttendance = 0;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <div>
        <h1 className="font-headline text-2xl md:text-3xl font-bold">
          {language === 'ar' ? 'لوحة متابعة ولي الأمر' : 'Parent Dashboard'}
        </h1>
        <p className="text-muted-foreground text-sm">
          {language === 'ar' 
            ? `مرحباً بك! إليك ملخص أداء ومتابعة الطالب ${isLoading ? '...' : studentDisplayName}.` 
            : `Welcome! Here's a summary of ${isLoading ? 'your child' : studentDisplayName}'s performance.`}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="rounded-2xl border-border bg-card">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'أحدث نتيجة دراسية' : 'Latest Result'}
            </CardTitle>
            <FileText className="h-6 w-6 text-primary shrink-0" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-16 w-full" /> : latestReport ? (
                <>
                    <div className="text-2xl font-bold font-mono numeric-badge">
                      {latestReport.overallGrade} ({latestReport.average.toFixed(1)}%)
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {language === 'ar' ? `الترتيب في الفصل: ${latestReport.classRank}` : `Class Rank: ${latestReport.classRank}`}
                    </p>
                    <Button asChild size="sm" className="mt-2 rounded-lg">
                        <Link href={`/dashboard/results/view`}>
                          {language === 'ar' ? 'عرض بطاقة الدرجات' : 'View Full Report'}
                        </Link>
                    </Button>
                </>
            ) : (
                <p className="text-sm text-muted-foreground pt-2">
                  {language === 'ar' ? 'لا توجد نتائج معتمدة لهذا الفصل حتى الآن.' : 'No report card available yet for this term.'}
                </p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'نسبة الحضور الإجمالية' : 'Overall Attendance'}
            </CardTitle>
            <CalendarCheck className="h-6 w-6 text-emerald-500 shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono numeric-badge">{overallAttendance.toFixed(1)}%</div>
            <Progress value={overallAttendance} className="mt-2 h-2" />
             <p className="text-xs text-muted-foreground pt-2">
              {language === 'ar' ? 'سجل الحضور اليومي عبر البصمة الإلكترونية.' : 'Attendance data is synced via biometric kiosk.'}
             </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-2xl border-border bg-card">
                <CardHeader>
                    <CardTitle className="text-lg font-bold">
                      {language === 'ar' ? 'التعاميم والإعلانات المدرسية' : 'Recent Announcements'}
                    </CardTitle>
                    <CardDescription>
                      {language === 'ar' ? 'أحدث التحديثات الرسمية من إدارة المدرسة' : 'Important updates from the school administration.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {announcements.length > 0 ? (
                    announcements.map((ann) => (
                        <div key={ann.id} className="flex items-start gap-4 rounded-xl border border-border p-4 bg-muted/20">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                              <Megaphone className="h-4 w-4" />
                          </div>
                          <div>
                              <h3 className="font-semibold text-sm">{ann.title}</h3>
                              <p className="text-xs text-muted-foreground mt-0.5">{ann.content}</p>
                          </div>
                        </div>
                    ))
                    ) : (
                    <div className="flex h-24 items-center justify-center text-center text-muted-foreground text-sm">
                        <p>{language === 'ar' ? 'لا توجد إعلانات جديدة في الوقت الحالي.' : 'No announcements at this time.'}</p>
                    </div>
                    )}
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
             <Card className="rounded-2xl border-border bg-card">
                <CardHeader>
                    <CardTitle className="text-lg font-bold">
                      {language === 'ar' ? 'سجل سداد الرسوم الدراسية' : 'Fee Payment History'}
                    </CardTitle>
                    <CardDescription>
                      {language === 'ar' ? 'متابعة الفواتير والمدفوعات' : 'Status of school fee payments.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[250px]">
                        <PieChart>
                            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                            <Pie data={feeHistoryData} dataKey="value" nameKey="name" innerRadius={50}>
                                {feeHistoryData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
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
