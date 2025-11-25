
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
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { MockLessonNote, MockUser } from '@/lib/schema';
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


type SubmissionStatusData = {
  name: string;
  value: number;
  fill: string;
};

// Placeholder data until backend is ready
const subjectPerformanceData = [
  { subject: 'Math', average: 0, color: 'hsl(var(--chart-1))' },
  { subject: 'English', average: 0, color: 'hsl(var(--chart-2))' },
  { subject: 'Science', average: 0, color: 'hsl(var(--chart-3))' },
  { subject: 'History', average: 0, color: 'hsl(var(--chart-4))' },
  { subject: 'Art', average: 0, color: 'hsl(var(--chart-5))' },
];

type LessonNoteWithDate = Omit<MockLessonNote, 'submissionDate' | 'submittedOn'> & {
  submissionDate: string | { seconds: number; nanoseconds: number; }; // Keep original for type safety
  submittedOn?: any;
  formattedDate: string;
};

export function HodDashboard() {
  const { user } = useRole();
  const { toast } = useToast();
  const [notes, setNotes] = useState<LessonNoteWithDate[]>([]);
  const [staff, setStaff] = useState<MockUser[]>([]);
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
      // In a real app, these queries would be scoped by the HOD's department.
      // For now, we fetch all relevant data to demonstrate the UI.
      const notesQuery = query(collection(db, 'lessonNotes'), orderBy('submittedOn', 'desc'));
      const notesSnapshot = await getDocs(notesQuery);
      const notesList = notesSnapshot.docs.map(doc => {
        const data = doc.data() as MockLessonNote;
        let formattedDate = 'Invalid Date';
        try {
          if (data.submittedOn?.seconds) {
              formattedDate = format(new Date(data.submittedOn.seconds * 1000), 'PPP');
          } else if (typeof data.submissionDate === 'string' && !isNaN(new Date(data.submissionDate).getTime())) {
               formattedDate = format(new Date(data.submissionDate), 'PPP');
          }
        } catch(e) {
            console.warn(`Could not parse date for note ${doc.id}:`, data.submittedOn || data.submissionDate);
        }

        return { 
            ...data,
            id: doc.id,
            formattedDate: formattedDate
        } as LessonNoteWithDate;
      });
      setNotes(notesList.slice(0, 5)); // Show recent 5

      const approved = notesList.filter(n => n.status === 'Approved').length;
      const pending = notesList.filter(n => n.status.includes('Pending')).length;
      const rejected = notesList.filter(n => n.status.includes('Rejected') || n.status.includes('Revision')).length;
      
      setSubmissionStatusData([
        { name: 'Approved', value: approved, fill: 'hsl(var(--chart-2))' },
        { name: 'Pending', value: pending, fill: 'hsl(var(--chart-4))' },
        { name: 'Rejected', value: rejected, fill: 'hsl(var(--destructive))' },
      ]);


      // In a real app, this should filter by the HOD's department
      const staffQuery = query(collection(db, 'users'), where('role', '==', 'Teacher'));
      const staffSnapshot = await getDocs(staffQuery);
      const staffList = staffSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as MockUser));
      setStaff(staffList.slice(0, 5));
      
      setStats({
        pending,
        approved,
        rejected,
        staffCount: staffList.length,
      });

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
    if (status.includes('Approved')) return 'default';
    if (status.includes('Pending')) return 'secondary';
    if (status.includes('Rejected') || status.includes('Revision')) return 'destructive';
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

    