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
import {
  PlusCircle,
  MoreHorizontal,
  Edit,
  Trash2,
  Library,
  Users,
  Search,
  Building2,
  AlertTriangle,
  Loader2,
  School,
  GraduationCap,
} from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AddDepartmentForm } from '@/components/dashboard/departments/add-department-form';
import { EditDepartmentDialog } from '@/components/dashboard/departments/edit-department-dialog';
import { getDepartmentsData } from '@/actions/academic-data';
import { deleteDepartment, createFacultyQuick, deleteFacultyQuick } from '@/actions/user-actions';
import usePersistentState from '@/hooks/use-persistent-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

type Department = {
  id: string;
  name: string;
  hodId?: string | null;
  hodName?: string;
  facultyId?: string | null;
  facultyName?: string;
  facultyCode?: string;
  teacherCount?: number;
  studentCount?: number;
  programCount?: number;
};

type FacultyItem = {
  id: string;
  code: string;
  name: string;
  campusName?: string;
  deanName?: string;
  departmentCount: number;
  programCount: number;
};

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [faculties, setFaculties] = useState<FacultyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = usePersistentState('departments-modal-open', false);
  const [isFacultyModalOpen, setIsFacultyModalOpen] = useState(false);
  const [facultyCode, setFacultyCode] = useState('');
  const [facultyName, setFacultyName] = useState('');
  const [isCreatingFaculty, setIsCreatingFaculty] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFacultyFilter, setSelectedFacultyFilter] = useState<string>('ALL');
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
        setFaculties(response.faculties || []);
      } else {
        throw new Error(response.error || 'Failed to fetch');
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not fetch faculty and department data.',
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

  const handleCreateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facultyCode.trim() || !facultyName.trim()) return;
    setIsCreatingFaculty(true);
    try {
      const res = await createFacultyQuick({
        code: facultyCode,
        name: facultyName,
      });
      if (!res.success) {
        throw new Error(res.error || 'Failed to create faculty');
      }
      toast({
        title: 'Faculty Created',
        description: `[${facultyCode.toUpperCase()}] ${facultyName} has been added.`,
      });
      setFacultyCode('');
      setFacultyName('');
      setIsFacultyModalOpen(false);
      fetchDepartments();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error Creating Faculty',
        description: err.message || 'Could not create faculty.',
      });
    } finally {
      setIsCreatingFaculty(false);
    }
  };

  const handleDeleteFaculty = async (faculty: FacultyItem) => {
    try {
      const res = await deleteFacultyQuick(faculty.id);
      if (!res.success) {
        throw new Error(res.error || 'Failed to delete faculty');
      }
      toast({
        title: 'Faculty Removed',
        description: `"${faculty.name}" was removed and its departments unlinked.`,
      });
      if (selectedFacultyFilter === faculty.id) {
        setSelectedFacultyFilter('ALL');
      }
      fetchDepartments();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: err.message || 'Could not delete faculty.',
      });
    }
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
    return departments.filter((dept) => {
      const matchesFaculty =
        selectedFacultyFilter === 'ALL' ||
        (selectedFacultyFilter === 'UNASSIGNED' && !dept.facultyId) ||
        dept.facultyId === selectedFacultyFilter;

      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        dept.name.toLowerCase().includes(q) ||
        (dept.hodName && dept.hodName.toLowerCase().includes(q)) ||
        (dept.facultyName && dept.facultyName.toLowerCase().includes(q)) ||
        (dept.facultyCode && dept.facultyCode.toLowerCase().includes(q));

      return matchesFaculty && matchesSearch;
    });
  }, [departments, searchQuery, selectedFacultyFilter]);

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-background p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-border backdrop-blur-sm shadow-sm w-full min-w-0"
      >
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
            Faculties &amp; Departments
          </h1>
          <p className="text-muted-foreground mt-1">
            Create collegiate faculties, organize academic departments under faculties, and assign HODs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Add Faculty Dialog */}
          <Dialog open={isFacultyModalOpen} onOpenChange={setIsFacultyModalOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 rounded-xl h-10 font-semibold"
              >
                <School className="mr-2 h-4 w-4" /> Add Faculty
              </Button>
            </DialogTrigger>
            <DialogContent className="border-border bg-background text-foreground max-w-md w-[95vw] rounded-2xl p-6">
              <DialogHeader>
                <DialogTitle className="text-foreground text-xl font-bold">
                  Create Academic Faculty / College
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-xs sm:text-sm">
                  Register a faculty or school (e.g. Faculty of Computing, Faculty of Science) to group your departments.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateFaculty} className="space-y-4 pt-3">
                <div className="space-y-1.5">
                  <Label htmlFor="faculty-code">Faculty Code (Short Acronym)</Label>
                  <Input
                    id="faculty-code"
                    placeholder="e.g. FCI, FSCI, FENG, FMS"
                    value={facultyCode}
                    onChange={(e) => setFacultyCode(e.target.value.toUpperCase())}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="faculty-name">Faculty Full Name</Label>
                  <Input
                    id="faculty-name"
                    placeholder="e.g. Faculty of Computing & Informatics"
                    value={facultyName}
                    onChange={(e) => setFacultyName(e.target.value)}
                    required
                  />
                </div>
                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsFacultyModalOpen(false)}
                    disabled={isCreatingFaculty}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    disabled={isCreatingFaculty}
                  >
                    {isCreatingFaculty ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                      </>
                    ) : (
                      <>
                        <PlusCircle className="mr-2 h-4 w-4" /> Create Faculty
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Add Department Dialog */}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/20 transition-all rounded-xl h-10">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Department
              </Button>
            </DialogTrigger>
            <DialogContent className="border-border bg-background text-foreground max-w-md w-[95vw] rounded-2xl p-6">
              <DialogHeader>
                <DialogTitle className="text-foreground text-xl font-bold">
                  Add New Department
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-xs sm:text-sm">
                  Create a new department, link it to a Faculty, and optionally assign a Head of Department (HOD).
                </DialogDescription>
              </DialogHeader>
              <div>
                <AddDepartmentForm
                  onDepartmentAdded={handleDepartmentAdded}
                  faculties={faculties}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Faculties Overview Strip */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-background border-border shadow-none rounded-3xl overflow-hidden">
          <CardHeader className="border-b border-border bg-muted/20 px-6 py-4 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <School className="h-5 w-5 text-indigo-600" />
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  Collegiate Faculties ({faculties.length})
                </CardTitle>
                <CardDescription className="text-xs">
                  Click any faculty card to filter its departments, or click &quot;Add Faculty&quot; above to create one.
                </CardDescription>
              </div>
            </div>
            {selectedFacultyFilter !== 'ALL' && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-8"
                onClick={() => setSelectedFacultyFilter('ALL')}
              >
                Show All ({departments.length})
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-4">
            {faculties.length === 0 ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-4 px-3 rounded-2xl border border-dashed border-border bg-muted/10">
                <div className="text-xs text-muted-foreground">
                  No faculties created yet. Create your first faculty (e.g., <span className="font-semibold text-foreground">Faculty of Computing</span>, <span className="font-semibold text-foreground">Faculty of Science</span>) to group your departments.
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsFacultyModalOpen(true)}
                  className="shrink-0 rounded-xl"
                >
                  <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Create First Faculty
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {faculties.map((f) => {
                  const isSelected = selectedFacultyFilter === f.id;
                  return (
                    <div
                      key={f.id}
                      onClick={() =>
                        setSelectedFacultyFilter(isSelected ? 'ALL' : f.id)
                      }
                      className={`cursor-pointer p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-500/10 shadow-sm'
                          : 'border-border bg-card hover:border-indigo-500/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Badge
                          variant="outline"
                          className="font-mono text-[11px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20"
                        >
                          {f.code}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-rose-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFaculty(f);
                          }}
                          title="Delete Faculty"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div>
                        <div className="font-bold text-sm text-foreground line-clamp-1">
                          {f.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {f.departmentCount} Department{f.departmentCount === 1 ? '' : 's'} &bull; {f.programCount} Program{f.programCount === 1 ? '' : 's'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* All Departments Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="bg-background border-border shadow-none rounded-3xl overflow-hidden backdrop-blur-sm">
          <CardHeader className="border-b border-border bg-background p-6 flex flex-col md:flex-row gap-4 md:items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-foreground">
                All Departments ({filteredDepartments.length})
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Academic departments, their parent Faculty, and assigned Heads of Department (HODs).
              </CardDescription>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              <Select
                value={selectedFacultyFilter}
                onValueChange={setSelectedFacultyFilter}
              >
                <SelectTrigger className="w-full sm:w-56 rounded-xl h-10">
                  <SelectValue placeholder="Filter by Faculty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Faculties</SelectItem>
                  <SelectItem value="UNASSIGNED">General / No Faculty</SelectItem>
                  {faculties.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      [{f.code}] {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative w-full sm:w-72 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search departments, faculties, HODs..."
                  className="pl-10 bg-background border-border text-foreground rounded-xl focus-visible:ring-violet-500 h-10 w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto w-full min-w-0">
              <Table>
                <TableHeader className="bg-background">
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="font-bold text-muted-foreground py-4 px-6">
                      Department Name
                    </TableHead>
                    <TableHead className="font-bold text-muted-foreground py-4">
                      Parent Faculty
                    </TableHead>
                    <TableHead className="font-bold text-muted-foreground py-4">
                      Head of Department
                    </TableHead>
                    <TableHead className="font-bold text-muted-foreground py-4 hidden md:table-cell">
                      Staff
                    </TableHead>
                    <TableHead className="font-bold text-muted-foreground py-4 hidden md:table-cell">
                      Courses / Subjects
                    </TableHead>
                    <TableHead className="text-right font-bold text-muted-foreground py-4 px-6">
                      Actions
                    </TableHead>
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
                          <Skeleton className="h-5 w-36 bg-muted" />
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
                      <TableRow
                        key={dept.id}
                        className="border-border hover:bg-muted transition-colors group"
                      >
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold shadow-md">
                              <Building2 className="w-5 h-5" />
                            </div>
                            <span className="font-bold text-foreground group-hover:text-foreground transition-colors">
                              {dept.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          {dept.facultyName ? (
                            <Badge
                              variant="outline"
                              className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20 font-medium"
                            >
                              <School className="w-3 h-3 mr-1.5" />
                              {dept.facultyCode ? `[${dept.facultyCode}] ` : ''}
                              {dept.facultyName}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-muted border-border text-muted-foreground font-normal italic"
                            >
                              Unassigned
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            {dept.hodName ? (
                              <span className="font-medium text-foreground">
                                {dept.hodName}
                              </span>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-muted border-border text-muted-foreground font-medium italic"
                              >
                                Unassigned
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell py-4">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="w-4 h-4" />
                            <span className="font-mono">{dept.teacherCount || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell py-4">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <GraduationCap className="w-4 h-4" />
                            <span className="font-mono">
                              {(dept.programCount || 0) + (dept.studentCount || 0)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right px-6 py-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="hover:bg-muted hover:text-foreground"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-48 bg-background border-border text-foreground"
                            >
                              <DropdownMenuItem
                                onClick={() => handleEdit(dept)}
                                className="hover:bg-muted focus:bg-muted hover:text-foreground cursor-pointer"
                              >
                                <Edit className="mr-2 h-4 w-4 text-blue-400" /> Edit Department
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(dept)}
                                className="text-rose-400 hover:bg-rose-900/20 focus:bg-rose-900/20 hover:text-rose-300 focus:text-rose-300 cursor-pointer"
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Department
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-48 text-center text-muted-foreground"
                      >
                        <div className="flex flex-col items-center justify-center">
                          <Building2 className="w-12 h-12 text-slate-700 mb-4" />
                          <p className="text-lg font-medium text-muted-foreground">
                            No departments found.
                          </p>
                          <p className="text-sm">
                            Create your first academic department or adjust your filter.
                          </p>
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
        faculties={faculties}
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
                <DialogTitle className="text-foreground text-xl font-bold">
                  Delete Department
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-xs sm:text-sm mt-0.5">
                  This action cannot be undone.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground">
            Are you sure you want to delete the department{' '}
            <span className="font-semibold text-foreground">
              &quot;{selectedDeptForDelete?.name}&quot;
            </span>
            ? Any associated staff members and subjects will be unlinked.
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
