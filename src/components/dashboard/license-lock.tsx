'use client';

import { ShieldAlert, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function LicenseLock({ status }: { status: string }) {
    const router = useRouter();
    
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md shadow-2xl border-red-900 bg-muted text-slate-100">
                <CardHeader className="space-y-2 text-center pb-6">
                    <div className="mx-auto bg-red-950/50 p-4 rounded-full w-20 h-20 flex items-center justify-center mb-2">
                        <AlertTriangle className="h-10 w-10 text-red-500" />
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                        License {status === 'EXPIRED' ? 'Expired' : 'Suspended'}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground text-base">
                        System access has been restricted.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-background p-4 rounded-lg border border-border text-sm text-foreground">
                        {status === 'EXPIRED' ? (
                            <p>Your subscription for Proxima SMS Education Portal has expired. Please renew your license to restore full system functionality.</p>
                        ) : (
                            <p>Your license has been suspended. Please contact Proxima Digital support to resolve this issue and restore access.</p>
                        )}
                    </div>
                    <div className="flex flex-col gap-3">
                        <Button 
                            className="w-full font-semibold bg-blue-600 hover:bg-blue-700 text-white" 
                            onClick={() => window.open('https://proximadigital.com/support', '_blank')}
                        >
                            Contact Support
                        </Button>
                        <Button 
                            variant="outline" 
                            className="w-full border-border text-foreground hover:bg-slate-700 hover:text-white"
                            onClick={() => router.push('/')}
                        >
                            Return to Login
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
