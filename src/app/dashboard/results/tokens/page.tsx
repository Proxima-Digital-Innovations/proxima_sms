'use client';

import { useState, useEffect } from 'react';
import { getAcademicData } from '@/actions/academic-data';
import { getStudents } from '@/actions/student-actions';
import { generateResultToken } from '@/actions/token-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Key, Copy, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function GenerateTokensPage() {
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedTerm, setSelectedTerm] = useState('First Term');
    const [selectedSession, setSelectedSession] = useState('2024/2025');
    const [students, setStudents] = useState<any[]>([]);
    const [generatedTokens, setGeneratedTokens] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        getAcademicData().then(data => setClasses(data.classes));
    }, []);

    useEffect(() => {
        if (selectedClass) {
            loadStudents();
        }
    }, [selectedClass]);

    const loadStudents = async () => {
        setIsLoading(true);
        try {
            const classObj = classes.find(c => c.name === selectedClass);
            if (!classObj) return;
            const studentsRes = await getStudents(classObj.id);
            if (studentsRes.success && studentsRes.data) {
                setStudents(studentsRes.data.filter((s: any) => s.status === 'Active' || s.status === 'ACTIVE'));
            }
        } catch (error) {
            console.error('Error:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load students' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateTokens = async () => {
        if (!selectedClass || students.length === 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a class with students' });
            return;
        }

        setIsGenerating(true);
        const tokens: any[] = [];

        try {
            for (const student of students) {
                const result = await generateResultToken(student.id, selectedTerm, selectedSession);
                if (result.success) {
                    tokens.push({
                        studentId: student.studentId,
                        name: `${student.firstName} ${student.lastName}`,
                        token: result.token
                    });
                }
            }

            setGeneratedTokens(tokens);
            toast({ title: 'Success', description: `Generated ${tokens.length} tokens` });
        } catch (error) {
            console.error('Error:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to generate tokens' });
        } finally {
            setIsGenerating(false);
        }
    };

    const copyToken = (token: string) => {
        navigator.clipboard.writeText(token);
        toast({ title: 'Copied', description: 'Token copied to clipboard' });
    };

    const copyAllTokens = () => {
        const text = generatedTokens.map(t => `${t.studentId} - ${t.name}: ${t.token}`).join('\n');
        navigator.clipboard.writeText(text);
        toast({ title: 'Copied', description: 'All tokens copied to clipboard' });
    };

    const uniqueClasses = ['Nursery 1', 'Nursery 2', 'KG 1', 'KG 2', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'];

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Generate Result Tokens</h1>
                <p className="text-muted-foreground">Generate access tokens for students to view their results</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Select Class & Term</CardTitle>
                    <CardDescription>Tokens will be generated for all active students in the selected class</CardDescription>
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

                    {students.length > 0 && (
                        <Alert>
                            <CheckCircle className="h-4 w-4" />
                            <AlertDescription>
                                Found {students.length} active students in {selectedClass}
                            </AlertDescription>
                        </Alert>
                    )}

                    <Button onClick={handleGenerateTokens} disabled={isGenerating || isLoading || students.length === 0} className="w-full">
                        {isGenerating ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating Tokens...</>
                        ) : (
                            <><Key className="mr-2 h-4 w-4" />Generate Tokens</>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {generatedTokens.length > 0 && (
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Generated Tokens</CardTitle>
                                <CardDescription>Share these tokens with students/parents</CardDescription>
                            </div>
                            <Button onClick={copyAllTokens} variant="outline">
                                <Copy className="mr-2 h-4 w-4" />
                                Copy All
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {generatedTokens.map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                                    <div>
                                        <p className="font-medium">{item.name}</p>
                                        <p className="text-sm text-muted-foreground">{item.studentId}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <code className="px-3 py-1 bg-gray-100 rounded font-mono text-lg">{item.token}</code>
                                        <Button size="sm" variant="ghost" onClick={() => copyToken(item.token)}>
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
