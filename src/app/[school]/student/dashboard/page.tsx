'use client';

import { useState, useEffect } from 'react';
import { getStudentDashboardData } from '@/actions/student-actions';
import { 
  BookOpen, Calendar, Clock, CreditCard, CheckCircle, 
  ChevronRight, Layout, Star, Zap, User, AlertCircle,
  FileText, TrendingUp, Wallet
} from 'lucide-react';
import Link from 'next/link';

export default function StudentDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function load() {
      // MOCK studentId
      const res = await getStudentDashboardData("mock-student-id");
      if (res.success) setData(res.data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-neutral-950 flex justify-center items-center"><div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" /></div>;
  }

  const { profile, stats, upcomingAssignments, availableQuizzes, recentModules } = data;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-5xl font-black tracking-tight">Good Morning, {profile.firstName}!</h1>
            <div className="flex items-center gap-3 text-neutral-500 font-bold text-sm">
               <span className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20">{profile.class.name}</span>
               <span>Student ID: {profile.studentId}</span>
            </div>
          </div>
          
          <div className="flex gap-4">
             <div className="bg-neutral-900 border border-white/5 p-4 px-6 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-500/30">
                   <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                   <div className="text-[10px] font-black text-neutral-500 uppercase">Attendance</div>
                   <div className="text-xl font-black">{Math.round(stats.attendanceRate)}%</div>
                </div>
             </div>
             <div className="bg-neutral-900 border border-white/5 p-4 px-6 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 bg-rose-500/20 rounded-xl flex items-center justify-center border border-rose-500/30">
                   <Wallet className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                   <div className="text-[10px] font-black text-neutral-500 uppercase">Fees Due</div>
                   <div className="text-xl font-black">${stats.totalBalance}</div>
                </div>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           
           {/* MAIN FEED (LMS) */}
           <div className="lg:col-span-8 space-y-8">
              
              {/* TO-DO LIST */}
              <div className="bg-indigo-600 rounded-3xl p-8 shadow-[0_0_60px_rgba(79,70,229,0.3)] relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-8 opacity-20"><BookOpen className="w-32 h-32" /></div>
                 <div className="relative z-10">
                    <h2 className="text-2xl font-black mb-6 flex items-center gap-3"><Clock className="w-6 h-6" /> Upcoming Tasks</h2>
                    <div className="space-y-3">
                       {upcomingAssignments.map((as: any) => (
                         <Link key={as.id} href="/student/lms/assignments" className="flex items-center justify-between p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all border border-white/5 group">
                            <div className="flex items-center gap-4">
                               <FileText className="w-5 h-5 opacity-50" />
                               <div>
                                  <div className="font-bold">{as.title}</div>
                                  <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Assignment • {as.points} Points</div>
                               </div>
                            </div>
                            <div className="flex items-center gap-3">
                               <div className="text-right">
                                  <div className="text-[10px] font-black uppercase opacity-60">Due In</div>
                                  <div className="text-xs font-bold">2 Days</div>
                               </div>
                               <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                         </Link>
                       ))}

                       {availableQuizzes.map((q: any) => (
                         <Link key={q.id} href="/student/lms/quizzes" className="flex items-center justify-between p-4 bg-amber-500/20 hover:bg-amber-500/30 rounded-2xl transition-all border border-amber-500/20 group">
                            <div className="flex items-center gap-4">
                               <Zap className="w-5 h-5 text-amber-400" />
                               <div>
                                  <div className="font-bold text-amber-100">{q.title}</div>
                                  <div className="text-[10px] font-black uppercase tracking-widest text-amber-500/60">Quiz • {q.timeLimit} Min</div>
                               </div>
                            </div>
                            <div className="flex items-center gap-3">
                               <span className="text-xs font-black bg-amber-500 text-black px-2 py-1 rounded">START</span>
                               <ChevronRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
                            </div>
                         </Link>
                       ))}

                       {upcomingAssignments.length === 0 && availableQuizzes.length === 0 && (
                         <div className="py-10 text-center opacity-60 italic">No pending tasks. You're all caught up!</div>
                       )}
                    </div>
                 </div>
              </div>

              {/* RECENT MODULES */}
              <div className="bg-neutral-900/40 border border-white/5 rounded-3xl p-8 backdrop-blur-xl">
                 <h2 className="text-xl font-bold mb-8 flex items-center gap-3"><Layout className="w-5 h-5 text-indigo-500" /> Recent Learning Modules</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {recentModules.map((mod: any) => (
                      <div key={mod.id} className="p-6 bg-black/40 border border-white/5 rounded-2xl hover:border-indigo-500/30 transition-colors group">
                         <div className="flex justify-between items-start mb-4">
                            <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{mod.subject.name}</div>
                            <span className="text-[10px] font-bold text-neutral-600">{mod.content.length} Items</span>
                         </div>
                         <h3 className="font-bold text-lg mb-4 group-hover:text-indigo-400 transition-colors">{mod.title}</h3>
                         <button className="text-[10px] font-black text-neutral-500 hover:text-white uppercase tracking-widest flex items-center gap-1">Open Module <ChevronRight className="w-3 h-3" /></button>
                      </div>
                    ))}
                 </div>
              </div>

           </div>

           {/* SIDEBAR (SIS) */}
           <div className="lg:col-span-4 space-y-8">
              
              {/* ACADEMIC SNAPSHOT */}
              <div className="bg-neutral-900 border border-white/5 rounded-3xl p-6">
                 <h3 className="text-xs font-black text-neutral-500 uppercase tracking-widest mb-6 flex items-center gap-2"><TrendingUp className="w-3 h-3" /> Term Performance</h3>
                 <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                       <span className="text-sm font-bold">Mathematics</span>
                       <span className="text-lg font-black text-emerald-400">A</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                       <span className="text-sm font-bold">Physics</span>
                       <span className="text-lg font-black text-emerald-400">A-</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                       <span className="text-sm font-bold">Literature</span>
                       <span className="text-lg font-black text-amber-400">B+</span>
                    </div>
                 </div>
                 <Link href="/student/grading" className="mt-6 w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase text-center block transition-colors">View Detailed Report Card</Link>
              </div>

              {/* ANNOUNCEMENTS */}
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-3xl p-6">
                 <h3 className="text-xs font-black text-orange-500 uppercase tracking-widest mb-4 flex items-center gap-2"><AlertCircle className="w-3 h-3" /> School Notices</h3>
                 <div className="space-y-4">
                    <div className="text-sm">
                       <div className="font-bold text-orange-200">Inter-House Sports Day</div>
                       <p className="text-orange-500/60 text-xs mt-1">Scheduled for next Friday. All students must wear their house colors.</p>
                    </div>
                    <div className="h-px bg-orange-500/10" />
                    <div className="text-sm">
                       <div className="font-bold text-orange-200">Library Maintenance</div>
                       <p className="text-orange-500/60 text-xs mt-1">Closed for cataloging until Wednesday morning.</p>
                    </div>
                 </div>
              </div>

              {/* QUICK LINKS */}
              <div className="grid grid-cols-2 gap-4">
                 <Link href="/student/schedule" className="p-4 bg-neutral-900 border border-white/5 rounded-2xl hover:bg-white/5 transition-colors text-center">
                    <Calendar className="w-6 h-6 mx-auto mb-2 text-indigo-400" />
                    <span className="text-[10px] font-black uppercase">Schedule</span>
                 </Link>
                 <Link href="/student/finance" className="p-4 bg-neutral-900 border border-white/5 rounded-2xl hover:bg-white/5 transition-colors text-center">
                    <CreditCard className="w-6 h-6 mx-auto mb-2 text-rose-400" />
                    <span className="text-[10px] font-black uppercase">Bursary</span>
                 </Link>
              </div>

           </div>

        </div>

      </div>
    </div>
  );
}
