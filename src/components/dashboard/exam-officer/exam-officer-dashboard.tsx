'use client';
import {
  Clock,
  FileQuestion,
  Users,
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
import { getDashboardStats } from '@/actions/dashboard-actions';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/context/role-context';
import { useLanguage } from '@/context/language-context';
import { Skeleton } from '@/components/ui/skeleton';
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

type ExamQuestion = {
    id: string;
    subject: string;
    class: string;
    status: string;
    teacherName: string;
}

type SubmissionStatusData = {
    name: string;
    value: number;
    fill: string;
}

export function ExamOfficerDashboard() {
  const { user } = useRole();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [submissionStatusData, setSubmissionStatusData] = useState<SubmissionStatusData[]>([]);
  const [stats, setStats] = useState({
    subjects: 0,
    teachers: 0,
    pendingScores: 0,
    pendingQuestions: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const response = await getDashboardStats('EXAM_OFFICER', user.uid);
      if (response.success && response.data) {
          const d: any = response.data;
          setStats({
              subjects: d.classesCount || 0,
              teachers: d.teachersCount || 0,
              pendingScores: 0,
              pendingQuestions: 0
          });
      }
      setQuestions([]);
      setSubmissionStatusData([]);
    } catch (error) {
       console.error("Error fetching Exam Officer data:", error);
       toast({
        variant: "destructive",
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'تعذر جلب بيانات لوحة الامتحانات' : 'Could not fetch dashboard data.',
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
    if (status.includes('Rejected')) return 'destructive';
    return 'outline';
  };

  const statusLabel = (status: string) => {
    if (language !== 'ar') return status;
    if (status.includes('Approved') || status === 'APPROVED') return 'معتمد';
    if (status.includes('Pending') || status === 'PENDING' || status === 'SUBMITTED') return 'بانتظار المراجعة';
    if (status.includes('Rejected') || status === 'REJECTED') return 'مرفوض';
    if (status === 'DRAFT') return 'مسودة';
    return status;
  };
  
  const chartConfig = {
    value: { label: language === 'ar' ? 'العدد' : 'Count' },
    approved: { label: language === 'ar' ? 'معتمد' : 'Approved', color: 'hsl(var(--chart-2))' },
    pending: { label: language === 'ar' ? 'معلق' : 'Pending', color: 'hsl(var(--chart-4))' },
    rejected: { label: language === 'ar' ? 'مرفوض' : 'Rejected', color: 'hsl(var(--destructive))' },
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
       <div className="space-y-1">
        <h1 className="font-headline text-2xl md:text-3xl font-bold">
          {language === 'ar' ? 'لوحة تحكم مسؤول الامتحانات' : 'Exam Officer Dashboard'}
        </h1>
        <p className="text-muted-foreground text-sm">
          {language === 'ar'
            ? 'إدارة التقييمات الأكاديمية ومراجعة نماذج الأسئلة ومعالجة النتائج المدرسية النهائية.'
            : 'Manage academic assessments, from question review to final results.'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="rounded-2xl border-border bg-card">
          <CardHeader className="flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'كشوف درجات بانتظار التدقيق' : 'Pending Scores'}
            </CardTitle>
            <Clock className="h-5 w-5 text-amber-500 shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono numeric-badge">{isLoading ? <Skeleton className='w-10 h-8'/> : stats.pendingScores}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {language === 'ar' ? 'كشوف درجات رصدت وبانتظار المراجعة' : 'score sheets awaiting review'}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border bg-card">
          <CardHeader className="flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'نماذج أسئلة معلقة' : 'Pending Questions'}
            </CardTitle>
            <FileQuestion className="h-5 w-5 text-blue-500 shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono numeric-badge">{isLoading ? <Skeleton className='w-10 h-8'/> : stats.pendingQuestions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {language === 'ar' ? 'نماذج أسئلة امتحانات بانتظار الاعتماد' : 'exam questions to approve'}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border bg-card">
          <CardHeader className="flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'إجمالي المعلمين' : 'Total Teachers'}
            </CardTitle>
            <Users className="h-5 w-5 text-indigo-500 shrink-0" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold font-mono numeric-badge">{isLoading ? <Skeleton className='w-10 h-8'/> : stats.teachers}</div>
             <p className="text-xs text-muted-foreground mt-1">
              {language === 'ar' ? 'معلم مسجل في الكادر' : 'in the system'}
             </p>
          </CardContent>
        </Card>
      </div>
      
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
                <Card className="rounded-2xl border-border bg-card">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold">
                          {language === 'ar' ? 'طابور مراجعة نماذج الأسئلة' : 'Exam Question Review Queue'}
                        </CardTitle>
                        <CardDescription>
                          {language === 'ar' ? 'مراجعة وتدقيق نماذج أسئلة الاختبارات من المعلمين.' : 'Review and approve exam questions from teachers.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>{language === 'ar' ? 'المعلم' : 'Teacher'}</TableHead>
                            <TableHead className="hidden sm:table-cell">{language === 'ar' ? 'المادة والفصل' : 'Subject & Class'}</TableHead>
                            <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                            <TableHead className="text-end">{language === 'ar' ? 'الإجراء' : 'Action'}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({length: 3}).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                                        <TableCell className="text-end"><Skeleton className="h-8 w-20" /></TableCell>
                                    </TableRow>
                                ))
                            ): questions.length > 0 ? questions.map((q) => (
                            <TableRow key={q.id}>
                                <TableCell>
                                    <div className="font-medium">{q.teacherName}</div>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">
                                    <div>{q.subject}</div>
                                    <div className="text-sm text-muted-foreground">{q.class}</div>
                                </TableCell>
                                <TableCell>
                                <Badge variant={statusVariant(q.status)}>{statusLabel(q.status)}</Badge>
                                </TableCell>
                                <TableCell className="text-end">
                                <Button asChild variant="outline" size="sm" className="rounded-lg">
                                    <Link href="/dashboard/exam-questions">
                                      {language === 'ar' ? 'مراجعة' : 'Review'}
                                    </Link>
                                </Button>
                                </TableCell>
                            </TableRow>
                            )) : (
                                <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground text-sm">
                                  {language === 'ar' ? 'لا توجد نماذج أسئلة في طابور الانتظار.' : 'No questions in the queue.'}
                                </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-1">
                 <Card className="rounded-2xl border-border bg-card">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold">
                          {language === 'ar' ? 'حالة تسليم نماذج الأسئلة' : 'Question Submission Status'}
                        </CardTitle>
                        <CardDescription>
                          {language === 'ar' ? 'ملخص إحصائي لحالة النماذج' : 'A summary of all submitted exam questions.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                         {isLoading ? <Skeleton className="h-[250px] w-full" /> : (
                             <ChartContainer config={chartConfig} className="h-[250px] w-full">
                                <ResponsiveContainer>
                                    <BarChart data={submissionStatusData} layout="vertical" margin={{ left: 10, right: 10 }}>
                                         <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={10} width={60} />
                                        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                                        <Bar dataKey="value" radius={5} />
                                    </BarChart>
                                </ResponsiveContainer>
                             </ChartContainer>
                         )}
                    </CardContent>
                </Card>
            </div>
       </div>
    </div>
  );
}
