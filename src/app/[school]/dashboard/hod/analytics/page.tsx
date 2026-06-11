
'use client';

import { BarChart, BookCopy, FileQuestion, Users, Sparkles, Loader2, AlertTriangle } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/context/role-context';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState, useCallback, useTransition } from 'react';
import { dbService } from '@/lib/dbService';
import { Bar, BarChart as BarChartRecharts, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { MockUser, MockLessonNote } from '@/lib/schema';
import { aiEngine } from '@/ai';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type SubmissionStats = {
  name: string;
  'Lesson Plans': number;
  'Exam Questions': number;
};

type TeacherStats = {
  id: string;
  name: string;
  lessonNotes: number;
  examQuestions: number;
  total: number;
}

export default function HodAnalyticsPage() {
  const { user, isLoading: userIsLoading } = useRole();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [departmentName, setDepartmentName] = useState<string>('');
  const [submissionStats, setSubmissionStats] = useState<SubmissionStats[]>([]);
  const [teacherStats, setTeacherStats] = useState<TeacherStats[]>([]);
  const [isGenerating, startAiTransition] = useTransition();
  const [aiNarrative, setAiNarrative] = useState<string | null>(null);

  
  const chartConfig = {
    'Lesson Plans': { label: 'Lesson Plans', color: 'hsl(var(--chart-1))' },
    'Exam Questions': { label: 'Exam Questions', color: 'hsl(var(--chart-2))' },
  };

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Get HOD's department
      const hodUser = await dbService.getDoc<MockUser>('users', user.uid);
      if (!hodUser || !hodUser.department) {
        toast({ title: "Error", description: "Could not determine your department." });
        return;
      }
      setDepartmentName(hodUser.department);

      // Get all teachers in that department
      const departmentTeachers = await dbService.getDocs<MockUser>('users', [
        { type: 'where', fieldPath: 'department', opStr: '==', value: hodUser.department },
        { type: 'where', fieldPath: 'role', opStr: '==', value: 'Teacher' },
      ]);
      const teacherIds = departmentTeachers.map(t => t.id);

      if (teacherIds.length === 0) {
        setIsLoading(false);
        return;
      }

      // Fetch all lesson notes and exam questions from those teachers
      const [lessonNotes, examQuestions] = await Promise.all([
        dbService.getDocs<MockLessonNote>('lessonNotes', [{ type: 'where', fieldPath: 'teacherId', opStr: 'in', value: teacherIds }]),
        dbService.getDocs<MockLessonNote>('examQuestions', [{ type: 'where', fieldPath: 'teacherId', opStr: 'in', value: teacherIds }])
      ]);

      // Process submission stats for the chart
      const stats: SubmissionStats[] = [
        { name: 'Approved', 'Lesson Plans': 0, 'Exam Questions': 0 },
        { name: 'Pending', 'Lesson Plans': 0, 'Exam Questions': 0 },
        { name: 'Rejected', 'Lesson Plans': 0, 'Exam Questions': 0 },
      ];

      lessonNotes.forEach(note => {
        if (note.status.includes('Approved')) stats[0]['Lesson Plans']++;
        else if (note.status.includes('Pending')) stats[1]['Lesson Plans']++;
        else if (note.status.includes('Rejected') || note.status.includes('Revision')) stats[2]['Lesson Plans']++;
      });
      examQuestions.forEach(q => {
        if (q.status.includes('Approved')) stats[0]['Exam Questions']++;
        else if (q.status.includes('Pending')) stats[1]['Exam Questions']++;
        else if (q.status.includes('Rejected') || q.status.includes('Revision')) stats[2]['Exam Questions']++;
      });
      setSubmissionStats(stats);
      
      // Process stats per teacher
      const tStats: Record<string, TeacherStats> = {};
       departmentTeachers.forEach(t => {
        tStats[t.id] = { id: t.id, name: t.name, lessonNotes: 0, examQuestions: 0, total: 0 };
      });
      lessonNotes.forEach(note => {
        if (tStats[note.teacherId]) {
          tStats[note.teacherId].lessonNotes++;
          tStats[note.teacherId].total++;
        }
      });
      examQuestions.forEach(q => {
        if (tStats[q.teacherId]) {
          tStats[q.teacherId].examQuestions++;
          tStats[q.teacherId].total++;
        }
      });

      setTeacherStats(Object.values(tStats).sort((a,b) => b.total - a.total));

    } catch (e: any) {
      console.error(e);
      toast({ variant: "destructive", title: "Error", description: "Failed to load analytics data." });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!userIsLoading) {
      fetchData();
    }
  }, [userIsLoading, fetchData]);

  const handleGenerateAnalysis = () => {
    if (teacherStats.length === 0) {
      toast({ title: 'No Data', description: 'There is no data to analyze yet.' });
      return;
    }
    startAiTransition(async () => {
      setAiNarrative(null);
      try {
        const result = await aiEngine.academic.narrate({
          context: `An analysis of teacher submission statistics for the ${departmentName} department.`,
          data: teacherStats,
        });
        if (result.narrative) {
          setAiNarrative(result.narrative);
        }
      } catch (e) {
        console.error(e);
        toast({
          variant: 'destructive',
          title: 'Analysis Failed',
          description: 'The AI could not generate an analysis at this time.',
        });
      }
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold">Department Analytics</h1>
        <div className="text-muted-foreground">
          {isLoading ? <Skeleton className="h-5 w-48 mt-1" /> : `Performance overview for the ${departmentName} Department.`}
        </div>
      </div>
      
       <Card>
          <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                      <CardTitle className="flex items-center gap-2"><Sparkles className="text-accent" /> AI-Powered Analysis</CardTitle>
                      <CardDescription>Get a quick narrative summary of your department's performance.</CardDescription>
                  </div>
                   <Button onClick={handleGenerateAnalysis} disabled={isGenerating || isLoading}>
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                       Generate Analysis
                  </Button>
              </div>
          </CardHeader>
           {aiNarrative && (
            <CardContent>
              <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertTitle>AI Narrative</AlertTitle>
                <AlertDescription>{aiNarrative}</AlertDescription>
              </Alert>
            </CardContent>
          )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart /> Submission Status</CardTitle>
                <CardDescription>Status of all documents submitted by your department.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? ( <Skeleton className="h-[300px] w-full" /> ) : (
                  <ChartContainer config={chartConfig} className="w-full h-[300px]">
                    <BarChartRecharts data={submissionStats} accessibilityLayer>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="Lesson Plans" fill="var(--color-Lesson Plans)" radius={4} />
                        <Bar dataKey="Exam Questions" fill="var(--color-Exam Questions)" radius={4} />
                    </BarChartRecharts>
                   </ChartContainer>
              )}
            </CardContent>
         </Card>
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users /> Teacher Submissions</CardTitle>
                <CardDescription>Total submissions from each teacher in your department.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Teacher</TableHead>
                        <TableHead className="text-center">Lesson Plans</TableHead>
                        <TableHead className="text-center">Exam Questions</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? Array.from({length: 3}).map((_, i) => (
                           <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell className="text-center"><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                                <TableCell className="text-center"><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-5 w-8 ml-auto" /></TableCell>
                           </TableRow>
                        )) : teacherStats.length > 0 ? teacherStats.map((stat) => (
                        <TableRow key={stat.id}>
                            <TableCell>
                                <div className="font-medium">{stat.name}</div>
                            </TableCell>
                            <TableCell className="text-center">{stat.lessonNotes}</TableCell>
                            <TableCell className="text-center">{stat.examQuestions}</TableCell>
                            <TableCell className="text-right font-bold">{stat.total}</TableCell>
                        </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">No teachers or submissions found in this department.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                    </Table>
            </CardContent>
          </Card>
      </div>
    </div>
  )
}
