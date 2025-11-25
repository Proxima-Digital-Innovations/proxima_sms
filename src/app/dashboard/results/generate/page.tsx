'use client';

import { useState, useEffect, useRef } from 'react';
import { generateResultCard } from '@/actions/results-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Printer } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useReactToPrint } from 'react-to-print';

export default function ResultGenerationPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [selectedStudent, setSelectedStudent] = useState('');
    const [selectedTerm, setSelectedTerm] = useState('First Term');
    const [selectedSession, setSelectedSession] = useState('2024/2025');
    const [resultData, setResultData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
    });

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        const snapshot = await getDocs(collection(db, 'students'));
        setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    const handleGenerate = async () => {
        if (!selectedStudent) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a student' });
            return;
        }

        setIsLoading(true);
        try {
            const data = await generateResultCard(selectedStudent, selectedTerm, selectedSession);
            setResultData(data);
        } catch (error) {
            console.error('Error generating result:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to generate result' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Generate Result Card</h1>
                    <p className="text-muted-foreground">Generate and print student result cards</p>
                </div>
                {resultData && (
                    <Button onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print Result
                    </Button>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Select Student</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <Label>Student</Label>
                            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select student" />
                                </SelectTrigger>
                                <SelectContent>
                                    {students.map(student => (
                                        <SelectItem key={student.id} value={student.id}>
                                            {student.firstName} {student.lastName} ({student.studentId})
                                        </SelectItem>
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
                    <Button onClick={handleGenerate} disabled={isLoading} className="w-full">
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</> : 'Generate Result'}
                    </Button>
                </CardContent>
            </Card>

            {resultData && (
                <div ref={printRef} className="bg-white p-8">
                    <style jsx>{`
                        @media print {
                            @page { size: A4; margin: 20mm; }
                            body { -webkit-print-color-adjust: exact !important; }
                        }
                    `}</style>

                    {/* Header */}
                    <div className="text-center mb-6">
                        <img src="/school_images/header_image.jpg" alt="School Header" className="w-full mb-4" />
                        <h1 className="text-2xl font-bold">Examination Report Card</h1>
                    </div>

                    {/* Student Info */}
                    <table className="w-full border-collapse border border-black mb-4">
                        <tbody>
                            <tr>
                                <td className="border border-black p-2"><strong>Name:</strong> {resultData.student.firstName} {resultData.student.lastName}</td>
                                <td className="border border-black p-2"><strong>Admission Number:</strong> {resultData.student.studentId}</td>
                            </tr>
                            <tr>
                                <td className="border border-black p-2"><strong>Current Class:</strong> {resultData.student.classLevel}</td>
                                <td className="border border-black p-2"><strong>Gender:</strong> {resultData.student.gender}</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Scores */}
                    <table className="w-full border-collapse border border-black mb-4">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-black p-2">Subject</th>
                                <th className="border border-black p-2">CA</th>
                                <th className="border border-black p-2">Exam</th>
                                <th className="border border-black p-2">Total</th>
                                <th className="border border-black p-2">Grade</th>
                            </tr>
                        </thead>
                        <tbody>
                            {resultData.scores.map((score: any, idx: number) => (
                                <tr key={idx}>
                                    <td className="border border-black p-2">{score.subject}</td>
                                    <td className="border border-black p-2 text-center">{score.caScore}</td>
                                    <td className="border border-black p-2 text-center">{score.examScore}</td>
                                    <td className="border border-black p-2 text-center">{score.totalScore}</td>
                                    <td className="border border-black p-2 text-center">{score.grade}</td>
                                </tr>
                            ))}
                            <tr className="font-bold">
                                <td colSpan={3} className="border border-black p-2">Total Score</td>
                                <td className="border border-black p-2 text-center">{resultData.totalMarks}</td>
                                <td className="border border-black p-2">Average: {resultData.average.toFixed(2)}%</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Behavioural */}
                    {resultData.behavioural && (
                        <table className="w-full border-collapse border border-black mb-4">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border border-black p-2">Behavioural Trait</th>
                                    <th className="border border-black p-2">Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td className="border border-black p-2">Conduct</td><td className="border border-black p-2 text-center">{resultData.behavioural.conduct}</td></tr>
                                <tr><td className="border border-black p-2">Punctuality</td><td className="border border-black p-2 text-center">{resultData.behavioural.punctuality}</td></tr>
                                <tr><td className="border border-black p-2">Dedication</td><td className="border border-black p-2 text-center">{resultData.behavioural.dedication}</td></tr>
                                <tr><td className="border border-black p-2">Participation</td><td className="border border-black p-2 text-center">{resultData.behavioural.participation}</td></tr>
                                <tr><td className="border border-black p-2">Hospitality</td><td className="border border-black p-2 text-center">{resultData.behavioural.hospitality}</td></tr>
                                <tr><td className="border border-black p-2">Neatness</td><td className="border border-black p-2 text-center">{resultData.behavioural.neatness}</td></tr>
                                <tr><td className="border border-black p-2">Creativity</td><td className="border border-black p-2 text-center">{resultData.behavioural.creativity}</td></tr>
                                <tr><td className="border border-black p-2">Physical</td><td className="border border-black p-2 text-center">{resultData.behavioural.physical}</td></tr>
                            </tbody>
                        </table>
                    )}

                    {/* Position & Grade */}
                    <div className="mb-4">
                        <p><strong>Class Position:</strong> {resultData.position}</p>
                        <p><strong>Overall Grade:</strong> {resultData.overallGrade}</p>
                    </div>

                    {/* Signature */}
                    <div className="text-right mt-8">
                        <img src="/school_images/signature_image.jpg" alt="Signature" className="w-32 ml-auto" />
                        <p className="text-sm">Head of School's Signature</p>
                    </div>
                </div>
            )}
        </div>
    );
}
