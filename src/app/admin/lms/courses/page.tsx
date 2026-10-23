'use client';

import { useState, useEffect } from 'react';
import { getLmsCourses, createLmsModule, addLmsContent, deleteLmsModule } from '@/actions/lms-content-actions';
import { getScheduleResources } from '@/actions/schedule-actions'; // Reuse resources fetcher
import { 
  BookOpen, Plus, MoreVertical, FileText, Link as LinkIcon, 
  Video, Eye, LayoutGrid, List, ChevronRight, ChevronDown, 
  Trash2, GripVertical, CheckCircle2, CloudUpload
} from 'lucide-react';

export default function LmsCourseBuilder() {
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<any[]>([]);
  const [resources, setResources] = useState<any>(null);
  
  // Selection State
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  
  // UI State
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadResources() {
      const res = await getScheduleResources();
      if (res.success) {
        setResources(res.resources);
        // Default to first subject/class if available
        if (res.resources?.subjects && res.resources.subjects.length > 0) setSelectedSubject(res.resources.subjects[0].id);
        if (res.resources?.classes && res.resources.classes.length > 0) setSelectedClass(res.resources.classes[0].id);
      }
      setLoading(false);
    }
    loadResources();
  }, []);

  useEffect(() => {
    if (selectedSubject && selectedClass) {
      fetchModules();
    }
  }, [selectedSubject, selectedClass]);

  const fetchModules = async () => {
    const res = await getLmsCourses(selectedSubject, selectedClass);
    if (res.success) setModules(res.modules);
  };

  const handleAddModule = async () => {
    if (!newModuleTitle) return;
    const res = await createLmsModule(newModuleTitle, selectedSubject, selectedClass, modules.length);
    if (res.success) {
      setNewModuleTitle('');
      setIsAddingModule(false);
      fetchModules();
    }
  };

  const handleAddContent = async (moduleId: string, type: string) => {
    const title = prompt(`Enter ${type} title:`);
    if (!title) return;
    
    let url = '';
    if (type !== 'PAGE') {
      url = prompt(`Enter ${type} URL:`) || '';
    }
    
    const res = await addLmsContent(moduleId, title, type, url, type === 'PAGE' ? 'Initial content...' : '');
    if (res.success) fetchModules();
  };

  const handleDeleteModule = async (id: string) => {
    if (confirm("Delete this module and all its content?")) {
      const res = await deleteLmsModule(id);
      if (res.success) fetchModules();
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedModules(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return <div className="min-h-screen bg-neutral-950 flex justify-center items-center"><div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <BookOpen className="w-4 h-4" /> LMS Course Builder
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight">Academic Modules</h1>
            <p className="text-neutral-500 mt-1">Organize learning materials and course flows.</p>
          </div>

          <div className="flex items-center gap-4 bg-neutral-900/50 p-2 rounded-2xl border border-white/5 backdrop-blur-xl">
            <select 
              value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}
              className="bg-transparent text-sm font-bold px-4 py-2 outline-none border-r border-white/10"
            >
              {resources?.subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select 
              value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
              className="bg-transparent text-sm font-bold px-4 py-2 outline-none"
            >
              {resources?.classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex justify-between items-center bg-indigo-600 rounded-2xl p-4 shadow-[0_0_50px_rgba(79,70,229,0.2)]">
          <div className="flex items-center gap-4 text-white font-bold">
            <LayoutGrid className="w-5 h-5 opacity-50" />
            <span>{modules.length} Modules Total</span>
          </div>
          <button 
            onClick={() => setIsAddingModule(true)}
            className="flex items-center gap-2 px-6 py-2 bg-white text-indigo-600 rounded-xl font-black text-sm hover:scale-105 transition-transform"
          >
            <Plus className="w-4 h-4" /> Add Module
          </button>
        </div>

        {/* Modules List */}
        <div className="space-y-6">
          {isAddingModule && (
            <div className="bg-neutral-900 border border-indigo-500/50 rounded-2xl p-6 animate-in fade-in slide-in-from-top-4">
              <h3 className="font-bold mb-4">New Module Name</h3>
              <div className="flex gap-4">
                <input 
                  autoFocus
                  value={newModuleTitle} onChange={e => setNewModuleTitle(e.target.value)}
                  placeholder="e.g. Introduction to Calculus"
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-colors"
                  onKeyDown={e => e.key === 'Enter' && handleAddModule()}
                />
                <button onClick={handleAddModule} className="bg-indigo-500 px-6 py-3 rounded-xl font-bold">Create</button>
                <button onClick={() => setIsAddingModule(false)} className="px-6 py-3 text-neutral-500 font-bold">Cancel</button>
              </div>
            </div>
          )}

          {modules.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl opacity-30">
              <BookOpen className="w-16 h-16 mx-auto mb-4" />
              <p className="text-xl font-medium">No modules created yet for this course.</p>
            </div>
          ) : (
            modules.map((mod, idx) => (
              <div key={mod.id} className="group bg-neutral-900/40 border border-white/5 rounded-2xl overflow-hidden hover:border-indigo-500/30 transition-all">
                {/* Module Header */}
                <div className="flex items-center justify-between p-4 bg-white/5 group-hover:bg-indigo-500/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <GripVertical className="w-4 h-4 text-neutral-700 cursor-grab" />
                    <button onClick={() => toggleExpand(mod.id)} className="flex items-center gap-3">
                      {expandedModules[mod.id] ? <ChevronDown className="w-5 h-5 text-indigo-400" /> : <ChevronRight className="w-5 h-5 text-neutral-500" />}
                      <span className="font-bold text-lg">{mod.title}</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleAddContent(mod.id, 'FILE')}
                      className="p-2 text-neutral-500 hover:text-indigo-400 transition-colors" title="Add File"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteModule(mod.id)}
                      className="p-2 text-neutral-500 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Module Content */}
                {expandedModules[mod.id] && (
                  <div className="p-2 space-y-1 bg-black/20">
                    {mod.content.length === 0 ? (
                      <div className="py-8 text-center text-xs text-neutral-600 font-bold uppercase tracking-widest">Empty Module</div>
                    ) : (
                      mod.content.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between p-3 px-6 hover:bg-white/5 rounded-xl group/item transition-colors">
                          <div className="flex items-center gap-4">
                            {item.type === 'FILE' && <FileText className="w-4 h-4 text-blue-400" />}
                            {item.type === 'LINK' && <LinkIcon className="w-4 h-4 text-emerald-400" />}
                            {item.type === 'VIDEO' && <Video className="w-4 h-4 text-rose-400" />}
                            {item.type === 'PAGE' && <LayoutGrid className="w-4 h-4 text-amber-400" />}
                            <span className="text-sm font-medium text-neutral-300">{item.title}</span>
                          </div>
                          <div className="flex items-center gap-4 opacity-0 group-item-hover:opacity-100 transition-opacity">
                            <span className="text-[10px] font-black text-neutral-600 uppercase tracking-tighter">{item.type}</span>
                            <button className="text-neutral-500 hover:text-white"><Eye className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ))
                    )}
                    
                    {/* Inline Quick Actions */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2 pt-4 border-t border-white/5">
                      <button onClick={() => handleAddContent(mod.id, 'PAGE')} className="flex items-center justify-center gap-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase text-neutral-400 transition-colors">
                        <Plus className="w-3 h-3" /> Page
                      </button>
                      <button onClick={() => handleAddContent(mod.id, 'FILE')} className="flex items-center justify-center gap-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase text-neutral-400 transition-colors">
                        <CloudUpload className="w-3 h-3" /> File
                      </button>
                      <button onClick={() => handleAddContent(mod.id, 'LINK')} className="flex items-center justify-center gap-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase text-neutral-400 transition-colors">
                        <LinkIcon className="w-3 h-3" /> Link
                      </button>
                      <button onClick={() => handleAddContent(mod.id, 'VIDEO')} className="flex items-center justify-center gap-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase text-neutral-400 transition-colors">
                        <Video className="w-3 h-3" /> Video
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
