'use client';

import { useState } from 'react';
import { validateAndUseToken } from '@/actions/token-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ResultCheckerPage() {
    const [admissionNumber, setAdmissionNumber] = useState('');
    const [token, setToken] = useState('');
    const [selectedTerm, setSelectedTerm] = useState('');
    const [selectedSession, setSelectedSession] = useState('');
    const [isChecking, setIsChecking] = useState(false);
    const [resultData, setResultData] = useState<any>(null);
    const [error, setError] = useState('');
    const { toast } = useToast();

    const handleCheckResult = async () => {
        if (!admissionNumber || !token || !selectedTerm || !selectedSession) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please fill all fields' });
            return;
        }

        setIsChecking(true);
        setError('');
        setResultData(null);

        try {
            const result = await validateAndUseToken(admissionNumber, token, selectedTerm, selectedSession);
            
            if (result.success) {
                setResultData((result as any).data);
                toast({ 
                    title: 'Success', 
                    description: `Result loaded. ${((result as any).data as any)?.remainingUses || 0} uses remaining.` 
                });
            } else {
                setError(result.error || 'Failed to load result');
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        } catch (error) {
            console.error('Error:', error);
            setError('An error occurred while checking result');
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to check result' });
        } finally {
            setIsChecking(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="text-center">
                    <img src="/school_images/header_image.jpg" alt="School Header" className="w-2/3 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold">Result Checker</h1>
                    <p className="text-muted-foreground">Check your examination results using your token</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Instructions */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Result Checking Guidelines</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ol className="space-y-2 text-sm">
                                <li className="flex gap-2">
                                    <span className="font-bold">1.</span>
                                    <span>Select the academic session.</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="font-bold">2.</span>
                                    <span>Select the term (e.g., First Term, Second Term).</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="font-bold">3.</span>
                                    <span>Enter the Student Admission Number provided by the school.</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="font-bold">4.</span>
                                    <span>Input the unique Token.</span>
                                </li>
                                <li className="flex items-start gap-2 text-destructive">
                                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                    <span>Each token is valid for <strong>five uses only</strong> and can be used to check results for the specified student, session, and term.</span>
                                </li>
                            </ol>
                        </CardContent>
                    </Card>

                    {/* Form */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Enter Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>Session</Label>
                                <Select value={selectedSession} onValueChange={setSelectedSession}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select session" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="2024/2025">2024/2025</SelectItem>
                                        <SelectItem value="2025/2026">2025/2026</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Term</Label>
                                <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select term" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="First Term">First Term</SelectItem>
                                        <SelectItem value="Second Term">Second Term</SelectItem>
                                        <SelectItem value="Third Term">Third Term</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Admission Number</Label>
                                <Input 
                                    placeholder="Enter admission number"
                                    value={admissionNumber}
                                    onChange={(e) => setAdmissionNumber(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Token</Label>
                                <Input 
                                    placeholder="Enter token"
                                    value={token}
                                    onChange={(e) => setToken(e.target.value.toUpperCase())}
                                />
                            </div>
                            <Button onClick={handleCheckResult} disabled={isChecking} className="w-full">
                                {isChecking ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Checking...</>
                                ) : (
                                    <><Search className="mr-2 h-4 w-4" />Check Result</>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Error */}
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Result Display */}
                {resultData && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Examination Result</CardTitle>
                            <CardDescription>
                                {resultData.student.firstName} {resultData.student.lastName} - {resultData.student.classLevel}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Student Info */}
                            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded">
                                <div>
                                    <p className="text-sm text-muted-foreground">Admission Number</p>
                                    <p className="font-medium">{resultData.student.studentId}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Class</p>
                                    <p className="font-medium">{resultData.student.classLevel}</p>
                                </div>
                            </div>

                            {/* Scores Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse border">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="border p-2 text-left">Subject</th>
                                            <th className="border p-2 text-center">CA</th>
                                            <th className="border p-2 text-center">Exam</th>
                                            <th className="border p-2 text-center">Total</th>
                                            <th className="border p-2 text-center">Grade</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {resultData.scores.map((score: any, i: number) => (
                                            <tr key={i}>
                                                <td className="border p-2">{score.subject}</td>
                                                <td className="border p-2 text-center">{score.caScore}</td>
                                                <td className="border p-2 text-center">{score.examScore}</td>
                                                <td className="border p-2 text-center">{score.totalScore}</td>
                                                <td className="border p-2 text-center font-bold">{score.grade}</td>
                                            </tr>
                                        ))}
                                        <tr className="bg-gray-100 font-bold">
                                            <td className="border p-2" colSpan={3}>Total / Average</td>
                                            <td className="border p-2 text-center">{resultData.totalMarks}</td>
                                            <td className="border p-2 text-center">{resultData.average.toFixed(2)}%</td>
                                        </tr>
                                        <tr className="bg-blue-50">
                                            <td className="border p-2" colSpan={4}>Overall Grade</td>
                                            <td className="border p-2 text-center font-bold text-lg">{resultData.overallGrade}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Behavioural */}
                            {resultData.behavioural && (
                                <div>
                                    <h3 className="font-bold mb-2">Behavioural Assessment</h3>
                                    <div className="grid grid-cols-4 gap-2 text-sm">
                                        <div className="border p-2 rounded">
                                            <p className="text-muted-foreground">Conduct</p>
                                            <p className="font-bold">{resultData.behavioural.conduct}/10</p>
                                        </div>
                                        <div className="border p-2 rounded">
                                            <p className="text-muted-foreground">Punctuality</p>
                                            <p className="font-bold">{resultData.behavioural.punctuality}/10</p>
                                        </div>
                                        <div className="border p-2 rounded">
                                            <p className="text-muted-foreground">Dedication</p>
                                            <p className="font-bold">{resultData.behavioural.dedication}/10</p>
                                        </div>
                                        <div className="border p-2 rounded">
                                            <p className="text-muted-foreground">Participation</p>
                                            <p className="font-bold">{resultData.behavioural.participation}/10</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <Alert>
                                <AlertDescription>
                                    <strong>Token Uses Remaining:</strong> {resultData.remainingUses} out of 5
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
