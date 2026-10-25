"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2,
  PlayCircle,
  Settings2,
  Users,
  FileText,
  Printer,
  DollarSign,
  Briefcase,
  AlertCircle,
  Download,
  Send,
  ShieldAlert,
  Lock,
  Unlock,
  TrendingUp,
  TrendingDown,
  Info,
  Percent,
  Landmark,
  Receipt,
  Building,
  Check,
  Eye,
  Search,
  Filter,
  Clock,
  ArrowUpDown,
  CreditCard,
  UserCheck,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import {
  getPayrollRecords,
  generateMonthlyPayroll,
  updatePayrollRecord,
  markPayrollPaid,
  disburseBatch,
  holdSalary,
  releaseSalaryHold,
  getStaffSalaryList,
  updateStaffSalary,
  updateStaffBankDetails,
  seedDefaultStaffSalaries,
  getPayslip,
  sendStaffPayslip,
  getPayrollComparison,
  getDepartmentTotals,
  getPayrollDepartments,
  getActiveStaffLoans,
} from "@/actions/payroll-actions";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function PayrollPage() {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Navigation & Filtering
  const [activeTab, setActiveTab] = useState("roster");
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Core Data
  const [records, setRecords] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [activeLoans, setActiveLoans] = useState<any[]>([]);
  const [comparison, setComparison] = useState<any>(null);
  const [departmentTotals, setDepartmentTotals] = useState<any[]>([]);

  // Loading States
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [disbursing, setDisbursing] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [sendingPayslipId, setSendingPayslipId] = useState<string | null>(null);

  // Filter Toggles
  const [hideZeroSalaryProfiles, setHideZeroSalaryProfiles] = useState(true);

  // Dialog States
  const [isProcessBatchOpen, setIsProcessBatchOpen] = useState(false);
  const [batchOptions, setBatchOptions] = useState({
    applyAttendance: true,
    applyPaye: true,
    applyLoans: true,
    includeZeroSalary: false,
  });

  const [isHoldOpen, setIsHoldOpen] = useState(false);
  const [holdTargetRecord, setHoldTargetRecord] = useState<any>(null);
  const [holdReason, setHoldReason] = useState("");

  const [isDeductionBreakdownOpen, setIsDeductionBreakdownOpen] = useState(false);
  const [selectedDeductionRecord, setSelectedDeductionRecord] = useState<any>(null);

  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustRecord, setAdjustRecord] = useState<any>(null);
  const [adjustBonuses, setAdjustBonuses] = useState("0");
  const [adjustAllowances, setAdjustAllowances] = useState("0");
  const [adjustOtherDeductions, setAdjustOtherDeductions] = useState("0");

  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [editBaseSalary, setEditBaseSalary] = useState("0");
  const [editBankName, setEditBankName] = useState("");
  const [editAccountNumber, setEditAccountNumber] = useState("");
  const [editAccountName, setEditAccountName] = useState("");

  const [isPayslipOpen, setIsPayslipOpen] = useState(false);
  const [payslipData, setPayslipData] = useState<any>(null);
  const [payslipQrUrl, setPayslipQrUrl] = useState<string>("");
  const [payslipLoading, setPayslipLoading] = useState(false);

  // Initial & Dependency Data Loading
  useEffect(() => {
    loadAllData();
  }, [month, year]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [recordsData, staffData, deptsData, loansData, compData, deptTotalsData] = await Promise.all([
        getPayrollRecords(month, year, { hideZeroSalary: true }),
        getStaffSalaryList({ hideZeroSalary: false }),
        getPayrollDepartments(),
        getActiveStaffLoans(),
        getPayrollComparison(month, year),
        getDepartmentTotals(month, year),
      ]);

      setRecords(recordsData || []);
      setStaffList(staffData || []);
      setDepartments(deptsData || []);
      setActiveLoans(loansData || []);
      setComparison(compData || null);
      setDepartmentTotals(deptTotalsData || []);
    } catch (e: any) {
      console.error("[PayrollPage] Load error:", e);
      toast.error("Failed to load payroll data");
    } finally {
      setLoading(false);
    }
  };

  // Filtered Roster Data
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      const name = `${rec.user.firstName} ${rec.user.lastName}`.toLowerCase();
      const staffId = (rec.user.staffId || "").toLowerCase();
      const deptName = (rec.user.department?.name || "").toLowerCase();
      const q = searchTerm.toLowerCase().trim();

      const matchesSearch = !q || name.includes(q) || staffId.includes(q) || deptName.includes(q);
      const matchesDept = departmentFilter === "ALL" || rec.user.department?.id === departmentFilter;
      const matchesStatus = statusFilter === "ALL" || rec.status === statusFilter;

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [records, searchTerm, departmentFilter, statusFilter]);

  // Filtered Staff Profiles
  const filteredStaffList = useMemo(() => {
    return staffList.filter((staff) => {
      if (hideZeroSalaryProfiles && (!staff.baseSalary || staff.baseSalary <= 0)) {
        return false;
      }
      const name = `${staff.firstName} ${staff.lastName}`.toLowerCase();
      const staffId = (staff.staffId || "").toLowerCase();
      const q = searchTerm.toLowerCase().trim();

      const matchesSearch = !q || name.includes(q) || staffId.includes(q);
      const matchesDept = departmentFilter === "ALL" || staff.department?.id === departmentFilter;

      return matchesSearch && matchesDept;
    });
  }, [staffList, hideZeroSalaryProfiles, searchTerm, departmentFilter]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalGross = records.reduce((sum, r) => sum + r.baseAmount + (r.allowances || 0) + (r.bonuses || 0), 0);
    const totalDeductions = records.reduce((sum, r) => sum + r.deductions, 0);
    const totalNet = records.reduce((sum, r) => sum + r.netAmount, 0);

    const paidRecords = records.filter((r) => r.status === "paid");
    const pendingRecords = records.filter((r) => r.status === "pending");
    const heldRecords = records.filter((r) => r.status === "held");

    const paidNet = paidRecords.reduce((sum, r) => sum + r.netAmount, 0);
    const pendingNet = pendingRecords.reduce((sum, r) => sum + r.netAmount, 0);

    // Statutory breakdown
    const totalPaye = records.reduce((sum, r) => sum + (r.tax || 0), 0);
    const totalPension = records.reduce((sum, r) => sum + (r.pension || 0), 0);
    const totalBas = records.reduce((sum, r) => sum + (r.attendancePenalty || 0), 0);
    const totalLoan = records.reduce((sum, r) => sum + (r.loanDeduction || 0), 0);

    return {
      totalGross,
      totalDeductions,
      totalNet,
      paidNet,
      pendingNet,
      paidCount: paidRecords.length,
      pendingCount: pendingRecords.length,
      heldCount: heldRecords.length,
      totalCount: records.length,
      totalPaye,
      totalPension,
      totalBas,
      totalLoan,
    };
  }, [records]);

  // Handler: Process New Batch
  const handleProcessBatch = async () => {
    setGenerating(true);
    try {
      const res = await generateMonthlyPayroll(month, year, batchOptions);
      toast.success(`Generated payroll for ${res.generatedCount} active staff members!`);
      setIsProcessBatchOpen(false);
      await loadAllData();
    } catch (e: any) {
      toast.error(e.message || "Failed to generate payroll");
    } finally {
      setGenerating(false);
    }
  };

  // Handler: Disburse Whole Batch
  const handleDisburseBatch = async () => {
    if (metrics.pendingCount === 0) {
      toast.error("No pending salaries eligible to disburse.");
      return;
    }

    const confirmMsg = `Disburse salary batch for ${metrics.pendingCount} staff members totaling ₦${metrics.pendingNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}?\n\nNote: ${metrics.heldCount} held salary records will remain locked. Official expenses and staff loan deductions will be recorded automatically.`;

    if (!confirm(confirmMsg)) return;

    setDisbursing(true);
    try {
      const res = await disburseBatch(month, year);
      toast.success(res.message || `Successfully disbursed ₦${metrics.pendingNet.toLocaleString()} to ${metrics.pendingCount} staff!`);
      await loadAllData();
    } catch (e: any) {
      toast.error(e.message || "Failed to disburse batch");
    } finally {
      setDisbursing(false);
    }
  };

  // Handler: Export Bank Advice CSV
  const handleExportBankAdvice = () => {
    if (records.length === 0) {
      toast.error("No payroll records available to export for this period.");
      return;
    }

    const headers = [
      "Staff ID",
      "Employee Name",
      "Designation",
      "Department",
      "Bank Name",
      "Account Number",
      "Account Name",
      "Net Amount (NGN)",
      "Payment Status",
      "Narration",
    ];

    const rows = records.map((r) => {
      const staffId = `"${r.user.staffId || r.user.id.slice(-6)}"`;
      const employeeName = `"${r.user.firstName} ${r.user.lastName}"`;
      const role = `"${r.user.role.replace("_", " ")}"`;
      const dept = `"${r.user.department?.name || "General"}"`;
      const bank = `"${r.user.bankName || "Unassigned"}"`;
      const acctNum = `"${r.user.accountNumber || "N/A"}"`;
      const acctName = `"${r.user.accountName || (r.user.firstName + " " + r.user.lastName)}"`;
      const netPay = r.netAmount.toFixed(2);
      const status = `"${r.status.toUpperCase()}"`;
      const narration = `"Salary Disbursement - ${MONTHS[month - 1]} ${year}"`;

      return [staffId, employeeName, role, dept, bank, acctNum, acctName, netPay, status, narration].join(",");
    });

    const csvString = [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Bank_Payment_Advice_${MONTHS[month - 1]}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Bank Advice for ${MONTHS[month - 1]} ${year} downloaded successfully!`);
  };

  // Handler: Hold Salary
  const openHoldDialog = (rec: any) => {
    setHoldTargetRecord(rec);
    setHoldReason("");
    setIsHoldOpen(true);
  };

  const handleConfirmHold = async () => {
    if (!holdTargetRecord) return;
    if (!holdReason.trim()) {
      toast.error("Please enter a mandatory explanation note for placing this salary on hold.");
      return;
    }

    try {
      await holdSalary(holdTargetRecord.id, holdReason.trim());
      toast.warning(`Salary for ${holdTargetRecord.user.firstName} ${holdTargetRecord.user.lastName} placed on HOLD.`);
      setIsHoldOpen(false);
      await loadAllData();
    } catch (e: any) {
      toast.error(e.message || "Failed to place salary on hold");
    }
  };

  const handleReleaseHold = async (id: string, name: string) => {
    if (!confirm(`Release salary hold for ${name}? The record will return to pending status and be eligible for disbursement.`)) return;
    try {
      await releaseSalaryHold(id);
      toast.success(`Salary hold released for ${name}.`);
      await loadAllData();
    } catch (e: any) {
      toast.error(e.message || "Failed to release hold");
    }
  };

  // Handler: Mark Single Record Paid
  const handleMarkSinglePaid = async (rec: any) => {
    if (rec.status === "held") {
      toast.error("Cannot disburse a held salary. Release hold first.");
      return;
    }
    if (!confirm(`Disburse ₦${rec.netAmount.toLocaleString()} to ${rec.user.firstName} ${rec.user.lastName}? This will log an official expense.`)) return;

    try {
      await markPayrollPaid(rec.id);
      toast.success(`Disbursed salary to ${rec.user.firstName} ${rec.user.lastName}!`);
      await loadAllData();
    } catch (e: any) {
      toast.error(e.message || "Failed to disburse salary");
    }
  };

  // Handler: View Payslip
  const handleOpenPayslip = async (payrollId: string) => {
    setPayslipLoading(true);
    setIsPayslipOpen(true);
    try {
      const data = await getPayslip(payrollId);
      setPayslipData(data);

      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const verifyUrl = `${origin}/verify/payslip/${payrollId}`;
      const qr = await QRCode.toDataURL(verifyUrl, {
        width: 140,
        margin: 1,
        color: { dark: "#0f172a", light: "#ffffff" },
      });
      setPayslipQrUrl(qr);
    } catch (e: any) {
      toast.error(e.message || "Failed to load payslip");
      setIsPayslipOpen(false);
    } finally {
      setPayslipLoading(false);
    }
  };

  // Handler: Dispatch Payslip to Staff
  const handleSendPayslip = async (payrollId: string) => {
    setSendingPayslipId(payrollId);
    try {
      const res = await sendStaffPayslip(payrollId);
      toast.success(res.message || "Payslip dispatched successfully!");
      await loadAllData();
    } catch (e: any) {
      toast.error(e.message || "Failed to send payslip");
    } finally {
      setSendingPayslipId(null);
    }
  };

  // Handler: Open Adjustments
  const openAdjustDialog = (rec: any) => {
    setAdjustRecord(rec);
    setAdjustBonuses((rec.bonuses || 0).toString());
    setAdjustAllowances((rec.allowances || 0).toString());
    const other = (rec.deductions || 0) - (rec.tax || 0) - (rec.pension || 0) - (rec.attendancePenalty || 0) - (rec.loanDeduction || 0);
    setAdjustOtherDeductions(Math.max(0, other).toString());
    setIsAdjustOpen(true);
  };

  const handleSaveAdjustments = async () => {
    if (!adjustRecord) return;
    try {
      await updatePayrollRecord(adjustRecord.id, {
        bonuses: parseFloat(adjustBonuses) || 0,
        allowances: parseFloat(adjustAllowances) || 0,
        deductions: parseFloat(adjustOtherDeductions) || 0,
      });
      toast.success("Payroll record adjustments saved");
      setIsAdjustOpen(false);
      await loadAllData();
    } catch (e: any) {
      toast.error(e.message || "Failed to update record");
    }
  };

  // Handler: Staff Profile & Bank Editing
  const openProfileEdit = (staff: any) => {
    setEditingStaff(staff);
    setEditBaseSalary((staff.baseSalary || 0).toString());
    setEditBankName(staff.bankName || "");
    setEditAccountNumber(staff.accountNumber || "");
    setEditAccountName(staff.accountName || "");
    setIsProfileEditOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!editingStaff) return;
    const salary = parseFloat(editBaseSalary);
    if (isNaN(salary) || salary < 0) {
      toast.error("Please enter a valid non-negative base salary");
      return;
    }

    try {
      await updateStaffSalary(editingStaff.id, salary);
      await updateStaffBankDetails(editingStaff.id, {
        bankName: editBankName,
        accountNumber: editAccountNumber,
        accountName: editAccountName,
      });
      toast.success(`Profile & compensation updated for ${editingStaff.firstName} ${editingStaff.lastName}`);
      setIsProfileEditOpen(false);
      await loadAllData();
    } catch (e: any) {
      toast.error(e.message || "Failed to update profile");
    }
  };

  // Handler: Seed Default Salaries
  const handleSeedSalaries = async () => {
    if (!confirm("Automatically seed baseline standard salaries (₦150k - ₦300k) for staff members with ₦0 configured?")) return;
    setSeeding(true);
    try {
      const res = await seedDefaultStaffSalaries();
      toast.success(`Configured default compensation for ${res.count} staff members!`);
      await loadAllData();
    } catch (e: any) {
      toast.error(e.message || "Failed to seed salaries");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Staff Payroll & Remuneration</h2>
            <Badge variant="outline" className="text-xs font-mono bg-muted/40">
              {MONTHS[month - 1]} {year}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Statutory Nigerian PAYE computation, biometric attendance penalty recoveries, staff loan amortization, and banking advice.
          </p>
        </div>

        {/* Header Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Month / Year Picker */}
          <div className="flex items-center gap-1.5 bg-card p-1 rounded-lg border border-border shadow-sm">
            <select
              className="h-8 rounded-md border-0 bg-transparent text-xs font-semibold px-2 focus:outline-none cursor-pointer"
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
            >
              {MONTHS.map((m, idx) => (
                <option key={m} value={idx + 1}>{m}</option>
              ))}
            </select>
            <span className="text-muted-foreground text-xs">•</span>
            <select
              className="h-8 rounded-md border-0 bg-transparent text-xs font-semibold px-2 focus:outline-none cursor-pointer"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
            >
              {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Export Bank Advice CSV */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportBankAdvice}
            disabled={records.length === 0}
            className="gap-1.5 text-xs h-9 shadow-sm"
            title="Download CSV for commercial bank bulk transfer upload"
          >
            <Download className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline">Export</span> Bank Advice (CSV)
          </Button>

          {/* Process New Batch */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsProcessBatchOpen(true)}
            className="gap-1.5 text-xs h-9 shadow-sm"
          >
            <PlayCircle className="h-4 w-4 text-primary" />
            Process Batch
          </Button>

          {/* Disburse Batch */}
          {metrics.pendingCount > 0 && (
            <Button
              size="sm"
              onClick={handleDisburseBatch}
              disabled={disbursing}
              className="gap-1.5 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold"
            >
              <CheckCircle2 className="h-4 w-4" />
              {disbursing ? "Disbursing..." : `Disburse Batch (₦${metrics.pendingNet.toLocaleString()})`}
            </Button>
          )}
        </div>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Gross Payroll */}
        <Card className="border-border shadow-sm bg-card text-card-foreground">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Gross Payroll
            </CardTitle>
            <div className="p-2 rounded-md bg-primary/10 text-primary">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold font-mono text-foreground">
              ₦{metrics.totalGross.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span>Base + Allowances before deductions</span>
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Total Deductions */}
        <Card className="border-border shadow-sm bg-card text-card-foreground">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Deductions
            </CardTitle>
            <div className="p-2 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <Receipt className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
              -₦{metrics.totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              Tax: ₦{metrics.totalPaye.toLocaleString()} • Pen: ₦{metrics.totalPension.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Net Payable */}
        <Card className="border-border shadow-sm bg-card text-card-foreground">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Net Payable
            </CardTitle>
            <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Landmark className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              ₦{metrics.totalNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              {comparison && comparison.prevTotal > 0 ? (
                comparison.diffPercent >= 0 ? (
                  <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center">
                    <TrendingUp className="h-3 w-3 mr-0.5 inline" />
                    +{comparison.diffPercent}% (₦+{comparison.diffAmount.toLocaleString()}) vs last mo.
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center">
                    <TrendingDown className="h-3 w-3 mr-0.5 inline" />
                    {comparison.diffPercent}% (₦{comparison.diffAmount.toLocaleString()}) vs last mo.
                  </span>
                )
              ) : (
                <span>Baseline payroll active</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Active Roster Count */}
        <Card className="border-border shadow-sm bg-card text-card-foreground">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Roster Status
            </CardTitle>
            <div className="p-2 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold font-mono text-foreground">
              {metrics.totalCount} <span className="text-xs font-normal text-muted-foreground">Staff</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">{metrics.paidCount} Paid</span>
              <span>•</span>
              <span className="text-amber-600 dark:text-amber-400 font-medium">{metrics.pendingCount} Pending</span>
              {metrics.heldCount > 0 && (
                <>
                  <span>•</span>
                  <span className="text-rose-600 dark:text-rose-400 font-bold">{metrics.heldCount} Held</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/60 p-1 border border-border grid grid-cols-2 md:grid-cols-4 h-auto">
          <TabsTrigger value="roster" className="text-xs gap-1.5 py-2 data-[state=active]:bg-background">
            <Briefcase className="h-3.5 w-3.5" />
            Payroll Batches ({records.length})
          </TabsTrigger>
          <TabsTrigger value="profiles" className="text-xs gap-1.5 py-2 data-[state=active]:bg-background">
            <UserCheck className="h-3.5 w-3.5" />
            Staff Salary Profiles ({filteredStaffList.length})
          </TabsTrigger>
          <TabsTrigger value="deductions" className="text-xs gap-1.5 py-2 data-[state=active]:bg-background">
            <Receipt className="h-3.5 w-3.5" />
            Deductions & Loans ({activeLoans.length})
          </TabsTrigger>
          <TabsTrigger value="tax-settings" className="text-xs gap-1.5 py-2 data-[state=active]:bg-background">
            <Percent className="h-3.5 w-3.5" />
            Tax & Policies (PITA)
          </TabsTrigger>
        </TabsList>

        {/* ========================================================================= */}
        {/* TAB 1: PAYROLL BATCHES (MONTHLY ROSTER) */}
        {/* ========================================================================= */}
        <TabsContent value="roster" className="space-y-4 m-0">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search staff name, ID, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                className="h-9 rounded-md border border-input bg-background text-xs px-2 shadow-sm focus:outline-none cursor-pointer w-full sm:w-auto"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <option value="ALL">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              <select
                className="h-9 rounded-md border border-input bg-background text-xs px-2 shadow-sm focus:outline-none cursor-pointer w-full sm:w-auto"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="held">On Hold</option>
              </select>
            </div>
          </div>

          {/* Roster Table Card */}
          <Card className="border-border shadow-sm bg-card text-card-foreground">
            <CardHeader className="bg-muted/20 border-b border-border flex flex-row justify-between items-center py-3.5">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Monthly Compensation Roster • {MONTHS[month - 1]} {year}
                <Badge variant="secondary" className="text-xs font-mono ml-1">
                  {filteredRecords.length} staff
                </Badge>
              </CardTitle>

              {records.length > 0 && (
                <div className="text-xs text-muted-foreground hidden md:flex items-center gap-2">
                  <span>Pending: <strong className="text-foreground">₦{metrics.pendingNet.toLocaleString()}</strong></span>
                  <span>•</span>
                  <span>Paid: <strong className="text-emerald-600 dark:text-emerald-400">₦{metrics.paidNet.toLocaleString()}</strong></span>
                </div>
              )}
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center">
                  <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-sm">Loading payroll records...</p>
                </div>
              ) : records.length === 0 ? (
                <div className="p-16 text-center max-w-md mx-auto">
                  <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-foreground">No payroll generated for {MONTHS[month - 1]} {year}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Generate monthly compensation with Nigerian statutory PAYE taxes, biometric BAS attendance penalties, and loan amortization applied automatically.
                  </p>
                  <Button
                    onClick={() => setIsProcessBatchOpen(true)}
                    className="mt-4 gap-2 text-xs font-semibold shadow-sm"
                  >
                    <PlayCircle className="h-4 w-4" />
                    Process {MONTHS[month - 1]} Payroll
                  </Button>
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <p className="text-sm">No records match your active search or filters.</p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => { setSearchTerm(""); setDepartmentFilter("ALL"); setStatusFilter("ALL"); }}
                    className="text-xs mt-1"
                  >
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="w-[200px]">Staff Member</TableHead>
                        <TableHead className="hidden md:table-cell">Department</TableHead>
                        <TableHead className="text-right">Base (₦)</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">Allowances</TableHead>
                        <TableHead className="text-right">Deductions</TableHead>
                        <TableHead className="text-right">Net Pay (₦)</TableHead>
                        <TableHead className="hidden lg:table-cell">Bank Details</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center hidden xl:table-cell">BAS Compliance</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecords.map((rec) => {
                        const hasBank = !!(rec.user.bankName && rec.user.accountNumber);
                        const isHeld = rec.status === "held";
                        const isPaid = rec.status === "paid";
                        const isPending = rec.status === "pending";

                        return (
                          <TableRow key={rec.id} className="hover:bg-muted/20 transition-colors">
                            {/* 1. Staff Member */}
                            <TableCell className="py-3">
                              <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                                <span>{rec.user.firstName} {rec.user.lastName}</span>
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">
                                  {rec.user.staffId || rec.user.id.slice(-6)}
                                </span>
                                <span>•</span>
                                <span>{rec.user.role.replace("_", " ")}</span>
                              </div>
                            </TableCell>

                            {/* 2. Department */}
                            <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                              {rec.user.department?.name || "General Staff"}
                            </TableCell>

                            {/* 3. Base Salary */}
                            <TableCell className="text-right font-mono text-xs text-muted-foreground">
                              ₦{rec.baseAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </TableCell>

                            {/* 4. Allowances */}
                            <TableCell className="text-right hidden sm:table-cell font-mono text-xs text-emerald-600 dark:text-emerald-400">
                              +₦{(rec.allowances + (rec.bonuses || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </TableCell>

                            {/* 5. Deductions with Breakdown trigger */}
                            <TableCell className="text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDeductionRecord(rec);
                                  setIsDeductionBreakdownOpen(true);
                                }}
                                className="font-mono text-xs text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center gap-1"
                                title="Click to view itemized statutory tax, pension, attendance, and loan deductions"
                              >
                                -₦{rec.deductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                <Info className="h-3 w-3 text-rose-500/70" />
                              </button>
                            </TableCell>

                            {/* 6. Net Pay */}
                            <TableCell className="text-right font-mono font-bold text-foreground text-sm">
                              ₦{rec.netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </TableCell>

                            {/* 7. Bank Details */}
                            <TableCell className="hidden lg:table-cell text-xs">
                              {hasBank ? (
                                <div className="space-y-0.5">
                                  <div className="font-medium text-foreground truncate max-w-[140px]">{rec.user.bankName}</div>
                                  <div className="font-mono text-muted-foreground text-[11px]">{rec.user.accountNumber}</div>
                                </div>
                              ) : (
                                <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/20">
                                  Missing Bank
                                </Badge>
                              )}
                            </TableCell>

                            {/* 8. Status */}
                            <TableCell className="text-center">
                              {isPaid ? (
                                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[11px]">
                                  Paid
                                </Badge>
                              ) : isHeld ? (
                                <Badge
                                  className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 text-[11px] cursor-help"
                                  title={`Salary on hold: ${rec.holdReason || "No explanation provided"}`}
                                >
                                  Held
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[11px]">
                                  Pending
                                </Badge>
                              )}
                            </TableCell>

                            {/* 9. BAS Attendance status */}
                            <TableCell className="text-center hidden xl:table-cell text-xs">
                              {rec.attendancePenalty > 0 ? (
                                <Badge variant="outline" className="text-[10px] text-rose-600 border-rose-300 bg-rose-50 dark:bg-rose-950/20">
                                  -₦{rec.attendancePenalty.toLocaleString()} Late/Abs
                                </Badge>
                              ) : (
                                <span className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                                  <Check className="h-3 w-3 text-emerald-500" /> Compliant
                                </span>
                              )}
                            </TableCell>

                            {/* 10. Actions */}
                            <TableCell className="text-right">
                              <div className="flex justify-end items-center gap-1">
                                {/* View Payslip */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleOpenPayslip(rec.id)}
                                  title="View Printable Payslip"
                                >
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                </Button>

                                {/* Send Payslip via Email / WhatsApp */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  disabled={sendingPayslipId === rec.id}
                                  onClick={() => handleSendPayslip(rec.id)}
                                  title="Dispatch Payslip via Email / WhatsApp"
                                >
                                  <Send className={`h-3.5 w-3.5 ${rec.payslipSentAt ? "text-emerald-500" : "text-muted-foreground"}`} />
                                </Button>

                                {/* Hold / Release Hold */}
                                {isHeld ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2 text-xs border-rose-300 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1"
                                    onClick={() => handleReleaseHold(rec.id, `${rec.user.firstName} ${rec.user.lastName}`)}
                                    title="Release Salary Hold"
                                  >
                                    <Unlock className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Release</span>
                                  </Button>
                                ) : isPending ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                                    onClick={() => openHoldDialog(rec)}
                                    title="Place Salary on Hold"
                                  >
                                    <Lock className="h-3.5 w-3.5" />
                                  </Button>
                                ) : null}

                                {/* Disburse Single / Adjust */}
                                {isPending && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-muted-foreground"
                                      onClick={() => openAdjustDialog(rec)}
                                      title="Adjust Allowances or Deductions"
                                    >
                                      <Settings2 className="h-3.5 w-3.5" />
                                    </Button>

                                    <Button
                                      variant="default"
                                      size="sm"
                                      className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 font-medium"
                                      onClick={() => handleMarkSinglePaid(rec)}
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      <span className="hidden sm:inline">Pay</span>
                                    </Button>
                                  </>
                                )}
                              </div>
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
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 2: STAFF SALARY PROFILES */}
        {/* ========================================================================= */}
        <TabsContent value="profiles" className="space-y-4 m-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search staff directory..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none bg-muted/40 px-3 py-1.5 rounded-md border border-border">
                <input
                  type="checkbox"
                  checked={hideZeroSalaryProfiles}
                  onChange={(e) => setHideZeroSalaryProfiles(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                />
                <span>Hide ₦0 Base Salary (Test/Admin accounts)</span>
              </label>

              <Button
                variant="outline"
                size="sm"
                onClick={handleSeedSalaries}
                disabled={seeding}
                className="gap-1.5 text-xs h-9 shadow-sm"
              >
                <DollarSign className="h-3.5 w-3.5 text-primary" />
                {seeding ? "Configuring..." : "Seed Default Salaries"}
              </Button>
            </div>
          </div>

          <Card className="border-border shadow-sm bg-card text-card-foreground">
            <CardHeader className="bg-muted/20 border-b border-border py-3.5 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-primary" />
                  Staff Base Salary & Banking Directory
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pre-configured base remuneration and commercial bank details used during automated batch generation.
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead>Staff Member</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-right">Base Salary (₦)</TableHead>
                      <TableHead>Bank Name</TableHead>
                      <TableHead>Account Number</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStaffList.map((staff) => (
                      <TableRow key={staff.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="py-3">
                          <div className="font-semibold text-foreground text-sm">
                            {staff.firstName} {staff.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {staff.staffId || staff.id.slice(-6)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs font-normal">
                            {staff.role.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {staff.department?.name || "General"}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-foreground">
                          {staff.baseSalary > 0 ? (
                            `₦${staff.baseSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                          ) : (
                            <span className="text-xs text-muted-foreground font-normal">₦0.00 (Unset)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-foreground">
                          {staff.bankName || <span className="text-muted-foreground italic">Not set</span>}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-foreground">
                          {staff.accountNumber || <span className="text-muted-foreground italic">Not set</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1 shadow-sm"
                            onClick={() => openProfileEdit(staff)}
                          >
                            <Settings2 className="h-3.5 w-3.5 text-primary" />
                            Configure
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 3: DEDUCTIONS & LOAN SCHEDULES */}
        {/* ========================================================================= */}
        <TabsContent value="deductions" className="space-y-4 m-0">
          {/* Statutory Breakdown Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border shadow-sm bg-card text-card-foreground">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
                  PAYE Tax Withheld
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl font-bold font-mono text-foreground">
                  ₦{metrics.totalPaye.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Nigerian PITA statutory progressive tax</p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm bg-card text-card-foreground">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
                  Pension Deductions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl font-bold font-mono text-foreground">
                  ₦{metrics.totalPension.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">8% statutory employee contribution</p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm bg-card text-card-foreground">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
                  Biometric Penalties
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">
                  ₦{metrics.totalBas.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">BAS lateness & unexcused absence fees</p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm bg-card text-card-foreground">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
                  Staff Loan Recoveries
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  ₦{metrics.totalLoan.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Auto-deducted upon batch disbursement</p>
              </CardContent>
            </Card>
          </div>

          {/* Active Loans Table */}
          <Card className="border-border shadow-sm bg-card text-card-foreground">
            <CardHeader className="bg-muted/20 border-b border-border py-3.5">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Active Staff Loans & Recovery Amortization
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Approved loans automatically linked to monthly payroll rosters. Balances are decremented upon disbursement.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {activeLoans.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <CreditCard className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">No active staff loans outstanding</p>
                  <p className="text-xs text-muted-foreground mt-0.5">All approved staff loans have been amortized or settled.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead>Staff Member</TableHead>
                        <TableHead>Role / Dept</TableHead>
                        <TableHead>Purpose / Description</TableHead>
                        <TableHead className="text-right">Principal (₦)</TableHead>
                        <TableHead className="text-right">Monthly Installment (₦)</TableHead>
                        <TableHead className="text-right">Outstanding Balance (₦)</TableHead>
                        <TableHead className="text-center">Payroll Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeLoans.map((loan) => (
                        <TableRow key={loan.id} className="hover:bg-muted/20 transition-colors">
                          <TableCell className="py-3">
                            <div className="font-semibold text-foreground text-sm">
                              {loan.user?.firstName} {loan.user?.lastName}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {loan.user?.staffId || loan.user?.id?.slice(-6)}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {loan.user?.role?.replace("_", " ")} • {loan.user?.department?.name || "General"}
                          </TableCell>
                          <TableCell className="text-xs text-foreground max-w-xs truncate">
                            {loan.reason || loan.description || "Staff Personal Loan / Advance"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground">
                            ₦{loan.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-rose-600 dark:text-rose-400 text-xs">
                            -₦{loan.monthlyDeduction.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-foreground text-xs">
                            ₦{loan.remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                              Auto-Deducting
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 4: TAX SETTINGS & POLICIES */}
        {/* ========================================================================= */}
        <TabsContent value="tax-settings" className="space-y-4 m-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* PITA Tax Bands Card */}
            <Card className="border-border shadow-sm bg-card text-card-foreground">
              <CardHeader className="bg-muted/20 border-b border-border py-3.5">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-primary" />
                  Nigerian Personal Income Tax Act (PITA) Bands
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Statutory progressive taxation brackets applied to annual chargeable income.
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead>Annual Taxable Band</TableHead>
                      <TableHead className="text-right">Tax Rate</TableHead>
                      <TableHead className="text-right">Max Annual Tax</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="text-xs font-medium">First ₦300,000</TableCell>
                      <TableCell className="text-right font-mono text-xs">7.0%</TableCell>
                      <TableCell className="text-right font-mono text-xs">₦21,000</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-xs font-medium">Next ₦300,000</TableCell>
                      <TableCell className="text-right font-mono text-xs">11.0%</TableCell>
                      <TableCell className="text-right font-mono text-xs">₦33,000</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-xs font-medium">Next ₦500,000</TableCell>
                      <TableCell className="text-right font-mono text-xs">15.0%</TableCell>
                      <TableCell className="text-right font-mono text-xs">₦75,000</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-xs font-medium">Next ₦500,000</TableCell>
                      <TableCell className="text-right font-mono text-xs">19.0%</TableCell>
                      <TableCell className="text-right font-mono text-xs">₦95,000</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-xs font-medium">Next ₦1,600,000</TableCell>
                      <TableCell className="text-right font-mono text-xs">21.0%</TableCell>
                      <TableCell className="text-right font-mono text-xs">₦336,000</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-xs font-medium">Above ₦3,200,000</TableCell>
                      <TableCell className="text-right font-mono text-xs">24.0%</TableCell>
                      <TableCell className="text-right font-mono text-xs">Remaining balance</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <div className="p-4 bg-muted/20 border-t border-border space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-foreground">Consolidated Relief Allowance (CRA):</strong> Higher of ₦200,000 or 1% of Gross Annual Income + 20% of Gross Annual Income.
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-foreground">Statutory Pension Relief:</strong> 8% of monthly salary is fully tax-exempt before tax bands are applied.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attendance & Payroll Policy Card */}
            <Card className="border-border shadow-sm bg-card text-card-foreground">
              <CardHeader className="bg-muted/20 border-b border-border py-3.5">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Biometric Attendance (BAS) Penalties Policy
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Automated penalties calculated from electronic clock-in terminals.
                </p>
              </CardHeader>
              <CardContent className="p-4 space-y-4 text-xs">
                <div className="p-3 bg-muted/30 rounded-lg border border-border space-y-1.5">
                  <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Daily Rate Base
                  </h4>
                  <p className="text-muted-foreground">
                    Staff daily rate is computed on a 22 working day schedule:
                  </p>
                  <code className="block p-2 bg-background rounded font-mono text-[11px] text-foreground">
                    Daily Rate = Base Salary ÷ 22 days
                  </code>
                </div>

                <div className="space-y-2.5">
                  <div className="flex justify-between items-center py-1.5 border-b border-border">
                    <span className="text-muted-foreground">Grace Period</span>
                    <span className="font-semibold text-foreground">15 Minutes past shift start</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-border">
                    <span className="text-muted-foreground">Lateness Penalty</span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400">0.25 × Daily Rate per occurrence</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-border">
                    <span className="text-muted-foreground">Unexcused Absence Penalty</span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400">1.0 × Daily Rate per day</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-border">
                    <span className="text-muted-foreground">Maximum Penalty Cap</span>
                    <span className="font-semibold text-foreground">20% of Monthly Base Salary</span>
                  </div>
                </div>

                <div className="p-3 bg-blue-500/10 text-blue-800 dark:text-blue-300 rounded-lg text-xs leading-relaxed">
                  <p>
                    All attendance penalties are automatically populated during batch generation and can be individually audited or modified prior to final batch disbursement.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ========================================================================= */}
      {/* MODAL: PROCESS NEW PAYROLL BATCH */}
      {/* ========================================================================= */}
      <Dialog open={isProcessBatchOpen} onOpenChange={setIsProcessBatchOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-primary" />
              Process Payroll Batch • {MONTHS[month - 1]} {year}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Calculate compensation, statutory reliefs, and automatic deductions for active staff.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted/40 rounded-lg border border-border text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Target Period:</span>
                <strong className="text-foreground">{MONTHS[month - 1]} {year}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Eligible Active Staff:</span>
                <strong className="text-foreground">{staffList.filter(s => s.baseSalary > 0).length} staff (with base salary)</strong>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-3 p-2.5 rounded-lg border border-border hover:bg-muted/30 cursor-pointer">
                <input
                  type="checkbox"
                  checked={batchOptions.applyPaye}
                  onChange={(e) => setBatchOptions({ ...batchOptions, applyPaye: e.target.checked })}
                  className="mt-0.5 rounded border-input text-primary focus:ring-primary h-4 w-4"
                />
                <div>
                  <div className="text-xs font-semibold text-foreground">Statutory Nigerian PAYE Tax</div>
                  <div className="text-[11px] text-muted-foreground">
                    Computes Consolidated Relief Allowance (CRA) and progressive PITA bands.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-2.5 rounded-lg border border-border hover:bg-muted/30 cursor-pointer">
                <input
                  type="checkbox"
                  checked={batchOptions.applyAttendance}
                  onChange={(e) => setBatchOptions({ ...batchOptions, applyAttendance: e.target.checked })}
                  className="mt-0.5 rounded border-input text-primary focus:ring-primary h-4 w-4"
                />
                <div>
                  <div className="text-xs font-semibold text-foreground">Biometric Attendance Penalties (BAS)</div>
                  <div className="text-[11px] text-muted-foreground">
                    Scans clock-in logs for lateness minutes and unexcused absences.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-2.5 rounded-lg border border-border hover:bg-muted/30 cursor-pointer">
                <input
                  type="checkbox"
                  checked={batchOptions.applyLoans}
                  onChange={(e) => setBatchOptions({ ...batchOptions, applyLoans: e.target.checked })}
                  className="mt-0.5 rounded border-input text-primary focus:ring-primary h-4 w-4"
                />
                <div>
                  <div className="text-xs font-semibold text-foreground">Staff Loan Installment Amortization</div>
                  <div className="text-[11px] text-muted-foreground">
                    Deducts monthly loan repayment from active approved staff loans.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-2.5 rounded-lg border border-border hover:bg-muted/30 cursor-pointer">
                <input
                  type="checkbox"
                  checked={batchOptions.includeZeroSalary}
                  onChange={(e) => setBatchOptions({ ...batchOptions, includeZeroSalary: e.target.checked })}
                  className="mt-0.5 rounded border-input text-primary focus:ring-primary h-4 w-4"
                />
                <div>
                  <div className="text-xs font-semibold text-foreground">Include Staff with ₦0 Base Salary</div>
                  <div className="text-[11px] text-muted-foreground">
                    When unchecked, test accounts and unconfigured accounts are safely excluded.
                  </div>
                </div>
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsProcessBatchOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleProcessBatch}
              disabled={generating}
              className="gap-1.5 font-semibold"
            >
              <PlayCircle className="h-4 w-4" />
              {generating ? "Generating..." : "Run Payroll Batch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: HOLD SALARY GOVERNANCE */}
      {/* ========================================================================= */}
      <Dialog open={isHoldOpen} onOpenChange={setIsHoldOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="h-5 w-5" />
              Place Salary on Hold
            </DialogTitle>
            <DialogDescription className="text-xs">
              Holding a salary excludes this employee from automated batch disbursement until explicitly released.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted/40 rounded-lg border border-border text-xs space-y-1">
              <span className="text-muted-foreground">Staff Member:</span>
              <div className="font-semibold text-foreground text-sm">
                {holdTargetRecord?.user?.firstName} {holdTargetRecord?.user?.lastName}
              </div>
              <div className="text-muted-foreground font-mono text-xs">
                Net Pay: ₦{holdTargetRecord?.netAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Reason for Hold (Mandatory)</span>
                <span className="text-rose-500 text-[10px]">* Required for audit</span>
              </label>
              <textarea
                rows={3}
                value={holdReason}
                onChange={(e) => setHoldReason(e.target.value)}
                placeholder="e.g. Unresolved query regarding exam malpractices / Clearance pending from Bursar"
                className="w-full rounded-md border border-input bg-background p-2.5 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsHoldOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleConfirmHold}
              className="gap-1.5 font-semibold"
            >
              <Lock className="h-4 w-4" />
              Confirm Salary Hold
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: DEDUCTIONS ITEMIZED BREAKDOWN */}
      {/* ========================================================================= */}
      <Dialog open={isDeductionBreakdownOpen} onOpenChange={setIsDeductionBreakdownOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              Itemized Deductions Breakdown
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedDeductionRecord?.user?.firstName} {selectedDeductionRecord?.user?.lastName} • {MONTHS[month - 1]} {year}
            </DialogDescription>
          </DialogHeader>

          {selectedDeductionRecord && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base Salary</span>
                  <span className="font-mono text-foreground">₦{selectedDeductionRecord.baseAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Allowances & Bonuses</span>
                  <span className="font-mono">+₦{(selectedDeductionRecord.allowances + (selectedDeductionRecord.bonuses || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-semibold border-t border-border pt-1.5 text-foreground">
                  <span>Gross Monthly Earnings</span>
                  <span className="font-mono">₦{(selectedDeductionRecord.baseAmount + selectedDeductionRecord.allowances + (selectedDeductionRecord.bonuses || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Itemized Deductions</h4>
                <div className="space-y-1.5 p-3 rounded-lg border border-border bg-card">
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-muted-foreground">Statutory PAYE Tax</span>
                    <span className="font-mono font-medium text-rose-600 dark:text-rose-400">
                      -₦{(selectedDeductionRecord.tax || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-muted-foreground">Statutory Pension (8%)</span>
                    <span className="font-mono font-medium text-rose-600 dark:text-rose-400">
                      -₦{(selectedDeductionRecord.pension || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-muted-foreground">Biometric Attendance Penalties</span>
                    <span className="font-mono font-medium text-rose-600 dark:text-rose-400">
                      -₦{(selectedDeductionRecord.attendancePenalty || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-muted-foreground">Staff Loan Repayment</span>
                    <span className="font-mono font-medium text-rose-600 dark:text-rose-400">
                      -₦{(selectedDeductionRecord.loanDeduction || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 font-bold text-foreground">
                    <span>Total Deductions</span>
                    <span className="font-mono text-rose-600 dark:text-rose-400">
                      -₦{selectedDeductionRecord.deductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg border border-primary/20">
                <span className="font-semibold text-primary">Net Payable to Employee</span>
                <span className="font-mono text-base font-bold text-primary">
                  ₦{selectedDeductionRecord.netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button size="sm" onClick={() => setIsDeductionBreakdownOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: ADJUST RECORD (ALLOWANCES / OTHER DEDUCTIONS) */}
      {/* ========================================================================= */}
      <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Adjust Payroll Line</DialogTitle>
            <DialogDescription className="text-xs">
              Modify ad-hoc bonuses, allowances, or additional adjustments for this month.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted/40 rounded-lg border border-border text-xs space-y-1">
              <span className="text-muted-foreground">Staff Member:</span>
              <div className="font-semibold text-foreground text-sm">
                {adjustRecord?.user?.firstName} {adjustRecord?.user?.lastName}
              </div>
              <div className="text-muted-foreground font-mono text-xs">
                Base Salary: ₦{adjustRecord?.baseAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-emerald-600 uppercase">Monthly Allowances (₦)</label>
              <Input
                type="number"
                value={adjustAllowances}
                onChange={(e) => setAdjustAllowances(e.target.value)}
                placeholder="0"
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-emerald-600 uppercase">One-off Bonus (₦)</label>
              <Input
                type="number"
                value={adjustBonuses}
                onChange={(e) => setAdjustBonuses(e.target.value)}
                placeholder="0"
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-rose-600 uppercase">Other Discretionary Deductions (₦)</label>
              <Input
                type="number"
                value={adjustOtherDeductions}
                onChange={(e) => setAdjustOtherDeductions(e.target.value)}
                placeholder="0"
                className="font-mono text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsAdjustOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveAdjustments} className="font-semibold">
              Save Adjustments
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: CONFIGURE STAFF BASE SALARY & BANKING */}
      {/* ========================================================================= */}
      <Dialog open={isProfileEditOpen} onOpenChange={setIsProfileEditOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Configure Staff Remuneration & Bank</DialogTitle>
            <DialogDescription className="text-xs">
              Update monthly base compensation and commercial banking details for official payroll advice.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted/40 rounded-lg border border-border text-xs space-y-1">
              <span className="text-muted-foreground">Employee:</span>
              <div className="font-semibold text-foreground text-sm">
                {editingStaff?.firstName} {editingStaff?.lastName}
              </div>
              <div className="text-muted-foreground text-xs">
                {editingStaff?.role?.replace("_", " ")} • {editingStaff?.department?.name || "General"}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground uppercase">
                Monthly Base Salary (₦)
              </label>
              <Input
                type="number"
                value={editBaseSalary}
                onChange={(e) => setEditBaseSalary(e.target.value)}
                placeholder="e.g. 180000"
                className="font-mono text-sm font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Commercial Bank Name
                </label>
                <Input
                  value={editBankName}
                  onChange={(e) => setEditBankName(e.target.value)}
                  placeholder="e.g. GTBank / Zenith / Access"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Account Number
                </label>
                <Input
                  value={editAccountNumber}
                  onChange={(e) => setEditAccountNumber(e.target.value)}
                  placeholder="10 Digits NUBAN"
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Account Name (as registered with bank)
              </label>
              <Input
                value={editAccountName}
                onChange={(e) => setEditAccountName(e.target.value)}
                placeholder="e.g. SULAIMAN ABDULLAHI"
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsProfileEditOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveProfile} className="font-semibold">
              Save Compensation Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: PRINTABLE PAYSLIP WITH SCANNABLE QR CODE */}
      {/* ========================================================================= */}
      <Dialog open={isPayslipOpen} onOpenChange={setIsPayslipOpen}>
        <DialogContent className="sm:max-w-[550px] w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="print:hidden">
            <DialogTitle className="flex justify-between items-center">
              <span>Employee Salary Advice</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => payslipData?.record && handleSendPayslip(payslipData.record.id)}
                  className="gap-1.5 text-xs"
                >
                  <Send className="h-3.5 w-3.5" /> Email / WhatsApp
                </Button>
                <Button variant="default" size="sm" onClick={() => window.print()} className="gap-1.5 text-xs">
                  <Printer className="h-3.5 w-3.5" /> Print
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          {payslipLoading ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm">Loading official payslip...</p>
            </div>
          ) : payslipData?.record ? (
            <div id="printable-payslip" className="space-y-6 pt-2 bg-card text-card-foreground">
              {/* Header */}
              <div className="border-b-2 border-border pb-4 flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-extrabold tracking-tight text-foreground">
                    {payslipData.school?.name || "Proxima SMS Academy"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {payslipData.school?.address || "School Campus"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Official Monthly Salary Disbursement Voucher
                  </p>
                </div>
                <div className="text-right">
                  <Badge className={payslipData.record.status === "paid" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : payslipData.record.status === "held" ? "bg-rose-500/15 text-rose-700 dark:text-rose-400" : "bg-amber-500/15 text-amber-700 dark:text-amber-400"}>
                    {payslipData.record.status.toUpperCase()}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1 font-semibold">
                    {MONTHS[payslipData.record.month - 1]} {payslipData.record.year}
                  </p>
                </div>
              </div>

              {/* Employee Info Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-muted/40 p-3 rounded-lg border border-border">
                <div className="space-y-1">
                  <span className="text-muted-foreground block text-[11px]">Employee Name:</span>
                  <strong className="text-foreground text-sm font-semibold block">
                    {payslipData.record.user.firstName} {payslipData.record.user.lastName}
                  </strong>
                  <div className="text-muted-foreground text-xs">
                    Staff ID: <span className="font-mono text-foreground font-medium">{payslipData.record.user.staffId || payslipData.record.user.id.slice(-6)}</span>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Designation: <span className="text-foreground">{payslipData.record.user.role.replace("_", " ")}</span>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <span className="text-muted-foreground block text-[11px]">Department:</span>
                  <span className="text-foreground font-medium block">
                    {payslipData.record.user.department?.name || "Academic Faculty"}
                  </span>
                  <div className="text-muted-foreground text-xs">
                    Bank: <span className="text-foreground">{payslipData.record.user.bankName || "N/A"}</span>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Account: <span className="font-mono text-foreground">{payslipData.record.user.accountNumber || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Earnings & Deductions Table */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground font-medium">Monthly Base Salary</span>
                  <span className="font-mono font-semibold text-foreground">
                    ₦{payslipData.record.baseAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {(payslipData.record.allowances > 0 || payslipData.record.bonuses > 0) && (
                  <div className="flex justify-between py-1.5 border-b border-border text-emerald-600 dark:text-emerald-400">
                    <span>Allowances & Bonuses</span>
                    <span className="font-mono font-semibold">
                      +₦{(payslipData.record.allowances + (payslipData.record.bonuses || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                {/* Deductions Breakdown */}
                {payslipData.record.tax > 0 && (
                  <div className="flex justify-between py-1.5 border-b border-border text-rose-600 dark:text-rose-400">
                    <span>Statutory PAYE Tax</span>
                    <span className="font-mono font-medium">
                      -₦{payslipData.record.tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                {payslipData.record.pension > 0 && (
                  <div className="flex justify-between py-1.5 border-b border-border text-rose-600 dark:text-rose-400">
                    <span>Pension Contribution (8%)</span>
                    <span className="font-mono font-medium">
                      -₦{payslipData.record.pension.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                {payslipData.record.attendancePenalty > 0 && (
                  <div className="flex justify-between py-1.5 border-b border-border text-rose-600 dark:text-rose-400">
                    <span>Biometric Attendance Penalties</span>
                    <span className="font-mono font-medium">
                      -₦{payslipData.record.attendancePenalty.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                {payslipData.record.loanDeduction > 0 && (
                  <div className="flex justify-between py-1.5 border-b border-border text-rose-600 dark:text-rose-400">
                    <span>Staff Loan Installment Deduction</span>
                    <span className="font-mono font-medium">
                      -₦{payslipData.record.loanDeduction.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="flex justify-between py-2.5 border-t-2 border-border text-sm font-bold text-foreground">
                  <span className="text-base">Net Disbursed Payout</span>
                  <span className="font-mono text-primary text-lg">
                    ₦{payslipData.record.netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Scannable Verification QR Code & Signature Notice */}
              <div className="pt-4 border-t border-border flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                    Digital Verification
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Scan with any smartphone camera to verify payslip authenticity against the school ledger.
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Generated on {new Date().toLocaleDateString()} • Bursary Department
                  </p>
                </div>
                {payslipQrUrl && (
                  <div className="p-1.5 bg-white rounded border border-border shrink-0 ml-4">
                    <img src={payslipQrUrl} alt="Payslip QR Verification" className="w-20 h-20" />
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Print Media Stylesheet */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-payslip, #printable-payslip * {
            visibility: visible;
          }
          #printable-payslip {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            margin: 0 !important;
            padding: 36px !important;
            background: white !important;
            color: black !important;
            border: 2px solid #0f172a !important;
            border-radius: 8px;
            z-index: 999999 !important;
            display: block !important;
          }
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
        }
      `}</style>
    </div>
  );
}
