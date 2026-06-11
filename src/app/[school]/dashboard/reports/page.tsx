
'use client';
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, BookUser, DollarSign, GraduationCap, Users } from "lucide-react";
import Link from "next/link";
import { useRole } from "@/context/role-context";

const reportCards = [
    {
        title: 'Academic Performance',
        description: 'Analyze student performance by class, subject, or department.',
        icon: GraduationCap,
        href: '/dashboard/hod/analytics', // Example link
        roles: ['Admin', 'SLT', 'HeadOfDepartment']
    },
    {
        title: 'Financial Reports',
        description: 'Generate income statements, fee summaries, and expense breakdowns.',
        icon: DollarSign,
        href: '/dashboard/accountant/reports',
        roles: ['Admin', 'SLT', 'Accountant']
    },
    {
        title: 'Student Demographics',
        description: 'View reports on student enrollment, gender distribution, and more.',
        icon: Users,
        href: '/dashboard/reports/student-demographics',
        roles: ['Admin', 'SLT']
    },
     {
        title: 'Staff Directory & Roles',
        description: 'Export lists of all staff members, their roles, and departments.',
        icon: BookUser,
        href: '/dashboard/reports/staff-directory',
        roles: ['Admin', 'SLT']
    }
]

export default function ReportsPage() {
  const { role } = useRole();

  const availableReports = reportCards.filter(card => role && card.roles.includes(role));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold">Reports & Analytics</h1>
        <p className="text-muted-foreground">
          Analyze school-wide data and generate reports.
        </p>
      </div>

       <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {availableReports.map((card) => (
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
                        View Report <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </Card>
        ))}
      </div>

       {availableReports.length === 0 && (
         <Card>
            <CardHeader>
                <CardTitle>No Reports Available</CardTitle>
                <CardDescription>
                    There are no reports configured for your role at this time.
                </CardDescription>
            </CardHeader>
        </Card>
      )}
    </div>
  );
}
