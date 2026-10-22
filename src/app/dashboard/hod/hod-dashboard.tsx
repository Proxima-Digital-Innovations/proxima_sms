
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
        const { lessonNotes, staffCount, pendingCount, approvedCount, rejectedCount } = result.data as any;
        
        // Map lesson notes to display format
        const notesList: LessonNoteDisplay[] = (lessonNotes || []).map((note: any) => ({
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
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
       <div className="space-y-2 relative">
        <h1 className="font-headline text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-900 via-indigo-800 to-slate-900 bg-clip-text text-transparent">HOD Dashboard</h1>
        <p className="text-muted-foreground font-medium">
          Department Overview & Approval Queue
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-indigo-100 shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent z-0 pointer-events-none" />
          <CardHeader className="flex-row items-center justify-between pb-2 space-y-0 relative z-10">
            <CardTitle className="text-sm font-semibold text-slate-700">Pending Review</CardTitle>
            <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-slate-900">{isLoading ? <Skeleton className='w-12 h-10'/> : stats.pending}</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">notes awaiting approval</p>
          </CardContent>
        </Card>
        
        <Card className="border-emerald-100 shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden relative">
           <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent z-0 pointer-events-none" />
          <CardHeader className="flex-row items-center justify-between pb-2 space-y-0 relative z-10">
            <CardTitle className="text-sm font-semibold text-slate-700">Approved Notes</CardTitle>
            <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-slate-900">{isLoading ? <Skeleton className='w-12 h-10'/> : stats.approved}</div>
             <p className="text-xs text-muted-foreground font-medium mt-1">total notes approved</p>
          </CardContent>
        </Card>
        
        <Card className="border-rose-100 shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden relative">
           <div className="absolute inset-0 bg-gradient-to-br from-rose-50/50 to-transparent z-0 pointer-events-none" />
          <CardHeader className="flex-row items-center justify-between pb-2 space-y-0 relative z-10">
            <CardTitle className="text-sm font-semibold text-slate-700">Returned Notes</CardTitle>
            <div className="h-8 w-8 rounded-full bg-rose-100 flex items-center justify-center group-hover:scale-110 transition-transform">
              <XCircle className="h-4 w-4 text-rose-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-slate-900">{isLoading ? <Skeleton className='w-12 h-10'/> : stats.rejected}</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">needs revision</p>
          </CardContent>
        </Card>
        
         <Card className="border-blue-100 shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent z-0 pointer-events-none" />
          <CardHeader className="flex-row items-center justify-between pb-2 space-y-0 relative z-10">
            <CardTitle className="text-sm font-semibold text-slate-700">Department Staff</CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-slate-900">{isLoading ? <Skeleton className='w-12 h-10'/> : stats.staffCount}</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">active teachers</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-sm border-border overflow-hidden">
                <CardHeader className="bg-background border-b border-slate-100 pb-4">
                    <CardTitle className="text-lg font-bold text-foreground">Lesson Plan Approval Queue</CardTitle>
                    <CardDescription className="font-medium text-muted-foreground">Review and approve lesson plans from your department.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                    <TableHeader className="bg-background">
                        <TableRow>
                        <TableHead className="font-semibold text-slate-600">Teacher</TableHead>
                        <TableHead className="hidden sm:table-cell font-semibold text-slate-600">Subject</TableHead>
                        <TableHead className="font-semibold text-slate-600">Status</TableHead>
                        <TableHead className="text-right font-semibold text-slate-600 pr-6">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? Array.from({length: 3}).map((_, i) => (
                           <TableRow key={i}>
                                <TableCell className="pl-6"><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                                <TableCell className="text-right pr-6"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                           </TableRow>
                        )) : notes.length > 0 ? notes.map((note) => (
                        <TableRow key={note.id} className="hover:bg-background transition-colors">
                            <TableCell className="pl-6">
                              <div className="font-semibold text-slate-900">{note.teacherName}</div>
                              <div className="text-xs text-muted-foreground hidden md:table-cell mt-0.5">{note.title}</div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell font-medium text-slate-600">{note.subject}</TableCell>
                            <TableCell>
                              <Badge variant={statusVariant(note.status)} className="capitalize font-semibold">{note.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <Button asChild variant="outline" size="sm" className="font-semibold border-border hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all">
                                  <Link href={`/dashboard/lesson-notes/${note.id}`}>Review</Link>
                              </Button>
                            </TableCell>
                        </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground font-medium">No lesson plans in the queue.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                    </Table>
                </CardContent>
            </Card>
            
            <Card className="shadow-sm border-border">
                <CardHeader>
                    <CardTitle className="text-lg font-bold text-foreground">Class Averages by Subject</CardTitle>
                    <CardDescription className="font-medium text-muted-foreground">Average performance in subjects across your department.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="w-full h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                         <BarChartRecharts data={subjectPerformanceData}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="subject" tickLine={false} axisLine={false} tickMargin={12} fontSize={12} fontWeight={500} fill="#64748b" />
                            <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tickMargin={12} fontSize={12} fill="#64748b" />
                             <ChartTooltip content={<ChartTooltipContent indicator="dot" />} cursor={{fill: '#f8fafc'}} />
                             <BarRechart dataKey="average" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                {subjectPerformanceData.map(entry => <Cell key={entry.subject} fill={entry.color} />)}
                            </BarRechart>
                         </BarChartRecharts>
                    </ResponsiveContainer>
                   </ChartContainer>
                </CardContent>
            </Card>
        </div>
        
        <div className="lg:col-span-1 space-y-6">
             <Card className="shadow-sm border-border">
                <CardHeader>
                    <CardTitle className="text-lg font-bold text-foreground">Department Submission</CardTitle>
                    <CardDescription className="font-medium text-muted-foreground">Overview of lesson note statuses.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? ( <Skeleton className="h-[250px] w-full rounded-full" /> ) : totalNotes > 0 ? (
                        <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[250px]">
                            <PieChart>
                                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                                <Pie data={submissionStatusData} dataKey="value" nameKey="name" innerRadius={70} strokeWidth={4} paddingAngle={2}>
                                    {submissionStatusData.map((entry) => (
                                        <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <ChartLegend content={<ChartLegendContent className="flex-wrap" nameKey="name" />} />
                            </PieChart>
                        </ChartContainer>
                    ) : (
                         <div className="flex h-[250px] items-center justify-center text-center text-muted-foreground font-medium bg-background rounded-full border border-dashed border-border mx-8">
                            <p>No submission data available.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
            
            <Card className="shadow-sm border-border">
                <CardHeader>
                    <CardTitle className="text-lg font-bold text-foreground">Grading Progress</CardTitle>
                    <CardDescription className="font-medium text-muted-foreground">Status of score entry for the current term.</CardDescription>
                </CardHeader>
                <CardContent className="pb-8">
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="font-semibold text-slate-700">Midterm Scores</span>
                          <span className="font-bold text-indigo-600">45%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: '45%' }}></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="font-semibold text-slate-700">Final Exams</span>
                          <span className="font-bold text-emerald-600">12%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div className="bg-emerald-600 h-2.5 rounded-full" style={{ width: '12%' }}></div>
                        </div>
                      </div>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}

    
