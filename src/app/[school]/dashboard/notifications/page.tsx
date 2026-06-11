
'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, query, where, orderBy, getDocs, updateDoc, doc } from '@/lib/firebase-stubs';
import { db, auth, storage } from "@/lib/firebase";
import { useRole } from '@/context/role-context';
import type { AppNotification } from '@/lib/schema';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BellRing, Check, Mail, ThumbsDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function NotificationsPage() {
    const { user, isLoading: isUserLoading } = useRole();
    const { toast } = useToast();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            // Firestore doesn't support inequality filters on multiple properties.
            // We fetch filtered by user and sort client-side to avoid needing a composite index.
            const q = query(
                collection(db, 'notifications'),
                where('toUserId', '==', user.uid)
            );
            const querySnapshot = await getDocs(q);
            const notifs = querySnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as AppNotification));

            // Sort client-side
            notifs.sort((a: any, b: any) => b.createdAt.seconds - a.createdAt.seconds);
            
            setNotifications(notifs);
        } catch (error) {
            console.error('Error fetching notifications:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not fetch notifications.',
            });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        if (!isUserLoading && user) {
            fetchNotifications();
        } else if (!isUserLoading && !user) {
            setIsLoading(false);
        }
    }, [isUserLoading, user, fetchNotifications]);

    const markAsRead = async (notificationId: string) => {
        try {
            const notifRef = doc(db, 'notifications', notificationId);
            await updateDoc(notifRef, { read: true });
            fetchNotifications(); // Re-fetch to update UI
        } catch (error) {
            console.error('Error marking notification as read:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not update notification.',
            });
        }
    };
    
    const getIcon = (type: AppNotification['type']) => {
        switch(type) {
            case 'APPROVAL': return <Check className="h-5 w-5 text-green-500" />;
            case 'REJECTION': return <ThumbsDown className="h-5 w-5 text-red-500" />;
            case 'INFO': return <BellRing className="h-5 w-5 text-blue-500" />;
            default: return <Mail className="h-5 w-5 text-muted-foreground" />;
        }
    }
    
    const getLinkForNotif = (notif: AppNotification) => {
        const { collection: refCollection, id: refId } = notif.ref;
        if (refCollection === 'lessonNotes') {
            return `/dashboard/lesson-notes/${refId}`;
        }
        if (refCollection === 'examQuestions') {
            return `/dashboard/exam-questions/${refId}`;
        }
        // Fallback or other collections
        return '/dashboard';
    };


    return (
        <div className="space-y-8">
            <div>
                <h1 className="font-headline text-3xl font-bold">Notifications</h1>
                <p className="text-muted-foreground">
                    Stay up to date with the latest activities.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Recent Notifications</CardTitle>
                    <CardDescription>A list of your recent notifications.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {isLoading ? (
                             Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="flex items-start gap-4 p-4 rounded-lg border">
                                    <Skeleton className="h-8 w-8 rounded-full" />
                                    <div className="space-y-2 flex-1">
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-4 w-1/2" />
                                    </div>
                                    <Skeleton className="h-4 w-16" />
                                </div>
                             ))
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center">
                                <BellRing className="h-12 w-12 text-muted-foreground" />
                                <h3 className="mt-4 text-lg font-semibold">No Notifications</h3>
                                <p className="mt-2 text-sm text-muted-foreground">You're all caught up!</p>
                            </div>
                        ) : (
                            notifications.map(notif => (
                                <div key={notif.id} className={cn("flex items-start gap-4 p-4 rounded-lg border transition-colors", !notif.read && "bg-secondary/50")}>
                                   <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                                     {getIcon(notif.type)}
                                   </div>
                                    <div className="flex-1 space-y-1">
                                        <p className="font-medium">{notif.title}</p>
                                        <p className="text-sm text-muted-foreground">{notif.body}</p>
                                         <p className="text-xs text-muted-foreground">
                                           {formatDistanceToNow(new Date(notif.createdAt.seconds * 1000), { addSuffix: true })}
                                         </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                       <Button asChild variant="outline" size="sm">
                                            <Link href={getLinkForNotif(notif)}>View</Link>
                                       </Button>
                                       {!notif.read && (
                                            <Button variant="ghost" size="sm" onClick={() => markAsRead(notif.id)}>Mark as read</Button>
                                       )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
