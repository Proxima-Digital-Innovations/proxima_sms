
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Upload, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import type { Student } from '@/lib/schema';
import { bulkUpdateScores } from '@/actions/score-actions';

interface BulkScoresUploadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    students: Student[];
    class: string;
    subject: string;
    onUploadComplete: () => void;
}


export function BulkScoresUploadDialog({ open, onOpenChange, students, class: className, subject, onUploadComplete }: BulkScoresUploadDialogProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [scoreData, setScoreData] = useState<any[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const handleDownloadTemplate = () => {
    const templateData = students.map(student => ({
        studentId: student.studentId,
        studentName: `${student.firstName} ${student.lastName}`,
        caScore: '',
        examScore: '',
    }));
    
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    
    XLSX.utils.book_append_sheet(workbook, worksheet, "Scores");
    XLSX.writeFile(workbook, `score-template-${className}-${subject}.xlsx`);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setFileName(file.name);
    setIsParsing(true);
    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet);
            const plainJson = JSON.parse(JSON.stringify(json));
            setScoreData(plainJson);
            toast({
                title: 'File Ready for Import',
                description: `${plainJson.length} score records found.`,
            });
        } catch (error) {
            console.error("Error parsing file:", error);
            toast({
                variant: 'destructive',
                title: 'File Read Error',
                description: 'Could not read or parse the uploaded file.',
            });
            setFileName(null);
            setScoreData([]);
        } finally {
            setIsParsing(false);
        }
    };
    reader.readAsBinaryString(file);
  };
  
  const handleImport = async () => {
    if (scoreData.length === 0) {
        toast({ variant: 'destructive', title: 'No Data', description: 'No score data to import.' });
        return;
    }
    setIsSubmitting(true);
    try {
        const result = await bulkUpdateScores({ scores: scoreData, class: className, subject }) as any;
        if (result.error) {
            throw new Error(result.error);
        }
        toast({
            title: 'Import Successful',
            description: `${result.updatedCount} scores have been updated as a draft.`,
        });
        onUploadComplete();
    } catch (error: any) {
         toast({
            variant: 'destructive',
            title: 'Import Failed',
            description: error.message || 'An unexpected error occurred during import.',
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Bulk Score Upload for {className} - {subject}</DialogTitle>
          <DialogDescription>
            Upload an Excel file to update scores for all students in this class.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="rounded-md border-2 border-dashed p-8 text-center">
              <h3 className="font-semibold">Step 1: Download the Template</h3>
              <p className="text-sm text-muted-foreground mb-4">
                  This template is pre-populated with the students in this class.
              </p>
              <Button variant="outline" onClick={handleDownloadTemplate}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Template
              </Button>
          </div>
          
          <div className="rounded-md border-2 border-dashed p-8 text-center">
              <h3 className="font-semibold">Step 2: Upload Your File</h3>
              <p className="text-sm text-muted-foreground mb-4">
                  Click to select your completed spreadsheet file.
              </p>
              <Input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileSelect}
                  disabled={isParsing || isSubmitting}
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isParsing || isSubmitting}>
                  {isParsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  {fileName || 'Select File'}
              </Button>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
              <Button variant="secondary">Close</Button>
          </DialogClose>
          <Button onClick={handleImport} disabled={isSubmitting || isParsing || scoreData.length === 0}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Import Scores
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
