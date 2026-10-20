'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  getAttendanceReport, 
  getSummaryReport, 
  getAbsentStaff, 
  getIncompleteLogs, 
  getOvertimeReport, 
  getOffDayReport, 
  getDepartments, 
  getStaffList 
} from '@/actions/bas-actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  FileText, 
  UserMinus, 
  AlertTriangle, 
  Clock, 
  CalendarX, 
  TrendingUp, 
  Search, 
  Loader2, 
  BarChart3,
  Download,
  Printer,
  RefreshCw,
  Calendar,
  Building2,
  Users,
  Activity,
  CheckCircle2,
  Timer,
  Percent,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { format, startOfMonth, subDays, subMonths, endOfMonth } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type ReportTab = 'report' | 'summary' | 'absent' | 'incomplete' | 'overtime' | 'offday';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 280, damping: 24 }
  }
};

// Color hashing for professional staff initials avatar
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

// Client-side CSV export utility
function exportToCsv(filename: string, rows: Record<string, any>[]) {
  if (!rows || !rows.length) return;
  const separator = ',';
  const keys = Object.keys(rows[0]);
  const csvContent =
    keys.join(separator) +
    '\n' +
    rows
      .map(row => {
        return keys
          .map(k => {
            let cell = row[k] === null || row[k] === undefined ? '' : row[k];
            cell = cell instanceof Date ? cell.toLocaleString() : cell.toString();
            cell = cell.replace(/"/g, '""');
            if (cell.search(/("|,|\n)/g) >= 0) {
              cell = `"${cell}"`;
            }
            return cell;
          })
          .join(separator);
      })
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export default function BasReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('report');
  const [departments, setDepartments] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    getDepartments().then(r => r.success && setDepartments(r.data || []));
    getStaffList().then(r => r.success && setStaffList(r.staff || []));
  }, []);

  const tabItems: { key: ReportTab; label: string; icon: React.ReactNode; description: string }[] = [
    { key: 'report', label: 'Attendance Logs', icon: <FileText className="w-4 h-4" />, description: 'Granular terminal verifications' },
    { key: 'summary', label: 'Executive Summary', icon: <TrendingUp className="w-4 h-4" />, description: 'Hours, variance & absence rates' },
    { key: 'absent', label: 'Absenteeism Audit', icon: <UserMinus className="w-4 h-4" />, description: 'Daily unrecorded staff' },
    { key: 'incomplete', label: 'Incomplete Logs', icon: <AlertTriangle className="w-4 h-4" />, description: 'Missing clock-outs' },
    { key: 'overtime', label: 'Overtime Records', icon: <Clock className="w-4 h-4" />, description: 'Extra shifts & beyond hours' },
    { key: 'offday', label: 'Rest Day / Holiday', icon: <CalendarX className="w-4 h-4" />, description: 'Weekend & holiday attendance' },
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      {/* Top Header Card */}
      <motion.div 
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-background p-5 sm:p-6 rounded-2xl border border-border shadow-sm w-full min-w-0"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 shadow-sm">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight truncate">
                Attendance & Audit Reports
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                BAS Intelligence
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">
              Query, audit, and export verified biometric telemetry, shift deviations, and executive summaries.
            </p>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto justify-start lg:justify-end shrink-0">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePrint}
            className="rounded-xl border-border bg-background hover:bg-muted font-medium text-xs h-9"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            Print Report
          </Button>
        </div>
      </motion.div>

      {/* Segmented Tab Navigation - No ugly scrollbars */}
      <div className="w-full overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="inline-flex p-1 bg-muted/60 border border-border rounded-2xl gap-1 min-w-full sm:min-w-0">
          {tabItems.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap",
                  isActive
                    ? "bg-background text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50 border border-transparent"
                )}
              >
                <span className={cn("transition-colors", isActive ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground")}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab View */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {activeTab === 'report' && <AttendanceReportTab departments={departments} staffList={staffList} />}
          {activeTab === 'summary' && <SummaryReportTab departments={departments} staffList={staffList} />}
          {activeTab === 'absent' && <AbsentStaffTab departments={departments} />}
          {activeTab === 'incomplete' && <IncompleteLogsTab />}
          {activeTab === 'overtime' && <OvertimeReportTab />}
          {activeTab === 'offday' && <OffDayReportTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 1: ATTENDANCE LOGS REPORT
// ─────────────────────────────────────────────────────────────────────────────

function AttendanceReportTab({ departments, staffList }: { departments: any[]; staffList: any[] }) {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const monthStartStr = format(startOfMonth(new Date()), 'yyyy-MM-dd');

  const [startDate, setStartDate] = useState(monthStartStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [departmentId, setDepartmentId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAttendanceReport(startDate, endDate, staffId || undefined, departmentId || undefined);
      if (res.success) {
        setData(res.data || []);
        setStats(res.periodStats);
      } else {
        toast({ title: 'Query Failed', description: res.error || 'Could not load report data.', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, staffId, departmentId, toast]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const applyPreset = (type: 'today' | 'yesterday' | 'this_month' | 'last_month') => {
    const now = new Date();
    if (type === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (type === 'yesterday') {
      const y = format(subDays(now, 1), 'yyyy-MM-dd');
      setStartDate(y);
      setEndDate(y);
    } else if (type === 'this_month') {
      setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
      setEndDate(todayStr);
    } else if (type === 'last_month') {
      const lastM = subMonths(now, 1);
      setStartDate(format(startOfMonth(lastM), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(lastM), 'yyyy-MM-dd'));
    }
  };

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const q = searchTerm.toLowerCase();
    return data.filter(r => 
      r.staffName?.toLowerCase().includes(q) ||
      r.staffId?.toLowerCase().includes(q) ||
      r.department?.toLowerCase().includes(q) ||
      r.kioskName?.toLowerCase().includes(q)
    );
  }, [data, searchTerm]);

  const handleExport = () => {
    if (!data.length) {
      toast({ title: 'No Data', description: 'There are no records to export.' });
      return;
    }
    const exportRows = data.map(r => ({
      'Staff Name': r.staffName,
      'Staff ID': r.staffId,
      'Department': r.department,
      'Date': r.date,
      'Time In': r.timeIn || 'N/A',
      'Time Out': r.timeOut || 'N/A',
      'Duration': r.duration,
      'Status': r.isLate ? 'Late' : 'On Time',
      'Terminal': r.kioskName
    }));
    exportToCsv(`attendance_report_${startDate}_to_${endDate}`, exportRows);
    toast({ title: 'Export Generated', description: `Exported ${exportRows.length} attendance records.` });
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Filter Card */}
      <motion.div variants={itemVariants}>
        <Card className="bg-card border-border shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <CardTitle className="text-sm font-bold text-foreground tracking-tight">
                  Report Filters & Range
                </CardTitle>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-muted-foreground mr-1">Presets:</span>
                <button 
                  type="button" 
                  onClick={() => applyPreset('today')}
                  className="px-2.5 py-1 text-xs rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors font-medium border border-border/60"
                >
                  Today
                </button>
                <button 
                  type="button" 
                  onClick={() => applyPreset('yesterday')}
                  className="px-2.5 py-1 text-xs rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors font-medium border border-border/60"
                >
                  Yesterday
                </button>
                <button 
                  type="button" 
                  onClick={() => applyPreset('this_month')}
                  className="px-2.5 py-1 text-xs rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors font-medium border border-border/60"
                >
                  This Month
                </button>
                <button 
                  type="button" 
                  onClick={() => applyPreset('last_month')}
                  className="px-2.5 py-1 text-xs rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors font-medium border border-border/60"
                >
                  Last Month
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Start Date
                </label>
                <div className="relative">
                  <Input 
                    type="date" 
                    value={startDate} 
                    onChange={e => setStartDate(e.target.value)} 
                    className="w-full bg-background border-border text-foreground rounded-xl h-10 text-sm focus-visible:ring-blue-500" 
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  End Date
                </label>
                <div className="relative">
                  <Input 
                    type="date" 
                    value={endDate} 
                    onChange={e => setEndDate(e.target.value)} 
                    className="w-full bg-background border-border text-foreground rounded-xl h-10 text-sm focus-visible:ring-blue-500" 
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Department
                </label>
                <select 
                  value={departmentId} 
                  onChange={e => setDepartmentId(e.target.value)} 
                  className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">All Departments</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Staff Member
                </label>
                <select 
                  value={staffId} 
                  onChange={e => setStaffId(e.target.value)} 
                  className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">All Staff</option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={fetch} 
                  disabled={loading} 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 font-semibold shadow-sm text-xs sm:text-sm"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                  Generate Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* High-Impact Telemetry Metrics */}
      {stats && (
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          <ReportMetricCard 
            label="Total Logs" 
            value={stats.totalLogs.toLocaleString()} 
            sublabel="Recorded clock events" 
            icon={<FileText className="w-4 h-4 text-blue-500" />} 
          />
          <ReportMetricCard 
            label="Late Arrivals" 
            value={stats.lateCount.toLocaleString()} 
            sublabel="Arrived past threshold" 
            valueColor="text-amber-600 dark:text-amber-400" 
            icon={<Clock className="w-4 h-4 text-amber-500" />} 
          />
          <ReportMetricCard 
            label="Late Rate" 
            value={`${stats.lateRate}%`} 
            sublabel="Punctuality deviation" 
            valueColor="text-amber-600 dark:text-amber-400" 
            icon={<Percent className="w-4 h-4 text-amber-500" />} 
          />
          <ReportMetricCard 
            label="Unique Staff" 
            value={stats.staffCount.toLocaleString()} 
            sublabel="Active personnel" 
            valueColor="text-violet-600 dark:text-violet-400" 
            icon={<Users className="w-4 h-4 text-violet-500" />} 
          />
          <ReportMetricCard 
            label="Total Hours" 
            value={`${stats.totalHours}h`} 
            sublabel="Cumulative work hours" 
            valueColor="text-emerald-600 dark:text-emerald-400" 
            icon={<Timer className="w-4 h-4 text-emerald-500" />} 
          />
        </motion.div>
      )}

      {/* Table Card */}
      <motion.div variants={itemVariants}>
        <Card className="bg-card border-border shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="p-4 sm:p-5 border-b border-border/80 bg-muted/20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-foreground tracking-tight">
                    Attendance Verification Stream
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Showing {filteredData.length} records for selected query period.
                  </CardDescription>
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    type="text" 
                    placeholder="Search staff, dept, terminal..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="pl-9 bg-background border-border text-foreground text-xs rounded-xl h-9" 
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleExport} 
                  disabled={data.length === 0}
                  className="rounded-xl border-border bg-background hover:bg-muted font-semibold text-xs h-9 shrink-0"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40 border-b border-border">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="pl-6 text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11">Staff Member</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11">Department</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11">Date</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11 font-mono">Time In</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11 font-mono">Time Out</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11">Duration</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11">Terminal</TableHead>
                    <TableHead className="pr-6 text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11 text-right">Punctuality</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map(r => (
                    <TableRow key={r.id} className="border-b border-border hover:bg-muted/40 transition-colors">
                      <TableCell className="pl-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border shrink-0",
                            getAvatarStyle(r.staffName)
                          )}>
                            {getInitials(r.staffName)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground text-sm truncate">{r.staffName}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">{r.staffId || 'NO ID'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground text-sm font-medium">{r.department}</TableCell>
                      <TableCell className="text-foreground text-sm font-mono whitespace-nowrap">{r.date}</TableCell>
                      <TableCell className="font-mono text-sm text-foreground">
                        {r.timeIn ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-xs font-semibold">
                            {r.timeIn}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">Missing</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-foreground">
                        {r.timeOut ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-xs font-semibold">
                            {r.timeOut}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">Not Clocked Out</span>
                        )}
                      </TableCell>
                      <TableCell className="text-foreground text-xs font-medium font-mono">{r.duration}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted border border-border/80 text-[11px] font-medium text-foreground">
                          {r.kioskName}
                        </span>
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                          r.isLate 
                            ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800"
                            : "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800"
                        )}>
                          {r.isLate ? 'Late Arrival' : 'On Time'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {!loading && filteredData.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <div className="w-14 h-14 rounded-2xl bg-muted/60 border border-border flex items-center justify-center mb-3">
                  <FileText className="h-7 w-7 text-muted-foreground/70" />
                </div>
                <p className="text-base font-semibold text-foreground">No Attendance Records Found</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm text-center">
                  Try adjusting the date range, department, or staff filter to query alternative attendance logs.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 2: SUMMARY REPORT
// ─────────────────────────────────────────────────────────────────────────────

function SummaryReportTab({ departments, staffList }: { departments: any[]; staffList: any[] }) {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const monthStartStr = format(startOfMonth(new Date()), 'yyyy-MM-dd');

  const [startDate, setStartDate] = useState(monthStartStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [departmentId, setDepartmentId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSummaryReport(startDate, endDate, departmentId || undefined, staffId || undefined);
      if (res.success) {
        setData(res.data || []);
      } else {
        toast({ title: 'Query Failed', description: res.error || 'Could not load summary.', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, departmentId, staffId, toast]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const q = searchTerm.toLowerCase();
    return data.filter(r => 
      r.staffName?.toLowerCase().includes(q) ||
      r.staffId?.toLowerCase().includes(q) ||
      r.department?.toLowerCase().includes(q) ||
      r.shiftName?.toLowerCase().includes(q)
    );
  }, [data, searchTerm]);

  const handleExport = () => {
    if (!data.length) return;
    const exportRows = data.map(r => ({
      'Staff Name': r.staffName,
      'Staff ID': r.staffId,
      'Department': r.department,
      'Shift': r.shiftName,
      'Expected Days': r.expectedWorkDays,
      'Days Present': r.daysPresent,
      'Days Absent': r.daysAbsent,
      'Late Count': r.lateCount,
      'Worked Hours': r.totalHours,
      'Expected Hours': r.expectedHours,
      'Hours Variance': r.hoursVariance,
      'Absence Rate (%)': r.absenceRate
    }));
    exportToCsv(`attendance_summary_${startDate}_to_${endDate}`, exportRows);
    toast({ title: 'Summary Exported', description: `Exported ${exportRows.length} staff summaries.` });
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <Card className="bg-card border-border shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              <CardTitle className="text-sm font-bold text-foreground tracking-tight">
                Executive Period Summary Configuration
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Start Date</label>
                <Input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)} 
                  className="w-full bg-background border-border text-foreground rounded-xl h-10 text-sm focus-visible:ring-violet-500" 
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">End Date</label>
                <Input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)} 
                  className="w-full bg-background border-border text-foreground rounded-xl h-10 text-sm focus-visible:ring-violet-500" 
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Department</label>
                <select 
                  value={departmentId} 
                  onChange={e => setDepartmentId(e.target.value)} 
                  className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-violet-500 outline-none"
                >
                  <option value="">All Departments</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Staff</label>
                <select 
                  value={staffId} 
                  onChange={e => setStaffId(e.target.value)} 
                  className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-violet-500 outline-none"
                >
                  <option value="">All Staff</option>
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                </select>
              </div>
              <Button 
                onClick={fetch} 
                disabled={loading} 
                className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-10 font-semibold shadow-sm text-xs sm:text-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                Generate Summary
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="bg-card border-border shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="p-4 sm:p-5 border-b border-border/80 bg-muted/20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <CardTitle className="text-base font-bold text-foreground tracking-tight">
                  Staff Hours, Variance & Absence Metrics
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Comparative performance against scheduled working shifts.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    type="text" 
                    placeholder="Filter staff or shift..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="pl-9 bg-background border-border text-foreground text-xs rounded-xl h-9" 
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleExport} 
                  disabled={data.length === 0}
                  className="rounded-xl border-border bg-background hover:bg-muted font-semibold text-xs h-9 shrink-0"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40 border-b border-border">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="pl-6 text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11">Staff</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11">Department</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11">Shift Policy</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11 text-right font-mono">Expected</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11 text-right font-mono">Present</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11 text-right font-mono">Absent</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11 text-right font-mono">Late</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11 text-right font-mono">Worked (h)</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11 text-right font-mono">Sched (h)</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11 text-right font-mono">Variance</TableHead>
                    <TableHead className="pr-6 text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11 text-right">Absence Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((r, i) => (
                    <TableRow key={i} className="border-b border-border hover:bg-muted/40 transition-colors">
                      <TableCell className="pl-6 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border shrink-0",
                            getAvatarStyle(r.staffName)
                          )}>
                            {getInitials(r.staffName)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground text-sm truncate">{r.staffName}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">{r.staffId || 'NO ID'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground text-sm font-medium">{r.department}</TableCell>
                      <TableCell className="text-xs font-medium text-muted-foreground whitespace-nowrap">{r.shiftName}</TableCell>
                      <TableCell className="text-right text-muted-foreground font-mono text-sm">{r.expectedWorkDays}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400 font-mono text-sm">{r.daysPresent}</TableCell>
                      <TableCell className="text-right font-semibold text-rose-600 dark:text-rose-400 font-mono text-sm">{r.daysAbsent}</TableCell>
                      <TableCell className="text-right text-amber-600 dark:text-amber-400 font-semibold font-mono text-sm">{r.lateCount}</TableCell>
                      <TableCell className="text-right text-foreground font-mono text-sm font-medium">{r.totalHours}h</TableCell>
                      <TableCell className="text-right text-muted-foreground font-mono text-sm">{r.expectedHours}h</TableCell>
                      <TableCell className="text-right font-mono text-sm font-bold">
                        <span className={r.hoursVariance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                          {r.hoursVariance > 0 ? '+' : ''}{r.hoursVariance}h
                        </span>
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                          r.absenceRate > 20
                            ? "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/50 dark:text-rose-200 dark:border-rose-800"
                            : r.absenceRate > 10
                            ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800"
                            : "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800"
                        )}>
                          {r.absenceRate}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {!loading && filteredData.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <div className="w-14 h-14 rounded-2xl bg-muted/60 border border-border flex items-center justify-center mb-3">
                  <TrendingUp className="h-7 w-7 text-muted-foreground/70" />
                </div>
                <p className="text-base font-semibold text-foreground">No Summary Records Found</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm text-center">
                  Adjust your search or date filters to view staff performance summaries.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 3: ABSENT STAFF AUDIT
// ─────────────────────────────────────────────────────────────────────────────

function AbsentStaffTab({ departments }: { departments: any[] }) {
  const [viewDate, setViewDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [departmentId, setDepartmentId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAbsentStaff(viewDate, departmentId || undefined);
      if (res.success) setData(res.data || []);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [viewDate, departmentId, toast]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const q = searchTerm.toLowerCase();
    return data.filter(s => 
      s.staffName?.toLowerCase().includes(q) ||
      s.staffId?.toLowerCase().includes(q) ||
      s.department?.toLowerCase().includes(q)
    );
  }, [data, searchTerm]);

  const handleExport = () => {
    if (!data.length) return;
    const exportRows = data.map(s => ({
      'Staff Name': s.staffName,
      'Staff ID': s.staffId || 'N/A',
      'Department': s.department,
      'Date of Absence': viewDate,
      'Status': 'Unexcused / Absent'
    }));
    exportToCsv(`absent_staff_${viewDate}`, exportRows);
    toast({ title: 'Export Generated', description: `Exported ${exportRows.length} absent staff records.` });
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <Card className="bg-card border-border shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
            <div className="flex items-center gap-2">
              <UserMinus className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <CardTitle className="text-sm font-bold text-foreground tracking-tight">
                Daily Absenteeism Audit Parameters
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <div className="flex flex-wrap items-end gap-4">
              <div className="w-full sm:w-48">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Audit Date</label>
                <Input 
                  type="date" 
                  value={viewDate} 
                  onChange={e => setViewDate(e.target.value)} 
                  className="bg-background border-border text-foreground rounded-xl h-10 text-sm focus-visible:ring-rose-500" 
                />
              </div>
              <div className="w-full sm:w-56">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Department</label>
                <select 
                  value={departmentId} 
                  onChange={e => setDepartmentId(e.target.value)} 
                  className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-rose-500 outline-none"
                >
                  <option value="">All Departments</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <Button 
                onClick={fetch} 
                disabled={loading} 
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-10 font-semibold shadow-sm text-xs sm:text-sm px-6"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                Query Absences
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="bg-card border-border shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="p-4 sm:p-5 border-b border-border/80 bg-muted/20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <CardTitle className="text-base font-bold text-foreground tracking-tight">
                  Absent Personnel Roster
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Staff members with an active work schedule who have no clock-in recorded for {viewDate}.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    type="text" 
                    placeholder="Search absent staff..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="pl-9 bg-background border-border text-foreground text-xs rounded-xl h-9" 
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleExport} 
                  disabled={data.length === 0}
                  className="rounded-xl border-border bg-background hover:bg-muted font-semibold text-xs h-9 shrink-0"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40 border-b border-border">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="pl-6 text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11">Staff Member</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11 font-mono">Staff ID</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11">Department</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11">Scheduled Date</TableHead>
                    <TableHead className="pr-6 text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11 text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map(s => (
                    <TableRow key={s.id} className="border-b border-border hover:bg-muted/40 transition-colors">
                      <TableCell className="pl-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border shrink-0",
                            getAvatarStyle(s.staffName)
                          )}>
                            {getInitials(s.staffName)}
                          </div>
                          <span className="font-semibold text-foreground text-sm">{s.staffName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{s.staffId || 'N/A'}</TableCell>
                      <TableCell className="text-foreground text-sm font-medium">{s.department}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">{viewDate}</TableCell>
                      <TableCell className="pr-6 text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-950/50 dark:text-rose-200 dark:border-rose-800">
                          Absent (No Record)
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {!loading && filteredData.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
                  <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-base font-semibold text-foreground">Zero Absences Recorded</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm text-center">
                  All scheduled personnel have recorded clock-in events for {viewDate}.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 4: INCOMPLETE LOGS TAB
// ─────────────────────────────────────────────────────────────────────────────

function IncompleteLogsTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const fetch = useCallback(() => {
    setLoading(true);
    getIncompleteLogs()
      .then(res => {
        if (res.success) setData(res.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const q = searchTerm.toLowerCase();
    return data.filter(l => 
      l.staffName?.toLowerCase().includes(q) ||
      l.staffId?.toLowerCase().includes(q) ||
      l.department?.toLowerCase().includes(q) ||
      l.kioskName?.toLowerCase().includes(q)
    );
  }, [data, searchTerm]);

  const handleExport = () => {
    if (!data.length) return;
    const exportRows = data.map(l => ({
      'Staff Name': l.staffName,
      'Staff ID': l.staffId || 'N/A',
      'Department': l.department,
      'Date': l.date,
      'Time In': l.timeIn,
      'Terminal': l.kioskName,
      'Status': 'Missing Clock-Out'
    }));
    exportToCsv('incomplete_attendance_logs', exportRows);
    toast({ title: 'Export Generated', description: `Exported ${exportRows.length} incomplete records.` });
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <div className="flex items-start gap-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <p className="font-semibold text-amber-950 dark:text-amber-100">Action Required: Unclosed Shifts</p>
            <p className="mt-0.5 text-amber-800 dark:text-amber-300">
              The records below represent previous working days where staff clocked in at a terminal but never clocked out. 
              These shifts remain open and require manual supervisor closure or dispute reconciliation.
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="bg-card border-border shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="p-4 sm:p-5 border-b border-border/80 bg-muted/20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <CardTitle className="text-base font-bold text-foreground tracking-tight">
                  Incomplete Terminal Verifications ({filteredData.length})
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Historical attendance logs missing a registered clock-out punch.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    type="text" 
                    placeholder="Search incomplete logs..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="pl-9 bg-background border-border text-foreground text-xs rounded-xl h-9" 
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleExport} 
                  disabled={data.length === 0}
                  className="rounded-xl border-border bg-background hover:bg-muted font-semibold text-xs h-9 shrink-0"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40 border-b border-border">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="pl-6 text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11">Staff Member</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11 font-mono">Staff ID</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11">Department</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11">Date</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11 font-mono">Time In</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11">Terminal</TableHead>
                    <TableHead className="pr-6 text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11 text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map(l => (
                    <TableRow key={l.id} className="border-b border-border hover:bg-muted/40 transition-colors">
                      <TableCell className="pl-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border shrink-0",
                            getAvatarStyle(l.staffName)
                          )}>
                            {getInitials(l.staffName)}
                          </div>
                          <span className="font-semibold text-foreground text-sm">{l.staffName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{l.staffId || 'N/A'}</TableCell>
                      <TableCell className="text-foreground text-sm font-medium">{l.department}</TableCell>
                      <TableCell className="text-foreground font-mono text-xs">{l.date}</TableCell>
                      <TableCell className="font-mono text-sm text-foreground">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-xs font-semibold">
                          {l.timeIn}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted border border-border/80 text-[11px] font-medium text-foreground">
                          {l.kioskName}
                        </span>
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800">
                          Missing Clock-Out
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {!loading && filteredData.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
                  <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-base font-semibold text-foreground">Clean Audit: No Incomplete Logs</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm text-center">
                  All past attendance records have properly closed punch cycles.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 5: OVERTIME REPORT TAB
// ─────────────────────────────────────────────────────────────────────────────

function OvertimeReportTab() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getOvertimeReport(month, year);
      if (res.success) setData(res.data || []);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [month, year, toast]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const q = searchTerm.toLowerCase();
    return data.filter(d => 
      d.staff?.name?.toLowerCase().includes(q) ||
      d.staff?.staffId?.toLowerCase().includes(q) ||
      d.staff?.department?.toLowerCase().includes(q)
    );
  }, [data, searchTerm]);

  const handleExport = () => {
    if (!data.length) return;
    const exportRows = data.map(d => ({
      'Staff Name': d.staff.name,
      'Staff ID': d.staff.staffId || 'N/A',
      'Department': d.staff.department,
      'Total OT Hours': d.totalHours,
      'Overtime Sessions': d.records.length,
      'Period': `${month}/${year}`
    }));
    exportToCsv(`overtime_report_${year}_${month}`, exportRows);
    toast({ title: 'Export Generated', description: `Exported ${exportRows.length} overtime records.` });
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <Card className="bg-card border-border shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <CardTitle className="text-sm font-bold text-foreground tracking-tight">
                Overtime Calculation Cycle
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <div className="flex flex-wrap items-end gap-4">
              <div className="w-full sm:w-48">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Month</label>
                <select 
                  value={month} 
                  onChange={e => setMonth(parseInt(e.target.value))} 
                  className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{format(new Date(2024, i), 'MMMM')}</option>
                  ))}
                </select>
              </div>
              <div className="w-full sm:w-36">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Year</label>
                <Input 
                  type="number" 
                  value={year} 
                  onChange={e => setYear(parseInt(e.target.value))} 
                  className="w-full bg-background border-border text-foreground rounded-xl h-10 text-sm focus-visible:ring-indigo-500" 
                />
              </div>
              <Button 
                onClick={fetch} 
                disabled={loading} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 font-semibold shadow-sm text-xs sm:text-sm px-6"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                Calculate Overtime
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="bg-card border-border shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="p-4 sm:p-5 border-b border-border/80 bg-muted/20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <CardTitle className="text-base font-bold text-foreground tracking-tight">
                  Approved Overtime Records
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Accredited hours worked in excess of scheduled daily shift duration.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    type="text" 
                    placeholder="Search staff..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="pl-9 bg-background border-border text-foreground text-xs rounded-xl h-9" 
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleExport} 
                  disabled={data.length === 0}
                  className="rounded-xl border-border bg-background hover:bg-muted font-semibold text-xs h-9 shrink-0"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40 border-b border-border">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="pl-6 text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11">Staff Member</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11 font-mono">Staff ID</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11">Department</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11 text-right font-mono">Total OT Hours</TableHead>
                    <TableHead className="pr-6 text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11 text-right">Sessions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((d, i) => (
                    <TableRow key={i} className="border-b border-border hover:bg-muted/40 transition-colors">
                      <TableCell className="pl-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border shrink-0",
                            getAvatarStyle(d.staff.name)
                          )}>
                            {getInitials(d.staff.name)}
                          </div>
                          <span className="font-semibold text-foreground text-sm">{d.staff.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{d.staff.staffId || 'N/A'}</TableCell>
                      <TableCell className="text-foreground text-sm font-medium">{d.staff.department}</TableCell>
                      <TableCell className="text-right font-bold text-indigo-600 dark:text-indigo-400 font-mono text-sm">
                        +{d.totalHours}h
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-900 border border-indigo-300 dark:bg-indigo-950/50 dark:text-indigo-200 dark:border-indigo-800">
                          {d.records.length} {d.records.length === 1 ? 'Shift' : 'Shifts'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {!loading && filteredData.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <div className="w-14 h-14 rounded-2xl bg-muted/60 border border-border flex items-center justify-center mb-3">
                  <Clock className="h-7 w-7 text-muted-foreground/70" />
                </div>
                <p className="text-base font-semibold text-foreground">No Overtime Recorded</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm text-center">
                  No personnel accrued hours exceeding standard shifts for this calculation cycle.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 6: OFF-DAY & HOLIDAY REPORT TAB
// ─────────────────────────────────────────────────────────────────────────────

function OffDayReportTab() {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const monthStartStr = format(startOfMonth(new Date()), 'yyyy-MM-dd');

  const [startDate, setStartDate] = useState(monthStartStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getOffDayReport(startDate, endDate);
      if (res.success) setData(res.data || []);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, toast]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const q = searchTerm.toLowerCase();
    return data.filter(r => 
      r.staffName?.toLowerCase().includes(q) ||
      r.staffId?.toLowerCase().includes(q) ||
      r.department?.toLowerCase().includes(q) ||
      r.reason?.toLowerCase().includes(q)
    );
  }, [data, searchTerm]);

  const handleExport = () => {
    if (!data.length) return;
    const exportRows = data.map(r => ({
      'Staff Name': r.staffName,
      'Staff ID': r.staffId || 'N/A',
      'Department': r.department,
      'Date': r.date,
      'Time In': r.timeIn || 'N/A',
      'Time Out': r.timeOut || 'N/A',
      'Duration': r.duration,
      'Classification': r.reason
    }));
    exportToCsv(`offday_attendance_${startDate}_to_${endDate}`, exportRows);
    toast({ title: 'Export Generated', description: `Exported ${exportRows.length} off-day records.` });
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <Card className="bg-card border-border shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
            <div className="flex items-center gap-2">
              <CalendarX className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <CardTitle className="text-sm font-bold text-foreground tracking-tight">
                Rest Day & Holiday Audit Filter
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <div className="flex flex-wrap items-end gap-4">
              <div className="w-full sm:w-48">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Start Date</label>
                <Input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)} 
                  className="bg-background border-border text-foreground rounded-xl h-10 text-sm focus-visible:ring-emerald-500" 
                />
              </div>
              <div className="w-full sm:w-48">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">End Date</label>
                <Input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)} 
                  className="bg-background border-border text-foreground rounded-xl h-10 text-sm focus-visible:ring-emerald-500" 
                />
              </div>
              <Button 
                onClick={fetch} 
                disabled={loading} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 font-semibold shadow-sm text-xs sm:text-sm px-6"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                Scan Off-Day Logs
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="bg-card border-border shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="p-4 sm:p-5 border-b border-border/80 bg-muted/20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <CardTitle className="text-base font-bold text-foreground tracking-tight">
                  Weekend & Holiday Activity Logs
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Staff members who accessed terminals during non-working days or institutional holidays.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    type="text" 
                    placeholder="Search off-day logs..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="pl-9 bg-background border-border text-foreground text-xs rounded-xl h-9" 
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleExport} 
                  disabled={data.length === 0}
                  className="rounded-xl border-border bg-background hover:bg-muted font-semibold text-xs h-9 shrink-0"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40 border-b border-border">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="pl-6 text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11">Staff Member</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11 font-mono">Staff ID</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11">Department</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11">Date</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11 font-mono">Time In</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11 font-mono">Time Out</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11">Duration</TableHead>
                    <TableHead className="pr-6 text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11 text-right">Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map(r => (
                    <TableRow key={r.id} className="border-b border-border hover:bg-muted/40 transition-colors">
                      <TableCell className="pl-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border shrink-0",
                            getAvatarStyle(r.staffName)
                          )}>
                            {getInitials(r.staffName)}
                          </div>
                          <span className="font-semibold text-foreground text-sm">{r.staffName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{r.staffId || 'N/A'}</TableCell>
                      <TableCell className="text-foreground text-sm font-medium">{r.department}</TableCell>
                      <TableCell className="text-foreground font-mono text-xs">{r.date}</TableCell>
                      <TableCell className="font-mono text-sm text-foreground">{r.timeIn || '-'}</TableCell>
                      <TableCell className="font-mono text-sm text-foreground">{r.timeOut || '-'}</TableCell>
                      <TableCell className="text-foreground font-mono text-xs font-semibold">{r.duration}</TableCell>
                      <TableCell className="pr-6 text-right">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                          r.reason === 'Holiday'
                            ? "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/50 dark:text-blue-200 dark:border-blue-800"
                            : "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800"
                        )}>
                          {r.reason}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {!loading && filteredData.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <div className="w-14 h-14 rounded-2xl bg-muted/60 border border-border flex items-center justify-center mb-3">
                  <CalendarX className="h-7 w-7 text-muted-foreground/70" />
                </div>
                <p className="text-base font-semibold text-foreground">No Off-Day Activity</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm text-center">
                  No staff members attended during weekends or institutional holidays in this period.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REUSABLE STAT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function ReportMetricCard({ 
  label, 
  value, 
  sublabel,
  valueColor = "text-foreground", 
  icon 
}: { 
  label: string; 
  value: any; 
  sublabel: string;
  valueColor?: string; 
  icon: React.ReactNode;
}) {
  return (
    <Card className="bg-card border-border/80 rounded-2xl p-4 shadow-sm hover:border-border transition-colors relative overflow-hidden">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
        <div className="p-1.5 rounded-xl bg-muted/60 border border-border/60">
          {icon}
        </div>
      </div>
      <p className={`text-2xl font-black font-mono mt-1 tracking-tight ${valueColor}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{sublabel}</p>
    </Card>
  );
}
