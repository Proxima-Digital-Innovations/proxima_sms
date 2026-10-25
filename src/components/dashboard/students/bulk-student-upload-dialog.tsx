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
import { Download, Upload, Loader2, AlertCircle, CheckCircle, GraduationCap, School, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { bulkCreateStudents } from '@/actions/student-actions';
import { bulkEnrollTertiaryStudentsAction } from '@/actions/tims-actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

type ImportResult = {
  importedCount: number;
  errorCount: number;
  invalidRecords: any[];
} | null;

export function BulkStudentUploadDialog({ onUploadComplete }: { onUploadComplete?: () => void }) {
  const [institutionTier, setInstitutionTier] = useState<'SECONDARY' | 'TERTIARY'>('TERTIARY');
  const [fileName, setFileName] = useState<string | null>(null);
  const [studentData, setStudentData] = useState<any[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDownloadTemplate = () => {
    const workbook = XLSX.utils.book_new();

    if (institutionTier === 'TERTIARY') {
      const headers = [
        "firstName", "lastName", "matricNumber", "email", "programCode", "currentLevel",
        "guardianName", "guardianEmail", "guardianPhone", "guardianRelationship"
      ];
      const worksheet = XLSX.utils.aoa_to_sheet([headers]);
      const exampleData = [
        {
          firstName: "Aminu",
          lastName: "Katsina",
          matricNumber: "U2025/CSC/001",
          email: "u2025csc001@university.edu.ng",
          programCode: "CSC",
          currentLevel: 200,
          guardianName: "Alhaji Ibrahim Katsina",
          guardianEmail: "parent.katsina@example.com",
          guardianPhone: "08031234567",
          guardianRelationship: "Father / Sponsor"
        },
        {
          firstName: "Fatima",
          lastName: "Zahra",
          matricNumber: "U2025/CSC/002",
          email: "u2025csc002@university.edu.ng",
          programCode: "CSC",
          currentLevel: 100,
          guardianName: "Amina Abubakar",
          guardianEmail: "amina.abubakar@example.com",
          guardianPhone: "08023456789",
          guardianRelationship: "Mother / Guardian"
        },
        {
          firstName: "Chinedu",
          lastName: "Okonkwo",
          matricNumber: "U2025/SEN/001",
          email: "u2025sen001@university.edu.ng",
          programCode: "SEN",
          currentLevel: 300,
          guardianName: "Grace Okonkwo",
          guardianEmail: "grace.okonkwo@example.com",
          guardianPhone: "08098765432",
          guardianRelationship: "Guardian / Sponsor"
        }
      ];

      XLSX.utils.sheet_add_json(worksheet, exampleData, { origin: 'A2', skipHeader: true });
      XLSX.utils.book_append_sheet(workbook, worksheet, "Undergraduates");
      XLSX.writeFile(workbook, "tertiary-undergraduates-migration-template.xlsx");
    } else {
      const headers = [
        "firstName", "lastName", "middleName", "gender", "class", "guardianName", "guardianContact", "guardianEmail"
      ];
      const worksheet = XLSX.utils.aoa_to_sheet([headers]);
      const exampleData = [
        {
          firstName: "Fatima",
          lastName: "Abubakar",
          middleName: "Zahra",
          gender: "Female",
          class: "JSS 1",
          guardianName: "Amina Abubakar",
          guardianContact: "08023456789",
          guardianEmail: "a.abubakar@example.com"
        },
        {
          firstName: "Muhammad",
          lastName: "Sani",
          middleName: "Ali",
          gender: "Male",
          class: "Primary 6",
          guardianName: "Hadiza Sani",
          guardianContact: "08098765432",
          guardianEmail: "h.sani@example.com"
        },
        {
          firstName: "Chinedu",
          lastName: "Okonkwo",
          middleName: "Emeka",
          gender: "Male",
          class: "SSS 2 Science",
          guardianName: "Grace Okonkwo",
          guardianContact: "08011223344",
          guardianEmail: "g.okonkwo@example.com"
        }
      ];

      XLSX.utils.sheet_add_json(worksheet, exampleData, { origin: 'A2', skipHeader: true });
      XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
      XLSX.writeFile(workbook, "secondary-students-migration-template.xlsx");
    }
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

        setStudentData(plainJson);
        toast({
          title: 'File Ready for Migration',
          description: `${plainJson.length} records ready from ${file.name}.`,
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
      toast({ variant: 'destructive', title: 'No Data', description: 'No student data found in the spreadsheet.' });
      return;
    }
    setIsSubmitting(true);
    setImportResult(null);

    try {
      let result: any;
      if (institutionTier === 'TERTIARY') {
        result = await bulkEnrollTertiaryStudentsAction(studentData);
      } else {
        result = await bulkCreateStudents(studentData);
      }

      if (result.error) {
        throw new Error(result.error);
      }

      const importedCount = result.importedCount || 0;
      const errorCount = result.errorCount || 0;
      const invalidRecords = result.invalidRecords || [];

      setImportResult({
        importedCount,
        errorCount,
        invalidRecords,
      });

      toast({
        title: 'Migration Process Completed',
        description: `Successfully provisioned ${importedCount} student accounts & linked parent credentials.${errorCount > 0 ? ` ${errorCount} records require attention.` : ''}`,
        duration: 10000,
      });

      if (errorCount === 0) {
        onUploadComplete?.();
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Migration Failed',
        description: error.message || 'An unexpected error occurred during bulk migration.',
        duration: 10000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderResult = () => {
    if (!importResult) return null;

    return (
      <div className='mt-6 space-y-4'>
        {importResult.importedCount > 0 && (
          <Alert variant="default" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-200">
            <CheckCircle className="h-4 w-4 text-emerald-400" />
            <AlertTitle className="text-emerald-400 font-bold">Migration Successful</AlertTitle>
            <AlertDescription className="text-xs text-neutral-300">
              {importResult.importedCount} student profiles were successfully provisioned in the database.
              {institutionTier === 'TERTIARY'
                ? ' Student default password is "student123". Parent portal access linked with default password "Parent@123".'
                : ' Guardian accounts created with default password set to their phone number.'}
            </AlertDescription>
          </Alert>
        )}
        {importResult.errorCount > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{importResult.errorCount} Records Require Correction</AlertTitle>
            <AlertDescription>
              The following rows could not be imported. Please review the reasons, update your Excel file, and re-upload.
            </AlertDescription>
            <ScrollArea className="mt-4 h-48 border rounded-xl border-white/10">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Identifier / Name</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importResult.invalidRecords.map((record, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-xs">
                        {record.matricNumber || record.name || `${record.firstName || ''} ${record.lastName || ''}`.trim() || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-rose-400 border-rose-500/30 bg-rose-500/10">
                          {record.error || record.reason || 'Validation Failed'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </Alert>
        )}
      </div>
    );
  };

  return (
    <DialogContent className="max-w-3xl border-border bg-background text-foreground max-h-[90vh] overflow-y-auto w-[95vw] p-4 sm:p-6 rounded-3xl">
      <DialogHeader>
        <div className="flex items-center gap-2 mb-1">
          <FileSpreadsheet className="h-5 w-5 text-indigo-500" />
          <DialogTitle className="text-lg font-bold">Student Migration & Bulk Onboarding Hub</DialogTitle>
        </div>
        <DialogDescription className="text-xs">
          Migrate existing historical rosters or admit new academic cohorts in bulk using Excel (.xlsx) or CSV files. Automatically provisions student accounts, matriculation numbers, and parent portal access.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-2">
        {/* Step 0: Choose Institution Tier */}
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Select Institution Tier
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setInstitutionTier('TERTIARY');
                setStudentData([]);
                setFileName(null);
                setImportResult(null);
              }}
              className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                institutionTier === 'TERTIARY'
                  ? 'bg-indigo-500/10 border-indigo-500/40 text-foreground ring-1 ring-indigo-500'
                  : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-foreground">University / Polytechnic (TIMS)</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Undergraduates with Matriculation Numbers, Degree Programs (CSC, SEN), Levels (100–500), and Parent Sponsors.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setInstitutionTier('SECONDARY');
                setStudentData([]);
                setFileName(null);
                setImportResult(null);
              }}
              className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                institutionTier === 'SECONDARY'
                  ? 'bg-indigo-500/10 border-indigo-500/40 text-foreground ring-1 ring-indigo-500'
                  : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                <School className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-foreground">Basic / Secondary School (K-12)</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Students enrolled in Class Arm streams (JSS 1, SSS 2 Science) with Guardian contact linking.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Step 1: Download Template */}
        <div className="rounded-2xl border-2 border-dashed border-border/80 p-6 text-center bg-muted/20">
          <h3 className="font-bold text-sm text-foreground">Step 1: Download Standard Migration Template</h3>
          <p className="text-xs text-muted-foreground mb-4 mt-1 max-w-lg mx-auto">
            {institutionTier === 'TERTIARY'
              ? 'Download the pre-formatted Excel template with matriculation numbers, degree program codes, academic levels, and sponsor contact details.'
              : 'Download the pre-formatted Excel template with student names, classes, gender, and guardian details.'}
          </p>
          <Button variant="outline" onClick={handleDownloadTemplate} className="rounded-xl text-xs font-semibold">
            <Download className="mr-2 h-4 w-4 text-indigo-500" />
            Download {institutionTier === 'TERTIARY' ? 'Tertiary_Undergraduates_Template.xlsx' : 'Secondary_Students_Template.xlsx'}
          </Button>
        </div>

        {/* Step 2: Upload Completed Spreadsheet */}
        <div className="rounded-2xl border-2 border-dashed border-border/80 p-6 text-center bg-muted/20">
          <h3 className="font-bold text-sm text-foreground">Step 2: Upload Your Populated Roster</h3>
          <p className="text-xs text-muted-foreground mb-4 mt-1">
            Upload your filled spreadsheet (.xlsx, .xls, .csv). Each row is validated before database commit.
          </p>
          <Input 
            type="file" 
            ref={fileInputRef} 
            className="hidden"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileSelect}
            disabled={isParsing || isSubmitting}
          />
          <Button 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isParsing || isSubmitting}
            className="rounded-xl text-xs font-semibold"
          >
            {isParsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-indigo-500" /> : <Upload className="mr-2 h-4 w-4 text-indigo-500" />}
            {fileName || 'Select Excel File'}
          </Button>
        </div>

        {renderResult()}
      </div>

      <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
        <DialogClose asChild>
          <Button variant="secondary" className="rounded-xl text-xs font-semibold">Close</Button>
        </DialogClose>
        <Button 
          onClick={handleImport} 
          disabled={isSubmitting || isParsing || studentData.length === 0}
          className="rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
        >
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Migrate {studentData.length > 0 && !importResult ? `${studentData.length} ${institutionTier === 'TERTIARY' ? 'Undergraduates' : 'Students'}` : 'Records'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
