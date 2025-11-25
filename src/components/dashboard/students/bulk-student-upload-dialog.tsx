
'use client';

import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Upload, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useState, useRef, Fragment } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { bulkCreateStudents } from '@/actions/student-actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

type ImportResult = {
    importedCount: number;
    errorCount: number;
    invalidRecords: any[];
} | null;

export function BulkStudentUploadDialog({ onUploadComplete }: { onUploadComplete: () => void }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [studentData, setStudentData] = useState<any[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const handleDownloadTemplate = () => {
    // Simplified headers
    const headers = [
      "firstName", "lastName", "class", "guardianName", "guardianContact", "guardianEmail"
    ];
    
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([headers]);
    
    const exampleData = [
      {
        firstName: "Fatima",
        lastName: "Abubakar",
        class: "JSS 1",
        guardianName: "Amina Abubakar",
        guardianContact: "08023456789",
        guardianEmail: "a.abubakar@example.com"
      },
      {
        firstName: "Muhammad",
        lastName: "Sani",
        class: "Primary 6",
        guardianName: "Hadiza Sani",
        guardianContact: "08098765432",
        guardianEmail: "h.sani@example.com"
      },
    ];

    XLSX.utils.sheet_add_json(worksheet, exampleData, { origin: 'A2', skipHeader: true });

    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
    XLSX.writeFile(workbook, "student-upload-template.xlsx");
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setImportResult(null);
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
            // Ensure data is plain JSON
            const plainJson = JSON.parse(JSON.stringify(json));
            
            setStudentData(plainJson);
            toast({
                title: 'File Ready for Import',
                description: `${plainJson.length} student records found in ${file.name}.`,
            });
        } catch (error) {
            console.error("Error parsing file:", error);
            toast({
                variant: 'destructive',
                title: 'File Read Error',
                description: 'Could not read or parse the uploaded file.',
            });
            setFileName(null);
            setStudentData([]);
        } finally {
            setIsParsing(false);
        }
    };
    reader.readAsBinaryString(file);
  };
  
  const handleImport = async () => {
    if (studentData.length === 0) {
        toast({ variant: 'destructive', title: 'No Data', description: 'No student data to import.' });
        return;
    }
    setIsSubmitting(true);
    setImportResult(null);
    try {
        const result = await bulkCreateStudents(studentData);
        if (result.error) {
            throw new Error(result.error);
        }

        setImportResult({
            importedCount: result.importedCount || 0,
            errorCount: result.errorCount || 0,
            invalidRecords: result.invalidRecords || []
        });

        toast({
            title: 'Import Process Completed',
            description: `${result.importedCount} students and parent accounts created. ${result.errorCount} records had errors.`,
            duration: 10000,
        });

        if (result.errorCount === 0) {
            onUploadComplete();
        }
    } catch (error: any) {
         toast({
            variant: 'destructive',
            title: 'Import Failed',
            description: error.message || 'An unexpected error occurred during import.',
             duration: 10000,
        });
    } finally {
        setIsSubmitting(false);
    }
  }
  
  const renderResult = () => {
      if (!importResult) return null;
      
      return (
          <div className='mt-6 space-y-4'>
            {importResult.importedCount > 0 && (
                <Alert variant="default" className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Import Successful</AlertTitle>
                    <AlertDescription>
                        {importResult.importedCount} student and guardian accounts were successfully created. Guardian's default password is their phone number.
                    </AlertDescription>
                </Alert>
            )}
             {importResult.errorCount > 0 && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{importResult.errorCount} Records Failed</AlertTitle>
                    <AlertDescription>
                       The following records could not be imported. Please correct them in your spreadsheet and re-upload the file.
                    </AlertDescription>
                     <ScrollArea className="mt-4 h-48">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Error</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {importResult.invalidRecords.map((record, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{record.firstName || 'N/A'} {record.lastName || ''}</TableCell>
                                        <TableCell><Badge variant="outline">{record.error}</Badge></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                     </ScrollArea>
                </Alert>
            )}
          </div>
      )
  }

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>Bulk Student Upload</DialogTitle>
        <DialogDescription>
          Upload an Excel or spreadsheet file to enroll multiple students at once. This will also create parent accounts.
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-6 py-4">
        <div className="rounded-md border-2 border-dashed p-8 text-center">
            <h3 className="font-semibold">Step 1: Download the Template</h3>
            <p className="text-sm text-muted-foreground mb-4">
                Use our template to ensure your data is in the correct format. A login account will be created for each guardian. Their default password will be their phone number.
            </p>
            <Button variant="outline" onClick={handleDownloadTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Download Template.xlsx
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

        {renderResult()}
      </div>

      <DialogFooter>
        <DialogClose asChild>
            <Button variant="secondary">Close</Button>
        </DialogClose>
        <Button onClick={handleImport} disabled={isSubmitting || isParsing || studentData.length === 0}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Import {studentData.length > 0 && !importResult ? `${studentData.length} Students` : 'Students'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
