'use client';

import { useState, useEffect } from 'react';
import { getStudents, promoteStudents } from '@/actions/student-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowUpCircle, Users, CheckCircle2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const CLASS_PROGRESSION: Record<string, string> = {
    'Nursery 1': 'Nursery 2',
    'Nursery 2': 'KG 1',
    'KG 1': 'KG 2',
    'KG 2': 'Primary 1',
    'Primary 1': 'Primary 2',
    'Primary 2': 'Primary 3',
    'Primary 3': 'Primary 4',
    'Primary 4': 'Primary 5',
    'Primary 5': 'Primary 6',
    'Primary 6': 'Graduated'
};

export default function PromoteStudentsPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [isPromoting, setIsPromoting] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        setIsLoading(true);
        try {
            const response = await getStudents();
            if (response.success && response.data) {
                // Map to match component expectations
                const mappedStudents = response.data.map(s => ({
                    id: s.id,
                    studentId: s.studentId,
                    firstName: s.firstName,
                    lastName: s.lastName,
                    classLevel: s.class?.name || s.classId || 'Unassigned',
                    status: s.status === 'ACTIVE' ? 'Active' : s.status
                }));
                setStudents(mappedStudents as any[]);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to load students.' });
            }
        } catch (error) {
            console.error('Error fetching students:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load students.' });
        } finally {
            setIsLoading(false);
        }
    };

    const filteredStudents = selectedClass 
        ? students.filter(s => s.classLevel === selectedClass)
        : [];

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
        } else {
            setSelectedStudents(new Set());
        }
    };

    const handleSelectStudent = (studentId: string, checked: boolean) => {
        const newSelected = new Set(selectedStudents);
        if (checked) {
            newSelected.add(studentId);
        } else {
            newSelected.delete(studentId);
        }
        setSelectedStudents(newSelected);
    };

    const handlePromote = async () => {
        if (selectedStudents.size === 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select students to promote.' });
            return;
        }

        const nextClass = CLASS_PROGRESSION[selectedClass];
        if (!nextClass) {
            toast({ variant: 'destructive', title: 'Error', description: 'Invalid class progression.' });
            return;
        }

        const confirmMessage = nextClass === 'Graduated'
            ? `This will mark ${selectedStudents.size} student(s) as GRADUATED. Continue?`
            : `Promote ${selectedStudents.size} student(s) from ${selectedClass} to ${nextClass}?`;

        if (!confirm(confirmMessage)) return;

        setIsPromoting(true);
        try {
            const response = await promoteStudents(Array.from(selectedStudents), nextClass);
            if (!response.success) {
                throw new Error(response.error);
            }

            toast({
                title: 'Success!',
                description: `${selectedStudents.size} student(s) ${nextClass === 'Graduated' ? 'graduated' : 'promoted to ' + nextClass} successfully.`
            });

            setSelectedStudents(new Set());
            fetchStudents();
        } catch (error) {
            console.error('Error promoting students:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to promote students.' });
        } finally {
            setIsPromoting(false);
        }
    };

    const uniqueClasses = Array.from(new Set(students.map(s => s.classLevel))).sort();
    const nextClass = selectedClass ? CLASS_PROGRESSION[selectedClass] : null;

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <ArrowUpCircle className="h-8 w-8" />
                    Promote Students
                </h1>
                <p className="text-muted-foreground">Bulk promote students to the next class level</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{students.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">In Selected Class</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{filteredStudents.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Selected for Promotion</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-primary">{selectedStudents.size}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Select Class</CardTitle>
                    <CardDescription>Choose the class you want to promote</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Current Class</Label>
                            <Select value={selectedClass} onValueChange={setSelectedClass}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a class" />
                                </SelectTrigger>
                                <SelectContent>
                                    {uniqueClasses.map(cls => (
                                        <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Next Class</Label>
                            <div className="flex h-10 items-center px-3 border rounded-md bg-muted">
                                {nextClass ? (
                                    <span className="font-medium">{nextClass}</span>
                                ) : (
                                    <span className="text-muted-foreground">Select a class first</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {selectedClass && (
                        <>
                            <Separator />
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            checked={selectedStudents.size === filteredStudents.length && filteredStudents.length > 0}
                                            onCheckedChange={handleSelectAll}
                                        />
                                        <Label className="font-semibold">Select All ({filteredStudents.length})</Label>
                                    </div>
                                    <Button
                                        onClick={handlePromote}
                                        disabled={selectedStudents.size === 0 || isPromoting}
                                    >
                                        {isPromoting ? 'Promoting...' : `Promote ${selectedStudents.size} Student(s)`}
                                    </Button>
                                </div>

                                <div className="border rounded-md divide-y max-h-96 overflow-y-auto">
                                    {filteredStudents.length === 0 ? (
                                        <div className="p-8 text-center text-muted-foreground">
                                            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                            <p>No students found in this class</p>
                                        </div>
                                    ) : (
                                        filteredStudents.map(student => (
                                            <div key={student.id} className="flex items-center gap-3 p-3 hover:bg-muted/50">
                                                <Checkbox
                                                    checked={selectedStudents.has(student.id)}
                                                    onCheckedChange={(checked) => handleSelectStudent(student.id, checked as boolean)}
                                                />
                                                <div className="flex-1">
                                                    <p className="font-medium">{student.firstName} {student.lastName}</p>
                                                    <p className="text-sm text-muted-foreground">{student.studentId}</p>
                                                </div>
                                                <Badge variant="outline">{student.classLevel}</Badge>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
