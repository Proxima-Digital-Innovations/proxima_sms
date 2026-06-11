'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from '@/lib/firebase-stubs';
import { db, auth, storage } from "@/lib/firebase";
import { Score, Student } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import * as XLSX from 'xlsx';

type BroadsheetRow = {
    studentId: string;
    studentName: string;
    [subject: string]: string | number;
    total: number;
    average: number;
    position: number;
};

export default function BroadsheetPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [scores, setScores] = useState<Score[]>([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedTerm, setSelectedTerm] = useState('First Term');
    const [selectedSession, setSelectedSession] = useState('2024/2025');
    const [isLoading, setIsLoading] = useState(false);
    const [broadsheetData, setBroadsheetData] = useState<BroadsheetRow[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        try {
            const snapshot = await getDocs(collection(db, 'students'));
            const studentsData = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data()
            })) as Student[];
            setStudents(studentsData.filter(s => s.status === 'Active'));
        } catch (error) {
            console.error('Error fetching students:', error);
        }
    };

    const generateBroadsheet = async () => {
        if (!selectedClass) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a class.' });
            return;
        }

        setIsLoading(true);
        try {
            const scoresSnapshot = await getDocs(
                query(
                    collection(db, 'scores'),
                    where('class', '==', selectedClass),
                    where('term', '==', selectedTerm)
                )
            );

            const scoresData = scoresSnapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data()
            })) as Score[];

            const classStudents = students.filter(s => s.classLevel === selectedClass);
            
            // Get unique subjects
            const subjects = Array.from(new Set(scoresData.map(s => s.subject))).sort();

            // Build broadsheet
            const rows: BroadsheetRow[] = classStudents.map(student => {
                const studentScores = scoresData.filter(s => s.studentId === student.id);
                const row: BroadsheetRow = {
                    studentId: student.studentId,
                    studentName: `${student.firstName} ${student.lastName}`,
                    total: 0,
                    average: 0,
                    position: 0
                };

                subjects.forEach(subject => {
                    const score = studentScores.find(s => s.subject === subject);
                    row[subject] = score ? score.totalScore : 0;
                    row.total += score ? score.totalScore : 0;
                });

                row.average = subjects.length > 0 ? Math.round(row.total / subjects.length) : 0;
                return row;
            });

            // Calculate positions
            const sortedRows = [...rows].sort((a, b) => b.total - a.total);
            sortedRows.forEach((row, index) => {
                row.position = index + 1;
            });

            setBroadsheetData(sortedRows);
            setScores(scoresData);
        } catch (error) {
            console.error('Error generating broadsheet:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to generate broadsheet.' });
        } finally {
            setIsLoading(false);
        }
    };

    const exportToExcel = () => {
        if (broadsheetData.length === 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'No data to export.' });
            return;
        }

        const worksheet = XLSX.utils.json_to_sheet(broadsheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Broadsheet');
        XLSX.writeFile(workbook, `Broadsheet_${selectedClass}_${selectedTerm}_${selectedSession}.xlsx`);
        
        toast({ title: 'Success', description: 'Broadsheet exported successfully.' });
    };

    const uniqueClasses = Array.from(new Set(students.map(s => s.classLevel))).sort();
    const subjects = broadsheetData.length > 0 
        ? Object.keys(broadsheetData[0]).filter(k => !['studentId', 'studentName', 'total', 'average', 'position'].includes(k))
        : [];

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <FileSpreadsheet className="h-8 w-8" />
                        Results Broadsheet
                    </h1>
                    <p className="text-muted-foreground">Comprehensive class-wide result view</p>
                </div>
                {broadsheetData.length > 0 && (
                    <Button onClick={exportToExcel}>
                        <Download className="mr-2 h-4 w-4" />
                        Export to Excel
                    </Button>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Filter Options</CardTitle>
                    <CardDescription>Select class, term, and session</CardDescription>
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
                    <Button onClick={generateBroadsheet} disabled={isLoading || !selectedClass} className="w-full">
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            'Generate Broadsheet'
                        )}
                    </Button>
                </CardContent>
            </Card>

            {broadsheetData.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>{selectedClass} - {selectedTerm} {selectedSession}</CardTitle>
                        <CardDescription>{broadsheetData.length} students</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="sticky left-0 bg-background">Pos</TableHead>
                                        <TableHead className="sticky left-12 bg-background">Student ID</TableHead>
                                        <TableHead className="sticky left-32 bg-background">Name</TableHead>
                                        {subjects.map(subject => (
                                            <TableHead key={subject} className="text-center">{subject}</TableHead>
                                        ))}
                                        <TableHead className="text-center font-bold">Total</TableHead>
                                        <TableHead className="text-center font-bold">Average</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {broadsheetData.map((row) => (
                                        <TableRow key={row.studentId}>
                                            <TableCell className="sticky left-0 bg-background font-bold">{row.position}</TableCell>
                                            <TableCell className="sticky left-12 bg-background">{row.studentId}</TableCell>
                                            <TableCell className="sticky left-32 bg-background font-medium">{row.studentName}</TableCell>
                                            {subjects.map(subject => (
                                                <TableCell key={subject} className="text-center">
                                                    {row[subject] || '-'}
                                                </TableCell>
                                            ))}
                                            <TableCell className="text-center font-bold">{row.total}</TableCell>
                                            <TableCell className="text-center font-bold">{row.average}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
