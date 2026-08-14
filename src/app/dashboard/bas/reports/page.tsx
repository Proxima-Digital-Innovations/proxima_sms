'use client';

import { useState, useEffect } from 'react';
import { getAttendanceReport, getSummaryReport, getAbsentStaff, getIncompleteLogs, getOvertimeReport, getOffDayReport, getDepartments, getStaffList } from '@/actions/bas-actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, UserMinus, AlertTriangle, Clock as ClockIcon, CalendarX, TrendingUp, Search, Loader2, BarChart3 } from 'lucide-react';
import { format, startOfMonth } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

type ReportTab = 'report' | 'summary' | 'absent' | 'incomplete' | 'overtime' | 'offday';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 }
  }
};

export default function BasReportsPage() {
    const [activeTab, setActiveTab] = useState<ReportTab>('report');
    const [departments, setDepartments] = useState<any[]>([]);
    const [staffList, setStaffList] = useState<any[]>([]);

    useEffect(() => {
        getDepartments().then(r => r.success && setDepartments(r.data || []));
        getStaffList().then(r => r.success && setStaffList(r.staff || []));
    }, []);

    const tabItems: { key: ReportTab; label: string; icon: React.ReactNode }[] = [
        { key: 'report', label: 'Attendance', icon: <FileText className="w-4 h-4" /> },
        { key: 'summary', label: 'Summary', icon: <TrendingUp className="w-4 h-4" /> },
        { key: 'absent', label: 'Absent Staff', icon: <UserMinus className="w-4 h-4" /> },
        { key: 'incomplete', label: 'Incomplete', icon: <AlertTriangle className="w-4 h-4" /> },
        { key: 'overtime', label: 'Overtime', icon: <ClockIcon className="w-4 h-4" /> },
        { key: 'offday', label: 'Off-Day', icon: <CalendarX className="w-4 h-4" /> },
    ];

    return (
        <div className="min-h-screen bg-slate-950 pb-12 -mt-6 -mx-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-8 py-5 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-20 shadow-sm gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-blue-600/20 border border-blue-500/30 rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                        <BarChart3 className="text-blue-400 w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-tight">Attendance Reports</h1>
                        <p className="text-xs text-slate-400 font-medium">Generate and view detailed BAS reports.</p>
                    </div>
                </div>
                
                <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 overflow-x-auto w-full md:w-auto custom-scrollbar">
                    {tabItems.map(tab => (
                        <button 
                            key={tab.key} 
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                                activeTab === tab.key 
                                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm' 
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                            }`}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-8 py-8 max-w-[1600px] mx-auto space-y-8">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
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
        </div>
    );
}

function AttendanceReportTab({ departments, staffList }: { departments: any[]; staffList: any[] }) {
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [departmentId, setDepartmentId] = useState('');
    const [staffId, setStaffId] = useState('');
    const [data, setData] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const fetch = async () => {
        setLoading(true);
        const res = await getAttendanceReport(startDate, endDate, staffId || undefined, departmentId || undefined);
        if (res.success) { setData(res.data || []); setStats(res.periodStats); }
        setLoading(false);
    };

    useEffect(() => { fetch(); }, []);

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
            <motion.div variants={itemVariants}>
                <Card className="bg-slate-900/50 border-slate-800 shadow-xl overflow-hidden">
                    <CardContent className="p-5">
                        <div className="flex flex-wrap items-end gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Start Date</label>
                                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40 bg-slate-950 border-slate-800 text-white focus-visible:ring-blue-500" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">End Date</label>
                                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40 bg-slate-950 border-slate-800 text-white focus-visible:ring-blue-500" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Department</label>
                                <select value={departmentId} onChange={e => setDepartmentId(e.target.value)} className="h-9 rounded-md border border-slate-800 bg-slate-950 px-3 py-1 text-sm w-48 text-white focus:ring-1 focus:ring-blue-500 outline-none">
                                    <option value="">All Departments</option>
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Staff</label>
                                <select value={staffId} onChange={e => setStaffId(e.target.value)} className="h-9 rounded-md border border-slate-800 bg-slate-950 px-3 py-1 text-sm w-48 text-white focus:ring-1 focus:ring-blue-500 outline-none">
                                    <option value="">All Staff</option>
                                    {staffList.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                                </select>
                            </div>
                            <Button onClick={fetch} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white ml-auto">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}Generate
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {stats && (
                <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <MiniStat label="Total Logs" value={stats.totalLogs} />
                    <MiniStat label="Late Arrivals" value={stats.lateCount} color="text-rose-400" />
                    <MiniStat label="Late Rate" value={`${stats.lateRate}%`} color="text-amber-400" />
                    <MiniStat label="Unique Staff" value={stats.staffCount} color="text-purple-400" />
                    <MiniStat label="Total Hours" value={`${stats.totalHours}h`} color="text-emerald-400" />
                </motion.div>
            )}

            <motion.div variants={itemVariants}>
                <Card className="bg-slate-900/50 border-slate-800 shadow-xl overflow-hidden">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-900/80 border-b border-slate-800">
                                    <TableRow className="hover:bg-transparent border-none">
                                        <TableHead className="pl-6 text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Staff</TableHead>
                                        <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Department</TableHead>
                                        <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Date</TableHead>
                                        <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Time In</TableHead>
                                        <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Time Out</TableHead>
                                        <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Duration</TableHead>
                                        <TableHead className="pr-6 text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.map(r => (
                                        <TableRow key={r.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                                            <TableCell className="pl-6">
                                                <div className="font-medium text-white">{r.staffName}</div>
                                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">{r.staffId}</div>
                                            </TableCell>
                                            <TableCell className="text-slate-300">{r.department}</TableCell>
                                            <TableCell className="text-slate-300 font-medium">{r.date}</TableCell>
                                            <TableCell className="font-mono text-sm text-slate-400">{r.timeIn || '-'}</TableCell>
                                            <TableCell className="font-mono text-sm text-slate-400">{r.timeOut || '-'}</TableCell>
                                            <TableCell className="text-slate-300">{r.duration}</TableCell>
                                            <TableCell className="pr-6">
                                                <Badge variant="outline" className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${r.isLate ? 'bg-rose-950/40 text-rose-400 border-rose-800/50' : 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50'}`}>
                                                    {r.isLate ? 'Late' : 'On Time'}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        {!loading && data.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                                <FileText className="h-10 w-10 text-slate-600 mb-4" />
                                <p className="text-sm font-medium text-slate-400">No attendance records found for this period.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
    );
}

function SummaryReportTab({ departments, staffList }: { departments: any[]; staffList: any[] }) {
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [departmentId, setDepartmentId] = useState('');
    const [staffId, setStaffId] = useState('');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetch = async () => {
        setLoading(true);
        const res = await getSummaryReport(startDate, endDate, departmentId || undefined, staffId || undefined);
        if (res.success) setData(res.data || []);
        setLoading(false);
    };

    useEffect(() => { fetch(); }, []);

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
            <motion.div variants={itemVariants}>
                <Card className="bg-slate-900/50 border-slate-800 shadow-xl overflow-hidden">
                    <CardContent className="p-5">
                        <div className="flex flex-wrap items-end gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Start Date</label>
                                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40 bg-slate-950 border-slate-800 text-white focus-visible:ring-purple-500" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">End Date</label>
                                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40 bg-slate-950 border-slate-800 text-white focus-visible:ring-purple-500" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Department</label>
                                <select value={departmentId} onChange={e => setDepartmentId(e.target.value)} className="h-9 rounded-md border border-slate-800 bg-slate-950 px-3 py-1 text-sm w-48 text-white focus:ring-1 focus:ring-purple-500 outline-none">
                                    <option value="">All Departments</option>
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Staff</label>
                                <select value={staffId} onChange={e => setStaffId(e.target.value)} className="h-9 rounded-md border border-slate-800 bg-slate-950 px-3 py-1 text-sm w-48 text-white focus:ring-1 focus:ring-purple-500 outline-none">
                                    <option value="">All Staff</option>
                                    {staffList.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                                </select>
                            </div>
                            <Button onClick={fetch} disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white ml-auto">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}Generate
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
                <Card className="bg-slate-900/50 border-slate-800 shadow-xl overflow-hidden">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-900/80 border-b border-slate-800">
                                    <TableRow className="hover:bg-transparent border-none">
                                        <TableHead className="pl-6 text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Staff</TableHead>
                                        <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Department</TableHead>
                                        <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Shift</TableHead>
                                        <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10 text-right">Expected</TableHead>
                                        <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10 text-right">Present</TableHead>
                                        <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10 text-right">Absent</TableHead>
                                        <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10 text-right">Late</TableHead>
                                        <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10 text-right">Worked (h)</TableHead>
                                        <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10 text-right">Expected (h)</TableHead>
                                        <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10 text-right">Variance</TableHead>
                                        <TableHead className="pr-6 text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10 text-right">Absence Rate</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.map((r, i) => (
                                        <TableRow key={i} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                                            <TableCell className="pl-6">
                                                <div className="font-medium text-white">{r.staffName}</div>
                                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">{r.staffId}</div>
                                            </TableCell>
                                            <TableCell className="text-slate-300">{r.department}</TableCell>
                                            <TableCell className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{r.shiftName}</TableCell>
                                            <TableCell className="text-right text-slate-400 font-mono">{r.expectedWorkDays}</TableCell>
                                            <TableCell className="text-right font-medium text-emerald-400">{r.daysPresent}</TableCell>
                                            <TableCell className="text-right font-medium text-rose-400">{r.daysAbsent}</TableCell>
                                            <TableCell className="text-right text-amber-400 font-medium">{r.lateCount}</TableCell>
                                            <TableCell className="text-right text-slate-200 font-mono">{r.totalHours}</TableCell>
                                            <TableCell className="text-right text-slate-500 font-mono">{r.expectedHours}</TableCell>
                                            <TableCell className="text-right font-mono text-sm">
                                                <span className={r.hoursVariance >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                                    {r.hoursVariance > 0 ? '+' : ''}{r.hoursVariance}
                                                </span>
                                            </TableCell>
                                            <TableCell className="pr-6 text-right">
                                                <Badge variant="outline" className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${r.absenceRate > 20 ? 'bg-rose-950/40 text-rose-400 border-rose-800/50' : 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50'}`}>
                                                    {r.absenceRate}%
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        {!loading && data.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                                <TrendingUp className="h-10 w-10 text-slate-600 mb-4" />
                                <p className="text-sm font-medium text-slate-400">No summary data found for this period.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
    );
}

function AbsentStaffTab({ departments }: { departments: any[] }) {
    const [viewDate, setViewDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [departmentId, setDepartmentId] = useState('');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetch = async () => {
        setLoading(true);
        const res = await getAbsentStaff(viewDate, departmentId || undefined);
        if (res.success) setData(res.data || []);
        setLoading(false);
    };

    useEffect(() => { fetch(); }, []);

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
            <motion.div variants={itemVariants}>
                <Card className="bg-slate-900/50 border-slate-800 shadow-xl overflow-hidden">
                    <CardContent className="p-5">
                        <div className="flex items-end gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Date</label>
                                <Input type="date" value={viewDate} onChange={e => setViewDate(e.target.value)} className="w-40 bg-slate-950 border-slate-800 text-white focus-visible:ring-rose-500" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Department</label>
                                <select value={departmentId} onChange={e => setDepartmentId(e.target.value)} className="h-9 rounded-md border border-slate-800 bg-slate-950 px-3 py-1 text-sm w-48 text-white focus:ring-1 focus:ring-rose-500 outline-none">
                                    <option value="">All Departments</option>
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                            <Button onClick={fetch} disabled={loading} className="bg-rose-600 hover:bg-rose-700 text-white">
                                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Search
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
                <Card className="bg-slate-900/50 border-slate-800 shadow-xl overflow-hidden">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-slate-900/80 border-b border-slate-800">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="pl-6 text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Staff Name</TableHead>
                                    <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Staff ID</TableHead>
                                    <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Department</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map(s => (
                                    <TableRow key={s.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                                        <TableCell className="pl-6 font-medium text-white">{s.staffName}</TableCell>
                                        <TableCell className="font-mono text-xs text-slate-400">{s.staffId || 'N/A'}</TableCell>
                                        <TableCell className="text-slate-300">{s.department}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        {!loading && data.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                                <UserMinus className="h-10 w-10 text-slate-600 mb-4" />
                                <p className="text-sm font-medium text-slate-400">No absent staff found for this date.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
    );
}

function IncompleteLogsTab() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getIncompleteLogs().then(res => { if (res.success) setData(res.data || []); setLoading(false); });
    }, []);

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
            <motion.div variants={itemVariants}>
                <Card className="bg-slate-900/50 border-slate-800 shadow-xl overflow-hidden">
                    <CardHeader className="border-b border-slate-800/50 bg-slate-900/40 pb-5">
                        <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            Incomplete Attendance Logs
                        </CardTitle>
                        <CardDescription className="text-slate-400 mt-1">Staff who clocked in but never clocked out (past dates only).</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="flex h-64 items-center justify-center">
                                <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-r-transparent" />
                            </div>
                        ) : data.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                                <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4">
                                    <AlertTriangle className="h-8 w-8 text-slate-600" />
                                </div>
                                <p className="text-sm font-medium text-slate-400">No incomplete logs found.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-slate-900/80 border-b border-slate-800">
                                        <TableRow className="hover:bg-transparent border-none">
                                            <TableHead className="pl-6 text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Staff</TableHead>
                                            <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Date</TableHead>
                                            <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Time In</TableHead>
                                            <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Terminal</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.map(l => (
                                            <TableRow key={l.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                                                <TableCell className="pl-6">
                                                    <div className="font-medium text-white">{l.staffName}</div>
                                                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">{l.staffId}</div>
                                                </TableCell>
                                                <TableCell className="text-slate-300 font-medium">{l.date}</TableCell>
                                                <TableCell className="font-mono text-sm text-slate-400">{l.timeIn}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="bg-slate-800/50 text-slate-300 border-slate-700 font-normal">
                                                        {l.kioskName}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
    );
}

function OvertimeReportTab() {
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetch = async () => { setLoading(true); const res = await getOvertimeReport(month, year); if (res.success) setData(res.data || []); setLoading(false); };

    useEffect(() => { fetch(); }, []);

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
            <motion.div variants={itemVariants}>
                <Card className="bg-slate-900/50 border-slate-800 shadow-xl overflow-hidden">
                    <CardContent className="p-5">
                        <div className="flex items-end gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Month</label>
                                <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="h-9 rounded-md border border-slate-800 bg-slate-950 px-3 py-1 text-sm w-36 text-white focus:ring-1 focus:ring-indigo-500 outline-none">
                                    {Array.from({length: 12}, (_, i) => <option key={i+1} value={i+1}>{format(new Date(2024, i), 'MMMM')}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Year</label>
                                <Input type="number" value={year} onChange={e => setYear(parseInt(e.target.value))} className="w-24 bg-slate-950 border-slate-800 text-white focus-visible:ring-indigo-500" />
                            </div>
                            <Button onClick={fetch} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Generate
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
            <motion.div variants={itemVariants}>
                <Card className="bg-slate-900/50 border-slate-800 shadow-xl overflow-hidden">
                    <CardContent className="p-0">
                        {data.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                                <ClockIcon className="h-10 w-10 text-slate-600 mb-4" />
                                <p className="text-sm font-medium text-slate-400">No overtime recorded for this period.</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader className="bg-slate-900/80 border-b border-slate-800">
                                    <TableRow className="hover:bg-transparent border-none">
                                        <TableHead className="pl-6 text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Staff</TableHead>
                                        <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Department</TableHead>
                                        <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10 text-right">Total OT Hours</TableHead>
                                        <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10 text-right">Sessions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.map((d, i) => (
                                        <TableRow key={i} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                                            <TableCell className="pl-6">
                                                <div className="font-medium text-white">{d.staff.name}</div>
                                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">{d.staff.staffId}</div>
                                            </TableCell>
                                            <TableCell className="text-slate-300">{d.staff.department}</TableCell>
                                            <TableCell className="text-right font-bold text-indigo-400 font-mono text-sm">{d.totalHours}h</TableCell>
                                            <TableCell className="text-right text-slate-300 font-medium">{d.records.length}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
    );
}

function OffDayReportTab() {
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetch = async () => { setLoading(true); const res = await getOffDayReport(startDate, endDate); if (res.success) setData(res.data || []); setLoading(false); };

    useEffect(() => { fetch(); }, []);

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
            <motion.div variants={itemVariants}>
                <Card className="bg-slate-900/50 border-slate-800 shadow-xl overflow-hidden">
                    <CardContent className="p-5">
                        <div className="flex items-end gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Start Date</label>
                                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40 bg-slate-950 border-slate-800 text-white focus-visible:ring-emerald-500" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">End Date</label>
                                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40 bg-slate-950 border-slate-800 text-white focus-visible:ring-emerald-500" />
                            </div>
                            <Button onClick={fetch} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Generate
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
            <motion.div variants={itemVariants}>
                <Card className="bg-slate-900/50 border-slate-800 shadow-xl overflow-hidden">
                    <CardContent className="p-0">
                        {data.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                                <CalendarX className="h-10 w-10 text-slate-600 mb-4" />
                                <p className="text-sm font-medium text-slate-400">No off-day attendance found.</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader className="bg-slate-900/80 border-b border-slate-800">
                                    <TableRow className="hover:bg-transparent border-none">
                                        <TableHead className="pl-6 text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Staff</TableHead>
                                        <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Date</TableHead>
                                        <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Time In</TableHead>
                                        <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Time Out</TableHead>
                                        <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Duration</TableHead>
                                        <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Reason</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.map(r => (
                                        <TableRow key={r.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                                            <TableCell className="pl-6">
                                                <div className="font-medium text-white">{r.staffName}</div>
                                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">{r.staffId}</div>
                                            </TableCell>
                                            <TableCell className="text-slate-300 font-medium">{r.date}</TableCell>
                                            <TableCell className="font-mono text-sm text-slate-400">{r.timeIn || '-'}</TableCell>
                                            <TableCell className="font-mono text-sm text-slate-400">{r.timeOut || '-'}</TableCell>
                                            <TableCell className="text-slate-300">{r.duration}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${r.reason === 'Holiday' ? 'bg-blue-950/40 text-blue-400 border-blue-800/50' : 'bg-orange-950/40 text-orange-400 border-orange-800/50'}`}>
                                                    {r.reason}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
    );
}

function MiniStat({ label, value, color = "text-white" }: { label: string; value: any, color?: string }) {
    return (
        <Card className="bg-slate-900/50 border-slate-800 shadow-xl overflow-hidden">
            <CardContent className="p-5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                <p className={`text-2xl font-bold font-mono mt-1.5 ${color}`}>{value}</p>
            </CardContent>
        </Card>
    );
}
