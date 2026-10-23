'use client';

import { useState, useEffect } from 'react';
import { getBroadsheetData } from '@/actions/results-actions';
import { useAcademicData } from '@/hooks/use-academic-data';
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
    const { classes } = useAcademicData();
    const [students, setStudents] = useState<any[]>([]);
    const [scores, setScores] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedTerm, setSelectedTerm] = useState('First Term');
    const [selectedSession, setSelectedSession] = useState('2024/2025');
    const [isLoading, setIsLoading] = useState(false);
    const [broadsheetData, setBroadsheetData] = useState<BroadsheetRow[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        // Classes are fetched by useAcademicData
    }, []);

    const generateBroadsheet = async () => {
        if (!selectedClass) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a class.' });
            return;
        }

        setIsLoading(true);
        try {
            const result = await getBroadsheetData(selectedClass, selectedTerm, selectedSession);
            if (!result.success) {
                toast({ variant: 'destructive', title: 'Error', description: result.error || 'Failed to generate broadsheet.' });
                return;
            }

            const data = result.broadsheet || [];
            
            const rows: BroadsheetRow[] = data.map((item: any) => {
                const row: BroadsheetRow = {
                    studentId: item.student.studentId || '-',
                    studentName: `${item.student.firstName} ${item.student.lastName}`,
                    total: item.totalScore || 0,
                    average: item.average || 0,
                    position: item.rank || '-'
                };

                if (item.subjects && Array.isArray(item.subjects)) {
                    item.subjects.forEach((sub: any) => {
                        row[sub.subjectName] = sub.total ?? '-';
                    });
                }
                return row;
            });

            setBroadsheetData(rows);
            setScores([]);
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <Label>Class</Label>
                            <Select value={selectedClass} onValueChange={setSelectedClass}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select class" />
                                </SelectTrigger>
                                <SelectContent>
                                    {classes.map(cls => (
                                        <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
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
                        <CardTitle>{classes.find(c => c.id === selectedClass)?.name || selectedClass} - {selectedTerm} {selectedSession}</CardTitle>
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
