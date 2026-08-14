'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, GraduationCap, DollarSign, BookOpen, TrendingUp, TrendingDown, Activity, ArrowUpRight, BarChart3, Clock, PlusCircle, Settings, FileText } from 'lucide-react';
import Link from 'next/link';
import { getAdminDashboardStats } from '@/actions/academic-actions';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

type DashboardStats = {
    totalStudents: number;
    totalStaff: number;
    totalRevenue: number;
    pendingPayments: number;
    activeClasses: number;
    recentActivities: Array<{ title: string; time: string; type: string }>;
    revenueData: Array<{ name: string; total: number }>;
    attendanceData: Array<{ name: string; present: number; absent: number }>;
};

export function NewAdminDashboard() {
    const [stats, setStats] = useState<DashboardStats>({
        totalStudents: 0,
        totalStaff: 0,
        totalRevenue: 0,
        pendingPayments: 0,
        activeClasses: 0,
        recentActivities: [],
        revenueData: [],
        attendanceData: []
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchDashboardStats();
    }, []);

    const fetchDashboardStats = async () => {
        try {
            const result = await getAdminDashboardStats();
            if (result.success && result.data) {
                setStats({
                    totalStudents: (result.data as any).totalStudents || 0,
                    totalStaff: (result.data as any).totalStaff || 0,
                    totalRevenue: (result.data as any).totalRevenue || 0,
                    pendingPayments: (result.data as any).pendingPayments || 0,
                    activeClasses: (result.data as any).activeClasses || 0,
                    recentActivities: (result.data as any).recentActivities || [
                        { title: 'System initialized successfully', time: 'Just now', type: 'system' },
                    ],
                    revenueData: (result.data as any).revenueData || [],
                    attendanceData: (result.data as any).attendanceData || []
                });
            }
        } catch (error) {
            console.error('Error fetching admin dashboard stats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const statCards = [
        {
            title: 'Total Students',
            value: stats.totalStudents,
            icon: Users,
            trend: '+12%',
            trendUp: true,
            gradient: 'from-blue-500/20 to-blue-600/5',
            iconColor: 'text-blue-600'
        },
        {
            title: 'Total Staff',
            value: stats.totalStaff,
            icon: GraduationCap,
            trend: '+3%',
            trendUp: true,
            gradient: 'from-indigo-500/20 to-indigo-600/5',
            iconColor: 'text-indigo-600'
        },
        {
            title: 'Term Revenue',
            value: `₦${stats.totalRevenue.toLocaleString()}`,
            icon: DollarSign,
            trend: '+8%',
            trendUp: true,
            gradient: 'from-emerald-500/20 to-emerald-600/5',
            iconColor: 'text-emerald-600'
        },
        {
            title: 'Pending Invoices',
            value: stats.pendingPayments,
            icon: Activity,
            trend: '-5%',
            trendUp: false,
            gradient: 'from-rose-500/20 to-rose-600/5',
            iconColor: 'text-rose-600'
        }
    ];

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="h-10 w-48 bg-muted rounded animate-pulse"></div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map(i => (
                        <Card key={i} className="animate-pulse h-32"></Card>
                    ))}
                </div>
                <div className="grid gap-6 md:grid-cols-7">
                    <div className="col-span-4 h-[400px] bg-muted rounded-xl animate-pulse"></div>
                    <div className="col-span-3 h-[400px] bg-muted rounded-xl animate-pulse"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome back, Admin 👋</h1>
                    <p className="text-muted-foreground mt-1">Here is the latest snapshot of your institution's performance.</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <span className="text-sm font-medium text-muted-foreground">System Live</span>
                </div>
            </div>

            {/* Premium Stat Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map((card, index) => (
                    <motion.div 
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Card className={`relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-border/50 bg-card/80 backdrop-blur-sm`}>
                            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-50 group-hover:opacity-100 transition-opacity duration-500`}></div>
                            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    {card.title}
                                </CardTitle>
                                <div className={`p-2 rounded-xl bg-background shadow-sm border border-border/50`}>
                                    <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                                </div>
                            </CardHeader>
                            <CardContent className="relative z-10">
                                <div className="text-3xl font-bold tracking-tight mb-2">{card.value}</div>
                                <div className="flex items-center text-xs font-medium">
                                    <span className={`flex items-center px-1.5 py-0.5 rounded-md ${card.trendUp ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'}`}>
                                        {card.trendUp ? (
                                            <TrendingUp className="h-3 w-3 mr-1" />
                                        ) : (
                                            <TrendingDown className="h-3 w-3 mr-1" />
                                        )}
                                        {card.trend}
                                    </span>
                                    <span className="text-muted-foreground ml-2">vs last month</span>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-4">
                <Link href="/dashboard/students/admissions">
                    <Button variant="outline" className="w-full h-16 flex flex-col items-center justify-center gap-1 border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors">
                        <PlusCircle className="h-5 w-5" />
                        <span className="font-semibold text-xs">Admit Student</span>
                    </Button>
                </Link>
                <Link href="/dashboard/users">
                    <Button variant="outline" className="w-full h-16 flex flex-col items-center justify-center gap-1 border-indigo-500/20 hover:bg-indigo-500/5 hover:text-indigo-600 transition-colors">
                        <Users className="h-5 w-5" />
                        <span className="font-semibold text-xs">Manage Staff</span>
                    </Button>
                </Link>
                <Link href="/dashboard/invoices">
                    <Button variant="outline" className="w-full h-16 flex flex-col items-center justify-center gap-1 border-emerald-500/20 hover:bg-emerald-500/5 hover:text-emerald-600 transition-colors">
                        <DollarSign className="h-5 w-5" />
                        <span className="font-semibold text-xs">Collect Fees</span>
                    </Button>
                </Link>
                <Link href="/dashboard/system">
                    <Button variant="outline" className="w-full h-16 flex flex-col items-center justify-center gap-1 border-slate-500/20 hover:bg-slate-500/5 hover:text-slate-600 transition-colors">
                        <Settings className="h-5 w-5" />
                        <span className="font-semibold text-xs">System Settings</span>
                    </Button>
                </Link>
            </div>

            {/* Charts Section */}
            <div className="grid gap-6 md:grid-cols-7">
                {/* Revenue Overview */}
                <Card className="col-span-7 md:col-span-4 standard-card border-none">
                    <CardHeader className="pb-0">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-primary" />
                                    Revenue Growth
                                </CardTitle>
                                <CardDescription>Financial performance over the last 6 months</CardDescription>
                            </div>
                            <div className="text-sm font-semibold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full flex items-center gap-1">
                                <ArrowUpRight className="w-4 h-4" /> +15.2%
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="h-[300px] w-full">                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(value) => `₦${(value / 1000000).toFixed(1)}M`} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: number) => [`₦${value.toLocaleString()}`, 'Revenue']}
                                />
                                <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Attendance Chart & Activity */}
            <div className="col-span-7 md:col-span-3 space-y-6">
                <Card className="shadow-sm border-slate-200/60 lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Attendance Trends</CardTitle>
                        <CardDescription>Daily staff and student attendance</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.attendanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        cursor={{ fill: '#f8fafc' }}
                                    />
                                    <Bar dataKey="present" name="Present" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                    <Bar dataKey="absent" name="Absent" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                    <Card className="standard-card border-none">
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-indigo-500" />
                                    Recent Activity
                                </CardTitle>
                            </div>
                            <Button variant="ghost" size="sm" className="text-primary h-8">View All</Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {stats.recentActivities.length > 0 ? stats.recentActivities.map((activity, i) => (
                                    <motion.div 
                                        key={i} 
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="p-2 rounded-full bg-indigo-100 dark:bg-indigo-900/50 shrink-0">
                                            <Activity className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{activity.title}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
                                        </div>
                                    </motion.div>
                                )) : (
                                    <div className="text-center py-6 text-muted-foreground text-sm">
                                        No recent activities logged today.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
