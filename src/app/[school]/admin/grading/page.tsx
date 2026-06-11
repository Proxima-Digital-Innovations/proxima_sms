'use client';

import { useState, useEffect } from 'react';
import { getScheduleResources } from '@/actions/schedule-actions'; // Reuse to get terms, classes, subjects
import { getGradeSheet, saveGradeSheet, getStudentReportCard } from '@/actions/grading-actions';
import { BookOpen, Calendar, Save, CheckCircle2, AlertCircle, FileText, User, Printer } from 'lucide-react';

export default function GradingDashboard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resources, setResources] = useState<any>(null);
  
  // Selection
  const [activeTermId, setActiveTermId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  // Data
  const [grades, setGrades] = useState<any[]>([]);
  const [modifiedGrades, setModifiedGrades] = useState<Record<string, any>>({});
  
  // Report Card View State
  const [reportCard, setReportCard] = useState<any>(null);

  useEffect(() => {
    async function loadMeta() {
      const res = await getScheduleResources();
      if (res.success && res.resources) {
        setResources(res.resources);
        if (res.resources.activeTerms[0]) setActiveTermId(res.resources.activeTerms[0].id);
        if (res.resources.classes[0]) setSelectedClassId(res.resources.classes[0].id);
        if (res.resources.subjects[0]) setSelectedSubjectId(res.resources.subjects[0].id);
      }
      setLoading(false);
    }
    loadMeta();
  }, []);

  useEffect(() => {
    if (activeTermId && selectedClassId && selectedSubjectId) {
      fetchGrades();
    }
  }, [activeTermId, selectedClassId, selectedSubjectId]);

  const fetchGrades = async () => {
    setLoading(true);
    const res = await getGradeSheet(selectedClassId, selectedSubjectId, activeTermId);
    if (res.success) {
      setGrades(res.grades);
      // Initialize modification tracking map
      const initialMod: Record<string, any> = {};
      res.grades.forEach(g => {
        initialMod[g.id] = {
          ca1: g.ca1,
          ca2: g.ca2,
          exam: g.exam,
          remarks: g.remarks || ''
        };
      });
      setModifiedGrades(initialMod);
    }
    setLoading(false);
  };

  const handleInputChange = (id: string, field: string, value: string) => {
    let numVal: number | null = value === '' ? null : parseFloat(value);
    
    // Bounds checking
    if (numVal !== null) {
      if (field === 'ca1' || field === 'ca2') {
        if (numVal > 20) numVal = 20;
        if (numVal < 0) numVal = 0;
      }
      if (field === 'exam') {
        if (numVal > 60) numVal = 60;
        if (numVal < 0) numVal = 0;
      }
    }

    setModifiedGrades(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: field === 'remarks' ? value : numVal
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    // Convert map to array format expected by backend
    const updatePayload = Object.keys(modifiedGrades).map(id => ({
      id,
      ...modifiedGrades[id]
    }));
    
    const res = await saveGradeSheet(updatePayload);
    if (res.success) {
      await fetchGrades(); // Reload to get calculated totals and grades
    }
    setSaving(false);
  };

  const handleViewReportCard = async (studentId: string) => {
    setLoading(true);
    const res = await getStudentReportCard(studentId, activeTermId);
    if (res.success) {
      setReportCard(res.report);
    }
    setLoading(false);
  };

  // UI Helpers
  const calcLiveTotal = (modObj: any) => {
    return (modObj?.ca1 || 0) + (modObj?.ca2 || 0) + (modObj?.exam || 0);
  };

  const getGradeColor = (total: number) => {
    if (total >= 75) return 'text-emerald-400 bg-emerald-400/10 border-emerald-500/30';
    if (total >= 60) return 'text-blue-400 bg-blue-400/10 border-blue-500/30';
    if (total >= 50) return 'text-amber-400 bg-amber-400/10 border-amber-500/30';
    if (total >= 40) return 'text-orange-400 bg-orange-400/10 border-orange-500/30';
    return 'text-rose-400 bg-rose-400/10 border-rose-500/30';
  };

  if (loading && !resources) {
    return <div className="min-h-screen flex justify-center py-20"><div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900/40 to-neutral-900/40 border border-white/10 p-8 shadow-2xl backdrop-blur-xl">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl opacity-50 pointer-events-none" />
          
          <div className="flex justify-between items-end relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2">
                <BookOpen className="w-4 h-4" /> Grading Engine
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                Gradebook
              </h1>
              <p className="text-neutral-400 max-w-xl text-lg font-light leading-relaxed">
                Input CA1, CA2, and Exam scores. Term totals and grade matrices are calculated automatically.
              </p>
            </div>
            
            <button 
              onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-black font-bold shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:scale-105 transition-all duration-300 active:scale-95 disabled:opacity-50"
            >
              {saving ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
              Save Grades
            </button>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex gap-4 items-center bg-black/40 p-4 rounded-2xl border border-white/5 shadow-inner">
          <Calendar className="text-neutral-500 w-5 h-5" />
          <select 
            value={activeTermId} onChange={e=>setActiveTermId(e.target.value)}
            className="bg-neutral-900 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none"
          >
            {resources?.activeTerms.map((t: any) => <option key={t.id} value={t.id}>{t.session.year} - {t.name}</option>)}
          </select>
          <div className="w-px h-8 bg-white/10 mx-2" />
          <select 
            value={selectedClassId} onChange={e=>setSelectedClassId(e.target.value)}
            className="bg-neutral-900 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none"
          >
            {resources?.classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select 
            value={selectedSubjectId} onChange={e=>setSelectedSubjectId(e.target.value)}
            className="bg-neutral-900 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none"
          >
            {resources?.subjects.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Grading Grid */}
        <div className="bg-neutral-900/40 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl">
          <div className="grid grid-cols-12 border-b border-white/10 bg-black/40 text-xs font-bold text-neutral-400 uppercase tracking-widest text-center">
            <div className="col-span-3 p-4 text-left border-r border-white/10">Student Name</div>
            <div className="col-span-2 p-4 border-r border-white/10">CA 1 (20)</div>
            <div className="col-span-2 p-4 border-r border-white/10">CA 2 (20)</div>
            <div className="col-span-2 p-4 border-r border-white/10">Exam (60)</div>
            <div className="col-span-1 p-4 border-r border-white/10">Total</div>
            <div className="col-span-2 p-4">Report Card</div>
          </div>

          {loading ? (
             <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" /></div>
          ) : grades.length === 0 ? (
            <div className="text-center py-20">
              <AlertCircle className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
              <p className="text-neutral-400">No students found in this class.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {grades.map(grade => {
                const mod = modifiedGrades[grade.id] || {};
                const liveTotal = calcLiveTotal(mod);
                return (
                  <div key={grade.id} className="grid grid-cols-12 items-center hover:bg-white/[0.02] transition-colors">
                    <div className="col-span-3 p-4 border-r border-white/10 flex flex-col justify-center">
                      <span className="font-bold text-white text-sm">{grade.student.lastName}, {grade.student.firstName}</span>
                      <span className="text-xs text-neutral-500 font-mono">{grade.student.studentId}</span>
                    </div>
                    
                    <div className="col-span-2 p-4 border-r border-white/10">
                      <input 
                        type="number" max="20" min="0" placeholder="-"
                        value={mod.ca1 ?? ''} onChange={e => handleInputChange(grade.id, 'ca1', e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg py-2 text-center text-lg font-bold focus:border-indigo-500 focus:bg-indigo-500/10 transition-colors outline-none"
                      />
                    </div>
                    <div className="col-span-2 p-4 border-r border-white/10">
                      <input 
                        type="number" max="20" min="0" placeholder="-"
                        value={mod.ca2 ?? ''} onChange={e => handleInputChange(grade.id, 'ca2', e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg py-2 text-center text-lg font-bold focus:border-indigo-500 focus:bg-indigo-500/10 transition-colors outline-none"
                      />
                    </div>
                    <div className="col-span-2 p-4 border-r border-white/10">
                      <input 
                        type="number" max="60" min="0" placeholder="-"
                        value={mod.exam ?? ''} onChange={e => handleInputChange(grade.id, 'exam', e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg py-2 text-center text-lg font-bold focus:border-indigo-500 focus:bg-indigo-500/10 transition-colors outline-none"
                      />
                    </div>
                    
                    <div className="col-span-1 p-4 border-r border-white/10 flex items-center justify-center">
                      <div className={`px-3 py-2 rounded-xl border font-black text-lg ${getGradeColor(liveTotal)}`}>
                        {liveTotal}
                      </div>
                    </div>
                    
                    <div className="col-span-2 p-4 flex justify-center">
                       <button 
                         onClick={() => handleViewReportCard(grade.studentId)}
                         className="flex items-center gap-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:underline px-4 py-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20"
                       >
                         <FileText className="w-4 h-4" /> View Full Report
                       </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* REPORT CARD MODAL */}
      {reportCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white text-black p-8 rounded-xl w-full max-w-4xl shadow-2xl h-[90vh] flex flex-col relative overflow-hidden">
            {/* Header / Actions */}
            <div className="flex justify-between items-center border-b border-neutral-200 pb-4 mb-6 shrink-0">
              <button onClick={()=>setReportCard(null)} className="font-bold text-neutral-500 hover:text-black transition-colors px-4 py-2 border rounded-lg">Close</button>
              <button className="flex items-center gap-2 font-bold bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700">
                <Printer className="w-4 h-4" /> Print PDF
              </button>
            </div>
            
            {/* The Actual Report Card Design */}
            <div className="flex-1 overflow-y-auto print:overflow-visible pr-4 custom-scrollbar">
              <div className="text-center mb-10">
                <h1 className="text-3xl font-black uppercase tracking-widest text-neutral-800">AlBabello Academy</h1>
                <p className="text-neutral-500 font-medium">Terminal Academic Report</p>
                <div className="w-24 h-1 bg-indigo-600 mx-auto mt-4" />
              </div>

              <div className="grid grid-cols-2 gap-8 mb-10 bg-neutral-50 p-6 rounded-2xl border border-neutral-200">
                <div className="space-y-3">
                  <div className="flex justify-between border-b border-neutral-200 pb-2"><span className="text-neutral-500 font-bold uppercase text-xs">Student Name</span> <span className="font-bold text-lg">{reportCard.student.lastName}, {reportCard.student.firstName}</span></div>
                  <div className="flex justify-between border-b border-neutral-200 pb-2"><span className="text-neutral-500 font-bold uppercase text-xs">Student ID</span> <span className="font-bold">{reportCard.student.studentId}</span></div>
                  <div className="flex justify-between border-b border-neutral-200 pb-2"><span className="text-neutral-500 font-bold uppercase text-xs">Class</span> <span className="font-bold">{reportCard.student.class?.name || 'N/A'}</span></div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between border-b border-neutral-200 pb-2"><span className="text-neutral-500 font-bold uppercase text-xs">Academic Session</span> <span className="font-bold">{reportCard.term.session.year}</span></div>
                  <div className="flex justify-between border-b border-neutral-200 pb-2"><span className="text-neutral-500 font-bold uppercase text-xs">Term</span> <span className="font-bold">{reportCard.term.name}</span></div>
                  <div className="flex justify-between border-b border-neutral-200 pb-2"><span className="text-neutral-500 font-bold uppercase text-xs">Days Present</span> <span className="font-bold">{reportCard.attendance}</span></div>
                </div>
              </div>

              <table className="w-full text-left border-collapse border border-neutral-300">
                <thead>
                  <tr className="bg-neutral-100 text-xs font-bold text-neutral-600 uppercase tracking-widest">
                    <th className="p-4 border border-neutral-300">Subject</th>
                    <th className="p-4 border border-neutral-300 text-center">CA 1 (20)</th>
                    <th className="p-4 border border-neutral-300 text-center">CA 2 (20)</th>
                    <th className="p-4 border border-neutral-300 text-center">Exam (60)</th>
                    <th className="p-4 border border-neutral-300 text-center bg-indigo-50">Total</th>
                    <th className="p-4 border border-neutral-300 text-center bg-indigo-50">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {reportCard.grades.map((g: any) => (
                    <tr key={g.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="p-4 border border-neutral-300 font-bold">{g.subject.name}</td>
                      <td className="p-4 border border-neutral-300 text-center">{g.ca1 ?? '-'}</td>
                      <td className="p-4 border border-neutral-300 text-center">{g.ca2 ?? '-'}</td>
                      <td className="p-4 border border-neutral-300 text-center">{g.exam ?? '-'}</td>
                      <td className="p-4 border border-neutral-300 text-center font-black bg-indigo-50">{g.total ?? '-'}</td>
                      <td className="p-4 border border-neutral-300 text-center font-black bg-indigo-50">{g.grade ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-8 flex justify-end">
                <div className="bg-neutral-100 p-6 rounded-2xl border border-neutral-200 w-64 text-center">
                  <div className="text-neutral-500 font-bold uppercase text-xs mb-2">Term Average</div>
                  <div className="text-4xl font-black text-indigo-600">{reportCard.average}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
