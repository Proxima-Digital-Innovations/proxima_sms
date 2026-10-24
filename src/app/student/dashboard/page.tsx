'use client';

import { useState, useEffect } from 'react';
import { getStudentDashboardData } from '@/actions/student-actions';
import { 
  BookOpen, Calendar, Clock, CreditCard, CheckCircle, 
  ChevronRight, Layout, Zap, AlertCircle,
  FileText, TrendingUp, Wallet, GraduationCap, Award
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function StudentDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await getStudentDashboardData();
        if (res.success) setData(res.data);
      } catch (error) {
        console.error("Failed to load student dashboard", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm font-medium">Loading student portal...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
          <h2 className="text-lg font-bold text-foreground">Unable to load student profile</h2>
          <p className="text-muted-foreground text-sm">Please refresh the page to try again.</p>
        </div>
      </div>
    );
  }

  const {
    profile,
    stats,
    upcomingAssignments = [],
    availableQuizzes = [],
    recentModules = [],
    recentGrades = [],
  } = data;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Student Profile Welcome Banner */}
      <Card className="border-border bg-card shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-semibold">
                <GraduationCap className="w-3.5 h-3.5 mr-1" /> Secondary Student Portal
              </Badge>
              <Badge variant="secondary" className="font-mono text-xs">
                {profile?.class?.name || 'Assigned Class'}
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Welcome back, {profile?.firstName} {profile?.lastName}!
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-mono">
              Admission / Student ID: <strong className="text-foreground">{profile?.studentId || 'N/A'}</strong>
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="bg-muted/40 border border-border p-3.5 px-5 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Attendance</div>
                <div className="text-xl font-black text-foreground font-mono">{Math.round(stats?.attendanceRate || 100)}%</div>
              </div>
            </div>
            <div className="bg-muted/40 border border-border p-3.5 px-5 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20">
                <Wallet className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Fees Balance</div>
                <div className="text-xl font-black text-foreground font-mono">₦{Number(stats?.totalBalance || 0).toLocaleString()}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Feed: Assignments, Quizzes & Learning Modules */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-border bg-card rounded-2xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" /> Class Assignments &amp; Assessments
              </CardTitle>
              <CardDescription className="text-xs">
                Active homework, classwork, and CBT quizzes published for {profile?.class?.name || 'your class'}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingAssignments.map((as: any) => (
                <Link
                  key={as.id}
                  href="/student/lms/assignments"
                  className="flex items-center justify-between p-3.5 bg-muted/30 hover:bg-muted/60 rounded-xl transition-all border border-border group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 text-primary rounded-lg">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-foreground">{as.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {as.subject?.name || 'Subject'} • {as.points || 100} Points
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">Assignment</Badge>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              ))}

              {availableQuizzes.map((q: any) => (
                <Link
                  key={q.id}
                  href="/student/lms/quizzes"
                  className="flex items-center justify-between p-3.5 bg-amber-500/5 hover:bg-amber-500/10 rounded-xl transition-all border border-amber-500/20 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-foreground">{q.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {q.module?.subject?.name || 'Quiz'} • {q.timeLimit || 30} Mins
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-500 text-black text-[10px] font-bold">Start Quiz</Badge>
                    <ChevronRight className="w-4 h-4 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              ))}

              {upcomingAssignments.length === 0 && availableQuizzes.length === 0 && (
                <div className="py-10 bg-muted/20 rounded-xl text-center border border-dashed border-border">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
                  <p className="text-sm font-semibold text-foreground">No pending assignments or quizzes</p>
                  <p className="text-xs text-muted-foreground mt-0.5">You are all caught up for {profile?.class?.name || 'this term'}.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card rounded-2xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Layout className="w-5 h-5 text-primary" /> Recent Learning Modules &amp; Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recentModules.map((mod: any) => (
                  <div
                    key={mod.id}
                    className="p-4 bg-muted/20 border border-border rounded-xl hover:border-primary/40 transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline" className="text-[10px] font-bold text-primary">
                        {mod.subject?.name || 'Subject'}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">{mod.content?.length || 0} items</span>
                    </div>
                    <h3 className="font-bold text-sm text-foreground mb-2">{mod.title}</h3>
                    <Link
                      href="/dashboard/elibrary"
                      className="text-xs font-semibold text-primary inline-flex items-center gap-1 hover:underline"
                    >
                      Open Resources <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
                {recentModules.length === 0 && (
                  <div className="col-span-2 py-8 text-center text-muted-foreground text-xs border border-dashed rounded-xl">
                    No learning modules published for your class yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: My Subject Grades & Quick Links */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-border bg-card rounded-2xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" /> My Term Performance
              </CardTitle>
              <CardDescription className="text-xs">
                Recorded subject scores for {profile?.firstName} {profile?.lastName}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {recentGrades.length > 0 ? (
                recentGrades.map((g: any) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border/60"
                  >
                    <div>
                      <span className="text-xs font-bold text-foreground block">{g.subject?.name || 'Subject'}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">Total: {g.total}%</span>
                    </div>
                    <Badge variant="outline" className="font-mono font-bold text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                      {g.grade || (g.total >= 70 ? 'A' : g.total >= 60 ? 'B' : g.total >= 50 ? 'C' : 'P')}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  Term scores are currently being compiled by your subject teachers.
                </div>
              )}

              <Button asChild variant="outline" className="w-full mt-2 rounded-xl text-xs">
                <Link href="/dashboard/performance">View My Academic Record</Link>
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/dashboard/timetable"
              className="p-4 bg-card border border-border rounded-2xl hover:border-primary/40 transition-colors text-center group shadow-sm"
            >
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs font-bold text-foreground">Class Timetable</span>
            </Link>
            <Link
              href="/dashboard/elibrary"
              className="p-4 bg-card border border-border rounded-2xl hover:border-primary/40 transition-colors text-center group shadow-sm"
            >
              <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
                <BookOpen className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-xs font-bold text-foreground">e-Library</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
