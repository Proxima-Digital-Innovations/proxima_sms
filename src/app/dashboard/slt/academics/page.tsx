'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FileEdit, BookOpen, AlertTriangle, ArrowRight, BarChart3, Users, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getAcademicOverviewStats } from '@/actions/slt-actions';
import { Skeleton } from '@/components/ui/skeleton';

export default function SltAcademicOversightPage() {
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Fetch real stats
        async function loadStats() {
            try {
                const res = await getAcademicOverviewStats();
                if (res.success) {
                    setStats(res.data);
                } else {
                    console.error('Failed to load stats:', res.error);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        }
        loadStats();
    }, []);

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 pb-20">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Academic Oversight</h1>
                <p className="text-muted-foreground mt-1">High-level view of school-wide academic progress, score submissions, and lesson planning.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Score Submissions</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-20" /> : (
                            <>
                                <div className="text-2xl font-bold">{stats?.scoreSubmissionRate || 0}%</div>
                                <Progress value={stats?.scoreSubmissionRate || 0} className="h-2 mt-3 bg-muted" />
                            </>
                        )}
                    </CardContent>
                </Card>
                <Card className="border shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approvals</CardTitle>
                        <FileEdit className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : (
                            <>
                                <div className="text-2xl font-bold">{stats?.pendingLessonNotes || 0}</div>
                                <p className="text-xs text-muted-foreground mt-1">Lesson notes awaiting HOD review</p>
                            </>
                        )}
                    </CardContent>
                </Card>
                <Card className="border shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Active Classes</CardTitle>
                        <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : (
                            <>
                                <div className="text-2xl font-bold">{stats?.totalClasses || 0}</div>
                                <p className="text-xs text-muted-foreground mt-1">Configured for the term</p>
                            </>
                        )}
                    </CardContent>
                </Card>
                <Card className="border shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Missing Grades</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-rose-500" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : (
                            <>
                                <div className="text-2xl font-bold">{stats?.missingGrades || 0}</div>
                                <p className="text-xs text-muted-foreground mt-1">Students without complete records</p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="border shadow-sm flex flex-col">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-indigo-500" />
                            Academic Tools
                        </CardTitle>
                        <CardDescription>Quick access to school-wide academic operations</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Button asChild variant="outline" className="h-auto py-4 flex flex-col items-center justify-center gap-2 bg-secondary/40 hover:bg-secondary/80 text-foreground">
                                <Link href="/dashboard/results/generate">
                                    <BarChart3 className="h-6 w-6 text-foreground" />
                                    <span className="text-sm font-medium">Generate Results</span>
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="h-auto py-4 flex flex-col items-center justify-center gap-2 bg-secondary/40 hover:bg-secondary/80 text-foreground">
                                <Link href="/dashboard/results/view">
                                    <BookOpen className="h-6 w-6 text-foreground" />
                                    <span className="text-sm font-medium">View Broadsheets</span>
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="h-auto py-4 flex flex-col items-center justify-center gap-2 bg-secondary/40 hover:bg-secondary/80 text-foreground">
                                <Link href="/dashboard/system/classes-subjects">
                                    <Users className="h-6 w-6 text-foreground" />
                                    <span className="text-sm font-medium">Manage Classes</span>
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="h-auto py-4 flex flex-col items-center justify-center gap-2 bg-secondary/40 hover:bg-secondary/80 text-foreground">
                                <Link href="/dashboard/system/grading">
                                    <FileEdit className="h-6 w-6 text-foreground" />
                                    <span className="text-sm font-medium">Grading System</span>
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border shadow-sm flex flex-col">
                    <CardHeader>
                        <CardTitle className="text-lg">Recent Compliance Alerts</CardTitle>
                        <CardDescription>System-generated alerts for academic processes</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <div className="space-y-4">
                            {isLoading ? (
                                <div className="space-y-3">
                                    <Skeleton className="h-12 w-full" />
                                    <Skeleton className="h-12 w-full" />
                                </div>
                            ) : stats?.alerts?.length > 0 ? (
                                stats.alerts.map((alert: any, idx: number) => (
                                    <div key={idx} className="flex items-start gap-3 p-3 rounded-md bg-amber-50 border border-amber-100 dark:bg-amber-950/30 dark:border-amber-900/50">
                                        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5" />
                                        <div>
                                            <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">{alert.title}</h4>
                                            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">{alert.message}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center p-6 border border-dashed rounded-md bg-slate-50 dark:bg-slate-900">
                                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                                    <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">All Systems Normal</h3>
                                    <p className="text-xs text-muted-foreground mt-1">No critical compliance alerts at this time.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
