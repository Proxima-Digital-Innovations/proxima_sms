import { getAllSchools } from '@/actions/hub-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { CreateSchoolDialog } from '@/components/hub/create-school-dialog';
import Link from 'next/link';
import { ArrowUpRight, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function SchoolsPage() {
    const result = await getAllSchools();
    
    if (!result.success || !result.data) {
        return (
            <div className="p-8 text-red-600">
                Failed to load schools: {result.error}
            </div>
        );
    }

    const schools = result.data;

    return (
        <div className="space-y-8 max-w-7xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Schools & Tenants</h1>
                    <p className="text-slate-500 mt-2">
                        Manage all deployed school instances on the Proxima platform.
                    </p>
                </div>
                <CreateSchoolDialog />
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle>Active Deployments</CardTitle>
                    <CardDescription>A complete list of all tenants registered in the global database.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>School Name</TableHead>
                                <TableHead>Tenant Slug</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Students</TableHead>
                                <TableHead className="text-right">Staff/Users</TableHead>
                                <TableHead>Deployed On</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {schools.map((school) => (
                                <TableRow key={school.id}>
                                    <TableCell className="font-medium text-slate-900">{school.name}</TableCell>
                                    <TableCell className="font-mono text-sm text-slate-500">{school.name}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                            Active
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">{0}</TableCell>
                                    <TableCell className="text-right">{(school as any)._count?.users || 0}</TableCell>
                                    <TableCell className="text-slate-500 text-sm">
                                        {format(new Date(school.createdAt), 'MMM d, yyyy')}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
                                                <Link href={`/${school.name}/dashboard`} title="Open Dashboard">
                                                    <ArrowUpRight className="h-4 w-4" />
                                                    <span className="sr-only">Open Dashboard</span>
                                                </Link>
                                            </Button>
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                <Settings className="h-4 w-4" />
                                                <span className="sr-only">Manage</span>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {schools.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                                        No schools have been deployed yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
