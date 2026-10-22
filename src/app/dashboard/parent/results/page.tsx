'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getWardReportCard } from "@/actions/parent-actions";
import { 
  GraduationCap, 
  Printer, 
  Users, 
  Award, 
  Calendar, 
  BookOpen, 
  CheckCircle2, 
  Building2, 
  UserCheck, 
  ArrowLeft
} from "lucide-react";
import Link from "next/link";

export default function ParentResultsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedTermId, setSelectedTermId] = useState<string>('');

  const fetchReport = useCallback(async (studentId?: string, termId?: string) => {
    setIsLoading(true);
    try {
      const res: any = await getWardReportCard(studentId, termId);
      if (res.success) {
        setData(res);
        if (!studentId && res.student?.id) {
          setSelectedStudentId(res.student.id);
        }
        if (!termId && res.currentTerm?.id) {
          setSelectedTermId(res.currentTerm.id);
        }
      }
    } catch (err) {
      console.error("Error loading report card:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport(selectedStudentId || undefined, selectedTermId || undefined);
  }, [fetchReport, selectedStudentId, selectedTermId]);

  const handlePrint = () => {
    window.print();
  };

  const wards = data?.wards || [];
  const student = data?.student;
  const currentTerm = data?.currentTerm;
  const terms = data?.terms || [];
  const grades = data?.grades || [];
  const summary = data?.summary || { totalSubjects: 0, totalScore: 0, averageScore: 0, classRank: 1, classSize: 35, teacherRemark: '', principalRemark: '' };
  const school = data?.school;

  const getGradeBadge = (gradeStr?: string) => {
    const g = (gradeStr || '').toUpperCase();
    if (g.startsWith('A')) return <Badge className="bg-emerald-600 text-white font-mono">{gradeStr}</Badge>;
    if (g.startsWith('B')) return <Badge className="bg-blue-600 text-white font-mono">{gradeStr}</Badge>;
    if (g.startsWith('C')) return <Badge className="bg-amber-600 text-white font-mono">{gradeStr}</Badge>;
    if (g.startsWith('D') || g.startsWith('E')) return <Badge className="bg-orange-600 text-white font-mono">{gradeStr}</Badge>;
    return <Badge variant="destructive" className="font-mono">{gradeStr || 'F'}</Badge>;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Controls Bar (Hidden during print) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button asChild variant="ghost" size="sm" className="-ml-2 h-7 text-xs text-muted-foreground">
              <Link href="/dashboard">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-primary" />
            Terminal Academic Report Card
          </h1>
          <p className="text-sm text-muted-foreground">
            Official cumulative assessment and term results for your ward.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {wards.length > 1 && (
            <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-2.5 py-1 shadow-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground">Ward:</span>
              <Select value={selectedStudentId} onValueChange={(val) => setSelectedStudentId(val)}>
                <SelectTrigger className="w-[150px] h-8 text-xs font-medium border-0 shadow-none focus:ring-0">
                  <SelectValue placeholder="Select child" />
                </SelectTrigger>
                <SelectContent>
                  {wards.map((w: any) => (
                    <SelectItem key={w.id} value={w.id} className="text-xs">
                      {w.firstName} {w.lastName} ({w.class?.name || 'Class'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {terms.length > 0 && (
            <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-2.5 py-1 shadow-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground">Term:</span>
              <Select value={selectedTermId} onValueChange={(val) => setSelectedTermId(val)}>
                <SelectTrigger className="w-[140px] h-8 text-xs font-medium border-0 shadow-none focus:ring-0">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {terms.map((t: any) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button onClick={handlePrint} variant="outline" size="sm" className="h-9 gap-1.5 shadow-sm">
            <Printer className="h-4 w-4" />
            Print Report
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card className="p-8 space-y-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </Card>
      ) : !student ? (
        <Card className="p-12 text-center">
          <Award className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <h3 className="text-lg font-semibold">No Student Record Found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            There are no linked students found for this account.
          </p>
        </Card>
      ) : (
        /* Printable Report Card Sheet */
        <Card className="border-border bg-card shadow-lg print:shadow-none print:border-none overflow-hidden">
          {/* Official Crest & Header */}
          <div className="bg-primary/5 dark:bg-muted/30 border-b border-border p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-2xl shadow-sm">
                  <Building2 className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground font-headline">
                    {school?.schoolName || 'Proxima Academy'}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5 max-w-md">
                    {school?.address || 'Victoria Island, Lagos, Nigeria'} • {school?.email || 'admin@proximahub.com'} • {school?.phone || '+234 800 PROXIMA'}
                  </p>
                  <div className="mt-2 inline-flex items-center gap-2">
                    <Badge variant="secondary" className="text-[11px] font-semibold uppercase tracking-wider">
                      Official Term Transcript
                    </Badge>
                    <Badge variant="outline" className="text-[11px] font-medium">
                      {currentTerm?.name || 'Active Term'} • Academic Year 2026/2027
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Student Bio Quick Box */}
              <div className="w-full sm:w-auto bg-card border border-border rounded-xl p-4 shadow-sm text-left min-w-[240px]">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Student Credentials
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Full Name:</span>
                    <span className="font-bold text-foreground">{student.firstName} {student.lastName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Student ID:</span>
                    <span className="font-mono font-medium text-foreground">{student.studentId || 'STU-PROX'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Class:</span>
                    <span className="font-semibold text-primary">{student.class?.name || 'Assigned Class'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Form Tutor:</span>
                    <span className="font-medium text-foreground">{student.classTeacher}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <CardContent className="p-6 sm:p-8 space-y-8">
            {/* Summary Highlights Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
                <span className="text-xs font-medium text-muted-foreground">Term Average</span>
                <div className="text-2xl font-bold font-mono text-primary mt-1">
                  {summary.averageScore.toFixed(1)}%
                </div>
                <span className="text-[10px] text-muted-foreground">Calculated across {summary.totalSubjects} subjects</span>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
                <span className="text-xs font-medium text-muted-foreground">Class Position</span>
                <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                  {summary.classRank}
                  <span className="text-xs font-normal text-muted-foreground ml-1">/ {summary.classSize} students</span>
                </div>
                <span className="text-[10px] text-muted-foreground">Terminal cohort rank</span>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
                <span className="text-xs font-medium text-muted-foreground">Total Aggregate</span>
                <div className="text-2xl font-bold font-mono text-foreground mt-1">
                  {summary.totalScore}
                  <span className="text-xs font-normal text-muted-foreground ml-1">/ {summary.totalSubjects * 100}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">Total marks achieved</span>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
                <span className="text-xs font-medium text-muted-foreground">Term Attendance</span>
                <div className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                  {summary.termAttendance || 22}
                  <span className="text-xs font-normal text-muted-foreground ml-1">Days</span>
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Verified presence</span>
              </div>
            </div>

            {/* Subject Breakdown Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Subject Assessment & Performance Breakdown
                </h3>
                <span className="text-xs text-muted-foreground font-mono">
                  Scale: CA1 (20) + CA2 (20) + Exam (60) = 100 Total
                </span>
              </div>

              {grades.length === 0 ? (
                <div className="p-8 border border-dashed rounded-xl text-center text-muted-foreground">
                  <p className="text-sm">No scores submitted yet for {currentTerm?.name || 'this term'}.</p>
                </div>
              ) : (
                <div className="border border-border rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 border-b border-border text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="py-3 px-4 text-left">#</th>
                          <th className="py-3 px-4 text-left">Subject</th>
                          <th className="py-3 px-4 text-center">CA 1 (20)</th>
                          <th className="py-3 px-4 text-center">CA 2 (20)</th>
                          <th className="py-3 px-4 text-center">Exam (60)</th>
                          <th className="py-3 px-4 text-center">Total (100)</th>
                          <th className="py-3 px-4 text-center">Grade</th>
                          <th className="py-3 px-4 text-left">Subject Teacher Remark</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {grades.map((g: any, index: number) => (
                          <tr key={g.id || index} className="hover:bg-muted/20 transition-colors">
                            <td className="py-3 px-4 text-xs font-mono text-muted-foreground">{index + 1}</td>
                            <td className="py-3 px-4 font-semibold text-foreground">
                              {g.subject?.name || 'General Subject'}
                            </td>
                            <td className="py-3 px-4 text-center font-mono">{g.ca1 !== null ? g.ca1 : '-'}</td>
                            <td className="py-3 px-4 text-center font-mono">{g.ca2 !== null ? g.ca2 : '-'}</td>
                            <td className="py-3 px-4 text-center font-mono">{g.exam !== null ? g.exam : '-'}</td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-foreground">
                              {g.total !== null ? g.total : '-'}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {getGradeBadge(g.grade)}
                            </td>
                            <td className="py-3 px-4 text-xs text-muted-foreground">
                              {g.remarks || (g.total >= 75 ? 'Outstanding mastery of subject syllabus.' : g.total >= 60 ? 'Good conceptual understanding.' : 'Needs focused revision.')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Official Remarks & Endorsements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="p-5 rounded-xl border border-border bg-muted/20 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <UserCheck className="h-4 w-4 text-primary" />
                  Class Teacher's Remark
                </div>
                <p className="text-sm text-foreground italic font-medium leading-relaxed">
                  "{summary.teacherRemark}"
                </p>
                <div className="pt-3 flex items-center justify-between border-t border-border/60 text-xs text-muted-foreground">
                  <span>Signatory: <strong>{student.classTeacher}</strong></span>
                  <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">Verified</Badge>
                </div>
              </div>

              <div className="p-5 rounded-xl border border-border bg-muted/20 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Principal's Endorsement & Decision
                </div>
                <p className="text-sm text-foreground italic font-medium leading-relaxed">
                  "{summary.principalRemark}"
                </p>
                <div className="pt-3 flex items-center justify-between border-t border-border/60 text-xs text-muted-foreground">
                  <span>Signatory: <strong>Office of Academic Directorate</strong></span>
                  <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">Official Stamp</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
