'use client';

import { useState, useEffect } from 'react';
import { getMyAttendanceLogs } from '@/actions/bas-actions';
import { useRole } from '@/context/role-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, TrendingUp, Award, Fingerprint } from 'lucide-react';
import { motion } from 'framer-motion';

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

export default function MyAttendancePage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [monthlyStats, setMonthlyStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const { user } = useRole();

    useEffect(() => {
        const fetchData = async () => {
            if (!user?.uid) { setLoading(false); return; }

            const result = await getMyAttendanceLogs(user.uid);
            if (result.success) {
                setLogs(result.data || []);
                setMonthlyStats(result.monthlyStats);
            }
            setLoading(false);
        };
        fetchData();
    }, [user?.uid]);

    return (
        <div className="min-h-screen bg-slate-950 pb-12 -mt-6 -mx-6">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-8 py-5 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-20 shadow-sm gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-blue-600/20 border border-blue-500/30 rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                        <Fingerprint className="text-blue-400 w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-tight">My Attendance</h1>
                        <p className="text-xs text-slate-400 font-medium">Your personal biometric attendance logs and monthly statistics.</p>
                    </div>
                </div>
            </div>

            <div className="px-8 py-8 max-w-[1400px] mx-auto space-y-8">
                {/* Monthly Stats */}
                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid gap-4 md:grid-cols-4"
                >
                    <StatCard 
                        icon={<CalendarDays className="h-4 w-4" />} 
                        iconColor="text-blue-400" 
                        iconBg="bg-blue-500/10"
                        title="Days Present" 
                        value={monthlyStats?.totalDays || 0} 
                        sub="This month" 
                        loading={loading} 
                    />
                    <StatCard 
                        icon={<Clock className="h-4 w-4" />} 
                        iconColor="text-emerald-400" 
                        iconBg="bg-emerald-500/10"
                        title="Total Hours" 
                        value={`${monthlyStats?.totalHours || 0}h`} 
                        sub={`Avg ${monthlyStats?.avgHoursPerDay || 0}h/day`} 
                        loading={loading} 
                    />
                    <StatCard 
                        icon={<Award className="h-4 w-4" />} 
                        iconColor="text-amber-400" 
                        iconBg="bg-amber-500/10"
                        title="Punctuality" 
                        value={`${monthlyStats?.punctuality || 0}%`} 
                        sub="On-time arrivals" 
                        valueColor={(monthlyStats?.punctuality || 0) >= 90 ? 'text-emerald-400' : (monthlyStats?.punctuality || 0) >= 70 ? 'text-amber-400' : 'text-rose-400'}
                        loading={loading} 
                    />
                    <StatCard 
                        icon={<TrendingUp className="h-4 w-4" />} 
                        iconColor="text-purple-400" 
                        iconBg="bg-purple-500/10"
                        title="Avg Hours/Day" 
                        value={`${monthlyStats?.avgHoursPerDay || 0}h`} 
                        sub="Working average" 
                        loading={loading} 
                    />
                </motion.div>

                {/* Attendance Table */}
                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    <motion.div variants={itemVariants}>
                        <Card className="bg-slate-900/50 border-slate-800 shadow-xl overflow-hidden">
                            <CardHeader className="border-b border-slate-800/50 bg-slate-900/40 pb-5">
                                <CardTitle className="text-lg font-bold text-white">Recent Attendance Logs</CardTitle>
                                <CardDescription className="text-slate-400 mt-1">Your last 50 biometric records.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                {loading ? (
                                    <div className="flex h-64 items-center justify-center">
                                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-r-transparent" />
                                    </div>
                                ) : logs.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                                        <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4">
                                            <Clock className="h-8 w-8 text-slate-600" />
                                        </div>
                                        <p className="text-sm font-medium text-slate-400">No attendance records found.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader className="bg-slate-900/80 border-b border-slate-800">
                                                <TableRow className="hover:bg-transparent border-none">
                                                    <TableHead className="pl-6 text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Date</TableHead>
                                                    <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Time In</TableHead>
                                                    <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Time Out</TableHead>
                                                    <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Duration</TableHead>
                                                    <TableHead className="pr-6 text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {logs.map((log) => (
                                                    <TableRow key={log.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                                                        <TableCell className="pl-6 font-medium text-white">{log.date}</TableCell>
                                                        <TableCell className="font-mono text-sm text-slate-300">{log.timeIn || '-'}</TableCell>
                                                        <TableCell className="font-mono text-sm text-slate-300">{log.timeOut || '-'}</TableCell>
                                                        <TableCell className="text-slate-300 font-medium">{log.duration}</TableCell>
                                                        <TableCell className="pr-6">
                                                            {log.type === 1 ? (
                                                                <Badge variant="outline" className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${log.isLate ? 'bg-rose-950/40 text-rose-400 border-rose-800/50' : 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50'}`}>
                                                                    {log.isLate ? 'Late' : 'On Time'}
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="bg-amber-950/40 text-amber-400 border-amber-800/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">Clock Out</Badge>
                                                            )}
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
            </div>
        </div>
    );
}

function StatCard({ icon, iconColor, iconBg, title, value, sub, loading, valueColor = "text-white" }: any) {
    return (
        <motion.div variants={itemVariants}>
            <Card className="bg-slate-900/50 border-slate-800 shadow-xl overflow-hidden group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</CardTitle>
                    <div className={`p-2 rounded-lg ${iconBg} ${iconColor} group-hover:scale-110 transition-transform duration-300`}>
                        {icon}
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="h-8 bg-slate-800 rounded animate-pulse w-1/2 mt-1" />
                    ) : (
                        <>
                            <div className={`text-2xl font-bold font-mono ${valueColor}`}>{value}</div>
                            <p className="text-xs text-slate-500 mt-1 font-medium">{sub}</p>
                        </>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
