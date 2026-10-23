'use client';

import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  FileText,
  Building,
  CreditCard,
  Printer,
  ChevronRight,
  RotateCcw,
  Send,
  ShieldCheck,
  UserCheck,
  CheckSquare,
  Landmark,
  Trash2,
  ArrowRight,
  Eye,
  History,
  Lock,
  Unlock,
  AlertTriangle
} from 'lucide-react';
import {
  getVouchersList,
  getVoucherById,
  getVoucherFormDropdowns,
  createPaymentVoucherAction,
  updatePaymentVoucherAction,
  processCheckVoucherAction,
  processVerifyVoucherAction,
  processApproveVoucherAction,
  postVoucherToLedgerAction,
  cancelPaymentVoucherAction
} from '@/actions/voucher-actions';
import { toast } from 'sonner';

export default function VouchersPage() {
  const [loading, setLoading] = useState(true);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [dropdowns, setDropdowns] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'registry' | 'studio' | 'slip'>('studio');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected voucher for editing / reviewing / viewing slip
  const [selectedVoucher, setSelectedVoucher] = useState<any | null>(null);

  // Form State for Studio (Create / Edit)
  const [voucherClass, setVoucherClass] = useState<'PAYMENT' | 'RECEIPT' | 'JOURNAL'>('PAYMENT');
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().slice(0, 10));
  const [branchOrCampus, setBranchOrCampus] = useState('Main Campus (HQ)');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [payeeCategory, setPayeeCategory] = useState('Registered Supplier');
  const [payeeName, setPayeeName] = useState('');
  const [payeeAddress, setPayeeAddress] = useState('');
  const [payeePhone, setPayeePhone] = useState('');
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [bankTransferRef, setBankTransferRef] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [narration, setNarration] = useState('');
  const [whtRate, setWhtRate] = useState<number>(0);

  // Debit Lines
  const [lines, setLines] = useState<Array<{ accountId: string; description: string; amount: number }>>([
    { accountId: '', description: '', amount: 0 }
  ]);

  // Lifecycle Action Modal State
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: 'CHECK' | 'VERIFY' | 'APPROVE' | 'POST' | 'CANCEL';
    targetAction?: string;
    remarks: string;
    submitting: boolean;
  }>({
    isOpen: false,
    type: 'CHECK',
    remarks: '',
    submitting: false
  });

  // Simulated Actor User (for testing approval lifecycle without relogging)
  const [actingUserId, setActingUserId] = useState<string>('');

  // Load initial vouchers & dropdowns
  const loadData = async () => {
    setLoading(true);
    try {
      const [vRes, dRes] = await Promise.all([
        getVouchersList({ status: filterStatus, search: searchQuery }),
        getVoucherFormDropdowns()
      ]);

      if (vRes.success && vRes.data) {
        setVouchers(vRes.data);
      }
      if (dRes.success && dRes.data) {
        setDropdowns(dRes.data);
        if (dRes.data.sourceAccounts?.length > 0 && !sourceAccountId) {
          setSourceAccountId(dRes.data.sourceAccounts[0].id);
        }
        if (dRes.data.users?.length > 0 && !actingUserId) {
          setActingUserId(dRes.data.users[0].id);
        }
      }
    } catch (err: any) {
      toast.error('Failed to load voucher system data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  // Math calculations
  const grossSubtotal = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const whtAmount = (grossSubtotal * whtRate) / 100;
  const netAmount = grossSubtotal - whtAmount;

  // Add / Remove line items
  const addLineRow = () => {
    setLines([...lines, { accountId: dropdowns?.debitAccounts?.[0]?.id || '', description: '', amount: 0 }]);
  };

  const removeLineRow = (index: number) => {
    if (lines.length === 1) {
      toast.error('Voucher must contain at least one debited account line item.');
      return;
    }
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLineRow = (index: number, field: string, value: any) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  };

  // Check if current voucher is locked from editing
  const isVoucherLocked = selectedVoucher && (
    selectedVoucher.status === 'CHECKED' ||
    selectedVoucher.status === 'VERIFIED' ||
    selectedVoucher.status === 'APPROVED' ||
    selectedVoucher.status === 'POSTED' ||
    selectedVoucher.status === 'CANCELLED'
  );

  // Reset form for fresh voucher
  const handleRaiseNewVoucher = () => {
    setSelectedVoucher(null);
    setPayeeName('');
    setPayeeAddress('');
    setPayeePhone('');
    setBankTransferRef('');
    setChequeNumber('');
    setNarration('');
    setWhtRate(0);
    setLines([{ accountId: dropdowns?.debitAccounts?.[0]?.id || '', description: '', amount: 0 }]);
    setActiveTab('studio');
  };

  // Load existing voucher into Studio
  const handleEditVoucher = (v: any) => {
    setSelectedVoucher(v);
    setVoucherClass(v.voucherClass as any);
    setVoucherDate(new Date(v.voucherDate).toISOString().slice(0, 10));
    setBranchOrCampus(v.branchOrCampus);
    setPaymentMethod(v.paymentMethod);
    setPayeeCategory(v.payeeCategory);
    setPayeeName(v.payeeName);
    setPayeeAddress(v.payeeAddress || '');
    setPayeePhone(v.payeePhone || '');
    setSourceAccountId(v.sourceAccountId);
    setBankTransferRef(v.bankTransferRef || '');
    setChequeNumber(v.chequeNumber || '');
    setNarration(v.narration);
    setWhtRate(v.whtRate || 0);
    setLines(v.lines.map((l: any) => ({
      accountId: l.accountId,
      description: l.description || '',
      amount: l.amount
    })));
    setActiveTab('studio');
  };

  // View Printable Slip
  const handleViewSlip = (v: any) => {
    setSelectedVoucher(v);
    setActiveTab('slip');
  };

  // Submit Studio Form (Create or Update)
  const handleSaveVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payeeName.trim()) {
      toast.error('Payee Name is required.');
      return;
    }
    if (!narration.trim()) {
      toast.error('Narration is required.');
      return;
    }
    if (grossSubtotal <= 0) {
      toast.error('Total voucher amount must be greater than zero.');
      return;
    }

    try {
      if (selectedVoucher) {
        // Update existing draft
        const res = await updatePaymentVoucherAction({
          voucherId: selectedVoucher.id,
          payeeName,
          payeeAddress,
          payeePhone,
          sourceAccountId,
          paymentMethod,
          bankTransferRef,
          chequeNumber,
          narration,
          whtRate,
          lines,
          actorUserId: actingUserId
        });

        if (res.success) {
          toast.success(res.message || 'Voucher updated successfully.');
          loadData();
          handleEditVoucher(res.data);
        } else {
          toast.error(res.error || 'Failed to update voucher.');
        }
      } else {
        // Create new voucher
        const res = await createPaymentVoucherAction({
          voucherClass,
          voucherDate,
          branchOrCampus,
          paymentMethod,
          payeeCategory,
          payeeName,
          payeeAddress,
          payeePhone,
          sourceAccountId,
          bankTransferRef,
          chequeNumber,
          narration,
          whtRate,
          lines,
          actorUserId: actingUserId
        });

        if (res.success) {
          toast.success(res.message || 'Voucher raised successfully!');
          loadData();
          handleEditVoucher(res.data);
        } else {
          toast.error(res.error || 'Failed to create voucher.');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Submission error.');
    }
  };

  // Execute Lifecycle Action (Check, Verify, Approve, Post, Cancel)
  const handleExecuteLifecycleAction = async () => {
    if (!selectedVoucher) return;
    setActionModal({ ...actionModal, submitting: true });

    try {
      let res: any = null;

      if (actionModal.type === 'CHECK') {
        res = await processCheckVoucherAction({
          voucherId: selectedVoucher.id,
          action: actionModal.targetAction as any,
          remarks: actionModal.remarks,
          actorUserId: actingUserId
        });
      } else if (actionModal.type === 'VERIFY') {
        res = await processVerifyVoucherAction({
          voucherId: selectedVoucher.id,
          action: actionModal.targetAction as any,
          remarks: actionModal.remarks,
          actorUserId: actingUserId
        });
      } else if (actionModal.type === 'APPROVE') {
        res = await processApproveVoucherAction({
          voucherId: selectedVoucher.id,
          action: actionModal.targetAction as any,
          remarks: actionModal.remarks,
          actorUserId: actingUserId
        });
      } else if (actionModal.type === 'POST') {
        res = await postVoucherToLedgerAction({
          voucherId: selectedVoucher.id,
          remarks: actionModal.remarks,
          actorUserId: actingUserId
        });
      } else if (actionModal.type === 'CANCEL') {
        res = await cancelPaymentVoucherAction({
          voucherId: selectedVoucher.id,
          reason: actionModal.remarks,
          actorUserId: actingUserId
        });
      }

      if (res && res.success) {
        toast.success(res.message || 'Action executed successfully.');
        setActionModal({ isOpen: false, type: 'CHECK', remarks: '', submitting: false });
        // Refresh voucher and reload list
        const refreshed = await getVoucherById(selectedVoucher.id);
        if (refreshed.success && refreshed.data) {
          setSelectedVoucher(refreshed.data);
        }
        loadData();
      } else {
        toast.error(res?.error || 'Action failed.');
        setActionModal({ ...actionModal, submitting: false });
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred.');
      setActionModal({ ...actionModal, submitting: false });
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
      {/* 1. TOP HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-3xl p-6 md:p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-white shadow-inner backdrop-blur-sm">
              <Receipt className="w-8 h-8 text-indigo-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-3 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-mono rounded-full font-bold">
                  MULTI-STAGE AUDIT LIFECYCLE
                </span>
                <span className="px-3 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs rounded-full font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  DOUBLE-ENTRY GL LINKED
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                Payment Voucher &amp; Disbursement Hub
              </h1>
              <p className="text-slate-300 text-sm mt-1">
                Enterprise Double-Entry Ledger Posting, Audit Authorizations &amp; Official Slips
              </p>
            </div>
          </div>

          {/* Quick Actions & Role Switcher */}
          <div className="flex flex-col sm:flex-row items-end gap-3 w-full md:w-auto">
            <div className="bg-white/10 backdrop-blur-md p-2.5 rounded-2xl border border-white/10 w-full sm:w-auto">
              <label className="block text-[10px] font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                Simulated User Role (Workflow Test)
              </label>
              <select
                value={actingUserId}
                onChange={(e) => setActingUserId(e.target.value)}
                className="bg-slate-800 text-white text-xs font-medium rounded-xl px-2.5 py-1.5 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 w-full sm:w-56"
              >
                {dropdowns?.users?.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleRaiseNewVoucher}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg transition-transform active:scale-95 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Raise New Voucher
            </button>
          </div>
        </div>
      </div>

      {/* 2. NAVIGATION TABS */}
      <div className="flex border-b border-gray-200 overflow-x-auto space-x-2">
        <button
          onClick={() => setActiveTab('studio')}
          className={`pb-3 px-4 font-semibold text-sm transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'studio'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          {selectedVoucher ? `Voucher Studio: ${selectedVoucher.voucherNumber}` : 'Raise Voucher Studio'}
        </button>

        <button
          onClick={() => setActiveTab('registry')}
          className={`pb-3 px-4 font-semibold text-sm transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'registry'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Voucher Reports &amp; Registry
          <span className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full font-bold">
            {vouchers.length}
          </span>
        </button>

        {selectedVoucher && (
          <button
            onClick={() => setActiveTab('slip')}
            className={`pb-3 px-4 font-semibold text-sm transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'slip'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Printer className="w-4 h-4" />
            Official Slip Preview
          </button>
        )}
      </div>

      {/* 3. TAB CONTENTS */}

      {/* ============================================================== */}
      {/* TAB 1: RAISE & EDIT VOUCHER STUDIO                              */}
      {/* ============================================================== */}
      {activeTab === 'studio' && (
        <div className="space-y-6">
          {/* LIFECYCLE PROGRESS STEPPER & CONTROL PANEL */}
          {selectedVoucher && (
            <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold px-3 py-1 bg-indigo-100 text-indigo-800 rounded-lg">
                      {selectedVoucher.voucherNumber}
                    </span>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      selectedVoucher.status === 'POSTED' ? 'bg-emerald-100 text-emerald-800' :
                      selectedVoucher.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                      selectedVoucher.status === 'VERIFIED' ? 'bg-purple-100 text-purple-800' :
                      selectedVoucher.status === 'CHECKED' ? 'bg-amber-100 text-amber-800' :
                      selectedVoucher.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedVoucher.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Raised by {selectedVoucher.createdBy?.firstName} {selectedVoucher.createdBy?.lastName} on {new Date(selectedVoucher.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Edit Lock Indicator */}
                <div className="flex items-center gap-2">
                  {isVoucherLocked ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-bold">
                      <Lock className="w-4 h-4" />
                      LOCKED FROM EDITING ({selectedVoucher.status})
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold">
                      <Unlock className="w-4 h-4" />
                      EDITABLE BY CREATOR (DRAFT)
                    </div>
                  )}
                </div>
              </div>

              {/* Multi-Stage Stepper */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                {[
                  { stage: 'CREATION', label: '1. Create (Draft)', actor: selectedVoucher.createdBy },
                  { stage: 'CHECKING', label: '2. Checked (Audit)', actor: selectedVoucher.checkedBy },
                  { stage: 'VERIFICATION', label: '3. Verified (Compliance)', actor: selectedVoucher.verifiedBy },
                  { stage: 'APPROVAL', label: '4. Approved (Executive)', actor: selectedVoucher.approvedBy },
                  { stage: 'POSTED', label: '5. Posted (Ledger)', actor: selectedVoucher.postedBy }
                ].map((s, idx) => {
                  const isCurrent = selectedVoucher.currentStage === s.stage;
                  const isPassed =
                    (s.stage === 'CREATION') ||
                    (s.stage === 'CHECKING' && ['CHECKED', 'VERIFIED', 'APPROVED', 'POSTED'].includes(selectedVoucher.status)) ||
                    (s.stage === 'VERIFICATION' && ['VERIFIED', 'APPROVED', 'POSTED'].includes(selectedVoucher.status)) ||
                    (s.stage === 'APPROVAL' && ['APPROVED', 'POSTED'].includes(selectedVoucher.status)) ||
                    (s.stage === 'POSTED' && selectedVoucher.status === 'POSTED');

                  return (
                    <div
                      key={s.stage}
                      className={`p-3 rounded-2xl border transition-all ${
                        isCurrent
                          ? 'border-indigo-600 bg-indigo-50/70 font-bold shadow-sm'
                          : isPassed
                          ? 'border-emerald-200 bg-emerald-50/40 text-emerald-900'
                          : 'border-gray-200 bg-gray-50 text-gray-400'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1 mb-1">
                        {isPassed ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Clock className="w-4 h-4" />}
                        <span className="font-bold">{s.label}</span>
                      </div>
                      <span className="text-[10px] block truncate">
                        {s.actor ? `${s.actor.firstName} ${s.actor.lastName}` : 'Pending Action'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* ACTION TOOLBAR BASED ON CURRENT LIFECYCLE STAGE */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
                <div className="text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Available Operations</span>
                  <span className="font-bold text-white">Execute authorized workflow transition for this voucher:</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* DRAFT STAGE */}
                  {selectedVoucher.status === 'DRAFT' && (
                    <button
                      type="button"
                      onClick={() => setActionModal({ isOpen: true, type: 'CHECK', targetAction: 'CHECK_AND_FORWARD', remarks: '', submitting: false })}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow"
                    >
                      <CheckSquare className="w-4 h-4" />
                      Mark Checked &amp; Forward
                    </button>
                  )}

                  {/* CHECKED STAGE */}
                  {selectedVoucher.status === 'CHECKED' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setActionModal({ isOpen: true, type: 'CHECK', targetAction: 'RETURN_TO_CREATOR', remarks: '', submitting: false })}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Return to Creator with Remark
                      </button>
                      <button
                        type="button"
                        onClick={() => setActionModal({ isOpen: true, type: 'VERIFY', targetAction: 'VERIFY_AND_FORWARD', remarks: '', submitting: false })}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow"
                      >
                        <UserCheck className="w-4 h-4" />
                        Verify &amp; Forward to Approver
                      </button>
                    </>
                  )}

                  {/* VERIFIED STAGE */}
                  {selectedVoucher.status === 'VERIFIED' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setActionModal({ isOpen: true, type: 'APPROVE', targetAction: 'RETURN_TO_CHECKER', remarks: '', submitting: false })}
                        className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Return to Checker
                      </button>
                      <button
                        type="button"
                        onClick={() => setActionModal({ isOpen: true, type: 'APPROVE', targetAction: 'RETURN_TO_CREATOR', remarks: '', submitting: false })}
                        className="px-3 py-2 bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Return to Creator
                      </button>
                      <button
                        type="button"
                        onClick={() => setActionModal({ isOpen: true, type: 'APPROVE', targetAction: 'APPROVE', remarks: '', submitting: false })}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Officially Approve Voucher
                      </button>
                    </>
                  )}

                  {/* APPROVED STAGE */}
                  {selectedVoucher.status === 'APPROVED' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setActionModal({ isOpen: true, type: 'POST', targetAction: 'POST', remarks: '', submitting: false })}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 shadow-lg animate-pulse"
                      >
                        <Landmark className="w-4 h-4" />
                        Post to General Ledger (Double-Entry)
                      </button>
                      <button
                        type="button"
                        onClick={() => setActionModal({ isOpen: true, type: 'CANCEL', targetAction: 'CANCEL', remarks: '', submitting: false })}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow"
                      >
                        <XCircle className="w-4 h-4" />
                        Cancel Voucher
                      </button>
                    </>
                  )}

                  {/* POSTED STAGE */}
                  {selectedVoucher.status === 'POSTED' && (
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        Posted to Ledger &bull; JE: {selectedVoucher.journalEntryId?.slice(-8) || selectedVoucher.voucherNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActionModal({ isOpen: true, type: 'CANCEL', targetAction: 'CANCEL', remarks: '', submitting: false })}
                        className="px-3 py-1.5 bg-red-800 hover:bg-red-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1"
                      >
                        Void / Cancel
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleViewSlip(selectedVoucher)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-slate-700"
                  >
                    <Printer className="w-4 h-4" />
                    Print Voucher Slip
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VOUCHER FORM (MATCHING USER SCREENSHOT) */}
          <form onSubmit={handleSaveVoucher} className="bg-white rounded-3xl p-6 md:p-8 border border-gray-200 shadow-sm space-y-8">
            {/* Top Toolbar: Voucher Class & Reference */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">VOUCHER CLASS:</span>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                  {(['PAYMENT', 'RECEIPT', 'JOURNAL'] as const).map(cls => (
                    <button
                      key={cls}
                      type="button"
                      disabled={isVoucherLocked}
                      onClick={() => setVoucherClass(cls)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        voucherClass === cls
                          ? 'bg-emerald-600 text-white shadow'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {cls} ({cls === 'PAYMENT' ? 'PV' : cls === 'RECEIPT' ? 'RV' : 'JV'})
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-gray-400 block font-semibold uppercase">VOUCHER REFERENCE</span>
                <span className="font-mono text-sm font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-200">
                  {selectedVoucher?.voucherNumber || 'AUTO-GENERATED ON SAVE'}
                </span>
              </div>
            </div>

            {/* SECTION 1: DISBURSEMENT & BENEFICIARY INFORMATION */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b pb-2">
                <Building className="w-4 h-4 text-emerald-600" />
                1. DISBURSEMENT &amp; BENEFICIARY INFORMATION
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">VOUCHER DATE *</label>
                  <input
                    type="date"
                    required
                    disabled={isVoucherLocked}
                    value={voucherDate}
                    onChange={(e) => setVoucherDate(e.target.value)}
                    className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">OPERATING BRANCH / PLANT / CAMPUS *</label>
                  <input
                    type="text"
                    required
                    disabled={isVoucherLocked}
                    value={branchOrCampus}
                    onChange={(e) => setBranchOrCampus(e.target.value)}
                    className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">PAYMENT METHOD *</label>
                  <select
                    disabled={isVoucherLocked}
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-60"
                  >
                    <option value="Bank Transfer">Bank Transfer (NIP / RTGS)</option>
                    <option value="Cash">Cash Disbursement</option>
                    <option value="Cheque">Bank Cheque</option>
                    <option value="Electronic">Online Card / Wallet</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">PAYEE CATEGORY *</label>
                  <select
                    disabled={isVoucherLocked}
                    value={payeeCategory}
                    onChange={(e) => setPayeeCategory(e.target.value)}
                    className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-60"
                  >
                    <option value="Registered Supplier">Registered Supplier / Vendor</option>
                    <option value="Staff / Faculty">Staff / Faculty Member</option>
                    <option value="Student">Student (Refund / Award)</option>
                    <option value="External Contractor">External Contractor</option>
                    <option value="Regulatory Authority">Regulatory / Government Body</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">PAYEE / BENEFICIARY NAME *</label>
                  <input
                    type="text"
                    required
                    disabled={isVoucherLocked}
                    placeholder="e.g. Al-Babel Agro Supplies Ltd / Dr. Aliyu Sani"
                    value={payeeName}
                    onChange={(e) => setPayeeName(e.target.value)}
                    className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-60"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: SOURCE ACCOUNT & BANKING REFERENCE */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b pb-2">
                <Landmark className="w-4 h-4 text-emerald-600" />
                2. SOURCE ACCOUNT &amp; BANKING REFERENCE
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">PAID FROM (BANK / CASH ACCOUNT) *</label>
                  <select
                    disabled={isVoucherLocked}
                    value={sourceAccountId}
                    onChange={(e) => setSourceAccountId(e.target.value)}
                    className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-60 font-mono"
                  >
                    {dropdowns?.sourceAccounts?.map((acc: any) => (
                      <option key={acc.id} value={acc.id}>
                        [{acc.code}] {acc.name} — Balance: ₦{acc.balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">BANK TRANSFER / SESSION REF / CHEQUE NO</label>
                  <input
                    type="text"
                    disabled={isVoucherLocked}
                    placeholder="e.g. NIP/20261016/982 or CHQ-004812"
                    value={bankTransferRef}
                    onChange={(e) => setBankTransferRef(e.target.value)}
                    className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-60 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">NARRATION / PAYMENT PURPOSE *</label>
                <textarea
                  rows={2}
                  required
                  disabled={isVoucherLocked}
                  placeholder="Detailed description of why funds are being disbursed (e.g. Purchase of 200 bags of fertilizer packaging sacks for batch F-09)..."
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-60"
                ></textarea>
              </div>
            </div>

            {/* SECTION 3: DOUBLE-ENTRY DEBITED ACCOUNTS */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  3. DOUBLE-ENTRY DEBITED ACCOUNTS (EXPENSE / LIABILITY / ASSET)
                </h3>
                {!isVoucherLocked && (
                  <button
                    type="button"
                    onClick={addLineRow}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl flex items-center gap-1 border border-indigo-200"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Add Row
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {lines.map((line, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row items-center gap-2 bg-gray-50/70 p-3 rounded-2xl border border-gray-200">
                    <span className="text-xs font-mono font-bold text-gray-400 w-6 text-center">#{idx + 1}</span>

                    <div className="flex-1 w-full sm:w-auto">
                      <select
                        disabled={isVoucherLocked}
                        value={line.accountId}
                        onChange={(e) => updateLineRow(idx, 'accountId', e.target.value)}
                        className="w-full text-xs p-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono"
                      >
                        <option value="">-- Select Debited GL Account --</option>
                        {dropdowns?.debitAccounts?.map((acc: any) => (
                          <option key={acc.id} value={acc.id}>
                            [{acc.code}] {acc.name} ({acc.category.name})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex-1 w-full sm:w-auto">
                      <input
                        type="text"
                        disabled={isVoucherLocked}
                        placeholder="Line Memo (optional)"
                        value={line.description}
                        onChange={(e) => updateLineRow(idx, 'description', e.target.value)}
                        className="w-full text-xs p-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="w-full sm:w-44">
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-xs font-bold text-gray-400">₦</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          disabled={isVoucherLocked}
                          value={line.amount || ''}
                          onChange={(e) => updateLineRow(idx, 'amount', parseFloat(e.target.value) || 0)}
                          className="w-full text-xs pl-7 pr-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-right"
                        />
                      </div>
                    </div>

                    {!isVoucherLocked && (
                      <button
                        type="button"
                        onClick={() => removeLineRow(idx)}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* FINANCIAL RECONCILIATION SUMMARY BAR (FROM USER SCREENSHOT) */}
              <div className="bg-slate-900 rounded-2xl p-5 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-inner mt-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">
                      WITHHOLDING TAX (WHT)
                    </label>
                    <select
                      disabled={isVoucherLocked}
                      value={whtRate}
                      onChange={(e) => setWhtRate(parseFloat(e.target.value) || 0)}
                      className="bg-slate-800 text-white text-xs font-medium rounded-xl px-3 py-2 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      <option value={0}>No Tax Withholding (0%)</option>
                      <option value={5}>5% WHT Deduction</option>
                      <option value={10}>10% WHT Deduction</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-right w-full sm:w-auto justify-end">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">GROSS SUBTOTAL:</span>
                    <span className="font-mono text-sm font-bold text-slate-200">
                      ₦{grossSubtotal.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {whtRate > 0 && (
                    <div>
                      <span className="text-[10px] text-red-400 uppercase font-semibold block">WHT DEDUCTION:</span>
                      <span className="font-mono text-sm font-bold text-red-400">
                        -₦{whtAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  <div className="pl-4 border-l border-slate-800">
                    <span className="text-[10px] text-emerald-400 uppercase font-bold block">NET AMOUNT TO PAY:</span>
                    <span className="font-mono text-xl font-extrabold text-emerald-400">
                      ₦{netAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* SAVE BUTTON */}
            {!isVoucherLocked && (
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="submit"
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-lg transition-transform active:scale-95 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {selectedVoucher ? 'Save Voucher Updates' : 'Raise & Compile Voucher'}
                </button>
              </div>
            )}
          </form>

          {/* AUDIT TRAIL LOG */}
          {selectedVoucher?.auditTrail?.length > 0 && (
            <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                Voucher Authorization History &amp; Audit Trail
              </h3>

              <div className="space-y-3">
                {selectedVoucher.auditTrail.map((log: any) => (
                  <div key={log.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-start justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{log.action}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                          {log.fromStatus} &rarr; {log.toStatus}
                        </span>
                      </div>
                      <p className="text-gray-600 mt-1 italic">&ldquo;{log.remarks}&rdquo;</p>
                      <span className="text-[10px] text-gray-400 mt-1 block">
                        By {log.actor?.firstName} {log.actor?.lastName} ({log.actor?.role})
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: VOUCHER REGISTRY & REPORTS                               */}
      {/* ============================================================== */}
      {activeTab === 'registry' && (
        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-600" />
                Disbursement Vouchers Registry
              </h3>
              <p className="text-xs text-gray-500">
                Complete audit trail of raised, checked, verified, approved, and posted vouchers.
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search reference, payee..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-xs p-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="CHECKED">Checked</option>
                <option value="VERIFIED">Verified</option>
                <option value="APPROVED">Approved</option>
                <option value="POSTED">Posted</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Voucher No</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Payee &amp; Category</th>
                  <th className="py-3 px-4">Paid From</th>
                  <th className="py-3 px-4 text-right">Net Amount</th>
                  <th className="py-3 px-4 text-center">Lifecycle Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vouchers.map(v => (
                  <tr key={v.id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">{v.voucherNumber}</td>
                    <td className="py-3 px-4 text-gray-500">{new Date(v.voucherDate).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900">{v.payeeName}</div>
                      <span className="text-[10px] text-gray-400">{v.payeeCategory}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-600">[{v.sourceAccount?.code}] {v.sourceAccount?.name}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                      ₦{v.netAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        v.status === 'POSTED' ? 'bg-emerald-100 text-emerald-800' :
                        v.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                        v.status === 'VERIFIED' ? 'bg-purple-100 text-purple-800' :
                        v.status === 'CHECKED' ? 'bg-amber-100 text-amber-800' :
                        v.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleEditVoucher(v)}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-xs"
                        >
                          Inspect / Edit
                        </button>
                        <button
                          onClick={() => handleViewSlip(v)}
                          className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-xs"
                        >
                          Slip
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {vouchers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-400 italic">
                      No payment vouchers found matching your filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: OFFICIAL PRINTABLE VOUCHER SLIP                          */}
      {/* ============================================================== */}
      {activeTab === 'slip' && selectedVoucher && (
        <div className="space-y-4">
          <div className="flex justify-end gap-3 no-print">
            <button
              onClick={() => window.print()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow"
            >
              <Printer className="w-4 h-4" />
              Print Official Voucher Slip
            </button>
          </div>

          <div id="print-area" className="bg-white p-8 md:p-12 rounded-3xl border border-gray-300 shadow-xl max-w-4xl mx-auto text-gray-900 space-y-6">
            {/* Slip Header */}
            <div className="text-center border-b-2 border-gray-900 pb-4">
              <h2 className="text-xl font-black uppercase font-serif tracking-wide">
                PROXIMA TERTIARY INSTITUTE &amp; EDUCATIONAL SYSTEM
              </h2>
              <p className="text-xs uppercase tracking-widest text-gray-600 font-semibold mt-0.5">
                Bursary &amp; Financial Operations Directorate &bull; Official Disbursement Voucher
              </p>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs border-b pb-4">
              <div className="space-y-1">
                <div><span className="font-bold text-gray-500">VOUCHER NUMBER:</span> <span className="font-mono font-black text-indigo-900">{selectedVoucher.voucherNumber}</span></div>
                <div><span className="font-bold text-gray-500">VOUCHER DATE:</span> <span className="font-semibold">{new Date(selectedVoucher.voucherDate).toLocaleDateString()}</span></div>
                <div><span className="font-bold text-gray-500">BRANCH / CAMPUS:</span> <span className="font-semibold">{selectedVoucher.branchOrCampus}</span></div>
                <div><span className="font-bold text-gray-500">PAYMENT METHOD:</span> <span className="font-semibold">{selectedVoucher.paymentMethod}</span></div>
              </div>

              <div className="space-y-1">
                <div><span className="font-bold text-gray-500">PAYEE:</span> <span className="font-black text-gray-900">{selectedVoucher.payeeName}</span></div>
                <div><span className="font-bold text-gray-500">CATEGORY:</span> <span className="font-semibold">{selectedVoucher.payeeCategory}</span></div>
                <div><span className="font-bold text-gray-500">PAID FROM:</span> <span className="font-mono font-semibold">[{selectedVoucher.sourceAccount?.code}] {selectedVoucher.sourceAccount?.name}</span></div>
                <div><span className="font-bold text-gray-500">SESSION REF:</span> <span className="font-mono font-semibold">{selectedVoucher.bankTransferRef || 'N/A'}</span></div>
              </div>
            </div>

            {/* Narration */}
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs">
              <span className="font-bold text-gray-500 block mb-0.5">PAYMENT PURPOSE / NARRATION:</span>
              <p className="font-medium text-gray-900">{selectedVoucher.narration}</p>
            </div>

            {/* Line Items Table */}
            <div>
              <table className="w-full text-left text-xs border border-gray-300">
                <thead className="bg-gray-100 font-bold border-b border-gray-300">
                  <tr>
                    <th className="py-2 px-3">GL Account Code</th>
                    <th className="py-2 px-3">Account Description</th>
                    <th className="py-2 px-3">Line Memo</th>
                    <th className="py-2 px-3 text-right">Debit Amount (₦)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {selectedVoucher.lines?.map((l: any, i: number) => (
                    <tr key={i}>
                      <td className="py-2 px-3 font-mono font-bold text-indigo-700">{l.account?.code}</td>
                      <td className="py-2 px-3 font-medium">{l.account?.name}</td>
                      <td className="py-2 px-3 text-gray-500">{l.description || selectedVoucher.payeeName}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">₦{l.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-gray-900 bg-gray-50 font-bold">
                  <tr>
                    <td colSpan={3} className="py-2 px-3 text-right uppercase">Gross Subtotal:</td>
                    <td className="py-2 px-3 text-right font-mono">₦{selectedVoucher.grossAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  {selectedVoucher.whtAmount > 0 && (
                    <tr className="text-red-700">
                      <td colSpan={3} className="py-1 px-3 text-right uppercase">Less WHT Deduction ({selectedVoucher.whtRate}%):</td>
                      <td className="py-1 px-3 text-right font-mono">-₦{selectedVoucher.whtAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )}
                  <tr className="text-sm bg-gray-100 border-t border-gray-400">
                    <td colSpan={3} className="py-2.5 px-3 text-right uppercase font-extrabold">Net Disbursed Amount:</td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-indigo-900">
                      ₦{selectedVoucher.netAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* 5-Stage Official Signature Block */}
            <div className="pt-8 border-t border-gray-300 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center text-xs">
              <div className="border-t border-gray-400 pt-2">
                <span className="font-serif italic block text-gray-700">
                  {selectedVoucher.createdBy ? `${selectedVoucher.createdBy.firstName} ${selectedVoucher.createdBy.lastName}` : 'Signature'}
                </span>
                <span className="font-bold text-[10px] text-gray-500 uppercase block">1. PREPARED BY</span>
                <span className="text-[9px] text-gray-400">{new Date(selectedVoucher.createdAt).toLocaleDateString()}</span>
              </div>

              <div className="border-t border-gray-400 pt-2">
                <span className="font-serif italic block text-gray-700">
                  {selectedVoucher.checkedBy ? `${selectedVoucher.checkedBy.firstName} ${selectedVoucher.checkedBy.lastName}` : '______________'}
                </span>
                <span className="font-bold text-[10px] text-gray-500 uppercase block">2. CHECKED BY</span>
                <span className="text-[9px] text-gray-400">{selectedVoucher.checkedAt ? new Date(selectedVoucher.checkedAt).toLocaleDateString() : 'Pending'}</span>
              </div>

              <div className="border-t border-gray-400 pt-2">
                <span className="font-serif italic block text-gray-700">
                  {selectedVoucher.verifiedBy ? `${selectedVoucher.verifiedBy.firstName} ${selectedVoucher.verifiedBy.lastName}` : '______________'}
                </span>
                <span className="font-bold text-[10px] text-gray-500 uppercase block">3. VERIFIED BY</span>
                <span className="text-[9px] text-gray-400">{selectedVoucher.verifiedAt ? new Date(selectedVoucher.verifiedAt).toLocaleDateString() : 'Pending'}</span>
              </div>

              <div className="border-t border-gray-400 pt-2">
                <span className="font-serif italic block text-gray-700">
                  {selectedVoucher.approvedBy ? `${selectedVoucher.approvedBy.firstName} ${selectedVoucher.approvedBy.lastName}` : '______________'}
                </span>
                <span className="font-bold text-[10px] text-gray-500 uppercase block">4. APPROVED BY (BURSAR)</span>
                <span className="text-[9px] text-gray-400">{selectedVoucher.approvedAt ? new Date(selectedVoucher.approvedAt).toLocaleDateString() : 'Pending'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL FOR LIFECYCLE ACTION REMARKS */}
      {actionModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-gray-200 relative animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              Authorize Workflow Transition: {actionModal.targetAction?.replace(/_/g, ' ')}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Voucher Ref: {selectedVoucher?.voucherNumber} &bull; Net: ₦{selectedVoucher?.netAmount.toLocaleString('en-NG')}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Audit Remarks / Justification {actionModal.targetAction?.includes('RETURN') || actionModal.type === 'CANCEL' ? '(REQUIRED)' : '(OPTIONAL)'}
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter official audit comment, correction guidance, or authorization memo..."
                  value={actionModal.remarks}
                  onChange={(e) => setActionModal({ ...actionModal, remarks: e.target.value })}
                  className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setActionModal({ isOpen: false, type: 'CHECK', remarks: '', submitting: false })}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionModal.submitting}
                  onClick={handleExecuteLifecycleAction}
                  className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5 shadow"
                >
                  {actionModal.submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    'Confirm & Sign Transition'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
