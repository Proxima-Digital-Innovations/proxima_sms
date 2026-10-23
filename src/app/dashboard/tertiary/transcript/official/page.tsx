'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getStudentTranscriptAction } from '@/actions/tims-docket-actions';
import { getCurrentStudentContextAction } from '@/actions/tims-actions';
import { Award, Printer, ShieldCheck, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function OfficialTranscriptPage() {
  const [data, setData] = useState<any>(null);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [isStudentRole, setIsStudentRole] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const ctxRes = await getCurrentStudentContextAction();
      let targetId = '93e0878e-891f-4a60-ad1a-b0019b6c17f2';
      if (ctxRes.success && ctxRes.data) {
        setIsStudentRole(ctxRes.data.isStudentRole);
        setAllStudents(ctxRes.data.allStudents || []);
        if (ctxRes.data.student?.id) {
          targetId = ctxRes.data.student.id;
        }
      }
      setSelectedStudentId(targetId);

      const res = await getStudentTranscriptAction(targetId);
      if (res.success && res.data) {
        setData(res.data);
      }
      setIsLoading(false);
    }
    load();
  }, []);

  const handleSelectStudent = async (id: string) => {
    setSelectedStudentId(id);
    setIsLoading(true);
    const res = await getStudentTranscriptAction(id);
    if (res.success && res.data) {
      setData(res.data);
    }
    setIsLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Unable to generate official transcript records.</p>
      </div>
    );
  }

  const { student, academicHistory, summary } = data;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Bar (Hidden on Print) */}
      <div className="flex flex-wrap justify-between items-center gap-3 print:hidden bg-card p-4 rounded-xl border shadow-sm">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/tertiary/transcript">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <span className="font-semibold text-sm">Official Archival Transcript</span>
        </div>

        <div className="flex items-center gap-2">
          {!isStudentRole && allStudents.length > 0 && (
            <Select value={selectedStudentId} onValueChange={handleSelectStudent}>
              <SelectTrigger className="w-60 h-9 rounded-xl text-xs">
                <SelectValue placeholder="Switch student" />
              </SelectTrigger>
              <SelectContent>
                {allStudents.map((st: any) => (
                  <SelectItem key={st.id} value={st.id}>
                    {st.matricNumber} — {st.user?.firstName} {st.user?.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={handlePrint} className="bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-2">
            <Printer className="h-4 w-4" /> Print / Export Official PDF
          </Button>
        </div>
      </div>

      {/* Official Parchment Document */}
      <div className="bg-white text-slate-950 p-8 sm:p-12 rounded-2xl border-4 border-slate-900/20 shadow-2xl relative overflow-hidden print:p-0 print:border-none print:shadow-none">
        {/* Subtle Security Guilloche Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none select-none">
          <Award className="w-[500px] h-[500px] text-slate-900" />
        </div>

        {/* Header */}
        <div className="text-center space-y-2 border-b-2 border-slate-900 pb-6 relative">
          <div className="flex justify-center mb-2">
            <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-400 flex items-center justify-center">
              <Award className="h-8 w-8 text-slate-800" />
            </div>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-extrabold uppercase tracking-widest text-slate-900">
            Office of the Registrar &amp; Senate
          </h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Official Academic Record &amp; Transcript of Academic Standing
          </p>
        </div>

        {/* Student Bio Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-b border-slate-300 text-xs">
          <div>
            <span className="text-slate-500 uppercase font-semibold text-[10px]">Candidate Name</span>
            <p className="font-bold text-sm text-slate-900">{student.fullName}</p>
          </div>
          <div>
            <span className="text-slate-500 uppercase font-semibold text-[10px]">Matriculation ID</span>
            <p className="font-bold text-sm font-mono text-slate-900">{student.matricNumber}</p>
          </div>
          <div>
            <span className="text-slate-500 uppercase font-semibold text-[10px]">Degree Program</span>
            <p className="font-bold text-sm text-slate-900">{student.programName}</p>
          </div>
          <div>
            <span className="text-slate-500 uppercase font-semibold text-[10px]">Accreditation Scale</span>
            <p className="font-bold text-sm text-slate-900">NUC CCMAS 5.00</p>
          </div>
        </div>

        {/* Course Grades Breakdown */}
        <div className="py-6 space-y-6">
          {(academicHistory || data.semesters || []).map((term: any, tIdx: number) => (
            <div key={tIdx} className="space-y-2">
              <div className="flex justify-between items-center bg-slate-100 p-2 rounded text-xs font-bold uppercase text-slate-800">
                <span>{term.academicSession} • Semester {term.semester} {term.level ? `(${term.level}L)` : ''}</span>
                <span className="font-mono">Semester GPA: {term.gpa}</span>
              </div>

              <div className="w-full overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead className="border-b text-[10px] uppercase text-slate-600">
                    <tr>
                      <th className="py-1">Course Code</th>
                      <th className="py-1">Course Title</th>
                      <th className="py-1 text-center">Units</th>
                      <th className="py-1 text-center">Score</th>
                      <th className="py-1 text-center">Grade</th>
                      <th className="py-1 text-right">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {term.courses.map((c: any, cIdx: number) => (
                      <tr key={cIdx}>
                        <td className="py-1.5 font-mono font-bold">{c.code}</td>
                        <td className="py-1.5 text-slate-700">{c.title}</td>
                        <td className="py-1.5 text-center font-mono">{c.creditUnits}</td>
                        <td className="py-1.5 text-center font-mono">{c.totalScore}%</td>
                        <td className="py-1.5 text-center font-bold">{c.letterGrade}</td>
                        <td className="py-1.5 text-right font-mono font-semibold">{c.gradePoint}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {/* Cumulative Degree Performance Summary */}
        <div className="border-2 border-slate-900 p-4 rounded-xl bg-slate-50 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-xs">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Credits Registered</span>
            <div className="text-xl font-bold font-mono text-slate-900">
              {summary?.totalCreditsRegistered ?? data.cumulative?.totalCreditsAttempted ?? 0}
            </div>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Credits Earned</span>
            <div className="text-xl font-bold font-mono text-emerald-800">
              {summary?.totalCreditsEarned ?? data.cumulative?.totalCreditsEarned ?? 0}
            </div>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Cumulative CGPA</span>
            <div className="text-2xl font-extrabold font-mono text-slate-900">
              {summary?.cgpa ?? data.cumulative?.cgpa ?? '0.00'}
            </div>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Honours Classification</span>
            <div className="text-xs font-bold text-emerald-900 mt-1">
              {summary?.degreeClassification ?? data.cumulative?.degreeClassification ?? 'Good Standing'}
            </div>
          </div>
        </div>

        {/* Official Signatures & Verification Seal */}
        <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 items-end pt-12 border-t-2 border-slate-900 mt-8 text-xs text-slate-700">
          <div className="text-center space-y-1">
            <div className="font-serif italic font-bold border-b border-slate-400 pb-1 mx-4">
              Prof. A. S. Garba
            </div>
            <div className="text-[10px] uppercase text-slate-500">Dean of Student Affairs</div>
          </div>

          <div className="flex flex-col items-center space-y-1">
            <div className="border-2 border-slate-900 p-2 rounded-xl text-center">
              <ShieldCheck className="h-6 w-6 text-emerald-700 mx-auto" />
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-800 mt-0.5">
                Official Senate Seal
              </div>
            </div>
          </div>

          <div className="text-center space-y-1">
            <div className="font-serif italic font-bold border-b border-slate-400 pb-1 mx-4">
              Dr. M. S. Bello, FNIM
            </div>
            <div className="text-[10px] uppercase text-slate-500">Registrar &amp; Secretary to Senate</div>
          </div>
        </div>
      </div>
    </div>
  );
}
