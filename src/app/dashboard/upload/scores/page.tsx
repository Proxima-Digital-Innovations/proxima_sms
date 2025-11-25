'use client';

import { useState } from 'react';
import { uploadScoresFromExcel, generateScoreTemplate } from '@/actions/upload-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Upload, Download, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function UploadScoresPage() {
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedTerm, setSelectedTerm] = useState('First Term');
    const [selectedSession, setSelectedSession] = useState('2024/2025');
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [uploadResult, setUploadResult] = useState<any>(null);
    const { toast } = useToast();

    const handleDownloadTemplate = async () => {
        if (!selectedClass) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a class' });
            return;
        }

        setIsDownloading(true);
        try {
            const blob = await generateScoreTemplate(selectedClass);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `scores_template_${selectedClass}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
            toast({ title: 'Success', description: 'Template downloaded successfully' });
        } catch (error) {
            console.error('Error:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to download template' });
        } finally {
            setIsDownloading(false);
        }
    };

    const handleUpload = async () => {
        if (!file || !selectedClass || !selectedSubject) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please fill all fields and select a file' });
            return;
        }

        setIsUploading(true);
        setUploadResult(null);
        try {
            const result = await uploadScoresFromExcel(file, selectedSubject, selectedClass, selectedTerm, selectedSession);
            setUploadResult(result);
            toast({ 
                title: 'Upload Complete', 
                description: `Successfully uploaded ${result.successCount} scores. ${result.errorCount} errors.` 
            });
        } catch (error) {
            console.error('Error:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to upload scores' });
        } finally {
            setIsUploading(false);
        }
    };

    const uniqueClasses = ['Nursery 1', 'Nursery 2', 'KG 1', 'KG 2', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'];

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Upload Scores (Excel)</h1>
                <p className="text-muted-foreground">Bulk upload examination scores from Excel file</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Step 1: Download Template</CardTitle>
                    <CardDescription>Download the Excel template for your class</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                        <div className="flex items-end">
                            <Button onClick={handleDownloadTemplate} disabled={isDownloading || !selectedClass} className="w-full">
                                {isDownloading ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Downloading...</>
                                ) : (
                                    <><Download className="mr-2 h-4 w-4" />Download Template</>
                                )}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Step 2: Upload Filled Template</CardTitle>
                    <CardDescription>Fill the template with scores and upload it</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
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
                    <div>
                        <Label>Subject</Label>
                        <Input 
                            placeholder="Enter subject name" 
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                        />
                    </div>
                    <div>
                        <Label>Excel File</Label>
                        <Input 
                            type="file" 
                            accept=".xlsx,.xls"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                        />
                    </div>
                    <Button onClick={handleUpload} disabled={isUploading} className="w-full">
                        {isUploading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</>
                        ) : (
                            <><Upload className="mr-2 h-4 w-4" />Upload Scores</>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {uploadResult && (
                <Card>
                    <CardHeader>
                        <CardTitle>Upload Results</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Alert>
                                <CheckCircle className="h-4 w-4" />
                                <AlertDescription>
                                    <strong>Success:</strong> {uploadResult.successCount} records
                                </AlertDescription>
                            </Alert>
                            {uploadResult.errorCount > 0 && (
                                <Alert variant="destructive">
                                    <XCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        <strong>Errors:</strong> {uploadResult.errorCount} records
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                        {uploadResult.errors.length > 0 && (
                            <div>
                                <h4 className="font-medium mb-2">Error Details:</h4>
                                <ul className="text-sm text-muted-foreground space-y-1">
                                    {uploadResult.errors.slice(0, 10).map((error: string, i: number) => (
                                        <li key={i}>• {error}</li>
                                    ))}
                                    {uploadResult.errors.length > 10 && (
                                        <li>... and {uploadResult.errors.length - 10} more errors</li>
                                    )}
                                </ul>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
