'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { PrintableExamResultCard } from '@/components/reports/printable-exam-result-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getAcademicData } from '@/actions/academic-data';
import {
  getStudentReportCard,
  getBroadsheetData,
  updateReportCardRemarks,
  getClassBatchReportCards,
} from '@/actions/results-actions';
import { getStudents } from '@/actions/student-actions';
import {
  Search,
  Printer,
  Loader2,
  Award,
  Book,
  Users,
  School,
  ArrowLeft,
  Download,
  Edit3,
  Save,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Layers,
  SlidersHorizontal,
  FileSpreadsheet,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Standard abbreviations for Nigerian curriculum & common subjects
const STANDARD_SUBJECT_ABBRS: Record<string, string> = {
  'mathematics': 'MATH',
  'further mathematics': 'F.MTH',
  'english language': 'ENG',
  'english': 'ENG',
  'literature in english': 'LIT',
  'literature': 'LIT',
  'computer science': 'COMP',
  'computer studies': 'COMP',
  'data processing': 'DATA',
  'information and communication technology': 'ICT',
  'ict': 'ICT',
  'commerce': 'COMM',
  'commercial studies': 'COMM',
  'biology': 'BIO',
  'chemistry': 'CHEM',
  'physics': 'PHYS',
  'agricultural science': 'AGRIC',
  'agriculture': 'AGR',
  'civic education': 'CIV',
  'civic': 'CIV',
  'economics': 'ECON',
  'geography': 'GEO',
  'government': 'GOV',
  'social studies': 'SOS',
  'basic science': 'B.SCI',
  'basic technology': 'B.TECH',
  'home economics': 'H.ECON',
  'physical and health education': 'PHE',
  'physical education': 'P.E',
  'business studies': 'BUS',
  'financial accounting': 'ACC',
  'accounting': 'ACC',
  'christian religious studies': 'CRS',
  'christian religious knowledge': 'CRK',
  'islamic religious studies': 'IRS',
  'islamic religious knowledge': 'IRK',
  'arabic language': 'ARB',
  'arabic': 'ARB',
  'french': 'FRE',
  'hausa': 'HAU',
  'yoruba': 'YOR',
  'igbo': 'IGB',
  'history': 'HIST',
  'technical drawing': 'TD',
  'visual arts': 'ART',
  'visual art': 'ART',
  'cultural and creative arts': 'CCA',
  'music': 'MUS',
};

// Generates unique, collision-free abbreviations for broadsheet column headers
function getSubjectAbbreviation(subjectName: string, allSubjects: { id: string; name: string }[]): string {
  const cleanName = (subjectName || '').trim();
  const lower = cleanName.toLowerCase();

  let baseAbbr = STANDARD_SUBJECT_ABBRS[lower];

  if (!baseAbbr) {
    const words = cleanName.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      baseAbbr = words.map(w => w[0].toUpperCase()).slice(0, 4).join('');
    } else {
      baseAbbr = cleanName.substring(0, 4).toUpperCase();
    }
  }

  // Check collision with other subjects in the class
  const hasCollision = allSubjects.some(s => {
    if (s.name.toLowerCase() === lower) return false;
    const sLower = (s.name || '').trim().toLowerCase();
    const otherAbbr = STANDARD_SUBJECT_ABBRS[sLower] || (
      s.name.split(/\s+/).length >= 2
        ? s.name.split(/\s+/).map(w => w[0].toUpperCase()).slice(0, 4).join('')
        : s.name.substring(0, 4).toUpperCase()
    );
    return otherAbbr === baseAbbr;
  });

  if (hasCollision) {
    if (lower.includes('commerce')) return 'COMM';
    if (lower.includes('computer')) return 'COMP';
    const index = allSubjects.findIndex(s => s.name === subjectName);
    return `${baseAbbr.substring(0, 3)}${index + 1}`;
  }

  return baseAbbr;
}

