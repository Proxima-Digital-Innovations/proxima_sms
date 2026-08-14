
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button, ButtonProps } from '@/components/ui/button';
import { Download, Upload, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useState, useRef, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRole } from '@/context/role-context';
import { bulkCreateExpenses } from '@/actions/expense-actions';

type ImportResult = {
    importedCount: number;
    errorCount: number;
    invalidRecords: any[];
} | null;

interface BulkExpenseUploadDialogProps {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: () => void;
}

export function BulkExpenseUploadDialog({ children, open, onOpenChange, onUploadComplete }: BulkExpenseUploadDialogProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [expenseData, setExpenseData] = useState<any[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useRole();
  
  const handleDownloadTemplate = () => {
    const headers = ["date(YYYY-MM-DD)", "category", "description", "amount", "department"];
    const exampleData = [
      { "date(YYYY-MM-DD)": "2024-10-01", "category": "Salaries", "description": "September 2024 Staff Salaries", "amount": 2500000, "department": "Administration" },
      { "date(YYYY-MM-DD)": "2024-10-05", "category": "Utilities", "description": "PHCN Electricity Bill - September", "amount": 85000, "department": "Administration" },
      { "date(YYYY-MM-DD)": "2024-10-07", "category": "Supplies", "description": "Purchase of chalk and markers", "amount": 25000, "department": "Academics" },
      { "date(YYYY-MM-DD)": "2024-10-10", "category": "Maintenance", "description": "Diesel for school generator (200L)", "amount": 150000, "department": "Maintenance" },
      { "date(YYYY-MM-DD)": "2024-10-12", "category": "Supplies", "description": "Stationery for admin office (A4 paper, pens)", "amount": 35000, "department": "Administration" },
      { "date(YYYY-MM-DD)": "2024-10-15", "category": "Maintenance", "description": "Repair of leaking roof in Primary block", "amount": 120000, "department": "Maintenance" },
      { "date(YYYY-MM-DD)": "2024-10-18", "category": "Utilities", "description": "Monthly Internet Subscription", "amount": 45000, "department": "Administration" },
      { "date(YYYY-MM-DD)": "2024-10-20", "category": "Marketing", "description": "Printing of new school flyers", "amount": 50000, "department": "Administration" },
      { "date(YYYY-MM-DD)": "2024-10-22", "category": "Supplies", "description": "Cleaning supplies (detergent, brooms, etc.)", "amount": 30000, "department": "Maintenance" },
      { "date(YYYY-MM-DD)": "2024-10-25", "category": "Capital Expenditure", "description": "Purchase of 5 new student desks", "amount": 250000, "department": "Administration" },
      { "date(YYYY-MM-DD)": "2024-10-28", "category": "Miscellaneous", "description": "Transportation for Inter-school debate competition", "amount": 20000, "department": "Academics" },
      { "date(YYYY-MM-DD)": "2024-10-30", "category": "Utilities", "description": "Waste disposal service payment", "amount": 15000, "department": "Maintenance" },
    ];
    
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exampleData, {header: headers});
    XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");
    XLSX.writeFile(workbook, "expense-upload-template.xlsx");
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
            const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: 'YYYY-MM-DD' });
            
            const plainJson = JSON.parse(JSON.stringify(json));
            setExpenseData(plainJson);
            toast({
                title: 'File Ready for Import',
                description: `${plainJson.length} expense records found in ${file.name}.`,
            });
        } catch (error) {
            console.error("Error parsing file:", error);
            toast({
                variant: 'destructive',
                title: 'File Read Error',
                description: 'Could not read or parse the uploaded file.',
            });
            setFileName(null);
            setExpenseData([]);
        } finally {
            setIsParsing(false);
        }
    };
    reader.readAsBinaryString(file);
  };
  
  const handleImport = async () => {
    if (expenseData.length === 0 || !user) {
        toast({ variant: 'destructive', title: 'No Data or User', description: 'No expense data to import or user not logged in.' });
        return;
    }
    setIsSubmitting(true);
    setImportResult(null);
    try {
        const result = await bulkCreateExpenses(expenseData, user.uid) as any;
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
            description: `${result.importedCount} expenses imported. ${result.errorCount} records had errors.`,
        });

        if (result.errorCount === 0) {
            onUploadComplete();
        }
    } catch (error: any) {
         toast({
            variant: 'destructive',
            title: 'Import Failed',
            description: error.message || 'An unexpected error occurred during import.',
             duration: 8000,
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
                        {importResult.importedCount} expenses were successfully recorded.
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
                                    <TableHead>Description</TableHead>
                                    <TableHead>Error</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {importResult.invalidRecords.map((record, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{record.description || 'N/A'}</TableCell>
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Bulk Expense Upload</DialogTitle>
          <DialogDescription>
            Upload an Excel or spreadsheet file to record multiple expenses at once.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="rounded-md border-2 border-dashed p-8 text-center">
              <h3 className="font-semibold">Step 1: Download the Template</h3>
              <p className="text-sm text-muted-foreground mb-4">
                  Use our template to ensure your data is in the correct format.
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
          <Button onClick={handleImport} disabled={isSubmitting || isParsing || expenseData.length === 0}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Import {expenseData.length > 0 && !importResult ? `${expenseData.length} Expenses` : 'Expenses'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
