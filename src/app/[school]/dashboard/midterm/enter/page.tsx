'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from '@/lib/firebase-stubs';
import { db, auth, storage } from "@/lib/firebase";
import { saveMidtermResults, calculateAchievement } from '@/actions/midterm-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Save } from 'lucide-react';

type Student = {
    id: string;
    studentId: string;
    firstName: string;
    lastName: string;
    classLevel: string;
};

type ResultEntry = {
    studentId: string;
    score: number;
    achievement: string;
};

export default function MidtermEntryPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedTerm, setSelectedTerm] = useState('First Term');
    const [selectedSession, setSelectedSession] = useState('2024/2025');
    const [results, setResults] = useState<Record<string, ResultEntry>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchSubjects();
    }, []);

    const fetchSubjects = async () => {
        const snapshot = await getDocs(collection(db, 'subjects'));
        setSubjects(snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })));
    };

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
            const studentsData = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data()
            })) as Student[];

            setStudents(studentsData);

            // Load existing results if any
            const resultsQ = query(
                collection(db, 'midterm_results'),
                where('class', '==', selectedClass),
                where('subjectId', '==', selectedSubject),
                where('term', '==', selectedTerm),
                where('session', '==', selectedSession)
            );

            const resultsSnapshot = await getDocs(resultsQ);
            const existingResults: Record<string, ResultEntry> = {};

            resultsSnapshot.docs.forEach((doc: any) => {
                const data = doc.data();
                existingResults[data.studentId] = {
                    studentId: data.studentId,
                    score: data.score || 0,
                    achievement: data.achievement || ''
                };
            });

            // Initialize results for all students
            const initialResults: Record<string, ResultEntry> = {};
            studentsData.forEach(student => {
                initialResults[student.id] = existingResults[student.id] || {
                    studentId: student.id,
                    score: 0,
                    achievement: ''
                };
            });

            setResults(initialResults);
        } catch (error) {
            console.error('Error loading students:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load students' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleScoreChange = async (studentId: string, score: number) => {
        const achievement = await calculateAchievement(score);
        setResults(prev => ({
            ...prev,
            [studentId]: {
                studentId,
                score,
                achievement
            }
        }));
    };

    const handleSave = async () => {
        if (!selectedSubject) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a subject' });
            return;
        }

        setIsSaving(true);
        try {
            const selectedSubjectData = subjects.find(s => s.id === selectedSubject);
            
            const resultsToSave = Object.values(results).map(r => {
                const student = students.find(s => s.id === r.studentId);
                return {
                    studentId: r.studentId,
                    studentName: student ? `${student.firstName} ${student.lastName}` : '',
                    subjectId: selectedSubject,
                    subjectName: selectedSubjectData?.name || '',
                    class: selectedClass,
                    term: selectedTerm,
                    session: selectedSession,
                    score: r.score,
                    achievement: r.achievement
                };
            });

            await saveMidtermResults(resultsToSave);
            toast({ title: 'Success', description: 'Midterm results saved successfully!' });
        } catch (error) {
            console.error('Error saving results:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save results' });
        } finally {
            setIsSaving(false);
        }
    };

    const uniqueClasses = ['Nursery 1', 'Nursery 2', 'KG 1', 'KG 2', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'];

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Update Mid Term Results</h1>
                <p className="text-muted-foreground">Enter midterm scores for students</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Select Filters</CardTitle>
                    <CardDescription>Choose class, subject, term, and session</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Term</Label>
                            <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
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
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="2024/2025">2024/2025</SelectItem>
                                    <SelectItem value="2025/2026">2025/2026</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
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
                            <Label>Subject</Label>
                            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select subject" />
                                </SelectTrigger>
                                <SelectContent>
                                    {subjects.map(subject => (
                                        <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <Button onClick={loadStudents} disabled={isLoading} className="w-full">
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading...
                            </>
                        ) : (
                            'Load Students'
                        )}
                    </Button>
                </CardContent>
            </Card>

            {students.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Enter Scores</CardTitle>
                        <CardDescription>{students.length} students loaded</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Student ID</TableHead>
                                    <TableHead>Student Name</TableHead>
                                    <TableHead>Score (0-20)</TableHead>
                                    <TableHead>Achievement</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {students.map(student => (
                                    <TableRow key={student.id}>
                                        <TableCell>{student.studentId}</TableCell>
                                        <TableCell>{student.firstName} {student.lastName}</TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                min="0"
                                                max="20"
                                                value={results[student.id]?.score || 0}
                                                onChange={(e) => handleScoreChange(student.id, Number(e.target.value))}
                                                className="w-24"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                value={results[student.id]?.achievement || ''}
                                                onChange={(e) => setResults(prev => ({
                                                    ...prev,
                                                    [student.id]: {
                                                        ...prev[student.id],
                                                        achievement: e.target.value
                                                    }
                                                }))}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <div className="mt-4">
                            <Button onClick={handleSave} disabled={isSaving} className="w-full">
                                {isSaving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Update Results
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