// Weight label presets
const WEIGHT_PRESETS = {
  STANDARD: { ca1: 'CA1 (20)', ca2: 'CA2 (20)', exam: 'Exam (60)', total: 'Total (100)' },
  CA40_EXAM60: { ca1: 'CA1 (20)', ca2: 'CA2 (20)', exam: 'Exam (60)', total: 'Total (100)' },
  CA30_EXAM70: { ca1: 'CA1 (15)', ca2: 'CA2 (15)', exam: 'Exam (70)', total: 'Total (100)' },
  SIMPLE: { ca1: 'CA 1', ca2: 'CA 2', exam: 'Exam', total: 'Total' },
};

// Reusable Official Report Card Component (delegates to high-fidelity PrintableExamResultCard)
function ReportCardCanvas({
  card,
  isBatchItem = false,
}: {
  card: any;
  weightLabels?: any;
  isBatchItem?: boolean;
}) {
  if (!card) return null;
  return (
    <div className={isBatchItem ? 'report-card-page print:break-after-page' : ''}>
      <PrintableExamResultCard
        student={card.student}
        results={card.grades || card.results || []}
        term={card.term?.name || card.term || 'Term'}
        session={card.term?.session?.name || card.session || '2024/2025'}
        summary={card.summary}
        behaviouralAssessment={card.behaviouralAssessment}
        behaviouralScores={card.behaviouralScores}
        school={card.school}
        feeInfo={card.feeInfo}
      />
    </div>
  );
}

