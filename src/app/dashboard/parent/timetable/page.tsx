'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getWardTimetable } from "@/actions/parent-actions";
import { 
  Calendar, 
  Clock, 
  Users, 
  ArrowLeft, 
  Printer, 
  BookOpen, 
  User, 
  Building, 
  GraduationCap
} from "lucide-react";
import Link from "next/link";

export default function ParentTimetablePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  const fetchData = useCallback(async (studentId?: string) => {
    setIsLoading(true);
    try {
      const res: any = await getWardTimetable(studentId);
      if (res.success) {
        setData(res);
        if (!studentId && res.selectedWard?.id) {
          setSelectedStudentId(res.selectedWard.id);
        }
      }
    } catch (err) {
      console.error("Error loading timetable:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(selectedStudentId || undefined);
  }, [fetchData, selectedStudentId]);

  const wards = data?.wards || [];
  const selectedWard = data?.selectedWard;
  const schedule = data?.schedule || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Header */}
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
            <Calendar className="h-7 w-7 text-primary" />
            Class Weekly Academic Timetable
          </h1>
          <p className="text-sm text-muted-foreground">
            Weekly lesson timetable, subject periods, teacher assignments, and classroom schedule.
          </p>
        </div>

        {/* Multi-Child Selector & Print */}
        <div className="flex flex-wrap items-center gap-2">
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

          <Button onClick={() => window.print()} variant="outline" size="sm" className="h-9 gap-1.5 shadow-sm">
            <Printer className="h-4 w-4" />
            Print Timetable
          </Button>
        </div>
      </div>

      {/* Student & Class Banner */}
      <Card className="rounded-2xl border-border bg-card p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-lg">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">
                  {selectedWard?.firstName} {selectedWard?.lastName}
                </h2>
                <Badge variant="secondary" className="font-semibold text-xs">
                  {selectedWard?.class?.name || 'Class'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Official weekly academic lesson schedule • Regular school hours (08:00 AM – 02:00 PM)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-lg border border-border/50">
            <Clock className="h-4 w-4 text-primary" />
            <span>5 Lesson Periods Daily • 45 Minutes per Period</span>
          </div>
        </div>
      </Card>

      {/* Timetable Days */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="p-4 space-y-3">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </Card>
          ))}
        </div>
      ) : schedule.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <h3 className="text-lg font-semibold">No Schedule Published</h3>
          <p className="text-sm mt-1">Timetable schedule has not been assigned for this class yet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {schedule.map((day: any) => (
            <div key={day.dayNumber} className="flex flex-col gap-3">
              {/* Day Header */}
              <div className="bg-primary/10 border border-primary/20 text-primary rounded-xl p-3 text-center shadow-sm">
                <span className="font-bold text-sm block">{day.dayName}</span>
                <span className="text-[10px] text-muted-foreground font-mono">{day.periods.length} Periods</span>
              </div>

              {/* Day Periods */}
              <div className="space-y-3">
                {day.periods.length === 0 ? (
                  <div className="p-4 border border-dashed rounded-xl text-center text-xs text-muted-foreground">
                    No periods
                  </div>
                ) : (
                  day.periods.map((p: any, idx: number) => (
                    <Card key={p.id || idx} className="rounded-xl border-border bg-card p-3 shadow-sm hover:border-primary/40 transition-colors">
                      <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground mb-1.5 pb-1 border-b border-border/40">
                        <span className="flex items-center gap-1 font-semibold text-primary">
                          <Clock className="h-3 w-3" />
                          {p.startTime} - {p.endTime}
                        </span>
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">P{idx + 1}</span>
                      </div>

                      <div className="font-bold text-sm text-foreground flex items-center gap-1.5 mt-1">
                        <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="truncate">{p.subject?.name || 'General Subject'}</span>
                      </div>

                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {p.teacher && (
                          <div className="flex items-center gap-1 text-[11px] truncate">
                            <User className="h-3 w-3 shrink-0" />
                            <span>{p.teacher.firstName} {p.teacher.lastName}</span>
                          </div>
                        )}
                        {p.room && (
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                            <Building className="h-3 w-3 shrink-0" />
                            <span>{p.room.name || 'Room'}</span>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
