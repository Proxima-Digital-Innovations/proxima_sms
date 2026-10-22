'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getWardAttendanceHistory } from "@/actions/parent-actions";
import { 
  CalendarCheck, 
  Users, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  ShieldCheck, 
  Calendar
} from "lucide-react";
import Link from "next/link";

export default function ParentAttendancePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  const fetchData = useCallback(async (studentId?: string) => {
    setIsLoading(true);
    try {
      const res: any = await getWardAttendanceHistory(studentId);
      if (res.success) {
        setData(res);
        if (!studentId && res.selectedWard?.id) {
          setSelectedStudentId(res.selectedWard.id);
        }
      }
    } catch (err) {
      console.error("Error loading attendance history:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(selectedStudentId || undefined);
  }, [fetchData, selectedStudentId]);

  const wards = data?.wards || [];
  const selectedWard = data?.selectedWard;
  const records = data?.records || [];
  const stats = data?.stats || { total: 0, present: 0, absent: 0, late: 0, rate: 0 };

  const getStatusBadge = (statusStr: string) => {
    const s = (statusStr || '').toUpperCase();
    if (s === 'PRESENT') {
      return (
        <Badge className="bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 font-medium">
          <CheckCircle2 className="h-3 w-3" /> Present
        </Badge>
      );
    }
    if (s === 'LATE') {
      return (
        <Badge className="bg-amber-600/15 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 font-medium">
          <Clock className="h-3 w-3" /> Late Arrival
        </Badge>
      );
    }
    if (s === 'EXCUSED') {
      return (
        <Badge className="bg-blue-600/15 text-blue-600 dark:text-blue-400 border-blue-500/30 gap-1 font-medium">
          <ShieldCheck className="h-3 w-3" /> Excused
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="gap-1 font-medium">
        <XCircle className="h-3 w-3" /> Absent
      </Badge>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
            <CalendarCheck className="h-7 w-7 text-emerald-500" />
            Classroom & Biometric Attendance
          </h1>
          <p className="text-sm text-muted-foreground">
            Real-time daily presence, punctuality tracking, and verification log for your ward.
          </p>
        </div>

        {/* Multi-Child Selector */}
        {wards.length > 1 && (
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-3 py-1.5 shadow-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground">Ward:</span>
            <Select value={selectedStudentId} onValueChange={(val) => setSelectedStudentId(val)}>
              <SelectTrigger className="w-[180px] h-8 text-xs font-medium border-0 shadow-none focus:ring-0">
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
      </div>

      {/* Summary Attendance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Overall Attendance Rate</CardTitle>
            <CalendarCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {stats.rate}%
            </div>
            <Progress value={stats.rate} className="mt-2 h-1.5" />
            <p className="text-[11px] text-muted-foreground mt-2">
              {stats.rate >= 90 ? 'Exemplary attendance record' : 'Regular attendance recommended'}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Verified Days Present</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-foreground">
              {stats.present} <span className="text-xs text-muted-foreground font-normal">/ {stats.total} days</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">Classroom roll call & entry gate verified</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Late Arrivals</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {stats.late} <span className="text-xs text-muted-foreground font-normal">sessions</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">Recorded past official morning assembly</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Unexcused Absences</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${stats.absent > 0 ? 'text-destructive' : 'text-emerald-500'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold font-mono ${stats.absent > 0 ? 'text-destructive' : 'text-foreground'}`}>
              {stats.absent} <span className="text-xs text-muted-foreground font-normal">days</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              {stats.absent === 0 ? 'Zero unexcused absences' : 'Notice sent to parent contact'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Attendance Records Table */}
      <Card className="rounded-2xl border-border bg-card shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border/60 bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Attendance Log for {selectedWard?.firstName} {selectedWard?.lastName}
              </CardTitle>
              <CardDescription className="text-xs">
                Class: {selectedWard?.class?.name || 'Assigned Class'} • Verified academic term entries
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <CalendarCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <h3 className="text-lg font-semibold">No Attendance Records Found</h3>
              <p className="text-sm mt-1">Attendance logging for this student will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4 text-left">Date</th>
                    <th className="py-3 px-4 text-left">Day</th>
                    <th className="py-3 px-4 text-left">Term</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-left">Verification Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {records.map((rec: any) => {
                    const d = new Date(rec.date);
                    const dayName = d.toLocaleDateString('en-GB', { weekday: 'long' });
                    const formattedDate = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

                    return (
                      <tr key={rec.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-foreground">
                          {formattedDate}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground font-medium">
                          {dayName}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {rec.term?.name || 'Active Academic Term'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {getStatusBadge(rec.status)}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                            Class Form Register & Gate Check
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
