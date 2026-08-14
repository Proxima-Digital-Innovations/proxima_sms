'use client';

import { useState, useEffect } from 'react';
import { getParentDashboardData } from '@/actions/parent-actions';
import { ShieldCheck, HeartPulse, ShieldAlert, GraduationCap, Banknote, CalendarDays, Activity, FileText } from 'lucide-react';

import { motion } from 'framer-motion';

export default function ParentDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await getParentDashboardData();
        if (res.success) setData(res);
      } catch (error) {
        console.error("Failed to load parent dashboard", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
        <div className="min-h-screen bg-slate-950 flex justify-center items-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                <p className="text-slate-400 font-medium animate-pulse">Loading portal...</p>
            </div>
        </div>
    );
  }

  if (!data || !data.student) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8">
        <ShieldAlert className="w-16 h-16 text-rose-500 mb-4" />
        <h1 className="text-2xl font-bold">No Student Link Found</h1>
        <p className="text-slate-400 mt-2">Your parent account has not been linked to an enrolled student yet.</p>
        <button className="mt-6 px-6 py-2 bg-slate-800 hover:bg-slate-700 transition-colors rounded-lg font-medium text-sm">Contact Administration</button>
      </div>
    );
  }

  const { student, activeTerm, grades = [], attendanceCount = 0, recentIncidents = [], health, outstandingInvoices = [] } = data;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 md:p-8 selection:bg-violet-500/30">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Navbar / Header */}
        <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-6 rounded-3xl border border-slate-800 backdrop-blur-xl shadow-xl shadow-black/20"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <span className="text-2xl font-black text-white">{student.firstName?.[0] || 'S'}</span>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">{student.firstName} {student.lastName}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold tracking-wider">{student.studentId}</span>
                <span className="px-3 py-1 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-lg text-xs font-bold tracking-wider">{student.class?.name || 'Unassigned'}</span>
              </div>
            </div>
          </div>
          
          <div className="text-left md:text-right bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Active Term</div>
            <div className="text-lg font-black text-white">{activeTerm ? `${activeTerm.session?.year || ''} - ${activeTerm.name}` : 'No Active Term'}</div>
          </div>
        </motion.div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Column (Grades & Attendance) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 space-y-8"
          >
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900 border border-emerald-500/20 p-6 rounded-3xl group hover:border-emerald-500/40 transition-colors">
                <div className="flex items-center gap-3 mb-4 text-emerald-400">
                  <div className="p-2 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 transition-colors"><CalendarDays className="w-5 h-5" /></div>
                  <span className="font-bold text-xs tracking-widest uppercase">Term Attendance</span>
                </div>
                <div className="text-5xl font-black text-white">{attendanceCount}</div>
                <div className="text-emerald-500/60 mt-1 text-sm font-medium">Days Present</div>
              </div>

              <div className="bg-gradient-to-br from-rose-900/40 to-slate-900 border border-rose-500/20 p-6 rounded-3xl group hover:border-rose-500/40 transition-colors">
                <div className="flex items-center gap-3 mb-4 text-rose-400">
                  <div className="p-2 bg-rose-500/10 rounded-lg group-hover:bg-rose-500/20 transition-colors"><Banknote className="w-5 h-5" /></div>
                  <span className="font-bold text-xs tracking-widest uppercase">Unpaid Fees</span>
                </div>
                <div className="text-4xl font-black text-white">
                  ${outstandingInvoices.reduce((sum: number, inv: any) => sum + inv.balance, 0).toLocaleString()}
                </div>
                <div className="text-rose-500/60 mt-2 text-sm font-medium">{outstandingInvoices.length} outstanding invoices</div>
              </div>
            </div>

            {/* Academic Performance */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-500/20 rounded-xl"><GraduationCap className="w-6 h-6 text-violet-400" /></div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Current Term Grades</h2>
                  </div>
                  <button className="text-[10px] font-black uppercase tracking-widest text-violet-400 hover:text-violet-300 transition-colors">View All</button>
              </div>
              
              {grades.length === 0 ? (
                <div className="text-center py-12 bg-slate-800/20 rounded-2xl border border-dashed border-slate-700/50">
                  <FileText className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 font-medium">No grades posted for this term yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {grades.map((grade: any) => (
                    <div key={grade.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-800/30 rounded-2xl hover:bg-slate-800/60 transition-all border border-transparent hover:border-slate-700/50 group">
                      <div className="font-bold text-slate-200 mb-4 sm:mb-0 group-hover:text-white transition-colors">{grade.subject.name}</div>
                      <div className="flex items-center justify-between sm:justify-end gap-4 md:gap-8 w-full sm:w-auto">
                        <div className="text-center">
                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">CA</div>
                          <div className="font-mono text-sm text-slate-300">{(grade.ca1 || 0) + (grade.ca2 || 0)}<span className="text-slate-600">/40</span></div>
                        </div>
                        <div className="text-center">
                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Exam</div>
                          <div className="font-mono text-sm text-slate-300">{grade.exam || 0}<span className="text-slate-600">/60</span></div>
                        </div>
                        <div className="text-center w-16">
                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Total</div>
                          <div className="font-black text-lg text-white">{grade.total || '-'}</div>
                        </div>
                        <div className={`w-12 h-12 flex items-center justify-center rounded-xl font-black text-xl shadow-inner
                          ${grade.total >= 75 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 
                            grade.total >= 60 ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' : 
                            grade.total >= 50 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' : 
                            'bg-rose-500/20 text-rose-400 border border-rose-500/20'}`}>
                          {grade.grade || '-'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </motion.div>

          {/* Sidebar Column (Health & Discipline) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-8"
          >
            
            {/* Medical Clinic Feed */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-rose-500/10 rounded-xl"><HeartPulse className="w-5 h-5 text-rose-400" /></div>
                <h2 className="text-lg font-bold text-white tracking-tight">Clinic Visits</h2>
              </div>
              
              {!health || health.clinicVisits.length === 0 ? (
                 <p className="text-sm text-slate-400 p-4 bg-slate-800/30 rounded-xl border border-slate-800 border-dashed text-center">No recent clinic visits.</p>
              ) : (
                <div className="space-y-4">
                  {health.clinicVisits.map((visit: any) => (
                    <div key={visit.id} className="relative pl-6 py-2">
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-rose-500/20 rounded-full">
                          <div className="absolute top-2 -left-1.5 w-3.5 h-3.5 rounded-full bg-rose-500 border-4 border-slate-900" />
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">{new Date(visit.visitDate).toLocaleDateString()}</div>
                      <div className="font-medium text-slate-200">{visit.reason}</div>
                      {visit.actionTaken && <div className="text-xs text-slate-400 mt-2 bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">{visit.actionTaken}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Disciplinary Feed */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-amber-500/10 rounded-xl"><ShieldCheck className="w-5 h-5 text-amber-400" /></div>
                <h2 className="text-lg font-bold text-white tracking-tight">Behavioral Logs</h2>
              </div>
              
              {recentIncidents.length === 0 ? (
                 <div className="flex items-center gap-3 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                     <ShieldCheck className="w-5 h-5 text-emerald-400" />
                     <p className="text-sm text-emerald-400 font-medium">Clean behavioral record.</p>
                 </div>
              ) : (
                <div className="space-y-4">
                  {recentIncidents.map((incident: any) => (
                    <div key={incident.id} className="p-5 bg-slate-800/40 rounded-xl border border-slate-700/80 hover:bg-slate-800/60 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{new Date(incident.date).toLocaleDateString()}</div>
                        <span className={`text-[10px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wider ${
                          incident.severity === 'HIGH' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20' :
                          incident.severity === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' :
                          'bg-blue-500/20 text-blue-400 border border-blue-500/20'
                        }`}>{incident.severity}</span>
                      </div>
                      <div className="font-bold text-white text-sm mb-1.5">{incident.category}</div>
                      <p className="text-sm text-slate-400 leading-relaxed">{incident.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </motion.div>
        </div>

      </div>
    </div>
  );
}
