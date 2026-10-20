'use client';

import { useState, useEffect, use } from 'react';
import { getKioskLogs } from '@/actions/kiosk-actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Activity, Fingerprint } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function KioskLogsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: terminalId } = use(params);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            const res = await getKioskLogs(terminalId);
            if (res.success && res.data) {
                setLogs(res.data);
            }
            setLoading(false);
        };
        fetchLogs();
    }, [terminalId]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/dashboard/bas/kiosks">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Terminal Logs</h1>
                    <p className="text-muted-foreground">Hardware ID: {terminalId}</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-muted-foreground" />
                        Recent Scans & Events
                    </CardTitle>
                    <CardDescription>The last 100 attendance scans from this terminal.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex h-32 items-center justify-center">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-r-transparent"></div>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center border rounded-lg border-dashed bg-background">
                            <Fingerprint className="h-8 w-8 text-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">No attendance logs found for this terminal yet.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date & Time</TableHead>
                                    <TableHead>Staff Name</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead>Type</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="font-medium whitespace-nowrap">
                                            {format(new Date(log.date), 'MMM d, yyyy h:mm a')}
                                        </TableCell>
                                        <TableCell>
                                            {log.staff.firstName} {log.staff.lastName}
                                            <div className="text-xs text-muted-foreground">{log.staff.staffId}</div>
                                        </TableCell>
                                        <TableCell>{log.staff.department?.name || 'N/A'}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={log.type === 'IN' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}>
                                                {log.type === 'IN' ? 'Clock In' : 'Clock Out'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
