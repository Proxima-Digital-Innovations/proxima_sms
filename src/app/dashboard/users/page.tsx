
'use client';

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
import { AddUserForm } from '@/components/dashboard/users/add-user-form';
import { AssignRolesDialog } from '@/components/dashboard/users/assign-roles-dialog';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, Edit, Upload, Users, Briefcase, Shield, Search, Filter } from 'lucide-react';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { getStaffList, deleteStaff } from '@/actions/staff-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { BulkStaffUploadDialog } from '@/components/dashboard/users/bulk-staff-upload-dialog';
import usePersistentState from '@/hooks/use-persistent-state';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export default function UsersPage() {
  const params = useParams();
  
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = usePersistentState('users-add-modal-open', false);
  const [isBulkModalOpen, setIsBulkModalOpen] = usePersistentState('users-bulk-modal-open', false);
  const [selectedUserForRoles, setSelectedUserForRoles] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getStaffList();
      if (result.success) {
        setUsers(result.staff || []);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not fetch users.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const removeUser = async (userId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this staff member? This action cannot be undone.'
      )
    )
      return;
    try {
      const result = await deleteStaff(userId);
      if (result.error) throw new Error(result.error);
      toast({
        title: 'Staff Member Removed',
        description: 'The staff member has been successfully deleted.',
      });
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error('Error removing user:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not remove the staff member.',
      });
    }
  };

  const handleUserAdded = () => {
    fetchUsers();
    setIsAddModalOpen(false);
    setIsBulkModalOpen(false);
  };

  const staffStats = useMemo(() => {
    if (isLoading) return { total: 0, roles: {} };
    const roles: Record<string, number> = {};
    users.forEach(user => {
        roles[user.role] = (roles[user.role] || 0) + 1;
    });
    return {
        total: users.length,
        roles,
    };
  }, [users, isLoading]);

  const filteredUsers = useMemo(() => {
      return users.filter(user => {
          const searchLower = searchQuery.toLowerCase();
          return (
              (user.firstName && user.firstName.toLowerCase().includes(searchLower)) ||
              (user.lastName && user.lastName.toLowerCase().includes(searchLower)) ||
              (user.email && user.email.toLowerCase().includes(searchLower)) ||
              (user.staffId && user.staffId.toLowerCase().includes(searchLower))
          );
      });
  }, [users, searchQuery]);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  useEffect(() => {
      setCurrentPage(1);
  }, [searchQuery]);

  const paginatedUsers = useMemo(() => {
      const start = (currentPage - 1) * pageSize;
      return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize);

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-background p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-border backdrop-blur-sm shadow-sm w-full min-w-0"
      >
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight truncate">Staff Directory</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            Manage your school's faculty, administration, and support staff.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
             <Dialog open={isBulkModalOpen} onOpenChange={setIsBulkModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="bg-background border-border hover:bg-muted hover:text-foreground transition-colors rounded-xl">
                  <Upload className="mr-2 h-4 w-4" /> Bulk Upload
                </Button>
              </DialogTrigger>
              <BulkStaffUploadDialog onUploadComplete={handleUserAdded} />
            </Dialog>
           <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
                <Button className="bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-500/20 transition-all rounded-xl">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Staff
                </Button>
            </DialogTrigger>
             <DialogContent className="max-w-4xl border-border bg-background text-foreground max-h-[90vh] overflow-y-auto w-[95vw] p-4 sm:p-6">
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
                    <DialogTitle className="text-foreground text-xl">Create New Staff Profile</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                       Fill out role assignment, monthly base salary, and biometric attendance parameters to provision a new staff account.
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-4">
                    <AddUserForm onUserAdded={handleUserAdded} />
                </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

       <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 w-full min-w-0">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
            <Card className="bg-background border-border shadow-none hover:bg-muted/50 transition-colors rounded-2xl sm:rounded-3xl group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3.5 sm:p-6 pb-1 sm:pb-2">
                <CardTitle className="text-[11px] sm:text-sm font-bold tracking-wider uppercase text-primary">Total Staff</CardTitle>
                <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors"><Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" /></div>
            </CardHeader>
            <CardContent className="p-3.5 sm:p-6 pt-0">
                {isLoading ? <Skeleton className="h-7 sm:h-8 w-14 sm:w-16 bg-muted" /> : <div className="text-2xl sm:text-4xl font-black text-foreground">{staffStats.total}</div>}
            </CardContent>
            </Card>
        </motion.div>
         
         {Object.entries(staffStats.roles).slice(0, 3).map(([role, count], idx) => (
             <motion.div key={role} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 + (idx * 0.05) }}>
                 <Card className="bg-background border-border shadow-none hover:bg-muted/50 transition-colors rounded-2xl sm:rounded-3xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3.5 sm:p-6 pb-1 sm:pb-2">
                        <CardTitle className="text-[11px] sm:text-sm font-bold tracking-wider uppercase text-muted-foreground truncate">{role}</CardTitle>
                        <Briefcase className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="p-3.5 sm:p-6 pt-0">
                        {isLoading ? <Skeleton className="h-7 sm:h-8 w-14 sm:w-16 bg-muted" /> : <div className="text-2xl sm:text-3xl font-black text-foreground">{count}</div>}
                    </CardContent>
                </Card>
             </motion.div>
         ))}
      </div>


      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-background border-border shadow-none rounded-2xl sm:rounded-3xl overflow-hidden backdrop-blur-sm w-full min-w-0">
            <CardHeader className="border-b border-border bg-background p-4 sm:p-6 flex flex-col sm:flex-row gap-4 sm:items-center justify-between w-full min-w-0">
            <div>
                <CardTitle className="text-lg sm:text-xl font-bold text-foreground">Staff Directory</CardTitle>
                <CardDescription className="text-muted-foreground text-xs sm:text-sm">
                Browse and manage all registered staff members.
                </CardDescription>
            </div>
            
            <div className="relative w-full sm:w-72 md:w-80 lg:w-96 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                    placeholder="Search by name, ID, or email..." 
                    className="pl-10 bg-background border-border text-foreground rounded-xl focus-visible:ring-violet-500 w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            </CardHeader>
            <CardContent className="p-0 w-full min-w-0">
            <div className="overflow-x-auto w-full min-w-0">
                <Table>
                    <TableHeader className="bg-background">
                    <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="font-bold text-muted-foreground py-3 sm:py-4 px-3 sm:px-6 min-w-[200px]">Staff</TableHead>
                        <TableHead className="font-bold text-muted-foreground py-3 sm:py-4 hidden md:table-cell">Contact</TableHead>
                        <TableHead className="font-bold text-muted-foreground py-3 sm:py-4 hidden lg:table-cell">Role & Status</TableHead>
                        <TableHead className="text-right font-bold text-muted-foreground py-4 px-6">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i} className="border-border">
                            <TableCell className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-10 w-10 rounded-xl bg-muted" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-32 bg-muted" />
                                        <Skeleton className="h-3 w-20 bg-muted" />
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell py-4">
                                <Skeleton className="h-4 w-48 bg-muted" />
                            </TableCell>
                            <TableCell className="hidden lg:table-cell py-4">
                                <Skeleton className="h-6 w-24 rounded-full bg-muted" />
                            </TableCell>
                            <TableCell className="text-right px-6 py-4">
                                <Skeleton className="ml-auto h-8 w-32 bg-muted rounded-lg" />
                            </TableCell>
                        </TableRow>
                        ))
                    ) : filteredUsers.length === 0 ? (
                        <TableRow>
                        <TableCell
                            colSpan={4}
                            className="h-48 text-center text-muted-foreground"
                        >
                            <div className="flex flex-col items-center justify-center">
                                <Users className="w-12 h-12 text-slate-700 mb-4" />
                                <p className="text-lg font-medium text-muted-foreground">No staff found</p>
                                <p className="text-sm">Try adjusting your search query.</p>
                            </div>
                        </TableCell>
                        </TableRow>
                    ) : (
                        paginatedUsers.map((user) => (
                        <TableRow key={user.id} className="border-border hover:bg-muted transition-colors group">
                            <TableCell className="px-3 sm:px-6 py-3 sm:py-4">
                                <div className="flex items-center gap-3 sm:gap-4">
                                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold shadow-md shrink-0 text-sm sm:text-base">
                                        {user.firstName?.[0] || 'S'}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-bold text-foreground group-hover:text-foreground transition-colors text-sm sm:text-base truncate">
                                            {user.firstName} {user.lastName}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                                                {user.staffId || 'NO ID'}
                                            </span>
                                            <Badge variant="outline" className="lg:hidden text-[9px] px-1.5 py-0 h-4 bg-muted border-border font-medium">
                                                {user.role}
                                            </Badge>
                                        </div>
                                        <div className="md:hidden text-[11px] text-muted-foreground mt-0.5 truncate">
                                            {user.email}
                                        </div>
                                        <div className="lg:hidden text-[11px] font-mono font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
                                            ₦{(user.baseSalary || 0).toLocaleString()} /mo
                                        </div>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell py-4">
                                <div className="text-sm text-muted-foreground">{user.email}</div>
                                {user.phone && <div className="text-xs text-muted-foreground mt-1">{user.phone}</div>}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell py-4">
                                <div className="flex flex-col gap-1 items-start">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <Badge variant="outline" className={`
                                            ${user.role === 'ADMIN' ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' : ''}
                                            ${user.role === 'TEACHER' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : ''}
                                            ${user.role === 'SLT' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : ''}
                                            ${user.role === 'HOD' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : ''}
                                            ${user.role === 'ACCOUNTANT' ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : ''}
                                            ${user.role === 'EXAM_OFFICER' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : ''}
                                        `}>
                                            {user.role}
                                        </Badge>
                                        {user.department && (
                                            <span className="text-[11px] font-medium text-muted-foreground">({user.department.name})</span>
                                        )}
                                    </div>
                                    <div className="text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400">
                                        ₦{(user.baseSalary || 0).toLocaleString()} /mo
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="text-right px-3 sm:px-6 py-3 sm:py-4">
                                <div className="flex justify-end gap-1 sm:gap-2">
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        className="h-8 px-2 sm:px-3 bg-background border-border hover:bg-muted hover:text-foreground"
                                        title="Assign Roles"
                                        onClick={() => setSelectedUserForRoles(user)}
                                    >
                                        <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500 sm:mr-1.5" />
                                        <span className="hidden sm:inline text-xs">Roles</span>
                                    </Button>
                                    <Button asChild variant="outline" size="sm" className="h-8 px-2 sm:px-3 bg-background border-border hover:bg-muted hover:text-foreground">
                                        <Link href={`/dashboard/users/${user.id}`} title="Edit">
                                            <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-400 sm:mr-1.5" />
                                            <span className="hidden sm:inline text-xs">Edit</span>
                                        </Link>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-2 bg-background border-border hover:bg-rose-900/50 hover:text-rose-400 hover:border-rose-500/50"
                                        title="Delete Staff"
                                        onClick={() => removeUser(user.id)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                            </PaginationItem>
                            {[...Array(totalPages)].map((_, i) => (
                                <PaginationItem key={i}>
                                    <PaginationLink 
                                        onClick={() => setCurrentPage(i + 1)}
                                        isActive={currentPage === i + 1}
                                        className="cursor-pointer"
                                    >
                                        {i + 1}
                                    </PaginationLink>
                                </PaginationItem>
                            ))}
                            <PaginationItem>
                                <PaginationNext 
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}
            </CardContent>
          </Card>
      </motion.div>

      <AssignRolesDialog 
        user={selectedUserForRoles}
        isOpen={!!selectedUserForRoles}
        onOpenChange={(open) => !open && setSelectedUserForRoles(null)}
        onSuccess={fetchUsers}
      />
    </div>
  );
}
