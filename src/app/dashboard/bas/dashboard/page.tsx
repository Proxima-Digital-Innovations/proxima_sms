'use client';

import { useState, useEffect } from 'react';
import { getBasDashboardStats, getAttendanceLogs, getLeaderboard } from '@/actions/bas-actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Fingerprint, Users, Activity, XCircle, Clock, TrendingUp, Award, CalendarDays, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { format, subDays, addDays } from 'date-fns';
import { motion } from 'framer-motion';

type TabType = 'all' | 'late' | 'absent' | 'enrolled';

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
    transition: { type: "spring" as const, stiffness: 300, damping: 24 }
  }
};

export default function BasDashboardPage() {
    const [stats, setStats] = useState<any>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [logsLoading, setLogsLoading] = useState(false);
    const [viewDate, setViewDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [activeTab, setActiveTab] = useState<TabType>('all');

    useEffect(() => {
        fetchData();
    }, [viewDate]);

    useEffect(() => {
        fetchLogs();
    }, [viewDate, activeTab]);

    const fetchData = async () => {
        setLoading(true);
        const [statsRes, lbRes] = await Promise.all([
            getBasDashboardStats(viewDate),
            getLeaderboard(new Date().getMonth() + 1, new Date().getFullYear())
        ]);
        if (statsRes.success) setStats(statsRes.data);
        if (lbRes.success) setLeaderboard(lbRes.data || []);
        setLoading(false);
    };

    const fetchLogs = async () => {
        setLogsLoading(true);
        const res = await getAttendanceLogs(viewDate, activeTab);
        if (res.success && res.data) setLogs(res.data);
        else setLogs([]);
        setLogsLoading(false);
    };

    const tabs: { key: TabType; label: string; count?: number }[] = [
        { key: 'all', label: 'All Logs', count: stats?.presentCount },
        { key: 'late', label: 'Late', count: stats?.lateCount },
        { key: 'absent', label: 'Absent', count: stats?.absentCount },
        { key: 'enrolled', label: 'Enrolled', count: stats?.enrolledCount },
    ];

    return (
        <div className="min-h-screen bg-slate-950 pb-12 -mt-6 -mx-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-8 py-5 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-20 shadow-sm gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-blue-600/20 border border-blue-500/30 rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                        <Fingerprint className="text-blue-400 w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-tight">BAS Dashboard</h1>
                        <p className="text-xs text-slate-400 font-medium">Biometric Attendance System — real-time monitoring.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 shadow-inner">
                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-800 text-slate-300" onClick={() => setViewDate(format(subDays(new Date(viewDate), 1), 'yyyy-MM-dd'))}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-2 px-2 border-x border-slate-800">
                        <CalendarDays className="h-4 w-4 text-slate-400" />
                        <Input
                            type="date"
                            value={viewDate}
                            onChange={(e) => setViewDate(e.target.value)}
                            className="border-0 bg-transparent p-0 h-7 w-36 text-sm text-white focus-visible:ring-0 cursor-pointer [&::-webkit-calendar-picker-indicator]:invert-[0.8]"
                        />
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-800 text-slate-300" onClick={() => setViewDate(format(addDays(new Date(viewDate), 1), 'yyyy-MM-dd'))}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="px-8 py-8 max-w-[1600px] mx-auto space-y-8">
                {/* Holiday/Weekend Banner */}
                {stats?.isHoliday && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-4 flex items-center gap-3 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                        <div className="p-2 bg-amber-500/10 rounded-lg">
                           <AlertTriangle className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-medium">This date falls on a public holiday. Absent count is zeroed.</span>
                    </motion.div>
                )}
                {stats?.isWeekend && !stats?.isHoliday && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-4 flex items-center gap-3 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                           <CalendarDays className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-medium">This date falls on a weekend.</span>
                    </motion.div>
                )}

                {/* Stat Cards */}
                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid gap-4 md:grid-cols-3 lg:grid-cols-6"
                >
                    <StatCard icon={<TrendingUp className="h-4 w-4" />} iconColor="text-blue-400" iconBg="bg-blue-500/10" label="Presence Rate" value={loading ? null : `${stats?.presenceRate || 0}%`} sub={`of ${stats?.totalActiveStaff || 0} staff`} />
                    <StatCard icon={<Fingerprint className="h-4 w-4" />} iconColor="text-emerald-400" iconBg="bg-emerald-500/10" label="Present" value={loading ? null : stats?.presentCount} sub="Clocked in" />
                    <StatCard icon={<Clock className="h-4 w-4" />} iconColor="text-amber-400" iconBg="bg-amber-500/10" label="Late" value={loading ? null : stats?.lateCount} sub="After grace period" />
                    <StatCard icon={<XCircle className="h-4 w-4" />} iconColor="text-rose-400" iconBg="bg-rose-500/10" label="Absent" value={loading ? null : stats?.absentCount} sub="Not clocked in" />
                    <StatCard icon={<Users className="h-4 w-4" />} iconColor="text-purple-400" iconBg="bg-purple-500/10" label="Enrolled" value={loading ? null : stats?.enrolledCount} sub="Biometric registered" />
                    <StatCard icon={<Activity className="h-4 w-4" />} iconColor="text-cyan-400" iconBg="bg-cyan-500/10" label="Active Kiosks" value={loading ? null : stats?.activeKiosks} sub="Connected terminals" />
                </motion.div>

                {/* Main Content Grid */}
                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                >
                    {/* Attendance Table (spans 2 cols) */}
                    <motion.div variants={itemVariants} className="lg:col-span-2">
                        <Card className="bg-slate-900/50 border-slate-800 shadow-xl overflow-hidden h-full flex flex-col">
                            <CardHeader className="pb-0 border-b border-slate-800/50 bg-slate-900/40 px-0">
                                <div className="flex items-center gap-1 px-6">
                                    {tabs.map(tab => (
                                        <button
                                            key={tab.key}
                                            onClick={() => setActiveTab(tab.key)}
                                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors relative ${
                                                activeTab === tab.key
                                                    ? 'border-blue-500 text-white'
                                                    : 'border-transparent text-slate-500 hover:text-slate-300'
                                            }`}
                                        >
                                            {tab.label}
                                            {tab.count != null && (
                                                <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${
                                                    activeTab === tab.key ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-400'
                                                }`}>
                                                    {tab.count}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 flex-1">
                                {logsLoading ? (
                                    <div className="flex h-64 items-center justify-center">
                                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-r-transparent" />
                                    </div>
                                ) : logs.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                                        <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4">
                                           <Fingerprint className="h-8 w-8 text-slate-600" />
                                        </div>
                                        <p className="text-sm font-medium text-slate-400">No records found for this filter.</p>
                                    </div>
                                ) : activeTab === 'absent' ? (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader className="bg-slate-900/80 border-b border-slate-800">
                                                <TableRow className="hover:bg-transparent border-none">
                                                <TableHead className="pl-6 text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Staff Name</TableHead>
                                                <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Staff ID</TableHead>
                                                <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Department</TableHead>
                                            </TableRow></TableHeader>
                                            <TableBody>
                                                {logs.map((s: any) => (
                                                    <TableRow key={s.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                                                        <TableCell className="pl-6 font-medium text-white">{s.staffName}</TableCell>
                                                        <TableCell className="font-mono text-slate-400 text-xs">{s.staffId || 'N/A'}</TableCell>
                                                        <TableCell className="text-slate-300">{s.department}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : activeTab === 'enrolled' ? (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader className="bg-slate-900/80 border-b border-slate-800">
                                                <TableRow className="hover:bg-transparent border-none">
                                                <TableHead className="pl-6 text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Name</TableHead>
                                                <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Staff ID</TableHead>
                                                <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Department</TableHead>
                                                <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Auth Methods</TableHead>
                                            </TableRow></TableHeader>
                                            <TableBody>
                                                {logs.map((s: any) => (
                                                    <TableRow key={s.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                                                        <TableCell className="pl-6 font-medium text-white">{s.firstName} {s.lastName}</TableCell>
                                                        <TableCell className="font-mono text-slate-400 text-xs">{s.staffId || 'N/A'}</TableCell>
                                                        <TableCell className="text-slate-300">{s.department?.name || 'N/A'}</TableCell>
                                                        <TableCell>
                                                            <div className="flex gap-2">
                                                                {s.biometricTemplate && <Badge variant="outline" className="bg-blue-950/40 text-blue-400 border-blue-800/50 font-mono text-[10px]">FP</Badge>}
                                                                {s.kioskPin && <Badge variant="outline" className="bg-purple-950/40 text-purple-400 border-purple-800/50 font-mono text-[10px]">PIN</Badge>}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader className="bg-slate-900/80 border-b border-slate-800">
                                                <TableRow className="hover:bg-transparent border-none">
                                                <TableHead className="pl-6 text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Staff</TableHead>
                                                <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Department</TableHead>
                                                <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Time In</TableHead>
                                                <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Time Out</TableHead>
                                                <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Duration</TableHead>
                                                <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Status</TableHead>
                                                <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Source</TableHead>
                                            </TableRow></TableHeader>
                                            <TableBody>
                                                {logs.map((r: any) => (
                                                    <TableRow key={r.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                                                        <TableCell className="pl-6">
                                                            <div className="font-medium text-white">{r.staffName}</div>
                                                            <div className="text-[10px] text-slate-500 font-mono">{r.staffId || ''}</div>
                                                        </TableCell>
                                                        <TableCell className="text-slate-300">{r.department}</TableCell>
                                                        <TableCell className="font-mono text-sm text-slate-300">{r.timeIn || '-'}</TableCell>
                                                        <TableCell className="font-mono text-sm text-slate-300">{r.timeOut || '-'}</TableCell>
                                                        <TableCell className="text-slate-300 font-medium">{r.duration}</TableCell>
                                                        <TableCell>
                                                            {r.type === 1 ? (
                                                                <Badge variant="outline" className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${r.isLate ? 'bg-rose-950/40 text-rose-400 border-rose-800/50' : 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50'}`}>
                                                                    {r.isLate ? 'Late' : 'On Time'}
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="bg-amber-950/40 text-amber-400 border-amber-800/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">Clock Out</Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell><span className="text-xs text-slate-500 font-medium">{r.kioskName}</span></TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Punctuality Leaderboard */}
                    <motion.div variants={itemVariants}>
                        <Card className="bg-slate-900/50 border-slate-800 shadow-xl overflow-hidden h-full flex flex-col">
                            <CardHeader className="border-b border-slate-800/50 bg-slate-900/40 pb-5">
                                <CardTitle className="flex items-center gap-3 text-base text-white">
                                    <div className="p-2 bg-amber-500/10 rounded-lg">
                                       <Award className="h-5 w-5 text-amber-400" />
                                    </div>
                                    Punctuality Leaderboard
                                </CardTitle>
                                <CardDescription className="text-slate-400 mt-1 pl-12">This month's top performers</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0 flex-1">
                                {leaderboard.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                                        <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4">
                                           <Award className="h-8 w-8 text-slate-600" />
                                        </div>
                                        <p className="text-sm font-medium text-slate-400">No data this month yet.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-800/50">
                                        {leaderboard.slice(0, 10).map((entry, i) => (
                                            <div key={entry.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-800/20 transition-colors">
                                                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shadow-inner ${
                                                    i === 0 ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950 shadow-[0_0_10px_rgba(245,158,11,0.3)]' :
                                                    i === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-slate-900 shadow-[0_0_10px_rgba(148,163,184,0.3)]' :
                                                    i === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-500 text-orange-950 shadow-[0_0_10px_rgba(249,115,22,0.3)]' :
                                                    'bg-slate-800 text-slate-400 border border-slate-700'
                                                }`}>
                                                    {i + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-white truncate">{entry.name}</p>
                                                    <p className="text-[10px] uppercase tracking-wider text-slate-500 mt-0.5">{entry.department}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-sm font-bold font-mono ${entry.punctualityScore >= 90 ? 'text-emerald-400' : entry.punctualityScore >= 70 ? 'text-amber-400' : 'text-rose-400'}`}>
                                                        {entry.punctualityScore}%
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 font-medium">{entry.totalWorkingDays} days</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
}

function StatCard({ icon, iconColor, iconBg, label, value, sub }: { icon: React.ReactNode; iconColor: string; iconBg: string; label: string; value: any; sub: string }) {
    return (
        <motion.div variants={itemVariants}>
            <Card className="bg-slate-900/50 border-slate-800 shadow-xl overflow-hidden group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</CardTitle>
                    <div className={`p-2 rounded-lg ${iconBg} ${iconColor} group-hover:scale-110 transition-transform duration-300`}>
                        {icon}
                    </div>
                </CardHeader>
                <CardContent>
                    {value === null ? (
                        <div className="h-8 bg-slate-800 rounded animate-pulse w-1/2 mt-1" />
                    ) : (
                        <>
                            <div className="text-2xl font-bold text-white font-mono">{value}</div>
                            <p className="text-xs text-slate-500 mt-1 font-medium">{sub}</p>
                        </>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
