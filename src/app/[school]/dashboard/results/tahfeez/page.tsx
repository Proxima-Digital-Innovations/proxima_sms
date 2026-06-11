'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, where } from '@/lib/firebase-stubs';
import { db, auth, storage } from "@/lib/firebase";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';

export default function TahfeezResultsPage() {
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedTerm, setSelectedTerm] = useState('First Term');
    const [selectedSession, setSelectedSession] = useState('2024/2025');
    const [resultsData, setResultsData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
    });

    const loadResults = async () => {
        if (!selectedClass) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a class' });
            return;
        }

        setIsLoading(true);
        try {
            const studentsSnap = await getDocs(
                query(collection(db, 'students'), where('classLevel', '==', selectedClass), where('status', '==', 'Active'))
            );
            const students = studentsSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

            const scoresSnap = await getDocs(
                query(collection(db, 'tahfeez_scores'), where('class', '==', selectedClass), where('term', '==', selectedTerm), where('session', '==', selectedSession))
            );
            const scores = scoresSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

            const data = students.map((student: any) => {
                const studentScore = scores.find((s: any) => s.studentId === student.id);
                return {
                    student,
                    score: studentScore || { marks: 0, surah: '', juz: 0, page: 0 }
                };
            }).filter((d: any) => 'marks' in d.score && d.score.marks > 0);

            setResultsData(data);
        } catch (error) {
            console.error('Error loading results:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load results' });
        } finally {
            setIsLoading(false);
        }
    };

    const uniqueClasses = ['Nursery 1', 'Nursery 2', 'KG 1', 'KG 2', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'];

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Tahfeez Results</h1>
                    <p className="text-muted-foreground">View Quran memorization results</p>
                </div>
                {resultsData.length > 0 && (
                    <Button onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print All
                    </Button>
                )}
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
                                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
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
                    <Button onClick={loadResults} disabled={isLoading} className="w-full">
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</> : 'Load Results'}
                    </Button>
                </CardContent>
            </Card>

            {resultsData.length > 0 && (
                <div ref={printRef} className="space-y-6">
                    {resultsData.map((data, idx) => (
                        <div key={idx} className="bg-white p-6 border rounded page-break">
                            <style jsx>{`
                                @media print {
                                    @page { size: A4; margin: 15mm; }
                                    body { -webkit-print-color-adjust: exact !important; font-size: 10px; }
                                    .page-break { page-break-after: always; }
                                }
                            `}</style>

                            <table className="w-full border-collapse border border-black">
                                <thead>
                                    <tr>
                                        <th colSpan={8} className="border border-black p-2">
                                            <img src="/school_images/header_image.jpg" alt="Header" className="w-4/5 mx-auto" />
                                        </th>
                                    </tr>
                                    <tr>
                                        <th colSpan={8} className="border border-black p-2 text-center">
                                            <h1 className="text-lg font-bold">REPORT SHEET<br />كشف الدرجات</h1>
                                        </th>
                                    </tr>
                                    <tr>
                                        <th colSpan={2} className="border border-black p-2">Student Name</th>
                                        <td colSpan={4} className="border border-black p-2">{data.student.firstName} {data.student.lastName}</td>
                                        <th className="border border-black p-2">Section</th>
                                        <td colSpan={2} className="border border-black p-2">Weekend Tahfeez Section</td>
                                    </tr>
                                    <tr>
                                        <th colSpan={2} className="border border-black p-2">Term</th>
                                        <td colSpan={4} className="border border-black p-2">{selectedTerm}</td>
                                        <th className="border border-black p-2">Academic Session</th>
                                        <td colSpan={2} className="border border-black p-2">{selectedSession}</td>
                                    </tr>
                                    <tr className="bg-gray-100">
                                        <th colSpan={4} className="border border-black p-2">Subject</th>
                                        <th colSpan={4} className="border border-black p-2">Marks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td colSpan={4} className="border border-black p-2">Quran Memorization ({data.score.surah})</td>
                                        <td colSpan={4} className="border border-black p-2 text-center">{data.score.marks}</td>
                                    </tr>
                                    <tr>
                                        <th colSpan={2} className="border border-black p-2">Juz</th>
                                        <td colSpan={2} className="border border-black p-2">{data.score.juz}</td>
                                        <th colSpan={2} className="border border-black p-2">Page</th>
                                        <td colSpan={2} className="border border-black p-2">{data.score.page}</td>
                                    </tr>
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <th colSpan={4} className="border border-black p-2 text-center">Head of School's Signature</th>
                                        <td colSpan={4} className="border border-black p-2 text-center">
                                            <img src="/school_images/signature_image.jpg" alt="Signature" className="w-24 mx-auto" />
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
