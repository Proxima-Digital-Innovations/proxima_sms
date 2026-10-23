'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  getAttendanceClasses, 
  getClassAttendanceRoster, 
  saveAttendance 
} from '@/actions/attendance-actions';
import { 
  CalendarCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldCheck, 
  Save, 
  Users, 
  AlertCircle,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/context/language-context';

export default function StudentAttendancePage() {
  const { toast } = useToast();
  const { language } = useLanguage();

  const [classes, setClasses] = useState<Array<{ id: string; name: string; code?: string | null; studentCount: number }>>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving] = useState(false);

  const [roster, setRoster] = useState<Array<{
    id: string;
    studentId: string;
    firstName: string;
    lastName: string;
    gender: string;
    status: string;
  }>>([]);

  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  // Load initial classes
  useEffect(() => {
    async function loadClasses() {
      setLoadingClasses(true);
      try {
        const res = await getAttendanceClasses();
        if (res.success && res.classes.length > 0) {
          setClasses(res.classes);
          setSelectedClassId(res.classes[0].id);
        }
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      } finally {
        setLoadingClasses(false);
      }
    }
    loadClasses();
  }, [toast]);

  // Load roster when class or date changes
  const loadRoster = useCallback(async () => {
    if (!selectedClassId) return;
    setLoadingRoster(true);
    try {
      const res = await getClassAttendanceRoster(selectedClassId, selectedDate);
      if (res.success) {
        setRoster(res.roster || []);
        setAlreadySubmitted(!!res.stats?.alreadySubmitted);
      } else {
        toast({ title: 'Error', description: res.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoadingRoster(false);
    }
  }, [selectedClassId, selectedDate, toast]);

  useEffect(() => {
    if (selectedClassId) {
      loadRoster();
    }
  }, [selectedClassId, selectedDate, loadRoster]);

  // Status updates
  const setStudentStatus = (studentId: string, status: string) => {
    setRoster(prev => prev.map(s => s.id === studentId ? { ...s, status } : s));
  };

  const markAll = (status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED') => {
    setRoster(prev => prev.map(s => ({ ...s, status })));
    toast({
      title: 'Bulk Updated',
      description: `All ${roster.length} students marked as ${status}.`
    });
  };

  // Save attendance
  const handleSave = async () => {
    if (!selectedClassId || roster.length === 0) return;
    setSaving(true);
    try {
      const payload = {
        date: selectedDate,
        classId: selectedClassId,
        records: roster.map(s => ({
          studentId: s.id,
          status: s.status,
        }))
      };

      const res = await saveAttendance(payload);
      if (res.success) {
        setAlreadySubmitted(true);
        toast({
          title: 'Attendance Saved',
          description: `Successfully logged attendance for ${roster.length} students.`,
        });
      } else {
        toast({ title: 'Failed to Save', description: res.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Stats calculation
  const total = roster.length;
  const present = roster.filter(r => r.status === 'PRESENT').length;
  const absent = roster.filter(r => r.status === 'ABSENT').length;
  const late = roster.filter(r => r.status === 'LATE').length;
  const excused = roster.filter(r => r.status === 'EXCUSED').length;
  const rate = total > 0 ? Math.round((present / total) * 100) : 100;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              {language === 'ar' ? 'سجل حضور الطلاب الصفي' : 'Classroom Student Attendance'}
            </h1>
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
              Daily Roll-Call
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {language === 'ar'
              ? 'تسجيل ومتابعة حضور وغياب الطلاب اليومي مع الربط المباشر ببطاقة الأداء.'
              : 'Record classroom roll call, monitor daily attendance rates, and sync absence notices.'}
          </p>
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-3">
          <Button 
            onClick={handleSave} 
            disabled={saving || loadingRoster || roster.length === 0}
            className="rounded-xl px-5 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : language === 'ar' ? 'حفظ سجل الحضور' : 'Save Attendance'}
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="rounded-2xl border-border bg-card shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            {/* Class Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                {language === 'ar' ? 'الفصل الدراسي' : 'Academic Class'}
              </label>
              <Select 
                value={selectedClassId} 
                onValueChange={setSelectedClassId} 
                disabled={loadingClasses}
              >
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.studentCount} students)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                {language === 'ar' ? 'تاريخ الحضور' : 'Register Date'}
              </label>
              <Input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>

            {/* Status indicator */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Status</label>
              <div className="h-10 px-3 py-2 rounded-xl border border-border bg-muted/30 flex items-center gap-2">
                {alreadySubmitted ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      Recorded for this Date
                    </span>
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                      Pending Submission
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Quick Bulk Actions */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Quick Action</label>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => markAll('PRESENT')}
                  className="flex-1 text-xs h-10 rounded-xl border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                >
                  All Present
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => markAll('ABSENT')}
                  className="flex-1 text-xs h-10 rounded-xl border-rose-500/30 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                >
                  All Absent
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="rounded-2xl border-border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Enrolled</p>
              <p className="text-2xl font-bold font-mono mt-0.5">{total}</p>
            </div>
            <Users className="h-6 w-6 text-primary shrink-0 opacity-80" />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Present</p>
              <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">{present}</p>
            </div>
            <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-rose-600 dark:text-rose-400">Absent</p>
              <p className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5">{absent}</p>
            </div>
            <XCircle className="h-6 w-6 text-rose-500 shrink-0" />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Late / Excused</p>
              <p className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">{late + excused}</p>
            </div>
            <Clock className="h-6 w-6 text-amber-500 shrink-0" />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card col-span-2 lg:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Daily Rate</p>
              <span className="text-sm font-bold font-mono text-primary">{rate}%</span>
            </div>
            <Progress value={rate} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Student Roster Table */}
      <Card className="rounded-2xl border-border bg-card shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">Class Roster</CardTitle>
              <CardDescription>
                Mark presence for each student using the status toggles below.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              {roster.length} Students
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingRoster ? (
            <div className="p-12 text-center text-muted-foreground">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm">Loading classroom roster...</p>
            </div>
          ) : roster.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">No students enrolled in this class.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Student ID</th>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3">Gender</th>
                    <th className="px-4 py-3 text-center">Status Selection</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {roster.map((student, idx) => {
                    const isPresent = student.status === 'PRESENT';
                    const isAbsent = student.status === 'ABSENT';
                    const isLate = student.status === 'LATE';
                    const isExcused = student.status === 'EXCUSED';

                    return (
                      <tr 
                        key={student.id}
                        className="hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3 font-mono font-medium text-xs">
                          {student.studentId}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {student.lastName}, {student.firstName}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {student.gender}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                            {/* PRESENT */}
                            <button
                              type="button"
                              onClick={() => setStudentStatus(student.id, 'PRESENT')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                isPresent
                                  ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30'
                                  : 'bg-muted/50 text-muted-foreground hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-950/40'
                              }`}
                            >
                              Present
                            </button>

                            {/* ABSENT */}
                            <button
                              type="button"
                              onClick={() => setStudentStatus(student.id, 'ABSENT')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                isAbsent
                                  ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-600/30'
                                  : 'bg-muted/50 text-muted-foreground hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-950/40'
                              }`}
                            >
                              Absent
                            </button>

                            {/* LATE */}
                            <button
                              type="button"
                              onClick={() => setStudentStatus(student.id, 'LATE')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                isLate
                                  ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-600/30'
                                  : 'bg-muted/50 text-muted-foreground hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-950/40'
                              }`}
                            >
                              Late
                            </button>

                            {/* EXCUSED */}
                            <button
                              type="button"
                              onClick={() => setStudentStatus(student.id, 'EXCUSED')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                isExcused
                                  ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30'
                                  : 'bg-muted/50 text-muted-foreground hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-950/40'
                              }`}
                            >
                              Excused
                            </button>
                          </div>
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
