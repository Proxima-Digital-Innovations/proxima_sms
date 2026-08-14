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
import { PlusCircle, Search, Users, User, Trash2, Edit, UserCheck, UserX } from 'lucide-react';
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
import Image from 'next/image';

export default async function StudentsPage(props: {
    searchParams: Promise<{ q?: string }>;
}) {
    const searchParams = await props.searchParams;
    const query = searchParams.q || '';

    // Fetch students using Prisma with relational links
    const students = await prisma.student.findMany({
        where: {
            OR: [
                { firstName: { contains: query } },
                { lastName: { contains: query } },
                { studentId: { contains: query } },
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
        <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/50 p-6 rounded-3xl border border-slate-800 backdrop-blur-sm shadow-xl shadow-black/10">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Student Directory</h1>
                    <p className="text-slate-400 mt-1">
                        Manage enrollment, view records, and process admissions.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button className="bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/20 transition-all rounded-xl h-10">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Student
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl border-slate-800 bg-slate-950 text-slate-200">
                            <DialogHeader>
                                <div className="mx-auto mb-4">
                                    <Image
                                        src="/school-logo.png"
                                        alt="School OS Logo"
                                        width={250}
                                        height={60}
                                        className="hidden dark:block"
                                    />
                                </div>
                                <DialogTitle className="text-white text-xl">Enroll New Student</DialogTitle>
                                <DialogDescription className="text-slate-400">
                                    Fill in the form below to add a new student and generate their guardian accounts.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="mt-4">
                                <AddStudentForm />
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Simple Stats Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border-indigo-500/20 shadow-none hover:border-indigo-500/40 transition-colors rounded-3xl group">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold tracking-widest uppercase text-indigo-400">Total Active</CardTitle>
                        <div className="p-2 bg-indigo-500/10 rounded-lg group-hover:bg-indigo-500/20 transition-colors"><Users className="h-5 w-5 text-indigo-400" /></div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black text-white">{stats.total}</div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900/60 border-slate-800 shadow-none hover:bg-slate-800/80 transition-colors rounded-3xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold tracking-widest uppercase text-slate-400">Male</CardTitle>
                        <div className="p-2 bg-slate-800 rounded-lg"><User className="h-5 w-5 text-slate-400" /></div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-200">{stats.male}</div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900/60 border-slate-800 shadow-none hover:bg-slate-800/80 transition-colors rounded-3xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold tracking-widest uppercase text-slate-400">Female</CardTitle>
                        <div className="p-2 bg-slate-800 rounded-lg"><User className="h-5 w-5 text-slate-400" /></div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-200">{stats.female}</div>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-slate-900/40 border-slate-800 shadow-none rounded-3xl overflow-hidden backdrop-blur-sm">
                <CardHeader className="border-b border-slate-800 bg-slate-900/50 p-6 flex flex-col md:flex-row gap-4 md:items-center justify-between">
                    <div>
                        <CardTitle className="text-xl font-bold text-white">All Students</CardTitle>
                        <CardDescription className="text-slate-400">
                            Search and manage the student registry.
                        </CardDescription>
                    </div>
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <form action="/dashboard/students" method="GET">
                            <Input
                                name="q"
                                type="search"
                                placeholder="Search by name or ID..."
                                className="pl-10 bg-slate-950/50 border-slate-700 text-slate-200 rounded-xl focus-visible:ring-violet-500 h-10"
                                defaultValue={query}
                            />
                        </form>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-950/50">
                                <TableRow className="border-slate-800 hover:bg-transparent">
                                    <TableHead className="font-bold text-slate-400 py-4 px-6 w-[250px]">Student</TableHead>
                                    <TableHead className="font-bold text-slate-400 py-4 hidden sm:table-cell">Class</TableHead>
                                    <TableHead className="font-bold text-slate-400 py-4 hidden md:table-cell">Primary Guardian</TableHead>
                                    <TableHead className="font-bold text-slate-400 py-4">Status</TableHead>
                                    <TableHead className="text-right font-bold text-slate-400 py-4 px-6">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {students.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-48 text-center text-slate-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <Users className="w-12 h-12 text-slate-700 mb-4" />
                                                <p className="text-lg font-medium text-slate-400">No students found</p>
                                                <p className="text-sm">Try adjusting your search query.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    students.map((student) => (
                                        <TableRow key={student.id} className="border-slate-800/50 hover:bg-slate-800/30 transition-colors group">
                                            <TableCell className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
                                                        {student.firstName?.[0] || 'S'}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-200 group-hover:text-white transition-colors">{student.firstName} {student.lastName}</div>
                                                        <div className="font-mono text-[10px] text-slate-500 mt-1 uppercase tracking-widest">{student.studentId || 'NO ID'}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell py-4">
                                                <Badge variant="outline" className="bg-slate-800 border-slate-700 text-slate-300 font-medium">
                                                    {student.class?.name || 'Unassigned'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell py-4">
                                                <div className="text-sm text-slate-300">
                                                    {student.guardians[0]?.fullName || 'N/A'}
                                                </div>
                                                {student.guardians[0]?.email && (
                                                    <div className="text-xs text-slate-500 mt-0.5">{student.guardians[0].email}</div>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <div className="flex items-center gap-2">
                                                    {student.status === 'Active' ? (
                                                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-medium px-2.5 py-0.5 flex gap-1.5 items-center">
                                                            <UserCheck className="w-3 h-3" /> Active
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/20 font-medium px-2.5 py-0.5 flex gap-1.5 items-center">
                                                            <UserX className="w-3 h-3" /> {student.status}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right px-6 py-4">
                                                <div className="flex justify-end gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                                    <Button asChild variant="outline" size="sm" className="h-8 bg-slate-900 border-slate-700 hover:bg-slate-800 hover:text-white">
                                                        <Link href={`/dashboard/students/${student.id}`}>
                                                            View Profile
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Utility for conditional classes
function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
