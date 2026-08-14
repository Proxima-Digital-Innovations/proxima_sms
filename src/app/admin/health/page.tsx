'use client';

import { useState, useEffect } from 'react';
import { getStudentsForHealthDashboard, getStudentHealthRecord, updateHealthProfile, logClinicVisit, addImmunization } from '@/actions/health-actions';
import { Stethoscope, HeartPulse, Search, User, Pill, Syringe, Clock, AlertTriangle, ShieldAlert } from 'lucide-react';

export default function HealthDashboard() {
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [healthRecord, setHealthRecord] = useState<any | null>(null);
  const [recordLoading, setRecordLoading] = useState(false);

  // New Visit Form
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [symptoms, setSymptoms] = useState('');
  const [treatment, setTreatment] = useState('');
  const [sentHome, setSentHome] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      const res = await getStudentsForHealthDashboard(search);
      if (res.success) setStudents(res.students);
      setLoading(false);
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const selectStudent = async (student: any) => {
    setSelectedStudent(student);
    setRecordLoading(true);
    const res = await getStudentHealthRecord(student.id);
    if (res.success) setHealthRecord(res.record);
    setRecordLoading(false);
  };

  const handleLogVisit = async () => {
    if (!healthRecord || !symptoms) return;
    await logClinicVisit(healthRecord.id, { symptoms, treatment, sentHome });
    setShowVisitModal(false);
    setSymptoms(''); setTreatment(''); setSentHome(false);
    // Refresh record
    selectStudent(selectedStudent);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col md:flex-row overflow-hidden font-sans">
      
      {/* LEFT PANEL - Student Roster */}
      <div className="w-full md:w-96 border-r border-white/5 bg-neutral-900/40 flex flex-col h-screen shrink-0">
        <div className="p-6 border-b border-white/5 bg-black/20">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
            <Stethoscope className="text-rose-500 w-6 h-6" />
            Clinic Roster
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or ID..."
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-rose-500 transition-colors text-sm"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {loading ? (
            <div className="text-center py-10 text-neutral-500 text-sm animate-pulse">Loading roster...</div>
          ) : students.length === 0 ? (
            <div className="text-center py-10 text-neutral-500 text-sm">No students found.</div>
          ) : (
            students.map(s => (
              <button 
                key={s.id}
                onClick={() => selectStudent(s)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-start gap-3 ${
                  selectedStudent?.id === s.id 
                    ? 'border-rose-500/50 bg-rose-950/20' 
                    : 'border-white/5 bg-white/[0.02] hover:bg-white/5 hover:border-white/10'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  s.healthRecord?.allergies || s.healthRecord?.chronicIllness 
                    ? 'bg-amber-500/20 text-amber-500' 
                    : 'bg-neutral-800 text-neutral-400'
                }`}>
                  {s.healthRecord?.allergies ? <ShieldAlert className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white/90 truncate">{s.lastName}, {s.firstName}</div>
                  <div className="text-xs text-neutral-500 mt-1 flex items-center gap-2">
                    <span className="font-mono bg-black/30 px-1.5 py-0.5 rounded">{s.studentId}</span>
                    <span className="truncate">{s.class?.name || 'No Class'}</span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* RIGHT PANEL - Health Profile */}
      <div className="flex-1 h-screen overflow-y-auto bg-neutral-950 relative">
        {!selectedStudent ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-600">
            <HeartPulse className="w-24 h-24 mb-6 opacity-20" />
            <h2 className="text-2xl font-medium text-white/40">Select a Student</h2>
            <p className="mt-2 text-sm">Choose a student from the roster to view their health profile.</p>
          </div>
        ) : recordLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
          </div>
        ) : healthRecord && (
          <div className="max-w-5xl mx-auto p-8 lg:p-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
                  {selectedStudent.lastName}, {selectedStudent.firstName}
                </h1>
                <div className="flex items-center gap-4 text-neutral-400 font-medium">
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                    <User className="w-4 h-4" /> {selectedStudent.gender}
                  </span>
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                    <Clock className="w-4 h-4" /> DOB: {new Date(selectedStudent.dateOfBirth).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setShowVisitModal(true)}
                className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-[0_0_30px_rgba(225,29,72,0.3)] transition-transform active:scale-95"
              >
                <Stethoscope className="w-5 h-5" /> Log Clinic Visit
              </button>
            </div>

            {/* Vitals & Alerts Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-neutral-900 to-black border border-white/10 relative overflow-hidden">
                <div className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-1">Blood Type</div>
                <div className="text-3xl font-extrabold text-rose-500">{healthRecord.bloodGroup || 'UNK'}</div>
                <HeartPulse className="absolute right-[-10px] bottom-[-10px] w-24 h-24 text-white/5" />
              </div>
              <div className="p-6 rounded-2xl bg-gradient-to-br from-neutral-900 to-black border border-white/10">
                <div className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-1">Genotype</div>
                <div className="text-3xl font-extrabold text-indigo-400">{healthRecord.genotype || 'UNK'}</div>
              </div>
              <div className={`p-6 rounded-2xl border ${healthRecord.allergies ? 'bg-amber-950/30 border-amber-500/50' : 'bg-neutral-900 border-white/10'}`}>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-neutral-500 mb-1">
                  {healthRecord.allergies && <AlertTriangle className="w-4 h-4 text-amber-500" />} Allergies
                </div>
                <div className={`text-lg font-medium ${healthRecord.allergies ? 'text-amber-400' : 'text-neutral-400'}`}>
                  {healthRecord.allergies || 'No known allergies'}
                </div>
              </div>
            </div>

            {/* History Tabs / Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Clinic Visits Log */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2 border-b border-white/10 pb-4">
                  <Pill className="text-rose-400 w-5 h-5" /> Visit History
                </h3>
                {healthRecord.clinicVisits.length === 0 ? (
                  <div className="p-8 text-center bg-white/[0.02] rounded-2xl border border-white/5 border-dashed">
                    <p className="text-neutral-500">No visits logged for this student.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {healthRecord.clinicVisits.map((v: any) => (
                      <div key={v.id} className="p-5 rounded-2xl bg-neutral-900/50 border border-white/5 hover:border-white/10 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-semibold text-rose-300">{new Date(v.date).toLocaleString()}</span>
                          {v.sentHome && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              Sent Home
                            </span>
                          )}
                        </div>
                        <div className="text-white font-medium mb-1">"{v.symptoms}"</div>
                        <div className="text-sm text-neutral-400 flex flex-col gap-1 mt-3">
                          {v.diagnosis && <div><span className="text-neutral-600">Dx:</span> {v.diagnosis}</div>}
                          {v.treatment && <div><span className="text-neutral-600">Rx:</span> {v.treatment}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Immunizations */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2 border-b border-white/10 pb-4">
                  <Syringe className="text-emerald-400 w-5 h-5" /> Immunizations
                </h3>
                {healthRecord.immunizations.length === 0 ? (
                  <div className="p-8 text-center bg-white/[0.02] rounded-2xl border border-white/5 border-dashed">
                    <p className="text-neutral-500">No immunization records found.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {healthRecord.immunizations.map((i: any) => (
                      <div key={i.id} className="p-4 flex items-center justify-between rounded-xl bg-neutral-900/50 border border-white/5">
                        <div>
                          <div className="font-semibold text-white/90">{i.vaccineName}</div>
                          <div className="text-xs text-neutral-500 mt-0.5">
                            {i.dateGiven ? new Date(i.dateGiven).toLocaleDateString() : 'No date recorded'}
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                          i.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          'bg-neutral-800 text-neutral-400 border-neutral-700'
                        }`}>
                          {i.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Log Visit Modal */}
      {showVisitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-rose-500/30 p-8 rounded-3xl w-full max-w-lg shadow-[0_0_100px_rgba(225,29,72,0.1)]">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Stethoscope className="text-rose-500" /> New Clinic Visit
            </h2>
            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Presenting Symptoms *</label>
                <textarea 
                  value={symptoms} onChange={e=>setSymptoms(e.target.value)} 
                  placeholder="e.g. Complaining of severe headache and fever..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none focus:border-rose-500 transition-colors h-24 resize-none" 
                />
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Treatment Provided</label>
                <input 
                  value={treatment} onChange={e=>setTreatment(e.target.value)} 
                  placeholder="e.g. Paracetamol 500mg, rest for 30 mins"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none focus:border-rose-500 transition-colors" 
                />
              </div>
              <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/[0.02] cursor-pointer hover:bg-white/5 transition-colors">
                <input type="checkbox" checked={sentHome} onChange={e=>setSentHome(e.target.checked)} className="w-5 h-5 rounded border-white/20 text-rose-500 focus:ring-rose-500/20 bg-black" />
                <div>
                  <div className="font-semibold text-white/90">Sent Home</div>
                  <div className="text-xs text-neutral-500">Student was dismissed early due to medical reasons</div>
                </div>
              </label>
              <div className="flex gap-3 mt-8 pt-4 border-t border-white/10">
                <button onClick={()=>setShowVisitModal(false)} className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors font-semibold text-white/70">Cancel</button>
                <button onClick={handleLogVisit} className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-bold shadow-[0_0_20px_rgba(225,29,72,0.4)] hover:bg-rose-500 hover:scale-105 transition-all active:scale-95 disabled:opacity-50" disabled={!symptoms}>
                  Save Log
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
