'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCurrentStudentContextAction } from '@/actions/tims-actions';
import { TrendingUp, Target } from 'lucide-react';

interface ForecastCourse {
  code: string;
  title: string;
  credits: number;
  projectedGrade: 'A' | 'B' | 'C' | 'D' | 'F';
}

const GRADE_POINTS: Record<string, number> = {
  A: 5.0,
  B: 4.0,
  C: 3.0,
  D: 2.0,
  F: 0.0,
};

const DEFAULT_SAMPLE_COURSES: ForecastCourse[] = [
  { code: 'CSC301', title: 'Data Structures & Algorithms', credits: 3, projectedGrade: 'A' },
  { code: 'CSC305', title: 'Operating Systems & System Architecture', credits: 3, projectedGrade: 'A' },
  { code: 'CSC309', title: 'Database Design & Management Systems', credits: 3, projectedGrade: 'B' },
  { code: 'MTH101', title: 'Elementary Mathematics I', credits: 3, projectedGrade: 'B' },
  { code: 'GST101', title: 'Use of English & Communication', credits: 2, projectedGrade: 'A' },
  { code: 'CSC203', title: 'Discrete Structures for Computing', credits: 3, projectedGrade: 'B' },
];

export default function CgpaForecasterPage() {
  const [priorCredits, setPriorCredits] = useState<number>(45);
  const [priorQualityPoints, setPriorQualityPoints] = useState<number>(180);
  const [currentCourses, setCurrentCourses] = useState<ForecastCourse[]>(DEFAULT_SAMPLE_COURSES);
  const [studentName, setStudentName] = useState<string>('');

  useEffect(() => {
    async function loadLiveStudentCourses() {
      const res = await getCurrentStudentContextAction('2025/2026', 1);
      if (res.success && res.data?.activeStudent) {
        const stu = res.data.activeStudent;
        setStudentName(`${stu.user?.firstName || ''} ${stu.user?.lastName || ''} (${stu.matricNumber})`.trim());

        // Populate prior credits and quality points from latest standing if available
        const latestStanding = stu.academicStandings?.[0];
        if (latestStanding && latestStanding.totalCreditsEarned > 0) {
          const credits = Number(latestStanding.totalCreditsEarned);
          const cgpa = Number(latestStanding.cgpa);
          setPriorCredits(credits);
          setPriorQualityPoints(Number((credits * cgpa).toFixed(2)));
        }

        // Populate current registered courses if student has registered
        const regCourses = stu.registrations?.[0]?.courses || [];
        if (regCourses.length > 0) {
          setCurrentCourses(
            regCourses.map((rc: any) => ({
              code: rc.offering?.course?.code || 'CRS101',
              title: rc.offering?.course?.title || 'Registered Course',
              credits: rc.creditUnits || rc.offering?.course?.creditUnits || 3,
              projectedGrade: 'A' as const,
            }))
          );
        }
      }
    }
    loadLiveStudentCourses();
  }, []);

  const handleGradeChange = (index: number, newGrade: 'A' | 'B' | 'C' | 'D' | 'F') => {
    setCurrentCourses((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], projectedGrade: newGrade };
      return copy;
    });
  };

  const handleSetAllGrades = (grade: 'A' | 'B' | 'C') => {
    setCurrentCourses((prev) => prev.map((c) => ({ ...c, projectedGrade: grade })));
  };

  // Calculations
  const currentSemesterCredits = currentCourses.reduce((acc, c) => acc + c.credits, 0);
  const currentSemesterQP = currentCourses.reduce((acc, c) => acc + c.credits * GRADE_POINTS[c.projectedGrade], 0);
  const projectedSgpa = currentSemesterCredits > 0 ? (currentSemesterQP / currentSemesterCredits).toFixed(2) : '0.00';

  const totalCumulativeCredits = priorCredits + currentSemesterCredits;
  const totalCumulativeQP = priorQualityPoints + currentSemesterQP;
  const projectedCgpa = totalCumulativeCredits > 0 ? (totalCumulativeQP / totalCumulativeCredits).toFixed(2) : '0.00';
  const numCgpa = parseFloat(projectedCgpa);

  let projectedClassification = 'Third Class Honours';
  let badgeColor = 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30';
  if (numCgpa >= 4.50) {
    projectedClassification = 'First Class Honours';
    badgeColor = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
  } else if (numCgpa >= 3.50) {
    projectedClassification = 'Second Class Honours (Upper Division)';
    badgeColor = 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30';
  } else if (numCgpa >= 2.40) {
    projectedClassification = 'Second Class Honours (Lower Division)';
    badgeColor = 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30';
  } else if (numCgpa < 1.50) {
    projectedClassification = 'Academic Probation Warning';
    badgeColor = 'bg-destructive/15 text-destructive dark:text-red-400 border-destructive/30';
  }

  // Target Gap to First Class
  const qpNeededForFirstClass = totalCumulativeCredits * 4.50 - priorQualityPoints;
  const sgpaNeededForFirstClass = currentSemesterCredits > 0 ? (qpNeededForFirstClass / currentSemesterCredits).toFixed(2) : '4.50';

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">CGPA Forecaster &amp; Academic Simulator</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Simulate hypothetical examination marks across your registered courses {studentName ? `for ${studentName}` : ''} to project semester GPA and degree honours.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleSetAllGrades('A')} className="text-xs">
            Target Straight A&apos;s
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleSetAllGrades('B')} className="text-xs">
            Target Straight B&apos;s
          </Button>
        </div>
      </div>

      {/* KPI Prognosis Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border shadow-sm p-4 bg-muted/20">
          <span className="text-xs text-muted-foreground uppercase font-semibold">Prior Standing</span>
          <div className="text-2xl font-extrabold text-foreground mt-1">
            {priorCredits > 0 ? (priorQualityPoints / priorCredits).toFixed(2) : '0.00'}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{priorCredits} Units Completed</p>
        </Card>

        <Card className="border shadow-sm p-4 bg-muted/20">
          <span className="text-xs text-muted-foreground uppercase font-semibold">Projected SGPA</span>
          <div className="text-2xl font-extrabold text-primary mt-1 font-mono">
            {projectedSgpa} / 5.00
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{currentSemesterCredits} Units This Semester</p>
        </Card>

        <Card className="border-2 border-primary/30 shadow-md p-4 bg-primary/5">
          <span className="text-xs text-primary uppercase font-bold">Projected Cumulative CGPA</span>
          <div className="text-3xl font-black text-foreground mt-1 font-mono">
            {projectedCgpa}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{totalCumulativeCredits} Total Cumulative Units</p>
        </Card>

        <Card className="border shadow-sm p-4 flex flex-col justify-between">
          <span className="text-xs text-muted-foreground uppercase font-semibold">Honours Trajectory</span>
          <div className="mt-2">
            <Badge className={`${badgeColor} text-xs px-2.5 py-1 font-bold`}>
              {projectedClassification}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">NUC 5.00 Honours Scale</p>
        </Card>
      </div>

      {/* Interactive Course Grade Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border shadow-md">
          <CardHeader className="border-b bg-muted/30 pb-3">
            <CardTitle className="text-base font-bold">Registered Semester Courses</CardTitle>
            <CardDescription className="text-xs">
              Adjust target letter grades below to watch your real-time CGPA trajectory respond.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 space-y-3">
            {currentCourses.map((course, idx) => (
              <div
                key={course.code}
                className="p-3.5 rounded-xl border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-primary">{course.code}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {course.credits} Credits
                    </Badge>
                  </div>
                  <p className="font-semibold text-sm text-foreground mt-0.5">{course.title}</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <span className="text-[10px] text-muted-foreground uppercase block">Quality Points</span>
                    <span className="font-mono font-bold text-xs">
                      {(course.credits * GRADE_POINTS[course.projectedGrade]).toFixed(1)} QP
                    </span>
                  </div>

                  <Select
                    value={course.projectedGrade}
                    onValueChange={(val: any) => handleGradeChange(idx, val)}
                  >
                    <SelectTrigger className="w-28 font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">Grade A (5.0)</SelectItem>
                      <SelectItem value="B">Grade B (4.0)</SelectItem>
                      <SelectItem value="C">Grade C (3.0)</SelectItem>
                      <SelectItem value="D">Grade D (2.0)</SelectItem>
                      <SelectItem value="F">Grade F (0.0)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* AI Target Advisor Sidebar */}
        <Card className="border shadow-md h-fit">
          <CardHeader className="border-b bg-slate-900 text-white rounded-t-xl pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-400" /> Strategic Grade Roadmap
            </CardTitle>
            <CardDescription className="text-slate-300 text-xs">
              Automated mathematical threshold analysis.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-muted/50 border space-y-1">
              <span className="font-bold text-foreground block">First Class Honours Target (4.50+)</span>
              {parseFloat(sgpaNeededForFirstClass) <= 5.0 ? (
                <p className="text-muted-foreground">
                  You need a minimum semester GPA of <strong className="text-emerald-700 font-mono">{sgpaNeededForFirstClass}</strong> this semester to cross into First Class Honours.
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Requires <strong className="text-amber-700 font-mono">{sgpaNeededForFirstClass} SGPA</strong> (more than 1 semester of straight A&apos;s needed to reach 4.50).
                </p>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t">
              <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px]">
                NUC Classification Boundaries
              </h4>
              <div className="flex justify-between py-1 border-b border-dashed">
                <span>First Class Honours</span>
                <span className="font-mono font-bold">4.50 &ndash; 5.00</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed">
                <span>Second Class Upper (2:1)</span>
                <span className="font-mono font-bold">3.50 &ndash; 4.49</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed">
                <span>Second Class Lower (2:2)</span>
                <span className="font-mono font-bold">2.40 &ndash; 3.49</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed">
                <span>Third Class</span>
                <span className="font-mono font-bold">1.50 &ndash; 2.39</span>
              </div>
              <div className="flex justify-between py-1 text-red-600 font-semibold">
                <span>Academic Probation</span>
                <span className="font-mono">&lt; 1.50</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
