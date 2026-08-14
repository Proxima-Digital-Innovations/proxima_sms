'use client';

import { useState, useEffect } from 'react';
import { getScheduleResources } from '@/actions/schedule-actions'; // Reuse to get terms, classes
import { getTermInvoices, generateClassInvoices, logPayment } from '@/actions/finance-actions';
import { Banknote, CreditCard, Users, Plus, AlertCircle, Calendar, Receipt, Search, CheckCircle2, User } from 'lucide-react';

export default function BursaryDashboard() {
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<any>(null);
  
  // Selection
  const [activeTermId, setActiveTermId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState(''); // Empty string = All Classes
  
  // Data
  const [invoices, setInvoices] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  
  // Modals
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkData, setBulkData] = useState({ classId: '', amount: '', description: 'Term Tuition Fee', dueDate: '' });
  
  const [paymentInvoice, setPaymentInvoice] = useState<any>(null);
  const [payData, setPayData] = useState({ amount: '', method: 'CASH', reference: '' });
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    async function loadMeta() {
      const res = await getScheduleResources();
      if (res.success && res.resources) {
        setResources(res.resources);
        if (res.resources.activeTerms[0]) setActiveTermId(res.resources.activeTerms[0].id);
      }
      setLoading(false);
    }
    loadMeta();
  }, []);

  useEffect(() => {
    if (activeTermId) fetchInvoices();
  }, [activeTermId, selectedClassId]);

  const fetchInvoices = async () => {
    setLoading(true);
    const res = await getTermInvoices(activeTermId, selectedClassId === '' ? undefined : selectedClassId);
    if (res.success) setInvoices(res.invoices);
    setLoading(false);
  };

  const handleBulkGenerate = async () => {
    setActionError('');
    if (!bulkData.classId || !bulkData.amount || !bulkData.dueDate) return;
    
    const res = await generateClassInvoices(
      activeTermId, 
      bulkData.classId, 
      parseFloat(bulkData.amount), 
      bulkData.description, 
      new Date(bulkData.dueDate)
    );
    
    if (res.success) {
      setShowBulkModal(false);
      fetchInvoices();
    } else {
      setActionError((res as any).message || (res as any).error || 'Failed');
    }
  };

  const handleLogPayment = async () => {
    setActionError('');
    if (!paymentInvoice || !payData.amount) return;
    
    const amt = parseFloat(payData.amount);
    const res = await logPayment(paymentInvoice.id, amt, payData.method, payData.reference);
    
    if (res.success) {
      setPaymentInvoice(null);
      setPayData({ amount: '', method: 'CASH', reference: '' });
      fetchInvoices();
    } else {
      setActionError((res as any).message || (res as any).error || 'Failed');
    }
  };

  // Filter invoices locally by search term
  const filteredInvoices = invoices.filter(i => {
    const term = search.toLowerCase();
    return i.student.firstName.toLowerCase().includes(term) || 
           i.student.lastName.toLowerCase().includes(term) || 
           i.student.studentId.toLowerCase().includes(term) ||
           i.description.toLowerCase().includes(term);
  });

  const getStatusBadge = (status: string) => {
    if (status === 'PAID') return <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold tracking-wider">PAID</span>;
    if (status === 'PARTIAL') return <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold tracking-wider">PARTIAL</span>;
    return <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 text-xs font-bold tracking-wider">UNPAID</span>;
  };

  if (loading && !resources) {
    return <div className="min-h-screen flex justify-center py-20"><div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900/40 to-neutral-900/40 border border-white/10 p-8 shadow-2xl backdrop-blur-xl flex justify-between items-end">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl opacity-50 pointer-events-none" />
          
          <div className="space-y-2 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-2">
              <Banknote className="w-4 h-4" /> Financial Hub
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
              Bursary & Invoicing
            </h1>
            <p className="text-neutral-400 max-w-xl text-lg font-light leading-relaxed">
              Generate termly fee structures, log payments, and track outstanding debtors in real-time.
            </p>
          </div>
          
          <button 
            onClick={() => setShowBulkModal(true)}
            className="relative z-10 flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-bold shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:scale-105 transition-all duration-300"
          >
            <Plus className="w-5 h-5" /> Generate Invoices
          </button>
        </div>

        {/* Global Controls */}
        <div className="flex gap-4 items-center bg-black/40 p-4 rounded-2xl border border-white/5 shadow-inner">
          <Calendar className="text-neutral-500 w-5 h-5" />
          <select 
            value={activeTermId} onChange={e=>setActiveTermId(e.target.value)}
            className="bg-neutral-900 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none"
          >
            {resources?.activeTerms.map((t: any) => <option key={t.id} value={t.id}>{t.session.year} - {t.name}</option>)}
          </select>
          <div className="w-px h-8 bg-white/10 mx-2" />
          <select 
            value={selectedClassId} onChange={e=>setSelectedClassId(e.target.value)}
            className="bg-neutral-900 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none"
          >
            <option value="">All Classes</option>
            {resources?.classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          
          <div className="ml-auto relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input 
              value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search debtors..."
              className="w-full bg-neutral-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* Invoices List */}
        <div className="grid grid-cols-1 gap-4">
          {loading ? (
             <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl bg-white/5">
              <CheckCircle2 className="w-16 h-16 text-emerald-500/50 mx-auto mb-4" />
              <p className="text-neutral-400 text-lg font-medium">No outstanding invoices found.</p>
            </div>
          ) : (
            filteredInvoices.map(inv => (
              <div key={inv.id} className="bg-neutral-900/50 border border-white/10 rounded-2xl p-6 flex items-center justify-between hover:bg-neutral-900/80 transition-colors">
                
                {/* Info */}
                <div className="flex items-center gap-6 flex-1">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <User className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">{inv.student.lastName}, {inv.student.firstName}</h3>
                    <div className="text-sm text-neutral-400 flex items-center gap-3">
                      <span>{inv.student.studentId}</span> • 
                      <span className="font-medium text-indigo-300">{inv.student.class?.name || 'No Class'}</span> • 
                      <span>{inv.description}</span>
                    </div>
                  </div>
                </div>

                {/* Financials */}
                <div className="flex items-center gap-8 px-8 border-x border-white/10">
                  <div>
                    <div className="text-xs font-bold text-neutral-500 uppercase">Total Billed</div>
                    <div className="font-mono text-lg text-neutral-300">${inv.amount.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-neutral-500 uppercase">Amount Paid</div>
                    <div className="font-mono text-lg text-emerald-400">${inv.amountPaid.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-rose-400 uppercase tracking-wider">Outstanding</div>
                    <div className="font-mono text-2xl font-black text-rose-300">${inv.balance.toLocaleString()}</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pl-8 flex flex-col items-end gap-3 w-48">
                  {getStatusBadge(inv.status)}
                  {inv.balance > 0 && (
                    <button 
                      onClick={() => setPaymentInvoice(inv)}
                      className="flex items-center gap-2 text-sm font-bold bg-white text-black px-4 py-2 rounded-lg hover:scale-105 transition-transform"
                    >
                      <CreditCard className="w-4 h-4" /> Log Payment
                    </button>
                  )}
                </div>

              </div>
            ))
          )}
        </div>
      </div>

      {/* BULK GENERATE MODAL */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-emerald-500/30 p-8 rounded-3xl w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Plus className="text-emerald-500" /> Bulk Generate Invoices</h2>
            
            {actionError && <div className="bg-rose-500/10 text-rose-400 p-3 rounded-lg text-sm mb-4">{actionError}</div>}
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase">Target Class *</label>
                <select value={bulkData.classId} onChange={e=>setBulkData({...bulkData, classId: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none text-white">
                  <option value="">Select Class</option>
                  {resources?.classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase">Description *</label>
                <input value={bulkData.description} onChange={e=>setBulkData({...bulkData, description: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none text-white" />
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase">Amount per Student ($) *</label>
                <input type="number" value={bulkData.amount} onChange={e=>setBulkData({...bulkData, amount: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none text-white" />
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase">Due Date *</label>
                <input type="date" value={bulkData.dueDate} onChange={e=>setBulkData({...bulkData, dueDate: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none text-white" />
              </div>
              <div className="flex gap-3 mt-6 pt-4 border-t border-white/10">
                <button onClick={()=>setShowBulkModal(false)} className="flex-1 py-3 border border-white/10 rounded-xl font-semibold">Cancel</button>
                <button onClick={handleBulkGenerate} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold">Generate</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOG PAYMENT MODAL */}
      {paymentInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-emerald-500/30 p-8 rounded-3xl w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2"><Receipt className="text-emerald-500" /> Log Payment</h2>
            <p className="text-sm text-neutral-400 mb-6">Receiving funds for {paymentInvoice.student.lastName}, {paymentInvoice.student.firstName}</p>
            
            {actionError && <div className="bg-rose-500/10 text-rose-400 p-3 rounded-lg text-sm mb-4">{actionError}</div>}
            
            <div className="bg-black/30 p-4 rounded-xl border border-white/5 mb-6 flex justify-between items-center">
              <span className="text-neutral-400 font-medium text-sm">Outstanding Balance:</span>
              <span className="text-2xl font-black text-rose-400">${paymentInvoice.balance.toLocaleString()}</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase">Payment Amount ($) *</label>
                <input type="number" max={paymentInvoice.balance} value={payData.amount} onChange={e=>setPayData({...payData, amount: e.target.value})} className="w-full bg-black/50 border border-emerald-500/30 focus:border-emerald-500 rounded-xl px-4 py-3 mt-1 outline-none text-2xl font-black text-emerald-400" />
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase">Payment Method</label>
                <select value={payData.method} onChange={e=>setPayData({...payData, method: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none text-white">
                  <option value="CASH">Cash</option>
                  <option value="TRANSFER">Bank Transfer</option>
                  <option value="POS">POS Terminal</option>
                </select>
              </div>
              {payData.method !== 'CASH' && (
                <div>
                  <label className="text-xs font-bold text-neutral-400 uppercase">Transaction Reference</label>
                  <input value={payData.reference} onChange={e=>setPayData({...payData, reference: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none text-white" placeholder="TXN-..." />
                </div>
              )}
              <div className="flex gap-3 mt-6 pt-4 border-t border-white/10">
                <button onClick={()=>setPaymentInvoice(null)} className="flex-1 py-3 border border-white/10 rounded-xl font-semibold">Cancel</button>
                <button onClick={handleLogPayment} disabled={!payData.amount} className="flex-1 py-3 bg-white text-black disabled:opacity-50 rounded-xl font-bold hover:scale-105 active:scale-95 transition-transform">Confirm Payment</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
