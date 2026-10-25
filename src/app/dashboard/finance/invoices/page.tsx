"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Receipt,
  Wallet,
  AlertCircle,
  FileText,
  Filter,
  Eye,
  Plus,
  Search,
  CreditCard,
  Loader2,
  Download,
  Link as LinkIcon,
  CheckCircle2,
  Clock,
  MoreVertical,
  XCircle,
  Bell,
  RefreshCw,
  Ban,
  DollarSign,
  Layers,
  ArrowUpDown,
  Check,
} from "lucide-react";
import {
  getInvoices,
  createIndividualInvoice,
  recordPayment,
  voidInvoice,
  bulkVoidInvoices,
  quickMarkInvoicePaid,
  bulkMarkInvoicesPaid,
  sendInvoiceReminder,
} from "@/actions/billing-actions";
import { getStudents } from "@/actions/student-actions";
import { getAcademicData } from "@/actions/academic-data";
import { getSystemSettings } from "@/actions/system-actions";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/context/language-context";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function InvoicesPage() {
  const { language, isRtl } = useLanguage();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // System & Currency State
  const [currencySymbol, setCurrencySymbol] = useState("₦");
  const [currencyCode, setCurrencyCode] = useState("NGN");

  // Academic Dropdown Data
  const [classes, setClasses] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);

  // Filter States
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [classFilter, setClassFilter] = useState("ALL");
  const [termFilter, setTermFilter] = useState("ALL");
  const [segmentTab, setSegmentTab] = useState<"ALL" | "UNPAID" | "PAID" | "OVERDUE" | "VOID">("ALL");

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkOperating, setIsBulkOperating] = useState(false);

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [createTermId, setCreateTermId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Offline Payment Modal State
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("CASH");
  const [payReference, setPayReference] = useState("");
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

  // Void Modal State
  const [voidModalInvoice, setVoidModalInvoice] = useState<any | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);

  useEffect(() => {
    initData();
  }, []);

  const initData = async () => {
    setLoading(true);
    try {
      const [settingsRes, academicRes, invoicesData] = await Promise.all([
        getSystemSettings(),
        getAcademicData(),
        getInvoices(),
      ]);

      if (settingsRes.success && settingsRes.data) {
        setCurrencySymbol(settingsRes.data.currencySymbol || "₦");
        setCurrencyCode(settingsRes.data.currency || "NGN");
      }

      if (academicRes) {
        setClasses(academicRes.classes || []);
        setTerms(academicRes.terms || []);
      }

      setInvoices(invoicesData || []);
    } catch (err: any) {
      toast.error("Failed to initialize billing data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    setRefreshing(true);
    try {
      const data = await getInvoices();
      setInvoices(data || []);
      setSelectedIds(new Set());
    } catch (e: any) {
      toast.error("Failed to refresh invoices");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isCreateOpen && students.length === 0) {
      loadStudents();
    }
  }, [isCreateOpen]);

  const loadStudents = async () => {
    try {
      const res = await getStudents();
      const list = res.success && res.data ? res.data : [];
      setStudents(list);
      if (list.length > 0) {
        setSelectedStudentId(list[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Format currency helper
  const formatMoney = (val: number) => {
    return `${currencySymbol}${val.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Robust Overdue Calculation Check
  const isInvoiceOverdue = (inv: any) => {
    if (inv.status === "PAID" || inv.status === "VOID" || inv.balance <= 0) return false;
    if (!inv.dueDate) return false;
    const due = new Date(inv.dueDate);
    if (isNaN(due.getTime())) return false;
    return due.getTime() < Date.now();
  };

  const getDaysOverdue = (dueDateStr: string) => {
    const diff = Date.now() - new Date(dueDateStr).getTime();
    return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)));
  };

  // Filtered dataset
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // 1. Segment Tab Filter
      if (segmentTab === "UNPAID") {
        if (inv.status === "PAID" || inv.status === "VOID" || inv.balance <= 0) return false;
      } else if (segmentTab === "PAID") {
        if (inv.status !== "PAID") return false;
      } else if (segmentTab === "OVERDUE") {
        if (!isInvoiceOverdue(inv)) return false;
      } else if (segmentTab === "VOID") {
        if (inv.status !== "VOID") return false;
      }

      // 2. Status Dropdown Filter
      if (statusFilter !== "ALL") {
        if (statusFilter === "OVERDUE") {
          if (!isInvoiceOverdue(inv)) return false;
        } else if (statusFilter === "UNPAID") {
          if (inv.status === "PAID" || inv.status === "VOID" || inv.balance <= 0) return false;
        } else if (inv.status !== statusFilter) {
          return false;
        }
      }

      // 3. Class Filter
      if (classFilter !== "ALL") {
        if (inv.student?.class?.id !== classFilter && inv.student?.classId !== classFilter) {
          return false;
        }
      }

      // 4. Term Filter
      if (termFilter !== "ALL") {
        if (inv.termId !== termFilter) {
          return false;
        }
      }

      // 5. Text Search Query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const studentName = `${inv.student?.firstName || ""} ${inv.student?.lastName || ""}`.toLowerCase();
        const studentId = (inv.student?.studentId || "").toLowerCase();
        const invId = (inv.id || "").toLowerCase();
        const desc = (inv.description || "").toLowerCase();
        const className = (inv.student?.class?.name || "").toLowerCase();
        return (
          studentName.includes(q) ||
          studentId.includes(q) ||
          invId.includes(q) ||
          desc.includes(q) ||
          className.includes(q)
        );
      }

      return true;
    });
  }, [invoices, segmentTab, statusFilter, classFilter, termFilter, search]);

  // Analytics (Computed across all non-void invoices)
  const nonVoidInvoices = useMemo(() => invoices.filter((inv) => inv.status !== "VOID"), [invoices]);
  const totalInvoiced = useMemo(() => nonVoidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0), [nonVoidInvoices]);
  const totalCollected = useMemo(() => nonVoidInvoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0), [nonVoidInvoices]);
  const totalOutstanding = useMemo(() => nonVoidInvoices.reduce((sum, inv) => sum + (inv.balance || 0), 0), [nonVoidInvoices]);
  const overdueInvoicesList = useMemo(() => nonVoidInvoices.filter(isInvoiceOverdue), [nonVoidInvoices]);
  const overdueCount = overdueInvoicesList.length;

  // Checkbox selection logic
  const allVisibleSelected =
    filteredInvoices.length > 0 && filteredInvoices.every((inv) => selectedIds.has(inv.id));
  const someVisibleSelected =
    filteredInvoices.some((inv) => selectedIds.has(inv.id)) && !allVisibleSelected;

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      const next = new Set(selectedIds);
      filteredInvoices.forEach((inv) => next.delete(inv.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      filteredInvoices.forEach((inv) => next.add(inv.id));
      setSelectedIds(next);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Card click filters
  const handleCardFilter = (tab: "ALL" | "UNPAID" | "PAID" | "OVERDUE") => {
    setSegmentTab(tab);
    setStatusFilter("ALL");
  };

  // Copy payment link to clipboard
  const handleCopyPaymentLink = (inv: any) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const paymentUrl = `${origin}/dashboard/finance/invoices/${inv.id}`;
    navigator.clipboard.writeText(paymentUrl);
    toast.success(`Payment link copied for invoice INV-${inv.id.slice(-6).toUpperCase()}`, {
      description: paymentUrl,
    });
  };

  // Quick mark paid
  const handleQuickMarkPaid = async (inv: any) => {
    if (inv.balance <= 0) {
      toast.info("Invoice is already fully settled.");
      return;
    }

    const toastId = toast.loading("Recording full payment...");
    try {
      await quickMarkInvoicePaid(inv.id, "CASH");
      toast.success("Payment logged & invoice marked as Paid", { id: toastId });
      fetchInvoices();
    } catch (err: any) {
      toast.error(err.message || "Failed to mark as paid", { id: toastId });
    }
  };

  // Send reminder
  const handleSendReminder = async (inv: any) => {
    const toastId = toast.loading(`Dispatching reminder to guardian...`);
    try {
      const res = await sendInvoiceReminder(inv.id, currencySymbol);
      if (res.success) {
        toast.success(res.message, { id: toastId });
      } else {
        toast.warning(res.message, { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send reminder", { id: toastId });
    }
  };

  // Record Offline Payment Modal Submit
  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalInvoice) return;

    const parsed = parseFloat(payAmount);
    if (isNaN(parsed) || parsed <= 0) {
      toast.error("Please enter a valid amount greater than zero");
      return;
    }
    if (parsed > paymentModalInvoice.balance) {
      toast.error(`Payment cannot exceed outstanding balance of ${formatMoney(paymentModalInvoice.balance)}`);
      return;
    }

    setIsRecordingPayment(true);
    try {
      await recordPayment({
        invoiceId: paymentModalInvoice.id,
        amount: parsed,
        method: payMethod,
        reference: payReference.trim() || undefined,
      });

      toast.success(`Payment of ${formatMoney(parsed)} recorded successfully!`);
      setPaymentModalInvoice(null);
      setPayAmount("");
      setPayReference("");
      fetchInvoices();
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment");
    } finally {
      setIsRecordingPayment(false);
    }
  };

  // Void Invoice Submit
  const handleVoidInvoiceSubmit = async () => {
    if (!voidModalInvoice) return;
    setIsVoiding(true);
    try {
      await voidInvoice(voidModalInvoice.id, voidReason.trim());
      toast.success(`Invoice INV-${voidModalInvoice.id.slice(-6).toUpperCase()} voided successfully.`);
      setVoidModalInvoice(null);
      setVoidReason("");
      fetchInvoices();
    } catch (err: any) {
      toast.error(err.message || "Failed to void invoice");
    } finally {
      setIsVoiding(false);
    }
  };

  // Bulk Actions
  const handleBulkMarkPaid = async () => {
    if (selectedIds.size === 0) return;
    const confirm = window.confirm(
      `Are you sure you want to mark ${selectedIds.size} invoice(s) as PAID via Cash?`
    );
    if (!confirm) return;

    setIsBulkOperating(true);
    const toastId = toast.loading(`Processing ${selectedIds.size} payments...`);
    try {
      const res = await bulkMarkInvoicesPaid(Array.from(selectedIds), "CASH");
      toast.success(`Successfully cleared ${res.successCount} invoice(s)!`, { id: toastId });
      setSelectedIds(new Set());
      fetchInvoices();
    } catch (err: any) {
      toast.error(err.message || "Bulk payment failed", { id: toastId });
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleBulkVoid = async () => {
    if (selectedIds.size === 0) return;
    const confirm = window.confirm(
      `Are you sure you want to VOID ${selectedIds.size} selected invoice(s)? Invoices with existing receipts will be skipped.`
    );
    if (!confirm) return;

    setIsBulkOperating(true);
    const toastId = toast.loading(`Voiding ${selectedIds.size} invoices...`);
    try {
      const res = await bulkVoidInvoices(Array.from(selectedIds));
      toast.success(`Voided ${res.voidedCount} invoice(s). (${res.skippedCount} skipped due to receipts)`, {
        id: toastId,
      });
      setSelectedIds(new Set());
      fetchInvoices();
    } catch (err: any) {
      toast.error(err.message || "Bulk void failed", { id: toastId });
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleBulkSendReminders = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkOperating(true);
    const toastId = toast.loading(`Dispatching fee reminders to ${selectedIds.size} guardians...`);
    let sent = 0;
    let failed = 0;

    for (const id of Array.from(selectedIds)) {
      try {
        await sendInvoiceReminder(id, currencySymbol);
        sent++;
      } catch {
        failed++;
      }
    }

    setIsBulkOperating(false);
    toast.success(`Reminders sent: ${sent} delivered, ${failed} skipped or without contact info.`, {
      id: toastId,
    });
  };

  // Export CSV
  const handleExportCSV = (targetInvoices = filteredInvoices) => {
    if (targetInvoices.length === 0) {
      toast.info("No invoices to export.");
      return;
    }

    const headers = [
      "Invoice Number",
      "Student Name",
      "Student ID",
      "Class",
      "Term",
      "Total Amount",
      "Amount Paid",
      "Balance Due",
      "Due Date",
      "Status",
      "Receipts Count",
      "Created At",
    ];

    const rows = targetInvoices.map((inv) => [
      `INV-${inv.id.slice(-6).toUpperCase()}`,
      `"${inv.student?.firstName || ""} ${inv.student?.lastName || ""}"`,
      inv.student?.studentId || "N/A",
      inv.student?.class?.name || "N/A",
      inv.term?.name || "N/A",
      inv.amount || 0,
      inv.amountPaid || 0,
      inv.balance || 0,
      inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "N/A",
      inv.status,
      inv.receipts?.length || 0,
      new Date(inv.createdAt).toLocaleDateString(),
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `invoices_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${targetInvoices.length} invoices to CSV.`);
  };

  // Create Invoice Submit
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      toast.error("Please select a student");
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid amount greater than zero");
      return;
    }

    if (!description.trim()) {
      toast.error("Please provide a description");
      return;
    }

    setIsSubmitting(true);
    try {
      await createIndividualInvoice({
        studentId: selectedStudentId,
        termId: createTermId || undefined,
        amount: parsedAmount,
        description: description.trim(),
        dueDate: dueDate ? new Date(dueDate) : undefined,
      });

      toast.success("Invoice created successfully");
      setIsCreateOpen(false);
      setDescription("");
      setAmount("");
      setDueDate("");
      fetchInvoices();
    } catch (err: any) {
      toast.error(err.message || "Failed to create invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (inv: any) => {
    if (inv.status === "VOID") {
      return (
        <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[11px]">
          {language === 'ar' ? 'ملغاة' : 'Voided'}
        </Badge>
      );
    }

    if (inv.status === "PAID" || inv.balance <= 0) {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-medium">
          {language === 'ar' ? 'مسددة' : 'Paid'}
        </Badge>
      );
    }

    if (isInvoiceOverdue(inv)) {
      const days = getDaysOverdue(inv.dueDate);
      return (
        <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 text-[11px] font-medium animate-pulse">
          {language === 'ar' ? `متأخرة (${days} يوم)` : `Overdue (${days}d)`}
        </Badge>
      );
    }

    if (inv.status === "PARTIAL" || inv.amountPaid > 0) {
      return (
        <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-[11px] font-medium">
          {language === 'ar' ? 'سداد جزئي' : 'Partial'}
        </Badge>
      );
    }

    return (
      <Badge className="bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20 text-[11px] font-medium">
        {language === 'ar' ? 'غير مسددة' : 'Unpaid'}
      </Badge>
    );
  };

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <FileText className="h-7 w-7 text-primary shrink-0" />
              <span>{language === 'ar' ? 'الرسوم والفواتير المدرسية' : 'Invoices & Billing'}</span>
            </h1>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs hidden sm:inline-flex font-mono numeric-badge">
              {currencyCode} ({currencySymbol})
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            {language === 'ar' 
              ? 'إدارة الرسوم الدراسية للطلاب، متابعة التحصيل، وإصدار الفواتير الرسمية وسندات القبض.'
              : 'Manage student tuition billings, track payment collection statuses, and issue official school invoices.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchInvoices}
            disabled={refreshing}
            className="rounded-xl border-border text-xs gap-1.5"
            title={language === 'ar' ? 'تحديث الفواتير' : 'Refresh Invoices'}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
            <span className="hidden md:inline">{language === 'ar' ? 'تحديث' : 'Refresh'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportCSV(filteredInvoices)}
            className="rounded-xl border-border text-xs gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{language === 'ar' ? 'تصدير CSV' : 'Export CSV'}</span>
          </Button>

          <Link href="/dashboard/finance/payments">
            <Button variant="outline" size="sm" className="rounded-xl border-border text-xs gap-1.5 hidden md:flex">
              <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
              <span>{language === 'ar' ? 'سندات القبض POS' : 'POS Terminal'}</span>
            </Button>
          </Link>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs gap-1.5 shadow-sm">
                <Plus className="h-3.5 w-3.5" />
                <span>{language === 'ar' ? '+ إصدار فاتورة جديدة' : '+ Create / Allocate Invoice'}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] w-[95vw] max-h-[90vh] overflow-y-auto p-5 sm:p-6 rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">Issue New Student Invoice</DialogTitle>
                <DialogDescription className="text-xs">
                  Create an itemized tuition or fee invoice for an individual candidate.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateInvoice} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Target Student *</label>
                  <select
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    required
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.firstName} {s.lastName} ({s.studentId || "No ID"}) — {s.class?.name || "Unassigned"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Academic Term</label>
                  <select
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    value={createTermId}
                    onChange={(e) => setCreateTermId(e.target.value)}
                  >
                    <option value="">Default (Active Academic Term)</option>
                    {terms.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.isActive ? "(Active)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Billing Description / Purpose *</label>
                  <Input
                    placeholder="e.g. Term 1 Tuition & Learning Materials"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="rounded-xl text-xs h-10"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Amount ({currencySymbol}) *</label>
                    <Input
                      type="number"
                      step="any"
                      min="1"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="rounded-xl text-xs h-10 font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Payment Due Date</label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="rounded-xl text-xs h-10"
                    />
                  </div>
                </div>

                <DialogFooter className="pt-3 gap-2 sm:gap-0">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="rounded-xl text-xs">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Issuing...
                      </>
                    ) : (
                      "Issue Invoice"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 4 Clickable Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Invoiced */}
        <Card
          onClick={() => handleCardFilter("ALL")}
          className={`border-border shadow-sm cursor-pointer transition-all hover:scale-[1.01] hover:border-primary/50 ${
            segmentTab === "ALL" && statusFilter === "ALL" ? "ring-2 ring-primary/60 bg-primary/5 border-primary/40" : ""
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 sm:p-5 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {language === 'ar' ? 'إجمالي المطالبات المفوترة' : 'Total Invoiced'}
            </CardTitle>
            <CreditCard className="h-4 w-4 text-primary shrink-0" />
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="text-lg sm:text-2xl font-bold text-foreground font-mono numeric-badge">
              {formatMoney(totalInvoiced)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span>{language === 'ar' ? 'كافة الرسوم المخصصة للطلاب' : 'All active billing allocations'}</span>
              {segmentTab === "ALL" && <Check className="h-3 w-3 text-primary ms-auto" />}
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Total Collected */}
        <Card
          onClick={() => handleCardFilter("PAID")}
          className={`border-border shadow-sm cursor-pointer transition-all hover:scale-[1.01] hover:border-emerald-500/50 ${
            segmentTab === "PAID" ? "ring-2 ring-emerald-500/60 bg-emerald-500/5 border-emerald-500/40" : ""
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 sm:p-5 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {language === 'ar' ? 'إجمالي المبالغ المحصلة' : 'Total Collected'}
            </CardTitle>
            <Receipt className="h-4 w-4 text-emerald-500 shrink-0" />
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono numeric-badge">
              {formatMoney(totalCollected)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span>{language === 'ar' ? 'المبالغ المودعة والمحصلة فعلياً' : 'Cleared & settled funds'}</span>
              {segmentTab === "PAID" && <Check className="h-3 w-3 text-emerald-600 ms-auto" />}
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Total Outstanding */}
        <Card
          onClick={() => handleCardFilter("UNPAID")}
          className={`border-border shadow-sm cursor-pointer transition-all hover:scale-[1.01] hover:border-rose-500/50 ${
            segmentTab === "UNPAID" ? "ring-2 ring-rose-500/60 bg-rose-500/5 border-rose-500/40" : ""
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 sm:p-5 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {language === 'ar' ? 'المبالغ المتبقية للتحصيل' : 'Total Outstanding'}
            </CardTitle>
            <Wallet className="h-4 w-4 text-rose-500 shrink-0" />
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="text-lg sm:text-2xl font-bold text-rose-600 dark:text-rose-400 font-mono numeric-badge">
              {formatMoney(totalOutstanding)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span>{language === 'ar' ? 'انقر لعرض الأرصدة المستحقة' : 'Click to view pending balances'}</span>
              {segmentTab === "UNPAID" && <Check className="h-3 w-3 text-rose-600 ms-auto" />}
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Overdue Invoices */}
        <Card
          onClick={() => handleCardFilter("OVERDUE")}
          className={`border-border shadow-sm cursor-pointer transition-all hover:scale-[1.01] hover:border-amber-500/50 ${
            segmentTab === "OVERDUE" ? "ring-2 ring-amber-500/60 bg-amber-500/5 border-amber-500/40" : ""
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 sm:p-5 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {language === 'ar' ? 'الفواتير المتأخرة' : 'Overdue Invoices'}
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="text-lg sm:text-2xl font-bold text-foreground font-mono numeric-badge">
              {overdueCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span>{language === 'ar' ? 'انقر لتصفية المطالبات المتأخرة' : 'Click to filter overdue bills'}</span>
              {segmentTab === "OVERDUE" && <Check className="h-3 w-3 text-amber-600 ms-auto" />}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar, Search, and Segment Tabs */}
      <Card className="border-border shadow-sm rounded-2xl">
        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Top Row: Segment Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex items-center gap-1.5 p-1 bg-muted rounded-xl border border-border overflow-x-auto max-w-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSegmentTab("ALL")}
                className={`rounded-lg text-xs h-8 px-3 ${
                  segmentTab === "ALL" ? "bg-background text-foreground shadow-sm font-semibold" : "text-muted-foreground"
                }`}
              >
                {language === 'ar' ? `الكل (${invoices.length})` : `All (${invoices.length})`}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSegmentTab("UNPAID")}
                className={`rounded-lg text-xs h-8 px-3 ${
                  segmentTab === "UNPAID" ? "bg-background text-rose-600 dark:text-rose-400 shadow-sm font-semibold" : "text-muted-foreground"
                }`}
              >
                {language === 'ar' ? 'غير مسدد / جزئي' : 'Unpaid / Partial'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSegmentTab("PAID")}
                className={`rounded-lg text-xs h-8 px-3 ${
                  segmentTab === "PAID" ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-sm font-semibold" : "text-muted-foreground"
                }`}
              >
                {language === 'ar' ? 'مسدد بالكامل' : 'Fully Paid'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSegmentTab("OVERDUE")}
                className={`rounded-lg text-xs h-8 px-3 ${
                  segmentTab === "OVERDUE" ? "bg-background text-amber-600 dark:text-amber-400 shadow-sm font-semibold" : "text-muted-foreground"
                }`}
              >
                {language === 'ar' ? `متأخر السداد (${overdueCount})` : `Overdue (${overdueCount})`}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSegmentTab("VOID")}
                className={`rounded-lg text-xs h-8 px-3 ${
                  segmentTab === "VOID" ? "bg-background text-foreground shadow-sm font-semibold" : "text-muted-foreground"
                }`}
              >
                {language === 'ar' ? 'ملغاة' : 'Voided'}
              </Button>
            </div>

            {/* Clear filters button if active */}
            {(search || statusFilter !== "ALL" || classFilter !== "ALL" || termFilter !== "ALL" || segmentTab !== "ALL") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("ALL");
                  setClassFilter("ALL");
                  setTermFilter("ALL");
                  setSegmentTab("ALL");
                }}
                className="text-xs text-muted-foreground hover:text-foreground h-8"
              >
                Reset Filters
              </Button>
            )}
          </div>

          {/* Bottom Row: Search and Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-center">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search candidate, ID, invoice #..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl border-border bg-background"
              />
            </div>

            {/* Class Dropdown */}
            <div>
              <select
                className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary text-foreground"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
              >
                <option value="ALL">All Classes / Cohorts</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Term Dropdown */}
            <div>
              <select
                className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary text-foreground"
                value={termFilter}
                onChange={(e) => setTermFilter(e.target.value)}
              >
                <option value="ALL">All Academic Terms</option>
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.isActive ? "(Active)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Dropdown */}
            <div>
              <select
                className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary text-foreground"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="UNPAID">Unpaid (Balance &gt; 0)</option>
                <option value="PARTIAL">Partial Payment</option>
                <option value="PAID">Fully Paid</option>
                <option value="OVERDUE">Overdue Only</option>
                <option value="VOID">Voided Invoices</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Action Sticky Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="sticky top-20 z-20 flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-primary text-primary-foreground shadow-lg border border-primary/20"
          >
            <div className="flex items-center gap-3">
              <span className="font-bold text-xs sm:text-sm">
                {selectedIds.size} invoice(s) selected
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
                className="h-7 text-xs rounded-lg bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground"
              >
                Deselect All
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={isBulkOperating}
                onClick={() => {
                  const targetList = invoices.filter((i) => selectedIds.has(i.id));
                  handleExportCSV(targetList);
                }}
                className="h-8 text-xs rounded-xl bg-white text-slate-900 hover:bg-slate-100 gap-1.5 shadow-sm"
              >
                <Download className="h-3.5 w-3.5" /> Export Selected
              </Button>

              <Button
                variant="secondary"
                size="sm"
                disabled={isBulkOperating}
                onClick={handleBulkMarkPaid}
                className="h-8 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Mark Paid
              </Button>

              <Button
                variant="secondary"
                size="sm"
                disabled={isBulkOperating}
                onClick={handleBulkSendReminders}
                className="h-8 text-xs rounded-xl bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-sm"
              >
                <Bell className="h-3.5 w-3.5" /> Send Reminders
              </Button>

              <Button
                variant="secondary"
                size="sm"
                disabled={isBulkOperating}
                onClick={handleBulkVoid}
                className="h-8 text-xs rounded-xl bg-rose-600 hover:bg-rose-700 text-white gap-1.5 shadow-sm"
              >
                <Ban className="h-3.5 w-3.5" /> Bulk Void
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Invoices Table Card */}
      <Card className="border-border shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-border flex flex-row items-center justify-between p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm sm:text-base font-bold text-foreground">
              Invoice Ledger ({filteredInvoices.length} of {invoices.length})
            </CardTitle>
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            {currencyCode} Standard
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs">Loading official billing records...</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center">
              <div className="p-4 bg-muted rounded-full mb-3">
                <FileText className="h-8 w-8 text-muted-foreground/60" />
              </div>
              <p className="font-semibold text-foreground text-sm">No invoices match your filters</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Try modifying your search criteria or create a new student invoice using the action button above.
              </p>
              <Button
                size="sm"
                onClick={() => setIsCreateOpen(true)}
                className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs"
              >
                + Create First Invoice
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader className="bg-muted/40">
                  <TableRow className="border-border">
                    <TableHead className="w-10 px-3 text-center">
                      <Checkbox
                        checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all visible invoices"
                      />
                    </TableHead>
                    <TableHead className="w-32 text-xs font-semibold">
                      {language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}
                    </TableHead>
                    <TableHead className="min-w-[180px] text-xs font-semibold">
                      {language === 'ar' ? 'الطالب' : 'Student'}
                    </TableHead>
                    <TableHead className="w-28 text-xs font-semibold">
                      {language === 'ar' ? 'الفصل' : 'Class'}
                    </TableHead>
                    <TableHead className="w-32 text-xs font-semibold">
                      {language === 'ar' ? 'الفصل الدراسي' : 'Term'}
                    </TableHead>
                    <TableHead className="text-end w-28 text-xs font-semibold">
                      {language === 'ar' ? 'الإجمالي' : 'Total'}
                    </TableHead>
                    <TableHead className="text-end w-28 text-xs font-semibold">
                      {language === 'ar' ? 'المدفوع' : 'Paid'}
                    </TableHead>
                    <TableHead className="text-end w-28 text-xs font-semibold">
                      {language === 'ar' ? 'المتبقي' : 'Balance Due'}
                    </TableHead>
                    <TableHead className="w-32 text-center text-xs font-semibold">
                      {language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}
                    </TableHead>
                    <TableHead className="w-28 text-center text-xs font-semibold">
                      {language === 'ar' ? 'الحالة' : 'Status'}
                    </TableHead>
                    <TableHead className="w-16 text-end px-4 text-xs font-semibold">
                      {language === 'ar' ? 'الإجراءات' : 'Actions'}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((inv) => {
                    const isSelected = selectedIds.has(inv.id);
                    const overdue = isInvoiceOverdue(inv);
                    const hasReceipts = inv.receipts && inv.receipts.length > 0;

                    return (
                      <TableRow
                        key={inv.id}
                        className={`border-border hover:bg-muted/30 transition-colors ${
                          isSelected ? "bg-primary/5" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <TableCell className="px-3 text-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(inv.id)}
                            aria-label={`Select invoice ${inv.id}`}
                          />
                        </TableCell>

                        {/* Invoice # */}
                        <TableCell className="py-3 font-mono text-xs font-medium text-foreground">
                          <div className="flex items-center gap-1.5">
                            <span>INV-{inv.id.slice(-6).toUpperCase()}</span>
                            {hasReceipts && (
                              <span
                                title={`${inv.receipts.length} payment receipt(s) recorded`}
                                className="inline-flex items-center text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 p-0.5 rounded"
                              >
                                <Receipt className="h-3 w-3" />
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Student Details */}
                        <TableCell className="py-3">
                          <div className="font-semibold text-foreground text-xs">
                            {inv.student?.firstName} {inv.student?.lastName}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {inv.student?.studentId || "No Admission #"}
                          </div>
                          <div className="text-[11px] text-muted-foreground/80 truncate max-w-[200px]" title={inv.description}>
                            {inv.description}
                          </div>
                        </TableCell>

                        {/* Class */}
                        <TableCell className="py-3 text-xs text-foreground">
                          {inv.student?.class?.name || "—"}
                        </TableCell>

                        {/* Term */}
                        <TableCell className="py-3 text-xs text-muted-foreground">
                          {inv.term?.name || "—"}
                        </TableCell>

                        {/* Total Amount */}
                        <TableCell className="py-3 text-end font-mono text-xs text-foreground">
                          <span className="numeric-badge">{formatMoney(inv.amount || 0)}</span>
                        </TableCell>

                        {/* Amount Paid */}
                        <TableCell className="py-3 text-end font-mono text-xs text-emerald-600 dark:text-emerald-400">
                          <span className="numeric-badge">{formatMoney(inv.amountPaid || 0)}</span>
                        </TableCell>

                        {/* Balance Due */}
                        <TableCell className="py-3 text-end font-mono text-xs font-bold">
                          <span className={`numeric-badge ${inv.balance > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                            {formatMoney(inv.balance || 0)}
                          </span>
                        </TableCell>

                        {/* Due Date */}
                        <TableCell className="py-3 text-center text-xs">
                          {inv.dueDate ? (
                            <div className="flex flex-col items-center">
                              <span className={`numeric-badge ${overdue ? "text-rose-600 font-semibold" : "text-muted-foreground"}`}>
                                {new Date(inv.dueDate).toLocaleDateString()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        {/* Status */}
                        <TableCell className="py-3 text-center">
                          {getStatusBadge(inv)}
                        </TableCell>

                        {/* Actions Menu */}
                        <TableCell className="py-3 text-end px-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 rounded-xl bg-popover border-border shadow-md">
                              <DropdownMenuLabel className="text-xs text-muted-foreground">
                                {language === 'ar' ? 'إجراءات الفاتورة' : 'Invoice Actions'}
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />

                              {/* 1. View / Print */}
                              <Link href={`/dashboard/finance/invoices/${inv.id}`}>
                                <DropdownMenuItem className="text-xs cursor-pointer gap-2 py-2">
                                  <Eye className="h-3.5 w-3.5 text-primary shrink-0" />
                                  <span>{language === 'ar' ? 'عرض وطباعة الفاتورة' : 'View & Print Invoice'}</span>
                                </DropdownMenuItem>
                              </Link>

                              {/* 2. Record Offline Payment */}
                              {inv.status !== "VOID" && inv.balance > 0 && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setPaymentModalInvoice(inv);
                                    setPayAmount(inv.balance.toString());
                                  }}
                                  className="text-xs cursor-pointer gap-2 py-2"
                                >
                                  <CreditCard className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                  <span>{language === 'ar' ? 'تسجيل دفعة وسند قبض' : 'Record Offline Payment'}</span>
                                </DropdownMenuItem>
                              )}

                              {/* 3. Copy Payment Link */}
                              <DropdownMenuItem
                                onClick={() => handleCopyPaymentLink(inv)}
                                className="text-xs cursor-pointer gap-2 py-2"
                              >
                                <LinkIcon className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                                <span>{language === 'ar' ? 'نسخ رابط الدفع' : 'Copy Payment Link'}</span>
                              </DropdownMenuItem>

                              {/* 4. Quick Mark Paid */}
                              {inv.status !== "VOID" && inv.balance > 0 && (
                                <DropdownMenuItem
                                  onClick={() => handleQuickMarkPaid(inv)}
                                  className="text-xs cursor-pointer gap-2 py-2 text-emerald-600 focus:text-emerald-700"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                  <span>{language === 'ar' ? 'تحديد كمسددة فوراً' : 'Quick Mark as Paid'}</span>
                                </DropdownMenuItem>
                              )}

                              {/* 5. Send Reminder */}
                              {inv.status !== "VOID" && inv.balance > 0 && (
                                <DropdownMenuItem
                                  onClick={() => handleSendReminder(inv)}
                                  className="text-xs cursor-pointer gap-2 py-2"
                                >
                                  <Bell className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                  <span>{language === 'ar' ? 'إرسال تذكير بالسداد' : 'Send Reminder'}</span>
                                </DropdownMenuItem>
                              )}

                              {/* 6. Void Invoice */}
                              {inv.status !== "VOID" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setVoidModalInvoice(inv);
                                      setVoidReason("");
                                    }}
                                    className="text-xs cursor-pointer gap-2 py-2 text-rose-600 focus:text-rose-700"
                                  >
                                    <Ban className="h-3.5 w-3.5 shrink-0" />
                                    <span>{language === 'ar' ? 'إلغاء وتفريغ الفاتورة' : 'Void Invoice'}</span>
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Record Offline Payment Dialog */}
      <Dialog open={!!paymentModalInvoice} onOpenChange={(open) => !open && setPaymentModalInvoice(null)}>
        <DialogContent className="sm:max-w-[450px] w-[95vw] rounded-2xl p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Record Offline Payment</DialogTitle>
            <DialogDescription className="text-xs">
              Log manual cash, bank wire, or POS terminal collections against this invoice.
            </DialogDescription>
          </DialogHeader>

          {paymentModalInvoice && (
            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4 pt-2">
              <div className="p-3 bg-muted/60 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice:</span>
                  <span className="font-mono font-semibold">INV-{paymentModalInvoice.id.slice(-6).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Candidate:</span>
                  <span className="font-semibold">
                    {paymentModalInvoice.student?.firstName} {paymentModalInvoice.student?.lastName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Outstanding Balance:</span>
                  <span className="font-bold text-rose-600 font-mono">
                    {formatMoney(paymentModalInvoice.balance)}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Payment Amount ({currencySymbol}) *</label>
                <Input
                  type="number"
                  step="any"
                  min="1"
                  max={paymentModalInvoice.balance}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="rounded-xl text-xs h-10 font-mono font-bold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Payment Method *</label>
                <select
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary text-foreground"
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                >
                  <option value="CASH">Cash / Physical Counter</option>
                  <option value="BANK_TRANSFER">Direct Bank Transfer</option>
                  <option value="POS">POS Terminal / Card</option>
                  <option value="CHEQUE">Bank Draft / Cheque</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Reference / Teller / Slip #</label>
                <Input
                  placeholder="e.g. GTB-TRF-9281920 or POS-8812"
                  value={payReference}
                  onChange={(e) => setPayReference(e.target.value)}
                  className="rounded-xl text-xs h-10 font-mono"
                />
              </div>

              <DialogFooter className="pt-3 gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPaymentModalInvoice(null)}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isRecordingPayment}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs"
                >
                  {isRecordingPayment ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Recording...
                    </>
                  ) : (
                    "Confirm Payment Receipt"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Void Invoice Dialog */}
      <Dialog open={!!voidModalInvoice} onOpenChange={(open) => !open && setVoidModalInvoice(null)}>
        <DialogContent className="sm:max-w-[440px] w-[95vw] rounded-2xl p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-rose-600 flex items-center gap-2">
              <Ban className="h-5 w-5" /> Void Invoice
            </DialogTitle>
            <DialogDescription className="text-xs">
              Voiding cancels this billing document and zeros out any remaining outstanding balance.
            </DialogDescription>
          </DialogHeader>

          {voidModalInvoice && (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-muted/60 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice:</span>
                  <span className="font-mono font-semibold">INV-{voidModalInvoice.id.slice(-6).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Student:</span>
                  <span className="font-semibold">
                    {voidModalInvoice.student?.firstName} {voidModalInvoice.student?.lastName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-mono">{formatMoney(voidModalInvoice.amount)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Reason for Voiding</label>
                <Input
                  placeholder="e.g. Duplicate allocation, concession granted"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="rounded-xl text-xs h-10"
                />
              </div>

              <DialogFooter className="pt-3 gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setVoidModalInvoice(null)}
                  className="rounded-xl text-xs"
                >
                  Keep Invoice
                </Button>
                <Button
                  type="button"
                  onClick={handleVoidInvoiceSubmit}
                  disabled={isVoiding}
                  className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs"
                >
                  {isVoiding ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Voiding...
                    </>
                  ) : (
                    "Confirm Void"
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
