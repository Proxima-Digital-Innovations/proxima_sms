'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, setDoc } from '@/lib/firebase-stubs';
import { db, auth, storage } from "@/lib/firebase";
import { Skeleton } from '@/components/ui/skeleton';
import { Save } from 'lucide-react';

type Grade = {
  grade: string;
  minScore: number;
  maxScore: number;
};

const defaultGradingScale: Grade[] = [
  { grade: 'A', minScore: 70, maxScore: 100 },
  { grade: 'B', minScore: 60, maxScore: 69 },
  { grade: 'C', minScore: 50, maxScore: 59 },
  { grade: 'D', minScore: 45, maxScore: 49 },
  { grade: 'E', minScore: 40, maxScore: 44 },
  { grade: 'F', minScore: 0, maxScore: 39 },
];

export default function GradingSystemPage() {
    const [gradingScale, setGradingScale] = useState<Grade[]>(defaultGradingScale);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const fetchGradingScale = useCallback(async () => {
        setIsLoading(true);
        try {
            const scaleDocRef = doc(db, 'system', 'gradingScale');
            const docSnap = await getDoc(scaleDocRef);
            if (docSnap.exists()) {
                setGradingScale(docSnap.data().scale);
            } else {
                // If no scale is in the DB, use the default and prepare to save it
                setGradingScale(defaultGradingScale);
            }
        } catch (error) {
            console.error("Error fetching grading scale:", error);
            toast({ variant: 'destructive', title: "Error", description: "Could not load grading scale." });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchGradingScale();
    }, [fetchGradingScale]);

    const handleScaleChange = (index: number, field: keyof Grade, value: string | number) => {
        const newScale = [...gradingScale];
        if (typeof newScale[index][field] === 'number') {
            newScale[index] = { ...newScale[index], [field]: Number(value) };
        } else {
            newScale[index] = { ...newScale[index], [field]: value };
        }
        setGradingScale(newScale);
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        try {
            // Basic validation to prevent overlapping ranges
            for (let i = 0; i < gradingScale.length - 1; i++) {
                if (gradingScale[i].minScore <= gradingScale[i+1].maxScore) {
                     toast({ variant: 'destructive', title: "Validation Error", description: `Grade ${gradingScale[i].grade} minimum score cannot be less than or equal to Grade ${gradingScale[i+1].grade} maximum score.` });
                     setIsSaving(false);
                     return;
                }
            }
            const scaleDocRef = doc(db, 'system', 'gradingScale');
            await setDoc(scaleDocRef, { scale: gradingScale });
            toast({ title: "Success", description: "Grading scale has been updated." });
        } catch (error) {
             console.error("Error saving grading scale:", error);
             toast({ variant: 'destructive', title: "Error", description: "Could not save the grading scale." });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="font-headline text-3xl font-bold">Grading System</h1>
                <p className="text-muted-foreground">
                    Configure grade scales, GPA calculations, and report card comments.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Grading Scale</CardTitle>
                    <CardDescription>
                        Define the score ranges for each letter grade. Ensure there are no overlaps.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-2">
                           {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[100px]">Grade</TableHead>
                                    <TableHead>Minimum Score (%)</TableHead>
                                    <TableHead>Maximum Score (%)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {gradingScale.map((grade, index) => (
                                    <TableRow key={grade.grade}>
                                        <TableCell className="font-medium">{grade.grade}</TableCell>
                                        <TableCell>
                                            <Input 
                                                type="number" 
                                                value={grade.minScore} 
                                                onChange={(e) => handleScaleChange(index, 'minScore', e.target.value)}
                                                className="max-w-[120px]"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input 
                                                type="number" 
                                                value={grade.maxScore} 
                                                onChange={(e) => handleScaleChange(index, 'maxScore', e.target.value)}
                                                className="max-w-[120px]"
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                     <div className="mt-6 flex justify-end">
                        <Button onClick={handleSaveChanges} disabled={isSaving || isLoading}>
                            {isSaving ? "Saving..." : <><Save className="mr-2 h-4 w-4" /> Save Changes</>}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
