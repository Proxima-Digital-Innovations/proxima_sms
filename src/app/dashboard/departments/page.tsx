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
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Library, Users, Search, Building2, AlertTriangle, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AddDepartmentForm } from '@/components/dashboard/departments/add-department-form';
import { EditDepartmentDialog } from '@/components/dashboard/departments/edit-department-dialog';
import { getDepartmentsData } from '@/actions/academic-data';
import { deleteDepartment } from '@/actions/user-actions';
import usePersistentState from '@/hooks/use-persistent-state';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

type Department = {
  id: string;
  name: string;
  hodId?: string | null;
  hodName?: string;
  teacherCount?: number;
  studentCount?: number;
};

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = usePersistentState('departments-modal-open', false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptForEdit, setSelectedDeptForEdit] = useState<Department | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDeptForDelete, setSelectedDeptForDelete] = useState<Department | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const fetchDepartments = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getDepartmentsData();
      if (response.success && response.data) {
          setDepartments(response.data);
      } else {
          throw new Error(response.error || "Failed to fetch");
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch department data.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleDepartmentAdded = () => {
    fetchDepartments();
    setIsModalOpen(false);
  };
  
  const handleEdit = (dept: Department) => {
    setSelectedDeptForEdit(dept);
    setIsEditModalOpen(true);
  };
  
  const handleDelete = (dept: Department) => {
    setSelectedDeptForDelete(dept);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedDeptForDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteDepartment(selectedDeptForDelete.id);
      if (!res.success) {
        throw new Error(res.error || 'Failed to delete department');
      }
      toast({
        title: 'Department Deleted',
        description: `The "${selectedDeptForDelete.name}" department has been removed.`,
      });
      setIsDeleteModalOpen(false);
      setSelectedDeptForDelete(null);
      fetchDepartments();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: err.message || 'Could not delete department.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredDepartments = useMemo(() => {
      return departments.filter(dept => 
          dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (dept.hodName && dept.hodName.toLowerCase().includes(searchQuery.toLowerCase()))
      );
  }, [departments, searchQuery]);

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-background p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-border backdrop-blur-sm shadow-sm w-full min-w-0"
      >
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Departments</h1>
          <p className="text-muted-foreground mt-1">
            Manage academic departments, assign HODs, and monitor metrics.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/20 transition-all rounded-xl h-10">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Department
              </Button>
            </DialogTrigger>
            <DialogContent className="border-border bg-background text-foreground max-w-md w-[95vw] rounded-2xl p-6">
              <DialogHeader>
                <DialogTitle className="text-foreground text-xl font-bold">Add New Department</DialogTitle>
                <DialogDescription className="text-muted-foreground text-xs sm:text-sm">
                  Create a new department and optionally assign a Head of Department (HOD).
                </DialogDescription>
              </DialogHeader>
              <div>
                  <AddDepartmentForm onDepartmentAdded={handleDepartmentAdded} />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-background border-border shadow-none rounded-3xl overflow-hidden backdrop-blur-sm">
            <CardHeader className="border-b border-border bg-background p-6 flex flex-col md:flex-row gap-4 md:items-center justify-between">
            <div>
                <CardTitle className="text-xl font-bold text-foreground">All Departments</CardTitle>
                <CardDescription className="text-muted-foreground">
                A list of all departments in the school.
                </CardDescription>
            </div>
            
            <div className="relative w-full sm:w-72 md:w-80 lg:w-96 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                    placeholder="Search departments or HODs..." 
                    className="pl-10 bg-background border-border text-foreground rounded-xl focus-visible:ring-violet-500 h-10 w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            </CardHeader>
            <CardContent className="p-0">
            <div className="overflow-x-auto w-full min-w-0">
                <Table>
                    <TableHeader className="bg-background">
                    <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="font-bold text-muted-foreground py-4 px-6">Department Name</TableHead>
                        <TableHead className="font-bold text-muted-foreground py-4">Head of Department</TableHead>
                        <TableHead className="font-bold text-muted-foreground py-4 hidden md:table-cell">Staff</TableHead>
                        <TableHead className="font-bold text-muted-foreground py-4 hidden md:table-cell">Students</TableHead>
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
                                    <Skeleton className="h-5 w-32 bg-muted" />
                                </div>
                            </TableCell>
                            <TableCell className="py-4">
                                <Skeleton className="h-5 w-40 bg-muted" />
                            </TableCell>
                            <TableCell className="hidden md:table-cell py-4">
                                <Skeleton className="h-6 w-16 rounded-full bg-muted" />
                            </TableCell>
                            <TableCell className="hidden md:table-cell py-4">
                                <Skeleton className="h-6 w-16 rounded-full bg-muted" />
                            </TableCell>
                            <TableCell className="text-right px-6 py-4">
                                <Skeleton className="ml-auto h-8 w-8 rounded-lg bg-muted" />
                            </TableCell>
                        </TableRow>
                        ))
                    ) : filteredDepartments.length > 0 ? (
                        filteredDepartments.map((dept) => (
                        <TableRow key={dept.id} className="border-border hover:bg-muted transition-colors group">
                            <TableCell className="px-6 py-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold shadow-md">
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <span className="font-bold text-foreground group-hover:text-foreground transition-colors">{dept.name}</span>
                                </div>
                            </TableCell>
                            <TableCell className="py-4">
                                <div className="flex items-center gap-2">
                                    {dept.hodName ? (
                                        <span className="font-medium text-foreground">{dept.hodName}</span>
                                    ) : (
                                        <Badge variant="outline" className="bg-muted border-border text-muted-foreground font-medium italic">Unassigned</Badge>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell py-4">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Library className="w-4 h-4" />
                                    <span className="font-mono">{dept.teacherCount || 0}</span>
                                </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell py-4">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Users className="w-4 h-4" />
                                    <span className="font-mono">{dept.studentCount || 0}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-right px-6 py-4">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="hover:bg-muted hover:text-foreground">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 bg-background border-border text-foreground">
                                    <DropdownMenuItem onClick={() => handleEdit(dept)} className="hover:bg-muted focus:bg-muted hover:text-foreground cursor-pointer">
                                        <Edit className="mr-2 h-4 w-4 text-blue-400" /> Edit Department
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDelete(dept)} className="text-rose-400 hover:bg-rose-900/20 focus:bg-rose-900/20 hover:text-rose-300 focus:text-rose-300 cursor-pointer">
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete Department
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            </TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                        <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                            <div className="flex flex-col items-center justify-center">
                                <Building2 className="w-12 h-12 text-slate-700 mb-4" />
                                <p className="text-lg font-medium text-muted-foreground">No departments found.</p>
                                <p className="text-sm">Create your first academic department.</p>
                            </div>
                        </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
            </div>
            </CardContent>
          </Card>
      </motion.div>

      {/* Edit Department Modal */}
      <EditDepartmentDialog
        department={selectedDeptForEdit}
        isOpen={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onDepartmentUpdated={fetchDepartments}
      />

      {/* Delete Department Confirmation Dialog */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="border-border bg-background text-foreground max-w-md w-[95vw] rounded-2xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-foreground text-xl font-bold">Delete Department</DialogTitle>
                <DialogDescription className="text-muted-foreground text-xs sm:text-sm mt-0.5">
                  This action cannot be undone.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground">
            Are you sure you want to delete the department <span className="font-semibold text-foreground">"{selectedDeptForDelete?.name}"</span>?
            Any associated staff members and subjects will be unlinked.
          </div>
          <DialogFooter className="pt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-border hover:bg-muted"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Department
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
