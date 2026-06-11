'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, where } from '@/lib/firebase-stubs';
import { db, auth, storage } from "@/lib/firebase";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';

export default function ClassResultsPage() {
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
            // Get students
            const studentsSnap = await getDocs(
                query(collection(db, 'students'), where('classLevel', '==', selectedClass), where('status', '==', 'Active'))
            );
            const students = studentsSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

            // Get scores
            const scoresSnap = await getDocs(
                query(collection(db, 'scores'), where('class', '==', selectedClass), where('term', '==', selectedTerm))
            );
            const scores = scoresSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

            // Get behavioural
            const behaviouralSnap = await getDocs(
                query(collection(db, 'behavioural_assessments'), where('class', '==', selectedClass), where('term', '==', selectedTerm), where('session', '==', selectedSession))
            );
            const behavioural = behaviouralSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

            // Build results data
            const data = students.map((student: any) => {
                const studentScores = scores.filter((s: any) => s.studentId === student.id);
                const studentBehavioural = behavioural.find((b: any) => b.studentId === student.id);
                
                const totalScore = studentScores.reduce((sum: number, s: any) => sum + (s.totalScore || 0), 0);
                const averageScore = studentScores.length > 0 ? totalScore / studentScores.length : 0;
                
                // Calculate grade
                let overallGrade = 'F';
                if (averageScore >= 80) overallGrade = 'A';
                else if (averageScore >= 70) overallGrade = 'B';
                else if (averageScore >= 60) overallGrade = 'C';
                else if (averageScore >= 50) overallGrade = 'D';
                else if (averageScore >= 40) overallGrade = 'E';

                return {
                    student,
                    results: studentScores,
                    behavioral_assessment: studentBehavioural,
                    total_score: totalScore,
                    average_score: averageScore,
                    overall_grade: overallGrade
                };
            });

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
                    <h1 className="text-3xl font-bold">Class Results</h1>
                    <p className="text-muted-foreground">View all students' results for a class</p>
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
                <div ref={printRef} className="space-y-8">
                    {resultsData.map((data, idx) => (
                        <div key={idx} className="bg-white p-6 border rounded page-break">
                            <style jsx>{`
                                @media print {
                                    @page { size: A4; margin: 15mm; }
                                    body { -webkit-print-color-adjust: exact !important; font-size: 10px; }
                                    .page-break { page-break-after: always; }
                                }
                            `}</style>

                            {/* Header */}
                            <div className="text-center mb-4">
                                <img src="/school_images/header_image.jpg" alt="Header" className="w-4/5 mx-auto mb-2" />
                                <h1 className="text-xl font-bold">REPORT SHEET</h1>
                            </div>

                            {/* Student Info */}
                            <table className="w-full border-collapse border border-black text-xs mb-4">
                                <thead>
                                    <tr><th colSpan={14} className="border border-black p-2 text-center bg-gray-100">STUDENT INFORMATION</th></tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <th className="border border-black p-1">Student Name</th>
                                        <td colSpan={9} className="border border-black p-1">{data.student.firstName} {data.student.lastName} [{data.student.studentId}]</td>
                                        <th className="border border-black p-1">Term</th>
                                        <td colSpan={3} className="border border-black p-1">{selectedTerm}</td>
                                    </tr>
                                    <tr>
                                        <th className="border border-black p-1">Current Class</th>
                                        <td colSpan={9} className="border border-black p-1">{data.student.classLevel}</td>
                                        <th className="border border-black p-1">Session</th>
                                        <td colSpan={3} className="border border-black p-1">{selectedSession}</td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Results */}
                            <table className="w-full border-collapse border border-black text-xs mb-4">
                                <thead>
                                    <tr><th colSpan={14} className="border border-black p-2 text-center bg-gray-100">ACADEMIC REPORT</th></tr>
                                    <tr className="bg-gray-50">
                                        <th colSpan={4} className="border border-black p-1">Subject</th>
                                        <th className="border border-black p-1">CA</th>
                                        <th className="border border-black p-1">Exam</th>
                                        <th colSpan={2} className="border border-black p-1">Total</th>
                                        <th className="border border-black p-1">Grade</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.results.map((result: any, i: number) => (
                                        <tr key={i}>
                                            <td colSpan={4} className="border border-black p-1">{result.subject}</td>
                                            <td className="border border-black p-1 text-center">{result.caScore}</td>
                                            <td className="border border-black p-1 text-center">{result.examScore}</td>
                                            <td colSpan={2} className="border border-black p-1 text-center">{result.totalScore}</td>
                                            <td className="border border-black p-1 text-center">{result.grade}</td>
                                        </tr>
                                    ))}
                                    <tr className="font-bold">
                                        <td colSpan={4} className="border border-black p-1">Total Score</td>
                                        <td className="border border-black p-1 text-center">{data.total_score}</td>
                                        <td colSpan={3} className="border border-black p-1">Average Score</td>
                                        <td colSpan={2} className="border border-black p-1 text-center">{data.average_score.toFixed(2)}%</td>
                                        <td colSpan={3} className="border border-black p-1">Overall Grade</td>
                                        <td className="border border-black p-1 text-center">{data.overall_grade}</td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Behavioural */}
                            {data.behavioral_assessment && (
                                <table className="w-full border-collapse border border-black text-xs mb-4">
                                    <thead>
                                        <tr><th colSpan={8} className="border border-black p-2 text-center bg-gray-100">BEHAVIOURAL ASSESSMENT</th></tr>
                                        <tr className="bg-gray-50">
                                            <th className="border border-black p-1">Category</th>
                                            <th className="border border-black p-1">Rating</th>
                                            <th className="border border-black p-1">Category</th>
                                            <th className="border border-black p-1">Rating</th>
                                            <th className="border border-black p-1">Category</th>
                                            <th className="border border-black p-1">Rating</th>
                                            <th className="border border-black p-1">Category</th>
                                            <th className="border border-black p-1">Rating</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="border border-black p-1">Conduct</td>
                                            <td className="border border-black p-1 text-center">{data.behavioral_assessment.conduct}</td>
                                            <td className="border border-black p-1">Punctuality</td>
                                            <td className="border border-black p-1 text-center">{data.behavioral_assessment.punctuality}</td>
                                            <td className="border border-black p-1">Dedication</td>
                                            <td className="border border-black p-1 text-center">{data.behavioral_assessment.dedication}</td>
                                            <td className="border border-black p-1">Participation</td>
                                            <td className="border border-black p-1 text-center">{data.behavioral_assessment.participation}</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-black p-1">Hospitality</td>
                                            <td className="border border-black p-1 text-center">{data.behavioral_assessment.hospitality}</td>
                                            <td className="border border-black p-1">Neatness</td>
                                            <td className="border border-black p-1 text-center">{data.behavioral_assessment.neatness}</td>
                                            <td className="border border-black p-1">Creativity</td>
                                            <td className="border border-black p-1 text-center">{data.behavioral_assessment.creativity}</td>
                                            <td className="border border-black p-1">Physical</td>
                                            <td className="border border-black p-1 text-center">{data.behavioral_assessment.physical}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            )}

                            {/* Signature */}
                            <div className="text-right mt-6">
                                <img src="/school_images/signature_image.jpg" alt="Signature" className="w-24 ml-auto" />
                                <p className="text-xs">Head of School's Signature</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
