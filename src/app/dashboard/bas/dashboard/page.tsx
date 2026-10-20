'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  getBasDashboardStats, 
  getAttendanceLogs, 
  getLeaderboard,
  getDepartments 
} from '@/actions/bas-actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Fingerprint, 
  Users, 
  Activity, 
  Clock, 
  TrendingUp, 
  Award, 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle,
  CheckCircle2,
  UserCheck,
  UserX,
  RotateCw,
  Search,
  Server,
  KeyRound,
  LogOut,
  Radio,
  ArrowUpRight,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { format, subDays, addDays, isToday, isYesterday } from 'date-fns';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type TabType = 'all' | 'late' | 'absent' | 'enrolled';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 280, damping: 24 }
  }
};

const AVATAR_PALETTE = [
  'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
];

function getAvatarStyle(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function getInitials(name?: string) {
  if (!name) return 'ST';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function BasDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const [viewDate, setViewDate] = useState(todayStr);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const { toast } = useToast();

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, lbRes, deptRes] = await Promise.all([
        getBasDashboardStats(viewDate),
        getLeaderboard(new Date().getMonth() + 1, new Date().getFullYear()),
        getDepartments()
      ]);
      
      if (statsRes.success) setStats(statsRes.data);
      if (lbRes.success) setLeaderboard(lbRes.data || []);
      if (deptRes.success) setDepartments(deptRes.data || []);
    } catch (err) {
      console.error('Failed to fetch BAS dashboard initial data', err);
    } finally {
      setLoading(false);
    }
  }, [viewDate]);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const deptFilter = selectedDept === 'ALL' ? undefined : selectedDept;
      const res = await getAttendanceLogs(viewDate, activeTab, deptFilter);
      if (res.success && res.data) {
        setLogs(res.data);
      } else {
        setLogs([]);
      }
    } catch (err) {
      console.error('Failed to fetch attendance logs', err);
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, [viewDate, activeTab, selectedDept]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchInitialData(), fetchLogs()]);
    setIsRefreshing(false);
    toast({
      title: 'BAS Data Synced',
      description: 'Attendance records and terminal telemetry updated.',
    });
  };

  const isCurrentDayToday = viewDate === todayStr;

  const formattedDateTitle = useMemo(() => {
    try {
      const d = new Date(viewDate + 'T00:00:00');
      if (isToday(d)) return `Today, ${format(d, 'MMM d, yyyy')}`;
      if (isYesterday(d)) return `Yesterday, ${format(d, 'MMM d, yyyy')}`;
      return format(d, 'EEEE, MMM d, yyyy');
    } catch {
      return viewDate;
    }
  }, [viewDate]);

  // Tab definitions with live counts
  const tabs: { key: TabType; label: string; count?: number }[] = [
    { key: 'all', label: 'All Logs', count: stats?.presentCount },
    { key: 'late', label: 'Late Arrivals', count: stats?.lateCount },
    { key: 'absent', label: 'Absent', count: stats?.absentCount },
    { key: 'enrolled', label: 'Enrolled Staff', count: stats?.enrolledCount },
  ];

  // Client-side text search over logs
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter((item: any) => {
      const name = (item.staffName || `${item.firstName || ''} ${item.lastName || ''}`).toLowerCase();
      const staffId = (item.staffId || '').toLowerCase();
      const dept = (item.department?.name || item.department || '').toLowerCase();
      const kiosk = (item.kioskName || '').toLowerCase();
      return name.includes(q) || staffId.includes(q) || dept.includes(q) || kiosk.includes(q);
    });
  }, [logs, searchQuery]);

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      {/* Top Header Card */}
      <motion.div 
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-background p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-border backdrop-blur-sm shadow-sm w-full min-w-0"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-sm">
            <Fingerprint className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight truncate">
                Biometric Attendance
              </h1>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Telemetry
              </div>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">
              Kiosk terminal verification, clock-in records, and punctuality index.
            </p>
          </div>
        </div>

        {/* Date Controls & Refresh */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-start lg:justify-end">
          {/* Quick Preset Buttons */}
          <div className="inline-flex items-center bg-muted/60 p-1 rounded-xl border border-border text-xs font-medium">
            <button
              onClick={() => setViewDate(todayStr)}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all",
                viewDate === todayStr 
                  ? "bg-background text-foreground shadow-sm font-semibold" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Today
            </button>
            <button
              onClick={() => setViewDate(format(subDays(new Date(), 1), 'yyyy-MM-dd'))}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all",
                viewDate === format(subDays(new Date(), 1), 'yyyy-MM-dd')
                  ? "bg-background text-foreground shadow-sm font-semibold" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Yesterday
            </button>
          </div>

          {/* Stepper & Date Picker */}
          <div className="flex items-center bg-background border border-border rounded-xl px-1.5 py-1 shadow-sm">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={() => setViewDate(format(subDays(new Date(viewDate + 'T00:00:00'), 1), 'yyyy-MM-dd'))}
              title="Previous Day"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="relative flex items-center gap-2 px-2.5">
              <CalendarDays className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">
                {formattedDateTitle}
              </span>
              <Input
                type="date"
                value={viewDate}
                onChange={(e) => e.target.value && setViewDate(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </div>

            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30"
              onClick={() => setViewDate(format(addDays(new Date(viewDate + 'T00:00:00'), 1), 'yyyy-MM-dd'))}
              disabled={isCurrentDayToday}
              title="Next Day"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="rounded-xl h-10 px-3 border-border hover:bg-muted"
            title="Refresh Attendance Data"
          >
            <RotateCw className={cn("h-4 w-4 mr-1.5 text-muted-foreground", isRefreshing && "animate-spin text-primary")} />
            <span className="text-xs font-semibold">Sync</span>
          </Button>
        </div>
      </motion.div>

      {/* Module Navigation Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar w-full min-w-0 text-xs">
        <Link 
          href="/dashboard/bas/kiosks" 
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-background border border-border text-foreground hover:border-primary/50 hover:bg-muted/50 transition-all shrink-0 font-medium shadow-2xs"
        >
          <Server className="w-3.5 h-3.5 text-sky-500" />
          <span>Kiosk Terminals</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-md font-mono font-bold">
            {stats?.activeKiosks || 0}
          </span>
        </Link>
        <Link 
          href="/dashboard/bas/shifts" 
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-background border border-border text-foreground hover:border-primary/50 hover:bg-muted/50 transition-all shrink-0 font-medium shadow-2xs"
        >
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span>Shift Schedules</span>
        </Link>
        <Link 
          href="/dashboard/bas/attendance" 
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-background border border-border text-foreground hover:border-primary/50 hover:bg-muted/50 transition-all shrink-0 font-medium shadow-2xs"
        >
          <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>My Attendance Log</span>
        </Link>
        <Link 
          href="/dashboard/bas/reports" 
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-background border border-border text-foreground hover:border-primary/50 hover:bg-muted/50 transition-all shrink-0 font-medium shadow-2xs"
        >
          <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
          <span>Audit & Payroll Reports</span>
        </Link>
        <Link 
          href="/dashboard/bas/staff" 
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-background border border-border text-foreground hover:border-primary/50 hover:bg-muted/50 transition-all shrink-0 font-medium shadow-2xs"
        >
          <Users className="w-3.5 h-3.5 text-indigo-500" />
          <span>Staff Biometric Setup</span>
        </Link>
        <Link 
          href="/dashboard/bas/holidays" 
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-background border border-border text-foreground hover:border-primary/50 hover:bg-muted/50 transition-all shrink-0 font-medium shadow-2xs"
        >
          <Calendar className="w-3.5 h-3.5 text-rose-500" />
          <span>Holiday Calendar</span>
        </Link>
      </div>

      {/* Holiday / Weekend Banner */}
      {stats?.isHoliday && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3 text-amber-800 dark:text-amber-300 shadow-2xs"
        >
          <div className="p-2 bg-amber-500/15 rounded-xl shrink-0">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-bold">Public Holiday Observed</p>
            <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
              The selected date falls on a registered school holiday. Unexcused absence penalties are waived.
            </p>
          </div>
        </motion.div>
      )}

      {stats?.isWeekend && !stats?.isHoliday && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 flex items-center gap-3 text-blue-800 dark:text-blue-300 shadow-2xs"
        >
          <div className="p-2 bg-blue-500/15 rounded-xl shrink-0">
            <CalendarDays className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-bold">Weekend Schedule</p>
            <p className="text-xs text-blue-700/80 dark:text-blue-400/80">
              Standard institutional classes are off. Terminal clock-ins are recorded as optional or extra-curricular duty.
            </p>
          </div>
        </motion.div>
      )}

      {/* 6 High-Impact Metric Cards */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 w-full min-w-0"
      >
        {/* Presence Rate */}
        <motion.div variants={itemVariants}>
          <Card className="bg-background border-border shadow-none rounded-2xl p-4 relative overflow-hidden group hover:border-primary/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Presence</span>
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono">
                {loading ? '—' : `${stats?.presenceRate || 0}%`}
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
                <div 
                  className="bg-primary h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, stats?.presenceRate || 0)}%` }} 
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5 font-medium truncate">
                {stats?.presentCount || 0} of {stats?.totalActiveStaff || 0} staff
              </p>
            </div>
          </Card>
        </motion.div>

        {/* Present (Clocked In) */}
        <motion.div variants={itemVariants}>
          <Card className="bg-background border-border shadow-none rounded-2xl p-4 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Present</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                {loading ? '—' : (stats?.presentCount ?? 0)}
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-[11px] text-muted-foreground font-medium truncate">Clocked in today</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Late Arrivals */}
        <motion.div variants={itemVariants}>
          <Card className="bg-background border-border shadow-none rounded-2xl p-4 relative overflow-hidden group hover:border-amber-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Late</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                {loading ? '—' : (stats?.lateCount ?? 0)}
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span className="text-[11px] text-muted-foreground font-medium truncate">Past grace period</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Absent */}
        <motion.div variants={itemVariants}>
          <Card className="bg-background border-border shadow-none rounded-2xl p-4 relative overflow-hidden group hover:border-rose-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Absent</span>
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <UserX className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                {loading ? '—' : (stats?.absentCount ?? 0)}
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                <span className="text-[11px] text-muted-foreground font-medium truncate">Not clocked in</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Biometric Enrolled */}
        <motion.div variants={itemVariants}>
          <Card className="bg-background border-border shadow-none rounded-2xl p-4 relative overflow-hidden group hover:border-violet-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Enrolled</span>
              <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                <Fingerprint className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-violet-600 dark:text-violet-400 font-mono">
                {loading ? '—' : (stats?.enrolledCount ?? 0)}
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <ShieldCheck className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                <span className="text-[11px] text-muted-foreground font-medium truncate">FP or PIN active</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Active Kiosks */}
        <motion.div variants={itemVariants}>
          <Card className="bg-background border-border shadow-none rounded-2xl p-4 relative overflow-hidden group hover:border-sky-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Terminals</span>
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <Radio className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-sky-600 dark:text-sky-400 font-mono">
                {loading ? '—' : (stats?.activeKiosks ?? 0)}
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="text-[11px] text-muted-foreground font-medium truncate">Online terminals</span>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* Main Content Workspace: Activity Stream (2 cols) & Leaderboard (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full min-w-0">
        {/* Left Side: Live Activity Stream (2 cols) */}
        <div className="lg:col-span-2 space-y-4 min-w-0">
          <Card className="bg-background border-border shadow-none rounded-3xl overflow-hidden backdrop-blur-sm">
            {/* Header with Title & Filter Controls */}
            <CardHeader className="border-b border-border bg-background p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                    <span>Terminal Stream</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-muted font-normal text-muted-foreground">
                      {filteredLogs.length} records
                    </span>
                  </CardTitle>
                  <CardDescription className="text-muted-foreground text-xs sm:text-sm mt-0.5">
                    Biometric attendance log for {formattedDateTitle}.
                  </CardDescription>
                </div>

                {/* Segmented Tab Controls */}
                <div className="inline-flex items-center bg-muted/60 p-1 rounded-2xl border border-border overflow-x-auto max-w-full">
                  {tabs.map((tab) => {
                    const isActive = activeTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5",
                          isActive 
                            ? "bg-background text-foreground shadow-xs" 
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <span>{tab.label}</span>
                        {tab.count != null && (
                          <span className={cn(
                            "px-1.5 py-0.2 rounded-md text-[10px] font-mono",
                            isActive 
                              ? "bg-primary/10 text-primary font-bold" 
                              : "bg-muted text-muted-foreground"
                          )}>
                            {tab.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Second Row: Search and Department Filters */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by staff name, ID, or kiosk..."
                    className="pl-9 bg-background border-border text-foreground rounded-xl h-9 text-xs sm:text-sm focus-visible:ring-primary w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Department Filter */}
                <div className="w-full sm:w-56 shrink-0">
                  <Select value={selectedDept} onValueChange={setSelectedDept}>
                    <SelectTrigger className="h-9 rounded-xl bg-background border-border text-foreground text-xs sm:text-sm">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border text-foreground">
                      <SelectItem value="ALL">All Departments</SelectItem>
                      {departments.map((d: any) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            {/* Table Area */}
            <CardContent className="p-0">
              {logsLoading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                  <RotateCw className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading attendance telemetry...</p>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-muted/60 border border-border flex items-center justify-center mb-3">
                    <Fingerprint className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <p className="text-base font-bold text-foreground">No records found</p>
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mt-1">
                    No clock-in entries match your search criteria for this view date.
                  </p>
                </div>
              ) : activeTab === 'absent' ? (
                <div className="overflow-x-auto w-full min-w-0">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="font-bold text-muted-foreground py-3.5 px-6">Staff Member</TableHead>
                        <TableHead className="font-bold text-muted-foreground py-3.5">Staff ID</TableHead>
                        <TableHead className="font-bold text-muted-foreground py-3.5">Department</TableHead>
                        <TableHead className="text-right font-bold text-muted-foreground py-3.5 px-6">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((item: any) => (
                        <TableRow key={item.id} className="border-border hover:bg-muted/40 transition-colors">
                          <TableCell className="px-6 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border",
                                getAvatarStyle(item.staffName)
                              )}>
                                {getInitials(item.staffName)}
                              </div>
                              <span className="font-semibold text-foreground">{item.staffName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3.5 font-mono text-xs text-muted-foreground">
                            {item.staffId || 'N/A'}
                          </TableCell>
                          <TableCell className="py-3.5 text-xs text-muted-foreground">
                            {item.department || 'General'}
                          </TableCell>
                          <TableCell className="text-right px-6 py-3.5">
                            <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-semibold text-xs">
                              <UserX className="w-3 h-3 mr-1" /> Absent
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : activeTab === 'enrolled' ? (
                <div className="overflow-x-auto w-full min-w-0">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="font-bold text-muted-foreground py-3.5 px-6">Staff Member</TableHead>
                        <TableHead className="font-bold text-muted-foreground py-3.5">Staff ID</TableHead>
                        <TableHead className="font-bold text-muted-foreground py-3.5">Department</TableHead>
                        <TableHead className="text-right font-bold text-muted-foreground py-3.5 px-6">Authentication</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((item: any) => {
                        const fullName = `${item.firstName || ''} ${item.lastName || ''}`.trim() || item.email;
                        return (
                          <TableRow key={item.id} className="border-border hover:bg-muted/40 transition-colors">
                            <TableCell className="px-6 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border",
                                  getAvatarStyle(fullName)
                                  )}>
                                  {getInitials(fullName)}
                                </div>
                                <div>
                                  <div className="font-semibold text-foreground">{fullName}</div>
                                  <div className="text-[11px] text-muted-foreground">{item.email}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-3.5 font-mono text-xs text-muted-foreground">
                              {item.staffId || 'N/A'}
                            </TableCell>
                            <TableCell className="py-3.5 text-xs text-muted-foreground">
                              {item.department?.name || 'General'}
                            </TableCell>
                            <TableCell className="text-right px-6 py-3.5">
                              <div className="flex items-center justify-end gap-1.5">
                                {(item.biometricTemplate || item.isBiometricEnrolled) && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-100 text-sky-900 border border-sky-300 dark:bg-sky-950/50 dark:text-sky-200 dark:border-sky-800 shadow-2xs">
                                    <Fingerprint className="w-3.5 h-3.5 text-sky-700 dark:text-sky-400 shrink-0" />
                                    <span>Fingerprint</span>
                                  </span>
                                )}
                                {item.kioskPin && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-100 text-purple-900 border border-purple-300 dark:bg-purple-950/50 dark:text-purple-200 dark:border-purple-800 shadow-2xs">
                                    <KeyRound className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400 shrink-0" />
                                    <span>PIN Code</span>
                                  </span>
                                )}
                                {!item.biometricTemplate && !item.isBiometricEnrolled && !item.kioskPin && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-muted text-muted-foreground border border-border italic">
                                    Not Enrolled
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="overflow-x-auto w-full min-w-0">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="font-bold text-muted-foreground py-3.5 px-6">Staff Member</TableHead>
                        <TableHead className="font-bold text-muted-foreground py-3.5">Department</TableHead>
                        <TableHead className="font-bold text-muted-foreground py-3.5">Clock In</TableHead>
                        <TableHead className="font-bold text-muted-foreground py-3.5">Clock Out</TableHead>
                        <TableHead className="font-bold text-muted-foreground py-3.5">Duration</TableHead>
                        <TableHead className="font-bold text-muted-foreground py-3.5">Status</TableHead>
                        <TableHead className="text-right font-bold text-muted-foreground py-3.5 px-6">Terminal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((r: any) => (
                        <TableRow key={r.id} className="border-border hover:bg-muted/40 transition-colors">
                          <TableCell className="px-6 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border",
                                getAvatarStyle(r.staffName)
                              )}>
                                {getInitials(r.staffName)}
                              </div>
                              <div>
                                <span className="font-semibold text-foreground block">{r.staffName}</span>
                                {r.staffId && (
                                  <span className="font-mono text-[10px] text-muted-foreground">{r.staffId}</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3.5 text-xs text-muted-foreground">
                            {r.department}
                          </TableCell>
                          <TableCell className="py-3.5 font-mono text-xs text-foreground font-medium">
                            {r.timeIn ? (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3 h-3 text-muted-foreground" />
                                {r.timeIn}
                              </span>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="py-3.5 font-mono text-xs text-foreground font-medium">
                            {r.timeOut ? (
                              <span className="inline-flex items-center gap-1">
                                <LogOut className="w-3 h-3 text-muted-foreground" />
                                {r.timeOut}
                              </span>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="py-3.5 text-xs font-semibold text-foreground">
                            {r.duration || '—'}
                          </TableCell>
                          <TableCell className="py-3.5">
                            {r.type === 1 ? (
                              r.isLate ? (
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-semibold text-xs">
                                  <Clock className="w-3 h-3 mr-1" /> Late
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold text-xs">
                                  <CheckCircle2 className="w-3 h-3 mr-1" /> On Time
                                </Badge>
                              )
                            ) : (
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-semibold text-xs">
                                <LogOut className="w-3 h-3 mr-1" /> Clock Out
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right px-6 py-3.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted text-muted-foreground text-xs font-medium">
                              <Server className="w-3 h-3" />
                              {r.kioskName}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Punctuality Honor Roll & Kiosk Hardware Deck */}
        <div className="space-y-6 min-w-0">
          {/* Punctuality Honor Roll */}
          <Card className="bg-background border-border shadow-none rounded-3xl overflow-hidden backdrop-blur-sm">
            <CardHeader className="border-b border-border bg-background p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">Punctuality Index</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">Top staff punctuality for this month.</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {leaderboard.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <Award className="w-10 h-10 text-muted-foreground/40 mb-2" />
                  <p className="text-sm font-semibold text-muted-foreground">No monthly index data yet.</p>
                  <p className="text-xs text-muted-foreground/70">Scores calculate as clock-ins are recorded.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {leaderboard.slice(0, 8).map((entry, index) => {
                    const isTop1 = index === 0;
                    const isTop2 = index === 1;
                    const isTop3 = index === 2;

                    return (
                      <div key={entry.id} className="p-4 hover:bg-muted/30 transition-colors flex items-center gap-3">
                        {/* Rank Badge */}
                        <div className={cn(
                          "w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 border",
                          isTop1 ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40" :
                          isTop2 ? "bg-slate-300/30 text-slate-700 dark:text-slate-200 border-slate-400/40" :
                          isTop3 ? "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/40" :
                          "bg-muted text-muted-foreground border-border"
                        )}>
                          {index + 1}
                        </div>

                        {/* Staff Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{entry.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{entry.department}</p>
                          
                          {/* Progress Bar */}
                          <div className="w-full bg-muted rounded-full h-1 mt-1.5 overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                entry.punctualityScore >= 90 ? "bg-emerald-500" :
                                entry.punctualityScore >= 75 ? "bg-amber-500" : "bg-rose-500"
                              )}
                              style={{ width: `${Math.min(100, entry.punctualityScore)}%` }}
                            />
                          </div>
                        </div>

                        {/* Score */}
                        <div className="text-right shrink-0">
                          <span className={cn(
                            "text-sm font-mono font-bold",
                            entry.punctualityScore >= 90 ? "text-emerald-600 dark:text-emerald-400" :
                            entry.punctualityScore >= 75 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"
                          )}>
                            {entry.punctualityScore}%
                          </span>
                          <span className="block text-[10px] text-muted-foreground font-medium">
                            {entry.totalWorkingDays} days
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Terminal Telemetry Quick Card */}
          <Card className="bg-background border-border shadow-none rounded-3xl p-5 sm:p-6 backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex items-center justify-center">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Hardware Kiosks</h3>
                  <p className="text-xs text-muted-foreground">Terminal sync & health</p>
                </div>
              </div>
              <Link 
                href="/dashboard/bas/kiosks" 
                className="text-xs text-primary hover:underline font-semibold inline-flex items-center"
              >
                Manage <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
              </Link>
            </div>

            <div className="rounded-2xl bg-muted/40 border border-border p-3.5 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Active Terminals</span>
                <span className="font-semibold text-foreground">{stats?.activeKiosks || 0} Registered</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Encryption Protocol</span>
                <span className="font-semibold text-foreground font-mono">AES-256 GCM</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Offline Buffer</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Sync Enabled</span>
              </div>
            </div>

            <div className="pt-1">
              <Button asChild className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold h-9 shadow-sm">
                <Link href="/dashboard/bas/kiosks">
                  <Server className="w-3.5 h-3.5 mr-1.5" /> Launch Terminal Manager
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
