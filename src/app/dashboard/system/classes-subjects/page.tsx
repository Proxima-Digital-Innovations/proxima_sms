
'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Trash2, Edit, X, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAcademicData, ClassData, SubjectData, DepartmentData } from '@/hooks/use-academic-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import usePersistentState from '@/hooks/use-persistent-state';
import { addClass, addSubject, deleteClass, deleteSubject, assignSubjectToDepartment, updateClassConfiguration } from '@/actions/academic-data';
import { getStaffUsers } from '@/actions/user-actions';

type ClassDetail = ClassData & {
    teacherId?: string;
    teacherName?: string;
    subjects?: { id: string; name: string; teacherId?: string; teacherName?: string }[];
};

type SubjectWithDepartment = SubjectData & { departmentId: string };

export default function ClassesSubjectsPage() {
    const { classes, subjects, departments, refetch: refetchAcademicData } = useAcademicData();
    const [newItemName, setNewItemName] = useState('');
    const [selectedDepartmentForNewSubject, setSelectedDepartmentForNewSubject] = useState('');
    const [isClassModalOpen, setIsClassModalOpen] = usePersistentState('classes-modal-open', false);
    const [isSubjectModalOpen, setIsSubjectModalOpen] = usePersistentState('subjects-modal-open', false);
    const [isLoading, setIsLoading] = useState(true);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [classDetails, setClassDetails] = useState<ClassDetail[]>([]);
    const [editingClass, setEditingClass] = useState<ClassDetail | null>(null);
    const [subjectsByDept, setSubjectsByDept] = useState<Record<string, SubjectWithDepartment[]>>({});
    const [subjectToAssign, setSubjectToAssign] = useState<SubjectWithDepartment | null>(null);
    const [selectedDeptForAssignment, setSelectedDeptForAssignment] = useState('');


    const { toast } = useToast();

    const fetchAllData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Fetch all teachers
            const staffResult = await getStaffUsers();
            let teacherList: any[] = [];
            if (staffResult.success) {
                teacherList = staffResult.data || [];
                setTeachers(teacherList);
            }
            
            // Group subjects by department
            const groupedSubjects: Record<string, SubjectWithDepartment[]> = {};
            departments.forEach(dept => {
                groupedSubjects[dept.id] = (subjects as SubjectWithDepartment[]).filter((s) => s.departmentId === dept.id);
            });
            setSubjectsByDept(groupedSubjects);

            // Populate class details
            const details: ClassDetail[] = classes.map((cls: any) => {
                const classTeacher = teacherList.find((t: any) => t.id === cls.teacherId);
                const classSubjects = (cls.subjectIds || []).map((subId: string) => {
                    const subjectDoc = subjects.find((s: any) => s.id === subId);
                    const subjectTeacher = teacherList.find((t: any) => t.id === (cls.subjectTeachers?.[subId] || ''));
                    return {
                        id: subId,
                        name: subjectDoc?.name || 'Unknown Subject',
                        teacherId: subjectTeacher?.id,
                        teacherName: subjectTeacher?.name || 'Not Assigned',
                    };
                });
                return {
                    ...cls,
                    teacherName: classTeacher?.name || 'Not Assigned',
                    subjects: classSubjects,
                };
            });
            setClassDetails(details);
        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load required data.' });
        } finally {
            setIsLoading(false);
        }
    }, [toast, departments, classes, subjects]);
    
    useEffect(() => {
        if (departments.length > 0 || classes.length > 0 || subjects.length > 0) {
            fetchAllData();
        }
    }, [fetchAllData, departments, classes, subjects]);

    const handleAddClass = async () => {
        if (newItemName.trim() === '') {
            toast({ variant: 'destructive', title: 'Error', description: 'Class name cannot be empty.' });
            return;
        }
        try {
            await addClass(newItemName);
            toast({ title: 'Success', description: `Class "${newItemName}" has been added.` });
            setNewItemName('');
            refetchAcademicData();
            setIsClassModalOpen(false);
        } catch (error) {
            console.error(`Error adding class:`, error);
            toast({ variant: 'destructive', title: 'Error', description: `Could not add class.` });
        }
    };
    
    const handleAddSubject = async () => {
        if (newItemName.trim() === '' || !selectedDepartmentForNewSubject) {
            toast({ variant: 'destructive', title: 'Error', description: 'Subject name and department are required.' });
            return;
        }
        try {
            await addSubject(newItemName, selectedDepartmentForNewSubject);
            toast({ title: 'Success', description: `Subject "${newItemName}" has been added.` });
            setNewItemName('');
            setSelectedDepartmentForNewSubject('');
            refetchAcademicData();
            setIsSubjectModalOpen(false);
        } catch (error) {
            console.error(`Error adding subject:`, error);
            toast({ variant: 'destructive', title: 'Error', description: `Could not add subject.` });
        }
    };


    const handleRemoveItem = async (type: 'class' | 'subject', item: {id: string, name: string}) => {
        if (!confirm(`Are you sure you want to remove "${item.name}"? This could affect existing records.`)) {
            return;
        }
        try {
            if (type === 'class') await deleteClass(item.id);
            else await deleteSubject(item.id);

            toast({ title: 'Success', description: `${type.charAt(0).toUpperCase() + type.slice(1)} "${item.name}" has been removed.` });
            refetchAcademicData();
        } catch (error) {
            console.error(`Error removing ${type}:`, error);
            toast({ variant: 'destructive', title: 'Error', description: `Could not remove ${type}.` });
        }
    };

    const handleSaveChanges = async () => {
        if (!editingClass) return;
        
        try {
            const dataToUpdate = {
                teacherId: (editingClass as any).teacherId || null,
                subjectIds: editingClass.subjects?.map(s => s.id) || [],
                subjectTeachers: editingClass.subjects?.reduce((acc, sub) => {
                    if (sub.teacherId) {
                        acc[sub.id] = sub.teacherId;
                    }
                    return acc;
                }, {} as Record<string, string>) || {},
            };

            await updateClassConfiguration(editingClass.id, dataToUpdate);
            
            toast({ title: 'Success', description: `Configuration for ${editingClass.name} has been updated.` });
            setEditingClass(null);
            refetchAcademicData();
        } catch (error) {
            console.error("Error updating class config:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not save the configuration.' });
        }
    };
    
    const handleSubjectAssignmentChange = (subjectId: string, teacherId: string) => {
        if (!editingClass) return;
        
        const updatedSubjects = editingClass.subjects?.map(s => {
            if (s.id === subjectId) {
                const teacher = teachers.find(t => t.id === teacherId);
                return { ...s, teacherId, teacherName: teacher?.name || 'Not Assigned' };
            }
            return s;
        });

        setEditingClass({ ...editingClass, subjects: updatedSubjects });
    };

    const handleClassTeacherChange = (teacherId: string) => {
         if (!editingClass) return;
         const teacher = teachers.find(t => t.id === teacherId);
         setEditingClass({ ...editingClass, teacherId, teacherName: teacher?.name || 'Not Assigned' } as any);
    }
    
    const handleAddSubjectToClass = (subjectId: string) => {
        if (!editingClass) return;
        
        const subjectToAdd = subjects.find(s => s.id === subjectId);
        if (!subjectToAdd || editingClass.subjects?.some(s => s.id === subjectId)) {
            return;
        }
        
        const newSubjects = [...(editingClass.subjects || []), { id: subjectToAdd.id, name: subjectToAdd.name, teacherName: 'Not Assigned' }];
        setEditingClass({ ...editingClass, subjects: newSubjects });
    };

    const handleRemoveSubjectFromClass = (subjectId: string) => {
         if (!editingClass) return;
         const newSubjects = editingClass.subjects?.filter(s => s.id !== subjectId);
         setEditingClass({ ...editingClass, subjects: newSubjects });
    }

    const handleAssignDepartment = async () => {
        if (!subjectToAssign || !selectedDeptForAssignment) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a department' });
            return;
        }
        
        try {
            await assignSubjectToDepartment(subjectToAssign.id, selectedDeptForAssignment);
            toast({ title: 'Success', description: `${subjectToAssign.name} assigned to department` });
            setSubjectToAssign(null);
            setSelectedDeptForAssignment('');
            refetchAcademicData();
        } catch (error) {
            console.error('Error assigning department:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not assign department' });
        }
    }

    if (editingClass) {
        const availableSubjects = subjects.filter(sub => !editingClass.subjects?.some(s => s.id === sub.id));
        return (
             <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Configure: {editingClass.name}</CardTitle>
                            <CardDescription>Assign a class teacher, subjects, and subject teachers.</CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setEditingClass(null)}><X className="h-5 w-5" /></Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Class Teacher Assignment */}
                    <div className="space-y-2">
                        <Label className="font-semibold">Class Teacher</Label>
                        <Select value={(editingClass as any).teacherId} onValueChange={handleClassTeacherChange}>
                            <SelectTrigger><SelectValue placeholder="Assign a class teacher" /></SelectTrigger>
                            <SelectContent>
                                {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <Separator />

                    {/* Subject Assignment */}
                    <div className="space-y-4">
                        <h3 className="font-semibold">Subjects Offered in this Class</h3>
                        <div className="space-y-4">
                            {editingClass.subjects?.map(subject => (
                                <div key={subject.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border rounded-md">
                                    <div className="flex-1 font-medium">{subject.name}</div>
                                    <div className="flex-1 w-full sm:w-auto">
                                        <Select value={subject.teacherId} onValueChange={(teacherId) => handleSubjectAssignmentChange(subject.id, teacherId)}>
                                            <SelectTrigger><SelectValue placeholder="Assign Subject Teacher" /></SelectTrigger>
                                            <SelectContent>
                                                {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveSubjectFromClass(subject.id)}>
                                        <Trash2 className="h-4 w-4 text-destructive"/>
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4">
                           <Select onValueChange={handleAddSubjectToClass} value="">
                               <SelectTrigger><SelectValue placeholder="Add a subject..." /></SelectTrigger>
                               <SelectContent>
                                   {availableSubjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                               </SelectContent>
                           </Select>
                        </div>
                    </div>
                    <div className="flex justify-end pt-4">
                        <Button onClick={handleSaveChanges}><Save className="mr-2 h-4 w-4" /> Save Configuration</Button>
                    </div>
                </CardContent>
             </Card>
        )
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="font-headline text-3xl font-bold">Academic Configuration</h1>
                <p className="text-muted-foreground">
                    Manage classes, subjects, and their assignments to teachers.
                </p>
            </div>
            
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <Card>
                    <CardHeader>
                        <CardTitle>Subjects by Department</CardTitle>
                        <CardDescription>Add or remove subjects within each academic department.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Unassigned Subjects Section */}
                        <div className="mb-6 p-4 border border-orange-200 bg-orange-50 rounded-md">
                            <h3 className="font-semibold mb-2 text-orange-800">Unassigned Subjects</h3>
                            <p className="text-sm text-orange-600 mb-3">These subjects were migrated but not linked to a department. Please assign them.</p>
                            <div className="flex flex-wrap gap-2 items-center">
                                {(subjects as SubjectWithDepartment[]).filter(s => !s.departmentId).map(s => (
                                    <Badge key={s.id} variant="outline" className="flex gap-2 items-center bg-white border-orange-300">
                                        <span>{s.name}</span>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-4 w-4 ml-1"
                                            onClick={() => setSubjectToAssign(s)}
                                        >
                                            <Edit className="h-3 w-3" />
                                        </Button>
                                         <button onClick={() => handleRemoveItem('subject', s)}><X className="h-3 w-3" /></button>
                                    </Badge>
                                ))}
                                {(subjects as SubjectWithDepartment[]).filter(s => !s.departmentId).length === 0 && <p className="text-xs text-muted-foreground">No unassigned subjects.</p>}
                            </div>
                        </div>
                        
                        {/* Assignment Dialog */}
                        <Dialog open={!!subjectToAssign} onOpenChange={(open) => !open && setSubjectToAssign(null)}>
                            <DialogContent>
                                <DialogHeader><DialogTitle>Assign Department to {subjectToAssign?.name}</DialogTitle></DialogHeader>
                                <div className="space-y-4 py-4">
                                    <Select onValueChange={setSelectedDeptForAssignment} value={selectedDeptForAssignment}>
                                        <SelectTrigger><SelectValue placeholder="Select a department" /></SelectTrigger>
                                        <SelectContent>
                                            {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Button onClick={handleAssignDepartment} className="w-full">Save Assignment</Button>
                                </div>
                            </DialogContent>
                        </Dialog>

                        <Separator className="my-4"/>

                        {departments.map(dept => (
                            <div key={dept.id}>
                                <h3 className="font-semibold mb-2">{dept.name}</h3>
                                <div className="flex flex-wrap gap-2 items-center">
                                    {subjectsByDept[dept.id]?.map(s => (
                                        <Badge key={s.id} variant="secondary" className="flex gap-2 items-center">
                                            <span>{s.name}</span>
                                            <button onClick={() => handleRemoveItem('subject', s)}><X className="h-3 w-3" /></button>
                                        </Badge>
                                    )) || <p className="text-xs text-muted-foreground">No subjects added yet.</p>}
                                </div>
                            </div>
                        ))}
                        <Separator />
                         <Dialog open={isSubjectModalOpen} onOpenChange={setIsSubjectModalOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Add Subject</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>Add New Subject</DialogTitle></DialogHeader>
                                <div className="space-y-4 py-4">
                                    <Input placeholder="e.g., Further Mathematics" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} />
                                    <Select onValueChange={setSelectedDepartmentForNewSubject} value={selectedDepartmentForNewSubject}>
                                        <SelectTrigger><SelectValue placeholder="Select a department" /></SelectTrigger>
                                        <SelectContent>
                                            {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Button onClick={handleAddSubject} className="w-full">Add Subject</Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Manage Classes &amp; Assignments</CardTitle>
                            <CardDescription>View all classes and configure their teachers and subjects.</CardDescription>
                        </div>
                         <Dialog open={isClassModalOpen} onOpenChange={setIsClassModalOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Class</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>Add New Class</DialogTitle></DialogHeader>
                                <div className="space-y-4 py-4">
                                    <Input placeholder="e.g., SS 3" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} />
                                    <Button onClick={handleAddClass} className="w-full">Add Class</Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Class Name</TableHead>
                                    <TableHead className="hidden sm:table-cell">Class Teacher</TableHead>
                                    <TableHead className="text-center">Subjects</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                            <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
                                            <TableCell className="text-center"><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="ml-auto h-8 w-24" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : classDetails.map((c) => (
                                    <TableRow key={c.id}>
                                        <TableCell className="font-medium">{c.name}</TableCell>
                                        <TableCell className="hidden sm:table-cell">{c.teacherName}</TableCell>
                                        <TableCell className="text-center">{c.subjects?.length || 0}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="outline" size="sm" onClick={() => setEditingClass(c)}><Edit className="mr-2 h-4 w-4" />Configure</Button>
                                            <Button variant="destructive" size="sm" onClick={() => handleRemoveItem('class', c)}><Trash2 className="h-4 w-4" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
             </div>
        </div>
    );
}
