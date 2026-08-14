'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState, useCallback } from 'react';
import { getAuditLogs } from '@/actions/log-actions';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton";

type LogEntry = {
    id: string;
    actorId: string;
    action: string;
    entity: string;
    entityId: string;
    details?: string;
    createdAt: Date;
    user?: { email: string; name: string } | null;
}

export default function LogsPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const fetchLogs = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await getAuditLogs();
            if (result.success && result.data) {
                // Map to the expected LogEntry format
                const logsList = result.data.map((log: any) => ({
                    id: log.id,
                    actorId: log.userId || 'System',
                    action: log.action,
                    entity: log.entity,
                    entityId: log.entityId || '',
                    details: log.details || '',
                    createdAt: new Date(log.createdAt),
                    user: log.user
                }));
                setLogs(logsList);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error("Error fetching logs:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not fetch system logs.",
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const levelVariant = (action: string) => {
        if (action.includes('delete') || action.includes('reject')) return 'destructive';
        if (action.includes('update') || action.includes('create')) return 'secondary';
        return 'outline';
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="font-headline text-3xl font-bold">Logs & Security</h1>
                <p className="text-muted-foreground">
                    Monitor system activity and security events.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>System Event Log</CardTitle>
                    <CardDescription>
                        A real-time log of all significant events occurring within the portal.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Action</TableHead>
                                <TableHead>Timestamp</TableHead>
                                <TableHead className="hidden md:table-cell">Actor ID</TableHead>
                                <TableHead>Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-36" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                    </TableRow>
                                ))
                            ) : logs.length > 0 ? logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell>
                                        <Badge variant={levelVariant(log.action)} className="capitalize">{log.action.replace(/_/g, ' ')}</Badge>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">
                                        {formatDistanceToNow(log.createdAt, { addSuffix: true })}
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell font-mono text-xs">{log.user?.email || log.actorId}</TableCell>
                                    <TableCell>{log.details || `${log.entity} (${log.entityId})`}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No log entries found.
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
