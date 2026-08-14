
'use client';
import {
  Book,
  CheckSquare,
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
import { Skeleton } from '@/components/ui/skeleton';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
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
          setStats({
              subjects: response.data.classesCount || 0,
              teachers: response.data.teachersCount || 0,
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
        title: "Error",
        description: "Could not fetch dashboard data.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  const statusVariant = (status: string) => {
    if (status.includes('Approved')) return 'default';
    if (status.includes('Pending')) return 'secondary';
    if (status.includes('Rejected')) return 'destructive';
    return 'outline';
  };
  
  const chartConfig = {
    value: { label: 'Count' },
    approved: { label: 'Approved', color: 'hsl(var(--chart-2))' },
    pending: { label: 'Pending', color: 'hsl(var(--chart-4))' },
    rejected: { label: 'Rejected', color: 'hsl(var(--destructive))' },
  }

  return (
    <div className="flex flex-col gap-6">
       <div className="space-y-1">
        <h1 className="font-headline text-2xl md:text-3xl font-bold">Exam Officer Dashboard</h1>
        <p className="text-muted-foreground">
          Manage academic assessments, from question review to final results.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Pending Scores</CardTitle>
            <Clock className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className='w-10 h-8'/> : stats.pendingScores}</div>
            <p className="text-xs text-muted-foreground">score sheets awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Pending Questions</CardTitle>
            <FileQuestion className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className='w-10 h-8'/> : stats.pendingQuestions}</div>
             <p className="text-xs text-muted-foreground">exam questions to approve</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold">{isLoading ? <Skeleton className='w-10 h-8'/> : stats.teachers}</div>
             <p className="text-xs text-muted-foreground">in the system</p>
          </CardContent>
        </Card>
      </div>
      
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Exam Question Review Queue</CardTitle>
                        <CardDescription>Review and approve exam questions from teachers.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Teacher</TableHead>
                            <TableHead className="hidden sm:table-cell">Subject & Class</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({length: 3}).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-8 w-20" /></TableCell>
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
                                <Badge variant={statusVariant(q.status)}>{q.status}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                <Button asChild variant="outline" size="sm">
                                    <Link href="/dashboard/exam-questions">Review All</Link>
                                </Button>
                                </TableCell>
                            </TableRow>
                            )) : (
                                <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">No questions in the queue.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-1">
                 <Card>
                    <CardHeader>
                        <CardTitle>Question Submission Status</CardTitle>
                        <CardDescription>A summary of all submitted exam questions.</CardDescription>
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
