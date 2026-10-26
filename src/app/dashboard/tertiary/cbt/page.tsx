'use client';

import { saveExamDraft, loadExamDraft, clearExamDraft } from '@/lib/offline-vault';

import { useState, useEffect, useTransition } from 'react';
import { useRole } from '@/context/role-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import {
  getCbtExams,
  getCbtExamDetails,
  getCbtExamForManagement,
  createCbtExam,
  addCbtQuestionAction,
  bulkAddCbtQuestionsAction,
  bulkImportMultiCourseQuestionBankAction,
  deleteCbtQuestionAction,
  submitCbtExamAction,
} from '@/actions/cbt-actions';
import {
  Lock,
  Timer,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Award,
  FileQuestion,
  Plus,
  Play,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Settings2,
  Trash2,
  Users,
  BookOpen,
  UploadCloud,
  Download,
  FileSpreadsheet,
  Building2,
  Filter,
} from 'lucide-react';

interface ParsedBulkQuestion {
  faculty?: string;
  department?: string;
  courseCode?: string;
  category?: 'CA' | 'EXAM';
  questionText: string;
  options: { id: string; text: string }[];
  correctOption: 'A' | 'B' | 'C' | 'D';
  points: number;
}

/**
 * Universal Question Bank Parser:
 * Supports:
 * 1) 11-Column Multi-Faculty/Department CSV: Faculty,Department,CourseCode,Category,Question,OptionA,OptionB,OptionC,OptionD,CorrectOption,Points
 * 2) 7-Column Single-Course CSV: Question,OptionA,OptionB,OptionC,OptionD,CorrectOption,Points
 * 3) Aiken Format (with optional COURSE:, DEPARTMENT:, FACULTY: tags)
 * 4) JSON Format
 */
