'use client';

import { useState, useEffect } from 'react';
import { getStudentDashboardData } from '@/actions/student-actions';
import { 
  BookOpen, Calendar, Clock, CreditCard, CheckCircle, 
  ChevronRight, Layout, Star, Zap, User, AlertCircle,
  FileText, TrendingUp, Wallet
} from 'lucide-react';
import Link from 'next/link';

import { motion } from 'framer-motion';

export default function StudentDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await getStudentDashboardData();
        if (res.success) setData(res.data);
      } catch (error) {
        console.error("Failed to load student dashboard", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
        <div className="min-h-screen bg-neutral-950 flex justify-center items-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                <p className="text-neutral-400 font-medium animate-pulse">Loading portal...</p>
            </div>
        </div>
    );
  }

  if (!data) {
      return (
          <div className="min-h-screen bg-neutral-950 flex justify-center items-center text-white">
              <div className="text-center space-y-4">
                  <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
                  <h2 className="text-xl font-bold">Failed to load data</h2>
                  <p className="text-neutral-400">Please refresh the page to try again.</p>
              </div>
          </div>
      )
  }

  const { profile, stats, upcomingAssignments = [], availableQuizzes = [], recentModules = [] } = data;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 md:p-8 font-sans selection:bg-indigo-500/30">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Welcome Section */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-br from-white to-neutral-500 bg-clip-text text-transparent">
                Good Morning, {profile?.firstName || 'Student'}!
            </h1>
            <div className="flex items-center gap-3 text-neutral-500 font-bold text-sm">
               <span className="bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/20">{profile?.class?.name || 'Class'}</span>
               <span>Student ID: {profile?.studentId || 'N/A'}</span>
            </div>
          </div>
          
          <div className="flex gap-4">
             <div className="bg-neutral-900 border border-white/5 p-4 px-6 rounded-2xl flex items-center gap-4 hover:border-emerald-500/30 transition-colors">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-500/30">
                   <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                   <div className="text-[10px] font-black text-neutral-500 uppercase tracking-wider">Attendance</div>
                   <div className="text-xl font-black">{Math.round(stats?.attendanceRate || 0)}%</div>
                </div>
             </div>
             <div className="bg-neutral-900 border border-white/5 p-4 px-6 rounded-2xl flex items-center gap-4 hover:border-rose-500/30 transition-colors">
                <div className="w-10 h-10 bg-rose-500/20 rounded-xl flex items-center justify-center border border-rose-500/30">
                   <Wallet className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                   <div className="text-[10px] font-black text-neutral-500 uppercase tracking-wider">Fees Due</div>
                   <div className="text-xl font-black">${stats?.totalBalance || 0}</div>
                </div>
             </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           
           {/* MAIN FEED (LMS) */}
           <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="lg:col-span-8 space-y-8"
           >
              
              {/* TO-DO LIST */}
              <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-8 shadow-[0_0_60px_rgba(79,70,229,0.2)] relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 transition-transform duration-700 pointer-events-none"><BookOpen className="w-48 h-48" /></div>
                 <div className="relative z-10">
                    <h2 className="text-2xl font-black mb-6 flex items-center gap-3"><Clock className="w-6 h-6" /> Upcoming Tasks</h2>
                    <div className="space-y-3">
                       {upcomingAssignments.map((as: any) => (
                         <Link key={as.id} href="/student/lms/assignments" className="flex items-center justify-between p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all border border-white/5 group/item">
                            <div className="flex items-center gap-4">
                               <div className="p-2 bg-white/10 rounded-lg">
                                 <FileText className="w-5 h-5 opacity-80" />
                               </div>
                               <div>
                                  <div className="font-bold text-white">{as.title}</div>
                                  <div className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Assignment • {as.points} Points</div>
                               </div>
                            </div>
                            <div className="flex items-center gap-3">
                               <div className="text-right">
                                  <div className="text-[10px] font-black uppercase text-indigo-200">Due In</div>
                                  <div className="text-xs font-bold text-white">2 Days</div>
                               </div>
                               <ChevronRight className="w-4 h-4 group-hover/item:translate-x-1 transition-transform" />
                            </div>
                         </Link>
                       ))}

                       {availableQuizzes.map((q: any) => (
                         <Link key={q.id} href="/student/lms/quizzes" className="flex items-center justify-between p-4 bg-amber-500/20 hover:bg-amber-500/30 rounded-2xl transition-all border border-amber-500/20 group/item backdrop-blur-sm">
                            <div className="flex items-center gap-4">
                               <div className="p-2 bg-amber-500/20 rounded-lg">
                                  <Zap className="w-5 h-5 text-amber-400" />
                               </div>
                               <div>
                                  <div className="font-bold text-amber-50">{q.title}</div>
                                  <div className="text-[10px] font-black uppercase tracking-widest text-amber-500/80">Quiz • {q.timeLimit} Min</div>
                               </div>
                            </div>
                            <div className="flex items-center gap-3">
                               <span className="text-xs font-black bg-amber-500 text-black px-3 py-1.5 rounded-lg shadow-sm">START</span>
                               <ChevronRight className="w-4 h-4 text-amber-400 group-hover/item:translate-x-1 transition-transform" />
                            </div>
                         </Link>
                       ))}

                       {upcomingAssignments.length === 0 && availableQuizzes.length === 0 && (
                         <div className="py-12 bg-white/5 rounded-2xl text-center border border-white/10 border-dashed">
                             <CheckCircle className="w-8 h-8 text-indigo-300 mx-auto mb-2 opacity-50" />
                             <p className="opacity-80 font-medium">No pending tasks. You're all caught up!</p>
                         </div>
                       )}
                    </div>
                 </div>
              </div>

              {/* RECENT MODULES */}
              <div className="bg-neutral-900/60 border border-white/5 rounded-3xl p-8 backdrop-blur-xl">
                 <h2 className="text-xl font-bold mb-8 flex items-center gap-3"><Layout className="w-5 h-5 text-indigo-500" /> Recent Learning Modules</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {recentModules.map((mod: any) => (
                      <div key={mod.id} className="p-6 bg-black/40 border border-white/5 rounded-2xl hover:border-indigo-500/30 hover:bg-black/60 transition-all group">
                         <div className="flex justify-between items-start mb-4">
                            <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{mod.subject.name}</div>
                            <span className="text-[10px] font-bold text-neutral-500 bg-white/5 px-2 py-0.5 rounded-full">{mod.content.length} Items</span>
                         </div>
                         <h3 className="font-bold text-lg mb-4 text-neutral-200 group-hover:text-indigo-300 transition-colors">{mod.title}</h3>
                         <button className="text-[10px] font-black text-neutral-500 group-hover:text-white uppercase tracking-widest flex items-center gap-1 transition-colors">
                             Open Module <ChevronRight className="w-3 h-3" />
                         </button>
                      </div>
                    ))}
                    {recentModules.length === 0 && (
                        <div className="col-span-1 md:col-span-2 py-10 text-center opacity-50 text-sm font-medium">
                            No modules accessed recently.
                        </div>
                    )}
                 </div>
              </div>

           </motion.div>

           {/* SIDEBAR (SIS) */}
           <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-4 space-y-8"
           >
              
              {/* ACADEMIC SNAPSHOT */}
              <div className="bg-neutral-900 border border-white/5 rounded-3xl p-6">
                 <h3 className="text-xs font-black text-neutral-500 uppercase tracking-widest mb-6 flex items-center gap-2"><TrendingUp className="w-3 h-3" /> Term Performance</h3>
                 <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors rounded-2xl cursor-pointer">
                       <span className="text-sm font-bold text-neutral-200">Mathematics</span>
                       <span className="text-lg font-black text-emerald-400">A</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors rounded-2xl cursor-pointer">
                       <span className="text-sm font-bold text-neutral-200">Physics</span>
                       <span className="text-lg font-black text-emerald-400">A-</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors rounded-2xl cursor-pointer">
                       <span className="text-sm font-bold text-neutral-200">Literature</span>
                       <span className="text-lg font-black text-amber-400">B+</span>
                    </div>
                 </div>
                 <Link href="/result-checker" className="mt-6 w-full py-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-xl text-[10px] font-black uppercase text-center block transition-colors border border-indigo-500/20">View Detailed Report Card</Link>
              </div>

              {/* ANNOUNCEMENTS */}
              <div className="bg-gradient-to-b from-orange-500/10 to-transparent border border-orange-500/20 rounded-3xl p-6">
                 <h3 className="text-xs font-black text-orange-500 uppercase tracking-widest mb-4 flex items-center gap-2"><AlertCircle className="w-3 h-3" /> School Notices</h3>
                 <div className="space-y-4">
                    <div className="text-sm group cursor-pointer">
                       <div className="font-bold text-orange-200 group-hover:text-orange-400 transition-colors">Inter-House Sports Day</div>
                       <p className="text-orange-500/60 text-xs mt-1 leading-relaxed">Scheduled for next Friday. All students must wear their house colors.</p>
                    </div>
                    <div className="h-px bg-orange-500/10" />
                    <div className="text-sm group cursor-pointer">
                       <div className="font-bold text-orange-200 group-hover:text-orange-400 transition-colors">Library Maintenance</div>
                       <p className="text-orange-500/60 text-xs mt-1 leading-relaxed">Closed for cataloging until Wednesday morning.</p>
                    </div>
                 </div>
              </div>

              {/* QUICK LINKS */}
              <div className="grid grid-cols-2 gap-4">
                 <Link href="/dashboard/timetable" className="p-5 bg-neutral-900 border border-white/5 rounded-2xl hover:border-indigo-500/30 hover:bg-white/5 transition-colors text-center group">
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                        <Calendar className="w-5 h-5 text-indigo-400" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 group-hover:text-neutral-200">Schedule</span>
                 </Link>
                 <Link href="/dashboard/pay" className="p-5 bg-neutral-900 border border-white/5 rounded-2xl hover:border-rose-500/30 hover:bg-white/5 transition-colors text-center group">
                     <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                        <CreditCard className="w-5 h-5 text-rose-400" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 group-hover:text-neutral-200">Bursary</span>
                 </Link>
              </div>

           </motion.div>

        </div>

      </div>
    </div>
  );
}
