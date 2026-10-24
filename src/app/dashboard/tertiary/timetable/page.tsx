'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  checkTimetableClashesAction,
  getStudentWeeklyTimetable,
  getTimetableBuilderOptionsAction,
  createCourseScheduleAction,
  TimetableClash,
} from '@/actions/timetable-clash-actions';
import { getCurrentStudentContextAction } from '@/actions/tims-actions';
import { Calendar, Clock, MapPin, AlertTriangle, ShieldCheck, Loader2, Plus } from 'lucide-react';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

export default function TertiaryTimetablePage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [registeredOfferingIds, setRegisteredOfferingIds] = useState<string[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [studentProfileId, setStudentProfileId] = useState<string>('');
  const [isStudentRole, setIsStudentRole] = useState<boolean>(true);
  const [offerings, setOfferings] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [session] = useState('2025/2026');
  const [semester] = useState(1);
  const [clashes, setClashes] = useState<TimetableClash[]>([]);
  const [isCheckingClashes, setIsCheckingClashes] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const [scheduleForm, setScheduleForm] = useState({
    courseOfferingId: '',
    venueId: 'NONE',
    dayOfWeek: 'MONDAY',
    startTime: '08:00',
    endTime: '10:00',
    scheduleType: 'LECTURE',
  });

  const loadTimetable = useCallback(async (overrideStudentId?: string) => {
    setIsLoading(true);
    const [ctxRes, builderRes] = await Promise.all([
      getCurrentStudentContextAction(session, semester),
      getTimetableBuilderOptionsAction(session, semester),
    ]);

    if (builderRes.success && builderRes.data) {
      setOfferings(builderRes.data.offerings || []);
      setVenues(builderRes.data.venues || []);
    }

    let activeId = overrideStudentId || '';
    if (ctxRes.success && ctxRes.data) {
      setIsStudentRole(ctxRes.data.isStudentRole);
      setAllStudents(ctxRes.data.allStudents || []);
      if (!activeId && ctxRes.data.activeStudent) {
        activeId = ctxRes.data.activeStudent.id;
      }
      setStudentProfileId(activeId);
    }

    const res = await getStudentWeeklyTimetable(activeId, session, semester);
    if (res.success && res.data) {
      setSchedules(res.data);
      setRegisteredOfferingIds((res as any).registeredOfferingIds || []);
    }
    setIsLoading(false);
  }, [session, semester]);

  useEffect(() => {
    loadTimetable();
  }, [loadTimetable]);

  const handleRunClashAudit = async () => {
    setIsCheckingClashes(true);
    const res = await checkTimetableClashesAction(registeredOfferingIds);
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
          description: 'All scheduled lecture periods are conflict-free.',
        });
      }
    }
    setIsCheckingClashes(false);
  };

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleForm.courseOfferingId) return;

    startTransition(async () => {
      const res = await createCourseScheduleAction(scheduleForm);
      if (res.success) {
        toast({
          title: 'Lecture Slot Scheduled',
          description: 'Added lecture period to weekly timetable.',
        });
        setIsScheduleOpen(false);
        loadTimetable(studentProfileId);
      } else {
        toast({
          variant: 'destructive',
          title: 'Schedule Error',
          description: res.error,
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Interactive Lecture Timetable &amp; Clash Detector</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Weekly lecture schedules, lecture hall venues, and automated real-time timetable conflict analysis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isStudentRole && allStudents.length > 0 && (
            <Select
              value={studentProfileId}
              onValueChange={(id) => {
                setStudentProfileId(id);
                loadTimetable(id);
              }}
            >
              <SelectTrigger className="w-56 h-9 text-xs rounded-xl">
                <SelectValue placeholder="Filter by Student" />
              </SelectTrigger>
              <SelectContent>
                {allStudents.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.matricNumber} &mdash; {s.user?.firstName} {s.user?.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

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

          {!isStudentRole && (
            <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="text-xs flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Schedule Lecture Slot
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Schedule Course Lecture Slot</DialogTitle>
                  <DialogDescription>
                    Assign a course offering to a day of the week, time window, and lecture theatre.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateSchedule} className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <Label>Course Offering</Label>
                    <Select
                      value={scheduleForm.courseOfferingId}
                      onValueChange={(val) => setScheduleForm({ ...scheduleForm, courseOfferingId: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Course Offering" />
                      </SelectTrigger>
                      <SelectContent>
                        {offerings.map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.course?.code} &mdash; {o.course?.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Day of Week</Label>
                      <Select
                        value={scheduleForm.dayOfWeek}
                        onValueChange={(val) => setScheduleForm({ ...scheduleForm, dayOfWeek: val })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS.map((d) => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Schedule Type</Label>
                      <Select
                        value={scheduleForm.scheduleType}
                        onValueChange={(val) => setScheduleForm({ ...scheduleForm, scheduleType: val })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LECTURE">LECTURE</SelectItem>
                          <SelectItem value="LAB">PRACTICAL / LAB</SelectItem>
                          <SelectItem value="TUTORIAL">TUTORIAL</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={scheduleForm.startTime}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={scheduleForm.endTime}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Lecture Venue / Hall</Label>
                    <Select
                      value={scheduleForm.venueId}
                      onValueChange={(val) => setScheduleForm({ ...scheduleForm, venueId: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Venue" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">TBA / Virtual Hall</SelectItem>
                        {venues.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name} ({v.capacity} seats)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsScheduleOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isPending || !scheduleForm.courseOfferingId}>
                      {isPending ? 'Saving...' : 'Save Slot'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Clashes Alert Banner */}
      {clashes.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-destructive dark:text-red-400">
                Warning: {clashes.length} Timetable Clash(es) Detected!
              </h4>
              <p className="text-xs text-destructive/80 dark:text-red-400/90">
                The following enrolled courses share overlapping time slots. Please adjust course selections with your academic advisor:
              </p>
              <ul className="list-disc list-inside text-xs text-destructive/90 dark:text-red-300 space-y-0.5 pt-1">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {DAYS.map((day) => {
          const daySchedules = schedules.filter(
            (s) => s.dayOfWeek.toUpperCase() === day
          );

          return (
            <Card key={day} className="border shadow-sm flex flex-col">
              <CardHeader className="bg-muted/40 border-b py-3 px-4">
                <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                  <span>{day}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {daySchedules.length}
                  </Badge>
                </CardTitle>
              </CardHeader>

              <CardContent className="p-3 space-y-3 flex-1">
                {isLoading ? (
                  <div className="py-8 flex justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : daySchedules.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground/60 italic">
                    Free Day / Personal Study
                  </div>
                ) : (
                  daySchedules.map((slot) => (
                    <div
                      key={slot.id}
                      className="p-3 rounded-xl border bg-card hover:border-primary/50 transition-all space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/20 font-mono text-[10px]">
                          {slot.courseCode}
                        </Badge>
                        <span className="text-[10px] font-medium text-muted-foreground uppercase">
                          {slot.scheduleType}
                        </span>
                      </div>

                      <p className="font-semibold text-xs text-foreground line-clamp-2">
                        {slot.courseTitle}
                      </p>

                      <div className="pt-1 border-t space-y-1 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1.5 font-mono text-foreground/80">
                          <Clock className="h-3 w-3 text-primary" />
                          <span>
                            {slot.startTime} &ndash; {slot.endTime}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 text-emerald-600" />
                          <span className="truncate">{slot.venueName}</span>
                        </div>
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