export default function ViewResultsPage() {
  const { toast } = useToast();

  const [classes, setClasses] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState('');

  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingBatch, setIsLoadingBatch] = useState(false);
  const [viewMode, setViewMode] = useState<'SEARCH' | 'BROADSHEET' | 'REPORT_CARD' | 'BATCH_REPORT_CARDS'>('SEARCH');

  // Single report card view
  const [reportCard, setReportCard] = useState<any>(null);
  const [currentStudentIndex, setCurrentStudentIndex] = useState<number>(-1);

  // Batch report cards
  const [batchCards, setBatchCards] = useState<any[]>([]);

  // Master Broadsheet
  const [broadsheet, setBroadsheet] = useState<any>(null);

  // Remarks editing
  const [isEditingRemarks, setIsEditingRemarks] = useState(false);
  const [teacherRemarkInput, setTeacherRemarkInput] = useState('');
  const [principalRemarkInput, setPrincipalRemarkInput] = useState('');
  const [isSavingRemarks, setIsSavingRemarks] = useState(false);

  // Assessment weight configuration
  const [weightPreset, setWeightPreset] = useState<keyof typeof WEIGHT_PRESETS>('STANDARD');
  const [showWeightSettings, setShowWeightSettings] = useState(false);
  const weightLabels = WEIGHT_PRESETS[weightPreset];

  useEffect(() => {
    (async () => {
      const acadRes = await getAcademicData();
      setClasses(acadRes.classes || []);
      setTerms(acadRes.terms || []);
      setSessions(acadRes.sessions || []);

      const activeTerm = acadRes.terms?.find((t: any) => t.isActive) || acadRes.terms?.[0];
      const activeSession = acadRes.sessions?.find((s: any) => s.isActive) || acadRes.sessions?.[0];
      if (activeTerm) setSelectedTerm(activeTerm.id);
      if (activeSession) setSelectedSession(activeSession.id);
    })();
  }, []);

  const handleSearchStudents = async () => {
    if (!selectedClass) {
      toast({ variant: 'destructive', title: 'Select a Class', description: 'Choose a class to find students.' });
      return;
    }
    setIsLoading(true);
    try {
      const res = await getStudents(selectedClass);
      if (res.success && res.data) setStudents(res.data);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadBroadsheet = async () => {
    if (!selectedClass || !selectedTerm) {
      toast({ variant: 'destructive', title: 'Missing Filters', description: 'Select class and term.' });
      return;
    }
    setIsLoading(true);
    try {
      const res = await getBroadsheetData(selectedClass, selectedTerm, selectedSession);
      if (res.success) {
        setBroadsheet(res);
        setViewMode('BROADSHEET');
      } else {
        throw new Error(res.error || 'Failed to load broadsheet');
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadReportCard = async (studentId: string, indexInCohort: number = -1) => {
    if (!selectedTerm) {
      toast({ variant: 'destructive', title: 'Select Term', description: 'Please select a term first.' });
      return;
    }
    setIsLoading(true);
    try {
      const res = await getStudentReportCard(studentId, selectedTerm);
      if (res.success && res.data) {
        setReportCard(res.data);
        setTeacherRemarkInput(res.data.summary?.teacherRemark || '');
        setPrincipalRemarkInput(res.data.summary?.principalRemark || '');
        if (indexInCohort >= 0) {
          setCurrentStudentIndex(indexInCohort);
        } else {
          const idx = filteredStudents.findIndex(s => s.id === studentId);
          setCurrentStudentIndex(idx);
        }
        setViewMode('REPORT_CARD');
      } else {
        throw new Error(res.error || 'Failed to load report card');
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  // Batch load all class report cards for printing
  const handleLoadBatchReportCards = async () => {
    if (!selectedClass || !selectedTerm) {
      toast({ variant: 'destructive', title: 'Missing Filters', description: 'Select class and term.' });
      return;
    }
    setIsLoadingBatch(true);
    try {
      const res = await getClassBatchReportCards(selectedClass, selectedTerm, selectedSession);
      if (res.success && res.data) {
        setBatchCards(res.data);
        setViewMode('BATCH_REPORT_CARDS');
        toast({
          title: 'Batch Loaded',
          description: `Loaded ${res.data.length} candidate report cards ready for printing.`,
        });
      } else {
        throw new Error(res.error || 'Failed to load batch report cards');
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsLoadingBatch(false);
    }
  };

  const handleNavigateStudent = (direction: 'prev' | 'next') => {
    if (filteredStudents.length === 0) return;
    let nextIdx = currentStudentIndex;
    if (direction === 'prev' && currentStudentIndex > 0) {
      nextIdx = currentStudentIndex - 1;
    } else if (direction === 'next' && currentStudentIndex < filteredStudents.length - 1) {
      nextIdx = currentStudentIndex + 1;
    } else {
      return;
    }
    const nextStudent = filteredStudents[nextIdx];
    if (nextStudent) {
      handleLoadReportCard(nextStudent.id, nextIdx);
    }
  };

  const handleSaveRemarks = async () => {
    if (!reportCard || !reportCard.student?.id || !selectedTerm) return;
    setIsSavingRemarks(true);
    try {
      const res = await updateReportCardRemarks(reportCard.student.id, selectedTerm, {
        teacherRemark: teacherRemarkInput,
        principalRemark: principalRemarkInput,
      });
      if (res.success) {
        setReportCard((prev: any) => ({
          ...prev,
          summary: {
            ...prev.summary,
            teacherRemark: teacherRemarkInput,
            principalRemark: principalRemarkInput,
          },
        }));
        setIsEditingRemarks(false);
        toast({ title: 'Remarks Updated', description: 'Report card remarks successfully saved.' });
      } else {
        throw new Error(res.error || 'Failed to update remarks');
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsSavingRemarks(false);
    }
  };

  const handleExportBroadsheetCSV = () => {
    if (!broadsheet || !broadsheet.broadsheet) return;
    const subjects = broadsheet.subjects || [];
    const headers = [
      'Candidate Name',
      'Student ID',
      ...subjects.map((s: any) => `"${s.name}"`),
      'Total',
      'Average',
      'Rank',
    ];

    const rows = broadsheet.broadsheet.map((stu: any) => {
      const row = [
        `"${stu.student.lastName}, ${stu.student.firstName}"`,
        `"${stu.student.studentId || '-'}"`,
      ];
      subjects.forEach((sub: any) => {
        const sc = stu.subjects?.find((s: any) => s.subjectId === sub.id);
        row.push(sc && sc.total != null ? sc.total : '');
      });
      row.push(stu.totalScore ?? '');
      row.push(stu.average ? stu.average.toFixed(1) : '');
      row.push(stu.rank ?? '');
      return row;
    });

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `broadsheet_${broadsheet.class?.name || 'class'}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const filteredStudents = useMemo(() => {
    if (!searchQuery) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(s =>
      `${s.firstName} ${s.lastName} ${s.studentId}`.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

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
              Academic Results & Broadsheets
            </h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-semibold">
              Official Records
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Print student report cards, inspect cohort rankings, and review broadsheets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {viewMode !== 'SEARCH' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode('SEARCH')}
              className="rounded-xl border-border"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Search
            </Button>
          )}

          {/* Quick Assessment Header Settings */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowWeightSettings(!showWeightSettings)}
            className="rounded-xl border-border"
            title="Configure Assessment Column Headers"
          >
            <SlidersHorizontal className="h-4 w-4 mr-1.5" />
            Weights
          </Button>

          {viewMode === 'BROADSHEET' && (
            <>
              <Button variant="outline" size="sm" onClick={handleExportBroadsheetCSV} className="rounded-xl border-border">
                <Download className="h-4 w-4 mr-2" /> Export CSV
              </Button>
              <Button
                size="sm"
                onClick={() => window.print()}
                className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
              >
                <Printer className="h-4 w-4 mr-2" /> Print Broadsheet
              </Button>
            </>
          )}

          {viewMode === 'REPORT_CARD' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingRemarks(!isEditingRemarks)}
                className="rounded-xl border-border"
              >
                <Edit3 className="h-4 w-4 mr-2" /> Edit Remarks
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadBatchReportCards}
                disabled={isLoadingBatch}
                className="rounded-xl border-border"
              >
                {isLoadingBatch ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Layers className="h-4 w-4 mr-2" />}
                Print All Class Cards
              </Button>
              <Button variant="outline" size="sm" asChild className="rounded-xl border-border">
                <Link
                  href={`/dashboard/results/print?studentId=${reportCard?.student?.id}&classId=${selectedClass}&term=${encodeURIComponent(reportCard?.term?.name || '')}&session=${encodeURIComponent(reportCard?.term?.session?.name || '')}`}
                  target="_blank"
                >
                  <ExternalLink className="h-4 w-4 mr-2" /> Dedicated A4 Tab
                </Link>
              </Button>
              <Button size="sm" onClick={() => window.print()} className="rounded-xl shadow-sm">
                <Printer className="h-4 w-4 mr-2" /> Print Report Card
              </Button>
            </>
          )}

          {viewMode === 'BATCH_REPORT_CARDS' && (
            <Button
              size="sm"
              onClick={() => window.print()}
              className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            >
              <Printer className="h-4 w-4 mr-2" /> Print All ({batchCards.length}) Cards
            </Button>
          )}
        </div>
      </motion.div>

      {/* Weight Header Settings Panel */}
      <AnimatePresence>
        {showWeightSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="print:hidden"
          >
            <Card className="bg-card border-border shadow-sm rounded-2xl p-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h4 className="text-sm font-bold text-foreground">Assessment Column Header Weighting</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Select how continuous assessment and exam score columns are labeled on report cards.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={weightPreset}
                    onValueChange={(val: any) => setWeightPreset(val)}
                  >
                    <SelectTrigger className="w-56 rounded-xl border-border bg-background text-xs h-9">
                      <SelectValue placeholder="Select Weight Preset" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="STANDARD">Standard: CA1 (20) / CA2 (20) / Exam (60)</SelectItem>
                      <SelectItem value="CA30_EXAM70">CA1 (15) / CA2 (15) / Exam (70)</SelectItem>
                      <SelectItem value="SIMPLE">Simple: CA 1 / CA 2 / Exam</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SEARCH VIEW */}
      {viewMode === 'SEARCH' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Filters Sidebar */}
          <Card className="lg:col-span-4 bg-card border-border shadow-sm rounded-2xl">
            <CardHeader className="p-6 border-b border-border">
              <CardTitle className="text-base font-bold text-foreground">Query Parameters</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Select class, term, and academic session.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Session</Label>
                <Select value={selectedSession} onValueChange={setSelectedSession}>
                  <SelectTrigger className="rounded-xl border-border bg-background h-10">
                    <SelectValue placeholder="Select Session" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {sessions.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Term</Label>
                <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                  <SelectTrigger className="rounded-xl border-border bg-background h-10">
                    <SelectValue placeholder="Select Term" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {terms.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Class</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="rounded-xl border-border bg-background h-10">
                    <SelectValue placeholder="Select Class" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-2 flex flex-col gap-2.5">
                <Button
                  onClick={handleSearchStudents}
                  disabled={isLoading || !selectedClass}
                  variant="outline"
                  className="w-full rounded-xl border-border h-10 font-semibold"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Users className="h-4 w-4 mr-2" />}
                  Find Students
                </Button>
                <Button
                  onClick={handleLoadBroadsheet}
                  disabled={isLoading || !selectedClass || !selectedTerm}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-10 shadow-sm font-semibold"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Book className="h-4 w-4 mr-2" />}
                  View Class Broadsheet
                </Button>
                <Button
                  onClick={handleLoadBatchReportCards}
                  disabled={isLoadingBatch || !selectedClass || !selectedTerm}
                  variant="secondary"
                  className="w-full rounded-xl h-10 font-semibold"
                >
                  {isLoadingBatch ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Layers className="h-4 w-4 mr-2" />
                  )}
                  Batch Print All Class Cards
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Students Directory List */}
          <Card className="lg:col-span-8 bg-card border-border shadow-sm rounded-2xl">
            <CardHeader className="p-6 border-b border-border flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <CardTitle className="text-base font-bold text-foreground">Candidate Directory</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Select a candidate to view their complete terminal report card.
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filter name or ID..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 bg-background border-border text-foreground text-xs rounded-xl h-9"
                />
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {students.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground space-y-3">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                  <p className="font-medium text-foreground">Select a class to discover students</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Once a class cohort is loaded, you can inspect each individual report card or batch print all of them.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[550px] overflow-y-auto pr-1">
                  {filteredStudents.map((student, idx) => (
                    <div
                      key={student.id}
                      onClick={() => handleLoadReportCard(student.id, idx)}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-card hover:bg-muted/40 cursor-pointer transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                          {student.firstName?.[0] || 'S'}
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                            {student.lastName}, {student.firstName}
                          </div>
                          <div className="text-[11px] font-mono text-muted-foreground">{student.studentId || 'NO ID'}</div>
                        </div>
                      </div>
                      <div className="p-1.5 rounded-md bg-muted text-muted-foreground group-hover:text-foreground transition-colors">
                        <Award className="h-4 w-4" />
                      </div>
                    </div>
                  ))}
                  {filteredStudents.length === 0 && (
                    <div className="col-span-full py-12 text-center text-xs text-muted-foreground">
                      No candidates match your query.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* SINGLE REPORT CARD VIEW */}
      {viewMode === 'REPORT_CARD' && reportCard && (
        <div className="space-y-4">
          {/* Cohort Navigation Bar (Top Toolbar) */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-card p-3 rounded-2xl border border-border shadow-sm print:hidden">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleNavigateStudent('prev')}
                disabled={currentStudentIndex <= 0}
                className="rounded-xl border-border h-8 px-3 text-xs"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Prev Student
              </Button>
              <div className="text-xs font-semibold text-muted-foreground px-2">
                {currentStudentIndex >= 0 && filteredStudents.length > 0
                  ? `Candidate ${currentStudentIndex + 1} of ${filteredStudents.length}`
                  : 'Candidate Preview'}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleNavigateStudent('next')}
                disabled={currentStudentIndex < 0 || currentStudentIndex >= filteredStudents.length - 1}
                className="rounded-xl border-border h-8 px-3 text-xs"
              >
                Next Student <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            {/* Jump to candidate dropdown */}
            {filteredStudents.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium hidden md:inline">Jump to:</span>
                <Select
                  value={reportCard.student?.id}
                  onValueChange={id => {
                    const idx = filteredStudents.findIndex(s => s.id === id);
                    handleLoadReportCard(id, idx);
                  }}
                >
                  <SelectTrigger className="w-52 rounded-xl border-border bg-background text-xs h-8">
                    <SelectValue placeholder="Select student..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border max-h-64">
                    {filteredStudents.map((s, idx) => (
                      <SelectItem key={s.id} value={s.id} className="text-xs">
                        {idx + 1}. {s.lastName}, {s.firstName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Remarks Editing Drawer */}
          <AnimatePresence>
            {isEditingRemarks && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="print:hidden"
              >
                <Card className="bg-card border-border shadow-sm rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-foreground">
                      Edit Terminal Remarks for {reportCard.student?.firstName} {reportCard.student?.lastName}
                    </h3>
                    <Button size="sm" onClick={handleSaveRemarks} disabled={isSavingRemarks} className="rounded-xl">
                      {isSavingRemarks ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      Save Remarks
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Form Teacher Remark</Label>
                      <Input
                        value={teacherRemarkInput}
                        onChange={e => setTeacherRemarkInput(e.target.value)}
                        placeholder="e.g. An excellent student with keen focus and high academic dedication."
                        className="bg-background border-border text-foreground text-xs rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Principal Remark</Label>
                      <Input
                        value={principalRemarkInput}
                        onChange={e => setPrincipalRemarkInput(e.target.value)}
                        placeholder="e.g. Commendable performance. Promoted to next class with honours."
                        className="bg-background border-border text-foreground text-xs rounded-xl"
                      />
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Render Single Report Card */}
          <ReportCardCanvas card={reportCard} weightLabels={weightLabels} />
        </div>
      )}

      {/* BATCH REPORT CARDS VIEW (Print All Class Cards) */}
      {viewMode === 'BATCH_REPORT_CARDS' && (
        <div className="space-y-6">
          {/* Action Bar for Batch View */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-card p-4 rounded-2xl border border-border shadow-sm print:hidden">
            <div>
              <h3 className="text-base font-bold text-foreground">
                Batch Printing: {batchCards[0]?.student?.class?.name || 'Class Cohort'}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ready to print {batchCards.length} student report cards with individual page breaks.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode('SEARCH')}
                className="rounded-xl border-border"
              >
                Back to Search
              </Button>
              <Button
                size="sm"
                onClick={() => window.print()}
                className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
              >
                <Printer className="h-4 w-4 mr-2" /> Print All ({batchCards.length}) Cards
              </Button>
            </div>
          </div>

          {/* List of Report Cards with Page Breaks */}
          <div className="space-y-8 print:space-y-0">
            {batchCards.map((cardItem) => (
              <ReportCardCanvas
                key={cardItem.student?.id}
                card={cardItem}
                weightLabels={weightLabels}
                isBatchItem={true}
              />
            ))}
            {batchCards.length === 0 && (
              <Card className="p-12 text-center text-muted-foreground">
                No report cards available to batch print.
              </Card>
            )}
          </div>
        </div>
      )}

      {/* MASTER BROADSHEET VIEW */}
      {viewMode === 'BROADSHEET' && broadsheet && (
        <Card className="broadsheet-print-container bg-card border-border shadow-sm rounded-2xl overflow-hidden print:shadow-none print:border-none print:bg-white print:text-black">
          <CardHeader className="p-6 border-b border-border bg-card print:border-b-2 print:border-black print:pb-3">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <CardTitle className="text-xl font-bold text-foreground print:text-black uppercase tracking-wide">
                  Class Broadsheet Master Ledger
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground print:text-black font-semibold mt-1">
                  {broadsheet.class?.name} • {broadsheet.term?.name || broadsheet.term} • {broadsheet.term?.session?.name || broadsheet.session}
                </CardDescription>
              </div>
              <div className="text-xs text-muted-foreground font-mono print:text-black">
                Total Candidates: <span className="font-bold text-foreground print:text-black">{broadsheet.broadsheet?.length || 0}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs whitespace-nowrap border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 font-bold text-muted-foreground print:bg-slate-100 print:text-black">
                  <th className="p-2.5 text-center w-10 border-r border-border">#</th>
                  <th className="p-2.5 text-left sticky left-0 z-10 bg-muted/40 print:bg-slate-100 border-r border-border min-w-[180px]">
                    Candidate Name
                  </th>
                  {broadsheet.subjects?.map((sub: any) => {
                    const abbr = getSubjectAbbreviation(sub.name, broadsheet.subjects);
                    return (
                      <th
                        key={sub.id}
                        title={sub.name}
                        className="p-2.5 text-center border-r border-border min-w-[65px] uppercase text-[11px] font-bold"
                      >
                        {abbr}
                      </th>
                    );
                  })}
                  <th className="p-2.5 text-center border-r border-border min-w-[65px] bg-primary/10 text-primary font-bold">
                    Total
                  </th>
                  <th className="p-2.5 text-center border-r border-border min-w-[65px] bg-primary/10 text-primary font-bold">
                    Avg %
                  </th>
                  <th className="p-2.5 text-center min-w-[55px] bg-muted font-black text-foreground">
                    Rank
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {broadsheet.broadsheet?.map((item: any, idx: number) => (
                  <tr key={item.student.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-2.5 text-center font-mono text-muted-foreground border-r border-border">{idx + 1}</td>
                    <td className="p-2.5 font-semibold text-foreground sticky left-0 z-10 bg-card border-r border-border">
                      {item.student.lastName}, {item.student.firstName}
                      <span className="text-[10px] font-mono text-muted-foreground block">{item.student.studentId || '-'}</span>
                    </td>
                    {broadsheet.subjects?.map((sub: any) => {
                      const sc = item.subjects?.find((s: any) => s.subjectId === sub.id);
                      return (
                        <td key={sub.id} className="p-2.5 text-center font-medium border-r border-border">
                          {sc && sc.total != null ? sc.total : '-'}
                        </td>
                      );
                    })}
                    <td className="p-2.5 text-center font-bold border-r border-border bg-primary/5 text-foreground">
                      {item.totalScore ?? '-'}
                    </td>
                    <td className="p-2.5 text-center font-bold border-r border-border bg-primary/5 text-foreground">
                      {item.average != null ? item.average.toFixed(1) : '-'}
                    </td>
                    <td className="p-2.5 text-center font-black bg-muted/40 text-foreground">
                      {item.rank ? `#${item.rank}` : '-'}
                    </td>
                  </tr>
                ))}
                {(!broadsheet.broadsheet || broadsheet.broadsheet.length === 0) && (
                  <tr>
                    <td colSpan={(broadsheet.subjects?.length || 0) + 5} className="p-12 text-center text-muted-foreground">
                      No student records found in this broadsheet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Production Print CSS */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          @page landscape-sheet {
            size: A4 landscape;
            margin: 8mm;
          }
          .print-landscape,
          .broadsheet-print-container {
            page: landscape-sheet !important;
          }
          body {
            background: white !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print,
          nav,
          aside,
          header,
          [role="navigation"],
          .print\\:hidden {
            display: none !important;
          }
          .report-card-page {
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin: 0 !important;
            padding: 16px 20px !important;
            border: 1px solid #cbd5e1 !important;
            box-shadow: none !important;
            background: white !important;
            width: 100% !important;
            min-height: 270mm;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }
          .report-card-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .broadsheet-print-container {
            width: 100% !important;
            margin: 0 !important;
            padding: 10px !important;
            background: white !important;
            color: black !important;
            border: none !important;
            box-shadow: none !important;
          }
          table {
            page-break-inside: auto;
            border-collapse: collapse !important;
            width: 100% !important;
          }
          tr, td, th {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
