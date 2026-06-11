'use client';

import { useState, useEffect } from 'react';
import { getLeaveRequests, updateLeaveStatus, getOrphanedClasses, getAvailableSubstituteTeachers, assignSubstitute, createLeaveRequest } from '@/actions/hr-actions';
import { Users, Calendar, AlertTriangle, CheckCircle, XCircle, ArrowRight, UserPlus, FileText, UserMinus } from 'lucide-react';

export default function HRDashboard() {
  const [loading, setLoading] = useState(true);
  
  // Data
  const [leaves, setLeaves] = useState<any[]>([]);
  const [orphanedClasses, setOrphanedClasses] = useState<any[]>([]);
  const [availableSubs, setAvailableSubs] = useState<any[]>([]);
  
  // State
  const [targetDate, setTargetDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [substituteSelections, setSubstituteSelections] = useState<Record<string, string>>({}); // timetableId -> substituteId

  useEffect(() => {
    fetchData();
  }, [targetDate]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch parallel
    const [leavesRes, orphanedRes, subsRes] = await Promise.all([
      getLeaveRequests(),
      getOrphanedClasses(new Date(targetDate)),
      getAvailableSubstituteTeachers()
    ]);
    
    if (leavesRes.success) setLeaves(leavesRes.leaves);
    if (orphanedRes.success) setOrphanedClasses(orphanedRes.orphanedClasses);
    if (subsRes.success) setAvailableSubs(subsRes.teachers);
    
    setLoading(false);
  };

  const handleUpdateLeaveStatus = async (id: string, status: string) => {
    const res = await updateLeaveStatus(id, status);
    if (res.success) fetchData();
  };

  const handleAssignSubstitute = async (timetableId: string) => {
    const subId = substituteSelections[timetableId];
    if (!subId) return;
    
    const res = await assignSubstitute(timetableId, subId, new Date(targetDate));
    if (res.success) {
      // Clear selection and refresh to show the assignment
      setSubstituteSelections(prev => {
        const next = { ...prev };
        delete next[timetableId];
        return next;
      });
      fetchData();
    }
  };

  // MOCK: Auto-generate a dummy leave request for testing purposes if none exist
  const handleGenerateDummyLeave = async () => {
    // Hardcoded logic to find a teacher and make a leave request to test the UI quickly
    const res = await fetch('/api/dev/generate-dummy-leave', { method: 'POST' }).catch(() => null); // Fallback if API doesn't exist
    // In actual implementation, we'd call an action. For now, this is just a placeholder.
    alert("In a production build, staff would submit this via their portal.");
  };

  if (loading && leaves.length === 0) {
    return <div className="min-h-screen flex justify-center py-20"><div className="w-12 h-12 border-4 border-fuchsia-500/30 border-t-fuchsia-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-900/40 to-neutral-900/40 border border-white/10 p-8 shadow-2xl backdrop-blur-xl">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-fuchsia-500/20 rounded-full blur-3xl opacity-50 pointer-events-none" />
          
          <div className="relative z-10 flex justify-between items-end">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-300 text-xs font-semibold uppercase tracking-wider mb-2">
                <Users className="w-4 h-4" /> HR & Operations
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                Staff Coverage Matrix
              </h1>
              <p className="text-neutral-400 max-w-xl text-lg font-light leading-relaxed">
                Approve staff leave requests and automatically assign substitute coverage for orphaned classes.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* LEAVE REQUESTS */}
          <div className="bg-neutral-900/40 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-3"><FileText className="text-fuchsia-500 w-6 h-6" /> Leave Requests</h2>
              <button onClick={handleGenerateDummyLeave} className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg text-neutral-400 font-bold transition-colors">
                Staff Portal Demo
              </button>
            </div>

            {leaves.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl bg-black/20">
                <CheckCircle className="w-12 h-12 text-emerald-500/50 mx-auto mb-3" />
                <p className="text-neutral-500 font-medium">No pending leave requests.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                {leaves.map(leave => (
                  <div key={leave.id} className="bg-black/40 border border-white/5 rounded-2xl p-5 hover:bg-black/60 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-lg text-white">{leave.user.firstName} {leave.user.lastName}</h3>
                        <div className="text-xs font-bold text-fuchsia-400 uppercase tracking-widest mt-1">{leave.user.role}</div>
                      </div>
                      <span className={`px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider border ${
                        leave.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        leave.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                        'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {leave.status}
                      </span>
                    </div>
                    
                    <div className="flex gap-4 mb-4 text-sm bg-white/5 p-3 rounded-xl border border-white/5">
                      <div>
                        <div className="text-xs text-neutral-500 font-bold uppercase mb-1">Start</div>
                        <div className="font-mono text-neutral-300">{new Date(leave.startDate).toLocaleDateString()}</div>
                      </div>
                      <div className="w-px bg-white/10" />
                      <div>
                        <div className="text-xs text-neutral-500 font-bold uppercase mb-1">End</div>
                        <div className="font-mono text-neutral-300">{new Date(leave.endDate).toLocaleDateString()}</div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-neutral-400 mb-6 border-l-2 border-white/10 pl-3">"{leave.reason}"</p>
                    
                    {leave.status === 'PENDING' && (
                      <div className="flex gap-3">
                        <button onClick={() => handleUpdateLeaveStatus(leave.id, 'APPROVED')} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold rounded-xl border border-emerald-500/20 transition-colors">
                          <CheckCircle className="w-4 h-4" /> Approve
                        </button>
                        <button onClick={() => handleUpdateLeaveStatus(leave.id, 'REJECTED')} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold rounded-xl border border-rose-500/20 transition-colors">
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SUBSTITUTE ASSIGNMENT ENGINE */}
          <div className="bg-neutral-900/40 border border-fuchsia-500/20 rounded-3xl p-6 backdrop-blur-xl flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-fuchsia-500 to-indigo-500" />
            
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-3"><UserMinus className="text-fuchsia-500 w-6 h-6" /> Orphaned Classes</h2>
              <div className="flex items-center gap-2 bg-black/50 border border-white/10 px-3 py-1.5 rounded-xl">
                <Calendar className="w-4 h-4 text-neutral-500" />
                <input 
                  type="date" 
                  value={targetDate} 
                  onChange={e => setTargetDate(e.target.value)}
                  className="bg-transparent text-sm font-bold text-white outline-none"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 border-2 border-fuchsia-500/30 border-t-fuchsia-500 rounded-full animate-spin" /></div>
            ) : orphanedClasses.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12 border border-dashed border-fuchsia-500/20 rounded-2xl bg-fuchsia-500/5">
                <CheckCircle className="w-16 h-16 text-fuchsia-500/30 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-fuchsia-100">All Covered!</h3>
                <p className="text-neutral-400 font-medium max-w-xs mt-2">There are no classes taught by absent teachers on this date.</p>
              </div>
            ) : (
              <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-2">
                {orphanedClasses.map(slot => {
                  const hasSub = slot.substitutes && slot.substitutes.length > 0;
                  const assignedSub = hasSub ? slot.substitutes[0].substituteId : null; // In full implementation, we'd link to the user record
                  
                  return (
                    <div key={slot.id} className={`p-5 rounded-2xl border transition-all ${hasSub ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/30'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-white text-lg">{slot.subject.name}</span>
                          <span className="px-2 py-1 bg-white/10 rounded text-xs font-bold">{slot.class.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-fuchsia-400">{slot.startTime} - {slot.endTime}</div>
                          <div className="text-xs text-neutral-500 font-bold uppercase mt-1">{slot.room?.name || 'TBA'}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 mb-5 text-sm">
                        <div className="text-neutral-500 font-medium flex items-center gap-2">
                          <UserMinus className="w-4 h-4 text-rose-500" />
                          Absent: <span className="text-rose-400 font-bold">{slot.teacher.lastName}</span>
                        </div>
                      </div>

                      {hasSub ? (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                            <CheckCircle className="w-4 h-4" />
                            Substitute Assigned
                          </div>
                          {/* In a real scenario, we would populate the substitute's name here by pulling from the nested relation */}
                        </div>
                      ) : (
                        <div className="flex gap-3">
                          <select 
                            value={substituteSelections[slot.id] || ''}
                            onChange={e => setSubstituteSelections({...substituteSelections, [slot.id]: e.target.value})}
                            className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-fuchsia-500 transition-colors"
                          >
                            <option value="">Select Substitute...</option>
                            {availableSubs.map(sub => (
                              <option key={sub.id} value={sub.id}>{sub.lastName}, {sub.firstName}</option>
                            ))}
                          </select>
                          <button 
                            onClick={() => handleAssignSubstitute(slot.id)}
                            disabled={!substituteSelections[slot.id]}
                            className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-4 py-2 rounded-xl font-bold disabled:opacity-50 transition-colors flex items-center gap-2"
                          >
                            <UserPlus className="w-4 h-4" /> Assign
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
