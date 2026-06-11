
'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot } from '@/lib/firebase-stubs';
import { db, auth, storage } from "@/lib/firebase";
import { useRole } from '@/context/role-context';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import Link from 'next/link';

export function NotificationBell() {
    const { user, isLoading: isUserLoading } = useRole();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!user) {
            setUnreadCount(0);
            return;
        }

        const q = query(
            collection(db, 'notifications'),
            where('toUserId', '==', user.uid),
            where('read', '==', false)
        );

        // Real-time listener for notifications. We type the callback parameters as any
        // to comply with TypeScript strict mode while using firebase-stubs.
        const unsubscribe = onSnapshot(q, (querySnapshot: any) => {
            setUnreadCount(querySnapshot.size);
        }, (error: any) => {
            console.error("Error fetching unread notifications:", error);
        });

        // Cleanup subscription on component unmount
        return () => unsubscribe();
    }, [user]);

    if (isUserLoading) {
        return (
            <Button variant="ghost" size="icon" className="rounded-full">
                <Bell className="h-5 w-5" />
                <span className="sr-only">Toggle notifications</span>
            </Button>
        );
    }
    
    return (
        <Button asChild variant="ghost" size="icon" className="relative rounded-full">
            <Link href="/dashboard/notifications">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                     <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                        {unreadCount}
                     </span>
                )}
                <span className="sr-only">Toggle notifications</span>
            </Link>
        </Button>
    )
}
