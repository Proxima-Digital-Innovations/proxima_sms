'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { saveScores } from '@/actions/results-actions';
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

type ScoreEntry = {
    studentId: string;
    caScore: number;
    examScore: number;
    total: number;
};

export default function ScoreEntryPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedTerm, setSelectedTerm] = useState('First Term');
    const [selectedSession, setSelectedSession] = useState('2024/2025');
    const [scores, setScores] = useState<Record<string, ScoreEntry>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchSubjects();
    }, []);

    const fetchSubjects = async () => {
        const snapshot = await getDocs(collection(db, 'subjects'));
        setSubjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    const loadStudents = async () => {
        if (!selectedClass || !selectedSubject) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select class and subject' });
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
            const studentsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Student[];

            setStudents(studentsData);

            // Load existing scores
            const scoresQ = query(
                collection(db, 'scores'),
                where('class', '==', selectedClass),
                where('subject', '==', selectedSubject),
                where('term', '==', selectedTerm)
            );

            const scoresSnapshot = await getDocs(scoresQ);
            const existingScores: Record<string, ScoreEntry> = {};

            scoresSnapshot.docs.forEach(doc => {
                const data = doc.data();
                existingScores[data.studentId] = {
                    studentId: data.studentId,
                    caScore: data.caScore || 0,
                    examScore: data.examScore || 0,
                    total: data.totalScore || 0
                };
            });

            // Initialize scores
            const initialScores: Record<string, ScoreEntry> = {};
            studentsData.forEach(student => {
                initialScores[student.id] = existingScores[student.id] || {
                    studentId: student.id,
                    caScore: 0,
                    examScore: 0,
                    total: 0
                };
            });

            setScores(initialScores);
        } catch (error) {
            console.error('Error loading students:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load students' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleScoreChange = (studentId: string, field: 'caScore' | 'examScore', value: number) => {
        setScores(prev => {
            const current = prev[studentId] || { studentId, caScore: 0, examScore: 0, total: 0 };
            const updated = { ...current, [field]: value };
            updated.total = updated.caScore + updated.examScore;
            return { ...prev, [studentId]: updated };
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const selectedSubjectData = subjects.find(s => s.id === selectedSubject);
            
            const scoresToSave = Object.values(scores).map(s => {
                const student = students.find(st => st.id === s.studentId);
                return {
                    studentId: s.studentId,
                    studentName: student ? `${student.firstName} ${student.lastName}` : '',
                    subject: selectedSubject,
                    class: selectedClass,
                    teacherId: 'current_teacher_id', // TODO: Get from auth
                    term: selectedTerm,
                    caScore: s.caScore,
                    examScore: s.examScore
                };
            });

            await saveScores(scoresToSave);
            toast({ title: 'Success', description: 'Scores saved successfully!' });
        } catch (error) {
            console.error('Error saving scores:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save scores' });
        } finally {
            setIsSaving(false);
        }
    };

    const uniqueClasses = ['Nursery 1', 'Nursery 2', 'KG 1', 'KG 2', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'];

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Enter Examination Scores</h1>
                <p className="text-muted-foreground">Enter CA and Exam scores for students</p>
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
                                    <TableHead>CA Score (40)</TableHead>
                                    <TableHead>Exam Score (60)</TableHead>
                                    <TableHead>Total (100)</TableHead>
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
                                                max="40"
                                                value={scores[student.id]?.caScore || 0}
                                                onChange={(e) => handleScoreChange(student.id, 'caScore', Number(e.target.value))}
                                                className="w-20"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                min="0"
                                                max="60"
                                                value={scores[student.id]?.examScore || 0}
                                                onChange={(e) => handleScoreChange(student.id, 'examScore', Number(e.target.value))}
                                                className="w-20"
                                            />
                                        </TableCell>
                                        <TableCell className="font-bold">
                                            {scores[student.id]?.total || 0}
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
                                        Save Scores
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
