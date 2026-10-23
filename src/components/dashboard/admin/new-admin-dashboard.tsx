'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, GraduationCap, Wallet, BookOpen, TrendingUp, TrendingDown, Activity, ArrowUpRight, BarChart3, Clock, PlusCircle, Settings, FileText, School, Library, Award } from 'lucide-react';
import Link from 'next/link';
import { getAdminDashboardStats } from '@/actions/academic-actions';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useSession } from 'next-auth/react';
import { useRole } from '@/context/role-context';
import { Badge } from '@/components/ui/badge';

type DashboardStats = {
    totalStudents: number;
    totalStaff: number;
    totalRevenue: number;
    pendingPayments: number;
    activeClasses: number;
    totalPrograms?: number;
    totalCourses?: number;
    totalBooks?: number;
    totalApplicants?: number;
    recentActivities: Array<{ title: string; time: string; type: string }>;
    revenueData: Array<{ name: string; total: number }>;
    attendanceData: Array<{ name: string; present: number; absent: number }>;
};

export function NewAdminDashboard() {
    const { data: session } = useSession();
    const { role: contextRole, activeModules } = useRole();

    const role = String((session?.user as any)?.role || contextRole || 'ADMIN').toUpperCase();
    const hasTertiary = activeModules?.includes('TERTIARY_INSTITUTION');
    const hasSecondary = activeModules?.includes('SECONDARY_SCHOOL');
    const hasFinance = activeModules?.includes('FINANCE');
    const hasHr = activeModules?.includes('HR');
    const hasBas = activeModules?.includes('BAS_BIOMETRICS');
    const hasElibrary = activeModules?.includes('E_LIBRARY');

    const roleLabels: Record<string, string> = {
        SUPER_ADMIN: 'Super Administrator',
        ADMIN: 'Administrator',
        SLT: 'Senior Leadership Team',
        ACCOUNTANT: 'Finance Officer',
        HOD: 'Head of Department',
        EXAM_OFFICER: 'Examination Officer',
        TEACHER: 'Educator',
        PARENT: 'Parent',
        STUDENT: 'Student',
    };

    const roleSubtitles: Record<string, string> = {
        SUPER_ADMIN: 'Comprehensive platform overview, institutional metrics, and global oversight.',
        ADMIN: "Here is the latest snapshot of your institution's performance.",
        SLT: 'Strategic institutional indicators, academic milestones, and operational health.',
        ACCOUNTANT: 'Current revenue tracking, tuition collection, and general ledger accounts.',
        HOD: 'Departmental curriculum progress, teacher lesson submissions, and subject analytics.',
        EXAM_OFFICER: 'Assessment moderation pipeline, question paper approvals, and gradebook status.',
        TEACHER: 'Class schedules, active student rosters, lesson plans, and score submissions.',
        PARENT: 'Academic reports, attendance records, and outstanding fee invoices.',
        STUDENT: 'Enrolled courses, upcoming assessments, timetable, and study materials.',
    };

    const userName = session?.user?.name?.trim();
    const greetingTarget = userName || roleLabels[role] || 'Administrator';
    const greeting = `Welcome back, ${greetingTarget}`;
    const subtitle = roleSubtitles[role] || "Here is the latest snapshot of your institution's performance.";

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
                    totalPrograms: (result.data as any).totalPrograms || 0,
                    totalCourses: (result.data as any).totalCourses || 0,
                    totalBooks: (result.data as any).totalBooks || 0,
                    totalApplicants: (result.data as any).totalApplicants || 0,
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
            title: hasTertiary && !hasSecondary ? 'Enrolled Undergrads' : 'Total Students',
            value: stats.totalStudents,
            icon: Users,
            trend: '+12%',
            trendUp: true,
            gradient: 'from-blue-500/20 to-blue-600/5',
            iconColor: 'text-blue-600'
        },
        {
            title: hasTertiary ? 'Faculty & Staff' : 'Total Staff',
            value: stats.totalStaff,
            icon: GraduationCap,
            trend: '+3%',
            trendUp: true,
            gradient: 'from-indigo-500/20 to-indigo-600/5',
            iconColor: 'text-indigo-600'
        },
        ...(hasFinance ? [
            {
                title: 'YTD Revenue',
                value: `₦${stats.totalRevenue.toLocaleString()}`,
                icon: Wallet,
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
        ] : [
            ...(hasTertiary ? [
                {
                    title: 'Degree Programs',
                    value: stats.totalPrograms || stats.activeClasses,
                    icon: School,
                    trend: 'Accredited',
                    trendUp: true,
                    gradient: 'from-emerald-500/20 to-emerald-600/5',
                    iconColor: 'text-emerald-600'
                },
                {
                    title: hasElibrary ? 'Digital Library' : 'Post-UTME Applicants',
                    value: hasElibrary ? (stats.totalBooks || 0) : (stats.totalApplicants || 0),
                    icon: hasElibrary ? Library : Award,
                    trend: hasElibrary ? 'Catalog' : 'Screening',
                    trendUp: true,
                    gradient: 'from-violet-500/20 to-violet-600/5',
                    iconColor: 'text-violet-600'
                }
            ] : [
                {
                    title: 'Active Classes',
                    value: stats.activeClasses,
                    icon: School,
                    trend: 'In Session',
                    trendUp: true,
                    gradient: 'from-emerald-500/20 to-emerald-600/5',
                    iconColor: 'text-emerald-600'
                },
                {
                    title: 'Academic Health',
                    value: '98%',
                    icon: Activity,
                    trend: 'Optimal',
                    trendUp: true,
                    gradient: 'from-violet-500/20 to-violet-600/5',
                    iconColor: 'text-violet-600'
                }
            ])
        ])
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
        <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-foreground">{greeting}</h1>
                        <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 border-primary/20 text-primary bg-primary/5">
                            {roleLabels[role] || role}
                        </Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">{subtitle}</p>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-muted-foreground self-end sm:self-auto">
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span>System Live</span>
                </div>
            </div>

            {/* Premium Stat Cards - 2 cols on mobile, 4 on desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                {statCards.map((card, index) => (
                    <motion.div 
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Card className={`relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-border/50 bg-card/80 backdrop-blur-sm rounded-2xl`}>
                            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-50 group-hover:opacity-100 transition-opacity duration-500`}></div>
                            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-5 relative z-10">
                                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground line-clamp-1">
                                    {card.title}
                                </CardTitle>
                                <div className={`p-1.5 sm:p-2 rounded-xl bg-background shadow-sm border border-border/50 shrink-0`}>
                                    <card.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${card.iconColor}`} />
                                </div>
                            </CardHeader>
                            <CardContent className="p-3 sm:p-5 pt-0 relative z-10">
                                <div className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight mb-1 sm:mb-2 truncate">{card.value}</div>
                                <div className="flex items-center text-[10px] sm:text-xs font-medium flex-wrap gap-1">
                                    <span className={`flex items-center px-1.5 py-0.5 rounded-md shrink-0 ${card.trendUp ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'}`}>
                                        {card.trendUp ? (
                                            <TrendingUp className="h-3 w-3 mr-0.5 sm:mr-1" />
                                        ) : (
                                            <TrendingDown className="h-3 w-3 mr-0.5 sm:mr-1" />
                                        )}
                                        {card.trend}
                                    </span>
                                    <span className="hidden sm:inline text-muted-foreground ml-1">vs last mo</span>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Quick Actions - Responsive grid adapted to active institutional domains */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
                <Link href={hasTertiary && !hasSecondary ? "/dashboard/tertiary/admissions" : "/dashboard/students/admissions"}>
                    <Button variant="outline" className="w-full h-14 sm:h-16 flex flex-col items-center justify-center gap-1 border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors rounded-xl">
                        <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="font-semibold text-[11px] sm:text-xs">
                            {hasTertiary && !hasSecondary ? "Post-UTME Admissions" : "Admit Student"}
                        </span>
                    </Button>
                </Link>
                <Link href={hasHr ? "/dashboard/hr" : "/dashboard/users"}>
                    <Button variant="outline" className="w-full h-14 sm:h-16 flex flex-col items-center justify-center gap-1 border-indigo-500/20 hover:bg-indigo-500/5 hover:text-indigo-600 transition-colors rounded-xl">
                        <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="font-semibold text-[11px] sm:text-xs">
                            {hasHr ? "HR & Personnel" : "Staff Directory"}
                        </span>
                    </Button>
                </Link>
                {hasFinance ? (
                    <Link href="/dashboard/finance/invoices">
                        <Button variant="outline" className="w-full h-14 sm:h-16 flex flex-col items-center justify-center gap-1 border-emerald-500/20 hover:bg-emerald-500/5 hover:text-emerald-600 transition-colors rounded-xl">
                            <Wallet className="h-4 w-4 sm:h-5 sm:w-5" />
                            <span className="font-semibold text-[11px] sm:text-xs">Collect Fees</span>
                        </Button>
                    </Link>
                ) : hasTertiary ? (
                    <Link href="/dashboard/tertiary/programs">
                        <Button variant="outline" className="w-full h-14 sm:h-16 flex flex-col items-center justify-center gap-1 border-emerald-500/20 hover:bg-emerald-500/5 hover:text-emerald-600 transition-colors rounded-xl">
                            <School className="h-4 w-4 sm:h-5 sm:w-5" />
                            <span className="font-semibold text-[11px] sm:text-xs">Degree Programs</span>
                        </Button>
                    </Link>
                ) : (
                    <Link href="/dashboard/academic">
                        <Button variant="outline" className="w-full h-14 sm:h-16 flex flex-col items-center justify-center gap-1 border-emerald-500/20 hover:bg-emerald-500/5 hover:text-emerald-600 transition-colors rounded-xl">
                            <School className="h-4 w-4 sm:h-5 sm:w-5" />
                            <span className="font-semibold text-[11px] sm:text-xs">Academic Setup</span>
                        </Button>
                    </Link>
                )}
                <Link href="/dashboard/system/modules">
                    <Button variant="outline" className="w-full h-14 sm:h-16 flex flex-col items-center justify-center gap-1 border-slate-500/20 hover:bg-muted/50 hover:text-slate-600 transition-colors rounded-xl">
                        <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="font-semibold text-[11px] sm:text-xs">System Modules</span>
                    </Button>
                </Link>
            </div>

            {/* Charts Section */}
            <div className="grid gap-6 md:grid-cols-7">
                {/* Revenue Overview - Only rendered when FINANCE module is active */}
                {hasFinance && (
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
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
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
                )}

                {/* Attendance Chart - Expands to 4 cols if finance disabled, otherwise 3 cols */}
                <Card className={`standard-card border-none ${hasFinance ? 'col-span-7 md:col-span-3' : 'col-span-7 md:col-span-4'}`}>
                    <CardHeader>
                        <CardTitle className="text-lg font-bold">Attendance Trends</CardTitle>
                        <CardDescription>Daily staff and student attendance records</CardDescription>
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

                {/* Recent Activity - Full-width or col-span-3 depending on finance */}
                <Card className={`standard-card border-none ${hasFinance ? 'col-span-7' : 'col-span-7 md:col-span-3'}`}>
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
    );
}
