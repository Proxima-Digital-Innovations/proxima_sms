'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, GraduationCap, Wallet, BookOpen, TrendingUp, TrendingDown, Activity, ArrowUpRight, BarChart3, Clock, PlusCircle, Settings, FileText } from 'lucide-react';
import Link from 'next/link';
import { getAdminDashboardStats } from '@/actions/academic-actions';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useSession } from 'next-auth/react';
import { useRole } from '@/context/role-context';
import { useLanguage } from '@/context/language-context';
import { Badge } from '@/components/ui/badge';

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
    const { data: session } = useSession();
    const { role: contextRole } = useRole();
    const { language } = useLanguage();

    const role = String((session?.user as any)?.role || contextRole || 'ADMIN').toUpperCase();

    const roleLabelsEn: Record<string, string> = {
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

    const roleLabelsAr: Record<string, string> = {
        SUPER_ADMIN: 'المشرف العام',
        ADMIN: 'مدير النظام',
        SLT: 'إدارة المدرسة',
        ACCOUNTANT: 'المحاسب المالي',
        HOD: 'رئيس القسم',
        EXAM_OFFICER: 'مسؤول الامتحانات',
        TEACHER: 'المعلم',
        PARENT: 'ولي الأمر',
        STUDENT: 'الطالب',
    };

    const roleSubtitlesEn: Record<string, string> = {
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

    const roleSubtitlesAr: Record<string, string> = {
        SUPER_ADMIN: 'نظرة شاملة على مؤشرات المؤسسة، السعة الاستيعابية، والأداء العام.',
        ADMIN: 'إليك أحدث مؤشرات وإحصائيات الأداء لمدرستك اليوم.',
        SLT: 'المؤشرات الاستراتيجية، إنجازات الفصول، وسير العملية التعليمية.',
        ACCOUNTANT: 'متابعة الإيرادات والرسوم الدراسية وحسابات دفتر الأستاذ.',
        HOD: 'متابعة الخطط الدراسية، تحضير المعلمين، وتحليلات المواد.',
        EXAM_OFFICER: 'تدقيق الدرجات، نماذج أسئلة الامتحانات، ودفاتر الرصد.',
        TEACHER: 'جداول الحصص، قوائم الطلاب، خطط الدروس، ورصد الدرجات.',
        PARENT: 'التقارير الدراسية، سجل الحضور، والفواتير المستحقة.',
        STUDENT: 'المواد المسجلة، جداول الحصص، والاختبارات القادمة.',
    };

    const roleLabels = language === 'ar' ? roleLabelsAr : roleLabelsEn;
    const roleSubtitles = language === 'ar' ? roleSubtitlesAr : roleSubtitlesEn;

    const userName = session?.user?.name?.trim();
    const greetingTarget = userName || roleLabels[role] || (language === 'ar' ? 'مدير النظام' : 'Administrator');
    const greeting = language === 'ar' 
        ? `مرحباً بك مجدداً، ${greetingTarget}` 
        : `Welcome back, ${greetingTarget}`;
    const subtitle = roleSubtitles[role] || (language === 'ar' 
        ? 'إليك أحدث مؤشرات وإحصائيات الأداء لمدرستك اليوم.' 
        : "Here is the latest snapshot of your institution's performance.");

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
                        { 
                            title: language === 'ar' ? 'تم بدء تشغيل النظام بنجاح' : 'System initialized successfully', 
                            time: language === 'ar' ? 'الآن' : 'Just now', 
                            type: 'system' 
                        },
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
            title: language === 'ar' ? 'إجمالي الطلاب' : 'Total Students',
            value: stats.totalStudents.toLocaleString(),
            icon: Users,
            trend: '+12%',
            trendUp: true,
            gradient: 'from-blue-500/20 to-blue-600/5',
            iconColor: 'text-blue-600'
        },
        {
            title: language === 'ar' ? 'إجمالي الكادر' : 'Total Staff',
            value: stats.totalStaff.toLocaleString(),
            icon: GraduationCap,
            trend: '+3%',
            trendUp: true,
            gradient: 'from-indigo-500/20 to-indigo-600/5',
            iconColor: 'text-indigo-600'
        },
        {
            title: language === 'ar' ? 'إجمالي الإيرادات' : 'YTD Revenue',
            value: `₦${stats.totalRevenue.toLocaleString()}`,
            icon: Wallet,
            trend: '+8%',
            trendUp: true,
            gradient: 'from-emerald-500/20 to-emerald-600/5',
            iconColor: 'text-emerald-600'
        },
        {
            title: language === 'ar' ? 'الفواتير المستحقة' : 'Pending Invoices',
            value: stats.pendingPayments.toLocaleString(),
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
                    <span>{language === 'ar' ? 'النظام متصل ونشط' : 'System Live'}</span>
                </div>
            </div>

            {/* Premium Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                {statCards.map((card, index) => (
                    <motion.div 
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-border/50 bg-card/80 backdrop-blur-sm rounded-2xl">
                            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-50 group-hover:opacity-100 transition-opacity duration-500`}></div>
                            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-5 relative z-10">
                                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground line-clamp-1">
                                    {card.title}
                                </CardTitle>
                                <div className="p-1.5 sm:p-2 rounded-xl bg-background shadow-sm border border-border/50 shrink-0">
                                    <card.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${card.iconColor}`} />
                                </div>
                            </CardHeader>
                            <CardContent className="p-3 sm:p-5 pt-0 relative z-10">
                                <div className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight mb-1 sm:mb-2 truncate font-mono numeric-badge">
                                    {card.value}
                                </div>
                                <div className="flex items-center text-[10px] sm:text-xs font-medium flex-wrap gap-1">
                                    <span className={`flex items-center px-1.5 py-0.5 rounded-md shrink-0 numeric-badge ${card.trendUp ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'}`}>
                                        {card.trendUp ? (
                                            <TrendingUp className="h-3 w-3 mr-0.5 sm:mr-1 rtl:ml-0.5 rtl:mr-0 shrink-0" />
                                        ) : (
                                            <TrendingDown className="h-3 w-3 mr-0.5 sm:mr-1 rtl:ml-0.5 rtl:mr-0 shrink-0" />
                                        )}
                                        <span className="ltr-only font-mono">{card.trend}</span>
                                    </span>
                                    <span className="hidden sm:inline text-muted-foreground ms-1">
                                        {language === 'ar' ? 'مقارنة بالسابق' : 'vs last mo'}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
                <Link href="/dashboard/students/admissions">
                    <Button variant="outline" className="w-full h-14 sm:h-16 flex flex-col items-center justify-center gap-1 border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors rounded-xl">
                        <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="font-semibold text-[11px] sm:text-xs">
                            {language === 'ar' ? 'تسجيل طالب جديد' : 'Admit Student'}
                        </span>
                    </Button>
                </Link>
                <Link href="/dashboard/users">
                    <Button variant="outline" className="w-full h-14 sm:h-16 flex flex-col items-center justify-center gap-1 border-indigo-500/20 hover:bg-indigo-500/5 hover:text-indigo-600 transition-colors rounded-xl">
                        <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="font-semibold text-[11px] sm:text-xs">
                            {language === 'ar' ? 'إدارة الكادر الوظيفي' : 'Manage Staff'}
                        </span>
                    </Button>
                </Link>
                <Link href="/dashboard/finance/invoices">
                    <Button variant="outline" className="w-full h-14 sm:h-16 flex flex-col items-center justify-center gap-1 border-emerald-500/20 hover:bg-emerald-500/5 hover:text-emerald-600 transition-colors rounded-xl">
                        <Wallet className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="font-semibold text-[11px] sm:text-xs">
                            {language === 'ar' ? 'تحصيل الرسوم والفواتير' : 'Collect Fees'}
                        </span>
                    </Button>
                </Link>
                <Link href="/dashboard/system/school-info">
                    <Button variant="outline" className="w-full h-14 sm:h-16 flex flex-col items-center justify-center gap-1 border-slate-500/20 hover:bg-muted/50 hover:text-slate-600 transition-colors rounded-xl">
                        <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="font-semibold text-[11px] sm:text-xs">
                            {language === 'ar' ? 'إعدادات وهوية المدرسة' : 'Settings'}
                        </span>
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
                                    {language === 'ar' ? 'نمو الإيرادات والتحصيل' : 'Revenue Growth'}
                                </CardTitle>
                                <CardDescription>
                                    {language === 'ar' ? 'الأداء المالي وحركة التحصيل لآخر 6 أشهر' : 'Financial performance over the last 6 months'}
                                </CardDescription>
                            </div>
                            <div className="text-sm font-semibold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full flex items-center gap-1 numeric-badge">
                                <ArrowUpRight className="w-4 h-4 rtl:rotate-90" />
                                <span className="ltr-only font-mono">+15.2%</span>
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
                                        formatter={(value: number) => [`₦${value.toLocaleString()}`, language === 'ar' ? 'الإيرادات' : 'Revenue']}
                                    />
                                    <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Attendance Chart & Activity */}
                <div className="col-span-7 md:col-span-3 space-y-6">
                    <Card className="shadow-sm border-border lg:col-span-3">
                        <CardHeader>
                            <CardTitle>{language === 'ar' ? 'معدلات ونسب الحضور' : 'Attendance Trends'}</CardTitle>
                            <CardDescription>
                                {language === 'ar' ? 'نسبة الحضور والغياب اليومية للطلاب والكادر' : 'Daily staff and student attendance'}
                            </CardDescription>
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
                                        <Bar dataKey="present" name={language === 'ar' ? 'حضور' : 'Present'} fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                        <Bar dataKey="absent" name={language === 'ar' ? 'غياب' : 'Absent'} fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
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
                                    {language === 'ar' ? 'آخر الأنشطة والعمليات' : 'Recent Activity'}
                                </CardTitle>
                            </div>
                            <Button variant="ghost" size="sm" className="text-primary h-8">
                                {language === 'ar' ? 'عرض الكل' : 'View All'}
                            </Button>
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
                                        {language === 'ar' ? 'لا توجد أنشطة مسجلة اليوم.' : 'No recent activities logged today.'}
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
