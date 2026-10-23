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
import { StudentHeaderActions } from '@/components/dashboard/students/student-header-actions';

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export default async function StudentsPage(props: {
    searchParams: Promise<{ q?: string; page?: string }>;
}) {
    const searchParams = await props.searchParams;
    const query = searchParams.q || '';
    const currentPage = Number(searchParams.page) || 1;
    const pageSize = 10;
    const skip = (currentPage - 1) * pageSize;

    const where = {
        OR: [
            { firstName: { contains: query } },
            { lastName: { contains: query } },
            { studentId: { contains: query } },
        ],
    };

    // Fetch students using Prisma with relational links
    const [students, totalFiltered, totalActive, maleActive, femaleActive] = await Promise.all([
        prisma.student.findMany({
            where,
            include: {
                class: true,
                guardians: true,
            },
            orderBy: {
                lastName: 'asc',
            },
            take: pageSize,
            skip,
        }),
        prisma.student.count({ where }),
        prisma.student.count({ where: { status: 'Active' } }),
        prisma.student.count({ where: { gender: 'Male', status: 'Active' } }),
        prisma.student.count({ where: { gender: 'Female', status: 'Active' } }),
    ]);

    const totalPages = Math.ceil(totalFiltered / pageSize);

    const stats = {
        total: totalActive,
        male: maleActive,
        female: femaleActive,
    };

    return (
        <div className="space-y-6 w-full max-w-full min-w-0">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-background p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-border backdrop-blur-sm shadow-sm w-full min-w-0">
                <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight truncate">Student Directory</h1>
                    <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                        Manage enrollment, view records, and process admissions.
                    </p>
                </div>
                <StudentHeaderActions />
            </div>

            {/* Responsive Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 w-full min-w-0">
                <Card className="col-span-2 sm:col-span-1 bg-background border-border shadow-none hover:bg-muted/50 transition-colors rounded-2xl sm:rounded-3xl group">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3.5 sm:p-6 pb-1 sm:pb-2">
                        <CardTitle className="text-[11px] sm:text-sm font-bold tracking-wider uppercase text-primary">Total Active</CardTitle>
                        <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors"><Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" /></div>
                    </CardHeader>
                    <CardContent className="p-3.5 sm:p-6 pt-0">
                        <div className="text-2xl sm:text-3xl font-black text-foreground">{stats.total}</div>
                    </CardContent>
                </Card>
                <Card className="bg-background border-border shadow-none hover:bg-muted/50 transition-colors rounded-2xl sm:rounded-3xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3.5 sm:p-6 pb-1 sm:pb-2">
                        <CardTitle className="text-[11px] sm:text-sm font-bold tracking-wider uppercase text-muted-foreground">Male</CardTitle>
                        <div className="p-1.5 sm:p-2 bg-muted rounded-lg"><User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" /></div>
                    </CardHeader>
                    <CardContent className="p-3.5 sm:p-6 pt-0">
                        <div className="text-2xl sm:text-3xl font-black text-foreground">{stats.male}</div>
                    </CardContent>
                </Card>
                <Card className="bg-background border-border shadow-none hover:bg-muted/50 transition-colors rounded-2xl sm:rounded-3xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3.5 sm:p-6 pb-1 sm:pb-2">
                        <CardTitle className="text-[11px] sm:text-sm font-bold tracking-wider uppercase text-muted-foreground">Female</CardTitle>
                        <div className="p-1.5 sm:p-2 bg-muted rounded-lg"><User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" /></div>
                    </CardHeader>
                    <CardContent className="p-3.5 sm:p-6 pt-0">
                        <div className="text-2xl sm:text-3xl font-black text-foreground">{stats.female}</div>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-background border-border shadow-none rounded-2xl sm:rounded-3xl overflow-hidden backdrop-blur-sm w-full min-w-0">
                <CardHeader className="border-b border-border bg-background p-4 sm:p-6 flex flex-col sm:flex-row gap-4 sm:items-center justify-between w-full min-w-0">
                    <div>
                        <CardTitle className="text-lg sm:text-xl font-bold text-foreground">All Students</CardTitle>
                        <CardDescription className="text-muted-foreground text-xs sm:text-sm">
                            Search and manage the student registry.
                        </CardDescription>
                    </div>
                    <div className="relative w-full sm:w-72 md:w-80 lg:w-96 min-w-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <form action="/dashboard/students" method="GET">
                            <Input
                                name="q"
                                type="search"
                                placeholder="Search by name or ID..."
                                className="pl-10 bg-background border-border text-foreground rounded-xl focus-visible:ring-violet-500 h-10 w-full"
                                defaultValue={query}
                            />
                        </form>
                    </div>
                </CardHeader>
                <CardContent className="p-0 w-full min-w-0">
                    <div className="overflow-x-auto w-full min-w-0">
                        <Table>
                            <TableHeader className="bg-background">
                                <TableRow className="border-border hover:bg-transparent">
                                    <TableHead className="font-bold text-muted-foreground py-3 sm:py-4 px-3 sm:px-6 min-w-[200px]">Student</TableHead>
                                    <TableHead className="font-bold text-muted-foreground py-3 sm:py-4 hidden sm:table-cell">Class</TableHead>
                                    <TableHead className="font-bold text-muted-foreground py-3 sm:py-4 hidden md:table-cell">Primary Guardian</TableHead>
                                    <TableHead className="font-bold text-muted-foreground py-3 sm:py-4">Status</TableHead>
                                    <TableHead className="text-right font-bold text-muted-foreground py-3 sm:py-4 px-3 sm:px-6 min-w-[100px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {students.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center justify-center">
                                                <Users className="w-12 h-12 text-slate-700 mb-4" />
                                                <p className="text-lg font-medium text-muted-foreground">No students found</p>
                                                <p className="text-sm">Try adjusting your search query.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    students.map((student) => (
                                        <TableRow key={student.id} className="border-border hover:bg-muted transition-colors group">
                                            <TableCell className="px-3 sm:px-6 py-3 sm:py-4">
                                                <div className="flex items-center gap-3 sm:gap-4">
                                                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shrink-0 text-sm sm:text-base">
                                                        {student.firstName?.[0] || 'S'}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-foreground group-hover:text-foreground transition-colors text-sm sm:text-base truncate">
                                                            {student.firstName} {student.lastName}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                                                                {student.studentId || 'NO ID'}
                                                            </span>
                                                            <Badge variant="outline" className="sm:hidden text-[9px] px-1.5 py-0 h-4 bg-muted border-border text-foreground font-medium">
                                                                {student.class?.name || 'Unassigned'}
                                                            </Badge>
                                                        </div>
                                                        <div className="md:hidden text-[11px] text-muted-foreground mt-0.5 truncate">
                                                            {student.guardians[0]?.fullName || ''}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell py-4">
                                                <Badge variant="outline" className="bg-muted border-border text-foreground font-medium">
                                                    {student.class?.name || 'Unassigned'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell py-4">
                                                <div className="text-sm text-foreground">
                                                    {student.guardians[0]?.fullName || 'N/A'}
                                                </div>
                                                {student.guardians[0]?.email && (
                                                    <div className="text-xs text-muted-foreground mt-0.5">{student.guardians[0].email}</div>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-3 sm:py-4">
                                                <div className="flex items-center gap-2">
                                                    {student.status === 'Active' ? (
                                                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-medium px-2 py-0.5 text-[11px] sm:text-xs flex gap-1 items-center">
                                                            <UserCheck className="w-3 h-3" /> Active
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/20 font-medium px-2 py-0.5 text-[11px] sm:text-xs flex gap-1 items-center">
                                                            <UserX className="w-3 h-3" /> {student.status}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right px-3 sm:px-6 py-3 sm:py-4">
                                                <div className="flex justify-end gap-2">
                                                    <Button asChild variant="outline" size="sm" className="h-8 px-2.5 sm:px-3 bg-background border-border hover:bg-muted hover:text-foreground text-xs sm:text-sm font-medium">
                                                        <Link href={`/dashboard/students/${student.id}`}>
                                                            <span className="sm:hidden">View</span>
                                                            <span className="hidden sm:inline">View Profile</span>
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
                    {totalPages > 1 && (
                        <div className="p-4 border-t border-border bg-background flex justify-center">
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious 
                                            href={currentPage > 1 ? `/dashboard/students?q=${query}&page=${currentPage - 1}` : '#'} 
                                            className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                                        />
                                    </PaginationItem>
                                    {[...Array(totalPages)].map((_, i) => (
                                        <PaginationItem key={i}>
                                            <PaginationLink 
                                                href={`/dashboard/students?q=${query}&page=${i + 1}`}
                                                isActive={currentPage === i + 1}
                                            >
                                                {i + 1}
                                            </PaginationLink>
                                        </PaginationItem>
                                    ))}
                                    <PaginationItem>
                                        <PaginationNext 
                                            href={currentPage < totalPages ? `/dashboard/students?q=${query}&page=${currentPage + 1}` : '#'} 
                                            className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// Utility for conditional classes
function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
