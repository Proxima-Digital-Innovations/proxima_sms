
'use client';
import { Book, CheckCircle, Clock, FileQuestion, Upload, XCircle, LineChart as LineChartIcon, PieChart as PieChartIcon, Calendar, ClipboardCheck, Edit3, ChevronDown, Presentation, ArrowRight, Award, BookOpen } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  const { user, activeModules } = useRole();
  const isTertiary = activeModules?.includes('TERTIARY_INSTITUTION');
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
      setRecentNotes([]);
      setSubmissionHistory([]);

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
          Welcome, {user?.firstName || user?.lastName ? `${user.firstName} ${user.lastName}` : 'Teacher'}. Manage your submissions and data.
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
                           <Button size="lg" className="w-full justify-start font-medium">
                             <Upload className="mr-2 h-4 w-4"/> Upload Document
                           </Button>
                        </DialogTrigger>
                        <DialogContent className={isTertiary ? "max-w-xl" : "max-w-md"}>
                            <DialogHeader>
                                <DialogTitle>Upload Document / Learning Materials</DialogTitle>
                                <DialogDescription>
                                {isTertiary
                                  ? "Choose whether to upload tertiary lecture notes and audio to your courses, or submit a secondary school lesson plan."
                                  : "Select the class, subject, document type, and upload your file. It will be routed to the correct reviewer."}
                                </DialogDescription>
                            </DialogHeader>
                            {isTertiary && (
                              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 my-2 flex items-center justify-between">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Presentation className="h-4 w-4 text-primary" />
                                    <h4 className="text-sm font-bold text-foreground">Lecturer Teaching Studio</h4>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Upload lecture notes (PDF/Word), audio recordings, and assignments for your registered university students.
                                  </p>
                                </div>
                                <Button asChild size="sm" className="shrink-0 ml-4">
                                  <Link href="/dashboard/tertiary/lecturer-studio" onClick={() => setIsModalOpen(false)}>
                                    Open Studio <ArrowRight className="ml-1 h-3.5 w-3.5" />
                                  </Link>
                                </Button>
                              </div>
                            )}
                            <div className={isTertiary ? "border-t border-border pt-4 mt-2" : ""}>
                              {isTertiary && <p className="text-xs font-semibold text-muted-foreground mb-3">Or submit secondary school lesson plan / exam questions:</p>}
                              <DocumentSubmissionForm onNoteAdded={handleSubmissionAdded} />
                            </div>
                        </DialogContent>
                    </Dialog>

                    {isTertiary ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="lg" className="w-full justify-between font-medium">
                            <span className="flex items-center">
                              <Edit3 className="mr-2 h-4 w-4 text-primary" /> Enter / Grade Scores
                            </span>
                            <ChevronDown className="h-4 w-4 opacity-50" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                          <DropdownMenuLabel>Grading & Assessment</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href="/dashboard/tertiary/lecturer-studio" className="cursor-pointer flex items-center p-2">
                              <Presentation className="mr-2.5 h-4 w-4 text-emerald-600" />
                              <div>
                                <p className="font-semibold text-xs">Continuous Assessment (CA)</p>
                                <p className="text-[11px] text-muted-foreground">Assignments & coursework grading</p>
                              </div>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/dashboard/tertiary/exams" className="cursor-pointer flex items-center p-2">
                              <Award className="mr-2.5 h-4 w-4 text-violet-600" />
                              <div>
                                <p className="font-semibold text-xs">Exam Grading (Blind Token)</p>
                                <p className="text-[11px] text-muted-foreground">Anonymous tertiary semester exams</p>
                              </div>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href="/dashboard/scores/enter" className="cursor-pointer flex items-center p-2">
                              <BookOpen className="mr-2.5 h-4 w-4 text-blue-600" />
                              <div>
                                <p className="font-semibold text-xs">Secondary School Scores</p>
                                <p className="text-[11px] text-muted-foreground">Termly class scoresheet</p>
                              </div>
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Button asChild variant="outline" size="lg" className="w-full justify-start font-medium">
                        <Link href="/dashboard/scores/enter">
                          <Edit3 className="mr-2 h-4 w-4 text-primary" /> Enter Student Scores
                        </Link>
                      </Button>
                    )}

                    <Button asChild variant="outline" size="lg" className="w-full justify-start font-medium">
                        <Link href="/dashboard/teacher/attendance">
                            <ClipboardCheck className="mr-2 h-4 w-4 text-emerald-600" /> Take Attendance
                        </Link>
                    </Button>

                    {isTertiary ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="lg" className="w-full justify-between font-medium">
                            <span className="flex items-center">
                              <Calendar className="mr-2 h-4 w-4 text-violet-600" /> View Timetable
                            </span>
                            <ChevronDown className="h-4 w-4 opacity-50" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                          <DropdownMenuLabel>Schedules & Timetables</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href="/dashboard/tertiary/timetable" className="cursor-pointer flex items-center p-2">
                              <Calendar className="mr-2.5 h-4 w-4 text-violet-600" />
                              <div>
                                <p className="font-semibold text-xs">Lecture Timetable</p>
                                <p className="text-[11px] text-muted-foreground">Weekly course lecture schedule</p>
                              </div>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/dashboard/timetable" className="cursor-pointer flex items-center p-2">
                              <BookOpen className="mr-2.5 h-4 w-4 text-blue-600" />
                              <div>
                                <p className="font-semibold text-xs">Examination Timetable</p>
                                <p className="text-[11px] text-muted-foreground">General institutional exam schedule</p>
                              </div>
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Button asChild variant="outline" size="lg" className="w-full justify-start font-medium">
                        <Link href="/dashboard/timetable">
                            <Calendar className="mr-2 h-4 w-4 text-violet-600" /> View Timetable
                        </Link>
                      </Button>
                    )}
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
