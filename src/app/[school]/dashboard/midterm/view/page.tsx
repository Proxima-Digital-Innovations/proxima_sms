'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, where } from '@/lib/firebase-stubs';
import { db, auth, storage } from "@/lib/firebase";
import { getClassMidtermReports } from '@/actions/midterm-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Printer } from 'lucide-react';
import PrintableMidtermCard from '@/components/reports/printable-midterm-card';
import { useReactToPrint } from 'react-to-print';

export default function MidtermViewPage() {
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedTerm, setSelectedTerm] = useState('First Term');
    const [selectedSession, setSelectedSession] = useState('2024/2025');
    const [reports, setReports] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
    });

    const loadReports = async () => {
        if (!selectedClass) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a class' });
            return;
        }

        setIsLoading(true);
        try {
            const data = await getClassMidtermReports(selectedClass, selectedTerm, selectedSession);
            setReports(data.filter((r: any) => r.results.length > 0));
        } catch (error) {
            console.error('Error loading reports:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load reports' });
        } finally {
            setIsLoading(false);
        }
    };

    const uniqueClasses = ['Nursery 1', 'Nursery 2', 'KG 1', 'KG 2', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'];

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Mid-Term Results</h1>
                    <p className="text-muted-foreground">View and print midterm progress reports</p>
                </div>
                {reports.length > 0 && (
                    <Button onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print All
                    </Button>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Select Filters</CardTitle>
                    <CardDescription>Choose class, term, and session</CardDescription>
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
                    <Button onClick={loadReports} disabled={isLoading} className="w-full">
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading...
                            </>
                        ) : (
                            'Load Reports'
                        )}
                    </Button>
                </CardContent>
            </Card>

            {reports.length > 0 && (
                <div ref={printRef} className="space-y-8">
                    {reports.map((report, index) => (
                        <div key={index} className="page-break">
                            <PrintableMidtermCard
                                student={{
                                    firstName: report.student.firstName,
                                    lastName: report.student.lastName,
                                    studentId: report.student.studentId,
                                    classLevel: report.student.classLevel
                                }}
                                results={report.results.map((r: any) => ({
                                    subjectName: r.subjectName,
                                    score: r.score,
                                    achievement: r.achievement
                                }))}
                                term={selectedTerm}
                                session={selectedSession}
                                averageScore={report.averageScore}
                                headerImage="/school_images/header_image.jpg"
                                signatureImage="/school_images/signature_image.jpg"
                                watermarkImage="/school_images/watermark_logo.jpg"
                            />
                        </div>
                    ))}
                </div>
            )}

            <style jsx global>{`
                @media print {
                    .page-break {
                        page-break-after: always;
                    }
                }
            `}</style>
        </div>
    );
}
