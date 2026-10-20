"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Search,
  CreditCard,
  Banknote,
  Landmark,
  CheckCircle2,
  Wallet,
  Receipt,
  Printer,
  History,
  FileText,
  Loader2,
  School,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Send,
  Download,
  Plus,
  Calendar,
  Filter,
  Check,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  MoreVertical,
  Users,
  X,
  Clock,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import QRCode from "qrcode";
import {
  getStudentInvoicesForPOS,
  recordPayment,
  getPaymentReceipts,
  verifyPendingPayment,
  reversePayment,
  resendReceiptNotification,
  getPaymentCashiers,
  getDailyPaymentSummaries,
} from "@/actions/billing-actions";
import { getSystemSettings } from "@/actions/system-actions";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function PaymentsPage() {
  const { data: session } = useSession();

  // Receipt Data & Loading State
  const [receipts, setReceipts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cashiers, setCashiers] = useState<any[]>([]);

  // Filtering & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [cashierFilter, setCashierFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState<"ALL" | "TODAY" | "WEEK" | "MONTH" | "CUSTOM">("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [studentFilter, setStudentFilter] = useState<string | null>(null);

  // Active Receipt & QR Code Modal
  const [activeReceipt, setActiveReceipt] = useState<any | null>(null);
  const [activeReceiptQr, setActiveReceiptQr] = useState<string>("");
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Reversal Dialog State
  const [reversalReceipt, setReversalReceipt] = useState<any | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [notifyGuardianOnReversal, setNotifyGuardianOnReversal] = useState(true);
  const [isReversing, setIsReversing] = useState(false);

  // Verification Conflict Dialog State (for stuck pending payments)
  const [pendingReceiptToVerify, setPendingReceiptToVerify] = useState<any | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyConflictMessage, setVerifyConflictMessage] = useState<string | null>(null);

  // Direct Payment Entry (POS Modal) State
  const [isPosOpen, setIsPosOpen] = useState(false);
  const [posSearch, setPosSearch] = useState("");
  const [isPosSearching, setIsPosSearching] = useState(false);
  const [posInvoices, setPosInvoices] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [posAmount, setPosAmount] = useState("");
  const [posMethod, setPosMethod] = useState("CASH");
  const [posReference, setPosReference] = useState("");
  const [posPayerName, setPosPayerName] = useState("");
  const [posStatus, setPosStatus] = useState("VERIFIED");
  const [isSubmittingPos, setIsSubmittingPos] = useState(false);

  // End-of-Day Cash-Up Drawer / Dialog State
  const [isCashUpOpen, setIsCashUpOpen] = useState(false);
  const [dailySummaries, setDailySummaries] = useState<any[]>([]);
  const [loadingCashUp, setLoadingCashUp] = useState(false);

  // Bank Statement CSV Reconciliation Modal State
  const [isReconcilerOpen, setIsReconcilerOpen] = useState(false);
  const [bankStatementRaw, setBankStatementRaw] = useState("");
  const [statementMatches, setStatementMatches] = useState<any[]>([]);
  const [isAnalyzingStatement, setIsAnalyzingStatement] = useState(false);

  // Institutional Settings
  const [schoolInfo, setSchoolInfo] = useState({
    name: "Proxima SMS Academy",
    address: "12 Education Avenue, Knowledge District",
    phone: "+234 (0) 800 123 4567",
    email: "bursary@proximaschools.edu",
    logo: null as string | null,
    currencySymbol: "₦",
  });

  // Fetch initial data
  useEffect(() => {
    fetchReceipts();
    loadMetadata();
  }, []);

  async function loadMetadata() {
    try {
      const [settingsRes, cashiersRes] = await Promise.all([
        getSystemSettings(),
        getPaymentCashiers(),
      ]);
      if (settingsRes.success && settingsRes.data) {
        setSchoolInfo({
          name: settingsRes.data.schoolName || "Proxima SMS Academy",
          address: settingsRes.data.schoolAddress || "12 Education Avenue, Knowledge District",
          phone: settingsRes.data.schoolPhone || "+234 (0) 800 123 4567",
          email: settingsRes.data.schoolEmail || "bursary@proximaschools.edu",
          logo: settingsRes.data.schoolLogo || null,
          currencySymbol: settingsRes.data.currencySymbol || "₦",
        });
      }
      setCashiers(cashiersRes || []);
    } catch (err) {
      console.error("Failed to load metadata:", err);
    }
  }

  async function fetchReceipts() {
    setIsLoading(true);
    try {
      const res = await getPaymentReceipts({
        limit: 1000,
      });
      if (res.success) {
        setReceipts(res.receipts || []);
      } else {
        toast.error(res.message || "Failed to load payment receipts");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error loading payments");
    } finally {
      setIsLoading(false);
    }
  }

  // Generate Scannable QR Code using live dynamic domain
  useEffect(() => {
    if (activeReceipt?.id) {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const verifyUrl = `${origin}/verify/receipt/${activeReceipt.id}`;
      QRCode.toDataURL(verifyUrl, {
        width: 160,
        margin: 1,
        color: { dark: "#0f172a", light: "#ffffff" },
      })
        .then((url) => setActiveReceiptQr(url))
        .catch((err) => console.error("QR Code Error:", err));
    } else {
      setActiveReceiptQr("");
    }
  }, [activeReceipt]);

  // Open Receipt Modal & Preview
  const handleOpenReceipt = (receipt: any) => {
    setActiveReceipt(receipt);
    setIsReceiptOpen(true);
  };

  // Re-send Receipt Notification
  const handleResendReceipt = async (receiptId: string) => {
    toast.loading("Dispatching receipt to guardian...", { id: "resend-toast" });
    try {
      const res = await resendReceiptNotification(receiptId);
      if (res.success) {
        toast.success(res.message, { id: "resend-toast" });
      } else {
        toast.error(res.message || "Failed to dispatch receipt notification", { id: "resend-toast" });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send receipt", { id: "resend-toast" });
    }
  };

  // Verify Pending Payment
  const handleVerifyPayment = async (receiptId: string, force = false) => {
    setIsVerifying(true);
    try {
      const res = await verifyPendingPayment(receiptId, { force });
      if (res.success) {
        toast.success(res.message);
        setPendingReceiptToVerify(null);
        setVerifyConflictMessage(null);
        fetchReceipts();
      } else {
        if (res.code === "INVOICE_MISSING_OR_VOID") {
          setVerifyConflictMessage(res.message);
        } else {
          toast.error(res.message || "Verification failed");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Error verifying payment");
    } finally {
      setIsVerifying(false);
    }
  };

  // Reverse Payment Submission
  const handleConfirmReversal = async () => {
    if (!reversalReceipt || !reversalReason.trim()) {
      toast.error("Please provide a valid reason for this reversal");
      return;
    }

    setIsReversing(true);
    try {
      const res = await reversePayment({
        receiptId: reversalReceipt.id,
        reason: reversalReason.trim(),
        notifyGuardian: notifyGuardianOnReversal,
      });

      if (res.success) {
        toast.success(res.message);
        setReversalReceipt(null);
        setReversalReason("");
        fetchReceipts();
      } else {
        toast.error(res.message || "Failed to reverse payment");
      }
    } catch (err: any) {
      toast.error(err.message || "Error reversing payment");
    } finally {
      setIsReversing(false);
    }
  };

  // Open Cash-Up Drawer
  const handleOpenCashUp = async () => {
    setIsCashUpOpen(true);
    setLoadingCashUp(true);
    try {
      const summaries = await getDailyPaymentSummaries(30);
      setDailySummaries(summaries);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCashUp(false);
    }
  };

  // POS Student Search
  const handlePosSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!posSearch.trim()) return;

    setIsPosSearching(true);
    setSelectedInvoice(null);
    try {
      const invoices = await getStudentInvoicesForPOS(posSearch.trim());
      setPosInvoices(invoices);
      if (invoices.length === 0) {
        toast.info("No unpaid or partial invoices found for this query.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to search student invoices");
    } finally {
      setIsPosSearching(false);
    }
  };

  // POS Submit Payment
  const handleSubmitPosPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    const parsedAmount = parseFloat(posAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid positive amount");
      return;
    }

    if (parsedAmount > selectedInvoice.balance) {
      toast.error(`Amount cannot exceed the balance of ${schoolInfo.currencySymbol}${selectedInvoice.balance.toLocaleString()}`);
      return;
    }

    setIsSubmittingPos(true);
    try {
      const loggedById = (session?.user as any)?.id;
      const res = await recordPayment({
        invoiceId: selectedInvoice.id,
        amount: parsedAmount,
        method: posMethod,
        reference: posReference.trim() || undefined,
        payerName: posPayerName.trim() || undefined,
        status: posStatus,
        loggedById,
      });

      if (res.success) {
        toast.success(posStatus === "PENDING" ? "Payment recorded as Pending Verification." : "Payment posted and verified!");
        setIsPosOpen(false);
        setActiveReceipt(res.receipt);
        setIsReceiptOpen(true);
        setSelectedInvoice(null);
        setPosAmount("");
        setPosReference("");
        setPosPayerName("");
        setPosStatus("VERIFIED");
        setPosSearch("");
        setPosInvoices([]);
        fetchReceipts();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment");
    } finally {
      setIsSubmittingPos(false);
    }
  };

  // Bank Statement CSV Matching Parser
  const handleAnalyzeStatement = () => {
    if (!bankStatementRaw.trim()) {
      toast.error("Please paste bank statement entries or references");
      return;
    }

    setIsAnalyzingStatement(true);
    try {
      const lines = bankStatementRaw.split("\n").map((l) => l.trim()).filter(Boolean);
      const matches: any[] = [];

      lines.forEach((line) => {
        // Attempt to extract reference or amount from line
        const tokens = line.split(/[,\t|;]/).map((t) => t.trim().replace(/^["']|["']$/g, ""));
        const possibleRef = tokens.find((t) => t.length >= 6 && /[A-Za-z0-9]/.test(t)) || line;
        const possibleAmountToken = tokens.find((t) => /^[0-9]+(\.[0-9]{1,2})?$/.test(t.replace(/,/g, "")));
        const statementAmount = possibleAmountToken ? parseFloat(possibleAmountToken.replace(/,/g, "")) : null;

        // Check if any receipt in database matches this reference
        const matched = receipts.find(
          (r) =>
            r.reference &&
            (r.reference.toLowerCase().includes(possibleRef.toLowerCase()) ||
              possibleRef.toLowerCase().includes(r.reference.toLowerCase()))
        );

        matches.push({
          rawLine: line,
          extractedRef: possibleRef,
          statementAmount,
          matchedReceipt: matched || null,
          status: matched ? (matched.status === "VERIFIED" ? "MATCHED_VERIFIED" : "MATCHED_PENDING") : "UNMATCHED",
        });
      });

      setStatementMatches(matches);
      toast.success(`Analyzed ${lines.length} statement entries.`);
    } catch (err: any) {
      toast.error("Error parsing statement text");
    } finally {
      setIsAnalyzingStatement(false);
    }
  };

  // Filtered Receipts Calculation
  const filteredReceipts = useMemo(() => {
    return receipts.filter((rcpt) => {
      // Search query (receipt #, reference, student name, admission #, payer)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const receiptNo = `rcp-${rcpt.id.slice(-8)}`.toLowerCase();
        const ref = (rcpt.reference || "").toLowerCase();
        const payer = (rcpt.payerName || "").toLowerCase();
        const sFirst = (rcpt.invoice?.student?.firstName || "").toLowerCase();
        const sLast = (rcpt.invoice?.student?.lastName || "").toLowerCase();
        const sId = (rcpt.invoice?.student?.studentId || "").toLowerCase();

        const matches =
          receiptNo.includes(q) ||
          ref.includes(q) ||
          payer.includes(q) ||
          sFirst.includes(q) ||
          sLast.includes(q) ||
          sId.includes(q);
        if (!matches) return false;
      }

      // Method filter
      if (methodFilter !== "ALL" && rcpt.method !== methodFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== "ALL" && rcpt.status !== statusFilter) {
        return false;
      }

      // Cashier filter
      if (cashierFilter !== "ALL" && rcpt.loggedById !== cashierFilter) {
        return false;
      }

      // Specific Student filter
      if (studentFilter && rcpt.invoice?.student?.id !== studentFilter && rcpt.invoice?.student?.studentId !== studentFilter) {
        return false;
      }

      // Quick Date filter
      if (dateFilter !== "ALL") {
        const rcptDate = new Date(rcpt.date);
        const now = new Date();
        if (dateFilter === "TODAY") {
          const isToday =
            rcptDate.getDate() === now.getDate() &&
            rcptDate.getMonth() === now.getMonth() &&
            rcptDate.getFullYear() === now.getFullYear();
          if (!isToday) return false;
        } else if (dateFilter === "WEEK") {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(now.getDate() - 7);
          if (rcptDate < oneWeekAgo) return false;
        } else if (dateFilter === "MONTH") {
          const isThisMonth =
            rcptDate.getMonth() === now.getMonth() &&
            rcptDate.getFullYear() === now.getFullYear();
          if (!isThisMonth) return false;
        } else if (dateFilter === "CUSTOM") {
          if (startDate && rcptDate < new Date(startDate)) return false;
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (rcptDate > end) return false;
          }
        }
      }

      return true;
    });
  }, [receipts, searchQuery, methodFilter, statusFilter, cashierFilter, dateFilter, startDate, endDate, studentFilter]);

  // Aggregate KPI Calculations
  const stats = useMemo(() => {
    let totalAll = 0;
    let transferAll = 0;
    let posAll = 0;
    let cashAll = 0;

    receipts.forEach((r) => {
      if (r.status !== "REVERSED") {
        totalAll += r.amount;
        const m = (r.method || "CASH").toUpperCase();
        if (m.includes("TRANS")) transferAll += r.amount;
        else if (m.includes("CARD") || m.includes("POS")) posAll += r.amount;
        else if (m.includes("CASH")) cashAll += r.amount;
      }
    });

    return { totalAll, transferAll, posAll, cashAll };
  }, [receipts]);

  // Format monetary amount
  const formatMoney = (val: number) => {
    return `${schoolInfo.currencySymbol}${Number(val || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Export Filtered Table to CSV
  const handleExportCSV = () => {
    if (filteredReceipts.length === 0) {
      toast.info("No receipts available to export");
      return;
    }

    const headers = [
      "Receipt Number",
      "Date & Time",
      "Student Name",
      "Student ID",
      "Class",
      "Payer Name",
      "Amount",
      "Method",
      "Reference",
      "Status",
      "Recorded By",
    ];

    const rows = filteredReceipts.map((r) => [
      `RCP-${r.id.slice(-8).toUpperCase()}`,
      new Date(r.date).toLocaleString(),
      `"${r.invoice?.student ? `${r.invoice.student.firstName} ${r.invoice.student.lastName}` : "Student"}"`,
      r.invoice?.student?.studentId || "N/A",
      r.invoice?.student?.class?.name || "General",
      `"${r.payerName || "Direct"}"`,
      r.amount,
      r.method,
      `"${r.reference || "-"}"`,
      r.status,
      `"${r.loggedBy ? `${r.loggedBy.firstName} ${r.loggedBy.lastName}` : "Bursar"}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Payment_Receipts_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredReceipts.length} receipt records to CSV`);
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
              <Wallet className="h-8 w-8 text-emerald-600" />
              Payment Receipts & Cashier Ledger
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              {receipts.length} Total Receipts
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Institutional cash register, collection channels, automated QR verification, and bursary ledger reconciliation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleOpenCashUp} className="gap-1.5">
            <Calendar className="h-4 w-4 text-primary" />
            <span>Daily Cash-Up</span>
          </Button>

          <Button variant="outline" size="sm" onClick={() => setIsReconcilerOpen(true)} className="gap-1.5">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Bank Reconciler</span>
          </Button>

          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsPosOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Direct Payment Entry</span>
          </Button>
        </div>
      </div>

      {/* 4 Interactive Summary Cards (Click to Filter by Channel) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Collections */}
        <Card
          onClick={() => setMethodFilter("ALL")}
          className={`cursor-pointer transition-all border-border shadow-sm hover:border-primary/50 ${
            methodFilter === "ALL" ? "ring-2 ring-primary bg-primary/5" : "bg-card"
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Collections
            </CardTitle>
            <Wallet className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black font-mono text-foreground">
              {formatMoney(stats.totalAll)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Click to view all active channels
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Bank Transfers */}
        <Card
          onClick={() => setMethodFilter("TRANSFER")}
          className={`cursor-pointer transition-all border-border shadow-sm hover:border-primary/50 ${
            methodFilter === "TRANSFER" ? "ring-2 ring-primary bg-primary/5" : "bg-card"
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Bank Transfers
            </CardTitle>
            <Landmark className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black font-mono text-blue-600">
              {formatMoney(stats.transferAll)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Direct deposit & electronic transfers
            </p>
          </CardContent>
        </Card>

        {/* Card 3: POS / Cards */}
        <Card
          onClick={() => setMethodFilter("CARD")}
          className={`cursor-pointer transition-all border-border shadow-sm hover:border-primary/50 ${
            methodFilter === "CARD" ? "ring-2 ring-primary bg-primary/5" : "bg-card"
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              POS & Card Swipes
            </CardTitle>
            <CreditCard className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black font-mono text-purple-600">
              {formatMoney(stats.posAll)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Physical terminal collections
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Cash Collections */}
        <Card
          onClick={() => setMethodFilter("CASH")}
          className={`cursor-pointer transition-all border-border shadow-sm hover:border-primary/50 ${
            methodFilter === "CASH" ? "ring-2 ring-primary bg-primary/5" : "bg-card"
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cash in Till
            </CardTitle>
            <Banknote className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black font-mono text-emerald-600">
              {formatMoney(stats.cashAll)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Physical cashier collections
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Filter & Segment Toolbar */}
      <div className="space-y-4">
        {/* Status Segment Tabs */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <Tabs
            value={statusFilter}
            onValueChange={(val) => setStatusFilter(val)}
            className="w-full sm:w-auto"
          >
            <TabsList className="bg-muted p-1">
              <TabsTrigger value="ALL" className="text-xs">
                All Transactions ({receipts.length})
              </TabsTrigger>
              <TabsTrigger value="VERIFIED" className="text-xs text-emerald-600">
                Verified ({receipts.filter((r) => r.status === "VERIFIED").length})
              </TabsTrigger>
              <TabsTrigger value="PENDING" className="text-xs text-amber-600">
                Pending Verification ({receipts.filter((r) => r.status === "PENDING").length})
              </TabsTrigger>
              <TabsTrigger value="REVERSED" className="text-xs text-rose-600">
                Reversed ({receipts.filter((r) => r.status === "REVERSED").length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Quick Date Range Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-muted-foreground mr-1 text-[11px] font-medium">Date:</span>
            {[
              { id: "ALL", label: "All Time" },
              { id: "TODAY", label: "Today" },
              { id: "WEEK", label: "This Week" },
              { id: "MONTH", label: "This Month" },
              { id: "CUSTOM", label: "Custom Range" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setDateFilter(p.id as any)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  dateFilter === p.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Inputs (if selected) */}
        {dateFilter === "CUSTOM" && (
          <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl border border-border text-xs">
            <span className="font-semibold text-foreground">Custom Range:</span>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 w-36 text-xs"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 w-36 text-xs"
              />
            </div>
            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
              >
                Clear Dates
              </Button>
            )}
          </div>
        )}

        {/* Student Filter Chip */}
        {studentFilter && (
          <div className="flex items-center gap-2 p-2 px-3 bg-primary/10 border border-primary/20 rounded-lg text-xs w-fit">
            <span className="font-semibold text-primary">Filtered by Student:</span>
            <span className="font-mono">{studentFilter}</span>
            <button
              onClick={() => setStudentFilter(null)}
              className="hover:bg-primary/20 p-0.5 rounded-full"
            >
              <X className="h-3 w-3 text-primary" />
            </button>
          </div>
        )}

        {/* Search and Dropdowns Bar */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by receipt #, reference, student name, admission #, payer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Method Dropdown */}
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-[140px] h-10 text-xs">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Channels</SelectItem>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="CARD">POS / Card</SelectItem>
                <SelectItem value="CHEQUE">Cheque</SelectItem>
              </SelectContent>
            </Select>

            {/* Cashier / Recorded By Dropdown */}
            <Select value={cashierFilter} onValueChange={setCashierFilter}>
              <SelectTrigger className="w-[170px] h-10 text-xs">
                <SelectValue placeholder="Recorded By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Cashiers</SelectItem>
                {cashiers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.firstName} {c.lastName} ({c.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Reset Filters */}
            {(searchQuery || methodFilter !== "ALL" || statusFilter !== "ALL" || cashierFilter !== "ALL" || dateFilter !== "ALL" || studentFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setMethodFilter("ALL");
                  setStatusFilter("ALL");
                  setCashierFilter("ALL");
                  setDateFilter("ALL");
                  setStartDate("");
                  setEndDate("");
                  setStudentFilter(null);
                }}
                className="h-10 text-xs text-muted-foreground hover:text-foreground"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Payment Receipts Table */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
              <span>Loading cashier ledger records...</span>
            </div>
          ) : filteredReceipts.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground space-y-3">
              <Receipt className="h-12 w-12 text-muted-foreground/30 mx-auto" />
              <div className="text-base font-bold text-foreground">No Payment Receipts Found</div>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No payment transactions matched your current search filters or date range.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setMethodFilter("ALL");
                  setStatusFilter("ALL");
                  setCashierFilter("ALL");
                  setDateFilter("ALL");
                  setStudentFilter(null);
                }}
              >
                Clear All Filters
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[120px]">Receipt #</TableHead>
                    <TableHead className="w-[140px]">Date & Time</TableHead>
                    <TableHead className="min-w-[180px]">Student</TableHead>
                    <TableHead className="min-w-[120px]">Payer</TableHead>
                    <TableHead className="text-right w-[120px]">Amount</TableHead>
                    <TableHead className="w-[110px]">Method</TableHead>
                    <TableHead className="w-[130px]">Reference</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="min-w-[140px]">Recorded By</TableHead>
                    <TableHead className="text-right w-[90px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReceipts.map((rcpt) => {
                    const student = rcpt.invoice?.student;
                    const studentFullName = student ? `${student.firstName} ${student.lastName}` : "Student";
                    const isToday =
                      new Date(rcpt.date).toDateString() === new Date().toDateString();

                    return (
                      <TableRow key={rcpt.id} className="hover:bg-muted/40">
                        {/* Receipt # */}
                        <TableCell className="font-mono text-xs font-bold text-foreground">
                          <div className="flex items-center gap-1.5">
                            <span>RCP-{rcpt.id.slice(-8).toUpperCase()}</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(`RCP-${rcpt.id.slice(-8).toUpperCase()}`);
                                      toast.success("Copied receipt number to clipboard");
                                    }}
                                    className="text-muted-foreground hover:text-foreground"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Copy Receipt #</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>

                        {/* Date & Time */}
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          <div>
                            {new Date(rcpt.date).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                          <div className="text-[10px] opacity-80 flex items-center gap-1">
                            {new Date(rcpt.date).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {isToday && (
                              <span className="px-1 bg-emerald-500/10 text-emerald-600 rounded text-[9px] font-bold">
                                Today
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Student */}
                        <TableCell className="text-xs">
                          <div className="font-bold text-foreground flex items-center gap-1.5">
                            <span>{studentFullName}</span>
                            {student && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => setStudentFilter(student.studentId || student.id)}
                                      className="text-muted-foreground hover:text-primary"
                                    >
                                      <Filter className="h-3 w-3" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>View all payments for {studentFullName}</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {student?.studentId || "N/A"} • {student?.class?.name || "General"}
                          </div>
                        </TableCell>

                        {/* Payer */}
                        <TableCell className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {rcpt.payerName || studentFullName}
                          </span>
                        </TableCell>

                        {/* Amount */}
                        <TableCell className="text-right font-mono font-bold text-sm text-foreground">
                          {formatMoney(rcpt.amount)}
                        </TableCell>

                        {/* Method */}
                        <TableCell>
                          <Badge variant="outline" className="text-[11px] font-medium gap-1">
                            {rcpt.method === "CASH" && <Banknote className="h-3 w-3 text-emerald-600" />}
                            {rcpt.method === "TRANSFER" && <Landmark className="h-3 w-3 text-blue-600" />}
                            {rcpt.method === "CARD" && <CreditCard className="h-3 w-3 text-purple-600" />}
                            {rcpt.method === "CHEQUE" && <FileText className="h-3 w-3 text-amber-600" />}
                            {rcpt.method}
                          </Badge>
                        </TableCell>

                        {/* Reference */}
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {rcpt.reference || "-"}
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          {rcpt.status === "VERIFIED" && (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Verified
                            </Badge>
                          )}
                          {rcpt.status === "PENDING" && (
                            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] gap-1">
                              <Clock className="h-3 w-3" /> Pending
                            </Badge>
                          )}
                          {rcpt.status === "REVERSED" && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px] gap-1 cursor-help">
                                    <AlertTriangle className="h-3 w-3" /> Reversed
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p className="font-bold">Reversal Reason:</p>
                                  <p className="text-xs">{rcpt.reversalReason || "Administrative reversal"}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </TableCell>

                        {/* Recorded By */}
                        <TableCell className="text-xs text-muted-foreground">
                          <div className="font-medium text-foreground">
                            {rcpt.loggedBy ? `${rcpt.loggedBy.firstName} ${rcpt.loggedBy.lastName}` : "Bursar"}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {rcpt.loggedBy?.role || "STAFF"}
                          </div>
                        </TableCell>

                        {/* Actions Dropdown */}
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuLabel className="text-xs">Receipt Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />

                              {/* Print Official Receipt */}
                              <DropdownMenuItem onClick={() => handleOpenReceipt(rcpt)} className="gap-2 text-xs">
                                <Printer className="h-4 w-4 text-primary" />
                                <span>Print Official Receipt</span>
                              </DropdownMenuItem>

                              {/* Verify / Reconcile (for Pending) */}
                              {rcpt.status === "PENDING" && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setPendingReceiptToVerify(rcpt);
                                    handleVerifyPayment(rcpt.id, false);
                                  }}
                                  className="gap-2 text-xs text-emerald-600"
                                >
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                  <span>Verify / Reconcile</span>
                                </DropdownMenuItem>
                              )}

                              {/* Re-send Receipt */}
                              <DropdownMenuItem
                                onClick={() => handleResendReceipt(rcpt.id)}
                                className="gap-2 text-xs"
                              >
                                <Send className="h-4 w-4 text-blue-600" />
                                <span>Re-send to Parent</span>
                              </DropdownMenuItem>

                              {/* View Linked Invoice */}
                              {rcpt.invoiceId && (
                                <DropdownMenuItem asChild className="gap-2 text-xs">
                                  <Link href={`/dashboard/finance/invoices?search=${rcpt.invoiceId}`}>
                                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                    <span>View Linked Invoice</span>
                                  </Link>
                                </DropdownMenuItem>
                              )}

                              {/* Reverse Payment (for Verified) */}
                              {rcpt.status === "VERIFIED" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setReversalReceipt(rcpt)}
                                    className="gap-2 text-xs text-destructive focus:text-destructive"
                                  >
                                    <RotateCcw className="h-4 w-4 text-destructive" />
                                    <span>Reverse Payment</span>
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

      {/* MODAL 1: OFFICIAL PRINTABLE RECEIPT PREVIEW (WITH DYNAMIC QR CODE) */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="sm:max-w-[560px] w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6 bg-card border-border">
          <DialogHeader className="pb-2 border-b border-border">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-emerald-600 font-bold text-lg">
                <CheckCircle2 className="h-5 w-5" /> Official Payment Receipt
              </DialogTitle>
              <Badge
                variant="outline"
                className={`font-mono text-xs ${
                  activeReceipt?.status === "VERIFIED"
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                    : activeReceipt?.status === "PENDING"
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                    : "bg-rose-500/10 text-rose-600 border-rose-500/30"
                }`}
              >
                {activeReceipt?.status || "VERIFIED"}
              </Badge>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Digitally certified institutional receipt registered on the Proxima SMS ledger.
            </DialogDescription>
          </DialogHeader>

          {activeReceipt && (
            <div className="space-y-4 pt-3 text-sm">
              {/* Institution & Receipt Identifier */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
                <div className="flex items-center gap-3">
                  {schoolInfo.logo ? (
                    <img src={schoolInfo.logo} alt="Logo" className="w-10 h-10 object-contain rounded-md" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <School className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-foreground text-sm leading-snug">{schoolInfo.name}</h4>
                    <p className="text-[11px] text-muted-foreground">{schoolInfo.address}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Receipt No</span>
                  <span className="font-mono text-xs font-bold text-foreground">
                    RCP-{activeReceipt.id?.slice(-8).toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Student & Payment Breakdown Grid */}
              <div className="grid grid-cols-2 gap-2.5 p-3.5 bg-card rounded-xl border border-border text-xs">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Student Name</span>
                  <span className="font-bold text-foreground text-sm">
                    {activeReceipt.invoice?.student
                      ? `${activeReceipt.invoice.student.firstName} ${activeReceipt.invoice.student.lastName}`
                      : "Student"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Student ID / Cohort</span>
                  <span className="font-mono font-semibold text-foreground">
                    {activeReceipt.invoice?.student?.studentId || "N/A"} • {activeReceipt.invoice?.student?.class?.name || "General"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Payment Channel</span>
                  <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                    <CreditCard className="h-3.5 w-3.5 text-primary" /> {activeReceipt.method}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Date & Time</span>
                  <span className="font-mono text-muted-foreground">
                    {new Date(activeReceipt.date || Date.now()).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {activeReceipt.reference && (
                  <div className="col-span-2 pt-1 border-t border-border/60">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Transaction Reference</span>
                    <span className="font-mono text-xs text-foreground">{activeReceipt.reference}</span>
                  </div>
                )}
                {activeReceipt.payerName && (
                  <div className="col-span-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Payer / Depositor</span>
                    <span className="font-semibold text-foreground">{activeReceipt.payerName}</span>
                  </div>
                )}
              </div>

              {/* Settlement Highlight Box */}
              <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 block">Amount Settled</span>
                  <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                    {formatMoney(activeReceipt.amount)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-muted-foreground block">Remaining Balance</span>
                  <span className="font-mono font-bold text-sm text-foreground">
                    {activeReceipt.invoice?.balance != null ? formatMoney(activeReceipt.invoice.balance) : `${schoolInfo.currencySymbol}0.00`}
                  </span>
                </div>
              </div>

              {/* Live QR Verification Badge */}
              <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-xl border border-border">
                {activeReceiptQr ? (
                  <img src={activeReceiptQr} alt="QR Verification" className="w-20 h-20 bg-white p-1 rounded-lg border" />
                ) : (
                  <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                )}
                <div className="space-y-1 text-xs">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    Scannable Ledger QR Code
                  </span>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Scan with any smartphone camera to verify this receipt online against the institutional general ledger.
                  </p>
                  <Link
                    href={`/verify/receipt/${activeReceipt.id}`}
                    target="_blank"
                    className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    Open Live Verification Page <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => window.print()} className="gap-1.5">
              <Printer className="h-4 w-4" /> Print Official Receipt
            </Button>
            <Button onClick={() => setIsReceiptOpen(false)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: DIRECT PAYMENT ENTRY (POS MODAL) */}
      <Dialog open={isPosOpen} onOpenChange={setIsPosOpen}>
        <DialogContent className="sm:max-w-[560px] w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Plus className="h-5 w-5 text-emerald-600" /> Direct Payment Entry (Cashier POS)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Search student, choose an outstanding invoice, and record payment into the ledger.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Lookup Form */}
            <form onSubmit={handlePosSearch} className="flex gap-2">
              <Input
                placeholder="Student Name, ID, or Invoice ID..."
                value={posSearch}
                onChange={(e) => setPosSearch(e.target.value)}
                className="h-10 text-xs"
              />
              <Button type="submit" disabled={isPosSearching || !posSearch.trim()} className="bg-emerald-600 text-white h-10 text-xs">
                {isPosSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lookup"}
              </Button>
            </form>

            {/* Invoices List */}
            {posInvoices.length > 0 && (
              <div className="space-y-2 border rounded-xl p-3 bg-muted/30 max-h-48 overflow-y-auto">
                <span className="text-xs font-bold text-foreground block">Select Outstanding Invoice:</span>
                {posInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    onClick={() => {
                      setSelectedInvoice(inv);
                      setPosAmount(inv.balance.toString());
                    }}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex justify-between items-center ${
                      selectedInvoice?.id === inv.id
                        ? "bg-emerald-500/10 border-emerald-600 text-foreground font-semibold"
                        : "bg-background border-border hover:bg-muted"
                    }`}
                  >
                    <div>
                      <div className="font-bold">
                        {inv.student?.firstName} {inv.student?.lastName} ({inv.student?.studentId})
                      </div>
                      <div className="text-[11px] text-muted-foreground">{inv.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-rose-600 font-bold">{formatMoney(inv.balance)}</div>
                      <div className="text-[10px] text-muted-foreground">Total: {formatMoney(inv.amount)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Payment Details Form */}
            {selectedInvoice && (
              <form onSubmit={handleSubmitPosPayment} className="space-y-3 pt-2 border-t border-border">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Amount to Pay</label>
                    <Input
                      type="number"
                      step="any"
                      min="1"
                      max={selectedInvoice.balance}
                      required
                      value={posAmount}
                      onChange={(e) => setPosAmount(e.target.value)}
                      className="font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Payment Channel</label>
                    <Select value={posMethod} onValueChange={setPosMethod}>
                      <SelectTrigger className="h-10 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Cash in Hand</SelectItem>
                        <SelectItem value="TRANSFER">Bank Transfer</SelectItem>
                        <SelectItem value="CARD">POS / Card</SelectItem>
                        <SelectItem value="CHEQUE">Bank Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Reference / Slip #</label>
                    <Input
                      placeholder="e.g. TRF-90218, POS Auth"
                      value={posReference}
                      onChange={(e) => setPosReference(e.target.value)}
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Payer / Depositor Name</label>
                    <Input
                      placeholder="e.g. Dr. Adamu (Father)"
                      value={posPayerName}
                      onChange={(e) => setPosPayerName(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold">Initial Status</label>
                  <Select value={posStatus} onValueChange={setPosStatus}>
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VERIFIED">Verified & Settled Immediately</SelectItem>
                      <SelectItem value="PENDING">Pending (Uncleared Cheque / Bank Notice)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmittingPos || !posAmount || parseFloat(posAmount) <= 0}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 mt-2"
                >
                  {isSubmittingPos ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Recording Payment...
                    </>
                  ) : (
                    `Confirm & Post (${posAmount ? formatMoney(parseFloat(posAmount)) : "₦0.00"})`
                  )}
                </Button>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: PAYMENT REVERSAL REASON DIALOG */}
      <Dialog open={!!reversalReceipt} onOpenChange={(open) => !open && setReversalReceipt(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive font-bold text-base">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Reverse Payment Receipt
            </DialogTitle>
            <DialogDescription className="text-xs">
              Reversing this receipt will restore the student&apos;s invoice balance and record an official audit log.
            </DialogDescription>
          </DialogHeader>

          {reversalReceipt && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 bg-muted/60 rounded-xl space-y-1 border border-border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Receipt #:</span>
                  <span className="font-mono font-bold">RCP-{reversalReceipt.id.slice(-8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-mono font-bold text-destructive">{formatMoney(reversalReceipt.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Student:</span>
                  <span className="font-semibold">
                    {reversalReceipt.invoice?.student?.firstName} {reversalReceipt.invoice?.student?.lastName}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground block">
                  Reversal Reason (Mandatory Audit Note)
                </label>
                <Textarea
                  placeholder="e.g., Cheque returned unpaid, Duplicate cashier entry, Wrong student ledger credited..."
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  rows={3}
                  className="text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="notifyGuardian"
                  checked={notifyGuardianOnReversal}
                  onChange={(e) => setNotifyGuardianOnReversal(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="notifyGuardian" className="text-muted-foreground cursor-pointer">
                  Notify guardian via email / WhatsApp regarding this reversal
                </label>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setReversalReceipt(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isReversing || !reversalReason.trim()}
              onClick={handleConfirmReversal}
            >
              {isReversing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Reversing...
                </>
              ) : (
                "Confirm Reversal"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: VERIFY CONFLICT DIALOG (FOR STUCK PENDING PAYMENTS) */}
      <Dialog open={!!verifyConflictMessage} onOpenChange={(open) => !open && setVerifyConflictMessage(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600 font-bold text-base">
              <Clock className="h-5 w-5" /> Pending Payment Notice
            </DialogTitle>
            <DialogDescription className="text-xs">
              {verifyConflictMessage}
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs space-y-2 text-amber-900 dark:text-amber-200">
            <p className="font-semibold">Resolution Options:</p>
            <ul className="list-disc list-inside space-y-1 text-[11px] opacity-90">
              <li><strong>Force Verify:</strong> Posts the payment into general school revenue without modifying the void invoice.</li>
              <li><strong>Force Reverse:</strong> Cancels this pending receipt cleanly from the register.</li>
            </ul>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setVerifyConflictMessage(null)}>
              Cancel
            </Button>
            {pendingReceiptToVerify && (
              <>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setVerifyConflictMessage(null);
                    setReversalReceipt(pendingReceiptToVerify);
                  }}
                >
                  Force Reverse
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  size="sm"
                  onClick={() => handleVerifyPayment(pendingReceiptToVerify.id, true)}
                >
                  Force Verify
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 5: END-OF-DAY CASH-UP DIALOG */}
      <Dialog open={isCashUpOpen} onOpenChange={setIsCashUpOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Calendar className="h-5 w-5 text-primary" /> End-of-Day Cash-Up & Daily Totals
            </DialogTitle>
            <DialogDescription className="text-xs">
              Daily reconciliation summaries across cash in till, bank transfers, POS swipes, and cheques.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {loadingCashUp ? (
              <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading daily summaries...
              </div>
            ) : dailySummaries.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs">
                No collection records available for the last 30 days.
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-right text-xs">Cash in Till</TableHead>
                    <TableHead className="text-right text-xs">Bank Transfers</TableHead>
                    <TableHead className="text-right text-xs">POS / Cards</TableHead>
                    <TableHead className="text-right text-xs font-bold">Daily Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailySummaries.map((s) => (
                    <TableRow key={s.date} className="text-xs">
                      <TableCell className="font-semibold text-foreground">
                        {new Date(s.date).toLocaleDateString("en-GB", {
                          weekday: "short",
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                        <span className="block text-[10px] text-muted-foreground font-mono">
                          {s.count} transaction(s)
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-emerald-600">
                        {formatMoney(s.cash)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-blue-600">
                        {formatMoney(s.transfer)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-purple-600">
                        {formatMoney(s.card)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-black text-foreground">
                        {formatMoney(s.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsCashUpOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 6: BANK STATEMENT CSV AUTO-MATCHER */}
      <Dialog open={isReconcilerOpen} onOpenChange={setIsReconcilerOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" /> Bank Statement CSV Reconciler
            </DialogTitle>
            <DialogDescription className="text-xs">
              Paste statement lines (Reference, Amount, Narration) to match bank credits against logged receipts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground block">
                Paste Statement Entries or References (one per line)
              </label>
              <Textarea
                placeholder={`e.g.
REF-7LAXNIBY, 1896, Tuition Transfer
TRF-90218, 50000, JSS1 Term Fees
STANBIC-0012, 25000, PTA Levy`}
                value={bankStatementRaw}
                onChange={(e) => setBankStatementRaw(e.target.value)}
                rows={4}
                className="font-mono text-xs"
              />
              <div className="flex justify-between items-center pt-1">
                <span className="text-[11px] text-muted-foreground">
                  Compares references against {receipts.length} system receipts.
                </span>
                <Button
                  size="sm"
                  onClick={handleAnalyzeStatement}
                  disabled={isAnalyzingStatement || !bankStatementRaw.trim()}
                  className="bg-emerald-600 text-white text-xs h-8"
                >
                  {isAnalyzingStatement ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Run Auto-Match"}
                </Button>
              </div>
            </div>

            {statementMatches.length > 0 && (
              <div className="space-y-2 border rounded-xl p-3 bg-muted/20">
                <span className="font-bold text-foreground block">Reconciliation Results:</span>
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="text-xs">Extracted Ref</TableHead>
                      <TableHead className="text-xs">Match Status</TableHead>
                      <TableHead className="text-xs">Matched Student</TableHead>
                      <TableHead className="text-right text-xs">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statementMatches.map((m, idx) => (
                      <TableRow key={idx} className="text-xs">
                        <TableCell className="font-mono">{m.extractedRef}</TableCell>
                        <TableCell>
                          {m.status === "MATCHED_VERIFIED" && (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                              Matched & Verified
                            </Badge>
                          )}
                          {m.status === "MATCHED_PENDING" && (
                            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">
                              Matched (Pending)
                            </Badge>
                          )}
                          {m.status === "UNMATCHED" && (
                            <Badge variant="outline" className="text-muted-foreground text-[10px]">
                              Unmatched Credit
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {m.matchedReceipt?.invoice?.student
                            ? `${m.matchedReceipt.invoice.student.firstName} ${m.matchedReceipt.invoice.student.lastName}`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          {m.matchedReceipt ? formatMoney(m.matchedReceipt.amount) : m.statementAmount ? formatMoney(m.statementAmount) : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsReconcilerOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DEDICATED OFFICIAL PRINTABLE RECEIPT CANVAS (WITH SCANNABLE QR CODE) */}
      {activeReceipt && (
        <div id="printable-receipt-voucher" className="hidden print:block font-sans text-slate-900 bg-white">
          <div className="border-2 border-slate-900 rounded-2xl p-8 space-y-6 max-w-3xl mx-auto">
            {/* Letterhead */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-6">
              <div className="flex items-center gap-4">
                {schoolInfo.logo ? (
                  <img src={schoolInfo.logo} alt="Logo" className="w-16 h-16 object-contain" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-800 font-bold">
                    <School className="w-8 h-8 text-slate-700" />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-wider text-slate-900">{schoolInfo.name}</h1>
                  <p className="text-xs font-semibold text-slate-600 uppercase mt-0.5">{schoolInfo.address}</p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Tel: {schoolInfo.phone} • Email: {schoolInfo.email}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="border-2 border-slate-900 px-4 py-2 rounded-xl bg-slate-50 inline-block text-right">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Official Receipt</div>
                  <div className="text-base font-black font-mono text-slate-900">
                    RCP-{activeReceipt.id?.slice(-8).toUpperCase()}
                  </div>
                </div>
                <div className="text-[10px] font-mono text-slate-500 mt-1">
                  Issued: {new Date(activeReceipt.date || Date.now()).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>

            {/* Student & Billing Information */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/70 text-xs">
              <div>
                <span className="font-semibold text-slate-500 uppercase text-[10px] block">Student / Candidate</span>
                <span className="font-bold text-slate-900 text-sm">
                  {activeReceipt.invoice?.student
                    ? `${activeReceipt.invoice.student.firstName} ${activeReceipt.invoice.student.lastName}`
                    : "Student"}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-500 uppercase text-[10px] block">Student ID / Admission No</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {activeReceipt.invoice?.student?.studentId || "N/A"}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-500 uppercase text-[10px] block">Class / Academic Division</span>
                <span className="font-bold text-slate-900 text-sm">
                  {activeReceipt.invoice?.student?.class?.name || "General"}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-500 uppercase text-[10px] block">Academic Term & Session</span>
                <span className="font-bold text-slate-900 text-sm">
                  {activeReceipt.invoice?.term?.name || "Term Fee"} • Current Session
                </span>
              </div>
            </div>

            {/* Transaction Ledger Table */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Transaction Breakdown</h3>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
              <table className="w-full text-xs text-left border border-slate-300 border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                    <th className="p-3">Payment Description</th>
                    <th className="p-3 text-center">Channel</th>
                    <th className="p-3 text-center">Reference No.</th>
                    <th className="p-3 text-right">Amount Settled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">
                        {activeReceipt.invoice?.description || "Academic Tuition & School Charges"}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        Invoice ID: INV-{activeReceipt.invoice?.id?.slice(-8).toUpperCase() || "N/A"}
                      </div>
                    </td>
                    <td className="p-3 text-center font-semibold text-slate-700">
                      {activeReceipt.method}
                    </td>
                    <td className="p-3 text-center font-mono text-slate-600">
                      {activeReceipt.reference || "DIRECT-LEDGER"}
                    </td>
                    <td className="p-3 text-right font-black font-mono text-sm text-slate-900">
                      {formatMoney(activeReceipt.amount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Financial Status Summary */}
            <div className="grid grid-cols-3 gap-3 p-4 rounded-xl border-2 border-slate-900 bg-slate-50 text-xs">
              <div>
                <span className="font-semibold text-slate-600 uppercase text-[10px] block">Total Invoiced</span>
                <span className="text-base font-bold font-mono text-slate-900">
                  {formatMoney(activeReceipt.invoice?.amount || activeReceipt.amount)}
                </span>
              </div>
              <div>
                <span className="font-semibold text-emerald-800 uppercase text-[10px] block">Amount Paid (This Slip)</span>
                <span className="text-base font-black font-mono text-emerald-700">
                  {formatMoney(activeReceipt.amount)}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-600 uppercase text-[10px] block">Outstanding Balance</span>
                <span className="text-base font-bold font-mono text-slate-900">
                  {(activeReceipt.invoice?.balance ?? 0) <= 0 ? "PAID IN FULL" : formatMoney(activeReceipt.invoice?.balance ?? 0)}
                </span>
              </div>
            </div>

            {/* Verification QR Code & Bursary Stamp Section */}
            <div className="grid grid-cols-12 gap-6 pt-4 border-t-2 border-slate-200 text-xs items-center">
              {/* QR Code Column */}
              <div className="col-span-3 text-center space-y-1">
                {activeReceiptQr && (
                  <img src={activeReceiptQr} alt="QR Verification" className="w-24 h-24 mx-auto border-2 border-slate-900 p-1 rounded-lg" />
                )}
                <span className="text-[9px] font-mono text-slate-600 block uppercase font-bold">
                  Scan to Verify Online
                </span>
              </div>

              {/* Electronic Audit Notice Column */}
              <div className="col-span-5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold text-[11px]">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Electronic Audit & Verification Notice</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  This legal receipt is cryptographically registered on the {schoolInfo.name} institutional ledger. Scanning the QR code verifies authenticity on the official bursary domain.
                </p>
                <div className="text-[9px] font-mono text-slate-400">
                  Cashier: {activeReceipt.loggedBy ? `${activeReceipt.loggedBy.firstName} ${activeReceipt.loggedBy.lastName}` : "Authorized Bursar"} • Ref: {activeReceipt.id}
                </div>
              </div>

              {/* Official Stamp Box Column */}
              <div className="col-span-4 flex flex-col items-center justify-center text-center space-y-2">
                <div className="w-40 border-b-2 border-slate-900 pb-1">
                  <span className="font-mono text-[9px] text-slate-400 tracking-wider">OFFICIAL BURSAR STAMP</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-800">
                  Authorized Signatory / Bursar
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINT MEDIA STYLESHEET */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-receipt-voucher, #printable-receipt-voucher * {
            visibility: visible;
          }
          #printable-receipt-voucher {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            margin: 0 !important;
            padding: 24px !important;
            background: white !important;
            color: black !important;
            z-index: 999999 !important;
            display: block !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
}
