"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  Trash2, 
  Building, 
  Layers, 
  CheckCircle, 
  AlertCircle, 
  Globe, 
  GraduationCap, 
  Tag, 
  Search, 
  Receipt, 
  Eye, 
  FileSpreadsheet, 
  CheckCircle2, 
  Coins, 
  X,
  MoreVertical,
  Copy,
  Edit3,
  Archive,
  ArchiveRestore,
  FileText,
  Printer,
  Calendar,
  Check
} from "lucide-react";
import { 
  getFeeStructures, 
  createFeeStructure, 
  updateFeeStructure,
  duplicateFeeStructure,
  setFeeStructureStatus,
  deleteFeeStructure, 
  generateClassInvoices 
} from "@/actions/billing-actions";
import { getAcademicData } from "@/actions/academic-data";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type FeeScopeFilter = "ALL" | "WHOLE_SCHOOL" | "CLASS" | "CATEGORY" | "ARCHIVED";
type FeeStatusFilter = "ALL" | "ACTIVE" | "DRAFT" | "ARCHIVED";

interface FeeItem {
  id?: string;
  name: string;
  amount: string;
}

interface FeeStructure {
  id: string;
  name?: string | null;
  className: string;
  category?: string | null;
  scope?: string | null;
  session: string;
  term: string;
  status: string; // ACTIVE, DRAFT, ARCHIVED
  totalAmount: number;
  createdAt: string | Date;
  updatedAt?: string | Date;
  items: { id: string; name: string; amount: number }[];
}

const SCOPE_CONFIG = [
  {
    value: "WHOLE_SCHOOL" as const,
    label: "School-Wide",
    tagline: "All Enrolled Students",
    icon: Globe,
    description: "Universal fees like PTA levy, ICT maintenance, and school development dues.",
    defaultName: "PTA & ICT Annual Levy",
    defaultTarget: "All Students (School-Wide)"
  },
  {
    value: "CLASS" as const,
    label: "Class-Specific",
    tagline: "Specific Grade / Form",
    icon: GraduationCap,
    description: "Academic tuition, curriculum workbooks, and continuous assessments.",
    defaultName: "Tuition & Academic Schedule",
    defaultTarget: ""
  },
  {
    value: "CATEGORY" as const,
    label: "Special Category",
    tagline: "Boarding, Bus, Freshers",
    icon: Tag,
    description: "Boarders hostel fees, transportation bus routes, and graduation dues.",
    defaultName: "Boarding & Accommodation",
    defaultTarget: "Boarding Students"
  },
  {
    value: "CUSTOM" as const,
    label: "Custom Scope",
    tagline: "Arbitrary Grouping",
    icon: Tag,
    description: "Specialized cohorts, scholarship tiers, or temporary institutional levies.",
    defaultName: "Custom Activity Levy",
    defaultTarget: ""
  }
];

const PRESET_TEMPLATES = [
  {
    label: "School-Wide PTA & ICT",
    scope: "WHOLE_SCHOOL",
    category: "PTA",
    name: "PTA & School Development Levy",
    target: "All Students (School-Wide)",
    items: [
      { name: "PTA Annual Levy", amount: "5000" },
      { name: "ICT & Digital Learning", amount: "3000" },
      { name: "School Development Fund", amount: "2500" },
    ]
  },
  {
    label: "Junior Secondary Tuition",
    scope: "CLASS",
    category: "TUITION",
    name: "JSS Academic Tuition",
    target: "JSS 1",
    items: [
      { name: "Tuition Fee", amount: "45000" },
      { name: "Lesson Notes & Workbooks", amount: "5000" },
      { name: "Continuous Assessment & Exams", amount: "4000" },
    ]
  },
  {
    label: "Boarding & Catering",
    scope: "CATEGORY",
    category: "BOARDING",
    name: "Boarding Students Schedule",
    target: "Boarding Students",
    items: [
      { name: "Hostel Accommodation", amount: "65000" },
      { name: "Termly Meal Catering", amount: "80000" },
      { name: "Laundry & Medical Welfare", amount: "15000" },
    ]
  },
  {
    label: "Transportation Shuttle",
    scope: "CATEGORY",
    category: "TRANSPORT",
    name: "Bus Route Transportation",
    target: "School Bus Subscribers",
    items: [
      { name: "Daily Shuttle Bus Route", amount: "35000" },
      { name: "Vehicle Maintenance Fund", amount: "5000" },
    ]
  }
];

