
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Users,
  Clock,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState, useCallback } from 'react';
import { dbService } from '@/lib/dbService';
import type { MockLessonNote, Payment, Expense } from '@/lib/schema';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, AreaChart, Area } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SLTAssignments } from './assignments';

type DashboardStats = {
    totalStudents: number;
    totalStaff: number;
    termRevenue: number;
    pendingApprovals: number;
};

type SubmissionStatus = {
    name: string;
    'Lesson Plans': number;
    'Exam Questions': number;
};

const financialData = [
  { name: 'Revenue', value: 0, fill: 'hsl(var(--chart-2))' },
  { name: 'Expenses', value: 0, fill: 'hsl(var(--destructive))' },
];

export default function SltPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus[]>([]);
  const [recentNotes, setRecentNotes] = useState<MockLessonNote[]>([]);
  const [financeChartData, setFinanceChartData] = useState(financialData);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
        const [studentCount, staffCount, payments, expenses, lessonNotes, examQuestions] = await Promise.all([
            dbService.getCountFromServer('students', [{ type: 'where', fieldPath: 'status', opStr: '==', value: 'Active' }]),
            dbService.getCountFromServer('users', [{ type: 'where', fieldPath: 'status', opStr: '==', value: 'active' }]),
            dbService.getDocs<Payment>('payments'),
            dbService.getDocs<Expense>('expenses'),
            dbService.getDocs<MockLessonNote>('lessonNotes'),
            dbService.getDocs<MockLessonNote>('examQuestions'),
        ]);

        const termRevenue = payments.reduce((sum, p) => sum + p.amountPaid, 0);
        const termExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

        const pendingLessonNotes = lessonNotes.filter(n => n.status.includes('Pending')).length;
        const pendingExamQuestions = examQuestions.filter(q => q.status.includes('Pending')).length;
        
        setStats({
            totalStudents: studentCount,
            totalStaff: staffCount,
            termRevenue: termRevenue,
            pendingApprovals: pendingLessonNotes + pendingExamQuestions,
        });

        const approvedNotes = lessonNotes.length - pendingLessonNotes;
        const approvedQuestions = examQuestions.length - pendingExamQuestions;

        setSubmissionStatus([
            { name: 'Pending', 'Lesson Plans': pendingLessonNotes, 'Exam Questions': pendingExamQuestions },
            { name: 'Approved', 'Lesson Plans': approvedNotes, 'Exam Questions': approvedQuestions }
        ]);
        
        const sortedNotes = lessonNotes.sort((a,b) => (b.submittedOn?.seconds || 0) - (a.submittedOn?.seconds || 0));
        setRecentNotes(sortedNotes.slice(0, 5));
        
        setFinanceChartData([
            { name: 'Revenue', value: termRevenue, fill: 'hsl(var(--chart-2))' },
            { name: 'Expenses', value: termExpenses, fill: 'hsl(var(--destructive))' },
        ])

    } catch (error) {
      console.error("Failed to fetch SLT dashboard data:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load dashboard data.' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const renderStat = (value: number | undefined, isCurrency = false) => {
    if (isLoading || value === undefined) return <Skeleton className="h-8 w-16" />;
    if (isCurrency) return `NGN ${value.toLocaleString()}`;
    return value.toLocaleString();
  };

  const statusVariant = (status: string) => {
    if (status.includes('Approved')) return 'default';
    if (status.includes('Pending')) return 'secondary';
    if (status.includes('Rejected')) return 'destructive';
    return 'outline';
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold">SLT Dashboard</h1>
        <p className="text-muted-foreground">
          High-level academic and operational oversight for School OS.
        </p>
      </div>

       <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-6 space-y-6">
             <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                    <Users className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {renderStat(stats?.totalStudents)}
                </CardContent>
                </Card>
                <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
                    <Users className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {renderStat(stats?.totalStaff)}
                </CardContent>
                </Card>
                <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                    <Clock className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {renderStat(stats?.pendingApprovals)}
                </CardContent>
                </Card>
                <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Fees Collected (Term)</CardTitle>
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {renderStat(stats?.termRevenue, true)}
                </CardContent>
                </Card>
            </div>
             <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <Card className="lg:col-span-3">
                <CardHeader>
                    <CardTitle>Recent Lesson Plan Submissions</CardTitle>
                    <CardDescription>A summary of the latest lesson plans submitted for review.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Teacher</TableHead>
                                <TableHead className="hidden sm:table-cell">Subject</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="hidden md:table-cell">Submitted</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={4}><Skeleton className="h-6 w-full"/></TableCell>
                                </TableRow>
                                ))
                            ) : recentNotes.length > 0 ? (
                                recentNotes.map(note => (
                                    <TableRow key={note.id}>
                                        <TableCell>{note.teacherName}</TableCell>
                                        <TableCell className="hidden sm:table-cell">{note.subject}</TableCell>
                                        <TableCell><Badge variant={statusVariant(note.status)}>{note.status}</Badge></TableCell>
                                        <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                                            {note.submittedOn ? formatDistanceToNow(new Date(note.submittedOn.seconds * 1000), { addSuffix: true }) : 'N/A'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">No recent submissions.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
                </Card>
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Financial Summary</CardTitle>
                        <CardDescription>A quick look at term revenue vs. expenses.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={{}} className="w-full h-64">
                            <ResponsiveContainer>
                                <BarChart data={financeChartData} layout="vertical" margin={{ left: 10 }}>
                                    <CartesianGrid horizontal={false} />
                                    <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tickMargin={10} width={60}/>
                                    <XAxis type="number" hide />
                                    <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(value) => `NGN ${Number(value).toLocaleString()}`} />} />
                                    <Bar dataKey="value" radius={5} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>
        </TabsContent>
        <TabsContent value="assignments" className="mt-6">
           <SLTAssignments />
        </TabsContent>
       </Tabs>
    </div>
  );
}
