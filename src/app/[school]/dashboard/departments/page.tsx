
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
import { PlusCircle, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState, useCallback } from 'react';
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
import { dbService } from '@/lib/dbService';
import usePersistentState from '@/hooks/use-persistent-state';

type Department = {
  id: string;
  name: string;
  hodId?: string;
  hodName?: string;
  teacherCount?: number;
  studentCount?: number;
};

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = usePersistentState('departments-modal-open', false);
  const { toast } = useToast();

  const fetchDepartments = useCallback(async () => {
    setIsLoading(true);
    try {
      const departmentsList = await dbService.getDocs<Department>('departments');
      
      const populatedDepartments = await Promise.all(
        departmentsList.map(async (dept) => {
          let hodName = 'N/A';
          if (dept.hodId) {
            const hodDoc = await dbService.getDoc<{name: string}>('users', dept.hodId);
            if (hodDoc) {
              hodName = hodDoc.name;
            }
          }
          // In a real app, teacher/student counts would be calculated, possibly via a Cloud Function.
          // For now, we'll keep them as placeholders.
          return {
            ...dept,
            hodName: hodName,
            teacherCount: 0,
            studentCount: 0,
          };
        })
      );
      
      setDepartments(populatedDepartments);
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
    // TODO: Implement edit functionality
    toast({ title: "Note", description: `Edit functionality for ${dept.name} coming soon.` });
  };
  
  const handleDelete = (dept: Department) => {
    // TODO: Implement delete functionality
    toast({ title: "Note", description: `Delete functionality for ${dept.name} coming soon.` });
  };


  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold">Departments</h1>
        <p className="text-muted-foreground">
          Manage academic departments and heads of department.
        </p>
      </div>
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>All Departments</CardTitle>
            <CardDescription>
              A list of all departments in the school.
            </CardDescription>
          </div>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Department
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Department</DialogTitle>
                <DialogDescription>
                  Create a new department and optionally assign a Head of Department (HOD).
                </DialogDescription>
              </DialogHeader>
              <AddDepartmentForm onDepartmentAdded={handleDepartmentAdded} />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department Name</TableHead>
                <TableHead>Head of Department (HOD)</TableHead>
                <TableHead className="hidden md:table-cell">Teachers</TableHead>
                <TableHead className="hidden md:table-cell">Students</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="ml-auto h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : departments.length > 0 ? (
                departments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-medium">{dept.name}</TableCell>
                    <TableCell>{dept.hodName}</TableCell>
                    <TableCell className="hidden md:table-cell">{dept.teacherCount}</TableCell>
                    <TableCell className="hidden md:table-cell">{dept.studentCount}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => handleEdit(dept)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(dept)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No departments found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
