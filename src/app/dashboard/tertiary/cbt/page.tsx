'use client';

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { getCbtExams, getCbtExamDetails, createCbtExam, submitCbtExamAction } from '@/actions/cbt-actions';
import { Timer, AlertTriangle, CheckCircle2, ShieldAlert, Award, FileQuestion, Plus, Play, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';

export default function TertiaryCbtPage() {
  const [exams, setExams] = useState<any[]>([]);
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
  const { toast } = useToast();

  // New Exam Form State
  const [newTitle, setNewTitle] = useState('');
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
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadExams();
  }, []);

  // Anti-cheat: Tab-switch & window blur detection
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

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
      setAnswers({});
      setCurrentQuestionIndex(0);
      setIsExamCompleted(false);
      setExamResult(null);
    }
    setIsLoading(false);
  };

  const handleSelectAnswer = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
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
      // Find a demo student ID or fallback
      const studentProfileId = '93e0878e-891f-4a60-ad1a-b0019b6c17f2'; // Aminu Katsina from seeding
      const res = await submitCbtExamAction({
        examId: activeExam.id,
        studentProfileId,
        answers,
        tabSwitchCount,
        isAutoSubmitted: isAuto,
      });

      if (res.success && res.data) {
        setIsExamCompleted(true);
        setExamResult(res.data);
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

  const handleCreateExam = () => {
    if (!newTitle.trim()) {
      toast({ variant: 'destructive', title: 'Title Required', description: 'Please enter an exam title.' });
      return;
    }

    startTransition(async () => {
      const res = await createCbtExam({
        title: newTitle,
        durationMinutes: Number(newDuration),
        totalMarks: Number(newTotalMarks),
        targetCategory: 'CA',
        antiCheatLevel: 'STRICT',
        maxTabSwitches: 3,
        questions: newQuestions,
      });

      if (res.success) {
        toast({ title: 'CBT Exam Created', description: 'Exam published for course offerings.' });
        setIsCreateOpen(false);
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
      <div className="space-y-6 max-w-5xl mx-auto py-4">
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
          <Card className="border shadow-md">
            <CardHeader className="border-b bg-muted/20">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Question {currentQuestionIndex + 1} of {qList.length}
                </span>
                <Badge variant="outline" className="text-xs font-mono">
                  {currentQ.points} Points
                </Badge>
              </div>
              <CardTitle className="text-lg font-medium text-foreground pt-2">
                {currentQ.questionText}
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
      <div className="max-w-xl mx-auto py-12 space-y-6">
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
                Computed Continuous Assessment Score
              </div>
              <div className="text-4xl font-extrabold text-primary font-mono">
                {examResult.scoreAchieved} / {examResult.totalMarks}
              </div>
              <div className="text-sm font-medium text-muted-foreground">
                Percentage: {examResult.percentageScore.toFixed(1)}%
              </div>
            </div>

            {examResult.isDisqualified && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
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

  // --- VIEW 3: CBT PORTAL DASHBOARD (EXAM LIST) ---
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Computer-Based Testing (CBT) Engine</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Proctored continuous assessment tests with live timers, anti-cheat detection, and automatic score aggregation into Senate broadsheets.
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Create Test
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create CBT Examination</DialogTitle>
              <DialogDescription>
                Define test duration, points, and multiple-choice questions for continuous assessment.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Exam Title</Label>
                <Input
                  placeholder="e.g. CSC301 Continuous Assessment Test I"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
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

              <div className="bg-muted/40 p-3 rounded-xl border text-xs text-muted-foreground">
                Includes {newQuestions.length} pre-configured questions on Algorithms & Discrete Structures.
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateExam} disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Save & Publish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Available Exams Grid */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : exams.length === 0 ? (
        <Card className="p-12 text-center">
          <FileQuestion className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-base font-semibold">No CBT Tests Currently Active</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Lecturers can author continuous assessment quizzes or objective mid-term exams above.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map((exam) => (
            <Card key={exam.id} className="border shadow-sm flex flex-col justify-between hover:border-primary/50 transition-all">
              <CardHeader>
                <div className="flex justify-between items-start gap-2">
                  <Badge variant="secondary" className="font-mono text-xs">
                    {exam.courseOffering?.course?.code || 'TERTIARY TEST'}
                  </Badge>
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                    {exam.targetCategory} ({exam.totalMarks} Marks)
                  </Badge>
                </div>
                <CardTitle className="text-base font-semibold pt-2">{exam.title}</CardTitle>
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
                  <span>Questions:</span>
                  <span className="font-semibold text-foreground">{exam._count?.questions || 0} Questions</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Anti-Cheat Policy:</span>
                  <span className="font-semibold text-foreground">{exam.antiCheatLevel} ({exam.maxTabSwitches} Strikes)</span>
                </div>
              </CardContent>

              <CardFooter className="border-t bg-muted/10 pt-4">
                <Button
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => handleStartExam(exam.id)}
                >
                  <Play className="h-4 w-4" /> Start Examination
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
