
'use client';
import {
  BarChart,
  CalendarCheck,
  Megaphone,
  FileText,
  DollarSign
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
import { Progress } from '@/components/ui/progress';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell } from 'recharts';
import { useRole } from '@/context/role-context';
import { useEffect, useState, useCallback } from 'react';
import { getStudents } from '@/actions/student-actions';
import { Skeleton } from '@/components/ui/skeleton';
import type { Student, ReportCard } from '@/lib/schema';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// Mock data, to be replaced with live data
const announcements: { id: number; title: string; content: string;}[] = [];

const feeHistoryData = [
  { name: 'Term 1 Fees', value: 0, fill: 'hsl(var(--chart-2))' },
  { name: 'Term 2 Fees', value: 0, fill: 'hsl(var(--chart-2))' },
  { name: 'Term 3 Fees', value: 0, fill: 'hsl(var(--destructive))' },
];

const chartConfig = {
  average: { label: 'Average %', color: 'hsl(var(--chart-1))' },
  paid: { label: 'Paid', color: 'hsl(var(--chart-2))' },
  unpaid: { label: 'Unpaid', color: 'hsl(var(--destructive))' },
};


export function ParentDashboard() {
  const { user } = useRole();
  const [isLoading, setIsLoading] = useState(true);
  const [childData, setChildData] = useState<Student | null>(null);
  const [latestReport, setLatestReport] = useState<ReportCard | null>(null);

  const fetchChildAndReportData = useCallback(async () => {
    if (!user) {
        setIsLoading(false);
        return;
    };
    setIsLoading(true);
    try {
      const response = await getStudents();
      if (response.success && response.data) {
          // Find student matching the user
          // For simplicity, finding the first student
          const student = response.data[0];
          setChildData(student as any);
      }
    } catch (error) {
      console.error("Error fetching child's data or report:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchChildAndReportData();
  }, [fetchChildAndReportData]);
  
  
  const studentDisplayName = childData ? `${childData.firstName} ${childData.lastName}` : "your child";
  const overallAttendance = 0; // Placeholder

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-headline text-3xl font-bold">Parent Dashboard</h1>
        <p className="text-muted-foreground">
           Welcome! Here's a summary of {isLoading ? <Skeleton className="h-5 w-32 inline-block" /> : studentDisplayName}'s performance.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Latest Result</CardTitle>
            <FileText className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-16 w-full" /> : latestReport ? (
                <>
                    <div className="text-2xl font-bold">{latestReport.overallGrade} ({latestReport.average.toFixed(1)}%)</div>
                    <p className="text-xs text-muted-foreground">
                       Class Rank: {latestReport.classRank}
                    </p>
                    <Button asChild size="sm" className="mt-2">
                        <Link href={`/dashboard/results/report/${latestReport.id}`}>View Full Report</Link>
                    </Button>
                </>
            ) : (
                <p className="text-sm text-muted-foreground pt-2">No report card available yet for this term.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overall Attendance</CardTitle>
            <CalendarCheck className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallAttendance.toFixed(1)}%</div>
            <Progress value={overallAttendance} className="mt-2 h-2" />
             <p className="text-xs text-muted-foreground pt-2">Attendance data is coming soon.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Recent Announcements</CardTitle>
                    <CardDescription>
                    Important updates from the school administration.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {announcements.length > 0 ? (
                    announcements.map((ann) => (
                        <div key={ann.id} className="flex items-start gap-4 rounded-md border p-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Megaphone className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold">{ann.title}</h3>
                            <p className="text-sm text-muted-foreground">{ann.content}</p>
                        </div>
                        </div>
                    ))
                    ) : (
                    <div className="flex h-24 items-center justify-center text-center text-muted-foreground">
                        <p>No announcements at this time.</p>
                    </div>
                    )}
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
             <Card>
                <CardHeader>
                    <CardTitle>Fee Payment History</CardTitle>
                    <CardDescription>Status of school fee payments.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[250px]">
                        <PieChart>
                            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                            <Pie data={feeHistoryData} dataKey="value" nameKey="name" innerRadius={50}>
                                {feeHistoryData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                            </Pie>
                            <ChartLegend content={<ChartLegendContent className="flex-wrap" nameKey="name" />} />
                        </PieChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
