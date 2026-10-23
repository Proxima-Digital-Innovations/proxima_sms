'use client';

import { useState } from 'react';
import { validateAndUseToken } from '@/actions/token-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, AlertCircle, Printer, School, GraduationCap, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ResultCheckerPage() {
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [token, setToken] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const handleCheckResult = async () => {
    if (!admissionNumber || !token || !selectedTerm || !selectedSession) {
      toast({ variant: 'destructive', title: 'Missing Details', description: 'Please fill all required verification fields.' });
      return;
    }

    setIsChecking(true);
    setError('');
    setResultData(null);

    try {
      const result = await validateAndUseToken(admissionNumber, token, selectedTerm, selectedSession);

      if (result.success) {
        setResultData((result as any).data);
        toast({
          title: 'Result Verified',
          description: `Statement of results loaded. ${((result as any).data as any)?.remainingUses || 0} usage(s) remaining for this token.`,
        });
      } else {
        setError(result.error || 'Failed to verify token or retrieve result');
        toast({ variant: 'destructive', title: 'Verification Failed', description: result.error });
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred while verifying result');
      toast({ variant: 'destructive', title: 'Error', description: 'Verification service error.' });
    } finally {
      setIsChecking(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50/80 p-4 sm:p-6 md:p-10 text-slate-900 print:bg-white print:p-0 print:text-black">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Public Header - Hidden on Print */}
        <div className="text-center space-y-2 print:hidden">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary mb-1">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Student Result Verification Portal
          </h1>
          <p className="text-sm text-slate-600 max-w-lg mx-auto">
            Verify official terminal examination results and continuous assessment records using an authorized school token.
          </p>
        </div>

        {/* Input & Guidelines Section - Hidden on Print */}
        <div className="grid md:grid-cols-5 gap-6 print:hidden">
          {/* Instructions */}
          <Card className="md:col-span-2 border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-slate-900">Verification Guidelines</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Please follow these instructions to validate your result slip:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2.5 text-xs text-slate-600">
                <li className="flex gap-2.5 items-start">
                  <span className="font-bold text-primary shrink-0">1.</span>
                  <span>Select the relevant academic session.</span>
                </li>
                <li className="flex gap-2.5 items-start">
                  <span className="font-bold text-primary shrink-0">2.</span>
                  <span>Select the academic term (First, Second, or Third Term).</span>
                </li>
                <li className="flex gap-2.5 items-start">
                  <span className="font-bold text-primary shrink-0">3.</span>
                  <span>Enter the official Student ID or Admission Number.</span>
                </li>
                <li className="flex gap-2.5 items-start">
                  <span className="font-bold text-primary shrink-0">4.</span>
                  <span>Input the 8-character verification token provided on your scratch card.</span>
                </li>
                <li className="flex items-start gap-2 pt-2 text-[11px] font-medium text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>Each token is restricted to 5 total verifications per candidate.</span>
                </li>
              </ol>
            </CardContent>
          </Card>

          {/* Form */}
          <Card className="md:col-span-3 border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-slate-900">Verification Credentials</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Enter your details to generate the official academic statement.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Academic Session</Label>
                  <Select value={selectedSession} onValueChange={setSelectedSession}>
                    <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-300">
                      <SelectValue placeholder="Select session" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024/2025" className="text-xs">2024/2025</SelectItem>
                      <SelectItem value="2025/2026" className="text-xs">2025/2026</SelectItem>
                      <SelectItem value="2023/2024" className="text-xs">2023/2024</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Academic Term</Label>
                  <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                    <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-300">
                      <SelectValue placeholder="Select term" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="First Term" className="text-xs">First Term</SelectItem>
                      <SelectItem value="Second Term" className="text-xs">Second Term</SelectItem>
                      <SelectItem value="Third Term" className="text-xs">Third Term</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Admission Number / Student ID</Label>
                <Input
                  placeholder="e.g. STU-2024-001"
                  value={admissionNumber}
                  onChange={(e) => setAdmissionNumber(e.target.value)}
                  className="h-9 text-xs bg-slate-50 border-slate-300 font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Verification Token</Label>
                <Input
                  placeholder="e.g. 7A8B9C0D"
                  value={token}
                  onChange={(e) => setToken(e.target.value.toUpperCase())}
                  className="h-9 text-xs bg-slate-50 border-slate-300 font-mono tracking-widest uppercase font-bold"
                />
              </div>
              <Button
                onClick={handleCheckResult}
                disabled={isChecking}
                className="w-full h-10 font-bold text-xs"
              >
                {isChecking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying Credentials...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Verify and View Statement
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Error Feedback */}
        {error && (
          <Alert variant="destructive" className="print:hidden">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
          </Alert>
        )}

        {/* Official Printable Statement of Results */}
        {resultData && (
          <div className="space-y-4">
            {/* Top Toolbar for Screen View */}
            <div className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm print:hidden">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  Result authenticated. <strong className="text-slate-900">{resultData.remainingUses}</strong> token verification(s) remaining.
                </span>
              </div>
              <Button onClick={handlePrint} size="sm" className="font-bold text-xs">
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                Print Statement of Results
              </Button>
            </div>

            {/* Official Academic Transcript Card */}
            <div className="bg-white text-slate-900 rounded-2xl border border-slate-300 p-6 sm:p-8 md:p-10 space-y-6 shadow-sm print:border-none print:shadow-none print:p-0">
              {/* Institutional Header */}
              <div className="flex flex-col sm:flex-row justify-between items-center border-b-2 border-slate-900 pb-5 gap-4">
                <div className="flex items-center gap-4 text-center sm:text-left">
                  {resultData.school?.logoUrl ? (
                    <img
                      src={resultData.school.logoUrl}
                      alt="School Crest"
                      className="w-16 h-16 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-300">
                      <School className="w-8 h-8 text-slate-700" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl md:text-2xl font-black uppercase tracking-wider text-slate-900 leading-tight">
                      {resultData.school?.name || 'Proxima SMS School'}
                    </h2>
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mt-0.5">
                      {resultData.school?.address || 'Knowledge City, Nigeria'}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {resultData.school?.phone ? `Tel: ${resultData.school.phone} • ` : ''}
                      {resultData.school?.email ? `Email: ${resultData.school.email}` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-center sm:text-right shrink-0">
                  <div className="border-2 border-slate-900 px-4 py-2 rounded-xl bg-slate-50">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Official Transcript</div>
                    <div className="text-sm font-black uppercase tracking-wider text-slate-900">Statement of Results</div>
                    <div className="text-[10px] font-semibold text-emerald-700 uppercase mt-0.5">Verified Document</div>
                  </div>
                </div>
              </div>

              {/* Candidate Metadata Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                <div>
                  <span className="font-semibold text-slate-500 uppercase text-[10px] block">Candidate Name</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {resultData.student.lastName}, {resultData.student.firstName}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 uppercase text-[10px] block">Student ID / Reg</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {resultData.student.studentId || '-'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 uppercase text-[10px] block">Class Level</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {resultData.student.classLevel || '-'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 uppercase text-[10px] block">Term & Session</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {resultData.termName || selectedTerm} • {resultData.sessionName || selectedSession}
                  </span>
                </div>
              </div>

              {/* Academic Course Performance Table */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Course Performance Record
                  </h3>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
                <div className="border border-slate-300 rounded-xl overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                        <th className="p-2.5">Subject</th>
                        <th className="p-2.5 text-center w-20 border-l border-slate-300">CA 1 (20)</th>
                        <th className="p-2.5 text-center w-20 border-l border-slate-300">CA 2 (20)</th>
                        <th className="p-2.5 text-center w-20 border-l border-slate-300">Exam (60)</th>
                        <th className="p-2.5 text-center w-24 border-l border-slate-300 bg-slate-200">Total (100)</th>
                        <th className="p-2.5 text-center w-16 border-l border-slate-300">Grade</th>
                        <th className="p-2.5 text-left w-32 border-l border-slate-300">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {resultData.scores?.map((score: any) => (
                        <tr key={score.id || score.subjectId} className="hover:bg-slate-50/50">
                          <td className="p-2.5 font-semibold text-slate-900">{score.subjectName || score.subject}</td>
                          <td className="p-2.5 text-center font-medium border-l border-slate-200">{score.ca1 ?? '-'}</td>
                          <td className="p-2.5 text-center font-medium border-l border-slate-200">{score.ca2 ?? '-'}</td>
                          <td className="p-2.5 text-center font-medium border-l border-slate-200">{score.exam ?? score.examScore ?? '-'}</td>
                          <td className="p-2.5 text-center font-bold border-l border-slate-300 bg-slate-50 text-slate-900">
                            {score.totalScore ?? '-'}
                          </td>
                          <td className="p-2.5 text-center font-bold border-l border-slate-200">{score.grade ?? '-'}</td>
                          <td className="p-2.5 text-slate-600 border-l border-slate-200">{score.remarks || '-'}</td>
                        </tr>
                      ))}
                      {(!resultData.scores || resultData.scores.length === 0) && (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-500 italic">
                            No subject score records found for this candidate.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Term Summary KPIs & Behavioural Domain */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Cumulative Performance Summary */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Performance Summary</h3>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>
                  <div className="p-4 rounded-xl border border-slate-300 bg-slate-50 space-y-2.5 text-xs">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="font-semibold text-slate-600 uppercase text-[11px]">Cumulative Marks</span>
                      <span className="text-base font-bold text-slate-900">{resultData.totalMarks ?? '-'}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="font-semibold text-slate-600 uppercase text-[11px]">Overall Average</span>
                      <span className="text-base font-bold text-slate-900">
                        {resultData.average != null ? `${resultData.average.toFixed(1)}%` : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-600 uppercase text-[11px]">Overall Grade</span>
                      <span className="text-base font-black text-slate-900">{resultData.overallGrade || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Behavioural Assessment */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Behavioural Assessment</h3>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>
                  {resultData.behavioural ? (
                    <div className="grid grid-cols-2 gap-2 p-3.5 rounded-xl border border-slate-300 bg-slate-50 text-xs">
                      <div className="flex justify-between border-b border-slate-200 pb-1 text-[11px]">
                        <span className="text-slate-600 font-medium">Conduct</span>
                        <span className="font-bold text-slate-900">{resultData.behavioural.conduct} / 10</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 pb-1 text-[11px]">
                        <span className="text-slate-600 font-medium">Punctuality</span>
                        <span className="font-bold text-slate-900">{resultData.behavioural.punctuality} / 10</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 pb-1 text-[11px]">
                        <span className="text-slate-600 font-medium">Dedication</span>
                        <span className="font-bold text-slate-900">{resultData.behavioural.dedication} / 10</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 pb-1 text-[11px]">
                        <span className="text-slate-600 font-medium">Participation</span>
                        <span className="font-bold text-slate-900">{resultData.behavioural.participation} / 10</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-slate-300 bg-slate-50 text-center text-xs text-slate-500 italic">
                      No behavioural assessment recorded for this term.
                    </div>
                  )}
                </div>
              </div>

              {/* Official Grading Scale Key */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-800">
                    Grading System Key & Performance Scale
                  </span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
                <div className="border border-slate-300 rounded-lg overflow-hidden">
                  <table className="w-full text-center text-[10px] border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                        <th className="py-1 px-1.5 border-r border-slate-300">Grade</th>
                        <th className="py-1 px-1.5 border-r border-slate-300">Range</th>
                        <th className="py-1 px-1.5 border-r border-slate-300">Remark</th>
                        <th className="py-1 px-1.5 border-r border-slate-300">Grade</th>
                        <th className="py-1 px-1.5 border-r border-slate-300">Range</th>
                        <th className="py-1 px-1.5 border-r border-slate-300">Remark</th>
                        <th className="py-1 px-1.5 border-r border-slate-300">Grade</th>
                        <th className="py-1 px-1.5 border-r border-slate-300">Range</th>
                        <th className="py-1 px-1.5">Remark</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                      <tr>
                        <td className="py-0.5 font-black text-emerald-800 border-r border-slate-200">A1</td>
                        <td className="py-0.5 border-r border-slate-200">75 - 100%</td>
                        <td className="py-0.5 border-r border-slate-200 text-slate-600">Excellent</td>
                        <td className="py-0.5 font-black text-blue-800 border-r border-slate-200">B2</td>
                        <td className="py-0.5 border-r border-slate-200">70 - 74%</td>
                        <td className="py-0.5 border-r border-slate-200 text-slate-600">Very Good</td>
                        <td className="py-0.5 font-black text-blue-800 border-r border-slate-200">B3</td>
                        <td className="py-0.5 border-r border-slate-200">65 - 69%</td>
                        <td className="py-0.5 text-slate-600">Good</td>
                      </tr>
                      <tr>
                        <td className="py-0.5 font-black text-cyan-800 border-r border-slate-200">C4</td>
                        <td className="py-0.5 border-r border-slate-200">60 - 64%</td>
                        <td className="py-0.5 border-r border-slate-200 text-slate-600">Credit</td>
                        <td className="py-0.5 font-black text-cyan-800 border-r border-slate-200">C5</td>
                        <td className="py-0.5 border-r border-slate-200">55 - 59%</td>
                        <td className="py-0.5 border-r border-slate-200 text-slate-600">Credit</td>
                        <td className="py-0.5 font-black text-cyan-800 border-r border-slate-200">C6</td>
                        <td className="py-0.5 border-r border-slate-200">50 - 54%</td>
                        <td className="py-0.5 text-slate-600">Credit</td>
                      </tr>
                      <tr>
                        <td className="py-0.5 font-black text-amber-800 border-r border-slate-200">D7</td>
                        <td className="py-0.5 border-r border-slate-200">45 - 49%</td>
                        <td className="py-0.5 border-r border-slate-200 text-slate-600">Pass</td>
                        <td className="py-0.5 font-black text-amber-800 border-r border-slate-200">E8</td>
                        <td className="py-0.5 border-r border-slate-200">40 - 44%</td>
                        <td className="py-0.5 border-r border-slate-200 text-slate-600">Pass</td>
                        <td className="py-0.5 font-black text-rose-800 border-r border-slate-200">F9</td>
                        <td className="py-0.5 border-r border-slate-200">0 - 39%</td>
                        <td className="py-0.5 text-rose-700">Fail</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Endorsement Blocks & Footer */}
              <div className="grid grid-cols-2 gap-8 pt-8 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <div className="border-t border-slate-400 pt-2">Examination Officer / Registrar</div>
                <div className="border-t border-slate-400 pt-2">Official School Seal & Date</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Production Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          body {
            background: white !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          table {
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
