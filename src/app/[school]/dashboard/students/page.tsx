
import { prisma } from '@/lib/prisma';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search, Users, User, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { AddStudentForm } from '@/components/dashboard/students/add-student-form';

export default async function StudentsPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>;
}) {
    const query = (await searchParams).q || '';

    // Fetch students using Prisma with relational links
    const students = await prisma.student.findMany({
        where: {
            OR: [
                { firstName: { contains: query, mode: 'insensitive' } },
                { lastName: { contains: query, mode: 'insensitive' } },
                { studentId: { contains: query, mode: 'insensitive' } },
            ],
        },
        include: {
            class: true,
            guardians: true,
        },
        orderBy: {
            lastName: 'asc',
        },
    });

    const stats = {
        total: await prisma.student.count({ where: { status: 'Active' } }),
        male: await prisma.student.count({ where: { gender: 'Male', status: 'Active' } }),
        female: await prisma.student.count({ where: { gender: 'Female', status: 'Active' } }),
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Student Directory</h1>
                <p className="text-muted-foreground text-sm">
                    Manage enrollment and view detailed student records.
                </p>
            </div>

            {/* Simple Stats Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="p-4 border rounded-lg bg-card">
                    <div className="text-sm font-medium text-muted-foreground">Total Active</div>
                    <div className="text-2xl font-bold">{stats.total}</div>
                </div>
                <div className="p-4 border rounded-lg bg-card">
                    <div className="text-sm font-medium text-muted-foreground">Male</div>
                    <div className="text-2xl font-bold">{stats.male}</div>
                </div>
                <div className="p-4 border rounded-lg bg-card">
                    <div className="text-sm font-medium text-muted-foreground">Female</div>
                    <div className="text-2xl font-bold">{stats.female}</div>
                </div>
            </div>

            <Card className="border-sidebar-border shadow-none rounded-md">
                <CardHeader className="flex flex-col sm:flex-row items-center justify-between space-y-0 pb-4 gap-4">
                    <div className="flex flex-1 items-center space-x-2 w-full sm:w-auto">
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <form action="/dashboard/students" method="GET">
                                <Input
                                    name="q"
                                    type="search"
                                    placeholder="Search students..."
                                    className="pl-8 h-9"
                                    defaultValue={query}
                                />
                            </form>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button size="sm" className="h-9">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Student
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl">
                                <DialogHeader>
                                    <DialogTitle>Enroll New Student</DialogTitle>
                                    <DialogDescription>
                                        Fill in the form below to add a new student to the SQL database.
                                    </DialogDescription>
                                </DialogHeader>
                                <AddStudentForm />
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead className="w-[120px]">Student ID</TableHead>
                                <TableHead>Full Name</TableHead>
                                <TableHead>Class</TableHead>
                                <TableHead>Primary Guardian</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {students.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                        No students found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                students.map((student) => (
                                    <TableRow key={student.id}>
                                        <TableCell className="font-mono text-xs font-semibold">
                                            {student.studentId}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {student.firstName} {student.lastName}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="font-normal">
                                                {student.class?.name || 'Unassigned'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {student.guardians[0]?.fullName || 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className={cn(
                                                    "h-2 w-2 rounded-full",
                                                    student.status === 'Active' ? "bg-green-500" : "bg-red-500"
                                                )} />
                                                <span className="text-sm">{student.status}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" asChild>
                                                <Link href={`/dashboard/students/${student.id}`}>View</Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

// Utility for conditional classes
function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
