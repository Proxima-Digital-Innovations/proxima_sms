
'use client';

import { useState, useEffect, useCallback } from 'react';
import { getNotifications } from '@/actions/notification-actions';
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

        const fetchNotifications = async () => {
            const result = await getNotifications(user.id || (user as any).uid);
            if (result.success && result.data) {
                const unread = result.data.filter((n: any) => !n.read).length;
                setUnreadCount(unread);
            }
        };

        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000); // Poll every minute

        return () => clearInterval(interval);
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
