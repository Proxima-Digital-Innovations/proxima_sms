'use client';

import { useState, useEffect, useRef } from 'react';
import { getClassMidtermReports } from '@/actions/midterm-actions';
import { getAcademicData } from '@/actions/academic-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Printer, ArrowLeft, BookOpen, AlertCircle, FileText } from 'lucide-react';
import PrintableMidtermCard from '@/components/reports/printable-midterm-card';
import { useReactToPrint } from 'react-to-print';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function MidtermViewPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState('');

  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAcademicLoading, setIsAcademicLoading] = useState(true);

  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  useEffect(() => {
    (async () => {
      try {
        const acadRes = await getAcademicData();
        setClasses(acadRes.classes || []);
        setTerms(acadRes.terms || []);
        setSessions(acadRes.sessions || []);

        const activeTerm = acadRes.terms?.find((t: any) => t.isActive) || acadRes.terms?.[0];
        const activeSession = acadRes.sessions?.find((s: any) => s.isActive) || acadRes.sessions?.[0];

        if (activeTerm) setSelectedTerm(activeTerm.name || activeTerm.id);
        if (activeSession) setSelectedSession(activeSession.name || activeSession.id);
      } catch (err) {
        console.error('Error loading academic filters:', err);
      } finally {
        setIsAcademicLoading(false);
      }
    })();
  }, []);

  const loadReports = async () => {
    if (!selectedClass || !selectedTerm || !selectedSession) {
      toast({
        variant: 'destructive',
        title: 'Missing Selection',
        description: 'Please select class, term, and session.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const data = await getClassMidtermReports(selectedClass, selectedTerm, selectedSession);
      const valid = data.filter((r: any) => r.results && r.results.length > 0);
      setReports(valid);

      if (valid.length === 0) {
        toast({
          title: 'No Recorded Midterm Marks',
          description: 'No midterm marks found for this class and term combination.',
        });
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load midterm reports.' });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedClassName = classes.find(c => c.id === selectedClass)?.name || selectedClass;

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm print:hidden"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Mid-Term Progress Reports
            </h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              Printable Format
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Generate and batch-print official mid-term evaluation report cards.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link href="/dashboard/midterm">
            <Button variant="outline" size="sm" className="rounded-xl border-border">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Score Entry
            </Button>
          </Link>
          {reports.length > 0 && (
            <Button
              onClick={handlePrint}
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-sm"
            >
              <Printer className="mr-2 h-4 w-4" />
              Print All ({reports.length})
            </Button>
          )}
        </div>
      </motion.div>

      {/* Filter Selection Card */}
      <Card className="bg-card border-border shadow-sm rounded-2xl print:hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">Class & Term Selection</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Select the class, term, and academic session to generate progress reports.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass} disabled={isAcademicLoading}>
                <SelectTrigger className="rounded-xl border-border bg-background h-10">
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Term</Label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm} disabled={isAcademicLoading}>
                <SelectTrigger className="rounded-xl border-border bg-background h-10">
                  <SelectValue placeholder="Select Term" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {terms.map(t => (
                    <SelectItem key={t.id} value={t.name || t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Academic Session</Label>
              <Select value={selectedSession} onValueChange={setSelectedSession} disabled={isAcademicLoading}>
                <SelectTrigger className="rounded-xl border-border bg-background h-10">
                  <SelectValue placeholder="Select Session" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {sessions.map(s => (
                    <SelectItem key={s.id} value={s.name || s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={loadReports}
            disabled={isLoading || isAcademicLoading || !selectedClass}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-10"
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookOpen className="mr-2 h-4 w-4" />}
            Generate Midterm Reports
          </Button>
        </CardContent>
      </Card>

      {/* Report Cards Preview */}
      {reports.length > 0 ? (
        <div ref={printRef} className="space-y-8 print:space-y-0">
          {reports.map((report, index) => (
            <div
              key={index}
              className="page-break rounded-2xl overflow-hidden border border-border print:border-none shadow-sm print:shadow-none bg-white text-slate-900"
            >
              <PrintableMidtermCard
                student={{
                  firstName: report.student.firstName,
                  lastName: report.student.lastName,
                  studentId: report.student.studentId || '-',
                  classLevel: report.student.class?.name || selectedClassName,
                }}
                results={report.results.map((r: any) => ({
                  subjectName: r.subjectName,
                  score: r.score,
                  achievement: r.achievement,
                }))}
                term={selectedTerm}
                session={selectedSession}
                averageScore={report.averageScore}
                headerImage={report.school?.logoUrl || undefined}
              />
            </div>
          ))}
        </div>
      ) : (
        !isLoading && (
          <Card className="bg-card border-border shadow-sm rounded-2xl p-12 text-center text-muted-foreground print:hidden">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold text-foreground text-lg">No Midterm Cards Loaded</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Select a class and term above, then click &quot;Generate Midterm Reports&quot; to preview and print.
            </p>
          </Card>
        )
      )}

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .page-break {
            page-break-after: always;
            break-after: page;
          }
        }
      `}</style>
    </div>
  );
}
