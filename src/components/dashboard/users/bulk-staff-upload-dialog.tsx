
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
import { bulkCreateStaff } from '@/actions/staff-actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

type ImportResult = {
    importedCount: number;
    errorCount: number;
    invalidRecords: any[];
    error?: any;
} | null;

export function BulkStaffUploadDialog({ onUploadComplete }: { onUploadComplete: () => void }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [staffData, setStaffData] = useState<any[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const handleDownloadTemplate = () => {
    const headers = [
      "firstName", "lastName", "email", "phone", "role", "stateOfOrigin", "baseSalary", "staffId", "kioskPin"
    ];
    const sampleRow = [
      "Fatima", "Aliyu", "fatima.aliyu@school.edu", "08031234567", "TEACHER", "Kano", 150000, "PROX-24TEA0001", "1234"
    ];
    
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Staff");
    XLSX.writeFile(workbook, "staff-upload-template.xlsx");
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
            const plainJson = JSON.parse(JSON.stringify(json));
            
            setStaffData(plainJson);
            toast({
                title: 'File Ready for Import',
                description: `${plainJson.length} staff records found in ${file.name}.`,
            });
        } catch (error) {
            console.error("Error parsing file:", error);
            toast({
                variant: 'destructive',
                title: 'File Read Error',
                description: 'Could not read or parse the uploaded file.',
            });
            setFileName(null);
            setStaffData([]);
        } finally {
            setIsParsing(false);
        }
    };
    reader.readAsBinaryString(file);
  };
  
  const handleImport = async () => {
    if (staffData.length === 0) {
        toast({ variant: 'destructive', title: 'No Data', description: 'No staff data to import.' });
        return;
    }
    setIsSubmitting(true);
    setImportResult(null);
    try {
        const result = await bulkCreateStaff(staffData) as any;
        if (result.error) {
            throw new Error(result.error);
        }

        setImportResult({
            importedCount: result.importedCount ?? 0,
            errorCount: result.errorCount ?? 0,
            invalidRecords: result.invalidRecords ?? []
        });

        toast({
            title: 'Import Process Completed',
            description: `${result.importedCount} staff imported. ${result.errorCount} records had errors.`,
        });

        if (result.errorCount === 0) {
            onUploadComplete();
        }
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
  
  const renderResult = () => {
      if (!importResult) return null;
      
      return (
          <div className='mt-6 space-y-4'>
            {importResult.importedCount > 0 && (
                <Alert variant="default" className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Import Successful</AlertTitle>
                    <AlertDescription>
                        {importResult.importedCount} staff records were successfully created.
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
    <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
      <DialogHeader>
        <DialogTitle>Bulk Staff Upload</DialogTitle>
        <DialogDescription>
          Upload an Excel or spreadsheet file to create multiple staff accounts at once.
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-6 py-4">
        <div className="rounded-md border-2 border-dashed p-8 text-center">
            <h3 className="font-semibold">Step 1: Download the Template</h3>
            <p className="text-sm text-muted-foreground mb-4">
                Use our template to ensure your data is in the correct format. The default password for each user will be their 'stateOfOrigin'.
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
        <Button onClick={handleImport} disabled={isSubmitting || isParsing || staffData.length === 0}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Import {staffData.length > 0 && !importResult ? `${staffData.length} Staff` : 'Staff'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
