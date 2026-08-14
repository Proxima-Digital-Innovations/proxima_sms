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
import { PlusCircle, MoreHorizontal, Edit, Trash2, Library, Users, Search, Building2 } from 'lucide-react';
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
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AddDepartmentForm } from '@/components/dashboard/departments/add-department-form';
import { getDepartmentsData } from '@/actions/academic-data';
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
    toast({ title: "Note", description: `Edit functionality for ${dept.name} coming soon.` });
  };
  
  const handleDelete = (dept: Department) => {
    toast({ title: "Note", description: `Delete functionality for ${dept.name} coming soon.` });
  };

  const filteredDepartments = useMemo(() => {
      return departments.filter(dept => 
          dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (dept.hodName && dept.hodName.toLowerCase().includes(searchQuery.toLowerCase()))
      );
  }, [departments, searchQuery]);

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/50 p-6 rounded-3xl border border-slate-800 backdrop-blur-sm shadow-xl shadow-black/10"
      >
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Departments</h1>
          <p className="text-slate-400 mt-1">
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
            <DialogContent className="border-slate-800 bg-slate-950 text-slate-200">
              <DialogHeader>
                <DialogTitle className="text-white text-xl">Add New Department</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Create a new department and optionally assign a Head of Department (HOD).
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4">
                  <AddDepartmentForm onDepartmentAdded={handleDepartmentAdded} />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-slate-900/40 border-slate-800 shadow-none rounded-3xl overflow-hidden backdrop-blur-sm">
            <CardHeader className="border-b border-slate-800 bg-slate-900/50 p-6 flex flex-col md:flex-row gap-4 md:items-center justify-between">
            <div>
                <CardTitle className="text-xl font-bold text-white">All Departments</CardTitle>
                <CardDescription className="text-slate-400">
                A list of all departments in the school.
                </CardDescription>
            </div>
            
            <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input 
                    placeholder="Search departments or HODs..." 
                    className="pl-10 bg-slate-950/50 border-slate-700 text-slate-200 rounded-xl focus-visible:ring-violet-500 h-10"
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
                        <TableHead className="font-bold text-slate-400 py-4 px-6">Department Name</TableHead>
                        <TableHead className="font-bold text-slate-400 py-4">Head of Department</TableHead>
                        <TableHead className="font-bold text-slate-400 py-4 hidden md:table-cell">Staff</TableHead>
                        <TableHead className="font-bold text-slate-400 py-4 hidden md:table-cell">Students</TableHead>
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
                                    <Skeleton className="h-5 w-32 bg-slate-800" />
                                </div>
                            </TableCell>
                            <TableCell className="py-4">
                                <Skeleton className="h-5 w-40 bg-slate-800" />
                            </TableCell>
                            <TableCell className="hidden md:table-cell py-4">
                                <Skeleton className="h-6 w-16 rounded-full bg-slate-800" />
                            </TableCell>
                            <TableCell className="hidden md:table-cell py-4">
                                <Skeleton className="h-6 w-16 rounded-full bg-slate-800" />
                            </TableCell>
                            <TableCell className="text-right px-6 py-4">
                                <Skeleton className="ml-auto h-8 w-8 rounded-lg bg-slate-800" />
                            </TableCell>
                        </TableRow>
                        ))
                    ) : filteredDepartments.length > 0 ? (
                        filteredDepartments.map((dept) => (
                        <TableRow key={dept.id} className="border-slate-800/50 hover:bg-slate-800/30 transition-colors group">
                            <TableCell className="px-6 py-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold shadow-md">
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <span className="font-bold text-slate-200 group-hover:text-white transition-colors">{dept.name}</span>
                                </div>
                            </TableCell>
                            <TableCell className="py-4">
                                <div className="flex items-center gap-2">
                                    {dept.hodName ? (
                                        <span className="font-medium text-slate-300">{dept.hodName}</span>
                                    ) : (
                                        <Badge variant="outline" className="bg-slate-800 border-slate-700 text-slate-400 font-medium italic">Unassigned</Badge>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell py-4">
                                <div className="flex items-center gap-2 text-slate-400">
                                    <Library className="w-4 h-4" />
                                    <span className="font-mono">{dept.teacherCount || 0}</span>
                                </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell py-4">
                                <div className="flex items-center gap-2 text-slate-400">
                                    <Users className="w-4 h-4" />
                                    <span className="font-mono">{dept.studentCount || 0}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-right px-6 py-4">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="hover:bg-slate-800 hover:text-white">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 bg-slate-900 border-slate-800 text-slate-300">
                                    <DropdownMenuItem onClick={() => handleEdit(dept)} className="hover:bg-slate-800 focus:bg-slate-800 hover:text-white cursor-pointer">
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
                        <TableCell colSpan={5} className="h-48 text-center text-slate-500">
                            <div className="flex flex-col items-center justify-center">
                                <Building2 className="w-12 h-12 text-slate-700 mb-4" />
                                <p className="text-lg font-medium text-slate-400">No departments found.</p>
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
    </div>
  );
}
