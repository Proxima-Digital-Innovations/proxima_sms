'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ClipboardCheck,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Users,
  Search,
  Calendar,
  Save,
  ArrowLeft,
  GraduationCap,
  Sparkles,
  RefreshCw,
  Loader2,
  Fingerprint,
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getAttendanceContext,
  getClassAttendanceRoster,
  getTertiaryAttendanceRoster,
  submitClassAttendance,
  submitTertiaryAttendance,
} from '@/actions/attendance-actions';

type AttendanceStatus = 'Present' | 'Late' | 'Absent' | 'Excused' | 'Unmarked';

interface RosterStudent {
  id: string;
  regNumber: string;
  name: string;
  gender: string;
  status: AttendanceStatus;
}

export default function TeacherAttendancePage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const userId = (session?.user as any)?.id;

  const [isLoadingContext, setIsLoadingContext] = useState(true);
  const [classes, setClasses] = useState<{ id: string; name: string; studentCount: number }[]>([]);
  const [tertiaryOfferings, setTertiaryOfferings] = useState<{ id: string; courseCode: string; courseTitle: string; session: string; semester: number; studentCount: number }[]>([]);
  const [isTertiaryFaculty, setIsTertiaryFaculty] = useState(false);

  // Mode: 'secondary' | 'tertiary'
  const [mode, setMode] = useState<'secondary' | 'tertiary'>('secondary');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedOfferingId, setSelectedOfferingId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Roster
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecorded, setIsRecorded] = useState(false);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AttendanceStatus>('ALL');

  // Load initial context (classes, offerings)
  useEffect(() => {
    async function loadContext() {
      setIsLoadingContext(true);
      try {
        const res = await getAttendanceContext(userId);
        if (res.success) {
          setClasses(res.classes);
          setTertiaryOfferings(res.tertiaryOfferings);
          setIsTertiaryFaculty(res.isTertiaryFaculty);

          if (res.isTertiaryFaculty && res.tertiaryOfferings.length > 0) {
            setMode('tertiary');
            setSelectedOfferingId(res.tertiaryOfferings[0].id);
          } else if (res.classes.length > 0) {
            setMode('secondary');
            setSelectedClassId(res.classes[0].id);
          }
        }
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Failed to load attendance desk',
          description: err.message || 'Please refresh the page.',
        });
      } finally {
        setIsLoadingContext(false);
      }
    }
    loadContext();
  }, [userId, toast]);

  // Load roster whenever selection or date changes
  const fetchRoster = useCallback(async () => {
    if (mode === 'secondary' && !selectedClassId) return;
    if (mode === 'tertiary' && !selectedOfferingId) return;

    setIsLoadingRoster(true);
    try {
      if (mode === 'secondary') {
        const res = await getClassAttendanceRoster(selectedClassId, selectedDate);
        if (res.success) {
          setRoster(res.roster.map(r => ({ ...r, status: r.status as AttendanceStatus })));
          setIsRecorded(Boolean((res as any).isRecorded || (res as any).stats?.alreadySubmitted));
        } else {
          toast({ variant: 'destructive', title: 'Error', description: res.error });
        }
      } else {
        const res = await getTertiaryAttendanceRoster(selectedOfferingId, selectedDate);
        if (res.success) {
          setRoster(res.roster.map(r => ({ ...r, status: r.status as AttendanceStatus })));
          setIsRecorded(res.isRecorded);
        } else {
          toast({ variant: 'destructive', title: 'Error', description: res.error });
        }
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error loading students', description: err.message });
    } finally {
      setIsLoadingRoster(false);
    }
  }, [mode, selectedClassId, selectedOfferingId, selectedDate, toast]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  // Attendance stats
  const stats = useMemo(() => {
    const total = roster.length;
    const present = roster.filter(s => s.status === 'Present').length;
    const late = roster.filter(s => s.status === 'Late').length;
    const absent = roster.filter(s => s.status === 'Absent').length;
    const excused = roster.filter(s => s.status === 'Excused').length;
    const unmarked = roster.filter(s => s.status === 'Unmarked' || !s.status).length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return { total, present, late, absent, excused, unmarked, rate };
  }, [roster]);

  // Change individual student status
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setRoster(prev => prev.map(s => s.id === studentId ? { ...s, status } : s));
  };

  // Mark all present
  const handleMarkAllPresent = () => {
    setRoster(prev => prev.map(s => ({ ...s, status: 'Present' })));
    toast({
      title: 'Quick Action',
      description: 'All active students marked as Present.',
    });
  };

  // Clear all statuses
  const handleClearAll = () => {
    setRoster(prev => prev.map(s => ({ ...s, status: 'Unmarked' })));
  };

  // Filtered students
  const filteredRoster = useMemo(() => {
    return roster.filter(s => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.regNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === 'ALL' ? true : s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [roster, searchQuery, statusFilter]);

  // Save / submit attendance
  const handleSubmit = async () => {
    if (roster.length === 0) {
      toast({ variant: 'destructive', title: 'No students', description: 'There are no students to save.' });
      return;
    }

    const unassigned = roster.filter(s => s.status === 'Unmarked');
    if (unassigned.length > 0) {
      const confirmSave = confirm(`There are ${unassigned.length} unmarked student(s). Do you want to record them as Absent and save?`);
      if (!confirmSave) return;
    }

    setIsSubmitting(true);
    try {
      const sanitizedRecords = roster.map(s => ({
        studentId: s.id,
        status: (s.status === 'Unmarked' ? 'Absent' : s.status) as 'Present' | 'Absent' | 'Late' | 'Excused',
      }));

      if (mode === 'secondary') {
        const res = await submitClassAttendance({
          classId: selectedClassId,
          date: selectedDate,
          records: sanitizedRecords,
        });
        if (res.success) {
          toast({
            title: 'Attendance Saved',
            description: `Successfully logged attendance for ${res.count} students.`,
          });
          setIsRecorded(true);
          fetchRoster();
        } else {
          toast({ variant: 'destructive', title: 'Save Failed', description: res.error });
        }
      } else {
        const res = await submitTertiaryAttendance({
          courseOfferingId: selectedOfferingId,
          date: selectedDate,
          records: sanitizedRecords,
        });
        if (res.success) {
          toast({
            title: 'Course Attendance Saved',
            description: `Successfully recorded lecture attendance for ${res.count} enrolled students.`,
          });
          setIsRecorded(true);
          fetchRoster();
        } else {
          toast({ variant: 'destructive', title: 'Save Failed', description: res.error });
        }
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error saving attendance', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-12 -mt-6 -mx-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-8 py-5 bg-background backdrop-blur-md border-b border-border sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" className="h-9 w-9">
            <Link href="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="p-2.5 bg-emerald-600/10 border border-emerald-500/20 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <ClipboardCheck className="text-emerald-500 w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground tracking-tight">Teacher Attendance Desk</h1>
              {isRecorded && (
                <Badge className="bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 text-[10px] font-semibold">
                  Saved for Date
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              Record daily attendance, lecture presence, and student compliance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm" className="hidden sm:flex items-center gap-2">
            <Link href="/dashboard/bas/attendance">
              <Fingerprint className="h-4 w-4 text-primary" /> Staff Biometrics (BAS)
            </Link>
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || isLoadingRoster || roster.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-md shadow-emerald-600/20"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Attendance
          </Button>
        </div>
      </div>

      <div className="px-8 py-8 max-w-7xl mx-auto space-y-6">
        {/* Selection Bar & Controls */}
        <Card className="border-border shadow-sm">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              {/* Mode Selector (if tertiary offerings exist) */}
              {tertiaryOfferings.length > 0 && classes.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                    Academic Scope
                  </label>
                  <Select
                    value={mode}
                    onValueChange={(val: any) => setMode(val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Scope" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="secondary">Secondary School Classes</SelectItem>
                      <SelectItem value="tertiary">Tertiary Degree Lectures</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Class or Course Selector */}
              <div className={tertiaryOfferings.length > 0 && classes.length > 0 ? 'md:col-span-1' : 'md:col-span-2'}>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  {mode === 'secondary' ? 'Select Class / Arm' : 'Select Tertiary Course Offering'}
                </label>
                {mode === 'secondary' ? (
                  <Select
                    value={selectedClassId}
                    onValueChange={setSelectedClassId}
                    disabled={isLoadingContext || classes.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={isLoadingContext ? "Loading classes..." : "Select Class"} />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} ({c.studentCount} students)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select
                    value={selectedOfferingId}
                    onValueChange={setSelectedOfferingId}
                    disabled={isLoadingContext || tertiaryOfferings.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={isLoadingContext ? "Loading offerings..." : "Select Course Offering"} />
                    </SelectTrigger>
                    <SelectContent>
                      {tertiaryOfferings.map(o => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.courseCode} - {o.courseTitle} ({o.studentCount} enrolled)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Date Picker */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  Attendance Date
                </label>
                <div className="relative">
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleMarkAllPresent}
                  disabled={isLoadingRoster || roster.length === 0}
                  className="flex-1 text-xs"
                >
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> Mark All Present
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={fetchRoster}
                  disabled={isLoadingRoster}
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  title="Reload Roster"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoadingRoster ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Summary Widgets */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="border-border bg-card/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Enrolled</p>
                <p className="text-2xl font-bold tracking-tight text-foreground mt-0.5">{stats.total}</p>
              </div>
              <Users className="h-6 w-6 text-muted-foreground/40" />
            </CardContent>
          </Card>

          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-600">Present</p>
                <p className="text-2xl font-bold tracking-tight text-emerald-600 mt-0.5">{stats.present}</p>
              </div>
              <CheckCircle2 className="h-6 w-6 text-emerald-500/40" />
            </CardContent>
          </Card>

          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-amber-600">Late</p>
                <p className="text-2xl font-bold tracking-tight text-amber-600 mt-0.5">{stats.late}</p>
              </div>
              <Clock className="h-6 w-6 text-amber-500/40" />
            </CardContent>
          </Card>

          <Card className="border-rose-500/20 bg-rose-500/5">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-rose-600">Absent</p>
                <p className="text-2xl font-bold tracking-tight text-rose-600 mt-0.5">{stats.absent}</p>
              </div>
              <XCircle className="h-6 w-6 text-rose-500/40" />
            </CardContent>
          </Card>

          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600">Excused</p>
                <p className="text-2xl font-bold tracking-tight text-blue-600 mt-0.5">{stats.excused}</p>
              </div>
              <AlertCircle className="h-6 w-6 text-blue-500/40" />
            </CardContent>
          </Card>

          <Card className="border-violet-500/20 bg-violet-500/5">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-violet-600">Turnout Rate</p>
                <p className="text-2xl font-bold tracking-tight text-violet-600 mt-0.5">{stats.rate}%</p>
              </div>
              <Sparkles className="h-6 w-6 text-violet-500/40" />
            </CardContent>
          </Card>
        </div>

        {/* Roster Table Card */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <span>Student Attendance Roster</span>
                  <Badge variant="outline" className="font-normal text-xs">
                    {filteredRoster.length} of {roster.length}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Click status buttons to mark presence or change status.
                </CardDescription>
              </div>

              {/* Search & Filter */}
              <div className="flex items-center gap-2">
                <div className="relative w-48 sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search student..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9 text-xs"
                  />
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(val: any) => setStatusFilter(val)}
                >
                  <SelectTrigger className="w-32 h-9 text-xs">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Status</SelectItem>
                    <SelectItem value="Present">Present</SelectItem>
                    <SelectItem value="Late">Late</SelectItem>
                    <SelectItem value="Absent">Absent</SelectItem>
                    <SelectItem value="Excused">Excused</SelectItem>
                    <SelectItem value="Unmarked">Unmarked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoadingRoster ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm">Loading attendance sheet...</p>
              </div>
            ) : filteredRoster.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground px-4">
                <Users className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-semibold text-foreground">No students found</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  {roster.length === 0
                    ? 'No students enrolled or registered in this class/course offering.'
                    : 'No students matched the active search or status filter.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-12 text-center text-xs">#</TableHead>
                      <TableHead className="text-xs">Reg / Matric No.</TableHead>
                      <TableHead className="text-xs">Student Full Name</TableHead>
                      <TableHead className="text-xs">Gender</TableHead>
                      <TableHead className="text-xs">Current Status</TableHead>
                      <TableHead className="text-right text-xs pr-6">Quick Mark</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence initial={false}>
                      {filteredRoster.map((student, idx) => {
                        const statusColors: Record<AttendanceStatus, string> = {
                          Present: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
                          Late: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
                          Absent: 'bg-rose-500/15 text-rose-600 border-rose-500/30',
                          Excused: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
                          Unmarked: 'bg-muted text-muted-foreground border-border',
                        };

                        return (
                          <motion.tr
                            key={student.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="hover:bg-muted/40 transition-colors"
                          >
                            <TableCell className="text-center text-xs text-muted-foreground font-mono">
                              {idx + 1}
                            </TableCell>
                            <TableCell className="font-mono text-xs font-semibold text-foreground">
                              {student.regNumber}
                            </TableCell>
                            <TableCell className="font-medium text-xs text-foreground">
                              {student.name}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground capitalize">
                              {student.gender}
                            </TableCell>
                            <TableCell>
                              <Badge className={`text-[11px] font-semibold border ${statusColors[student.status]}`}>
                                {student.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={student.status === 'Present' ? 'default' : 'outline'}
                                  onClick={() => handleStatusChange(student.id, 'Present')}
                                  className={`h-7 px-2.5 text-xs ${student.status === 'Present' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950'}`}
                                >
                                  Present
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={student.status === 'Late' ? 'default' : 'outline'}
                                  onClick={() => handleStatusChange(student.id, 'Late')}
                                  className={`h-7 px-2.5 text-xs ${student.status === 'Late' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950'}`}
                                >
                                  Late
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={student.status === 'Absent' ? 'default' : 'outline'}
                                  onClick={() => handleStatusChange(student.id, 'Absent')}
                                  className={`h-7 px-2.5 text-xs ${student.status === 'Absent' ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950'}`}
                                >
                                  Absent
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={student.status === 'Excused' ? 'default' : 'outline'}
                                  onClick={() => handleStatusChange(student.id, 'Excused')}
                                  className={`h-7 px-2 text-xs ${student.status === 'Excused' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950'}`}
                                >
                                  Excused
                                </Button>
                              </div>
                            </TableCell>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
