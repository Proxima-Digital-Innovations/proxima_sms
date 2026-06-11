
'use client';

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Calendar, DollarSign, GraduationCap, School, ShieldCheck, BookMarked, Wrench, Sparkles } from "lucide-react";
import Link from "next/link";


const settingsCards = [
    {
        title: 'School Information',
        description: 'Manage school name, address, and contact details.',
        icon: School,
        href: '/dashboard/system/school-info'
    },
    {
        title: 'Grading System',
        description: 'Configure grade scales, GPA calculations, and report card comments.',
        icon: GraduationCap,
        href: '/dashboard/system/grading'
    },
    {
        title: 'Academic Year',
        description: 'Set term dates, school holidays, and session management.',
        icon: Calendar,
        href: '/dashboard/system/academic-year'
    },
    {
        title: 'AI Engine',
        description: 'Configure AI agents, safety settings, and other smart features.',
        icon: Sparkles,
        href: '/dashboard/system/ai-settings'
    },
    {
        title: 'Roles & Permissions',
        description: 'Manage user roles and what they can access in the portal.',
        icon: ShieldCheck,
        href: '/dashboard/system/roles'
    },
    {
        title: 'Classes & Subjects',
        description: 'Manage school classes and the subjects offered.',
        icon: BookMarked,
        href: '/dashboard/system/classes-subjects'
    },
    {
        title: 'Maintenance Mode',
        description: 'Temporarily restrict access to certain features during maintenance.',
        icon: Wrench,
        href: '/dashboard/system/maintenance'
    }
]

export default function SystemPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold">System Configuration</h1>
        <p className="text-muted-foreground">
          Manage system-wide settings and school policies.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {settingsCards.map((card) => (
            <Card key={card.title} className="flex flex-col justify-between transition-all hover:shadow-md">
                <CardHeader>
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <card.icon className="h-6 w-6" />
                    </div>
                    <CardTitle>{card.title}</CardTitle>
                    <CardDescription>{card.description}</CardDescription>
                </CardHeader>
                 <div className="p-6 pt-0">
                    <Link href={card.href} className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
                        Configure <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </Card>
        ))}
      </div>
    </div>
  );
}
