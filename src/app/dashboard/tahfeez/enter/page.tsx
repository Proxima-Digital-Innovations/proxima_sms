'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { saveTahfeezScore } from '@/actions/behavioural-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Save } from 'lucide-react';

export default function TahfeezEntryPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedTerm, setSelectedTerm] = useState('First Term');
    const [selectedSession, setSelectedSession] = useState('2024/2025');
    const [scores, setScores] = useState<Record<string, any>>({});
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
            const q = query(
                collection(db, 'students'),
                where('classLevel', '==', selectedClass),
                where('status', '==', 'Active')
            );
            
            const snapshot = await getDocs(q);
            const studentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setStudents(studentsData);

            // Load existing scores
            const scoresQ = query(
                collection(db, 'tahfeez_scores'),
                where('class', '==', selectedClass),
                where('term', '==', selectedTerm),
                where('session', '==', selectedSession)
            );

            const scoresSnapshot = await getDocs(scoresQ);
            const existing: Record<string, any> = {};

            scoresSnapshot.docs.forEach(doc => {
                const data = doc.data();
                existing[data.studentId] = data;
            });

            // Initialize
            const initial: Record<string, any> = {};
            studentsData.forEach(student => {
                initial[student.id] = existing[student.id] || {
                    surah: '',
                    juz: 0,
                    page: 0,
                    marks: 0
                };
            });

            setScores(initial);
        } catch (error) {
            console.error('Error loading students:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load students' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (studentId: string, field: string, value: any) => {
        setScores(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [field]: value
            }
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            for (const student of students) {
                const score = scores[student.id];
                await saveTahfeezScore({
                    studentId: student.id,
                    studentName: `${student.firstName} ${student.lastName}`,
                    class: selectedClass,
                    term: selectedTerm,
                    session: selectedSession,
                    ...score
                });
            }
            toast({ title: 'Success', description: 'Tahfeez scores saved!' });
        } catch (error) {
            console.error('Error saving:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save scores' });
        } finally {
            setIsSaving(false);
        }
    };

    const uniqueClasses = ['Nursery 1', 'Nursery 2', 'KG 1', 'KG 2', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'];

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Tahfeez Scores</h1>
                <p className="text-muted-foreground">Enter Quran memorization scores</p>
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
                        <CardTitle>Enter Tahfeez Scores</CardTitle>
                        <CardDescription>{students.length} students</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Student</TableHead>
                                    <TableHead>Surah</TableHead>
                                    <TableHead>Juz</TableHead>
                                    <TableHead>Page</TableHead>
                                    <TableHead>Marks</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {students.map(student => (
                                    <TableRow key={student.id}>
                                        <TableCell className="font-medium">
                                            {student.firstName} {student.lastName}
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                value={scores[student.id]?.surah || ''}
                                                onChange={(e) => handleChange(student.id, 'surah', e.target.value)}
                                                placeholder="Surah name"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                min="0"
                                                max="30"
                                                value={scores[student.id]?.juz || 0}
                                                onChange={(e) => handleChange(student.id, 'juz', Number(e.target.value))}
                                                className="w-20"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                min="0"
                                                max="604"
                                                value={scores[student.id]?.page || 0}
                                                onChange={(e) => handleChange(student.id, 'page', Number(e.target.value))}
                                                className="w-20"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={scores[student.id]?.marks || 0}
                                                onChange={(e) => handleChange(student.id, 'marks', Number(e.target.value))}
                                                className="w-20"
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <div className="mt-4">
                            <Button onClick={handleSave} disabled={isSaving} className="w-full">
                                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />Save Scores</>}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
