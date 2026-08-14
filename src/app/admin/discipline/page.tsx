'use client';

import { useState, useEffect } from 'react';
import { getRecentIncidents, logIncident, addIncidentAction, updateIncidentStatus } from '@/actions/discipline-actions';
import { getStudentsForHealthDashboard } from '@/actions/health-actions'; // Reuse this for simple search
import { ShieldAlert, AlertTriangle, AlertOctagon, CheckCircle2, Clock, Search, Plus, User, FileText, Gavel } from 'lucide-react';

export default function DisciplineDashboard() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Log States
  const [showLogModal, setShowLogModal] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('MINOR');
  
  // Action states
  const [actionIncidentId, setActionIncidentId] = useState<string | null>(null);
  const [actionTaken, setActionTaken] = useState('');
  const [actionDetails, setActionDetails] = useState('');

  const loadData = async () => {
    setLoading(true);
    const res = await getRecentIncidents(50);
    if (res.success) setIncidents(res.incidents);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!showLogModal) return;
    const delayDebounceFn = setTimeout(async () => {
      const res = await getStudentsForHealthDashboard(search);
      if (res.success) setStudents(res.students);
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [search, showLogModal]);

  const handleLogIncident = async () => {
    if (!selectedStudent || !title || !description) return;
    await logIncident({
      studentId: selectedStudent.id,
      title,
      description,
      severity
    });
    setShowLogModal(false);
    setSelectedStudent(null);
    setTitle(''); setDescription('');
    loadData();
  };

  const handleAddAction = async () => {
    if (!actionIncidentId || !actionTaken) return;
    await addIncidentAction(actionIncidentId, actionTaken, actionDetails);
    setActionIncidentId(null);
    setActionTaken(''); setActionDetails('');
    loadData();
  };

  const handleCloseIncident = async (id: string) => {
    await updateIncidentStatus(id, 'CLOSED');
    loadData();
  };

  const getSeverityColor = (sev: string) => {
    if (sev === 'CRITICAL') return 'bg-rose-500/10 text-rose-500 border-rose-500/30';
    if (sev === 'MAJOR') return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
    return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
  };

  const getSeverityIcon = (sev: string) => {
    if (sev === 'CRITICAL') return <AlertOctagon className="w-5 h-5" />;
    if (sev === 'MAJOR') return <AlertTriangle className="w-5 h-5" />;
    return <ShieldAlert className="w-5 h-5" />;
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header section with glassmorphism */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-900/40 to-neutral-900/40 border border-white/10 p-8 shadow-2xl backdrop-blur-xl">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-rose-500/20 rounded-full blur-3xl opacity-50 pointer-events-none" />
          
          <div className="flex justify-between items-end relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold uppercase tracking-wider mb-2">
                <Gavel className="w-4 h-4" /> Behavioral Matrix
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                Disciplinary Hub
              </h1>
              <p className="text-neutral-400 max-w-xl text-lg font-light leading-relaxed">
                Log student infractions, issue administrative actions, and track overall campus behavioral compliance in real-time.
              </p>
            </div>
            
            <button 
              onClick={() => setShowLogModal(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-bold shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:scale-105 transition-all duration-300 active:scale-95"
            >
              <Plus className="w-5 h-5" />
              Log New Incident
            </button>
          </div>
        </div>

        {/* Global Incident Log */}
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3 mb-6">
            <Clock className="text-neutral-500 w-6 h-6" /> Recent Incidents
          </h2>
          
          {loading ? (
             <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" /></div>
          ) : incidents.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl bg-white/5 backdrop-blur-md">
              <ShieldAlert className="w-16 h-16 mx-auto text-neutral-600 mb-4 opacity-50" />
              <h3 className="text-xl font-medium text-white">No Active Incidents</h3>
              <p className="text-neutral-500 mt-2">The campus is running smoothly. No infractions logged recently.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {incidents.map((inc) => (
                <div key={inc.id} className="rounded-2xl border border-white/10 bg-neutral-900/50 hover:bg-neutral-900/80 transition-colors overflow-hidden">
                  
                  {/* Incident Header */}
                  <div className="p-6 border-b border-white/5 flex items-start justify-between">
                    <div className="flex gap-4">
                      <div className={`p-4 rounded-2xl flex items-center justify-center shrink-0 border ${getSeverityColor(inc.severity)}`}>
                        {getSeverityIcon(inc.severity)}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-xl font-bold text-white">{inc.title}</h3>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-widest border ${getSeverityColor(inc.severity)}`}>
                            {inc.severity}
                          </span>
                          {inc.status === 'CLOSED' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-widest bg-neutral-800 text-neutral-400 border border-neutral-700">
                              CLOSED
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-neutral-400 flex items-center gap-4 font-medium">
                          <span className="flex items-center gap-1.5"><User className="w-4 h-4" /> {inc.student.lastName}, {inc.student.firstName}</span>
                          <span className="text-neutral-600">•</span>
                          <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {new Date(inc.date).toLocaleString()}</span>
                          <span className="text-neutral-600">•</span>
                          <span>Rep: {inc.reporter.lastName}</span>
                        </div>
                      </div>
                    </div>
                    {inc.status === 'OPEN' && (
                      <button 
                        onClick={() => handleCloseIncident(inc.id)}
                        className="text-sm font-semibold text-neutral-500 hover:text-white flex items-center gap-2 transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg border border-white/5"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Mark Resolved
                      </button>
                    )}
                  </div>

                  {/* Incident Body */}
                  <div className="p-6 flex flex-col md:flex-row gap-8">
                    <div className="flex-1 space-y-4">
                      <div>
                        <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <FileText className="w-4 h-4" /> Description
                        </h4>
                        <p className="text-neutral-300 leading-relaxed bg-black/30 p-4 rounded-xl border border-white/5">{inc.description}</p>
                      </div>
                    </div>
                    
                    {/* Actions Panel */}
                    <div className="w-full md:w-96 bg-black/40 rounded-xl p-5 border border-white/5">
                      <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-2 justify-between">
                        <span>Administrative Actions</span>
                        {inc.status === 'OPEN' && (
                          <button onClick={() => setActionIncidentId(inc.id)} className="text-rose-400 hover:text-rose-300">
                            + Add
                          </button>
                        )}
                      </h4>
                      {inc.actions.length === 0 ? (
                        <div className="text-sm text-neutral-500 italic text-center py-4">No actions taken yet.</div>
                      ) : (
                        <div className="space-y-3">
                          {inc.actions.map((act: any) => (
                            <div key={act.id} className="bg-neutral-900 border border-white/10 p-3 rounded-lg">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-rose-300 text-sm">{act.actionTaken}</span>
                                <span className="text-xs text-neutral-600">{new Date(act.date).toLocaleDateString()}</span>
                              </div>
                              {act.details && <p className="text-xs text-neutral-400">{act.details}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Log Incident Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-rose-500/30 p-8 rounded-3xl w-full max-w-2xl shadow-[0_0_100px_rgba(225,29,72,0.1)] flex flex-col max-h-[90vh]">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 shrink-0">
              <AlertTriangle className="text-rose-500" /> Log Behavioral Incident
            </h2>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-2">
              {/* Student Search */}
              {!selectedStudent ? (
                <div>
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Select Student</label>
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <input 
                      value={search} onChange={e=>setSearch(e.target.value)} 
                      placeholder="Search by name..."
                      className="w-full bg-black/50 border border-white/10 rounded-xl pl-11 pr-4 py-4 outline-none focus:border-rose-500 transition-colors text-lg" 
                    />
                  </div>
                  {search.length > 1 && (
                    <div className="mt-3 bg-black/40 border border-white/5 rounded-xl overflow-hidden">
                      {students.map(s => (
                        <button key={s.id} onClick={() => setSelectedStudent(s)} className="w-full text-left p-3 hover:bg-white/10 border-b border-white/5 last:border-0 flex justify-between items-center">
                          <span className="font-semibold text-white">{s.lastName}, {s.firstName}</span>
                          <span className="text-xs text-neutral-500">{s.class?.name || 'No Class'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex justify-between items-center">
                  <div>
                    <div className="text-xs font-bold text-emerald-500 uppercase">Selected Student</div>
                    <div className="font-bold text-lg">{selectedStudent.lastName}, {selectedStudent.firstName}</div>
                  </div>
                  <button onClick={() => setSelectedStudent(null)} className="text-sm font-semibold text-neutral-400 hover:text-white">Change</button>
                </div>
              )}

              {/* Form Fields */}
              {selectedStudent && (
                <>
                  <div>
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Severity</label>
                    <div className="grid grid-cols-3 gap-3 mt-2">
                      {['MINOR', 'MAJOR', 'CRITICAL'].map(s => (
                        <button 
                          key={s} onClick={() => setSeverity(s)}
                          className={`py-3 rounded-xl border font-bold text-sm transition-all ${
                            severity === s 
                              ? getSeverityColor(s) + ' shadow-lg scale-[1.02]' 
                              : 'bg-black/50 border-white/10 text-neutral-500 hover:bg-white/5'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Incident Title *</label>
                    <input 
                      value={title} onChange={e=>setTitle(e.target.value)} 
                      placeholder="e.g. Insubordination, Dress Code Violation"
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none focus:border-rose-500 transition-colors" 
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Detailed Description *</label>
                    <textarea 
                      value={description} onChange={e=>setDescription(e.target.value)} 
                      placeholder="What exactly happened? Who was involved?"
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none focus:border-rose-500 transition-colors h-32 resize-none" 
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-white/10 shrink-0">
              <button onClick={()=>setShowLogModal(false)} className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors font-semibold text-white/70">Cancel</button>
              <button onClick={handleLogIncident} disabled={!selectedStudent || !title || !description} className="flex-1 py-3 rounded-xl bg-white text-black font-bold shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-105 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100">
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {actionIncidentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
           <div className="bg-neutral-900 border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-6">Issue Admin Action</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Action Taken *</label>
                <input 
                  value={actionTaken} onChange={e=>setActionTaken(e.target.value)} 
                  placeholder="e.g. 1-Day Suspension, Parent Meeting"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none focus:border-rose-500 transition-colors" 
                />
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Additional Details</label>
                <textarea 
                  value={actionDetails} onChange={e=>setActionDetails(e.target.value)} 
                  placeholder="Any further notes..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none focus:border-rose-500 transition-colors h-24 resize-none" 
                />
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={()=>setActionIncidentId(null)} className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors font-semibold">Cancel</button>
                <button onClick={handleAddAction} disabled={!actionTaken} className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-bold hover:scale-105 transition-transform active:scale-95 disabled:opacity-50">Issue Action</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
