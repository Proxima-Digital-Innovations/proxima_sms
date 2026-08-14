
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

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/50 p-6 rounded-3xl border border-slate-800 backdrop-blur-sm"
      >
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Staff Directory</h1>
          <p className="text-slate-400 mt-1">
            Manage your school's faculty, administration, and support staff.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
             <Dialog open={isBulkModalOpen} onOpenChange={setIsBulkModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="bg-slate-950 border-slate-800 hover:bg-slate-800 hover:text-white transition-colors rounded-xl">
                  <Upload className="mr-2 h-4 w-4" /> Bulk Upload
                </Button>
              </DialogTrigger>
              <BulkStaffUploadDialog onUploadComplete={handleUserAdded} />
            </Dialog>
           <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
                <Button className="bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/20 transition-all rounded-xl">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Staff
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
                    <DialogTitle className="text-white text-xl">Create New Staff Profile</DialogTitle>
                    <DialogDescription className="text-slate-400">
                       Fill out the details to create a new staff account. The default password will be their State of Origin.
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-4">
                    <AddUserForm onUserAdded={handleUserAdded} />
                </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

       <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
            <Card className="bg-gradient-to-br from-violet-900/40 to-slate-900 border-violet-500/20 shadow-none hover:border-violet-500/40 transition-colors rounded-3xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold tracking-widest uppercase text-violet-400">Total Staff</CardTitle>
                <div className="p-2 bg-violet-500/10 rounded-lg"><Users className="h-5 w-5 text-violet-400" /></div>
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-8 w-16 bg-slate-800" /> : <div className="text-4xl font-black text-white">{staffStats.total}</div>}
            </CardContent>
            </Card>
        </motion.div>
         
         {Object.entries(staffStats.roles).slice(0, 3).map(([role, count], idx) => (
             <motion.div key={role} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 + (idx * 0.05) }}>
                 <Card className="bg-slate-900/60 border-slate-800 shadow-none hover:bg-slate-800/80 transition-colors rounded-3xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold tracking-widest uppercase text-slate-400">{role}</CardTitle>
                        <Briefcase className="h-4 w-4 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-16 bg-slate-800" /> : <div className="text-3xl font-black text-slate-200">{count}</div>}
                    </CardContent>
                </Card>
             </motion.div>
         ))}
      </div>


      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-slate-900/40 border-slate-800 shadow-none rounded-3xl overflow-hidden backdrop-blur-sm">
            <CardHeader className="border-b border-slate-800 bg-slate-900/50 p-6 flex flex-col md:flex-row gap-4 md:items-center justify-between">
            <div>
                <CardTitle className="text-xl font-bold text-white">Staff Directory</CardTitle>
                <CardDescription className="text-slate-400">
                Browse and manage all registered staff members.
                </CardDescription>
            </div>
            
            <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input 
                    placeholder="Search by name, ID, or email..." 
                    className="pl-10 bg-slate-950/50 border-slate-700 text-slate-200 rounded-xl focus-visible:ring-violet-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            </CardHeader>
            <CardContent className="p-0">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-slate-950/50">
                    <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead className="font-bold text-slate-400 py-4 px-6">Staff</TableHead>
                        <TableHead className="font-bold text-slate-400 py-4 hidden md:table-cell">Contact</TableHead>
                        <TableHead className="font-bold text-slate-400 py-4 hidden lg:table-cell">Role & Status</TableHead>
                        <TableHead className="text-right font-bold text-slate-400 py-4 px-6">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i} className="border-slate-800/50">
                            <TableCell className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-10 w-10 rounded-xl bg-slate-800" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-32 bg-slate-800" />
                                        <Skeleton className="h-3 w-20 bg-slate-800" />
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell py-4">
                                <Skeleton className="h-4 w-48 bg-slate-800" />
                            </TableCell>
                            <TableCell className="hidden lg:table-cell py-4">
                                <Skeleton className="h-6 w-24 rounded-full bg-slate-800" />
                            </TableCell>
                            <TableCell className="text-right px-6 py-4">
                                <Skeleton className="ml-auto h-8 w-32 bg-slate-800 rounded-lg" />
                            </TableCell>
                        </TableRow>
                        ))
                    ) : filteredUsers.length === 0 ? (
                        <TableRow>
                        <TableCell
                            colSpan={4}
                            className="h-48 text-center text-slate-500"
                        >
                            <div className="flex flex-col items-center justify-center">
                                <Users className="w-12 h-12 text-slate-700 mb-4" />
                                <p className="text-lg font-medium text-slate-400">No staff found</p>
                                <p className="text-sm">Try adjusting your search query.</p>
                            </div>
                        </TableCell>
                        </TableRow>
                    ) : (
                        filteredUsers.map((user) => (
                        <TableRow key={user.id} className="border-slate-800/50 hover:bg-slate-800/30 transition-colors group">
                            <TableCell className="px-6 py-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold shadow-md">
                                        {user.firstName?.[0] || 'S'}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-200 group-hover:text-white transition-colors">{user.firstName} {user.lastName}</div>
                                        <div className="font-mono text-[10px] text-slate-500 mt-1 uppercase tracking-widest">{user.staffId || 'NO ID'}</div>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell py-4">
                                <div className="text-sm text-slate-400">{user.email}</div>
                                {user.phone && <div className="text-xs text-slate-500 mt-1">{user.phone}</div>}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell py-4">
                                <Badge variant="outline" className={`
                                    ${user.role === 'ADMIN' ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' : ''}
                                    ${user.role === 'TEACHER' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : ''}
                                    ${user.role === 'SLT' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : ''}
                                    ${user.role === 'HOD' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : ''}
                                `}>
                                    {user.role}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right px-6 py-4">
                                <div className="flex justify-end gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        className="h-8 bg-slate-900 border-slate-700 hover:bg-slate-800 hover:text-white"
                                        title="Assign Roles"
                                        onClick={() => setSelectedUserForRoles(user)}
                                    >
                                        <Shield className="h-4 w-4 mr-2 text-amber-500" />
                                        Roles
                                    </Button>
                                    <Button asChild variant="outline" size="sm" className="h-8 bg-slate-900 border-slate-700 hover:bg-slate-800 hover:text-white">
                                        <Link href={`/dashboard/users/${user.id}`}>
                                            <Edit className="h-4 w-4 mr-2 text-blue-400" />
                                            Edit
                                        </Link>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 bg-slate-900 border-slate-700 hover:bg-rose-900/50 hover:text-rose-400 hover:border-rose-500/50"
                                        onClick={() => removeUser(user.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
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
