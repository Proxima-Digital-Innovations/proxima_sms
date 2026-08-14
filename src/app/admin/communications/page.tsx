'use client';

import { useState, useEffect } from 'react';
import { getMessageHistory, sendMassMessage } from '@/actions/communication-actions';
import { getScheduleResources } from '@/actions/schedule-actions'; // For class selection
import { Send, History, Users, Megaphone, Mail, MessageSquare, ShieldAlert, CheckCircle, Search } from 'lucide-react';

export default function CommunicationsDashboard() {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [resources, setResources] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  
  // Form State
  const [audience, setAudience] = useState('ALL_PARENTS');
  const [targetClassId, setTargetClassId] = useState('');
  const [channel, setChannel] = useState('BOTH');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const [res, hist] = await Promise.all([
        getScheduleResources(),
        getMessageHistory()
      ]);
      if (res.success) setResources(res.resources);
      if (hist.success) setHistory(hist.history);
      setLoading(false);
    }
    load();
  }, []);

  const handleSend = async () => {
    if (!subject || !body) return;
    setSending(true);
    setError('');
    
    const res = await sendMassMessage(audience, channel, subject, body, audience === 'CLASS_SPECIFIC' ? targetClassId : undefined);
    
    if (res.success) {
      setSuccess(true);
      setSubject('');
      setBody('');
      // Refresh history
      const hist = await getMessageHistory();
      if (hist.success) setHistory(hist.history);
      setTimeout(() => setSuccess(false), 5000);
    } else {
      setError(res.message);
    }
    setSending(false);
  };

  if (loading) {
    return <div className="min-h-screen bg-neutral-950 flex justify-center items-center"><div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-900/40 to-neutral-900/40 border border-white/10 p-8 shadow-2xl backdrop-blur-xl">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl opacity-50 pointer-events-none" />
          
          <div className="relative z-10 flex justify-between items-end">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-300 text-xs font-semibold uppercase tracking-wider mb-2">
                <Megaphone className="w-4 h-4" /> Outreach Hub
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                District Communications
              </h1>
              <p className="text-neutral-400 max-w-xl text-lg font-light leading-relaxed">
                Instantly broadcast mass alerts, newsletters, and reminders to parents and staff.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* COMPOSER */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-neutral-900/40 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-3"><Send className="text-orange-500 w-6 h-6" /> Create Broadcast</h2>
              
              {success && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-2xl mb-6 flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                  <CheckCircle className="w-5 h-5" /> Broadcast sent successfully!
                </div>
              )}

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-2xl mb-6 flex items-center gap-3">
                  <ShieldAlert className="w-5 h-5" /> {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="text-xs font-bold text-neutral-500 uppercase mb-2 block">Target Audience</label>
                  <select 
                    value={audience} onChange={e => setAudience(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-orange-500 transition-colors"
                  >
                    <option value="ALL_PARENTS">All Parents</option>
                    <option value="ALL_TEACHERS">All Teachers</option>
                    <option value="CLASS_SPECIFIC">Specific Class</option>
                  </select>
                </div>
                
                {audience === 'CLASS_SPECIFIC' && (
                  <div>
                    <label className="text-xs font-bold text-neutral-500 uppercase mb-2 block">Select Class</label>
                    <select 
                      value={targetClassId} onChange={e => setTargetClassId(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-orange-500 transition-colors"
                    >
                      <option value="">Choose a class...</option>
                      {resources?.classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-neutral-500 uppercase mb-2 block">Dispatch Channel</label>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setChannel('BOTH')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${channel === 'BOTH' ? 'bg-orange-500/10 border-orange-500 text-orange-400' : 'bg-white/5 border-white/10 text-neutral-500'}`}
                    >
                      Both (SMS + Email)
                    </button>
                    <button 
                      onClick={() => setChannel('EMAIL')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${channel === 'EMAIL' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-white/5 border-white/10 text-neutral-500'}`}
                    >
                      <Mail className="w-3 h-3 inline mr-1" /> Email Only
                    </button>
                    <button 
                      onClick={() => setChannel('SMS')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${channel === 'SMS' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-white/5 border-white/10 text-neutral-500'}`}
                    >
                      <MessageSquare className="w-3 h-3 inline mr-1" /> SMS Only
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-neutral-500 uppercase mb-2 block">Subject Line</label>
                  <input 
                    value={subject} onChange={e => setSubject(e.target.value)}
                    placeholder="e.g. Important Notice: School Closure"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-orange-500 transition-colors text-lg font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-500 uppercase mb-2 block">Message Body</label>
                  <textarea 
                    value={body} onChange={e => setBody(e.target.value)}
                    placeholder="Type your message here..."
                    rows={8}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-4 outline-none focus:border-orange-500 transition-colors resize-none leading-relaxed"
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button 
                  onClick={handleSend}
                  disabled={sending || !subject || !body || (audience === 'CLASS_SPECIFIC' && !targetClassId)}
                  className="flex items-center gap-2 px-10 py-4 rounded-2xl bg-white text-black font-black shadow-[0_0_50px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  {sending ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Send className="w-5 h-5" />}
                  Broadcast Now
                </button>
              </div>
            </div>
          </div>

          {/* HISTORY */}
          <div className="space-y-6">
            <div className="bg-neutral-900/40 border border-white/10 rounded-3xl p-6 backdrop-blur-xl h-full">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-3"><History className="text-orange-500 w-5 h-5" /> Recent Activity</h2>
              
              <div className="space-y-4 max-h-[700px] overflow-y-auto custom-scrollbar pr-2">
                {history.length === 0 ? (
                  <div className="text-center py-10 opacity-30">No message history.</div>
                ) : (
                  history.map(msg => (
                    <div key={msg.id} className="p-4 bg-black/30 border border-white/5 rounded-2xl hover:bg-black/50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-orange-500/70">{msg.audienceType.replace('_', ' ')}</span>
                        <span className="text-[10px] font-mono text-neutral-600">{new Date(msg.sentAt).toLocaleDateString()}</span>
                      </div>
                      <h4 className="font-bold text-sm text-white mb-1 line-clamp-1">{msg.subject}</h4>
                      <p className="text-xs text-neutral-500 line-clamp-2 mb-3 leading-relaxed">{msg.body}</p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3 h-3 text-neutral-600" />
                          <span className="text-[10px] font-bold text-neutral-400">{msg.sentCount} Recipient(s)</span>
                        </div>
                        <div className="text-[10px] font-bold text-neutral-600 italic">By {msg.sender.lastName}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
