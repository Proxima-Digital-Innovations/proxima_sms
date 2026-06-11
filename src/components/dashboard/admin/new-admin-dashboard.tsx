'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, GraduationCap, DollarSign, BookOpen, TrendingUp, TrendingDown, Activity } from 'lucide-react';

// Admin dashboard stats data type
type DashboardStats = {
    totalStudents: number;
    totalStaff: number;
    totalRevenue: number;
    pendingPayments: number;
    activeClasses: number;
    recentActivities: Array<{ title: string; time: string; type: string }>;
};

// Server action import for fetching admin overview stats via Prisma
import { getAdminDashboardStats } from '@/actions/academic-actions';

export function NewAdminDashboard() {
    const [stats, setStats] = useState<DashboardStats>({
        totalStudents: 0,
        totalStaff: 0,
        totalRevenue: 0,
        pendingPayments: 0,
        activeClasses: 0,
        recentActivities: []
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Fetch dashboard stats on mount via server action
        fetchDashboardStats();
    }, []);

    const fetchDashboardStats = async () => {
        try {
            // Call server action to get admin overview numbers from Prisma
            const result = await getAdminDashboardStats();
            if (result.success && result.data) {
                setStats({
                    totalStudents: result.data.totalStudents || 0,
                    totalStaff: result.data.totalStaff || 0,
                    totalRevenue: result.data.totalRevenue || 0,
                    pendingPayments: result.data.pendingPayments || 0,
                    activeClasses: result.data.activeClasses || 0,
                    recentActivities: result.data.recentActivities || [
                        { title: 'System is operational', time: 'Just now', type: 'system' },
                    ]
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
            color: 'from-blue-500 to-blue-600'
        },
        {
            title: 'Total Staff',
            value: stats.totalStaff,
            icon: GraduationCap,
            trend: '+3%',
            trendUp: true,
            color: 'from-purple-500 to-purple-600'
        },
        {
            title: 'Total Revenue',
            value: `₦${stats.totalRevenue.toLocaleString()}`,
            icon: DollarSign,
            trend: '+8%',
            trendUp: true,
            color: 'from-green-500 to-green-600'
        },
        {
            title: 'Pending Payments',
            value: stats.pendingPayments,
            icon: Activity,
            trend: '-5%',
            trendUp: false,
            color: 'from-orange-500 to-orange-600'
        }
    ];

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map(i => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader className="pb-2">
                                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                            </CardHeader>
                            <CardContent>
                                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground">Welcome back! Here's what's happening today.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map((card, index) => (
                    <Card key={index} className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                        <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-10 transition-opacity`}></div>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {card.title}
                            </CardTitle>
                            <div className={`p-2 rounded-lg bg-gradient-to-br ${card.color}`}>
                                <card.icon className="h-4 w-4 text-white" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{card.value}</div>
                            <div className="flex items-center text-xs mt-1">
                                {card.trendUp ? (
                                    <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                                ) : (
                                    <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                                )}
                                <span className={card.trendUp ? 'text-green-500' : 'text-red-500'}>
                                    {card.trend}
                                </span>
                                <span className="text-muted-foreground ml-1">from last month</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quick Stats */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>Active Classes</CardTitle>
                        <CardDescription>Currently enrolled classes</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-blue-600">{stats.activeClasses}</div>
                        <p className="text-sm text-muted-foreground mt-2">classes with active enrollment</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Fee Collection</CardTitle>
                        <CardDescription>This term</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span>Collected</span>
                                    <span className="font-medium">Running total</span>
                                </div>
                                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 w-3/4"></div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Collected</p>
                                    <p className="font-bold text-green-600">₦{(stats.totalRevenue).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Pending</p>
                                    <p className="font-bold text-orange-600">{stats.pendingPayments}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>Latest updates</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {stats.recentActivities.map((activity, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className="p-2 rounded-full bg-blue-100">
                                        <Activity className="h-3 w-3 text-blue-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">{activity.title}</p>
                                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <a href="/dashboard/students/admissions" className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-center">
                            <Users className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                            <p className="text-sm font-medium">Add Student</p>
                        </a>
                        <a href="/dashboard/scores/enter" className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-center">
                            <BookOpen className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                            <p className="text-sm font-medium">Enter Scores</p>
                        </a>
                        <a href="/dashboard/finance/invoices" className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-center">
                            <DollarSign className="h-6 w-6 mx-auto mb-2 text-green-600" />
                            <p className="text-sm font-medium">Create Invoice</p>
                        </a>
                        <a href="/dashboard/results/generate" className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-center">
                            <GraduationCap className="h-6 w-6 mx-auto mb-2 text-orange-600" />
                            <p className="text-sm font-medium">Generate Results</p>
                        </a>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
