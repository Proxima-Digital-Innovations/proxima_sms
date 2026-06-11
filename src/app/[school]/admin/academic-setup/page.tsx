'use client';

import { useState, useEffect } from 'react';
import { getAcademicCalendar, createAcademicSession, createTerm, setSessionActive, setTermActive } from '@/actions/academic-term-actions';
import { CalendarDays, ShieldCheck, CheckCircle2, Circle, Clock, Plus, School, BookOpen } from 'lucide-react';

export default function AcademicSetupPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [sessionStart, setSessionStart] = useState('');
  const [sessionEnd, setSessionEnd] = useState('');

  const [showTermModal, setShowTermModal] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [termName, setTermName] = useState('');
  const [termStart, setTermStart] = useState('');
  const [termEnd, setTermEnd] = useState('');

  const loadData = async () => {
    setLoading(true);
    const res = await getAcademicCalendar();
    if (res.success) setSessions(res.sessions);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSession = async () => {
    if(!sessionName || !sessionStart || !sessionEnd) return;
    await createAcademicSession({
      name: sessionName,
      startDate: new Date(sessionStart),
      endDate: new Date(sessionEnd),
      isActive: sessions.length === 0 // Make active if it's the first one
    });
    setShowSessionModal(false);
    loadData();
  };

  const handleCreateTerm = async () => {
    if(!termName || !termStart || !termEnd || !selectedSessionId) return;
    await createTerm({
      name: termName,
      sessionId: selectedSessionId,
      startDate: new Date(termStart),
      endDate: new Date(termEnd),
      isActive: false
    });
    setShowTermModal(false);
    loadData();
  };

  const toggleSession = async (id: string) => {
    await setSessionActive(id);
    loadData();
  };

  const toggleTerm = async (id: string) => {
    await setTermActive(id);
    loadData();
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header section with glassmorphism */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900/40 to-neutral-900/40 border border-white/10 p-8 shadow-2xl backdrop-blur-xl">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl opacity-50 pointer-events-none" />
          
          <div className="flex justify-between items-end relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2">
                <School className="w-4 h-4" /> PowerSchool Parity
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                District Academic Calendar
              </h1>
              <p className="text-neutral-400 max-w-xl text-lg font-light leading-relaxed">
                Establish the foundational timeline for the school. All grades, attendance, and enrollments are strictly anchored to these temporal sessions and terms.
              </p>
            </div>
            
            <button 
              onClick={() => setShowSessionModal(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-semibold shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:scale-105 transition-all duration-300 active:scale-95"
            >
              <Plus className="w-5 h-5" />
              New Academic Year
            </button>
          </div>
        </div>

        {/* Sessions Loop */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl bg-white/5 backdrop-blur-md">
            <CalendarDays className="w-16 h-16 mx-auto text-neutral-600 mb-4" />
            <h3 className="text-xl font-medium text-white">No Academic Sessions</h3>
            <p className="text-neutral-500 mt-2">Initialize your first school year to unlock all features.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sessions.map((session) => (
              <div 
                key={session.id} 
                className={`rounded-2xl border transition-all duration-500 overflow-hidden ${
                  session.isActive 
                    ? 'border-indigo-500/50 bg-indigo-950/10 shadow-[0_0_50px_rgba(99,102,241,0.05)]' 
                    : 'border-white/5 bg-neutral-900/20 opacity-70 hover:opacity-100'
                }`}
              >
                {/* Session Header */}
                <div className="p-6 flex items-center justify-between border-b border-white/5 bg-white/[0.02]">
                  <div className="flex items-center gap-4">
                    <button onClick={() => toggleSession(session.id)} className="group transition-transform active:scale-90">
                      {session.isActive ? (
                        <CheckCircle2 className="w-8 h-8 text-indigo-400 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                      ) : (
                        <Circle className="w-8 h-8 text-neutral-600 group-hover:text-indigo-400/50 transition-colors" />
                      )}
                    </button>
                    <div>
                      <h2 className="text-2xl font-bold flex items-center gap-3">
                        {session.name}
                        {session.isActive && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            Active Session
                          </span>
                        )}
                      </h2>
                      <div className="flex items-center gap-2 text-sm text-neutral-500 mt-1 font-medium">
                        <Clock className="w-4 h-4" />
                        {new Date(session.startDate).toLocaleDateString()} — {new Date(session.endDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => { setSelectedSessionId(session.id); setShowTermModal(true); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Term
                  </button>
                </div>

                {/* Terms Grid */}
                <div className="p-6">
                  {session.terms.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500 text-sm">
                      No terms defined for this session. Add Fall/Spring terms to organize classes.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {session.terms.map((term: any) => (
                        <div 
                          key={term.id}
                          className={`relative group p-5 rounded-xl border transition-all duration-300 ${
                            term.isActive 
                              ? 'border-emerald-500/40 bg-emerald-950/20 shadow-[0_0_30px_rgba(16,185,129,0.05)]' 
                              : 'border-white/5 bg-black/40 hover:border-white/20 hover:bg-white/5'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="p-2 rounded-lg bg-white/5 text-white/70 group-hover:text-white transition-colors">
                              <BookOpen className="w-5 h-5" />
                            </div>
                            <button onClick={() => toggleTerm(term.id)} className="transition-transform active:scale-90">
                              {term.isActive ? (
                                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full border border-emerald-400/20">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
                                </span>
                              ) : (
                                <span className="text-xs font-medium text-neutral-600 hover:text-white transition-colors">Set Active</span>
                              )}
                            </button>
                          </div>
                          <h3 className="text-lg font-semibold text-white/90">{term.name}</h3>
                          <div className="text-xs text-neutral-500 mt-2 font-mono">
                            {new Date(term.startDate).toLocaleDateString()} → {new Date(term.endDate).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals - Simplified for speed */}
      {showSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold mb-6">New Academic Session</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Session Name</label>
                <input value={sessionName} onChange={e=>setSessionName(e.target.value)} placeholder="e.g. 2026/2027" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none focus:border-indigo-500 transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Start Date</label>
                  <input type="date" value={sessionStart} onChange={e=>setSessionStart(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">End Date</label>
                  <input type="date" value={sessionEnd} onChange={e=>setSessionEnd(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]" />
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={()=>setShowSessionModal(false)} className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors font-semibold">Cancel</button>
                <button onClick={handleCreateSession} className="flex-1 py-3 rounded-xl bg-white text-black font-bold hover:scale-105 transition-transform active:scale-95">Create Session</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTermModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold mb-6">Add New Term</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Term Name</label>
                <input value={termName} onChange={e=>setTermName(e.target.value)} placeholder="e.g. First Term, Fall Semester" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none focus:border-indigo-500 transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Start Date</label>
                  <input type="date" value={termStart} onChange={e=>setTermStart(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">End Date</label>
                  <input type="date" value={termEnd} onChange={e=>setTermEnd(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]" />
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={()=>setShowTermModal(false)} className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors font-semibold">Cancel</button>
                <button onClick={handleCreateTerm} className="flex-1 py-3 rounded-xl bg-white text-black font-bold hover:scale-105 transition-transform active:scale-95">Save Term</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
