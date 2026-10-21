'use client';
import {
  BookCopy,
  CheckCircle,
  Clock,
  Users,
  XCircle,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { getHodDashboardData } from '@/actions/hod-actions';
import type { MockLessonNote, MockUser } from '@/lib/schema';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/context/role-context';
import { useLanguage } from '@/context/language-context';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { Pie, PieChart, Cell, Bar, BarChart as RechartsBarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

type SubmissionStatusData = {
  name: string;
  value: number;
  fill: string;
};

export function HodDashboard() {
  const { user } = useRole();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [notes, setNotes] = useState<MockLessonNote[]>([]);
  const [staff, setStaff] = useState<MockUser[]>([]);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    staffCount: 0,
  });
  const [submissionStatusData, setSubmissionStatusData] = useState<SubmissionStatusData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const subjectPerformanceData = [
    { subject: language === 'ar' ? 'الرياضيات' : 'Math', average: 0, color: 'hsl(var(--chart-1))' },
    { subject: language === 'ar' ? 'اللغة الإنجليزية' : 'English', average: 0, color: 'hsl(var(--chart-2))' },
    { subject: language === 'ar' ? 'العلوم' : 'Science', average: 0, color: 'hsl(var(--chart-3))' },
    { subject: language === 'ar' ? 'التاريخ' : 'History', average: 0, color: 'hsl(var(--chart-4))' },
    { subject: language === 'ar' ? 'الفنون' : 'Art', average: 0, color: 'hsl(var(--chart-5))' },
  ];

  const statusLabel = (status: string) => {
    if (language !== 'ar') return status;
    if (status.includes('Approved') || status === 'APPROVED') return 'معتمد';
    if (status.includes('Pending') || status === 'PENDING' || status === 'SUBMITTED') return 'بانتظار الاعتماد';
    if (status.includes('Rejected') || status === 'REJECTED') return 'مرفوض';
    if (status === 'DRAFT') return 'مسودة';
    return status;
  };

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await getHodDashboardData(user.id || user.uid);
      if (data.error) {
        toast({ title: language === 'ar' ? 'خطأ' : "Error", description: data.error });
        setIsLoading(false);
        return;
      }

      setStats(data.stats as any);
      setNotes(data.notes as any);
      setSubmissionStatusData(data.submissionStatusData as any);
      setStaff(data.staff as any);
    } catch (error) {
       console.error("Error fetching HOD data:", error);
       toast({
        variant: "destructive",
        title: language === 'ar' ? 'خطأ' : "Error",
        description: language === 'ar' ? "تعذر جلب بيانات لوحة رئيس القسم." : "Could not fetch dashboard data.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast, language]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const statusVariant = (status: string) => {
    if (status.includes('Approved')) return 'default';
    if (status.includes('Pending')) return 'secondary';
    if (status.includes('Rejected') || status.includes('Revision')) return 'destructive';
    return 'outline';
  };
  
  const chartConfig = {
    approved: { label: language === 'ar' ? 'معتمد' : 'Approved', color: 'hsl(var(--chart-2))' },
    pending: { label: language === 'ar' ? 'معلق' : 'Pending', color: 'hsl(var(--chart-4))' },
    rejected: { label: language === 'ar' ? 'مرفوض' : 'Rejected', color: 'hsl(var(--destructive))' },
    average: { label: language === 'ar' ? 'المعدل' : 'Average Score', color: 'hsl(var(--chart-1))' },
    graded: { label: language === 'ar' ? 'تم الرصد' : 'Graded', color: 'hsl(var(--chart-2))' },
    pendingGrade: { label: language === 'ar' ? 'قيد الرصد' : 'Pending', color: 'hsl(var(--chart-4))' },
  };

  const totalNotes = stats.approved + stats.pending + stats.rejected;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
       <div className="space-y-1">
        <h1 className="font-headline text-2xl md:text-3xl font-bold">
          {language === 'ar' ? 'لوحة تحكم رئيس القسم' : 'HOD Dashboard'}
        </h1>
        <p className="text-muted-foreground text-sm">
          {language === 'ar'
            ? 'نظرة عامة على أداء القسم وطابور مراجعة واعتماد خطط المعلمين.'
            : 'Department Overview & Approval Queue'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border-border bg-card">
          <CardHeader className="flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'بانتظار الاعتماد' : 'Pending Review'}
            </CardTitle>
            <Clock className="h-5 w-5 text-amber-500 shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono numeric-badge">{isLoading ? <Skeleton className='w-10 h-8'/> : stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {language === 'ar' ? 'خطط دروس تنتظر موافقتك' : 'notes awaiting your approval'}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border bg-card">
          <CardHeader className="flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'خطط معتمدة' : 'Approved Notes'}
            </CardTitle>
            <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono numeric-badge">{isLoading ? <Skeleton className='w-10 h-8'/> : stats.approved}</div>
             <p className="text-xs text-muted-foreground mt-1">
              {language === 'ar' ? 'إجمالي الخطط المعتمدة بالقسم' : 'total notes approved'}
             </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border bg-card">
          <CardHeader className="flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'خطط معادة للتعديل' : 'Returned Notes'}
            </CardTitle>
            <XCircle className="h-5 w-5 text-rose-500 shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono numeric-badge">{isLoading ? <Skeleton className='w-10 h-8'/> : stats.rejected}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {language === 'ar' ? 'خطط تم إرجاعها للمعلمين' : 'for revision or rejected'}
            </p>
          </CardContent>
        </Card>
         <Card className="rounded-2xl border-border bg-card">
          <CardHeader className="flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'كادر ومعلمو القسم' : 'Department Staff'}
            </CardTitle>
            <Users className="h-5 w-5 text-indigo-500 shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono numeric-badge">{isLoading ? <Skeleton className='w-10 h-8'/> : stats.staffCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {language === 'ar' ? 'معلم مسجل ضمن القسم' : 'teachers in your department'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-2xl border-border bg-card">
                <CardHeader>
                    <CardTitle className="text-lg font-bold">
                      {language === 'ar' ? 'طابور اعتماد خطط الدروس' : 'Lesson Plan Approval Queue'}
                    </CardTitle>
                    <CardDescription>
                      {language === 'ar' ? 'مراجعة وتدقيق واعتماد خطط المعلمين في القسم.' : 'Review and approve lesson plans from your department.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>{language === 'ar' ? 'المعلم' : 'Teacher'}</TableHead>
                        <TableHead className="hidden sm:table-cell">{language === 'ar' ? 'المادة' : 'Subject'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                        <TableHead className="text-end">{language === 'ar' ? 'الإجراء' : 'Action'}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (Array.from({length: 3}).map((_, i) => (
                           <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                                <TableCell className="text-end"><Skeleton className="h-8 w-20 ms-auto" /></TableCell>
                           </TableRow>
                        ))) : notes.length > 0 ? (notes.map((note) => (
                        <TableRow key={note.id}>
                            <TableCell>
                            <div className="font-medium">{note.teacherName}</div>
                            <div className="text-sm text-muted-foreground hidden md:table-cell">{note.title}</div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">{note.subject}</TableCell>
                            <TableCell>
                            <Badge variant={statusVariant(note.status)}>{statusLabel(note.status)}</Badge>
                            </TableCell>
                            <TableCell className="text-end">
                            <Button asChild variant="outline" size="sm" className="rounded-lg">
                                <Link href={`/dashboard/lesson-notes/${note.id}`}>
                                  {language === 'ar' ? 'مراجعة' : 'Review'}
                                </Link>
                            </Button>
                            </TableCell>
                        </TableRow>
                        ))) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground text-sm">
                                  {language === 'ar' ? 'لا توجد خطط دروس في طابور الانتظار.' : 'No lesson plans in the queue.'}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <Card className="rounded-2xl border-border bg-card">
                <CardHeader>
                    <CardTitle className="text-lg font-bold">
                      {language === 'ar' ? 'متوسط نتائج المواد في القسم' : 'Class Averages by Subject'}
                    </CardTitle>
                    <CardDescription>
                      {language === 'ar' ? 'معدلات التحصيل الأكاديمي لمواد القسم' : 'Average performance in subjects across your department.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="w-full h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                         <RechartsBarChart data={subjectPerformanceData}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="subject" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                            <YAxis domain={[0, 100]} />
                             <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                             <Bar dataKey="average" radius={4}>
                                {subjectPerformanceData.map(entry => <Cell key={entry.subject} fill={entry.color} />)}
                            </Bar>
                         </RechartsBarChart>
                    </ResponsiveContainer>
                   </ChartContainer>
                </CardContent>
            </Card>
        </div>
        
        <div className="lg:col-span-1 space-y-6">
             <Card className="rounded-2xl border-border bg-card">
                <CardHeader>
                    <CardTitle className="text-lg font-bold">
                      {language === 'ar' ? 'إجراءات القسم السريعة' : 'Quick Actions'}
                    </CardTitle>
                    <CardDescription>
                      {language === 'ar' ? 'المهام الإدارية للقسم' : 'Common department tasks.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                    <Button asChild variant="outline" size="lg" className="rounded-xl flex items-center justify-start gap-2">
                        <Link href="/dashboard/departments">
                            <Users className="h-4 w-4 shrink-0" />
                            <span>{language === 'ar' ? 'إدارة معلمي القسم' : 'Manage Department Staff'}</span>
                        </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="rounded-xl flex items-center justify-start gap-2">
                        <Link href="/dashboard/lesson-notes">
                            <BookCopy className="h-4 w-4 shrink-0" />
                            <span>{language === 'ar' ? 'مراجعة واعتماد الخطط' : 'Review Lesson Notes'}</span>
                        </Link>
                    </Button>
                </CardContent>
             </Card>

             <Card className="rounded-2xl border-border bg-card">
                <CardHeader>
                    <CardTitle className="text-lg font-bold">
                      {language === 'ar' ? 'حالة تسليم خطط الدروس' : 'Department Submission Status'}
                    </CardTitle>
                    <CardDescription>
                      {language === 'ar' ? 'نسب ومعدلات تسليم الخطط في القسم' : 'Overview of lesson note statuses in your department.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? ( <Skeleton className="h-[250px] w-full" /> ) : totalNotes > 0 ? (
                        <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[250px]">
                            <PieChart>
                                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                                <Pie data={submissionStatusData} dataKey="value" nameKey="name" innerRadius={60} strokeWidth={5}>
                                    {submissionStatusData.map((entry) => (
                                        <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <ChartLegend content={<ChartLegendContent className="flex-wrap" nameKey="name" />} />
                            </PieChart>
                        </ChartContainer>
                    ) : (
                         <div className="flex h-[250px] items-center justify-center text-center text-muted-foreground text-sm">
                            <p>{language === 'ar' ? 'لا توجد بيانات تسليم متاحة.' : 'No submission data available.'}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
