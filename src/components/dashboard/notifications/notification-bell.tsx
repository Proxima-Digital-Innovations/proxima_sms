'use client';

import { useState, useEffect } from 'react';
import { getUnreadNotificationCount } from '@/actions/notification-actions';
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

        const userId = user.id || (user as any).uid;
        if (!userId) return;

        const fetchUnreadCount = async () => {
            const result = await getUnreadNotificationCount(userId);
            if (result.success) {
                setUnreadCount(result.count || 0);
            }
        };

        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 60000);

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
    );
}
