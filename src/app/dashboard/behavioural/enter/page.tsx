'use client';

import { useState } from 'react';
import { getStudents } from '@/actions/student-actions';
import { saveBehaviouralAssessments, getBehaviouralAssessments } from '@/actions/behavioural-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Filter, Users } from 'lucide-react';

const TRAITS = [
    { key: 'punctuality', label: 'Punctuality' },
    { key: 'neatness', label: 'Neatness' },
    { key: 'conduct', label: 'Conduct' },
    { key: 'dedication', label: 'Dedication' },
    { key: 'participation', label: 'Participation' },
    { key: 'hospitality', label: 'Hospitality' },
    { key: 'creativity', label: 'Creativity' },
    { key: 'physical', label: 'Physical' },
];

export default function BehaviouralEnterPage() {
    const { toast } = useToast();
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedTerm, setSelectedTerm] = useState<string>('First Term');
    const [selectedSession, setSelectedSession] = useState<string>('2026/2027');
    const [students, setStudents] = useState<any[]>([]);
    const [assessments, setAssessments] = useState<Record<string, any>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const loadStudents = async () => {
        if (!selectedClass) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a class' });
            return;
        }

        setIsLoading(true);
        try {
            const resp = await getBehaviouralAssessments(selectedClass, selectedTerm, selectedSession);
            if (!resp.success) throw new Error(resp.message);
            const studentsData = resp.students;
            setStudents(studentsData);

            const existing: Record<string, any> = {};
            if (resp.assessments) {
                resp.assessments.forEach((ass: any) => {
                    existing[ass.studentId] = ass;
                });
            }

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
        if (value > 5) value = 5;
        if (value < 1) value = 1;
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
            const payload = students.map(student => ({
                studentId: student.id,
                ...assessments[student.id]
            }));
            
            await saveBehaviouralAssessments(selectedTerm, selectedSession, payload);
            toast({ title: 'Success', description: 'Behavioural assessments saved successfully.' });
        } catch (error) {
            console.error('Error saving:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save assessments' });
        } finally {
            setIsSaving(false);
        }
    };

    const uniqueClasses = ['Nursery 1', 'Nursery 2', 'KG 1', 'KG 2', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6', 'JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'];

    return (
        <div className="flex flex-col h-full bg-background min-h-screen">
            {/* Page Header */}
            <header className="bg-card border-b border-border px-6 py-5">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 max-w-7xl mx-auto w-full">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Behavioural Assessment</h1>
                        <p className="text-sm text-muted-foreground mt-1">Rate students across official traits on a 1-5 scale.</p>
                    </div>
                    {students.length > 0 && (
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded-md">{students.length} Students</span>
                            <Button onClick={handleSave} disabled={isSaving} className="shadow-sm rounded-md">
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save Assessments
                            </Button>
                        </div>
                    )}
                </div>
            </header>

            <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
                {/* Filter Bar */}
                <div className="bg-card border border-border rounded-md p-4 shadow-sm flex flex-col md:flex-row items-end gap-4">
                    <div className="w-full md:w-64 space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Class</Label>
                        <Select value={selectedClass} onValueChange={setSelectedClass}>
                            <SelectTrigger className="h-9 border-input rounded-md shadow-sm">
                                <SelectValue placeholder="Select class..." />
                            </SelectTrigger>
                            <SelectContent>
                                {uniqueClasses.map(cls => (
                                    <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div className="w-full md:w-48 space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Session</Label>
                        <Select value={selectedSession} onValueChange={setSelectedSession}>
                            <SelectTrigger className="h-9 border-input rounded-md shadow-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="2024/2025">2024/2025</SelectItem>
                                <SelectItem value="2025/2026">2025/2026</SelectItem>
                                <SelectItem value="2026/2027">2026/2027</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div className="w-full md:w-48 space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Term</Label>
                        <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                            <SelectTrigger className="h-9 border-input rounded-md shadow-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="First Term">First Term</SelectItem>
                                <SelectItem value="Second Term">Second Term</SelectItem>
                                <SelectItem value="Third Term">Third Term</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Button onClick={loadStudents} disabled={isLoading} variant="secondary" className="h-9 px-6 shadow-sm rounded-md">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Filter className="mr-2 h-4 w-4" />}
                        Load Roster
                    </Button>
                </div>

                {/* Data Grid */}
                {students.length > 0 ? (
                    <div className="bg-card border border-border rounded-md shadow-sm overflow-hidden flex flex-col">
                        <div className="overflow-x-auto">
                            <Table className="w-full text-sm">
                                <TableHeader className="bg-muted/50 sticky top-0 z-10 border-b border-border">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="font-semibold text-foreground py-3 px-4 w-[220px] bg-muted/80 sticky left-0 z-20 shadow-[1px_0_0_0_hsl(var(--border))]">
                                            Student Name
                                        </TableHead>
                                        {TRAITS.map(t => (
                                            <TableHead key={t.key} className="font-semibold text-foreground py-3 text-center min-w-[90px]">
                                                {t.label}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {students.map((student, idx) => (
                                        <TableRow key={student.id} className="group border-b border-border/60 hover:bg-muted/50 transition-colors">
                                            <TableCell className="font-medium text-foreground py-2 px-4 bg-card group-hover:bg-muted/50 sticky left-0 z-10 shadow-[1px_0_0_0_hsl(var(--border))] transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground border border-border">
                                                        {idx + 1}
                                                    </div>
                                                    <span className="truncate max-w-[150px]" title={`${student.firstName} ${student.lastName}`}>
                                                        {student.firstName} {student.lastName}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            {TRAITS.map(trait => (
                                                <TableCell key={trait.key} className="py-2 text-center p-1">
                                                    <div className="flex justify-center">
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            max="5"
                                                            value={assessments[student.id]?.[trait.key] || 5}
                                                            onChange={(e) => handleChange(student.id, trait.key, Number(e.target.value))}
                                                            className="w-14 h-8 text-center text-sm font-medium border-transparent hover:border-input focus:border-primary focus:ring-1 focus:ring-primary bg-transparent hover:bg-muted/30 transition-all rounded-sm shadow-none"
                                                        />
                                                    </div>
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                ) : (
                    <div className="bg-card border border-border border-dashed rounded-md p-12 flex flex-col items-center justify-center text-center">
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4 border border-border">
                            <Users className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h3 className="text-sm font-medium text-foreground">No students loaded</h3>
                        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                            Select a class, session, and term from the filters above and click "Load Roster" to begin assessing students.
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
}
