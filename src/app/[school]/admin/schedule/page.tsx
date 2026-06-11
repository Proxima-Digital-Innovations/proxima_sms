'use client';

import { useState, useEffect } from 'react';
import { getMasterSchedule, getScheduleResources, assignClassBlock, deleteClassBlock } from '@/actions/schedule-actions';
import { Calendar, Clock, MapPin, Users, BookOpen, AlertCircle, Plus, Trash2, Filter } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00"
];

export default function MasterSchedule() {
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<any>(null);
  const [timetable, setTimetable] = useState<any[]>([]);
  
  // Filters
  const [activeTermId, setActiveTermId] = useState<string>('');
  const [filterClassId, setFilterClassId] = useState<string>('');
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [newBlock, setNewBlock] = useState({
    classId: '', subjectId: '', teacherId: '', roomId: '', dayOfWeek: 1, startTime: '08:00', endTime: '09:00'
  });

  const loadData = async () => {
    setLoading(true);
    const res = await getScheduleResources();
    if (res.success && res.resources) {
      setResources(res.resources);
      const activeTerm = res.resources.activeTerms[0]?.id;
      if (activeTerm) {
        setActiveTermId(activeTerm);
        await fetchSchedule(activeTerm);
      }
      if (res.resources.classes[0]) setFilterClassId(res.resources.classes[0].id);
    }
    setLoading(false);
  };

  const fetchSchedule = async (termId: string) => {
    const res = await getMasterSchedule(termId);
    if (res.success) setTimetable(res.timetable);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAssign = async () => {
    setErrorMsg('');
    const res = await assignClassBlock({
      termId: activeTermId,
      ...newBlock
    });
    if (res.success) {
      setShowModal(false);
      fetchSchedule(activeTermId);
    } else {
      setErrorMsg(res.message || 'Failed to assign block.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this scheduled block?')) {
      await deleteClassBlock(id);
      fetchSchedule(activeTermId);
    }
  };

  // Filter logic
  const filteredBlocks = timetable.filter(t => t.classId === filterClassId);

  const getBlockForSlot = (dayIdx: number, timeStr: string) => {
    return filteredBlocks.find(b => b.dayOfWeek === dayIdx && b.startTime === timeStr);
  };

  if (loading || !resources) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8 font-sans">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900/40 to-neutral-900/40 border border-white/10 p-8 shadow-2xl backdrop-blur-xl flex justify-between items-end">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl opacity-50 pointer-events-none" />
          
          <div className="space-y-2 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2">
              <Calendar className="w-4 h-4" /> Master Engine
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
              Schedule Matrix
            </h1>
            <p className="text-neutral-400 max-w-xl text-lg font-light leading-relaxed">
              Design the school's rhythm. Assign teachers to classes with strict enterprise clash detection.
            </p>
          </div>
          
          <button 
            onClick={() => setShowModal(true)}
            className="relative z-10 flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-bold shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:scale-105 transition-all duration-300"
          >
            <Plus className="w-5 h-5" /> Schedule Block
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex gap-4 items-center bg-black/40 p-4 rounded-2xl border border-white/5">
          <Filter className="text-neutral-500 w-5 h-5" />
          <div className="text-sm font-semibold text-neutral-400">Viewing Schedule For:</div>
          <select 
            value={filterClassId} onChange={(e) => setFilterClassId(e.target.value)}
            className="bg-neutral-900 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500 font-bold"
          >
            {resources.classes.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          
          <div className="ml-auto flex items-center gap-3 text-sm text-neutral-500">
            <div className="w-3 h-3 rounded-full bg-indigo-500/50" /> Block Assigned
            <div className="w-3 h-3 rounded-full bg-neutral-800 border border-white/10 ml-2" /> Free Period
          </div>
        </div>

        {/* The Visual Grid */}
        <div className="bg-neutral-900/40 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl">
          <div className="grid grid-cols-6 border-b border-white/10 bg-black/40">
            <div className="p-4 flex items-center justify-center border-r border-white/10">
              <Clock className="w-5 h-5 text-neutral-500" />
            </div>
            {DAYS.map(day => (
              <div key={day} className="p-4 text-center font-bold text-neutral-300 border-r border-white/10 last:border-0 uppercase tracking-widest text-sm">
                {day}
              </div>
            ))}
          </div>

          <div className="divide-y divide-white/5">
            {TIME_SLOTS.map((timeStr, timeIdx) => {
              // Ensure we dont go out of bounds for EndTime logic
              if (timeIdx === TIME_SLOTS.length - 1) return null; 
              
              return (
                <div key={timeStr} className="grid grid-cols-6 divide-x divide-white/5">
                  {/* Time Label */}
                  <div className="p-4 flex flex-col items-center justify-center bg-black/20 text-neutral-400 font-medium">
                    <span>{timeStr}</span>
                    <span className="text-xs text-neutral-600 opacity-50">to</span>
                    <span>{TIME_SLOTS[timeIdx + 1]}</span>
                  </div>

                  {/* Day Blocks */}
                  {DAYS.map((_, dayIdx) => {
                    const block = getBlockForSlot(dayIdx + 1, timeStr);
                    return (
                      <div key={dayIdx} className="p-2 min-h-[120px] bg-neutral-900/20 hover:bg-neutral-900/60 transition-colors relative group">
                        {block ? (
                          <div className="h-full rounded-xl bg-gradient-to-br from-indigo-600/20 to-indigo-900/20 border border-indigo-500/30 p-3 flex flex-col justify-between">
                            <div>
                              <div className="font-bold text-indigo-300 text-sm flex items-center gap-1.5 mb-1">
                                <BookOpen className="w-3.5 h-3.5" /> {block.subject.name}
                              </div>
                              <div className="text-xs text-neutral-300 flex items-center gap-1.5 font-medium">
                                <Users className="w-3.5 h-3.5" /> {block.teacher?.lastName} {block.teacher?.firstName?.[0]}.
                              </div>
                            </div>
                            <div className="text-[10px] text-neutral-500 flex items-center gap-1 uppercase font-bold tracking-wider mt-2">
                              <MapPin className="w-3 h-3" /> {block.room?.name || 'TBA'}
                            </div>
                            
                            {/* Hover Actions */}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleDelete(block.id)} className="p-1.5 bg-rose-500/20 text-rose-400 hover:bg-rose-500/40 rounded-lg">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full rounded-xl border border-dashed border-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => {
                                setNewBlock(prev => ({ ...prev, dayOfWeek: dayIdx + 1, startTime: timeStr, endTime: TIME_SLOTS[timeIdx + 1] }));
                                setShowModal(true);
                              }}
                              className="text-xs font-bold text-neutral-500 hover:text-indigo-400 uppercase tracking-widest flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> Assign
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Assignment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-indigo-500/30 p-8 rounded-3xl w-full max-w-2xl shadow-[0_0_100px_rgba(99,102,241,0.1)]">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Calendar className="text-indigo-500" /> Assign Schedule Block
            </h2>
            
            {errorMsg && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-xl mb-6 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{errorMsg}</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-6">
              {/* Day & Time (Pre-filled if clicked from grid) */}
              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Day of Week</label>
                <select value={newBlock.dayOfWeek} onChange={e=>setNewBlock({...newBlock, dayOfWeek: parseInt(e.target.value)})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none text-white">
                  {DAYS.map((d, i) => <option key={i} value={i+1}>{d}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Start Time</label>
                  <select value={newBlock.startTime} onChange={e=>setNewBlock({...newBlock, startTime: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none text-white">
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">End Time</label>
                  <select value={newBlock.endTime} onChange={e=>setNewBlock({...newBlock, endTime: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none text-white">
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="col-span-2 border-t border-white/5 pt-4"></div>

              {/* Class & Subject */}
              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Target Class *</label>
                <select value={newBlock.classId} onChange={e=>setNewBlock({...newBlock, classId: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none text-white">
                  <option value="">-- Select Class --</option>
                  {resources.classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Subject *</label>
                <select value={newBlock.subjectId} onChange={e=>setNewBlock({...newBlock, subjectId: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none text-white">
                  <option value="">-- Select Subject --</option>
                  {resources.subjects.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Teacher & Room */}
              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Teacher *</label>
                <select value={newBlock.teacherId} onChange={e=>setNewBlock({...newBlock, teacherId: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none text-white focus:border-indigo-500">
                  <option value="">-- Select Teacher --</option>
                  {resources.teachers.map((c: any) => <option key={c.id} value={c.id}>{c.lastName}, {c.firstName}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Room (Optional)</label>
                <select value={newBlock.roomId} onChange={e=>setNewBlock({...newBlock, roomId: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none text-white">
                  <option value="">-- TBA --</option>
                  {resources.rooms.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-8 pt-4 border-t border-white/10">
              <button onClick={()=>setShowModal(false)} className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors font-semibold text-white/70">Cancel</button>
              <button 
                onClick={handleAssign} 
                disabled={!newBlock.classId || !newBlock.subjectId || !newBlock.teacherId} 
                className="flex-1 py-3 rounded-xl bg-white text-black font-bold shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-105 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Save Schedule Block
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
