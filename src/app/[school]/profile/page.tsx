
'use client';

import { useRole } from '@/context/role-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfilePage() {
    const { user, isLoading } = useRole();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;

        if (user?.staffId) {
            router.replace(`/dashboard/users/${user.staffId}`);
        } else if (user) {
            // User is logged in but not a staff member (e.g., Parent)
            // Or staffId is missing for some reason. Redirect to their dashboard.
            router.replace('/dashboard');
        } else {
            // Not logged in at all
            router.replace('/');
        }
    }, [isLoading, user, router]);

    // Display a loading state while redirecting to avoid a flash of unstyled content.
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="w-full max-w-lg space-y-4 p-4">
                <h2 className="text-xl font-semibold">Redirecting to your profile...</h2>
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-8 w-3/4" />
                <div className="space-y-2 pt-4">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                </div>
            </div>
        </div>
    );
}
