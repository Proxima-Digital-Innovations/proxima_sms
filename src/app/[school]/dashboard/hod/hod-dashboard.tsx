
'use client';
import {
  BookCopy,
  CheckCircle,
  Clock,
  Users,
  XCircle,
  BarChart,
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
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/context/role-context';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { Pie, PieChart, Cell, Bar as BarRechart, BarChart as BarChartRecharts, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

// Server action imports for fetching HOD dashboard data from Prisma
import { getHodDashboardData } from '@/actions/hr-actions';

type SubmissionStatusData = {
  name: string;
  value: number;
  fill: string;
};

// Lesson note type for display (simplified from Prisma model)
type LessonNoteDisplay = {
  id: string;
  title: string;
  subject: string;
  teacherName: string;
  status: string;
  formattedDate: string;
};

// Staff member type for display
type StaffDisplay = {
  id: string;
  name: string;
  role: string;
};

// Placeholder subject performance data until backend provides real data
const subjectPerformanceData = [
  { subject: 'Math', average: 0, color: 'hsl(var(--chart-1))' },
  { subject: 'English', average: 0, color: 'hsl(var(--chart-2))' },
  { subject: 'Science', average: 0, color: 'hsl(var(--chart-3))' },
  { subject: 'History', average: 0, color: 'hsl(var(--chart-4))' },
  { subject: 'Art', average: 0, color: 'hsl(var(--chart-5))' },
];

export function HodDashboard() {
  const { user } = useRole();
  const { toast } = useToast();
  const [notes, setNotes] = useState<LessonNoteDisplay[]>([]);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    staffCount: 0,
  });
  const [submissionStatusData, setSubmissionStatusData] = useState<SubmissionStatusData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Fetch HOD dashboard data via server action (lesson notes + staff summary)
      const result = await getHodDashboardData();
      
      if (result.success && result.data) {
        const { lessonNotes, staffCount, pendingCount, approvedCount, rejectedCount } = result.data;
        
        // Map lesson notes to display format
        const notesList: LessonNoteDisplay[] = lessonNotes.map((note: any) => ({
          id: note.id,
          title: note.title,
          subject: note.subject?.name || 'Unknown Subject',
          teacherName: `${note.teacher?.firstName || ''} ${note.teacher?.lastName || ''}`.trim(),
          status: note.status,
          formattedDate: note.submissionDate
            ? format(new Date(note.submissionDate), 'PPP')
            : 'No date'
        }));
        
        setNotes(notesList.slice(0, 5)); // Show recent 5
        setStats({
          pending: pendingCount,
          approved: approvedCount,
          rejected: rejectedCount,
          staffCount: staffCount,
        });
        setSubmissionStatusData([
          { name: 'Approved', value: approvedCount, fill: 'hsl(var(--chart-2))' },
          { name: 'Pending', value: pendingCount, fill: 'hsl(var(--chart-4))' },
          { name: 'Rejected', value: rejectedCount, fill: 'hsl(var(--destructive))' },
        ]);
      }
    } catch (error) {
       console.error("Error fetching HOD data:", error);
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
    if (status.includes('approved') || status === 'approved') return 'default';
    if (status.includes('pending') || status === 'pending') return 'secondary';
    if (status.includes('rejected') || status === 'rejected') return 'destructive';
    return 'outline';
  };
  
  const chartConfig = {
    approved: { label: 'Approved', color: 'hsl(var(--chart-2))' },
    pending: { label: 'Pending', color: 'hsl(var(--chart-4))' },
    rejected: { label: 'Rejected', color: 'hsl(var(--destructive))' },
    average: { label: 'Average Score', color: 'hsl(var(--chart-1))' },
    graded: { label: 'Graded', color: 'hsl(var(--chart-2))' },
    pendingGrade: { label: 'Pending', color: 'hsl(var(--chart-4))' },
  };

  const totalNotes = stats.approved + stats.pending + stats.rejected;

  return (
    <div className="flex flex-col gap-6">
       <div className="space-y-1">
        <h1 className="font-headline text-2xl md:text-3xl font-bold">HOD Dashboard</h1>
        <p className="text-muted-foreground">
          Department Overview & Approval Queue
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className='w-10 h-8'/> : stats.pending}</div>
            <p className="text-xs text-muted-foreground">notes awaiting your approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Approved Notes</CardTitle>
            <CheckCircle className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className='w-10 h-8'/> : stats.approved}</div>
             <p className="text-xs text-muted-foreground">total notes approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Returned Notes</CardTitle>
            <XCircle className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className='w-10 h-8'/> : stats.rejected}</div>
            <p className="text-xs text-muted-foreground">for revision or rejected</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Department Staff</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className='w-10 h-8'/> : stats.staffCount}</div>
            <p className="text-xs text-muted-foreground">teachers in your department</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Lesson Plan Approval Queue</CardTitle>
                    <CardDescription>Review and approve lesson plans from your department.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Teacher</TableHead>
                        <TableHead className="hidden sm:table-cell">Subject</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? Array.from({length: 3}).map((_, i) => (
                           <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-8 w-20" /></TableCell>
                           </TableRow>
                        )) : notes.length > 0 ? notes.map((note) => (
                        <TableRow key={note.id}>
                            <TableCell>
                            <div className="font-medium">{note.teacherName}</div>
                            <div className="text-sm text-muted-foreground hidden md:table-cell">{note.title}</div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">{note.subject}</TableCell>
                            <TableCell>
                            <Badge variant={statusVariant(note.status)}>{note.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                            <Button asChild variant="outline" size="sm">
                                <Link href={`/dashboard/lesson-notes/${note.id}`}>Review</Link>
                            </Button>
                            </TableCell>
                        </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">No lesson plans in the queue.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Class Averages by Subject</CardTitle>
                    <CardDescription>Average performance in subjects across your department. (Placeholder)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="w-full h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                         <BarChartRecharts data={subjectPerformanceData}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="subject" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                            <YAxis domain={[0, 100]} />
                             <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                             <BarRechart dataKey="average" radius={4}>
                                {subjectPerformanceData.map(entry => <Cell key={entry.subject} fill={entry.color} />)}
                            </BarRechart>
                         </BarChartRecharts>
                    </ResponsiveContainer>
                   </ChartContainer>
                </CardContent>
            </Card>
        </div>
        
        <div className="lg:col-span-1 space-y-6">
             <Card>
                <CardHeader>
                    <CardTitle>Department Submission Status</CardTitle>
                    <CardDescription>Overview of lesson note statuses in your department.</CardDescription>
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
                         <div className="flex h-[250px] items-center justify-center text-center text-muted-foreground">
                            <p>No submission data available.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Grading Progress</CardTitle>
                    <CardDescription>Status of score entry for the current term. (Placeholder)</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[250px]">
                    <p className="text-sm text-muted-foreground">Chart coming soon</p>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}

    