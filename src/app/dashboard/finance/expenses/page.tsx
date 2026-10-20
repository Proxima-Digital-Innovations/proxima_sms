"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  Calendar,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  Search,
  Download,
  Printer,
  SlidersHorizontal,
  FileText,
  Paperclip,
  CheckCircle2,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Building2,
  CreditCard,
  Layers,
  Eye,
  ExternalLink,
  RotateCcw,
  CheckSquare,
  Square
} from "lucide-react";
import { 
  getExpenses, 
  getExpenseSummary, 
  recordExpense, 
  updateExpense, 
  deleteExpense, 
  bulkDeleteExpenses 
} from "@/actions/expense-actions";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { format, startOfMonth, subDays, isSameMonth } from "date-fns";
import { cn } from "@/lib/utils";

// Category badge colors
const CATEGORY_COLORS: Record<string, string> = {
  "Utilities": "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  "Maintenance & Repairs": "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  "School Supplies": "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  "Software Subscriptions": "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20",
  "Payroll": "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  "Logistics & Fuel": "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20",
  "Laboratory": "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  "Events & Sports": "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20",
  "General": "bg-muted text-muted-foreground border-border",
};

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "POS", label: "POS / Card" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "CORPORATE_CARD", label: "Corporate Card" },
];

function exportExpensesToCsv(filename: string, rows: any[]) {
  if (!rows.length) return;
  const headers = ["ID", "Date", "Category", "Description", "Vendor", "Department", "Payment Method", "Amount", "Receipt", "Notes"];
  const csvRows = [
    headers.join(","),
    ...rows.map(r => [
      `"${r.id}"`,
      `"${format(new Date(r.date), 'yyyy-MM-dd')}"`,
      `"${r.category}"`,
      `"${(r.description || '').replace(/"/g, '""')}"`,
      `"${(r.vendor || '').replace(/"/g, '""')}"`,
      `"${(r.department || 'General').replace(/"/g, '""')}"`,
      `"${r.paymentMethod || 'CASH'}"`,
      r.amount,
      `"${r.receiptUrl || 'None'}"`,
      `"${(r.notes || '').replace(/"/g, '""')}"`,
    ].join(","))
  ];
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function ExpensesPage() {
  const { data: session } = useSession();

  // Data & loading states
  const [expenses, setExpenses] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [search, setSearch] = useState("");
  const [dateRangePreset, setDateRangePreset] = useState<"THIS_MONTH" | "LAST_30" | "ALL" | "CUSTOM">("THIS_MONTH");
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("ALL");

  // Sorting & Pagination
  const [sortField, setSortField] = useState<"date" | "amount">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Create / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail view state
  const [activeExpenseDetail, setActiveExpenseDetail] = useState<any | null>(null);

  // Form Fields
  const [formCategory, setFormCategory] = useState("Utilities");
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDepartment, setFormDepartment] = useState("");
  const [formPaymentMethod, setFormPaymentMethod] = useState("CASH");
  const [formVendor, setFormVendor] = useState("");
  const [formDate, setFormDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formReceiptUrl, setFormReceiptUrl] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let filterOpts: any = {};
      if (dateRangePreset === "THIS_MONTH") {
        const now = new Date();
        filterOpts.month = now.getMonth() + 1;
        filterOpts.year = now.getFullYear();
      } else if (dateRangePreset === "LAST_30") {
        filterOpts.startDate = format(subDays(new Date(), 30), "yyyy-MM-dd");
        filterOpts.endDate = format(new Date(), "yyyy-MM-dd");
      } else if (dateRangePreset === "CUSTOM") {
        if (startDate) filterOpts.startDate = startDate;
        if (endDate) filterOpts.endDate = endDate;
      }

      if (categoryFilter !== "ALL") filterOpts.category = categoryFilter;
      if (departmentFilter !== "ALL") filterOpts.department = departmentFilter;
      if (paymentMethodFilter !== "ALL") filterOpts.paymentMethod = paymentMethodFilter;

      const [list, sum] = await Promise.all([
        getExpenses(filterOpts),
        getExpenseSummary(),
      ]);

      setExpenses(list);
      setSummary(sum);
    } catch (e: any) {
      toast.error(e.message || "Failed to load expenses data");
    } finally {
      setLoading(false);
    }
  }, [dateRangePreset, startDate, endDate, categoryFilter, departmentFilter, paymentMethodFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Client-side search and sorting
  const processedExpenses = useMemo(() => {
    let result = [...expenses];

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(e => 
        e.description?.toLowerCase().includes(q) ||
        e.vendor?.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q) ||
        e.department?.toLowerCase().includes(q) ||
        e.paymentMethod?.toLowerCase().includes(q) ||
        e.amount?.toString().includes(q)
      );
    }

    result.sort((a, b) => {
      if (sortField === "date") {
        const timeA = new Date(a.date).getTime();
        const timeB = new Date(b.date).getTime();
        return sortDirection === "asc" ? timeA - timeB : timeB - timeA;
      } else {
        return sortDirection === "asc" ? a.amount - b.amount : b.amount - a.amount;
      }
    });

    return result;
  }, [expenses, search, sortField, sortDirection]);

  // Pagination slice
  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedExpenses.slice(start, start + pageSize);
  }, [processedExpenses, currentPage, pageSize]);

  const totalPages = Math.ceil(processedExpenses.length / pageSize) || 1;

  // Toggle sort
  const handleSort = (field: "date" | "amount") => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedIds.length === paginatedExpenses.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedExpenses.map(e => e.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingExpense(null);
    setFormCategory("Utilities");
    setFormDescription("");
    setFormAmount("");
    setFormDepartment("");
    setFormPaymentMethod("CASH");
    setFormVendor("");
    setFormDate(format(new Date(), "yyyy-MM-dd"));
    setFormReceiptUrl("");
    setFormNotes("");
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (exp: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingExpense(exp);
    setFormCategory(exp.category || "General");
    setFormDescription(exp.description || "");
    setFormAmount(exp.amount?.toString() || "");
    setFormDepartment(exp.department || "");
    setFormPaymentMethod(exp.paymentMethod || "CASH");
    setFormVendor(exp.vendor || "");
    setFormDate(format(new Date(exp.date), "yyyy-MM-dd"));
    setFormReceiptUrl(exp.receiptUrl || "");
    setFormNotes(exp.notes || "");
    setIsModalOpen(true);
  };

  // Save (Create or Update)
  const handleSave = async () => {
    const trimmedDesc = formDescription.trim();
    const parsedAmount = parseFloat(formAmount);

    if (!trimmedDesc) {
      toast.error("Please enter a description for the expense");
      return;
    }

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid amount greater than zero");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          category: formCategory,
          description: trimmedDesc,
          amount: parsedAmount,
          date: formDate ? new Date(formDate) : new Date(),
          department: formDepartment.trim() || undefined,
          paymentMethod: formPaymentMethod,
          vendor: formVendor.trim() || undefined,
          receiptUrl: formReceiptUrl.trim() || undefined,
          notes: formNotes.trim() || undefined,
        });
        toast.success("Expense updated successfully");
      } else {
        const currentUserId = (session?.user as any)?.id;
        await recordExpense({
          category: formCategory,
          description: trimmedDesc,
          amount: parsedAmount,
          date: formDate ? new Date(formDate) : new Date(),
          department: formDepartment.trim() || undefined,
          paymentMethod: formPaymentMethod,
          vendor: formVendor.trim() || undefined,
          receiptUrl: formReceiptUrl.trim() || undefined,
          notes: formNotes.trim() || undefined,
          recordedBy: currentUserId,
        });
        toast.success("Expense recorded successfully");
      }
      setIsModalOpen(false);
      await fetchData();
    } catch (e: any) {
      toast.error(e.message || "Failed to save expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Single
  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Are you sure you want to delete this expense record?")) return;
    try {
      await deleteExpense(id);
      toast.success("Expense deleted");
      setSelectedIds(prev => prev.filter(item => item !== id));
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete expense");
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!confirm(`Are you sure you want to permanently delete ${selectedIds.length} selected expenses?`)) return;
    try {
      await bulkDeleteExpenses(selectedIds);
      toast.success(`Deleted ${selectedIds.length} expenses`);
      setSelectedIds([]);
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete selected expenses");
    }
  };

  // Export selected or all filtered
  const handleExport = (exportAll = false) => {
    const listToExport = exportAll || selectedIds.length === 0
      ? processedExpenses 
      : processedExpenses.filter(e => selectedIds.includes(e.id));

    if (!listToExport.length) {
      toast.error("No expenses found to export");
      return;
    }

    exportExpensesToCsv(`expenses_export_${format(new Date(), "yyyy-MM-dd")}`, listToExport);
    toast.success(`Exported ${listToExport.length} expense records to CSV`);
  };

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      {/* Top Header Card */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-background p-5 sm:p-6 rounded-2xl border border-border shadow-sm w-full min-w-0">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500/20 to-amber-600/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0 shadow-sm">
            <Wallet className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight truncate">
                General Expenses Ledger
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                Disbursements & Costs
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">
              Manage operational disbursements, departmental spending, receipts, and cost auditing.
            </p>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto justify-start lg:justify-end shrink-0 flex-wrap">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleExport(true)}
            className="rounded-xl border-border bg-background hover:bg-muted font-medium text-xs h-9"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            Export CSV
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.print()}
            className="rounded-xl border-border bg-background hover:bg-muted font-medium text-xs h-9"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            Print Ledger
          </Button>
          <Button 
            onClick={handleOpenCreate} 
            size="sm" 
            className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs h-9 shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Log Expense
          </Button>
        </div>
      </div>

      {/* 4 Stronger Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total This Month with % comparison */}
        <Card className="bg-card border-border/80 rounded-2xl p-5 shadow-sm hover:border-border transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total This Month</span>
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-foreground mt-2 tracking-tight">
            ₦{(summary?.totalThisMonth || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-2 mt-2">
            {summary?.pctChange !== undefined && (
              <span className={cn(
                "inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-md border",
                summary.pctChange > 0 
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" 
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              )}>
                {summary.pctChange > 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                {summary.pctChange > 0 ? `+${summary.pctChange}%` : `${summary.pctChange}%`}
              </span>
            )}
            <span className="text-[11px] text-muted-foreground">vs. last month</span>
          </div>
        </Card>

        {/* Card 2: Top Spending Category */}
        <Card className="bg-card border-border/80 rounded-2xl p-5 shadow-sm hover:border-border transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Top Category</span>
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-foreground mt-2 truncate tracking-tight">
            {summary?.topCategory?.category || "None"}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
              ₦{(summary?.topCategory?.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-muted-foreground">
              ({summary?.topCategory?.percentage || 0}% of all outflows)
            </span>
          </div>
        </Card>

        {/* Card 3: Total Entries & Departments */}
        <Card className="bg-card border-border/80 rounded-2xl p-5 shadow-sm hover:border-border transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Entries</span>
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-foreground mt-2 tracking-tight">
            {summary?.totalEntries || 0}
          </p>
          <p className="text-[11px] text-muted-foreground mt-2">
            Across {(summary?.departments?.length || 0)} operating departments
          </p>
        </Card>

        {/* Card 4: Category Distribution Mini Visualizer */}
        <Card className="bg-card border-border/80 rounded-2xl p-5 shadow-sm hover:border-border transition-colors flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Cost Distribution</span>
              <span className="text-[10px] font-semibold text-muted-foreground">Top 3</span>
            </div>
            <div className="space-y-2 mt-3">
              {(summary?.categoryBreakdown || []).slice(0, 3).map((c: any, i: number) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-medium text-foreground truncate max-w-[120px]">{c.category}</span>
                    <span className="text-muted-foreground font-mono">{c.percentage}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full",
                        i === 0 ? "bg-rose-500" : i === 1 ? "bg-amber-500" : "bg-blue-500"
                      )} 
                      style={{ width: `${c.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
              {(!summary?.categoryBreakdown || summary.categoryBreakdown.length === 0) && (
                <p className="text-xs text-muted-foreground italic py-2">No category data logged yet.</p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card className="bg-card border-border shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <CardTitle className="text-sm font-bold text-foreground tracking-tight">
                Ledger Filtering & Search
              </CardTitle>
            </div>

            {/* Quick Date Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-muted-foreground mr-1">Range:</span>
              <button 
                type="button" 
                onClick={() => setDateRangePreset("THIS_MONTH")}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-lg font-medium transition-colors border",
                  dateRangePreset === "THIS_MONTH" 
                    ? "bg-rose-600 text-white border-rose-600 shadow-sm" 
                    : "bg-muted text-muted-foreground hover:text-foreground border-border/60"
                )}
              >
                This Month
              </button>
              <button 
                type="button" 
                onClick={() => setDateRangePreset("LAST_30")}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-lg font-medium transition-colors border",
                  dateRangePreset === "LAST_30" 
                    ? "bg-rose-600 text-white border-rose-600 shadow-sm" 
                    : "bg-muted text-muted-foreground hover:text-foreground border-border/60"
                )}
              >
                Last 30 Days
              </button>
              <button 
                type="button" 
                onClick={() => setDateRangePreset("ALL")}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-lg font-medium transition-colors border",
                  dateRangePreset === "ALL" 
                    ? "bg-rose-600 text-white border-rose-600 shadow-sm" 
                    : "bg-muted text-muted-foreground hover:text-foreground border-border/60"
                )}
              >
                All Time
              </button>
              <button 
                type="button" 
                onClick={() => setDateRangePreset("CUSTOM")}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-lg font-medium transition-colors border",
                  dateRangePreset === "CUSTOM" 
                    ? "bg-rose-600 text-white border-rose-600 shadow-sm" 
                    : "bg-muted text-muted-foreground hover:text-foreground border-border/60"
                )}
              >
                Custom Range
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            {/* Search input */}
            <div className="lg:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Search Expenses
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="Search description, vendor, amount..." 
                  value={search} 
                  onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} 
                  className="pl-9 bg-background border-border text-foreground rounded-xl h-10 text-sm focus-visible:ring-rose-500" 
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Category
              </label>
              <select 
                value={categoryFilter} 
                onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }} 
                className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-rose-500 outline-none"
              >
                <option value="ALL">All Categories</option>
                <option value="Utilities">Utilities</option>
                <option value="Maintenance & Repairs">Maintenance & Repairs</option>
                <option value="School Supplies">School Supplies</option>
                <option value="Software Subscriptions">Software Subscriptions</option>
                <option value="Payroll">Payroll</option>
                <option value="Logistics & Fuel">Logistics & Fuel</option>
                <option value="Laboratory">Laboratory</option>
                <option value="Events & Sports">Events & Sports</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Department Filter */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Department
              </label>
              <select 
                value={departmentFilter} 
                onChange={e => { setDepartmentFilter(e.target.value); setCurrentPage(1); }} 
                className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-rose-500 outline-none"
              >
                <option value="ALL">All Departments</option>
                {(summary?.departments || []).map((dept: string) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Payment Method Filter */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Payment Method
              </label>
              <select 
                value={paymentMethodFilter} 
                onChange={e => { setPaymentMethodFilter(e.target.value); setCurrentPage(1); }} 
                className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-rose-500 outline-none"
              >
                <option value="ALL">All Methods</option>
                {PAYMENT_METHODS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom Date Pickers (Shown if CUSTOM selected) */}
          {dateRangePreset === "CUSTOM" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-border/60">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Start Date
                </label>
                <Input 
                  type="date" 
                  value={startDate} 
                  onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }} 
                  className="bg-background border-border text-foreground rounded-xl h-10 text-sm focus-visible:ring-rose-500" 
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  End Date
                </label>
                <Input 
                  type="date" 
                  value={endDate} 
                  onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }} 
                  className="bg-background border-border text-foreground rounded-xl h-10 text-sm focus-visible:ring-rose-500" 
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Action Bar (When rows selected) */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-primary/10 border border-primary/30 p-4 rounded-2xl text-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span>{selectedIds.length} expense(s) selected</span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleExport(false)} 
              className="rounded-xl border-border bg-background hover:bg-muted text-xs font-semibold h-8"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Export Selected
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleBulkDelete} 
              className="rounded-xl text-xs font-semibold h-8"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Delete Selected
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSelectedIds([])} 
              className="rounded-xl text-xs text-muted-foreground hover:text-foreground h-8"
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Main Expense Table */}
      <Card className="bg-card border-border shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-border/80 bg-muted/20">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <CardTitle className="text-base font-bold text-foreground tracking-tight">
                Expense Transaction Ledger
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Showing {processedExpenses.length} entries matching current criteria. Click any row for details.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Rows per page:</span>
              <select 
                value={pageSize} 
                onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="h-8 rounded-lg border border-border bg-background px-2 text-xs font-medium text-foreground outline-none"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40 border-b border-border">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="w-10 pl-6">
                    <button 
                      type="button" 
                      onClick={handleSelectAll} 
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {selectedIds.length > 0 && selectedIds.length === paginatedExpenses.length ? (
                        <CheckSquare className="w-4 h-4 text-rose-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead 
                    onClick={() => handleSort("date")}
                    className="cursor-pointer hover:text-foreground text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11"
                  >
                    <div className="flex items-center gap-1">
                      <span>Date</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </TableHead>
                  <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11">Category</TableHead>
                  <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11">Description & Merchant</TableHead>
                  <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11">Department</TableHead>
                  <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11">Payment Method</TableHead>
                  <TableHead 
                    onClick={() => handleSort("amount")}
                    className="cursor-pointer hover:text-foreground text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11 text-right"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Amount (₦)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </TableHead>
                  <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11 text-center">Receipt</TableHead>
                  <TableHead className="pr-6 text-muted-foreground font-bold uppercase tracking-wider text-[11px] h-11 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="animate-pulse">
                      <TableCell colSpan={9} className="py-4 text-center">
                        <div className="h-6 bg-muted/60 rounded-md mx-6" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : paginatedExpenses.map((exp) => {
                  const isSelected = selectedIds.includes(exp.id);
                  const hasReceipt = Boolean(exp.receiptUrl && exp.receiptUrl.trim());
                  return (
                    <TableRow 
                      key={exp.id} 
                      onClick={() => setActiveExpenseDetail(exp)}
                      className={cn(
                        "border-b border-border hover:bg-muted/40 transition-colors cursor-pointer",
                        isSelected && "bg-primary/5"
                      )}
                    >
                      {/* Checkbox */}
                      <TableCell className="pl-6 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <button 
                          type="button" 
                          onClick={() => handleToggleSelect(exp.id)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-rose-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </TableCell>

                      {/* Date */}
                      <TableCell className="font-mono text-xs text-foreground whitespace-nowrap">
                        {format(new Date(exp.date), "MMM d, yyyy")}
                      </TableCell>

                      {/* Category */}
                      <TableCell>
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border",
                          CATEGORY_COLORS[exp.category] || CATEGORY_COLORS["General"]
                        )}>
                          {exp.category}
                        </span>
                      </TableCell>

                      {/* Description & Vendor */}
                      <TableCell>
                        <div>
                          <p className="font-semibold text-foreground text-sm">{exp.description}</p>
                          {exp.vendor && (
                            <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3 h-3" />
                              {exp.vendor}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* Department */}
                      <TableCell className="text-foreground text-xs font-medium">
                        {exp.department || <span className="text-muted-foreground italic">General</span>}
                      </TableCell>

                      {/* Payment Method */}
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-[11px] font-medium text-foreground border border-border/80">
                          <CreditCard className="w-3 h-3 mr-1 text-muted-foreground" />
                          {exp.paymentMethod?.replace("_", " ") || "CASH"}
                        </span>
                      </TableCell>

                      {/* Amount */}
                      <TableCell className="text-right font-black font-mono text-sm text-foreground">
                        ₦{exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>

                      {/* Receipt / Attachment indicator */}
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        {hasReceipt ? (
                          <a 
                            href={exp.receiptUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-medium hover:underline"
                          >
                            <Paperclip className="w-3 h-3" />
                            Receipt
                          </a>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/60 italic">No file</span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={(e) => handleOpenEdit(exp, e)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={(e) => handleDelete(exp.id, e)}
                            className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Empty State */}
          {!loading && processedExpenses.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <div className="w-14 h-14 rounded-2xl bg-muted/60 border border-border flex items-center justify-center mb-3">
                <Wallet className="h-7 w-7 text-muted-foreground/70" />
              </div>
              <p className="text-base font-semibold text-foreground">No Expenses Found</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm text-center">
                No expense entries match your selected date range and filter criteria.
              </p>
              <Button 
                onClick={handleOpenCreate} 
                size="sm" 
                className="mt-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs h-9"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Log First Expense
              </Button>
            </div>
          )}

          {/* Pagination Footer */}
          {processedExpenses.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-border/80 bg-muted/10 text-xs text-muted-foreground">
              <div>
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, processedExpenses.length)} of {processedExpenses.length} entries
              </div>
              <div className="flex items-center gap-1.5">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg h-8 text-xs font-semibold border-border"
                >
                  Previous
                </Button>
                <span className="px-3 py-1 font-mono font-medium text-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg h-8 text-xs font-semibold border-border"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log / Edit Expense Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[540px] rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              {editingExpense ? "Edit Expense Record" : "Record New General Expense"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Fill in the details below to document and audit school disbursements.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Category</label>
                <select
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                >
                  <option value="Utilities">Utilities (Power, Water)</option>
                  <option value="Maintenance & Repairs">Maintenance & Repairs</option>
                  <option value="School Supplies">School Supplies</option>
                  <option value="Software Subscriptions">Software Subscriptions</option>
                  <option value="Payroll">Payroll</option>
                  <option value="Logistics & Fuel">Logistics & Fuel</option>
                  <option value="Laboratory">Laboratory & Science</option>
                  <option value="Events & Sports">Events & Sports</option>
                  <option value="Other">Other / Miscellaneous</option>
                </select>
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Amount (₦)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  className="rounded-xl h-10 font-mono font-semibold"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Description / Purpose</label>
              <Input
                placeholder="e.g. Diesel for generator 100L"
                className="rounded-xl h-10"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Department */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Department (Optional)</label>
                <Input
                  placeholder="e.g. Admin, Sciences, Transport"
                  className="rounded-xl h-10"
                  value={formDepartment}
                  onChange={(e) => setFormDepartment(e.target.value)}
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Payment Method</label>
                <select
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                  value={formPaymentMethod}
                  onChange={(e) => setFormPaymentMethod(e.target.value)}
                >
                  {PAYMENT_METHODS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Vendor / Merchant */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Vendor / Supplier</label>
                <Input
                  placeholder="e.g. TotalEnergies, Stationery World"
                  className="rounded-xl h-10"
                  value={formVendor}
                  onChange={(e) => setFormVendor(e.target.value)}
                />
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Expense Date</label>
                <Input
                  type="date"
                  className="rounded-xl h-10"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>
            </div>

            {/* Receipt URL / Attachment link */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Receipt File / Document URL (Optional)
              </label>
              <Input
                placeholder="https://... or invoice/receipt link"
                className="rounded-xl h-10"
                value={formReceiptUrl}
                onChange={(e) => setFormReceiptUrl(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Audit Notes / Authorization</label>
              <Input
                placeholder="e.g. Approved by Principal via voucher #892"
                className="rounded-xl h-10"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="pt-3 gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSubmitting} 
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingExpense ? "Save Changes" : "Confirm & Log Expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Modal */}
      {activeExpenseDetail && (
        <Dialog open={Boolean(activeExpenseDetail)} onOpenChange={(open) => !open && setActiveExpenseDetail(null)}>
          <DialogContent className="sm:max-w-[500px] rounded-2xl bg-card border-border">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-lg font-bold text-foreground">Expense Detail Audit</DialogTitle>
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                  CATEGORY_COLORS[activeExpenseDetail.category] || CATEGORY_COLORS["General"]
                )}>
                  {activeExpenseDetail.category}
                </span>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                ID: {activeExpenseDetail.id}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl bg-muted/40 border border-border/80 text-center">
                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Disbursed</span>
                <p className="text-3xl font-black font-mono text-foreground mt-1">
                  ₦{activeExpenseDetail.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground font-semibold">Description:</span>
                  <p className="font-medium text-foreground mt-0.5">{activeExpenseDetail.description}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">Expense Date:</span>
                  <p className="font-medium text-foreground mt-0.5">{format(new Date(activeExpenseDetail.date), "PPP")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">Department:</span>
                  <p className="font-medium text-foreground mt-0.5">{activeExpenseDetail.department || "General Administration"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">Payment Method:</span>
                  <p className="font-medium text-foreground mt-0.5">{activeExpenseDetail.paymentMethod?.replace("_", " ") || "Cash"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">Vendor / Payee:</span>
                  <p className="font-medium text-foreground mt-0.5">{activeExpenseDetail.vendor || "N/A"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">Logged By:</span>
                  <p className="font-medium text-foreground mt-0.5">
                    {activeExpenseDetail.recordedByU 
                      ? `${activeExpenseDetail.recordedByU.firstName} ${activeExpenseDetail.recordedByU.lastName}` 
                      : "System Staff"}
                  </p>
                </div>
              </div>

              {activeExpenseDetail.notes && (
                <div className="text-xs pt-2 border-t border-border">
                  <span className="text-muted-foreground font-semibold">Audit Notes:</span>
                  <p className="font-medium text-foreground mt-0.5">{activeExpenseDetail.notes}</p>
                </div>
              )}

              {activeExpenseDetail.receiptUrl && (
                <div className="pt-2 border-t border-border">
                  <a 
                    href={activeExpenseDetail.receiptUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold hover:underline w-full justify-center"
                  >
                    <Paperclip className="w-4 h-4" />
                    Open Attached Receipt / Document
                    <ExternalLink className="w-3 h-3 ml-auto" />
                  </a>
                </div>
              )}
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  const exp = activeExpenseDetail;
                  setActiveExpenseDetail(null);
                  handleOpenEdit(exp);
                }}
                className="rounded-xl text-xs font-semibold"
              >
                <Edit2 className="w-3.5 h-3.5 mr-1" />
                Edit Record
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => setActiveExpenseDetail(null)}
                className="rounded-xl text-xs font-semibold"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
