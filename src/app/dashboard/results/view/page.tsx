'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { DynamicTitle } from '@/components/dashboard/dynamic-title';
import { getAcademicData } from '@/actions/academic-data';
import { getStudentReportCard, getBroadsheetData } from '@/actions/results-actions';
import { getStudents } from '@/actions/student-actions';
import { Search, Printer, Loader2, Award, Book, Users, School, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [viewMode, setViewMode] = useState<'SEARCH' | 'BROADSHEET' | 'REPORT_CARD'>('SEARCH');
  
  const [reportCard, setReportCard] = useState<any>(null);
  const [broadsheet, setBroadsheet] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const acadRes = await getAcademicData();
      setClasses(acadRes.classes || []);
      setTerms(acadRes.terms || []);
      setSessions(acadRes.sessions || []);
    })();
  }, []);

  const handleSearchStudents = async () => {
    if (!selectedClass) {
      toast({ variant: 'destructive', title: 'Select a Class', description: 'Choose a class to load students.' });
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
    if (!selectedClass || !selectedTerm || !selectedSession) {
      toast({ variant: 'destructive', title: 'Missing Filters', description: 'Select class, term, and session.' });
      return;
    }
    setIsLoading(true);
    try {
      const termObj = terms.find(t => t.id === selectedTerm);
      const sessionObj = sessions.find(s => s.id === selectedSession);
      const res = await getBroadsheetData(selectedClass, termObj?.name, sessionObj?.name);
      if (res.success) {
        setBroadsheet(res);
        setViewMode('BROADSHEET');
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadReportCard = async (studentId: string) => {
    if (!selectedTerm) {
      toast({ variant: 'destructive', title: 'Select Term', description: 'Please select a term first.' });
      return;
    }
    setIsLoading(true);
    try {
      const res = await getStudentReportCard(studentId, selectedTerm);
      if (res.success) {
        setReportCard(res.data);
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

  const filteredStudents = students.filter(s => 
    `${s.firstName} ${s.lastName} ${s.studentId}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/50 p-6 rounded-3xl border border-slate-800 backdrop-blur-sm shadow-xl shadow-black/10 print:hidden"
      >
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">View Results</h1>
          <p className="text-slate-400 mt-1">
            Access student report cards and class broadsheets.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {viewMode !== 'SEARCH' && (
            <Button variant="outline" onClick={() => setViewMode('SEARCH')} className="border-slate-700 text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-xl h-10">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Search
            </Button>
          )}
          {viewMode === 'REPORT_CARD' && (
            <Button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 transition-all rounded-xl h-10">
              <Printer className="h-4 w-4 mr-2" /> Print Report Card
            </Button>
          )}
        </div>
      </motion.div>

      {viewMode === 'SEARCH' && (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          <Card className="lg:col-span-1 bg-slate-900/40 border-slate-800 shadow-none rounded-3xl overflow-hidden backdrop-blur-sm">
            <CardHeader className="border-b border-slate-800 bg-slate-900/50 p-6">
              <CardTitle className="text-xl font-bold text-white">Filters</CardTitle>
              <CardDescription className="text-slate-400">Select parameters to view results.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-400">Session</Label>
                <Select value={selectedSession} onValueChange={setSelectedSession}>
                  <SelectTrigger className="bg-slate-950/50 border-slate-700 text-slate-200 rounded-xl h-10"><SelectValue placeholder="Select session" /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">{sessions.map(s => <SelectItem key={s.id} value={s.id} className="hover:bg-slate-800 focus:bg-slate-800">{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400">Term</Label>
                <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                  <SelectTrigger className="bg-slate-950/50 border-slate-700 text-slate-200 rounded-xl h-10"><SelectValue placeholder="Select term" /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">{terms.map(t => <SelectItem key={t.id} value={t.id} className="hover:bg-slate-800 focus:bg-slate-800">{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400">Class</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="bg-slate-950/50 border-slate-700 text-slate-200 rounded-xl h-10"><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">{classes.map(c => <SelectItem key={c.id} value={c.id} className="hover:bg-slate-800 focus:bg-slate-800">{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="pt-4 flex flex-col gap-3">
                <Button onClick={handleSearchStudents} disabled={isLoading} variant="outline" className="w-full border-slate-700 text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-xl h-10">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Users className="h-4 w-4 mr-2" />}
                  Find Students
                </Button>
                <Button onClick={handleLoadBroadsheet} disabled={isLoading} className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-10">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Book className="h-4 w-4 mr-2" />}
                  View Class Broadsheet
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 bg-slate-900/40 border-slate-800 shadow-none rounded-3xl overflow-hidden backdrop-blur-sm">
            <CardHeader className="border-b border-slate-800 bg-slate-900/50 p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-white">Students</CardTitle>
                <CardDescription className="text-slate-400">Select a student to view their report card.</CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input placeholder="Search name or ID..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 bg-slate-950/50 border-slate-700 text-slate-200 rounded-xl focus-visible:ring-violet-500 h-10" />
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {students.length === 0 ? (
                <div className="py-16 text-center text-slate-500">
                  <Users className="h-16 w-16 mx-auto text-slate-700 mb-4" />
                  <p className="text-lg font-medium text-slate-400">Select a class to find students</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredStudents.map(student => (
                    <div key={student.id} onClick={() => handleLoadReportCard(student.id)} className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:border-violet-500/50 hover:bg-slate-800 cursor-pointer transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
                            {student.firstName?.[0] || 'S'}
                        </div>
                        <div>
                            <p className="font-bold text-slate-200 group-hover:text-white transition-colors">{student.lastName}, {student.firstName}</p>
                            <p className="text-[10px] text-slate-500 tracking-widest mt-0.5">{student.studentId || 'NO ID'}</p>
                        </div>
                      </div>
                      <div className="p-2 bg-slate-950 rounded-full group-hover:bg-violet-500/20 group-hover:text-violet-400 transition-colors">
                        <Award className="h-4 w-4 text-slate-500 group-hover:text-violet-400" />
                      </div>
                    </div>
                  ))}
                  {filteredStudents.length === 0 && (
                    <div className="col-span-full py-16 text-center text-slate-500">
                        <p className="text-lg font-medium text-slate-400">No matching students found.</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {viewMode === 'REPORT_CARD' && reportCard && (
        <Card className="border-none shadow-2xl overflow-hidden print:shadow-none print:border-none print:w-full bg-white text-slate-900 rounded-3xl print:rounded-none">
          <div className="p-8 md:p-12 space-y-10 min-h-[1000px]">
            {/* Header */}
            <div className="flex justify-between items-center border-b-4 border-slate-900 pb-8">
              <div className="flex gap-6 items-center">
                <div className="bg-slate-100 p-4 rounded-2xl print:bg-white print:border-2 print:border-slate-200">
                  <School className="h-16 w-16 text-slate-800" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-black uppercase tracking-widest text-slate-900">Albabello International</h1>
                  <p className="text-sm font-bold tracking-[0.2em] text-slate-500 uppercase mt-2">Excellence & Character</p>
                  <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">123 Education Way, Knowledge City</p>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-slate-900 text-white px-6 py-3 rounded-xl inline-block print:border-2 print:border-slate-900 print:bg-white print:text-slate-900 shadow-xl">
                  <h2 className="text-xl font-black uppercase tracking-widest">
                    Report Card
                  </h2>
                </div>
              </div>
            </div>

            {/* Student Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-6 rounded-2xl border-2 border-slate-200 print:bg-transparent">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Name</p>
                <p className="font-black text-slate-900 uppercase">{reportCard.student.lastName}, {reportCard.student.firstName}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Student ID</p>
                <p className="font-bold text-slate-900 uppercase font-mono">{reportCard.student.studentId || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Class</p>
                <p className="font-bold text-slate-900 uppercase">{reportCard.student.class?.name}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Term & Session</p>
                <p className="font-bold text-slate-900 uppercase">{reportCard.term?.name} <span className="text-slate-400 mx-1">•</span> {selectedSession ? sessions.find(s=>s.id===selectedSession)?.name : ''}</p>
              </div>
            </div>

            {/* Academic Performance */}
            <div>
              <div className="flex items-center gap-4 mb-6">
                  <h3 className="text-xl font-black uppercase tracking-widest text-slate-900">Academic Performance</h3>
                  <div className="h-1 flex-1 bg-slate-100 rounded-full"></div>
              </div>
              <div className="border-2 border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-sm border-collapse">
                    <thead>
                    <tr className="bg-slate-900 text-white print:bg-slate-200 print:text-slate-900">
                        <th className="p-4 text-left font-bold uppercase tracking-wider text-xs">Subject</th>
                        <th className="p-4 text-center font-bold uppercase tracking-wider text-xs w-20 border-l border-slate-800 print:border-slate-300">CA1</th>
                        <th className="p-4 text-center font-bold uppercase tracking-wider text-xs w-20 border-l border-slate-800 print:border-slate-300">CA2</th>
                        <th className="p-4 text-center font-bold uppercase tracking-wider text-xs w-20 border-l border-slate-800 print:border-slate-300">Exam</th>
                        <th className="p-4 text-center font-bold uppercase tracking-wider text-xs w-24 bg-indigo-600 border-l border-indigo-700 print:bg-slate-300 print:border-slate-400">Total</th>
                        <th className="p-4 text-center font-bold uppercase tracking-wider text-xs w-20 bg-slate-800 border-l border-slate-700 print:bg-slate-200 print:border-slate-300">Grade</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                    {reportCard.scores.map((score: any) => (
                        <tr key={score.id} className="even:bg-slate-50 print:even:bg-transparent hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-bold text-slate-800">{score.subject?.name}</td>
                        <td className="p-4 text-center border-l border-slate-200">{score.ca1 ?? '-'}</td>
                        <td className="p-4 text-center border-l border-slate-200">{score.ca2 ?? '-'}</td>
                        <td className="p-4 text-center border-l border-slate-200">{score.exam ?? '-'}</td>
                        <td className="p-4 text-center font-black text-indigo-700 bg-indigo-50/50 border-l border-indigo-100 print:bg-transparent print:border-slate-200">{score.total ?? '-'}</td>
                        <td className="p-4 text-center font-black bg-slate-50 border-l border-slate-200 print:bg-transparent">{score.grade ?? '-'}</td>
                        </tr>
                    ))}
                    {reportCard.scores.length === 0 && (
                        <tr><td colSpan={6} className="p-12 text-center text-slate-500 font-medium">No academic scores recorded for this term.</td></tr>
                    )}
                    </tbody>
                </table>
              </div>
            </div>

            {/* Summary & Behavioural */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Summary Stats */}
              <div>
                <div className="flex items-center gap-4 mb-6">
                    <h3 className="text-xl font-black uppercase tracking-widest text-slate-900">Term Summary</h3>
                    <div className="h-1 flex-1 bg-slate-100 rounded-full"></div>
                </div>
                <div className="bg-indigo-50 p-8 rounded-2xl border-2 border-indigo-100 space-y-6 print:bg-transparent print:border-slate-200">
                  <div className="flex justify-between items-center border-b-2 border-indigo-200/50 pb-4 print:border-slate-200">
                    <span className="font-bold text-indigo-900 uppercase text-xs tracking-widest print:text-slate-700">Total Score</span>
                    <span className="text-3xl font-black text-indigo-700 print:text-slate-900">{reportCard.summary?.totalScore ?? '-'}</span>
                  </div>
                  <div className="flex justify-between items-center border-b-2 border-indigo-200/50 pb-4 print:border-slate-200">
                    <span className="font-bold text-indigo-900 uppercase text-xs tracking-widest print:text-slate-700">Average</span>
                    <span className="text-3xl font-black text-indigo-700 print:text-slate-900">{reportCard.summary?.average ? `${reportCard.summary.average.toFixed(2)}%` : '-'}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-bold text-indigo-900 uppercase text-xs tracking-widest print:text-slate-700">Class Position</span>
                    <div className="text-right">
                        <span className="text-3xl font-black text-indigo-700 print:text-slate-900">{reportCard.summary?.position ?? '-'}</span>
                        <span className="text-sm font-bold text-indigo-400 ml-2 print:text-slate-500">out of {reportCard.summary?.totalStudents ?? '-'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Behavioural */}
              <div>
                <div className="flex items-center gap-4 mb-6">
                    <h3 className="text-xl font-black uppercase tracking-widest text-slate-900">Behavioural</h3>
                    <div className="h-1 flex-1 bg-slate-100 rounded-full"></div>
                </div>
                {reportCard.behavioural?.length > 0 ? (
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm bg-slate-50 p-8 rounded-2xl border-2 border-slate-200 print:bg-transparent">
                    {reportCard.behavioural.map((b: any) => (
                      <div key={b.trait.id} className="flex justify-between border-b-2 border-slate-200/50 pb-2">
                        <span className="font-semibold text-slate-600 uppercase text-xs tracking-wider">{b.trait.name}</span>
                        <span className="font-black text-slate-900">{b.score} <span className="text-slate-400 font-medium">/ 5</span></span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 p-8 rounded-2xl border-2 border-slate-200 print:bg-transparent text-center">
                    <p className="text-slate-500 font-medium italic">No behavioural assessment recorded.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Remarks */}
            <div className="pt-8 space-y-8">
              <div className="flex flex-col md:flex-row gap-4 md:items-end border-b-2 border-slate-200 pb-4">
                <div className="w-56 font-black uppercase text-xs text-slate-500 tracking-widest shrink-0">Class Teacher's Remark</div>
                <div className="flex-1 font-semibold italic text-lg text-slate-800">{reportCard.summary?.teacherRemark || '........................................................................'}</div>
              </div>
              <div className="flex flex-col md:flex-row gap-4 md:items-end border-b-2 border-slate-200 pb-4">
                <div className="w-56 font-black uppercase text-xs text-slate-500 tracking-widest shrink-0">Principal's Remark</div>
                <div className="flex-1 font-semibold italic text-lg text-slate-800">{reportCard.summary?.principalRemark || '........................................................................'}</div>
              </div>
            </div>
            
            {/* Signatures */}
            <div className="flex justify-between pt-24 text-sm font-black uppercase tracking-widest text-slate-400">
              <div className="text-center w-1/3 px-4">
                <div className="border-t-4 border-slate-300 pt-4">Form Teacher Signature</div>
              </div>
              <div className="text-center w-1/3 px-4">
                <div className="border-t-4 border-slate-300 pt-4">Principal Signature</div>
              </div>
              <div className="text-center w-1/3 px-4">
                <div className="border-t-4 border-slate-300 pt-4 text-slate-300">Official Stamp</div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {viewMode === 'BROADSHEET' && broadsheet && (
        <Card className="bg-slate-900/40 border-slate-800 shadow-none rounded-3xl overflow-hidden backdrop-blur-sm print:bg-white print:border-none print:shadow-none">
          <CardHeader className="bg-slate-900/50 border-b border-slate-800 p-6 print:bg-transparent print:border-b-2 print:border-slate-900">
            <CardTitle className="text-xl font-bold text-white print:text-slate-900 print:text-2xl print:uppercase print:tracking-widest">Class Broadsheet</CardTitle>
            <CardDescription className="text-slate-400 font-medium print:text-slate-600 print:text-lg">
                <span className="text-violet-400 print:text-slate-900 font-bold">{broadsheet.class?.name}</span> <span className="mx-2">•</span> {broadsheet.term?.name || broadsheet.term} <span className="mx-2">•</span> {broadsheet.session?.name || broadsheet.session}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm whitespace-nowrap border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 print:bg-slate-200 print:border-slate-400">
                  <th className="p-4 text-left font-bold tracking-wider text-slate-300 uppercase text-xs sticky left-0 bg-slate-950 z-10 border-r border-slate-800 print:bg-slate-200 print:border-slate-400 print:text-slate-900 min-w-[250px]">Student</th>
                  {broadsheet.subjects.map((sub: any) => (
                    <th key={sub.id} className="p-4 text-center border-r border-slate-800 font-bold text-slate-400 uppercase text-[10px] tracking-widest min-w-[80px] max-w-[100px] print:border-slate-400 print:text-slate-700">
                      <div className="truncate" title={sub.name}>{sub.name.substring(0,3)}</div>
                    </th>
                  ))}
                  <th className="p-4 text-center border-r border-violet-900/50 bg-violet-900/20 text-violet-300 font-bold uppercase text-xs tracking-wider min-w-[80px] print:bg-slate-300 print:text-slate-900 print:border-slate-400">Total</th>
                  <th className="p-4 text-center border-r border-violet-900/50 bg-violet-900/20 text-violet-300 font-bold uppercase text-xs tracking-wider min-w-[80px] print:bg-slate-300 print:text-slate-900 print:border-slate-400">Avg</th>
                  <th className="p-4 text-center border-slate-800 bg-indigo-900/40 text-indigo-300 font-bold uppercase text-xs tracking-wider min-w-[80px] print:bg-slate-400 print:text-slate-900 print:border-slate-500">Pos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 print:divide-slate-300">
                {broadsheet.broadsheet.map((stu: any, idx: number) => (
                  <tr key={stu.student.id} className="hover:bg-slate-800/50 transition-colors group print:hover:bg-transparent">
                    <td className="p-4 sticky left-0 z-10 border-r border-slate-800 bg-slate-900 group-hover:bg-slate-800 print:bg-transparent print:border-slate-400 transition-colors">
                        <div className="font-bold text-slate-200 print:text-slate-900">{stu.student.lastName}, {stu.student.firstName}</div>
                    </td>
                    {broadsheet.subjects.map((sub: any) => {
                      const score = stu.subjects.find((s: any) => s.subjectId === sub.id);
                      return (
                        <td key={sub.id} className={`p-4 text-center border-r border-slate-800 print:border-slate-400 font-medium ${!score || score.total === null ? 'text-slate-600 print:text-slate-400' : 'text-slate-300 print:text-slate-900'}`}>
                          {score && score.total !== null ? score.total : '-'}
                        </td>
                      );
                    })}
                    <td className="p-4 text-center font-bold border-r border-violet-900/30 bg-violet-900/10 text-violet-100 print:border-slate-400 print:bg-transparent print:text-slate-900">{stu.totalScore ?? '-'}</td>
                    <td className="p-4 text-center font-bold border-r border-violet-900/30 bg-violet-900/10 text-violet-100 print:border-slate-400 print:bg-transparent print:text-slate-900">{stu.average ? stu.average.toFixed(1) : '-'}</td>
                    <td className="p-4 text-center font-black bg-indigo-900/20 text-indigo-200 print:bg-transparent print:text-slate-900">{stu.rank ?? '-'}</td>
                  </tr>
                ))}
                {broadsheet.broadsheet.length === 0 && (
                    <tr><td colSpan={broadsheet.subjects.length + 4} className="p-12 text-center text-slate-500 font-medium">No students found in broadsheet.</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
