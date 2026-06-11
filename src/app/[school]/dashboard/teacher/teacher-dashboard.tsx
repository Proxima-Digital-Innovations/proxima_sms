
'use client';
import { Book, CheckCircle, Clock, FileQuestion, Upload, XCircle, LineChart as LineChartIcon, PieChart as PieChartIcon } from 'lucide-react';
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
import { useEffect, useState, useCallback } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from '@/lib/firebase-stubs';
import { db, auth, storage } from "@/lib/firebase";
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
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
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
      // Fetch all notes for stats and charts
      const allNotesQuery = query(collection(db, 'lessonNotes'), where('teacherId', '==', user.uid));
      const allNotesSnapshot = await getDocs(allNotesQuery);
      
      // Explicitly type doc as any to avoid implicit any errors
      const allNotesList = allNotesSnapshot.docs.map((doc: any) => ({...doc.data() as MockLessonNote, id: doc.id}));
      
      // Sort client-side to avoid needing a composite index. Explicitly type sorting parameters.
      allNotesList.sort((a: any, b: any) => (b.submittedOn?.seconds || 0) - (a.submittedOn?.seconds || 0));

      setRecentNotes(allNotesList.slice(0, 3));
      
      const monthCounts: Record<string, number> = {};
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ];
      monthNames.forEach((m) => (monthCounts[m] = 0));

      // Explicitly type note as any
      allNotesList.forEach((note: any) => {
        if (note.submittedOn?.seconds) {
            const date = new Date(note.submittedOn.seconds * 1000);
            const month = monthNames[date.getMonth()];
            if (month) {
              monthCounts[month]++;
            }
        }
      });
      
      setSubmissionHistory(monthNames.map(month => ({ month, submitted: monthCounts[month] || 0 })));


      // Fetch exam questions stats
      const examsQuery = query(collection(db, 'examQuestions'), where('teacherId', '==', user.uid), where('status', '==', 'Pending Review'));
      const examsSnapshot = await getDocs(examsQuery);

      // Explicitly type n as any inside the filter lambdas
      setStats({
        pendingPlans: allNotesList.filter((n: any) => n.status.includes('Pending')).length,
        approvedPlans: allNotesList.filter((n: any) => n.status.includes('Approved')).length,
        rejectedPlans: allNotesList.filter((n: any) => n.status.includes('Rejected') || n.status.includes('Revision')).length,
        pendingExams: examsSnapshot.size,
      });

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch your dashboard data.",
      });
    } finally {
        setIsLoading(false);
    }
  }, [user, toast]);

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
  
  const totalSubmissions = stats.approvedPlans + stats.pendingPlans + stats.rejectedPlans;

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="font-headline text-2xl md:text-3xl font-bold">Teacher Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome, {user?.name || 'Teacher'}. Manage your submissions and data.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Pending Plans</CardTitle>
            <Clock className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-10"/> : stats.pendingPlans}</div>
            <p className="text-xs text-muted-foreground">Lesson plans awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Approved Plans</CardTitle>
            <CheckCircle className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-10"/> : stats.approvedPlans}</div>
             <p className="text-xs text-muted-foreground">Total plans approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Pending Questions</CardTitle>
            <FileQuestion className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-10"/> : stats.pendingExams}</div>
            <p className="text-xs text-muted-foreground">Exam questions awaiting review</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Returned for Correction</CardTitle>
            <XCircle className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-10"/> : stats.rejectedPlans}</div>
            <p className="text-xs text-muted-foreground">Plans needing your review</p>
          </CardContent>
        </Card>
      </div>

       <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Recent Lesson Plan Submissions</CardTitle>
                    <CardDescription>
                    Track the status of your recent uploads.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead className="hidden sm:table-cell">Subject</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                          Array.from({length: 3}).map((_, i) => (
                            <TableRow key={i}>
                              <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                              <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                              <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                              <TableCell className="text-right"><Skeleton className="h-8 w-20" /></TableCell>
                            </TableRow>
                          ))
                        ) : recentNotes.length > 0 ? recentNotes.map((note) => (
                        <TableRow key={note.id}>
                            <TableCell className="font-medium">{note.title}</TableCell>
                            <TableCell className="hidden sm:table-cell">{note.subject}</TableCell>
                            <TableCell>
                               <Badge variant={statusVariant(note.status)}>{note.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                            <Button asChild variant="outline" size="sm">
                                <Link href={`/dashboard/lesson-notes/${note.id}`}>View</Link>
                            </Button>
                            </TableCell>
                        </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                    No recent submissions.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Class Performance Trend</CardTitle>
                    <CardDescription>Average performance of your primary class over time. (Placeholder)</CardDescription>
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
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Jump right into your tasks.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                     <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                        <DialogTrigger asChild>
                           <Button size="lg">
                             <Upload className="mr-2"/> Upload Document
                           </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Upload Document</DialogTitle>
                                <DialogDescription>
                                Select the class, subject, document type, and upload your file. It will be routed to the correct reviewer.
                                </DialogDescription>
                            </DialogHeader>
                            <DocumentSubmissionForm onNoteAdded={handleSubmissionAdded} />
                        </DialogContent>
                    </Dialog>
                    <Button asChild variant="outline" size="lg">
                        <Link href="/dashboard/scores">
                            Enter Student Scores
                        </Link>
                    </Button>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>My Submission History</CardTitle>
                    <CardDescription>Your document submissions over the last few months.</CardDescription>
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
                        <div className="flex h-[250px] items-center justify-center text-center text-muted-foreground">
                            <p>No submission history to display.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
