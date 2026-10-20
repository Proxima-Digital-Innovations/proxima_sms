import { getHubStats } from '@/actions/hub-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, GraduationCap, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export default async function HubDashboardPage() {
    const statsResult = await getHubStats();
    
    if (!statsResult.success || !statsResult.data) {
        return (
            <div className="p-8">
                <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-200">
                    Failed to load Hub statistics: {statsResult.error}
                </div>
            </div>
        );
    }

    const { totalSchools, totalUsers, totalStudents, totalTeachers, recentSchools } = statsResult.data;

    return (
        <div className="space-y-8 max-w-6xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Hub Dashboard</h1>
                <p className="text-muted-foreground mt-2">
                    Overview of your global Proxima SMS SaaS infrastructure.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-border shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Total Tenants (Schools)</CardTitle>
                        <Building2 className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900">{totalSchools}</div>
                        <p className="text-xs text-muted-foreground mt-1">Active deployments</p>
                    </CardContent>
                </Card>

                <Card className="border-border shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Total Students</CardTitle>
                        <GraduationCap className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900">{totalStudents}</div>
                        <p className="text-xs text-muted-foreground mt-1">Across all schools</p>
                    </CardContent>
                </Card>

                <Card className="border-border shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Total Staff</CardTitle>
                        <Users className="h-4 w-4 text-indigo-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900">{totalTeachers}</div>
                        <p className="text-xs text-muted-foreground mt-1">Teachers and Admins</p>
                    </CardContent>
                </Card>

                <Card className="border-border shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Total System Users</CardTitle>
                        <Users className="h-4 w-4 text-slate-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900">{totalUsers}</div>
                        <p className="text-xs text-muted-foreground mt-1">Registered accounts</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-border shadow-sm">
                    <CardHeader>
                        <CardTitle>Recent Deployments</CardTitle>
                        <CardDescription>The latest schools added to your infrastructure.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentSchools.map((school) => (
                                <div key={school.id} className="flex items-center justify-between border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                                    <div>
                                        <p className="font-medium text-slate-900">{school.name}</p>
                                        <p className="text-sm text-muted-foreground">Tenant ID: {school.name}</p>
                                    </div>
                                    <Link 
                                        href={`/${school.name}/dashboard`} 
                                        className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
                                    >
                                        Visit
                                        <ArrowUpRight className="ml-1 h-4 w-4" />
                                    </Link>
                                </div>
                            ))}
                            {recentSchools.length === 0 && (
                                <p className="text-sm text-muted-foreground">No schools deployed yet.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
