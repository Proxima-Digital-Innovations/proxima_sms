'use client';

import { useState, useEffect } from 'react';
import { getStudents } from '@/actions/student-actions';

import { Student } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { LayoutGrid, Shuffle, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type SeatingPosition = {
    row: number;
    col: number;
    student: Student | null;
};

export default function SeatingPlanPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [rows, setRows] = useState(5);
    const [cols, setCols] = useState(6);
    const [seatingPlan, setSeatingPlan] = useState<SeatingPosition[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        try {
            const result = await getStudents();
            if (result.success && result.data) {
                setStudents((result.data as any[]).filter(s => s.status === 'Active'));
            }
        } catch (error) {
            console.error('Error fetching students:', error);
        }
    };

    const generateSeatingPlan = () => {
        if (!selectedClass) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a class.' });
            return;
        }

        const classStudents = students.filter(s => ((s as any).class?.name || s.classId) === selectedClass);
        const totalSeats = rows * cols;

        if (classStudents.length > totalSeats) {
            toast({ 
                variant: 'destructive', 
                title: 'Error', 
                description: `Not enough seats. Increase rows/columns. (${classStudents.length} students, ${totalSeats} seats)` 
            });
            return;
        }

        // Shuffle students
        const shuffled = [...classStudents].sort(() => Math.random() - 0.5);
        
        const plan: SeatingPosition[] = [];
        let studentIndex = 0;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                plan.push({
                    row: r,
                    col: c,
                    student: studentIndex < shuffled.length ? shuffled[studentIndex++] : null
                });
            }
        }

        setSeatingPlan(plan);
        toast({ title: 'Success', description: 'Seating plan generated!' });
    };

    const exportPlan = () => {
        if (seatingPlan.length === 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Generate a plan first.' });
            return;
        }

        const content = `Seating Plan - ${selectedClass}\n\n` +
            Array.from({ length: rows }).map((_, r) => {
                return Array.from({ length: cols }).map((_, c) => {
                    const seat = seatingPlan.find(s => s.row === r && s.col === c);
                    return seat?.student ? `${seat.student.firstName} ${seat.student.lastName}` : 'Empty';
                }).join(' | ');
            }).join('\n');

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SeatingPlan_${selectedClass}.txt`;
        a.click();

        toast({ title: 'Success', description: 'Seating plan exported.' });
    };

    const uniqueClasses = Array.from(new Set(students.map(s => (s as any).class?.name || s.classId).filter(Boolean))).sort();

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <LayoutGrid className="h-8 w-8" />
                    Seating Plan Generator
                </h1>
                <p className="text-muted-foreground">Generate random seating arrangements for exams</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Configuration</CardTitle>
                    <CardDescription>Set up your seating arrangement</CardDescription>
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
                            <Label>Rows</Label>
                            <Select value={rows.toString()} onValueChange={(v) => setRows(Number(v))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[3, 4, 5, 6, 7, 8].map(n => (
                                        <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Columns</Label>
                            <Select value={cols.toString()} onValueChange={(v) => setCols(Number(v))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[4, 5, 6, 7, 8].map(n => (
                                        <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={generateSeatingPlan} className="flex-1">
                            <Shuffle className="mr-2 h-4 w-4" />
                            Generate Plan
                        </Button>
                        {seatingPlan.length > 0 && (
                            <Button onClick={exportPlan} variant="outline">
                                <Download className="mr-2 h-4 w-4" />
                                Export
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {seatingPlan.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Seating Arrangement</CardTitle>
                        <CardDescription>Front of the room ↓</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {Array.from({ length: rows }).map((_, r) => (
                                <div key={r} className="flex gap-2">
                                    {Array.from({ length: cols }).map((_, c) => {
                                        const seat = seatingPlan.find(s => s.row === r && s.col === c);
                                        return (
                                            <div
                                                key={c}
                                                className={`flex-1 p-3 border rounded text-center min-h-[60px] flex items-center justify-center ${
                                                    seat?.student ? 'bg-primary/10 border-primary' : 'bg-muted'
                                                }`}
                                            >
                                                {seat?.student ? (
                                                    <div className="text-xs">
                                                        <p className="font-semibold">{seat.student.firstName}</p>
                                                        <p className="text-muted-foreground">{seat.student.lastName}</p>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">Empty</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