function parseBulkQuestionText(rawInput: string, defaultCourseCode?: string): ParsedBulkQuestion[] {
  const trimmed = rawInput.trim();
  if (!trimmed) return [];

  // 1. Try JSON format first
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const arr = Array.isArray(parsed) ? parsed : parsed.questions || [];
      return arr
        .map((item: any) => {
          const qText = (item.questionText || item.question || '').trim();
          const opts = Array.isArray(item.options)
            ? item.options
            : [
                { id: 'A', text: String(item.optionA || item.A || '') },
                { id: 'B', text: String(item.optionB || item.B || '') },
                { id: 'C', text: String(item.optionC || item.C || '') },
                { id: 'D', text: String(item.optionD || item.D || '') },
              ];
          const corr = String(item.correctOption || item.answer || 'A')
            .trim()
            .toUpperCase()
            .charAt(0) as 'A' | 'B' | 'C' | 'D';
          return {
            faculty: item.faculty || 'Faculty of Computing',
            department: item.department || 'Computer Science',
            courseCode: (item.courseCode || item.course || defaultCourseCode || 'CSC301').toUpperCase(),
            category: String(item.category || 'CA').toUpperCase() === 'EXAM' ? 'EXAM' : 'CA',
            questionText: qText,
            options: opts,
            correctOption: ['A', 'B', 'C', 'D'].includes(corr) ? corr : 'A',
            points: Number(item.points) || 10,
          };
        })
        .filter((q: ParsedBulkQuestion) => q.questionText.length > 0);
    } catch {
      // Fall through to Aiken / CSV
    }
  }

  // 2. Check if Aiken format (contains lines starting with A. / B. and ANSWER:)
  if (/^ANSWER\s*:/im.test(trimmed)) {
    const blocks = trimmed.split(/\n\s*\n/);
    const results: ParsedBulkQuestion[] = [];

    for (const block of blocks) {
      const lines = block
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length < 3) continue;

      let faculty = 'Faculty of Computing';
      let department = 'Computer Science';
      let courseCode = defaultCourseCode || 'CSC301';
      let category: 'CA' | 'EXAM' = 'CA';
      let questionText = '';
      const optMap: Record<string, string> = { A: '', B: '', C: '', D: '' };
      let correctOption: 'A' | 'B' | 'C' | 'D' = 'A';
      let points = 10;

      for (const line of lines) {
        const facMatch = line.match(/^FACULTY\s*:\s*(.+)$/i);
        const deptMatch = line.match(/^DEPARTMENT\s*:\s*(.+)$/i);
        const courseMatch = line.match(/^COURSE(?:\s*CODE)?\s*:\s*(.+)$/i);
        const catMatch = line.match(/^CATEGORY\s*:\s*(CA|EXAM)/i);
        const optMatch = line.match(/^([A-D])[.)]\s*(.+)$/i);
        const ansMatch = line.match(/^ANSWER\s*:\s*([A-D])/i);
        const ptsMatch = line.match(/^POINTS?\s*:\s*(\d+(\.\d+)?)/i);

        if (facMatch) {
          faculty = facMatch[1].trim();
        } else if (deptMatch) {
          department = deptMatch[1].trim();
        } else if (courseMatch) {
          courseCode = courseMatch[1].trim().toUpperCase();
        } else if (catMatch) {
          category = catMatch[1].toUpperCase() as 'CA' | 'EXAM';
        } else if (ansMatch) {
          correctOption = ansMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
        } else if (ptsMatch) {
          points = Number(ptsMatch[1]) || 10;
        } else if (optMatch) {
          const letter = optMatch[1].toUpperCase();
          optMap[letter] = optMatch[2].trim();
        } else if (!questionText) {
          questionText = line.replace(/^\d+[.)]\s*/, '').trim();
        } else {
          questionText += ' ' + line;
        }
      }

      if (questionText && (optMap.A || optMap.B)) {
        results.push({
          faculty,
          department,
          courseCode,
          category,
          questionText,
          options: [
            { id: 'A', text: optMap.A || 'Option A' },
            { id: 'B', text: optMap.B || 'Option B' },
            { id: 'C', text: optMap.C || 'None of the above' },
            { id: 'D', text: optMap.D || 'All of the above' },
          ],
          correctOption,
          points,
        });
      }
    }
    if (results.length > 0) return results;
  }

  // 3. Parse CSV / TSV rows
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const results: ParsedBulkQuestion[] = [];

  const splitCsvRow = (row: string): string[] => {
    if (row.includes('\t')) {
      return row.split('\t').map((c) => c.trim());
    }
    const cols: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '"') {
        if (inQuotes && row[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        cols.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    cols.push(cur.trim());
    return cols;
  };

  let isMultiFacultyFormat = false;
  if (lines.length > 0) {
    const headerCols = splitCsvRow(lines[0]).map((c) => c.toLowerCase());
    if (
      headerCols.includes('faculty') ||
      headerCols.includes('department') ||
      headerCols.includes('coursecode') ||
      headerCols.includes('course')
    ) {
      isMultiFacultyFormat = true;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const cols = splitCsvRow(lines[i]);
    if (cols.length < 3) continue;

    const firstColLower = cols[0].toLowerCase();
    if (
      i === 0 &&
      (firstColLower === 'faculty' ||
        firstColLower === 'department' ||
        firstColLower === 'coursecode' ||
        firstColLower === 'question' ||
        firstColLower === 'questiontext' ||
        firstColLower.includes('question stem'))
    ) {
      continue;
    }

    // Detect if this row has 10-11 columns (Faculty, Department, CourseCode, Category, Question, OptionA, OptionB, OptionC, OptionD, CorrectOption, Points)
    if (isMultiFacultyFormat || cols.length >= 10) {
      const faculty = cols[0] || 'Faculty of Computing';
      const department = cols[1] || 'Computer Science';
      const courseCode = (cols[2] || defaultCourseCode || 'CSC301').toUpperCase();
      const rawCat = (cols[3] || 'CA').toUpperCase();
      const category: 'CA' | 'EXAM' = rawCat === 'EXAM' ? 'EXAM' : 'CA';
      const qText = cols[4];
      const optA = cols[5] || 'Option A';
      const optB = cols[6] || 'Option B';
      const optC = cols[7] || 'None of the above';
      const optD = cols[8] || 'All of the above';
      const rawCorrect = (cols[9] || 'A').trim().toUpperCase().charAt(0);
      const correctOption = (['A', 'B', 'C', 'D'].includes(rawCorrect) ? rawCorrect : 'A') as 'A' | 'B' | 'C' | 'D';
      const points = Number(cols[10]) || 10;

      if (qText) {
        results.push({
          faculty,
          department,
          courseCode,
          category,
          questionText: qText,
          options: [
            { id: 'A', text: optA },
            { id: 'B', text: optB },
            { id: 'C', text: optC },
            { id: 'D', text: optD },
          ],
          correctOption,
          points,
        });
      }
    } else {
      // Simple 7-column format: Question, OptionA, OptionB, OptionC, OptionD, CorrectOption, Points
      const qText = cols[0];
      const optA = cols[1] || 'Option A';
      const optB = cols[2] || 'Option B';
      const optC = cols[3] || 'None of the above';
      const optD = cols[4] || 'All of the above';
      const rawCorrect = (cols[5] || 'A').trim().toUpperCase().charAt(0);
      const correctOption = (['A', 'B', 'C', 'D'].includes(rawCorrect) ? rawCorrect : 'A') as 'A' | 'B' | 'C' | 'D';
      const points = Number(cols[6]) || 10;

      if (qText) {
        results.push({
          courseCode: defaultCourseCode || 'CSC301',
          questionText: qText,
          options: [
            { id: 'A', text: optA },
            { id: 'B', text: optB },
            { id: 'C', text: optC },
            { id: 'D', text: optD },
          ],
          correctOption,
          points,
        });
      }
    }
  }

  return results;
}


// Steganographic invisible watermarking with zero-width characters (\u200B and \u200C)
function embedWatermark(text: string, identifier: string): string {
  if (!text || !identifier) return text || '';
  const binary = identifier
    .split('')
    .map((c) => c.charCodeAt(0).toString(2).padStart(8, '0'))
    .join('');
  const invisibleSeq = binary
    .split('')
    .map((b) => (b === '1' ? '\u200C' : '\u200B'))
    .join('');
  const mid = Math.floor(text.length / 2);
  return text.slice(0, mid) + invisibleSeq + text.slice(mid);
}

export default function TertiaryCbtPage() {
  const { role, activeModules } = useRole();
  const hasTertiary = activeModules?.includes('TERTIARY_INSTITUTION');
  const isFacultyOrAdmin = ['SUPER_ADMIN', 'ADMIN', 'SLT', 'HOD', 'LECTURER', 'TEACHER', 'EXAM_OFFICER'].includes(role || '');

  const [exams, setExams] = useState<any[]>([]);
  const [offerings, setOfferings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeExam, setActiveExam] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [isExamCompleted, setIsExamCompleted] = useState(false);
  const [examResult, setExamResult] = useState<any>(null);
  const [isPending, startTransition] = useTransition();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMasterBulkOpen, setIsMasterBulkOpen] = useState(false);
  const { toast } = useToast();

  // Faculty, Department & Course Filters
  const [selectedFaculty, setSelectedFaculty] = useState<string>('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');
  const [selectedCourseCode, setSelectedCourseCode] = useState<string>('ALL');

  // Question Bank & Submissions Management Modal State (For Lecturers / Admins)
  const [managedExam, setManagedExam] = useState<any>(null);
  const [manageTab, setManageTab] = useState<'questions' | 'bulk' | 'submissions'>('questions');
  const [isManageLoading, setIsManageLoading] = useState(false);

  // Add Single Question inside "Manage Questions" Modal
  const [qText, setQText] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [qCorrect, setQCorrect] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [qPoints, setQPoints] = useState(10);

  // Bulk Upload State (Used in Master Upload, Manage Modal & Create Modal)
  const [bulkRawText, setBulkRawText] = useState('');
  const [bulkPreview, setBulkPreview] = useState<ParsedBulkQuestion[]>([]);
  const [showCreateBulkBox, setShowCreateBulkBox] = useState(false);

  // New Exam Creation Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCourseOfferingId, setNewCourseOfferingId] = useState('');
  const [newTargetCategory, setNewTargetCategory] = useState<'CA' | 'EXAM'>('CA');
  const [newDuration, setNewDuration] = useState(30);
  const [newTotalMarks, setNewTotalMarks] = useState(40);
  const [newQuestions, setNewQuestions] = useState<any[]>([
    {
      questionText: 'Which data structure operates on a Last-In, First-Out (LIFO) basis?',
      options: [
        { id: 'A', text: 'Queue' },
        { id: 'B', text: 'Stack' },
        { id: 'C', text: 'Linked List' },
        { id: 'D', text: 'Binary Tree' },
      ],
      correctOption: 'B',
      points: 10,
    },
    {
      questionText: 'What is the worst-case time complexity of QuickSort?',
      options: [
        { id: 'A', text: 'O(n log n)' },
        { id: 'B', text: 'O(n)' },
        { id: 'C', text: 'O(n^2)' },
        { id: 'D', text: 'O(1)' },
      ],
      correctOption: 'C',
      points: 10,
    },
  ]);

  const loadExams = async () => {
    setIsLoading(true);
    const res = await getCbtExams();
    if (res.success && res.data) {
      setExams(res.data);
      if (res.offerings) {
        setOfferings(res.offerings);
        if (res.offerings.length > 0 && !newCourseOfferingId) {
          setNewCourseOfferingId(res.offerings[0].id);
        }
      }
    }
    setIsLoading(false);
  };

  const [isNetworkOnline, setIsNetworkOnline] = useState(true);

  useEffect(() => {
    loadExams();

    const handleOnline = () => {
      setIsNetworkOnline(true);
      toast({ title: 'Connection Restored', description: 'Network connected. Offline exam answers synced with server.' });
    };
    const handleOffline = () => {
      setIsNetworkOnline(false);
      toast({ variant: 'destructive', title: 'Network Disconnected', description: 'You are working offline. Answers are safely cached in local storage.' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Anti-cheat: Tab-switch, window blur & clipboard lockdown
  useEffect(() => {
    if (!activeExam || isExamCompleted) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount((prev) => {
          const next = prev + 1;
          toast({
            variant: 'destructive',
            title: 'Anti-Cheat Security Warning!',
            description: `Focus lost from exam environment. Strike ${next} of ${activeExam.maxTabSwitches}. Subsequent violations will disqualify your submission.`,
          });
          return next;
        });
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'u', 'C', 'X', 'U'].includes(e.key)) {
        if (!['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
          e.preventDefault();
          toast({
            variant: 'destructive',
            title: 'Clipboard Copy Restricted',
            description: 'Copying exam questions is strictly prohibited to maintain test integrity.',
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeExam, isExamCompleted, toast]);

  // Exam Countdown Timer
  useEffect(() => {
    if (!activeExam || isExamCompleted || timeLeftSeconds <= 0) return;

    const interval = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeExam, isExamCompleted, timeLeftSeconds]);

  const handleStartExam = async (examId: string) => {
    setIsLoading(true);
    const res = await getCbtExamDetails(examId);
    if (res.success && res.data && res.data.exam) {
      const exam = res.data.exam;
      setActiveExam(exam);
      setTimeLeftSeconds(exam.durationMinutes * 60);
      setTabSwitchCount(0);
      setCurrentQuestionIndex(0);
      setIsExamCompleted(false);
      setExamResult(null);

      // Check for offline vault draft
      const draft = await loadExamDraft(`cbt_${exam.id}`);
      if (draft && draft.answers && Object.keys(draft.answers).length > 0) {
        setAnswers(draft.answers);
        toast({
          title: 'Offline Draft Restored',
          description: `Loaded ${Object.keys(draft.answers).length} saved response(s) from local cache.`,
        });
      } else {
        setAnswers({});
      }
    }
    setIsLoading(false);
  };

  const handleOpenManageModal = async (examId: string, initialTab: 'questions' | 'bulk' | 'submissions' = 'questions') => {
    setManageTab(initialTab);
    setIsManageLoading(true);
    const res = await getCbtExamForManagement(examId);
    if (res.success && res.data) {
      setManagedExam(res.data);
    } else {
      toast({ variant: 'destructive', title: 'Error', description: res.error || 'Could not load exam details.' });
    }
    setIsManageLoading(false);
  };

  const handleDownloadCsvTemplate = () => {
    const sampleCsv = [
      'Faculty,Department,CourseCode,Category,Question,OptionA,OptionB,OptionC,OptionD,CorrectOption,Points',
      '"Faculty of Computing","Computer Science",CSC301,CA,"Which data structure operates on a First-In, First-Out (FIFO) basis?",Stack,Queue,Binary Search Tree,Priority Heap,B,10',
      '"Faculty of Computing","Computer Science",CSC301,CA,"What is the time complexity of searching in a balanced Binary Search Tree (AVL)?",O(1),O(n),O(log n),O(n log n),C,10',
      '"Faculty of Computing","Computer Science",CSC201,CA,"In Object-Oriented Programming, binding a method call at runtime is known as:",Static Binding,Dynamic Dispatch,Encapsulation,Inlining,B,10',
      '"Faculty of Science","Mathematics",MTH101,CA,"What is the first derivative of sin(x) with respect to x?",cos(x),-cos(x),tan(x),-sin(x),A,10',
      '"Directorate of General Studies","General Studies",GST101,EXAM,"Which reading technique involves looking for specific information quickly?",Skimming,Scanning,Intensive Reading,Sub-vocalization,B,10',
    ].join('\n');

    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'proxima_cbt_question_bank_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkTextChange = (text: string) => {
    setBulkRawText(text);
    const parsed = parseBulkQuestionText(text, managedExam?.courseCode);
    setBulkPreview(parsed);
  };

  const handleBulkFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const content = await file.text();
      setBulkRawText(content);
      const parsed = parseBulkQuestionText(content, managedExam?.courseCode);
      setBulkPreview(parsed);
      toast({
        title: 'File Parsed Successfully',
        description: `Detected ${parsed.length} valid multiple-choice questions from ${file.name}.`,
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'File Read Error', description: 'Could not read the selected file.' });
    }
  };

  const handleCommitBulkToExistingExam = () => {
    if (!managedExam || bulkPreview.length === 0) return;

    // Filter to questions matching this exam's courseCode if courseCode was specified in multi-course CSV
    const targetCode = (managedExam.courseCode || '').toUpperCase();
    const matchingQuestions = bulkPreview.filter(
      (q) => !q.courseCode || !targetCode || targetCode === 'GENERAL' || q.courseCode.toUpperCase() === targetCode
    );
    const questionsToImport = matchingQuestions.length > 0 ? matchingQuestions : bulkPreview;

    startTransition(async () => {
      const res = await bulkAddCbtQuestionsAction({
        examId: managedExam.id,
        questions: questionsToImport,
      });

      if (res.success) {
        toast({
          title: 'Bulk Question Bank Imported!',
          description: res.message || `Imported ${questionsToImport.length} questions into ${managedExam.title}.`,
        });
        setBulkRawText('');
        setBulkPreview([]);
        await handleOpenManageModal(managedExam.id, 'questions');
        loadExams();
      } else {
        toast({ variant: 'destructive', title: 'Bulk Import Failed', description: res.error });
      }
    });
  };

  const handleCommitMasterMultiCourseImport = () => {
    if (bulkPreview.length === 0) return;

    startTransition(async () => {
      const res = await bulkImportMultiCourseQuestionBankAction({
        questions: bulkPreview,
      });

      if (res.success) {
        toast({
          title: 'Master Question Bank Routed by Faculty & Department!',
          description: res.message,
        });
        setBulkRawText('');
        setBulkPreview([]);
        setIsMasterBulkOpen(false);
        loadExams();
      } else {
        toast({ variant: 'destructive', title: 'Import Failed', description: res.error });
      }
    });
  };

  const handleAppendBulkToDraftExam = () => {
    if (bulkPreview.length === 0) return;
    setNewQuestions((prev) => [...prev, ...bulkPreview]);
    toast({
      title: 'Questions Appended to Draft',
      description: `Added ${bulkPreview.length} bulk questions to the exam draft.`,
    });
    setBulkRawText('');
    setBulkPreview([]);
    setShowCreateBulkBox(false);
  };

  const handleAddQuestionToExistingExam = () => {
    if (!managedExam) return;
    if (!qText.trim() || !optA.trim() || !optB.trim()) {
      toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please enter the question text and options.' });
      return;
    }

    startTransition(async () => {
      const res = await addCbtQuestionAction({
        examId: managedExam.id,
        questionText: qText,
        options: [
          { id: 'A', text: optA },
          { id: 'B', text: optB },
          { id: 'C', text: optC || 'None of the above' },
          { id: 'D', text: optD || 'All of the above' },
        ],
        correctOption: qCorrect,
        points: Number(qPoints) || 10,
      });

      if (res.success) {
        toast({ title: 'Question Added', description: 'Question added to CBT Question Bank.' });
        setQText('');
        setOptA('');
        setOptB('');
        setOptC('');
        setOptD('');
        await handleOpenManageModal(managedExam.id, 'questions');
        loadExams();
      } else {
        toast({ variant: 'destructive', title: 'Failed', description: res.error });
      }
    });
  };

  const handleDeleteQuestion = (questionId: string) => {
    if (!managedExam) return;
    startTransition(async () => {
      const res = await deleteCbtQuestionAction(questionId);
      if (res.success) {
        toast({ title: 'Question Removed', description: 'Question removed from CBT exam.' });
        await handleOpenManageModal(managedExam.id, 'questions');
        loadExams();
      }
    });
  };

  const handleSelectAnswer = (questionId: string, optionId: string) => {
    setAnswers((prev) => {
      const updated = { ...prev, [questionId]: optionId };
      if (activeExam) {
        saveExamDraft(`cbt_${activeExam.id}`, {
          examTitle: activeExam.title,
          answers: updated,
          timeLeftSeconds,
        });
      }
      return updated;
    });
  };

  const handleAutoSubmit = () => {
    toast({
      title: 'Time Expired',
      description: 'Exam time has elapsed. Auto-submitting current responses...',
    });
    finalizeSubmission(true);
  };

  const finalizeSubmission = (isAuto = false) => {
    if (!activeExam) return;

    startTransition(async () => {
      const res = await submitCbtExamAction({
        examId: activeExam.id,
        answers,
        tabSwitchCount,
        isAutoSubmitted: isAuto,
      });

      if (res.success && res.data) {
        if (activeExam) clearExamDraft(`cbt_${activeExam.id}`);
        setIsExamCompleted(true);
        setExamResult(res.data);
        loadExams();
        toast({
          title: 'Exam Submitted Successfully',
          description: `Score: ${res.data.scoreAchieved} / ${res.data.totalMarks} (${res.data.percentageScore.toFixed(1)}%)`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Submission Failed',
          description: res.error,
        });
      }
    });
  };

  const handleAddDraftQuestion = () => {
    setNewQuestions((prev) => [
      ...prev,
      {
        questionText: '',
        options: [
          { id: 'A', text: '' },
          { id: 'B', text: '' },
          { id: 'C', text: '' },
          { id: 'D', text: '' },
        ],
        correctOption: 'A',
        points: 10,
      },
    ]);
  };

  const handleUpdateDraftQuestion = (idx: number, field: string, value: any) => {
    setNewQuestions((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const handleUpdateDraftOption = (qIdx: number, optId: string, text: string) => {
    setNewQuestions((prev) => {
      const copy = [...prev];
      copy[qIdx] = {
        ...copy[qIdx],
        options: copy[qIdx].options.map((o: any) => (o.id === optId ? { ...o, text } : o)),
      };
      return copy;
    });
  };

  const handleRemoveDraftQuestion = (idx: number) => {
    setNewQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCreateExam = () => {
    if (!newTitle.trim()) {
      toast({ variant: 'destructive', title: 'Title Required', description: 'Please enter an exam title.' });
      return;
    }

    const validQuestions = newQuestions.filter((q) => q.questionText.trim().length > 0);
    if (validQuestions.length === 0) {
      toast({ variant: 'destructive', title: 'Questions Required', description: 'Add at least 1 question.' });
      return;
    }

    startTransition(async () => {
      const res = await createCbtExam({
        title: newTitle,
        description: newDescription,
        courseOfferingId: newCourseOfferingId || undefined,
        durationMinutes: Number(newDuration),
        totalMarks: Number(newTotalMarks),
        targetCategory: newTargetCategory,
        antiCheatLevel: 'STRICT',
        maxTabSwitches: 3,
        questions: validQuestions,
      });

      if (res.success) {
        toast({
          title: 'CBT Assessment Published',
          description: 'Students enrolled in the course can now take the CBT test and scores will pipe to the Gradebook.',
        });
        setIsCreateOpen(false);
        setNewTitle('');
        setNewDescription('');
        loadExams();
      } else {
        toast({ variant: 'destructive', title: 'Creation Failed', description: res.error });
      }
    });
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Distinct Faculties, Departments, and Course Codes for Filtering
  const distinctFaculties = Array.from(new Set(exams.map((e) => e.facultyName).filter(Boolean)));
  const distinctDepartments = Array.from(
    new Set(
      exams
        .filter((e) => selectedFaculty === 'ALL' || e.facultyName === selectedFaculty)
        .map((e) => e.departmentName)
        .filter(Boolean)
    )
  );
  const distinctCourses = Array.from(
    new Set(
      exams
        .filter(
          (e) =>
            (selectedFaculty === 'ALL' || e.facultyName === selectedFaculty) &&
            (selectedDepartment === 'ALL' || e.departmentName === selectedDepartment)
        )
        .map((e) => e.courseCode)
        .filter(Boolean)
    )
  );

  const filteredExams = exams.filter((e) => {
    if (selectedFaculty !== 'ALL' && e.facultyName !== selectedFaculty) return false;
    if (selectedDepartment !== 'ALL' && e.departmentName !== selectedDepartment) return false;
    if (selectedCourseCode !== 'ALL' && e.courseCode !== selectedCourseCode) return false;
    return true;
  });

  // --- VIEW 1: ACTIVE EXAM IN PROGRESS ---
  if (activeExam && !isExamCompleted) {
    const qList = activeExam.questions || [];
    const currentQ = qList[currentQuestionIndex];
    let parsedOptions: any[] = [];
    try {
      parsedOptions = currentQ ? JSON.parse(currentQ.optionsJson) : [];
    } catch {
      parsedOptions = [];
    }

    const isLastQ = currentQuestionIndex === qList.length - 1;
    const answeredCount = Object.keys(answers).length;

    return (
      <div className="space-y-6 max-w-5xl mx-auto py-4 px-3 sm:px-4">
        {/* Top Control Bar with Timer & Anti-Cheat */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 text-white p-4 rounded-2xl shadow-lg border border-slate-800">
          <div>
            <h2 className="text-lg font-bold">{activeExam.title}</h2>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>{activeExam.courseOffering?.course?.code || 'TERTIARY CBT'}</span>
              <span>•</span>
              <span>{qList.length} Questions</span>
              <span>•</span>
              <span>Weight: {activeExam.totalMarks} Marks ({activeExam.targetCategory})</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Offline Vault & Network Status Indicator */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
              isNetworkOnline 
                ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300' 
                : 'bg-amber-950/80 border-amber-800/80 text-amber-300 animate-pulse'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isNetworkOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span>{isNetworkOnline ? 'Offline Vault Synced' : 'Working Offline (Cached)'}</span>
            </div>

            {/* Anti-cheat strike counter */}
            <div className="flex items-center gap-1.5 bg-red-950/80 border border-red-800/60 px-3 py-1.5 rounded-xl text-xs text-red-300 font-medium">
              <ShieldAlert className="h-4 w-4 text-red-400" />
              <span>Strikes: {tabSwitchCount}/{activeExam.maxTabSwitches}</span>
            </div>

            {/* Countdown timer */}
            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-xl font-mono text-base font-bold ${
              timeLeftSeconds < 300 ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-800 text-emerald-400 border border-slate-700'
            }`}>
              <Timer className="h-4 w-4" />
              <span>{formatTimer(timeLeftSeconds)}</span>
            </div>
          </div>
        </div>

        {/* Question Panel */}
        {currentQ ? (
          <Card 
            className="border shadow-md select-none"
            onCopy={(e) => {
              e.preventDefault();
              toast({
                variant: 'destructive',
                title: 'Copying Restricted',
                description: 'Question prompts cannot be copied during active CBT examinations.',
              });
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              toast({
                variant: 'destructive',
                title: 'Security Notice',
                description: 'Right-click context menu is disabled in the examination environment.',
              });
            }}
          >
            <CardHeader className="border-b bg-muted/20">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Question {currentQuestionIndex + 1} of {qList.length}
                  </span>
                  <Badge variant="secondary" className="text-[10px] gap-1 font-mono">
                    <Lock className="w-3 h-3 text-primary" /> Protected Item
                  </Badge>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {currentQ.points} Points
                </Badge>
              </div>
              <CardTitle className="text-lg font-medium text-foreground pt-2 select-none">
                {embedWatermark(
                  currentQ.questionText,
                  activeExam.courseOffering?.course?.code || 'TERTIARY-CBT-EXAM'
                )}
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-6 space-y-4">
              <RadioGroup
                value={answers[currentQ.id] || ''}
                onValueChange={(val) => handleSelectAnswer(currentQ.id, val)}
                className="space-y-3"
              >
                {parsedOptions.map((opt: any) => (
                  <div
                    key={opt.id}
                    onClick={() => handleSelectAnswer(currentQ.id, opt.id)}
                    className={`flex items-center space-x-3 p-4 rounded-xl border cursor-pointer transition-all ${
                      answers[currentQ.id] === opt.id
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <RadioGroupItem value={opt.id} id={`opt-${opt.id}`} />
                    <Label htmlFor={`opt-${opt.id}`} className="flex-1 cursor-pointer font-normal text-sm">
                      <span className="font-bold mr-2">{opt.id}.</span> {opt.text}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>

            <CardFooter className="flex justify-between items-center border-t bg-muted/10 p-4">
              <Button
                variant="outline"
                size="sm"
                disabled={currentQuestionIndex === 0}
                onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Previous
              </Button>

              <div className="flex items-center gap-2">
                {isLastQ ? (
                  <Button
                    onClick={() => finalizeSubmission(false)}
                    disabled={isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                    Submit Examination ({answeredCount}/{qList.length})
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                  >
                    Next <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        ) : null}

        {/* Question Pagination Grid */}
        <div className="bg-card border p-4 rounded-xl shadow-sm">
          <div className="text-xs font-medium text-muted-foreground mb-3">
            Question Navigator ({answeredCount} answered)
          </div>
          <div className="flex flex-wrap gap-2">
            {qList.map((q: any, idx: number) => {
              const isAnswered = !!answers[q.id];
              const isCurrent = idx === currentQuestionIndex;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`h-9 w-9 rounded-lg text-xs font-semibold transition-all ${
                    isCurrent
                      ? 'ring-2 ring-primary ring-offset-2 bg-primary text-primary-foreground'
                      : isAnswered
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW 2: EXAM RESULTS SUMMARY ---
  if (isExamCompleted && examResult) {
    return (
      <div className="max-w-xl mx-auto py-8 sm:py-12 px-4 space-y-6">
        <Card className="border shadow-lg text-center p-6">
          <CardHeader>
            <div className="mx-auto bg-emerald-100 text-emerald-600 h-16 w-16 rounded-full flex items-center justify-center mb-2">
              <Award className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-bold">Examination Completed</CardTitle>
            <CardDescription>
              Your answers have been graded and recorded directly into the TIMS Examination Ledger.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-4">
            <div className="bg-muted/40 p-6 rounded-2xl border space-y-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Computed Assessment Score
              </div>
              <div className="text-4xl font-extrabold text-primary font-mono">
                {examResult.scoreAchieved} / {examResult.totalMarks}
              </div>
              <div className="text-sm font-medium text-muted-foreground">
                Percentage: {examResult.percentageScore.toFixed(1)}%
              </div>
            </div>

            {examResult.isDisqualified && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Marked disqualified due to exceeding anti-cheat tab-switching thresholds.</span>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-center gap-3">
            <Button onClick={() => setActiveExam(null)} variant="default">
              Return to CBT Portal
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // --- VIEW 3: CBT PORTAL DASHBOARD (EXAM LIST & LECTURER QUESTION MANAGER) ---
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Computer-Based Testing (CBT) Engine</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isFacultyOrAdmin
              ? 'Author CBT exams, bulk upload multi-faculty/department question banks, and automatically pipe student CBT scores into CA / Exam gradebooks.'
              : 'Proctored continuous assessment and examination tests for your registered courses.'}
          </p>
        </div>

        {isFacultyOrAdmin && (
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Master Multi-Faculty / Multi-Department Bulk Question Bank Upload */}
            <Dialog open={isMasterBulkOpen} onOpenChange={setIsMasterBulkOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                  <UploadCloud className="h-4 w-4 text-indigo-600" />
                  Master Bulk Question Bank (Multi-Dept)
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
                    Master Institution Question Bank Bulk Upload
                  </DialogTitle>
                  <DialogDescription>
                    Upload a single Excel/CSV sheet containing questions across multiple <strong>Faculties</strong>, <strong>Departments</strong>, and <strong>Course Codes</strong> (e.g. `CSC301`, `CSC201`, `MTH101`, `GST101`). Each row is automatically routed to its exact Department &amp; Course CBT Exam!
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="text-xs text-muted-foreground">
                        Template Columns: <code className="font-mono font-bold text-indigo-700">Faculty, Department, CourseCode, Category, Question, OptionA..D, CorrectOption, Points</code>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={handleDownloadCsvTemplate} className="shrink-0">
                        <Download className="h-3.5 w-3.5 mr-1.5 text-indigo-600" />
                        Download Multi-Dept CSV Template
                      </Button>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Upload Excel CSV / Aiken / JSON File</Label>
                      <Input
                        type="file"
                        accept=".csv,.txt,.json"
                        onChange={handleBulkFileUpload}
                        className="bg-background text-xs cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Or Paste Rows Directly from Excel / Word</Label>
                      <textarea
                        rows={5}
                        value={bulkRawText}
                        onChange={(e) => handleBulkTextChange(e.target.value)}
                        placeholder={`Faculty,Department,CourseCode,Category,Question,OptionA,OptionB,OptionC,OptionD,CorrectOption,Points\n"Faculty of Computing","Computer Science",CSC301,CA,"Which data structure is FIFO?",Stack,Queue,Tree,Graph,B,10\n"Faculty of Science","Mathematics",MTH101,CA,"Derivative of sin(x)?",cos(x),-cos(x),tan(x),sec(x),A,10`}
                        className="w-full rounded-xl border border-input bg-background p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {bulkPreview.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                          Parsed {bulkPreview.length} Questions Across Faculties &amp; Departments
                        </span>
                        <Button
                          onClick={handleCommitMasterMultiCourseImport}
                          disabled={isPending}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                        >
                          {isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                          ) : (
                            <UploadCloud className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          Route &amp; Import All {bulkPreview.length} Questions
                        </Button>
                      </div>

                      <div className="max-h-60 overflow-y-auto border rounded-xl divide-y">
                        {bulkPreview.map((item, idx) => (
                          <div key={idx} className="p-3 text-xs space-y-1.5 bg-card">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Badge variant="secondary" className="text-[10px] font-mono font-bold">
                                  {item.courseCode || 'CSC301'} ({item.category || 'CA'})
                                </Badge>
                                <Badge variant="outline" className="text-[10px]">
                                  {item.faculty || 'Faculty of Computing'} &bull; {item.department || 'Computer Science'}
                                </Badge>
                              </div>
                              <Badge variant="outline" className="text-[10px] font-mono text-emerald-700 border-emerald-300">
                                Ans: {item.correctOption} ({item.points} pts)
                              </Badge>
                            </div>
                            <div className="font-semibold text-foreground">
                              {idx + 1}. {item.questionText}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {/* Create Single CBT Assessment Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Create CBT Assessment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create CBT Assessment &amp; Question Bank</DialogTitle>
                  <DialogDescription>
                    Link this CBT test to a Course Offering (Faculty &amp; Department) so student scores automatically pipe into their Continuous Assessment (CA) or Final Exam gradebook.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>{hasTertiary ? 'Course Offering (Faculty / Department)' : 'Target Subject / Assessment Domain'}</Label>
                      <select
                        value={newCourseOfferingId}
                        onChange={(e) => setNewCourseOfferingId(e.target.value)}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm mt-1"
                      >
                        <option value="none">General Institutional / School-Wide CBT Assessment</option>
                        {offerings.map((off: any) => (
                          <option key={off.id} value={off.id}>
                            [{off.departmentName}] {off.code} — {off.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label>Assessment Target Category</Label>
                      <select
                        value={newTargetCategory}
                        onChange={(e) => {
                          const cat = e.target.value as 'CA' | 'EXAM';
                          setNewTargetCategory(cat);
                          setNewTotalMarks(cat === 'CA' ? 40 : 60);
                        }}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm mt-1"
                      >
                        <option value="CA">Continuous Assessment (CA — 40 Marks)</option>
                        <option value="EXAM">Semester Examination (EXAM — 60 Marks)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label>Assessment Title</Label>
                    <Input
                      placeholder="e.g. CSC201 Continuous Assessment Test I"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Instructions / Description</Label>
                    <Input
                      placeholder="Answer all questions within the allotted time. Tab switching is strictly monitored."
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Duration (Minutes)</Label>
                      <Input
                        type="number"
                        value={newDuration}
                        onChange={(e) => setNewDuration(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label>Total Weight (Marks)</Label>
                      <Input
                        type="number"
                        value={newTotalMarks}
                        onChange={(e) => setNewTotalMarks(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  {/* Question Builder Section */}
                  <div className="border-t pt-4 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold">Exam Questions ({newQuestions.length})</h4>
                        <p className="text-xs text-muted-foreground">
                          Add questions manually or bulk upload via CSV / Excel / Aiken text.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => setShowCreateBulkBox(!showCreateBulkBox)}
                        >
                          <UploadCloud className="h-3.5 w-3.5 mr-1 text-indigo-600" />
                          Bulk Upload Questions
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={handleAddDraftQuestion}>
                          <Plus className="h-3.5 w-3.5 mr-1" /> Add Question
                        </Button>
                      </div>
                    </div>

                    {/* Collapsible Bulk Importer inside Create Exam Modal */}
                    {showCreateBulkBox && (
                      <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                            <FileSpreadsheet className="h-4 w-4" /> Bulk Import Questions (CSV, Excel, Aiken, or JSON)
                          </span>
                          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={handleDownloadCsvTemplate}>
                            <Download className="h-3 w-3 mr-1" /> Download CSV Template
                          </Button>
                        </div>

                        <Input
                          type="file"
                          accept=".csv,.txt,.json"
                          onChange={handleBulkFileUpload}
                          className="text-xs bg-background cursor-pointer"
                        />

                        <textarea
                          rows={4}
                          value={bulkRawText}
                          onChange={(e) => handleBulkTextChange(e.target.value)}
                          placeholder={`Paste CSV rows: Faculty,Department,CourseCode,Category,Question,OptionA,OptionB,OptionC,OptionD,CorrectOption,Points`}
                          className="w-full rounded-lg border border-input bg-background p-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />

                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-muted-foreground">
                            Parsed Valid Questions: <strong className="text-indigo-600">{bulkPreview.length}</strong>
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            disabled={bulkPreview.length === 0}
                            onClick={handleAppendBulkToDraftExam}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                          >
                            Append {bulkPreview.length} Questions to Exam
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1">
                      {newQuestions.map((q, idx) => (
                        <div key={idx} className="p-4 rounded-xl border bg-muted/20 space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold uppercase text-primary">Question #{idx + 1}</span>
                            {newQuestions.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveDraftQuestion(idx)}
                                className="h-7 px-2 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                              </Button>
                            )}
                          </div>

                          <Input
                            placeholder="Enter question text..."
                            value={q.questionText}
                            onChange={(e) => handleUpdateDraftQuestion(idx, 'questionText', e.target.value)}
                          />

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {q.options.map((opt: any) => (
                              <div key={opt.id} className="flex items-center gap-2">
                                <span className="text-xs font-bold w-5">{opt.id}.</span>
                                <Input
                                  placeholder={`Option ${opt.id}`}
                                  value={opt.text}
                                  onChange={(e) => handleUpdateDraftOption(idx, opt.id, e.target.value)}
                                  className="h-8 text-xs"
                                />
                              </div>
                            ))}
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <div>
                              <Label className="text-xs">Correct Answer</Label>
                              <select
                                value={q.correctOption}
                                onChange={(e) => handleUpdateDraftQuestion(idx, 'correctOption', e.target.value)}
                                className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs mt-1"
                              >
                                <option value="A">Option A</option>
                                <option value="B">Option B</option>
                                <option value="C">Option C</option>
                                <option value="D">Option D</option>
                              </select>
                            </div>
                            <div>
                              <Label className="text-xs">Points</Label>
                              <Input
                                type="number"
                                value={q.points}
                                onChange={(e) => handleUpdateDraftQuestion(idx, 'points', Number(e.target.value))}
                                className="h-8 text-xs mt-1"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateExam} disabled={isPending}>
                    {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Publish CBT Exam
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* FACULTY, DEPARTMENT & COURSE FILTER BAR */}
      <div className="p-4 rounded-2xl border bg-card shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider shrink-0">
          <Filter className="h-4 w-4 text-primary" />
          <span>Filter by Hierarchy:</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
          <select
            value={selectedFaculty}
            onChange={(e) => {
              setSelectedFaculty(e.target.value);
              setSelectedDepartment('ALL');
              setSelectedCourseCode('ALL');
            }}
            className="h-9 px-3 rounded-xl border border-input bg-background text-xs font-medium"
          >
            <option value="ALL">All Faculties ({distinctFaculties.length})</option>
            {distinctFaculties.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          <select
            value={selectedDepartment}
            onChange={(e) => {
              setSelectedDepartment(e.target.value);
              setSelectedCourseCode('ALL');
            }}
            className="h-9 px-3 rounded-xl border border-input bg-background text-xs font-medium"
          >
            <option value="ALL">All Departments ({distinctDepartments.length})</option>
            {distinctDepartments.map((d) => (
              <option key={d} value={d}>
                Dept. of {d}
              </option>
            ))}
          </select>

          <select
            value={selectedCourseCode}
            onChange={(e) => setSelectedCourseCode(e.target.value)}
            className="h-9 px-3 rounded-xl border border-input bg-background text-xs font-medium"
          >
            <option value="ALL">All Course Codes ({distinctCourses.length})</option>
            {distinctCourses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Available Exams Grid */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredExams.length === 0 ? (
        <Card className="p-12 text-center">
          <FileQuestion className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-base font-semibold">No Matching CBT Assessments Found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Try clearing your Faculty / Department filter or use the Master Bulk Question Bank Upload above.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map((exam) => (
            <Card key={exam.id} className="border shadow-sm flex flex-col justify-between hover:border-primary/50 transition-all">
              <CardHeader>
                <div className="flex justify-between items-start gap-2">
                  <Badge variant="secondary" className="font-mono text-xs font-bold">
                    {exam.courseCode || 'TERTIARY TEST'}
                  </Badge>
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                    {exam.targetCategory} ({exam.totalMarks} Marks)
                  </Badge>
                </div>

                {/* Faculty & Department Pill */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2">
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                    <Building2 className="h-3 w-3" />
                    {exam.facultyName}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                    Dept: {exam.departmentName}
                  </span>
                </div>

                <CardTitle className="text-base font-semibold pt-1.5">{exam.title}</CardTitle>
                <CardDescription className="text-xs line-clamp-2">
                  {exam.description || 'Standard institutional continuous assessment test.'}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Duration:</span>
                  <span className="font-semibold text-foreground">{exam.durationMinutes} Minutes</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Questions in Bank:</span>
                  <span className="font-semibold text-foreground">{exam._count?.questions || 0} Questions</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Student Submissions:</span>
                  <span className="font-semibold text-foreground">{exam._count?.submissions || 0} Completed</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Anti-Cheat Policy:</span>
                  <span className="font-semibold text-foreground">{exam.antiCheatLevel} ({exam.maxTabSwitches} Strikes)</span>
                </div>
              </CardContent>

              <CardFooter className="border-t bg-muted/10 pt-4 flex flex-col gap-2">
                {isFacultyOrAdmin && (
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs flex items-center gap-1.5"
                      onClick={() => handleOpenManageModal(exam.id, 'questions')}
                    >
                      <Settings2 className="h-3.5 w-3.5 text-indigo-600" />
                      Manage Questions ({exam._count?.questions || 0})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs flex items-center gap-1.5"
                      onClick={() => handleOpenManageModal(exam.id, 'submissions')}
                    >
                      <Users className="h-3.5 w-3.5 text-emerald-600" />
                      Scores ({exam._count?.submissions || 0})
                    </Button>
                  </div>
                )}

                <Button
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => handleStartExam(exam.id)}
                >
                  <Play className="h-4 w-4" />
                  {isFacultyOrAdmin ? 'Preview / Test Examination' : 'Start Examination'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* LECTURER QUESTION BANK, BULK UPLOAD & SUBMISSIONS MANAGEMENT MODAL */}
      <Dialog open={!!managedExam} onOpenChange={(open) => !open && setManagedExam(null)}>
        <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {managedExam?.title} — CBT Management Console
            </DialogTitle>
            <DialogDescription>
              Faculty: <span className="font-semibold text-foreground">{managedExam?.facultyName}</span> • Department: <span className="font-semibold text-foreground">{managedExam?.departmentName}</span> • Course: <span className="font-semibold text-foreground">{managedExam?.courseCode}</span> • Weight: <span className="font-semibold text-foreground">{managedExam?.totalMarks} Marks ({managedExam?.targetCategory})</span>
            </DialogDescription>
          </DialogHeader>

          {/* Modal Tabs */}
          <div className="flex border-b gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setManageTab('questions')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                manageTab === 'questions' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
              }`}
            >
              Question Bank ({managedExam?.questions?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setManageTab('bulk')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                manageTab === 'bulk' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
              }`}
            >
              <UploadCloud className="h-3.5 w-3.5 text-indigo-600" />
              Bulk Upload Question Bank
            </button>
            <button
              type="button"
              onClick={() => setManageTab('submissions')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                manageTab === 'submissions' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
              }`}
            >
              Student Submissions &amp; CA Scores ({managedExam?.submissions?.length || 0})
            </button>
          </div>

          {isManageLoading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : manageTab === 'questions' ? (
            <div className="space-y-6 py-2">
              {/* Add New Question Form + Quick Bulk Upload Button */}
              <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Plus className="h-4 w-4" /> Add New Question to {managedExam?.courseCode} ({managedExam?.departmentName})
                  </h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setManageTab('bulk')}
                    className="h-7 text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                  >
                    <UploadCloud className="h-3.5 w-3.5 mr-1" /> Bulk Upload CSV / Excel / Text
                  </Button>
                </div>

                <Input
                  placeholder="Type the multiple-choice question stem..."
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input placeholder="Option A" value={optA} onChange={(e) => setOptA(e.target.value)} className="h-8 text-xs" />
                  <Input placeholder="Option B" value={optB} onChange={(e) => setOptB(e.target.value)} className="h-8 text-xs" />
                  <Input placeholder="Option C" value={optC} onChange={(e) => setOptC(e.target.value)} className="h-8 text-xs" />
                  <Input placeholder="Option D" value={optD} onChange={(e) => setOptD(e.target.value)} className="h-8 text-xs" />
                </div>

                <div className="flex flex-wrap items-end justify-between gap-3 pt-1">
                  <div className="flex items-center gap-3">
                    <div>
                      <Label className="text-xs">Correct Option</Label>
                      <select
                        value={qCorrect}
                        onChange={(e) => setQCorrect(e.target.value as any)}
                        className="h-8 px-2 rounded-md border border-input bg-background text-xs block mt-1"
                      >
                        <option value="A">Option A</option>
                        <option value="B">Option B</option>
                        <option value="C">Option C</option>
                        <option value="D">Option D</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">Points</Label>
                      <Input
                        type="number"
                        value={qPoints}
                        onChange={(e) => setQPoints(Number(e.target.value))}
                        className="h-8 w-24 text-xs mt-1"
                      />
                    </div>
                  </div>

                  <Button size="sm" onClick={handleAddQuestionToExistingExam} disabled={isPending}>
                    {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                    Save Question
                  </Button>
                </div>
              </div>

              {/* Existing Questions List */}
              <div className="space-y-3">
                {managedExam?.questions?.map((q: any, idx: number) => {
                  let opts: any[] = [];
                  try {
                    opts = JSON.parse(q.optionsJson || '[]');
                  } catch {
                    opts = [];
                  }
                  return (
                    <div key={q.id} className="p-4 rounded-xl border bg-card space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-semibold">
                          <span className="text-primary font-mono mr-1.5">Q{idx + 1}.</span>
                          {q.questionText}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className="text-[11px] font-mono">
                            {q.points} pts
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs pt-1">
                        {opts.map((o: any) => {
                          const isCorrect = o.id === q.correctOption;
                          return (
                            <div
                              key={o.id}
                              className={`px-2.5 py-1.5 rounded-lg border flex items-center justify-between ${
                                isCorrect
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                                  : 'bg-muted/30 border-border text-muted-foreground'
                              }`}
                            >
                              <span>
                                <strong className="mr-1">{o.id}.</strong> {o.text}
                              </span>
                              {isCorrect && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : manageTab === 'bulk' ? (
            <div className="space-y-5 py-2">
              <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-indigo-600" />
                      Bulk Question Bank Importer ({managedExam?.facultyName} &bull; {managedExam?.departmentName} &bull; {managedExam?.courseCode})
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Supports both the 11-column Multi-Department CSV (`Faculty,Department,CourseCode,Category,Question...`) and the 7-column Course CSV (`Question,OptionA..D,CorrectOption,Points`).
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={handleDownloadCsvTemplate} className="shrink-0">
                    <Download className="h-3.5 w-3.5 mr-1.5 text-indigo-600" />
                    Download CSV Template
                  </Button>
                </div>

                {/* File Input */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Option 1: Upload Question Bank File (.csv, .txt, .json)</Label>
                  <Input
                    type="file"
                    accept=".csv,.txt,.json"
                    onChange={handleBulkFileUpload}
                    className="bg-background text-xs cursor-pointer"
                  />
                </div>

                {/* Direct Copy-Paste Box */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Option 2: Paste Directly from Excel (CSV/TSV) or Word (Aiken Format)
                  </Label>
                  <textarea
                    rows={6}
                    value={bulkRawText}
                    onChange={(e) => handleBulkTextChange(e.target.value)}
                    placeholder={`Faculty,Department,CourseCode,Category,Question,OptionA,OptionB,OptionC,OptionD,CorrectOption,Points\n"Faculty of Computing","Computer Science",CSC301,CA,"Which data structure is LIFO?",Queue,Stack,Tree,Graph,B,10\n\nOR Aiken Format:\nCOURSE: CSC301\nDEPARTMENT: Computer Science\nWhich data structure is LIFO?\nA. Queue\nB. Stack\nC. Tree\nD. Graph\nANSWER: B`}
                    className="w-full rounded-xl border border-input bg-background p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Live Parsed Preview */}
              {bulkPreview.length > 0 && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                      Ready to Import: {bulkPreview.length} Valid Questions Detected
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCommitMasterMultiCourseImport}
                        disabled={isPending}
                        className="text-xs"
                      >
                        Route by CourseCode (Multi-Dept)
                      </Button>
                      <Button
                        onClick={handleCommitBulkToExistingExam}
                        disabled={isPending}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                      >
                        {isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        ) : (
                          <UploadCloud className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Import into {managedExam?.courseCode}
                      </Button>
                    </div>
                  </div>

                  <div className="max-h-60 overflow-y-auto border rounded-xl divide-y">
                    {bulkPreview.map((item, idx) => (
                      <div key={idx} className="p-3 text-xs space-y-1 bg-card">
                        <div className="flex flex-wrap items-center justify-between gap-2 font-semibold">
                          <span>
                            {idx + 1}. {item.questionText}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {item.courseCode && (
                              <Badge variant="secondary" className="text-[10px] font-mono">
                                {item.courseCode}
                              </Badge>
                            )}
                            {item.department && (
                              <Badge variant="outline" className="text-[10px]">
                                {item.department}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[10px] font-mono text-emerald-700">
                              Ans: {item.correctOption} ({item.points} pts)
                            </Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-[11px] text-muted-foreground">
                          {item.options.map((o) => (
                            <span
                              key={o.id}
                              className={o.id === item.correctOption ? 'text-emerald-700 font-bold' : ''}
                            >
                              {o.id}: {o.text}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-3">
              {managedExam?.submissions?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  No students have submitted this CBT assessment yet.
                </div>
              ) : (
                <div className="overflow-x-auto border rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Matric No.</th>
                        <th className="py-2.5 px-3">Student Name</th>
                        <th className="py-2.5 px-3">Score</th>
                        <th className="py-2.5 px-3">Percentage</th>
                        <th className="py-2.5 px-3">Anti-Cheat</th>
                        <th className="py-2.5 px-3">Gradebook Sync</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {managedExam?.submissions?.map((sub: any) => (
                        <tr key={sub.id}>
                          <td className="py-2.5 px-3 font-mono font-bold text-primary">{sub.matricNumber}</td>
                          <td className="py-2.5 px-3 font-medium">{sub.studentName}</td>
                          <td className="py-2.5 px-3 font-bold">
                            {sub.scoreAchieved} / {managedExam.totalMarks}
                          </td>
                          <td className="py-2.5 px-3">{Number(sub.percentageScore || 0).toFixed(1)}%</td>
                          <td className="py-2.5 px-3">
                            <Badge variant={sub.status === 'DISQUALIFIED' ? 'destructive' : 'outline'} className="text-[10px]">
                              {sub.tabSwitchCount} Strikes ({sub.status})
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3">
                            {sub.isPipedToGrades ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Synced to {managedExam.targetCategory}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Recorded in CBT Ledger</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}