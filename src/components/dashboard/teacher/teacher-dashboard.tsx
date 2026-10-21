'use client';
import { Book, CheckCircle, Clock, FileQuestion, Upload, XCircle, Calendar, ClipboardCheck } from 'lucide-react';
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
import { useRole } from '@/context/role-context';
import { useLanguage } from '@/context/language-context';
import { useEffect, useState, useCallback } from 'react';
import { getDashboardStats } from '@/actions/dashboard-actions';
import type { MockLessonNote } from '@/lib/schema';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DocumentSubmissionForm } from '@/components/dashboard/lesson-notes/add-lesson-note-form';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, AreaChart, Area, ResponsiveContainer } from 'recharts';

const classPerformanceData = [
  { month: 'Jan', average: 0 },
  { month: 'Feb', average: 0 },
  { month: 'Mar', average: 0 },
  { month: 'Apr', average: 0 },
  { month: 'May', average: 0 },
];

const chartConfig = {
    average: { label: 'Average Score', color: 'hsl(var(--chart-1))' },
    submitted: { label: 'Submissions', color: 'hsl(var(--chart-2))' },
}

export function TeacherDashboard() {
  const { user } = useRole();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [stats, setStats] = useState({
    pendingPlans: 0,
    approvedPlans: 0,
    rejectedPlans: 0,
    pendingExams: 0,
  });
  const [recentNotes, setRecentNotes] = useState<MockLessonNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submissionHistory, setSubmissionHistory] = useState<{month: string, submitted: number}[]>([]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const response = await getDashboardStats('TEACHER', user.uid);
      if (response.success && response.data) {
          const d: any = response.data;
          setStats({
            pendingPlans: d.pendingPlans || 0,
            approvedPlans: d.approvedPlans || 0,
            rejectedPlans: d.rejectedPlans || 0,
            pendingExams: d.pendingExams || 0,
          });
      }
    } catch (error) {
      toast({
        title: language === 'ar' ? 'خطأ في تحميل البيانات' : 'Error fetching stats',
        description: 'Failed to load teacher dashboard data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast, language]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmissionAdded = () => {
    fetchData();
    setIsModalOpen(false);
  }

  const statusVariant = (status: string) => {
    if (status.includes('Approved')) return 'default';
    if (status.includes('Pending')) return 'secondary';
    if (status.includes('Rejected') || status.includes('Revision')) return 'destructive';
    return 'outline';
  };

  const statusLabel = (status: string) => {
    if (language !== 'ar') return status;
    if (status.includes('Approved') || status === 'APPROVED') return 'معتمد';
    if (status.includes('Pending') || status === 'PENDING' || status === 'SUBMITTED') return 'بانتظار الاعتماد';
    if (status.includes('Rejected') || status === 'REJECTED') return 'مرفوض';
    if (status === 'DRAFT') return 'مسودة';
    return status;
  };
  
  const totalSubmissions = stats.approvedPlans + stats.pendingPlans + stats.rejectedPlans;
  const teacherName = user?.firstName || user?.lastName 
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() 
    : (language === 'ar' ? 'المعلم' : 'Teacher');

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <div className="space-y-1">
        <h1 className="font-headline text-2xl md:text-3xl font-bold">
          {language === 'ar' ? 'لوحة تحكم المعلم' : 'Teacher Dashboard'}
        </h1>
        <p className="text-muted-foreground text-sm">
          {language === 'ar' 
            ? `أهلاً بك، الأستاذ ${teacherName}. يمكنك متابعة خطط الدروس ورصد درجات الطلاب وحضور الفصل.` 
            : `Welcome, ${teacherName}. Manage your submissions, grades, and class records.`}
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border-border bg-card">
          <CardHeader className="flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'خطط قيد المراجعة' : 'Pending Plans'}
            </CardTitle>
            <Clock className="h-5 w-5 text-amber-500 shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono numeric-badge">
              {isLoading ? <Skeleton className="h-8 w-10"/> : stats.pendingPlans}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {language === 'ar' ? 'خطط دروس بانتظار اعتماد الإدارة' : 'Lesson plans awaiting review'}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card">
          <CardHeader className="flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'خطط معتمدة' : 'Approved Plans'}
            </CardTitle>
            <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono numeric-badge">
              {isLoading ? <Skeleton className="h-8 w-10"/> : stats.approvedPlans}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {language === 'ar' ? 'إجمالي خطط الدروس المقبولة' : 'Total plans approved'}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card">
          <CardHeader className="flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'أسئلة امتحانات معلقة' : 'Pending Questions'}
            </CardTitle>
            <FileQuestion className="h-5 w-5 text-blue-500 shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono numeric-badge">
              {isLoading ? <Skeleton className="h-8 w-10"/> : stats.pendingExams}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {language === 'ar' ? 'نماذج أسئلة بانتظار الاعتماد' : 'Exam questions awaiting review'}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card">
          <CardHeader className="flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'معادة للتعديل' : 'Returned for Correction'}
            </CardTitle>
            <XCircle className="h-5 w-5 text-rose-500 shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono numeric-badge">
              {isLoading ? <Skeleton className="h-8 w-10"/> : stats.rejectedPlans}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {language === 'ar' ? 'خطط بحاجة إلى تصحيح' : 'Plans needing your review'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-2xl border-border bg-card">
                <CardHeader>
                    <CardTitle className="text-lg font-bold">
                      {language === 'ar' ? 'أحدث خطط الدروس المرفوعة' : 'Recent Lesson Plan Submissions'}
                    </CardTitle>
                    <CardDescription>
                      {language === 'ar' ? 'متابعة حالة وتدقيق الخطط المرفوعة مؤخراً' : 'Track the status of your recent uploads.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>{language === 'ar' ? 'عنوان الخطة' : 'Title'}</TableHead>
                        <TableHead className="hidden sm:table-cell">{language === 'ar' ? 'المادة' : 'Subject'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                        <TableHead className="text-end">{language === 'ar' ? 'الإجراء' : 'Action'}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                          Array.from({length: 3}).map((_, i) => (
                            <TableRow key={i}>
                              <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                              <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                              <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                              <TableCell className="text-end"><Skeleton className="h-8 w-20" /></TableCell>
                            </TableRow>
                          ))
                        ) : recentNotes.length > 0 ? recentNotes.map((note) => (
                        <TableRow key={note.id}>
                            <TableCell className="font-medium">{note.title}</TableCell>
                            <TableCell className="hidden sm:table-cell">{note.subject}</TableCell>
                            <TableCell>
                               <Badge variant={statusVariant(note.status)}>{statusLabel(note.status)}</Badge>
                            </TableCell>
                            <TableCell className="text-end">
                            <Button asChild variant="outline" size="sm" className="rounded-lg">
                                <Link href={`/dashboard/lesson-notes/${note.id}`}>
                                  {language === 'ar' ? 'عرض' : 'View'}
                                </Link>
                            </Button>
                            </TableCell>
                        </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                    {language === 'ar' ? 'لا توجد خطط دروس مرفوعة مؤخراً.' : 'No recent submissions.'}
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
                      {language === 'ar' ? 'مؤشر أداء الفصول الدراسية' : 'Class Performance Trend'}
                    </CardTitle>
                    <CardDescription>
                      {language === 'ar' ? 'متوسط نتائج الطلاب للفصل الدراسي' : 'Average performance of your primary class over time.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="h-[250px] w-full">
                         <ResponsiveContainer>
                            <LineChart data={classPerformanceData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                                <YAxis domain={[60, 90]} tickFormatter={(value) => `${value}%`} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Line type="monotone" dataKey="average" stroke="var(--color-average)" strokeWidth={2} dot={true} />
                            </LineChart>
                         </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
            <Card className="rounded-2xl border-border bg-card">
                <CardHeader>
                    <CardTitle className="text-lg font-bold">
                      {language === 'ar' ? 'الإجراءات والمهام السريعة' : 'Quick Actions'}
                    </CardTitle>
                    <CardDescription>
                      {language === 'ar' ? 'انتقال سريع للمهام اليومية' : 'Jump right into your tasks.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                     <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                        <DialogTrigger asChild>
                           <Button size="lg" className="rounded-xl flex items-center justify-center gap-2">
                             <Upload className="h-4 w-4 shrink-0" />
                             <span>{language === 'ar' ? 'رفع خطة درس أو نموذج' : 'Upload Document'}</span>
                           </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-2xl">
                            <DialogHeader>
                                <DialogTitle>
                                  {language === 'ar' ? 'رفع خطة دراسية أو نموذج اختبار' : 'Upload Document'}
                                </DialogTitle>
                                <DialogDescription>
                                  {language === 'ar' 
                                    ? 'حدد الفصل والمادة ونوع المستند لرفعه إلى رئيس القسم المختص.' 
                                    : 'Select the class, subject, document type, and upload your file.'}
                                </DialogDescription>
                            </DialogHeader>
                            <DocumentSubmissionForm onNoteAdded={handleSubmissionAdded} />
                        </DialogContent>
                    </Dialog>

                    <Button asChild variant="outline" size="lg" className="rounded-xl flex items-center justify-start gap-2">
                        <Link href="/dashboard/scores/enter">
                            <span>{language === 'ar' ? 'رصد درجات الاختبارات والامتحانات' : 'Enter Student Scores'}</span>
                        </Link>
                    </Button>

                    <Button asChild variant="outline" size="lg" className="rounded-xl flex items-center justify-start gap-2">
                        <Link href="/dashboard/bas/attendance">
                            <ClipboardCheck className="h-4 w-4 shrink-0" />
                            <span>{language === 'ar' ? 'تسجيل وسجل الحضور' : 'Take Attendance'}</span>
                        </Link>
                    </Button>

                    <Button asChild variant="outline" size="lg" className="rounded-xl flex items-center justify-start gap-2">
                        <Link href="/dashboard/timetable">
                            <Calendar className="h-4 w-4 shrink-0" />
                            <span>{language === 'ar' ? 'الجدول المدرسي والحصص' : 'View Timetable'}</span>
                        </Link>
                    </Button>
                </CardContent>
            </Card>

            <Card className="rounded-2xl border-border bg-card">
                <CardHeader>
                    <CardTitle className="text-lg font-bold">
                      {language === 'ar' ? 'سجل المرفوعات السابق' : 'My Submission History'}
                    </CardTitle>
                    <CardDescription>
                      {language === 'ar' ? 'إجمالي المرفوعات الشهرية' : 'Your document submissions over the last few months.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? ( <Skeleton className="h-[250px] w-full" /> ) : totalSubmissions > 0 ? (
                    <ChartContainer config={chartConfig} className="h-[250px] w-full">
                        <ResponsiveContainer>
                            <AreaChart data={submissionHistory} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={12}/>
                                <YAxis allowDecimals={false} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Area type="monotone" dataKey="submitted" fill="var(--color-submitted)" fillOpacity={0.4} stroke="var(--color-submitted)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                    ) : (
                        <div className="flex h-[250px] items-center justify-center text-center text-muted-foreground text-sm">
                            <p>{language === 'ar' ? 'لا يوجد سجل سابق للمرفوعات.' : 'No submission history to display.'}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
