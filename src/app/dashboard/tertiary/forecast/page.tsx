'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, Award, AlertTriangle, ShieldCheck, Sparkles, RefreshCw, ArrowRight } from 'lucide-react';

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

export default function CgpaForecasterPage() {
  // Historical standing (e.g. Completed 100L & 200L)
  const [priorCredits, setPriorCredits] = useState<number>(45);
  const [priorQualityPoints, setPriorQualityPoints] = useState<number>(180); // 180 / 45 = 4.00 CGPA

  const [currentCourses, setCurrentCourses] = useState<ForecastCourse[]>([
    { code: 'CSC301', title: 'Data Structures & Algorithms', credits: 3, projectedGrade: 'A' },
    { code: 'CSC305', title: 'Operating Systems & System Architecture', credits: 3, projectedGrade: 'A' },
    { code: 'CSC309', title: 'Database Design & Management Systems', credits: 3, projectedGrade: 'B' },
    { code: 'MTH101', title: 'Elementary Mathematics I', credits: 3, projectedGrade: 'B' },
    { code: 'GST101', title: 'Use of English & Communication', credits: 2, projectedGrade: 'A' },
    { code: 'CSC203', title: 'Discrete Structures for Computing', credits: 3, projectedGrade: 'B' },
  ]);

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
  let badgeColor = 'bg-blue-100 text-blue-800 border-blue-300';
  if (numCgpa >= 4.50) {
    projectedClassification = 'First Class Honours';
    badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
  } else if (numCgpa >= 3.50) {
    projectedClassification = 'Second Class Honours (Upper Division)';
    badgeColor = 'bg-blue-100 text-blue-800 border-blue-300';
  } else if (numCgpa >= 2.40) {
    projectedClassification = 'Second Class Honours (Lower Division)';
    badgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
  } else if (numCgpa < 1.50) {
    projectedClassification = 'Academic Probation Warning';
    badgeColor = 'bg-red-100 text-red-800 border-red-300';
  }

  // Target Gap to First Class
  const qpNeededForFirstClass = totalCumulativeCredits * 4.50 - priorQualityPoints;
  const sgpaNeededForFirstClass = currentSemesterCredits > 0 ? (qpNeededForFirstClass / currentSemesterCredits).toFixed(2) : '4.50';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">CGPA Forecaster & Academic Simulator</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Simulate hypothetical examination marks across enrolled courses to project semester GPA, cumulative honours classification, and target grade roadmaps.
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border shadow-sm p-4 bg-muted/20">
          <span className="text-xs text-muted-foreground uppercase font-semibold">Prior Standing</span>
          <div className="text-2xl font-extrabold text-foreground mt-1">
            {(priorQualityPoints / priorCredits).toFixed(2)}
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

        <Card className="border-2 border-primary/50 shadow-md p-4 bg-primary/5">
          <span className="text-xs text-primary font-bold uppercase">Projected CGPA</span>
          <div className="text-3xl font-extrabold text-primary mt-1 font-mono">
            {projectedCgpa} / 5.00
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{totalCumulativeCredits} Total Degree Units</p>
        </Card>

        <Card className="border shadow-sm p-4 flex flex-col justify-between">
          <span className="text-xs text-muted-foreground uppercase font-semibold">Projected Degree Class</span>
          <Badge className={`w-fit text-xs font-semibold py-1 px-2.5 mt-2 ${badgeColor}`}>
            {projectedClassification}
          </Badge>
          <p className="text-[10px] text-muted-foreground mt-1">NUC CCMAS 5.00 Scale</p>
        </Card>
      </div>

      {/* Target Analysis Banner */}
      <Card className="border border-indigo-200 bg-indigo-50/50 p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-indigo-950">Academic Advisory Target Roadmap</h4>
            <p className="text-xs text-indigo-900 leading-relaxed">
              To achieve <strong className="text-emerald-700">First Class Honours (CGPA $\ge$ 4.50)</strong> upon completing this semester,
              you need an aggregate of <strong className="underline font-mono">{Math.max(0, Math.ceil(qpNeededForFirstClass))} Quality Points</strong>,
              equivalent to an average Semester GPA of <strong className="font-mono">{sgpaNeededForFirstClass}</strong>.
            </p>
          </div>
        </div>
      </Card>

      {/* Interactive Course Grade Simulator Table */}
      <Card>
        <CardHeader>
          <CardTitle>Enrolled Course Simulator (Semester 1)</CardTitle>
          <CardDescription>
            Change hypothetical grades below to watch your projected SGPA and CGPA recalculate live.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Course Code</th>
                  <th className="px-4 py-3">Course Title</th>
                  <th className="px-4 py-3 text-center">Credit Units</th>
                  <th className="px-4 py-3 text-center">Simulated Grade</th>
                  <th className="px-4 py-3 text-center">Grade Points</th>
                  <th className="px-4 py-3 text-right">Weighted Quality Points</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {currentCourses.map((c, idx) => {
                  const qp = (c.credits * GRADE_POINTS[c.projectedGrade]).toFixed(1);
                  return (
                    <tr key={c.code} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-bold font-mono text-foreground">{c.code}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.title}</td>
                      <td className="px-4 py-3 text-center font-mono">{c.credits}</td>
                      <td className="px-4 py-3 text-center">
                        <Select
                          value={c.projectedGrade}
                          onValueChange={(val: any) => handleGradeChange(idx, val)}
                        >
                          <SelectTrigger className="w-20 mx-auto h-8 text-xs font-bold font-mono">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A">A (5.0)</SelectItem>
                            <SelectItem value="B">B (4.0)</SelectItem>
                            <SelectItem value="C">C (3.0)</SelectItem>
                            <SelectItem value="D">D (2.0)</SelectItem>
                            <SelectItem value="F">F (0.0)</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-medium text-foreground">
                        {GRADE_POINTS[c.projectedGrade].toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-primary">
                        {qp} QP
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
