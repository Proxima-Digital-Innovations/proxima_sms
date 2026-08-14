'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Users,
  Clock,
  DollarSign,
  GraduationCap,
  TrendingUp,
  Briefcase,
  FileText
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SLTAssignments } from './assignments';
import { getAdminDashboardStats } from '@/actions/academic-actions';
import { motion } from 'framer-motion';

type DashboardStats = {
    totalStudents: number;
    totalStaff: number;
    totalRevenue: number;
    pendingPayments: number;
    activeClasses: number;
    recentActivities: Array<{ title: string; time: string; type: string }>;
};

const financeChartData = [
  { name: 'Revenue', value: 3200000, fill: 'hsl(var(--primary))' },
  { name: 'Expenses', value: 850000, fill: 'hsl(var(--destructive))' },
];

export default function SltPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    async function fetchData() {
        try {
            const result = await getAdminDashboardStats();
            if (result.success && result.data) {
                setStats(result.data as DashboardStats);
            }
        } catch (error) {
            console.error("Failed to fetch SLT dashboard data:", error);
        } finally {
            setIsLoading(false);
        }
    }
    fetchData();
  }, []);

  const renderStat = (value: number | undefined, isCurrency = false) => {
    if (isLoading || value === undefined) return <Skeleton className="h-8 w-24" />;
    if (isCurrency) return `₦ ${value.toLocaleString()}`;
    return value.toLocaleString();
  };

  const statCards = [
    {
        title: 'Enrolled Students',
        value: renderStat(stats?.totalStudents),
        icon: Users,
        gradient: 'from-blue-500/20 to-blue-600/5',
        iconColor: 'text-blue-600'
    },
    {
        title: 'Teaching Staff',
        value: renderStat(stats?.totalStaff),
        icon: Briefcase,
        gradient: 'from-indigo-500/20 to-indigo-600/5',
        iconColor: 'text-indigo-600'
    },
    {
        title: 'Pending Approvals',
        value: renderStat(12), // Placeholder for actual pending items
        icon: Clock,
        gradient: 'from-amber-500/20 to-amber-600/5',
        iconColor: 'text-amber-600'
    },
    {
        title: 'Term Revenue',
        value: renderStat(stats?.totalRevenue, true),
        icon: DollarSign,
        gradient: 'from-emerald-500/20 to-emerald-600/5',
        iconColor: 'text-emerald-600'
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">SLT Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            High-level academic and operational oversight for Proxima Hub.
          </p>
        </div>
      </div>

       <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px] mb-8 bg-muted/50 p-1 border border-border/50 rounded-xl">
            <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
            <TabsTrigger value="assignments" className="rounded-lg">Tasks & Assignments</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-6">
            
            {/* Stat Cards */}
             <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {statCards.map((card, index) => (
                    <motion.div 
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 border-slate-200/60 bg-white">
                            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-50 group-hover:opacity-100 transition-opacity duration-500 z-0`}></div>
                            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                                <CardTitle className="text-sm font-bold text-slate-700">{card.title}</CardTitle>
                                <div className={`h-10 w-10 rounded-full bg-white/80 shadow-sm flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform`}>
                                    <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                                </div>
                            </CardHeader>
                            <CardContent className="relative z-10">
                                <div className="text-3xl font-bold tracking-tight text-slate-900">{card.value}</div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Main Content Area */}
             <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-6">
                <Card className="lg:col-span-3 standard-card border-none">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            Recent Lesson Plan Submissions
                        </CardTitle>
                        <CardDescription>A summary of the latest lesson plans submitted for review.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="data-table-container">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead>Teacher</TableHead>
                                        <TableHead className="hidden sm:table-cell">Subject</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="hidden md:table-cell">Submitted</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        Array.from({ length: 3 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell colSpan={4}><Skeleton className="h-10 w-full"/></TableCell>
                                        </TableRow>
                                        ))
                                    ) : (
                                        <>
                                            <TableRow className="hover:bg-muted/30 transition-colors">
                                                <TableCell className="font-medium">Sarah Johnson</TableCell>
                                                <TableCell className="hidden sm:table-cell text-muted-foreground">Mathematics</TableCell>
                                                <TableCell><Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200">Pending Review</Badge></TableCell>
                                                <TableCell className="text-xs text-muted-foreground hidden md:table-cell">2 hours ago</TableCell>
                                            </TableRow>
                                            <TableRow className="hover:bg-muted/30 transition-colors">
                                                <TableCell className="font-medium">Michael Chen</TableCell>
                                                <TableCell className="hidden sm:table-cell text-muted-foreground">Physics</TableCell>
                                                <TableCell><Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200">Approved</Badge></TableCell>
                                                <TableCell className="text-xs text-muted-foreground hidden md:table-cell">5 hours ago</TableCell>
                                            </TableRow>
                                            <TableRow className="hover:bg-muted/30 transition-colors">
                                                <TableCell className="font-medium">Emily Davis</TableCell>
                                                <TableCell className="hidden sm:table-cell text-muted-foreground">English Lit</TableCell>
                                                <TableCell><Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200">Approved</Badge></TableCell>
                                                <TableCell className="text-xs text-muted-foreground hidden md:table-cell">Yesterday</TableCell>
                                            </TableRow>
                                        </>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2 standard-card border-none">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-emerald-500" />
                            Financial Summary
                        </CardTitle>
                        <CardDescription>Term revenue vs. estimated expenses</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={financeChartData} layout="vertical" margin={{ left: -20 }}>
                                    <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} width={80}/>
                                    <XAxis type="number" hide />
                                    <Tooltip 
                                        cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }} 
                                        contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                                        formatter={(value: number) => `₦ ${value.toLocaleString()}`} 
                                    />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </TabsContent>
        <TabsContent value="assignments" className="mt-6">
           <SLTAssignments />
        </TabsContent>
       </Tabs>
    </div>
  );
}
