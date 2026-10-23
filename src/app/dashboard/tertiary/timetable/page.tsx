'use client';

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { checkTimetableClashesAction, getStudentWeeklyTimetable, TimetableClash } from '@/actions/timetable-clash-actions';
import { Calendar, Clock, MapPin, AlertTriangle, ShieldCheck, CheckCircle2, Loader2, Sparkles } from 'lucide-react';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

export default function TertiaryTimetablePage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState('2025/2026');
  const [semester, setSemester] = useState(1);
  const [clashes, setClashes] = useState<TimetableClash[]>([]);
  const [isCheckingClashes, setIsCheckingClashes] = useState(false);
  const { toast } = useToast();

  const loadTimetable = async () => {
    setIsLoading(true);
    // Student U2025/CSC/001 demo id
    const res = await getStudentWeeklyTimetable('93e0878e-891f-4a60-ad1a-b0019b6c17f2', session, semester);
    if (res.success && res.data) {
      setSchedules(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadTimetable();
  }, [session, semester]);

  const handleRunClashAudit = async () => {
    setIsCheckingClashes(true);
    // Grab all registered offerings for the current session
    const offeringIds = [
      'cbt-offering-1',
      'cbt-offering-2',
    ];

    const res = await checkTimetableClashesAction(offeringIds);
    if (res.success) {
      setClashes(res.clashes);
      if (res.hasClashes) {
        toast({
          variant: 'destructive',
          title: 'Timetable Clashes Detected',
          description: `Found ${res.clashes.length} overlapping lecture or examination periods.`,
        });
      } else {
        toast({
          title: 'Zero Clashes Detected',
          description: 'All selected lecture periods are conflict-free.',
        });
      }
    }
    setIsCheckingClashes(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Interactive Lecture Timetable & Clash Detector</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Weekly lecture schedules, lecture hall venues, and automated real-time timetable conflict analysis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunClashAudit}
            disabled={isCheckingClashes}
            className="flex items-center gap-1.5 border-dashed border-primary/50 text-xs"
          >
            {isCheckingClashes ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5 text-primary" />}
            Run Conflict Audit
          </Button>
        </div>
      </div>

      {/* Clashes Alert Banner */}
      {clashes.length > 0 && (
        <Card className="border-red-300 bg-red-50/60 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-red-900">
                Warning: {clashes.length} Timetable Clash(es) Detected!
              </h4>
              <p className="text-xs text-red-700">
                The following enrolled courses share overlapping time slots. Please adjust course selections with your academic advisor:
              </p>
              <ul className="list-disc list-inside text-xs text-red-800 space-y-0.5 pt-1">
                {clashes.map((c, i) => (
                  <li key={i}>
                    <strong>{c.courseA.code}</strong> and <strong>{c.courseB.code}</strong> both scheduled on {c.dayOfWeek} ({c.timeA} vs {c.timeB}) at {c.venue || 'Lecture Hall'}.
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Weekly Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {DAYS.map((day) => {
          const daySchedules = schedules.filter(
            (s) => s.dayOfWeek.toUpperCase() === day
          );

          return (
            <Card key={day} className="border shadow-sm flex flex-col">
              <CardHeader className="p-3.5 bg-muted/30 border-b">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>{day}</span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {daySchedules.length} Classes
                  </Badge>
                </CardTitle>
              </CardHeader>

              <CardContent className="p-3 flex-1 space-y-3">
                {isLoading ? (
                  <div className="py-8 flex justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : daySchedules.length === 0 ? (
                  <div className="py-10 text-center text-xs text-muted-foreground/60 italic">
                    No classes scheduled
                  </div>
                ) : (
                  daySchedules.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border bg-card hover:border-primary/50 transition-all shadow-xs space-y-2"
                    >
                      <div className="flex justify-between items-start gap-1">
                        <span className="font-bold text-xs text-foreground font-mono">
                          {item.courseCode}
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-[9px] px-1.5 py-0 uppercase"
                        >
                          {item.scheduleType}
                        </Badge>
                      </div>

                      <div className="text-xs font-medium text-foreground/90 line-clamp-2">
                        {item.courseTitle}
                      </div>

                      <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                        <Clock className="h-3 w-3 text-primary" />
                        <span>{item.startTime} - {item.endTime}</span>
                      </div>

                      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-500" />
                        <span>{item.venueName}</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
