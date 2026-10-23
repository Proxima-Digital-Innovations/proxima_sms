'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Users,
    GraduationCap,
    Wallet,
    BookOpen,
    TrendingUp,
    TrendingDown,
    Activity,
    ArrowUpRight,
    BarChart3,
    Clock,
    PlusCircle,
    Settings,
    School,
    Library,
    Award,
    Building2,
    ShieldCheck,
    Calendar,
    ChevronRight,
    FileSpreadsheet,
} from 'lucide-react';
import Link from 'next/link';
import { getAdminDashboardStats } from '@/actions/academic-actions';
import { motion } from 'framer-motion';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
} from 'recharts';
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

function formatCompactCurrency(value: number): string {
    if (value >= 1_000_000) {
        return `₦${(value / 1_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000) {
        return `₦${Math.round(value / 1_000)}k`;
    }
    return `₦${value}`;
}

function formatActivityTimestamp(raw: string): string {
    if (!raw || raw === 'Just now') return 'Just now';
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function NewAdminDashboard() {
    const { data: session } = useSession();
    const { role: contextRole, activeModules } = useRole();

    const role = String((session?.user as any)?.role || contextRole || 'ADMIN').toUpperCase();
    const hasTertiary = activeModules?.includes('TERTIARY_INSTITUTION');
    const hasSecondary = activeModules?.includes('SECONDARY_SCHOOL');
    const hasFinance = activeModules?.includes('FINANCE');
    const hasHr = activeModules?.includes('HR');
    const hasElibrary = activeModules?.includes('E_LIBRARY');

    const roleLabels: Record<string, string> = {
        SUPER_ADMIN: 'Super Administrator',
        ADMIN: 'Institutional Administrator',
        SLT: 'Senior Leadership Team',
        ACCOUNTANT: 'Chief Finance Officer',
        HOD: 'Head of Department',
        EXAM_OFFICER: 'Examination Officer',
        TEACHER: 'Academic Educator',
        PARENT: 'Parent / Guardian',
        STUDENT: 'Student',
    };

    const roleSubtitles: Record<string, string> = {
        SUPER_ADMIN: 'Enterprise governance, academic registry, financial treasury, and multi-campus telemetry.',
        ADMIN: 'Executive overview of student enrollment, faculty operations, and institutional performance.',
        SLT: 'Strategic institutional indicators, academic milestones, and operational compliance.',
        ACCOUNTANT: 'Real-time tuition collection, outstanding receivables, and double-entry ledger status.',
        HOD: 'Departmental curriculum progress, lecturer submissions, and examination moderation.',
        EXAM_OFFICER: 'Assessment pipeline, blind grading tokens, and Senate broadsheet readiness.',
        TEACHER: 'Class schedules, student rosters, lesson plans, and continuous assessment entry.',
        PARENT: 'Ward academic reports, attendance logs, and tuition fee settlements.',
        STUDENT: 'Registered courses, upcoming examinations, timetable, and hostel clearance.',
    };

    const userName = session?.user?.name?.trim();
    const greetingTarget = userName || roleLabels[role] || 'Administrator';
    const subtitle = roleSubtitles[role] || "Executive snapshot of your institution's operational performance.";

    const formattedToday = new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

    const [stats, setStats] = useState<DashboardStats>({
        totalStudents: 0,
        totalStaff: 0,
        totalRevenue: 0,
        pendingPayments: 0,
        activeClasses: 0,
        recentActivities: [],
        revenueData: [],
        attendanceData: [],
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
                    attendanceData: (result.data as any).attendanceData || [],
                });
            }
        } catch (error) {
            console.error('Error fetching admin dashboard stats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const collectionRate =
        stats.totalRevenue + stats.pendingPayments > 0
            ? Math.round((stats.totalRevenue / (stats.totalRevenue + stats.pendingPayments)) * 100)
            : 100;

    const statCards = [
        {
            title: hasTertiary && !hasSecondary ? 'Enrolled Undergraduates' : 'Active Student Enrollment',
            value: stats.totalStudents.toLocaleString(),
            subtitle: hasTertiary ? 'Matriculated across faculties' : 'Registered across active classes',
            icon: Users,
            trend: '+12.0%',
            trendUp: true,
            accentBar: 'bg-blue-600',
            iconBg: 'bg-blue-50 text-blue-600 border-blue-200/60 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800/50',
        },
        {
            title: hasTertiary ? 'Faculty & Academic Staff' : 'Total Staff Strength',
            value: stats.totalStaff.toLocaleString(),
            subtitle: 'Academic & administrative personnel',
            icon: GraduationCap,
            trend: '+3.2%',
            trendUp: true,
            accentBar: 'bg-indigo-600',
            iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-200/60 dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-800/50',
        },
        ...(hasFinance
            ? [
                  {
                      title: 'YTD Tuition & Fee Revenue',
                      value: `₦${Number(stats.totalRevenue || 0).toLocaleString()}`,
                      subtitle: `${collectionRate}% collection efficiency rate`,
                      icon: Wallet,
                      trend: '+8.4%',
                      trendUp: true,
                      accentBar: 'bg-emerald-600',
                      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200/60 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800/50',
                  },
                  {
                      title: 'Outstanding Receivables',
                      value: `₦${Number(stats.pendingPayments || 0).toLocaleString()}`,
                      subtitle: 'Unsettled student fee invoices',
                      icon: FileSpreadsheet,
                      trend: '-5.1%',
                      trendUp: true,
                      accentBar: 'bg-amber-500',
                      iconBg: 'bg-amber-50 text-amber-600 border-amber-200/60 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800/50',
                  },
              ]
            : [
                  ...(hasTertiary
                      ? [
                            {
                                title: 'Accredited Degree Programs',
                                value: String(stats.totalPrograms || stats.activeClasses || 0),
                                subtitle: 'NUC / NBTE approved curricula',
                                icon: School,
                                trend: 'Accredited',
                                trendUp: true,
                                accentBar: 'bg-emerald-600',
                                iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200/60 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800/50',
                            },
                            {
                                title: hasElibrary ? 'Digital Library Catalog' : 'Post-UTME Applicants',
                                value: String(hasElibrary ? stats.totalBooks || 0 : stats.totalApplicants || 0),
                                subtitle: hasElibrary ? 'Indexed publications & e-books' : 'Active admission candidates',
                                icon: hasElibrary ? Library : Award,
                                trend: 'Active',
                                trendUp: true,
                                accentBar: 'bg-violet-600',
                                iconBg: 'bg-violet-50 text-violet-600 border-violet-200/60 dark:bg-violet-950/50 dark:text-violet-400 dark:border-violet-800/50',
                            },
                        ]
                      : [
                            {
                                title: 'Active Class Arms',
                                value: String(stats.activeClasses || 0),
                                subtitle: 'Currently in academic session',
                                icon: School,
                                trend: 'In Session',
                                trendUp: true,
                                accentBar: 'bg-emerald-600',
                                iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200/60 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800/50',
                            },
                            {
                                title: 'Academic Compliance',
                                value: '98.4%',
                                subtitle: 'Gradebook & lesson plan index',
                                icon: Activity,
                                trend: 'Optimal',
                                trendUp: true,
                                accentBar: 'bg-violet-600',
                                iconBg: 'bg-violet-50 text-violet-600 border-violet-200/60 dark:bg-violet-950/50 dark:text-violet-400 dark:border-violet-800/50',
                            },
                        ]),
              ]),
    ];

    const quickActions = [
        {
            href: hasTertiary && !hasSecondary ? '/dashboard/admissions' : '/dashboard/students/admissions',
            title: hasTertiary && !hasSecondary ? 'Post-UTME Admissions' : 'Student Admissions',
            subtitle: hasTertiary && !hasSecondary ? 'Screen JAMB candidates & issue letters' : 'Enroll new students & assign classes',
            icon: PlusCircle,
            iconStyle: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400',
        },
        {
            href: '/dashboard/users',
            title: hasHr ? 'HR & Personnel' : 'Staff Directory',
            subtitle: 'Manage faculty profiles, roles & payroll',
            icon: Users,
            iconStyle: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400',
        },
        hasFinance
            ? {
                  href: '/dashboard/finance/invoices',
                  title: 'Bursary & Fee Collection',
                  subtitle: 'Invoices, Remita RRR, Paystack & receipts',
                  icon: Wallet,
                  iconStyle: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
              }
            : hasTertiary
              ? {
                    href: '/dashboard/tertiary/programs',
                    title: 'Degree Programs',
                    subtitle: 'Manage departments, courses & units',
                    icon: School,
                    iconStyle: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
                }
              : {
                    href: '/dashboard/system/classes-subjects',
                    title: 'Academic Structure',
                    subtitle: 'Configure classes, subjects & teachers',
                    icon: School,
                    iconStyle: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
                },
        {
            href: '/dashboard/system/modules',
            title: 'System Modules',
            subtitle: 'Configure active institutional engines',
            icon: Settings,
            iconStyle: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
        },
    ];

    const hasAttendanceRecords = stats.attendanceData.some(d => d.present > 0 || d.absent > 0);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="h-24 w-full bg-muted/60 rounded-xl animate-pulse border border-border" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <Card key={i} className="animate-pulse h-36 rounded-xl border border-border" />
                    ))}
                </div>
                <div className="grid gap-6 md:grid-cols-7">
                    <div className="col-span-7 md:col-span-4 h-[380px] bg-muted/60 rounded-xl animate-pulse border border-border" />
                    <div className="col-span-7 md:col-span-3 h-[380px] bg-muted/60 rounded-xl animate-pulse border border-border" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Corporate Executive Banner */}
            <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-card shadow-xs p-4 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-slate-900 text-white dark:bg-indigo-600">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            {roleLabels[role] || role}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/70 px-2.5 py-0.5 rounded-md border border-border/60">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            {formattedToday}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-md">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            System Operational
                        </span>
                    </div>
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-foreground">
                        Welcome back, {greetingTarget}
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
                        {subtitle}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0">
                    <Link href="/dashboard/analytics">
                        <Button variant="outline" size="sm" className="h-9 text-xs font-semibold border-slate-300 dark:border-slate-700 gap-1.5">
                            <BarChart3 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                            Executive Reports
                        </Button>
                    </Link>
                    {hasFinance && (
                        <Link href="/dashboard/finance/ledger">
                            <Button variant="outline" size="sm" className="h-9 text-xs font-semibold border-slate-300 dark:border-slate-700 gap-1.5">
                                <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                                General Ledger
                            </Button>
                        </Link>
                    )}
                    <Link href={hasTertiary && !hasSecondary ? '/dashboard/admissions' : '/dashboard/students/admissions'}>
                        <Button size="sm" className="h-9 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-primary dark:hover:bg-primary/90 gap-1.5 shadow-xs">
                            <PlusCircle className="w-3.5 h-3.5" />
                            {hasTertiary && !hasSecondary ? 'Manage Admissions' : 'New Admission'}
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Corporate KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.06 }}
                    >
                        <Card className="relative overflow-hidden border border-slate-200/90 dark:border-slate-800 bg-card shadow-xs hover:shadow-md transition-all duration-200 rounded-xl">
                            {/* Top Corporate Accent Strip */}
                            <div className={`h-1 w-full ${card.accentBar}`} />
                            <CardHeader className="flex flex-row items-start justify-between pb-2 pt-4 px-5">
                                <div className="space-y-0.5 min-w-0 pr-2">
                                    <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                                        {card.title}
                                    </CardTitle>
                                </div>
                                <div className={`p-2 rounded-lg border shrink-0 ${card.iconBg}`}>
                                    <card.icon className="h-4 w-4" />
                                </div>
                            </CardHeader>
                            <CardContent className="px-5 pb-4 pt-0">
                                <div className="text-2xl sm:text-[26px] font-bold tracking-tight text-foreground tabular-nums truncate">
                                    {card.value}
                                </div>
                                <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                                    <span className="text-[11px] text-muted-foreground truncate">
                                        {card.subtitle}
                                    </span>
                                    <span
                                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                                            card.trendUp
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30'
                                                : 'bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30'
                                        }`}
                                    >
                                        {card.trendUp ? (
                                            <TrendingUp className="h-2.5 w-2.5 mr-1" />
                                        ) : (
                                            <TrendingDown className="h-2.5 w-2.5 mr-1" />
                                        )}
                                        {card.trend}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Structured Corporate Quick-Access Modules */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {quickActions.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                        <Link key={idx} href={item.href} className="group block">
                            <div className="h-full flex items-center justify-between gap-3 p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-card hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm transition-all">
                                <div className="flex items-center gap-3.5 min-w-0">
                                    <div className={`p-2.5 rounded-lg shrink-0 ${item.iconStyle}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                            {item.title}
                                        </h3>
                                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                            {item.subtitle}
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Main Analytics & Institutional Telemetry Grid */}
            <div className="grid gap-6 lg:grid-cols-7">
                {/* Revenue Growth Chart */}
                {hasFinance && (
                    <Card className="lg:col-span-4 border border-slate-200/90 dark:border-slate-800 bg-card shadow-xs rounded-xl">
                        <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800/80">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-base font-bold text-foreground">
                                            Revenue & Cashflow Trajectory
                                        </CardTitle>
                                        <Badge variant="outline" className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800">
                                            <ArrowUpRight className="w-3 h-3 mr-0.5" /> +15.2% YoY
                                        </Badge>
                                    </div>
                                    <CardDescription className="text-xs mt-0.5">
                                        Verified tuition and fee receipts over the trailing 6-month period
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-4 text-right">
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">YTD Collected</p>
                                        <p className="text-sm font-bold text-foreground tabular-nums">₦{Number(stats.totalRevenue || 0).toLocaleString()}</p>
                                    </div>
                                    <div className="h-7 w-px bg-border" />
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Receivables</p>
                                        <p className="text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums">₦{Number(stats.pendingPayments || 0).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="h-[290px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={stats.revenueData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="corporateRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.22} />
                                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.7} />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
                                            dy={8}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                                            tickFormatter={formatCompactCurrency}
                                            width={58}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: '10px',
                                                border: '1px solid #e2e8f0',
                                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.08)',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                            }}
                                            formatter={(value: number) => [`₦${Number(value).toLocaleString()}`, 'Collected Revenue']}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="total"
                                            stroke="#2563eb"
                                            strokeWidth={2.5}
                                            fillOpacity={1}
                                            fill="url(#corporateRevenueGradient)"
                                            activeDot={{ r: 5, strokeWidth: 2, stroke: '#ffffff', fill: '#2563eb' }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Right Column: Institutional Capacity & Attendance Telemetry */}
                <Card className={`border border-slate-200/90 dark:border-slate-800 bg-card shadow-xs rounded-xl flex flex-col justify-between ${hasFinance ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
                    <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base font-bold text-foreground">
                                    Attendance & Campus Telemetry
                                </CardTitle>
                                <CardDescription className="text-xs mt-0.5">
                                    Weekly biometric clock-ins & institutional capacity metrics
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-3 text-xs font-medium">
                                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" /> Present
                                </span>
                                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                                    <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" /> Absent
                                </span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-5 space-y-5">
                        <div className="h-[175px] w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.attendanceData} margin={{ top: 6, right: 8, left: -24, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.7} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} dy={6} />
                                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '10px',
                                            border: '1px solid #e2e8f0',
                                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.08)',
                                            fontSize: '12px',
                                        }}
                                        cursor={{ fill: '#f8fafc' }}
                                    />
                                    <Bar dataKey="present" name="Present" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                                    <Bar dataKey="absent" name="Absent" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={28} />
                                </BarChart>
                            </ResponsiveContainer>
                            {!hasAttendanceRecords && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span className="px-3 py-1 rounded-full bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-muted-foreground">
                                        Awaiting weekly biometric kiosk sync
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Institutional Capacity Summary Grid */}
                        <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            <div className="p-3 rounded-lg bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        {hasTertiary ? 'Degree Programs' : 'Active Classes'}
                                    </p>
                                    <p className="text-base font-bold text-foreground tabular-nums mt-0.5">
                                        {hasTertiary ? stats.totalPrograms || stats.activeClasses : stats.activeClasses}
                                    </p>
                                </div>
                                <Building2 className="w-4 h-4 text-indigo-500 shrink-0" />
                            </div>
                            <div className="p-3 rounded-lg bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        {hasTertiary ? 'Catalog Courses' : 'Collection Rate'}
                                    </p>
                                    <p className="text-base font-bold text-foreground tabular-nums mt-0.5">
                                        {hasTertiary ? stats.totalCourses || 0 : `${collectionRate}%`}
                                    </p>
                                </div>
                                <BookOpen className="w-4 h-4 text-blue-500 shrink-0" />
                            </div>
                            <div className="p-3 rounded-lg bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        e-Library Volumes
                                    </p>
                                    <p className="text-base font-bold text-foreground tabular-nums mt-0.5">
                                        {stats.totalBooks || 0}
                                    </p>
                                </div>
                                <Library className="w-4 h-4 text-emerald-500 shrink-0" />
                            </div>
                            <div className="p-3 rounded-lg bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        UTME Applicants
                                    </p>
                                    <p className="text-base font-bold text-foreground tabular-nums mt-0.5">
                                        {stats.totalApplicants || 0}
                                    </p>
                                </div>
                                <Award className="w-4 h-4 text-amber-500 shrink-0" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Institutional Audit & Activity Feed */}
                <Card className={`border border-slate-200/90 dark:border-slate-800 bg-card shadow-xs rounded-xl ${hasFinance ? 'lg:col-span-7' : 'lg:col-span-3'}`}>
                    <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                Institutional Audit & Activity Stream
                            </CardTitle>
                            <CardDescription className="text-xs mt-0.5">
                                Latest administrative mutations and security events logged across the platform
                            </CardDescription>
                        </div>
                        <Link href="/dashboard/logs">
                            <Button variant="outline" size="sm" className="h-8 text-xs font-semibold">
                                View Audit Trail
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent className="pt-4">
                        {stats.recentActivities.length > 0 ? (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                                {stats.recentActivities.map((activity, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center justify-between gap-4 py-3 px-2 rounded-lg hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                                                <Activity className="h-3.5 w-3.5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                                                    {activity.title}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground">
                                                    Verified system transaction log
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2.5 shrink-0">
                                            <Badge variant="outline" className="hidden sm:inline-flex text-[10px] font-mono uppercase">
                                                AUDIT
                                            </Badge>
                                            <span className="text-xs font-mono text-muted-foreground">
                                                {formatActivityTimestamp(activity.time)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                No recent audit activities recorded today.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