export default function FeeStructuresPage() {
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedScopeFilter, setSelectedScopeFilter] = useState<FeeScopeFilter>("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<FeeStatusFilter>("ALL");

  // Create / Edit Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [scope, setScope] = useState<"WHOLE_SCHOOL" | "CLASS" | "CATEGORY" | "CUSTOM">("WHOLE_SCHOOL");
  const [category, setCategory] = useState("PTA");
  const [className, setClassName] = useState("All Students (School-Wide)");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [session, setSession] = useState("");
  const [term, setTerm] = useState("");
  const [formStatus, setFormStatus] = useState<"ACTIVE" | "DRAFT">("ACTIVE");
  const [items, setItems] = useState<FeeItem[]>([{ name: "PTA Annual Levy", amount: "5000" }]);

  // Detail & Preview Modals
  const [viewStructure, setViewStructure] = useState<FeeStructure | null>(null);
  const [previewStructure, setPreviewStructure] = useState<FeeStructure | null>(null);
  const [confirmGenerateStructure, setConfirmGenerateStructure] = useState<FeeStructure | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [structuresData, academicData] = await Promise.all([
        getFeeStructures(),
        getAcademicData(),
      ]);

      setFeeStructures(structuresData as FeeStructure[]);
      setClasses(academicData.classes || []);
      setTerms(academicData.terms || []);
      setSessions(academicData.sessions || []);

      if (academicData.classes?.length > 0) {
        setSelectedClassId(academicData.classes[0].name);
      }
      if (academicData.terms?.length > 0 && !term) {
        const activeTerm = academicData.terms.find((t: any) => t.isActive) || academicData.terms[0];
        setTerm(activeTerm.name);
      }
      if (academicData.sessions?.length > 0 && !session) {
        const activeSession = academicData.sessions.find((s: any) => s.isActive) || academicData.sessions[0];
        setSession(activeSession.name);
      } else if (!session) {
        setSession("2026/2027");
      }
    } catch (e) {
      toast.error("Failed to load fee configuration data");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setFormName("");
    setScope("WHOLE_SCHOOL");
    setCategory("PTA");
    setClassName("All Students (School-Wide)");
    setFormStatus("ACTIVE");
    setItems([
      { name: "PTA Annual Levy", amount: "5000" },
      { name: "ICT & Digital Learning", amount: "3000" },
    ]);
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (structure: FeeStructure) => {
    setEditingId(structure.id);
    setFormName(structure.name || "");
    const currentScope = (structure.scope as any) || (structure.className?.includes("All Students") ? "WHOLE_SCHOOL" : "CLASS");
    setScope(currentScope);
    setCategory(structure.category || "TUITION");
    setClassName(structure.className);
    if (currentScope === "CLASS") {
      setSelectedClassId(structure.className);
    }
    setSession(structure.session);
    setTerm(structure.term);
    setFormStatus(structure.status === "DRAFT" ? "DRAFT" : "ACTIVE");
    setItems(
      structure.items?.length > 0
        ? structure.items.map((i) => ({ name: i.name, amount: i.amount.toString() }))
        : [{ name: "Tuition Fee", amount: "" }]
    );
    setIsFormOpen(true);
  };

  const handleScopeChange = (newScope: "WHOLE_SCHOOL" | "CLASS" | "CATEGORY" | "CUSTOM") => {
    setScope(newScope);
    const config = SCOPE_CONFIG.find((c) => c.value === newScope);
    if (!formName || formName === SCOPE_CONFIG.find((c) => c.value === scope)?.defaultName) {
      setFormName(config?.defaultName || "");
    }

    if (newScope === "WHOLE_SCHOOL") {
      setClassName("All Students (School-Wide)");
      setCategory("PTA");
    } else if (newScope === "CLASS") {
      setClassName(selectedClassId || (classes[0]?.name || "JSS 1"));
      setCategory("TUITION");
    } else if (newScope === "CATEGORY") {
      setClassName("Boarding Students");
      setCategory("BOARDING");
    } else {
      setClassName("");
      setCategory("GENERAL");
    }
  };

  const handleApplyPreset = (preset: typeof PRESET_TEMPLATES[0]) => {
    setScope(preset.scope as any);
    setCategory(preset.category);
    setFormName(preset.name);
    if (preset.scope === "CLASS") {
      setClassName(selectedClassId || preset.target);
    } else {
      setClassName(preset.target);
    }
    setItems(preset.items.map((i) => ({ ...i })));
    toast.info(`Applied "${preset.label}" template`);
  };

  const handleAddItem = () => {
    setItems([...items, { name: "", amount: "" }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      toast.error("A fee structure requires at least one item");
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof FeeItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateFormTotal = () => {
    return items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  };

  const handleSaveStructure = async () => {
    const targetName = scope === "CLASS" ? selectedClassId : className.trim();
    if (!targetName) {
      toast.error("Please specify a target class or student category");
      return;
    }
    if (!session || !term) {
      toast.error("Please specify both academic session and term");
      return;
    }

    const validItems = items
      .filter((i) => i.name.trim() && !isNaN(parseFloat(i.amount)) && parseFloat(i.amount) > 0)
      .map((i) => ({ name: i.name.trim(), amount: parseFloat(i.amount) }));

    if (validItems.length === 0) {
      toast.error("Please add at least one fee item with a valid positive amount");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formName.trim() || undefined,
        className: targetName,
        category,
        scope,
        session,
        term,
        status: formStatus,
        items: validItems,
      };

      if (editingId) {
        await updateFeeStructure(editingId, payload);
        toast.success("Fee structure template updated successfully");
      } else {
        await createFeeStructure(payload);
        toast.success("Fee structure template created successfully");
      }

      setIsFormOpen(false);
      const updated = await getFeeStructures();
      setFeeStructures(updated as FeeStructure[]);
    } catch (e: any) {
      toast.error(e.message || "Failed to save fee structure");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const dup = await duplicateFeeStructure(id);
      toast.success(`Duplicated as "${dup.name}" (Draft)`);
      const updated = await getFeeStructures();
      setFeeStructures(updated as FeeStructure[]);
    } catch (e: any) {
      toast.error(e.message || "Failed to duplicate template");
    }
  };

  const handleToggleStatus = async (structure: FeeStructure, newStatus: "ACTIVE" | "DRAFT" | "ARCHIVED") => {
    try {
      await setFeeStructureStatus(structure.id, newStatus);
      toast.success(`Template status marked as ${newStatus}`);
      setFeeStructures((prev) =>
        prev.map((s) => (s.id === structure.id ? { ...s, status: newStatus } : s))
      );
    } catch (e: any) {
      toast.error(e.message || "Failed to update status");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this fee structure? This cannot be undone.")) return;
    try {
      await deleteFeeStructure(id);
      toast.success("Fee structure deleted");
      setFeeStructures((prev) => prev.filter((s) => s.id !== id));
      if (viewStructure?.id === id) setViewStructure(null);
    } catch (e) {
      toast.error("Failed to delete fee structure");
    }
  };

  const executeInvoiceGeneration = async () => {
    if (!confirmGenerateStructure) return;
    const structure = confirmGenerateStructure;
    setGeneratingId(structure.id);
    try {
      const result = await generateClassInvoices(structure.id);
      toast.success(
        `Invoices generated: ${result.generatedCount} issued for ${result.totalStudents} eligible student(s).`
      );
      setConfirmGenerateStructure(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate invoices");
    } finally {
      setGeneratingId(null);
    }
  };

  // Filter logic
  const filteredStructures = useMemo(() => {
    return feeStructures.filter((item) => {
      const isSchoolWide =
        item.scope === "WHOLE_SCHOOL" || item.className?.toLowerCase().includes("all students");
      const isClass =
        item.scope === "CLASS" || (!isSchoolWide && !item.scope?.includes("CATEGORY") && item.scope !== "WHOLE_SCHOOL");
      const isCategory = item.scope === "CATEGORY";
      const isArchived = item.status === "ARCHIVED";

      // By default, hide ARCHIVED templates unless "ARCHIVED" tab or status is explicitly selected
      if (selectedScopeFilter !== "ARCHIVED" && selectedStatusFilter !== "ARCHIVED" && isArchived) {
        return false;
      }

      // Scope match
      if (selectedScopeFilter === "WHOLE_SCHOOL" && !isSchoolWide) return false;
      if (selectedScopeFilter === "CLASS" && (!isClass || isSchoolWide)) return false;
      if (selectedScopeFilter === "CATEGORY" && !isCategory) return false;
      if (selectedScopeFilter === "ARCHIVED" && !isArchived) return false;

      // Status match
      if (selectedStatusFilter !== "ALL" && item.status !== selectedStatusFilter) return false;

      // Search match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = item.name?.toLowerCase().includes(query);
        const matchesClass = item.className?.toLowerCase().includes(query);
        const matchesCategory = item.category?.toLowerCase().includes(query);
        const matchesTerm = item.term?.toLowerCase().includes(query);
        const matchesSession = item.session?.toLowerCase().includes(query);
        const matchesItems = item.items?.some((i) => i.name.toLowerCase().includes(query));
        if (!matchesName && !matchesClass && !matchesCategory && !matchesTerm && !matchesSession && !matchesItems) {
          return false;
        }
      }

      return true;
    });
  }, [feeStructures, selectedScopeFilter, selectedStatusFilter, searchQuery]);

  // Statistics calculation
  const stats = useMemo(() => {
    const totalCount = feeStructures.length;
    const activeCount = feeStructures.filter((s) => s.status === "ACTIVE" || !s.status).length;
    const draftCount = feeStructures.filter((s) => s.status === "DRAFT").length;
    const archivedCount = feeStructures.filter((s) => s.status === "ARCHIVED").length;
    const totalAssessedValue = feeStructures
      .filter((s) => s.status !== "ARCHIVED")
      .reduce((sum, s) => sum + (s.totalAmount || 0), 0);

    return { totalCount, activeCount, draftCount, archivedCount, totalAssessedValue };
  }, [feeStructures]);

  // Helper formatting functions
  const formatDate = (val: string | Date | undefined) => {
    if (!val) return "Recent";
    const d = new Date(val);
    return isNaN(d.getTime())
      ? "Recent"
      : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const getCleanAppliesTo = (structure: FeeStructure) => {
    if (structure.scope === "WHOLE_SCHOOL" || structure.className?.toLowerCase().includes("all students")) {
      return "All Enrolled Students";
    }
    return structure.className.replace(/\s*\(School-Wide\)/gi, "").trim();
  };

  const getDisplayName = (structure: FeeStructure) => {
    if (structure.name && structure.name.trim()) return structure.name;
    const cleanTarget = getCleanAppliesTo(structure);
    return `${cleanTarget} Fee Schedule`;
  };

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-background p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-sm">
            <Layers className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Fee Structures & Schedules
              </h1>
              <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 border-primary/30 text-primary bg-primary/5">
                Financial Architecture
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Configure institutional fee templates, customize itemized line items, and batch-generate student invoices.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
          <Button
            onClick={handleOpenCreateModal}
            className="w-full md:w-auto font-bold rounded-xl h-10 px-4 bg-primary hover:bg-primary/90 shadow-sm gap-2 text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            Configure Fee Structure
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards (Interactive Filter Triggers) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Configured */}
        <Card
          onClick={() => {
            setSelectedScopeFilter("ALL");
            setSelectedStatusFilter("ALL");
            setSearchQuery("");
          }}
          className={cn(
            "rounded-xl border border-border bg-card shadow-sm cursor-pointer transition-all hover:border-primary/50",
            selectedScopeFilter === "ALL" && selectedStatusFilter === "ALL" && "ring-1 ring-primary/40 bg-primary/5"
          )}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Configured Templates</p>
              <p className="text-2xl font-bold text-foreground mt-1">{stats.totalCount}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Click to view all</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Active Templates */}
        <Card
          onClick={() => {
            setSelectedScopeFilter("ALL");
            setSelectedStatusFilter("ACTIVE");
          }}
          className={cn(
            "rounded-xl border border-border bg-card shadow-sm cursor-pointer transition-all hover:border-emerald-500/50",
            selectedStatusFilter === "ACTIVE" && "ring-1 ring-emerald-500/40 bg-emerald-500/5"
          )}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Active Schedules</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.activeCount}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Ready for billing</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Draft & Archived */}
        <Card
          onClick={() => {
            setSelectedScopeFilter("ARCHIVED");
          }}
          className={cn(
            "rounded-xl border border-border bg-card shadow-sm cursor-pointer transition-all hover:border-amber-500/50",
            selectedScopeFilter === "ARCHIVED" && "ring-1 ring-amber-500/40 bg-amber-500/5"
          )}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Drafts & Archived</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {stats.draftCount + stats.archivedCount}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {stats.draftCount} draft, {stats.archivedCount} archived
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Archive className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Cumulative Assessment */}
        <Card className="rounded-xl border border-border bg-card shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Active Term Assessment</p>
              <p className="text-2xl font-bold font-mono text-primary mt-1">
                ₦{stats.totalAssessedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Per-student baseline sum</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border-border shadow-sm bg-card text-card-foreground rounded-2xl overflow-hidden">
        <CardHeader className="bg-muted/20 border-b border-border p-5">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  Configured Fee Templates ({filteredStructures.length})
                </CardTitle>
                {filteredStructures.length !== feeStructures.length && (
                  <span className="text-xs text-muted-foreground font-medium">
                    (Filtered from {feeStructures.length})
                  </span>
                )}
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Manage fee schedules, inspect line item details, and click &quot;Generate Invoices&quot; to issue student bills.
              </CardDescription>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search fee structure or item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl border-input bg-background"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Scope Filter Tabs */}
              <div className="flex items-center rounded-xl bg-muted/70 p-1 border border-border/80 flex-wrap">
                {[
                  { value: "ALL" as const, label: "All" },
                  { value: "WHOLE_SCHOOL" as const, label: "School-Wide" },
                  { value: "CLASS" as const, label: "Class-Specific" },
                  { value: "CATEGORY" as const, label: "Special Groups" },
                  { value: "ARCHIVED" as const, label: "Archived" },
                ].map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => {
                      setSelectedScopeFilter(tab.value);
                      if (tab.value === "ARCHIVED") setSelectedStatusFilter("ARCHIVED");
                      else if (selectedStatusFilter === "ARCHIVED") setSelectedStatusFilter("ALL");
                    }}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-lg font-medium transition-all",
                      selectedScopeFilter === tab.value
                        ? "bg-background text-foreground shadow-sm font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Reset Filters Link if active */}
              {(searchQuery || selectedScopeFilter !== "ALL" || selectedStatusFilter !== "ALL") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedScopeFilter("ALL");
                    setSelectedStatusFilter("ALL");
                  }}
                  className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground rounded-xl"
                >
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-16 text-center text-muted-foreground flex flex-col items-center gap-2">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-xs font-medium">Loading fee structures...</span>
            </div>
          ) : feeStructures.length === 0 ? (
            /* Empty State: Zero templates in system */
            <div className="p-16 text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <FileSpreadsheet className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground">No Fee Structures Configured Yet</h3>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Define your institution&apos;s fee templates (such as Tuition, PTA levies, or Boarding dues) to automate invoice generation for enrolled students.
              </p>
              <div className="mt-6 flex justify-center">
                <Button
                  onClick={handleOpenCreateModal}
                  className="rounded-xl font-bold px-5 h-11 bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  Create Your First Fee Structure
                </Button>
              </div>
            </div>
          ) : filteredStructures.length === 0 ? (
            /* Empty State: Search / Filter returned zero */
            <div className="p-16 text-center max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-muted/60 border border-border flex items-center justify-center mx-auto mb-3">
                <Building className="h-7 w-7 text-muted-foreground/60" />
              </div>
              <h3 className="text-base font-bold text-foreground">No Matching Fee Structures</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                No fee templates match your active filters or search term &quot;{searchQuery}&quot;.
              </p>
              <div className="mt-5 flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedScopeFilter("ALL");
                    setSelectedStatusFilter("ALL");
                  }}
                  className="rounded-xl text-xs"
                >
                  Clear All Filters
                </Button>
                <Button
                  size="sm"
                  onClick={handleOpenCreateModal}
                  className="rounded-xl text-xs font-semibold gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Configure New Template
                </Button>
              </div>
            </div>
          ) : (
            /* Production Data Table */
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30 border-b border-border">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="pl-6 py-3.5 text-muted-foreground font-bold uppercase tracking-wider text-[11px] min-w-[240px]">
                      Fee Structure Name
                    </TableHead>
                    <TableHead className="py-3.5 text-muted-foreground font-bold uppercase tracking-wider text-[11px] min-w-[130px]">
                      Type
                    </TableHead>
                    <TableHead className="py-3.5 text-muted-foreground font-bold uppercase tracking-wider text-[11px] min-w-[140px]">
                      Academic Session
                    </TableHead>
                    <TableHead className="py-3.5 text-muted-foreground font-bold uppercase tracking-wider text-[11px] min-w-[150px]">
                      Applies To
                    </TableHead>
                    <TableHead className="py-3.5 text-muted-foreground font-bold uppercase tracking-wider text-[11px] text-right min-w-[130px]">
                      Total Amount
                    </TableHead>
                    <TableHead className="py-3.5 text-muted-foreground font-bold uppercase tracking-wider text-[11px] text-center min-w-[100px]">
                      Status
                    </TableHead>
                    <TableHead className="py-3.5 text-muted-foreground font-bold uppercase tracking-wider text-[11px] min-w-[120px]">
                      Last Updated
                    </TableHead>
                    <TableHead className="pr-6 py-3.5 text-muted-foreground font-bold uppercase tracking-wider text-[11px] text-right min-w-[190px]">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStructures.map((structure) => {
                    const isSchoolWide =
                      structure.scope === "WHOLE_SCHOOL" ||
                      structure.className?.toLowerCase().includes("all students");
                    const isCategory = structure.scope === "CATEGORY";
                    const isArchived = structure.status === "ARCHIVED";
                    const isDraft = structure.status === "DRAFT";

                    return (
                      <TableRow
                        key={structure.id}
                        className={cn(
                          "border-b border-border hover:bg-muted/30 transition-colors",
                          isArchived && "opacity-60 bg-muted/10"
                        )}
                      >
                        {/* 1. Fee Structure Name */}
                        <TableCell className="pl-6 py-4">
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border",
                                isSchoolWide
                                  ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                  : isCategory
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                  : "bg-purple-500/10 text-purple-600 border-purple-500/20"
                              )}
                            >
                              {isSchoolWide ? (
                                <Globe className="w-4 h-4" />
                              ) : isCategory ? (
                                <Tag className="w-4 h-4" />
                              ) : (
                                <GraduationCap className="w-4 h-4" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <span className="font-bold text-foreground text-sm block leading-snug">
                                {getDisplayName(structure)}
                              </span>

                              {/* Item Chips Preview */}
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                <span className="text-[11px] font-medium text-muted-foreground shrink-0">
                                  {structure.items?.length || 0} line item{structure.items?.length === 1 ? "" : "s"}:
                                </span>
                                {structure.items?.slice(0, 2).map((item, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground border border-border/70"
                                  >
                                    {item.name}
                                  </span>
                                ))}
                                {(structure.items?.length || 0) > 2 && (
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    +{structure.items.length - 2} more
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* 2. Type */}
                        <TableCell className="py-4">
                          {isSchoolWide ? (
                            <Badge className="whitespace-nowrap shrink-0 text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                              School-Wide
                            </Badge>
                          ) : isCategory ? (
                            <Badge className="whitespace-nowrap shrink-0 text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                              Special Category
                            </Badge>
                          ) : (
                            <Badge className="whitespace-nowrap shrink-0 text-[10px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                              Class-Specific
                            </Badge>
                          )}
                        </TableCell>

                        {/* 3. Academic Session */}
                        <TableCell className="py-4">
                          <div className="space-y-0.5">
                            <span className="font-mono text-xs font-semibold text-foreground">
                              {structure.session}
                            </span>
                            <div className="text-[11px] text-muted-foreground">
                              {structure.term}
                            </div>
                          </div>
                        </TableCell>

                        {/* 4. Applies To */}
                        <TableCell className="py-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-xs font-medium text-foreground border border-border/70">
                            {getCleanAppliesTo(structure)}
                          </span>
                        </TableCell>

                        {/* 5. Total Amount */}
                        <TableCell className="py-4 text-right">
                          <div className="font-mono font-bold text-sm text-foreground">
                            ₦{structure.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                        </TableCell>

                        {/* 6. Status */}
                        <TableCell className="py-4 text-center">
                          {isArchived ? (
                            <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Archived
                            </Badge>
                          ) : isDraft ? (
                            <Badge className="text-[10px] font-semibold uppercase tracking-wider bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300">
                              Draft
                            </Badge>
                          ) : (
                            <Badge className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300">
                              Active
                            </Badge>
                          )}
                        </TableCell>

                        {/* 7. Last Updated */}
                        <TableCell className="py-4 text-xs text-muted-foreground font-mono">
                          {formatDate(structure.updatedAt || structure.createdAt)}
                        </TableCell>

                        {/* 8. Actions */}
                        <TableCell className="pr-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                            {/* Generate Invoices Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5 rounded-xl text-xs font-semibold border-primary/40 text-primary hover:bg-primary/10 gap-1.5 shrink-0"
                              disabled={generatingId === structure.id || isArchived}
                              onClick={() => setConfirmGenerateStructure(structure)}
                              title={isArchived ? "Unarchive to generate invoices" : "Generate Invoices for Students"}
                            >
                              <Receipt className="h-3.5 w-3.5" />
                              {generatingId === structure.id ? "Billing..." : "Generate"}
                            </Button>

                            {/* Edit Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs rounded-xl text-muted-foreground hover:text-foreground"
                              onClick={() => handleOpenEditModal(structure)}
                              title="Edit fee template"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </Button>

                            {/* More Actions Dropdown (⋮) */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 rounded-xl p-1.5 border-border shadow-lg">
                                <DropdownMenuItem
                                  onClick={() => setViewStructure(structure)}
                                  className="text-xs font-medium cursor-pointer gap-2 rounded-lg"
                                >
                                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                                  Fee Items Breakdown
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => setPreviewStructure(structure)}
                                  className="text-xs font-medium cursor-pointer gap-2 rounded-lg"
                                >
                                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                  Preview Student Invoice
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => handleDuplicate(structure.id)}
                                  className="text-xs font-medium cursor-pointer gap-2 rounded-lg"
                                >
                                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                                  Duplicate Template
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                {isArchived ? (
                                  <DropdownMenuItem
                                    onClick={() => handleToggleStatus(structure, "ACTIVE")}
                                    className="text-xs font-medium cursor-pointer gap-2 rounded-lg text-emerald-600 dark:text-emerald-400"
                                  >
                                    <ArchiveRestore className="h-3.5 w-3.5" />
                                    Unarchive & Activate
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => handleToggleStatus(structure, "ARCHIVED")}
                                    className="text-xs font-medium cursor-pointer gap-2 rounded-lg text-amber-600 dark:text-amber-400"
                                  >
                                    <Archive className="h-3.5 w-3.5" />
                                    Archive Template
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuItem
                                  onClick={() => handleDelete(structure.id)}
                                  className="text-xs font-medium cursor-pointer gap-2 rounded-lg text-rose-600 hover:text-rose-700"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete Permanently
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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

      {/* CREATE & EDIT FEE STRUCTURE MODAL */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border-border bg-card text-card-foreground p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
              <Layers className="h-5 w-5 text-primary" />
              {editingId ? "Edit Fee Structure Template" : "Configure New Fee Structure Template"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define reusable fee schedules with itemized charges, student scope, and billing frequency.
            </DialogDescription>
          </DialogHeader>

          {/* Quick Presets Bar (only shown when creating fresh) */}
          {!editingId && (
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                Quick Starter Templates
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_TEMPLATES.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="px-2.5 py-1 text-xs rounded-lg font-medium transition-colors bg-background text-foreground hover:bg-muted border border-border shadow-xs"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-5 pt-2">
            {/* Descriptive Template Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Template Name
              </label>
              <Input
                placeholder="e.g. 2026/2027 First Term Tuition, PTA Annual Levy"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="h-10 rounded-xl text-sm font-medium bg-background"
              />
            </div>

            {/* Scope Selection Cards */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Fee Application Scope
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SCOPE_CONFIG.map((s) => {
                  const Icon = s.icon;
                  const isSelected = scope === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => handleScopeChange(s.value)}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-xl border text-left transition-all",
                        isSelected
                          ? "bg-primary/10 border-primary/50 text-foreground ring-1 ring-primary"
                          : "bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                          isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                          <span>{s.label}</span>
                          <span className="text-[10px] text-muted-foreground font-normal">({s.tagline})</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                          {s.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Input & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  {scope === "WHOLE_SCHOOL" && "Target Audience"}
                  {scope === "CLASS" && "Target Class"}
                  {scope === "CATEGORY" && "Special Category Group"}
                  {scope === "CUSTOM" && "Custom Target Identifier"}
                </label>

                {scope === "CLASS" ? (
                  classes.length > 0 ? (
                    <select
                      className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                    >
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.name}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      placeholder="e.g. JSS 1"
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="rounded-xl h-10"
                    />
                  )
                ) : scope === "CATEGORY" ? (
                  <select
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                  >
                    <option value="Boarding Students">Boarding Students (Hostel & Meals)</option>
                    <option value="School Bus Subscribers">Transportation / Bus Route</option>
                    <option value="New Admissions (Freshers)">New Admissions / Registration</option>
                    <option value="Graduating Class (SS3/Year 12)">Graduation & Valedictory</option>
                  </select>
                ) : (
                  <Input
                    placeholder="e.g. All Students (School-Wide)"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className="rounded-xl h-10 font-medium"
                    disabled={scope === "WHOLE_SCHOOL"}
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Fee Category</label>
                <select
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="TUITION">TUITION (Standard Academic Tuition)</option>
                  <option value="PTA">PTA (Levies & Development Fund)</option>
                  <option value="BOARDING">BOARDING (Hostel & Catering)</option>
                  <option value="TRANSPORT">TRANSPORT (Bus Route & Shuttle)</option>
                  <option value="EXAMINATION">EXAMINATION (WAEC, NECO, Mocks)</option>
                  <option value="GENERAL">GENERAL (Other Institutional Levy)</option>
                </select>
              </div>
            </div>

            {/* Term, Session & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Academic Term</label>
                {terms.length > 0 ? (
                  <select
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                  >
                    {terms.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name} {t.isActive ? "(Active)" : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                  >
                    <option value="First Term">First Term</option>
                    <option value="Second Term">Second Term</option>
                    <option value="Third Term">Third Term</option>
                  </select>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Academic Session</label>
                {sessions.length > 0 ? (
                  <select
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    value={session}
                    onChange={(e) => setSession(e.target.value)}
                  >
                    {sessions.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name} {s.isActive ? "(Active)" : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    value={session}
                    onChange={(e) => setSession(e.target.value)}
                    placeholder="2026/2027"
                    className="rounded-xl h-10"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Initial Status</label>
                <select
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                >
                  <option value="ACTIVE">ACTIVE (Ready to Bill)</option>
                  <option value="DRAFT">DRAFT (Under Review)</option>
                </select>
              </div>
            </div>

            {/* Line Items Builder */}
            <div className="pt-3 border-t border-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Fee Line Items ({items.length})
                  </label>
                  <p className="text-[11px] text-muted-foreground">Define each component that comprises this fee total.</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={handleAddItem}
                  className="h-8 text-xs gap-1 rounded-xl"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Another Item
                </Button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-muted/20 p-1.5 rounded-xl border border-border/60">
                    <Input
                      placeholder="Item name (e.g. Tuition, Development Levy, Uniform)"
                      value={item.name}
                      onChange={(e) => handleItemChange(idx, "name", e.target.value)}
                      className="flex-1 text-sm rounded-xl h-9 bg-background"
                    />
                    <div className="relative w-36">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                        ₦
                      </span>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={item.amount}
                        onChange={(e) => handleItemChange(idx, "amount", e.target.value)}
                        className="pl-7 text-right text-sm font-mono font-bold rounded-xl h-9 bg-background"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      className="h-9 w-9 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-xl shrink-0"
                      onClick={() => handleRemoveItem(idx)}
                      title="Remove Item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Total Assessment Running Sum */}
              <div className="flex items-center justify-between bg-primary/5 p-4 rounded-xl border border-primary/20">
                <div>
                  <span className="text-xs font-bold text-primary uppercase block">Total Assessment Per Student</span>
                  <span className="text-[11px] text-muted-foreground">Combined sum of all itemized line items</span>
                </div>
                <span className="text-2xl font-black font-mono text-primary">
                  ₦{calculateFormTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-4 border-t border-border mt-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="rounded-xl h-10 font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveStructure}
              disabled={isSubmitting}
              className="rounded-xl h-10 font-bold px-6 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isSubmitting ? "Saving Template..." : editingId ? "Update Fee Structure" : "Save Fee Structure"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VIEW LINE ITEMS BREAKDOWN MODAL */}
      <Dialog open={!!viewStructure} onOpenChange={(open) => !open && setViewStructure(null)}>
        {viewStructure && (
          <DialogContent className="max-w-xl rounded-2xl border-border bg-card text-card-foreground p-6">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5 border-primary/30 text-primary">
                  {viewStructure.category || "GENERAL"}
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">
                  {viewStructure.term} • {viewStructure.session}
                </span>
              </div>
              <DialogTitle className="text-xl font-bold text-foreground mt-1">
                {getDisplayName(viewStructure)}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Applies to: <span className="font-semibold text-foreground">{getCleanAppliesTo(viewStructure)}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow className="border-b border-border">
                      <TableHead className="text-xs font-bold uppercase text-muted-foreground pl-4">Item Name</TableHead>
                      <TableHead className="text-xs font-bold uppercase text-muted-foreground text-right pr-4">Amount</TableHead>
                      <TableHead className="text-xs font-bold uppercase text-muted-foreground text-right pr-4">Share %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewStructure.items?.map((item, idx) => {
                      const share =
                        viewStructure.totalAmount > 0
                          ? ((item.amount / viewStructure.totalAmount) * 100).toFixed(1)
                          : "0";
                      return (
                        <TableRow key={item.id || idx} className="border-b border-border/70 hover:bg-muted/20">
                          <TableCell className="pl-4 py-2.5 font-medium text-sm text-foreground">
                            {item.name}
                          </TableCell>
                          <TableCell className="text-right pr-4 py-2.5 font-mono font-bold text-sm text-foreground">
                            ₦{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right pr-4 py-2.5 text-xs text-muted-foreground font-mono">
                            {share}%
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/40 border border-border">
                <span className="text-xs font-bold uppercase text-foreground">Total Fee Assessment</span>
                <span className="text-xl font-black font-mono text-primary">
                  ₦{viewStructure.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setViewStructure(null)}
                className="rounded-xl text-xs font-semibold"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  const target = viewStructure;
                  setViewStructure(null);
                  setConfirmGenerateStructure(target);
                }}
                disabled={viewStructure.status === "ARCHIVED"}
                className="rounded-xl text-xs font-bold gap-1.5"
              >
                <Receipt className="h-3.5 w-3.5" />
                Generate Invoices
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* PREVIEW STUDENT INVOICE MODAL */}
      <Dialog open={!!previewStructure} onOpenChange={(open) => !open && setPreviewStructure(null)}>
        {previewStructure && (
          <DialogContent className="max-w-2xl rounded-2xl border-border bg-card text-card-foreground p-6 sm:p-8">
            <DialogHeader className="border-b border-border pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <Badge variant="outline" className="text-[10px] font-mono uppercase tracking-widest text-primary border-primary/30">
                    Proforma Invoice Preview
                  </Badge>
                  <DialogTitle className="text-lg font-bold text-foreground mt-1">
                    Student Billing Statement
                  </DialogTitle>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-foreground">INV-2026-SAMPLE</span>
                  <div className="text-[11px] text-muted-foreground font-mono">Status: UNPAID</div>
                </div>
              </div>
            </DialogHeader>

            {/* Invoice Body */}
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-xl bg-muted/30 border border-border/70 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground block">Billed To (Sample Student)</span>
                  <p className="font-bold text-foreground">Musa Ibrahim Audu</p>
                  <p className="text-muted-foreground font-mono">ID: STU-2026-0042</p>
                  <p className="text-muted-foreground">{getCleanAppliesTo(previewStructure)}</p>
                </div>

                <div className="p-3 rounded-xl bg-muted/30 border border-border/70 space-y-1 text-right">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground block">Billing Terms</span>
                  <p className="font-semibold text-foreground">{previewStructure.term}</p>
                  <p className="text-muted-foreground font-mono">{previewStructure.session} Academic Session</p>
                  <p className="text-muted-foreground">Due Date: End of First Month</p>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow className="border-b border-border">
                      <TableHead className="text-xs font-bold uppercase text-muted-foreground pl-4">Description</TableHead>
                      <TableHead className="text-xs font-bold uppercase text-muted-foreground text-right pr-4">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewStructure.items?.map((item, idx) => (
                      <TableRow key={idx} className="border-b border-border/70">
                        <TableCell className="pl-4 py-2.5 text-xs font-medium text-foreground">
                          {item.name}
                        </TableCell>
                        <TableCell className="text-right pr-4 py-2.5 font-mono font-bold text-xs text-foreground">
                          ₦{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Total Card */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div>
                  <span className="text-xs font-bold uppercase text-primary block">Total Invoice Payable</span>
                  <span className="text-[11px] text-muted-foreground">Payment due via Bank Transfer, POS, or Portal</span>
                </div>
                <span className="text-2xl font-black font-mono text-primary">
                  ₦{previewStructure.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setPreviewStructure(null)}
                className="rounded-xl text-xs font-semibold"
              >
                Close Preview
              </Button>
              <Button
                onClick={() => {
                  const target = previewStructure;
                  setPreviewStructure(null);
                  setConfirmGenerateStructure(target);
                }}
                disabled={previewStructure.status === "ARCHIVED"}
                className="rounded-xl text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Receipt className="h-3.5 w-3.5" />
                Proceed to Generate Invoices
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* GENERATE INVOICES CONFIRMATION MODAL */}
      <Dialog open={!!confirmGenerateStructure} onOpenChange={(open) => !open && setConfirmGenerateStructure(null)}>
        {confirmGenerateStructure && (
          <DialogContent className="max-w-md rounded-2xl border-border bg-card text-card-foreground p-6">
            <DialogHeader>
              <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mb-2">
                <Receipt className="w-5 h-5" />
              </div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Generate Student Invoices
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                You are about to issue billing invoices for all eligible active students targeted by this fee schedule.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="bg-muted/40 p-3.5 rounded-xl border border-border space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Template Name:</span>
                  <span className="font-bold text-foreground">{getDisplayName(confirmGenerateStructure)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target Audience:</span>
                  <span className="font-semibold text-foreground">{getCleanAppliesTo(confirmGenerateStructure)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Academic Term:</span>
                  <span className="font-semibold text-foreground">{confirmGenerateStructure.term}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Session:</span>
                  <span className="font-mono text-foreground">{confirmGenerateStructure.session}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="text-muted-foreground font-semibold">Per Student Amount:</span>
                  <span className="font-mono font-bold text-primary">
                    ₦{confirmGenerateStructure.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <p>
                  Any active student who already has an invoice for this term and session will be automatically skipped to prevent duplicate charges.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setConfirmGenerateStructure(null)}
                disabled={generatingId === confirmGenerateStructure.id}
                className="rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                onClick={executeInvoiceGeneration}
                disabled={generatingId === confirmGenerateStructure.id}
                className="rounded-xl text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {generatingId === confirmGenerateStructure.id ? (
                  <>Processing Invoices...</>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Confirm & Bill Students
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
