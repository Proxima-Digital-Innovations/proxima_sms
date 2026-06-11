'use client';

import { useState, useEffect } from 'react';
import { getParentDashboardData } from '@/actions/parent-actions';
import { ShieldCheck, HeartPulse, ShieldAlert, GraduationCap, Banknote, CalendarDays, Activity, FileText } from 'lucide-react';

export default function ParentDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const res = await getParentDashboardData();
      if (res.success) setData(res);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex justify-center items-center"><div className="w-12 h-12 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" /></div>;
  }

  if (!data || !data.student) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8">
        <ShieldAlert className="w-16 h-16 text-rose-500 mb-4" />
        <h1 className="text-2xl font-bold">No Student Link Found</h1>
        <p className="text-slate-400 mt-2">Your parent account has not been linked to an enrolled student yet.</p>
      </div>
    );
  }

  const { student, activeTerm, grades, attendanceCount, recentIncidents, health, outstandingInvoices } = data;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Navbar / Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/50 p-6 rounded-3xl border border-slate-800 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <span className="text-2xl font-black text-white">{student.firstName[0]}</span>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white">{student.firstName} {student.lastName}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold tracking-wider">{student.studentId}</span>
                <span className="px-3 py-1 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-lg text-xs font-bold tracking-wider">{student.class?.name || 'Unassigned'}</span>
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">Active Term</div>
            <div className="text-lg font-black text-white">{activeTerm ? `${activeTerm.session.year} - ${activeTerm.name}` : 'No Active Term'}</div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Column (Grades & Attendance) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900 border border-emerald-500/20 p-6 rounded-3xl">
                <div className="flex items-center gap-3 mb-4 text-emerald-400">
                  <CalendarDays className="w-5 h-5" />
                  <span className="font-bold text-sm tracking-wider uppercase">Term Attendance</span>
                </div>
                <div className="text-5xl font-black text-white">{attendanceCount}</div>
                <div className="text-emerald-500/60 mt-1 text-sm font-medium">Days Present</div>
              </div>

              <div className="bg-gradient-to-br from-rose-900/40 to-slate-900 border border-rose-500/20 p-6 rounded-3xl">
                <div className="flex items-center gap-3 mb-4 text-rose-400">
                  <Banknote className="w-5 h-5" />
                  <span className="font-bold text-sm tracking-wider uppercase">Unpaid Fees</span>
                </div>
                <div className="text-4xl font-black text-white">
                  ${outstandingInvoices.reduce((sum: number, inv: any) => sum + inv.balance, 0).toLocaleString()}
                </div>
                <div className="text-rose-500/60 mt-2 text-sm font-medium">{outstandingInvoices.length} outstanding invoices</div>
              </div>
            </div>

            {/* Academic Performance */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6">
                <GraduationCap className="w-6 h-6 text-violet-400" />
                <h2 className="text-xl font-bold text-white">Current Term Grades</h2>
              </div>
              
              {grades.length === 0 ? (
                <div className="text-center py-10 bg-slate-800/20 rounded-2xl border border-dashed border-slate-700">
                  <p className="text-slate-500 font-medium">No grades posted for this term yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {grades.map((grade: any) => (
                    <div key={grade.id} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl hover:bg-slate-800/50 transition-colors">
                      <div className="font-bold text-slate-200">{grade.subject.name}</div>
                      <div className="flex items-center gap-6">
                        <div className="text-center hidden sm:block">
                          <div className="text-xs text-slate-500 font-bold uppercase mb-1">CA</div>
                          <div className="font-mono text-slate-300">{(grade.ca1 || 0) + (grade.ca2 || 0)}/40</div>
                        </div>
                        <div className="text-center hidden sm:block">
                          <div className="text-xs text-slate-500 font-bold uppercase mb-1">Exam</div>
                          <div className="font-mono text-slate-300">{grade.exam || 0}/60</div>
                        </div>
                        <div className="text-center w-16">
                          <div className="text-xs text-slate-500 font-bold uppercase mb-1">Total</div>
                          <div className="font-black text-lg text-white">{grade.total || '-'}</div>
                        </div>
                        <div className={`w-12 h-12 flex items-center justify-center rounded-xl font-black text-xl 
                          ${grade.total >= 75 ? 'bg-emerald-500/20 text-emerald-400' : 
                            grade.total >= 60 ? 'bg-blue-500/20 text-blue-400' : 
                            grade.total >= 50 ? 'bg-amber-500/20 text-amber-400' : 
                            'bg-rose-500/20 text-rose-400'}`}>
                          {grade.grade || '-'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Sidebar Column (Health & Discipline) */}
          <div className="space-y-8">
            
            {/* Medical Clinic Feed */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6">
                <HeartPulse className="w-5 h-5 text-rose-400" />
                <h2 className="text-lg font-bold text-white">Clinic Visits</h2>
              </div>
              
              {!health || health.clinicVisits.length === 0 ? (
                 <p className="text-sm text-slate-500 p-4 bg-slate-800/20 rounded-xl">No recent clinic visits.</p>
              ) : (
                <div className="space-y-4">
                  {health.clinicVisits.map((visit: any) => (
                    <div key={visit.id} className="border-l-2 border-rose-500 pl-4 py-1">
                      <div className="text-xs text-slate-500 font-bold mb-1">{new Date(visit.visitDate).toLocaleDateString()}</div>
                      <div className="font-medium text-slate-200">{visit.reason}</div>
                      {visit.actionTaken && <div className="text-sm text-slate-400 mt-1 bg-slate-800/50 p-2 rounded-lg">{visit.actionTaken}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Disciplinary Feed */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-bold text-white">Behavioral Logs</h2>
              </div>
              
              {recentIncidents.length === 0 ? (
                 <p className="text-sm text-emerald-400 p-4 bg-emerald-500/10 rounded-xl font-medium border border-emerald-500/20">Clean behavioral record.</p>
              ) : (
                <div className="space-y-4">
                  {recentIncidents.map((incident: any) => (
                    <div key={incident.id} className="p-4 bg-slate-800/40 rounded-xl border border-slate-700">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-xs text-slate-500 font-bold">{new Date(incident.date).toLocaleDateString()}</div>
                        <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase ${
                          incident.severity === 'HIGH' ? 'bg-rose-500/20 text-rose-400' :
                          incident.severity === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>{incident.severity}</span>
                      </div>
                      <div className="font-bold text-white text-sm mb-1">{incident.category}</div>
                      <p className="text-xs text-slate-400 line-clamp-2">{incident.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
