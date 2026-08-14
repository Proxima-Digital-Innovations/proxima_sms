'use client';

import { useState, useEffect } from 'react';
import { getStudents } from '@/actions/student-actions';
import { getBehavioralIncidents, saveBehavioralIncident } from '@/actions/behavioural-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Save } from 'lucide-react';

const TRAITS = [
    { key: 'conduct', label: 'Conduct' },
    { key: 'punctuality', label: 'Punctuality' },
    { key: 'dedication', label: 'Dedication' },
    { key: 'participation', label: 'Participation' },
    { key: 'hospitality', label: 'Hospitality' },
    { key: 'neatness', label: 'Neatness' },
    { key: 'creativity', label: 'Creativity' },
    { key: 'physical', label: 'Physical' },
];

export default function BehaviouralEntryPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedTerm, setSelectedTerm] = useState('First Term');
    const [selectedSession, setSelectedSession] = useState('2024/2025');
    const [assessments, setAssessments] = useState<Record<string, any>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const loadStudents = async () => {
        if (!selectedClass) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a class' });
            return;
        }

        setIsLoading(true);
        try {
            const response = await getStudents();
            let studentsData = [];
            if (response.success && response.data) {
                // Filter client side based on classLevel mapping
                studentsData = response.data.filter((s: any) => 
                    (s.class?.name === selectedClass || s.classId === selectedClass) && 
                    s.status === 'ACTIVE'
                );
                setStudents(studentsData);
            }

            // Load existing assessments using getBehavioralIncidents
            const existing: Record<string, any> = {};
            for (const student of studentsData) {
                const assessResp = await getBehavioralIncidents(student.id);
                if (assessResp.success && assessResp.data && assessResp.data.length > 0) {
                    // Just take the first one or find the matching term
                    existing[student.id] = assessResp.data[0];
                }
            }

            // Initialize
            const initial: Record<string, any> = {};
            studentsData.forEach((student: any) => {
                initial[student.id] = existing[student.id] || {
                    conduct: 5,
                    punctuality: 5,
                    dedication: 5,
                    participation: 5,
                    hospitality: 5,
                    neatness: 5,
                    creativity: 5,
                    physical: 5
                };
            });

            setAssessments(initial);
        } catch (error) {
            console.error('Error loading students:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load students' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (studentId: string, trait: string, value: number) => {
        setAssessments(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [trait]: value
            }
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            for (const student of students) {
                const assessment = assessments[student.id];
                await saveBehavioralIncident({
                    studentId: student.id,
                    title: `Behavioural Assessment - ${selectedTerm}`,
                    description: `Assessment for ${student.firstName} ${student.lastName} in ${selectedClass}`,
                    ...assessment
                });
            }
            toast({ title: 'Success', description: 'Behavioural assessments saved!' });
        } catch (error) {
            console.error('Error saving:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save assessments' });
        } finally {
            setIsSaving(false);
        }
    };

    const uniqueClasses = ['Nursery 1', 'Nursery 2', 'KG 1', 'KG 2', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'];

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Behavioural Assessment</h1>
                <p className="text-muted-foreground">Enter behavioural scores (1-10) for students</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Select Filters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <Label>Class</Label>
                            <Select value={selectedClass} onValueChange={setSelectedClass}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select class" />
                                </SelectTrigger>
                                <SelectContent>
                                    {uniqueClasses.map(cls => (
                                        <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Term</Label>
                            <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="First Term">First Term</SelectItem>
                                    <SelectItem value="Second Term">Second Term</SelectItem>
                                    <SelectItem value="Third Term">Third Term</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Session</Label>
                            <Select value={selectedSession} onValueChange={setSelectedSession}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="2024/2025">2024/2025</SelectItem>
                                    <SelectItem value="2025/2026">2025/2026</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <Button onClick={loadStudents} disabled={isLoading} className="w-full">
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</> : 'Load Students'}
                    </Button>
                </CardContent>
            </Card>

            {students.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Enter Assessments</CardTitle>
                        <CardDescription>{students.length} students</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Student</TableHead>
                                        {TRAITS.map(t => (
                                            <TableHead key={t.key} className="text-center">{t.label}</TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {students.map(student => (
                                        <TableRow key={student.id}>
                                            <TableCell className="font-medium">
                                                {student.firstName} {student.lastName}
                                            </TableCell>
                                            {TRAITS.map(trait => (
                                                <TableCell key={trait.key}>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        max="10"
                                                        value={assessments[student.id]?.[trait.key] || 5}
                                                        onChange={(e) => handleChange(student.id, trait.key, Number(e.target.value))}
                                                        className="w-16 text-center"
                                                    />
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="mt-4">
                            <Button onClick={handleSave} disabled={isSaving} className="w-full">
                                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />Save Assessments</>}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
