'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, GraduationCap } from "lucide-react";
import Link from "next/link";

export default function PerformancePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  useEffect(() => {
    if (role === 'PARENT') {
      router.replace('/dashboard/parent/results');
    }
  }, [role, router]);

  return (
    <div className="space-y-5 w-full">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Student Academic Oversight</h1>
        <p className="text-muted-foreground text-sm">
          Comprehensive academic performance tracking, broadsheets, and student directory.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Terminal Report Cards & Results
            </CardTitle>
            <CardDescription>
              View terminal academic results, score broadsheets, and compiled transcripts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="rounded-xl w-full">
              <Link href="/dashboard/results/view">
                View Broadsheet & Results <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-indigo-500" />
              Student Directory
            </CardTitle>
            <CardDescription>
              Browse all enrolled students, class assignments, and guardian contacts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="rounded-xl w-full">
              <Link href="/dashboard/students">
                Open Student Directory <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
