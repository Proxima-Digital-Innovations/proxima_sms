
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// This component now acts as a redirect to the consolidated fee management page.
export default function SystemFeesRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/dashboard/accountant/fees');
    }, [router]);

    return (
        <div className="flex h-64 w-full flex-col items-center justify-center gap-4 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <div className="space-y-1">
                <h2 className="text-xl font-semibold text-foreground">Redirecting...</h2>
                <p className="text-muted-foreground">
                    Fee management has been moved to the Accountant dashboard.
                </p>
            </div>
        </div>
    );
}
