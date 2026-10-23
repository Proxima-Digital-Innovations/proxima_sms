"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  Download,
  Filter,
  Plus,
  Search,
  BookCopy,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Scale
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getLedgerData, createJournalEntry } from "@/actions/ledger-actions";
import { toast } from "sonner";
import { format } from "date-fns";

export default function GeneralLedgerPage() {
  const [data, setData] = useState<{ categories: any[]; accounts: any[]; entries: any[] }>({
    categories: [],
    accounts: [],
    entries: [],
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // New Journal Entry Modal State
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
  const [entryDescription, setEntryDescription] = useState("");
  const [entryReference, setEntryReference] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [entryLines, setEntryLines] = useState<
    { accountId: string; debit: string; credit: string; description: string }[]
  >([
    { accountId: "", debit: "", credit: "", description: "" },
    { accountId: "", debit: "", credit: "", description: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadLedgerData();
  }, []);

  const loadLedgerData = async () => {
    setLoading(true);
    try {
      const res = await getLedgerData();
      if (res.success && res.data) {
        setData(res.data);
      } else {
        toast.error("Failed to load ledger records");
      }
    } catch (e) {
      toast.error("Failed to fetch ledger data");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount === 0) return "₦0.00";
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);
  };

  const accounts = data.accounts || [];
  const entries = data.entries || [];

  const flatEntries = entries.flatMap((entry: any) =>
    entry.lines.map((line: any) => ({
      id: entry.reference,
      date: format(new Date(entry.date), "MMM dd, yyyy"),
      description: line.description || entry.description,
      accountName: line.account?.name || "Unknown",
      accountCode: line.account?.code || "",
      account: `${line.account?.name || "Account"} (${line.account?.code || ""})`,
      debit: line.debit,
      credit: line.credit,
      status: "Posted",
    }))
  );

  const filteredEntries = flatEntries.filter(
    (e) =>
      e.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.account.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalAssets = accounts
    .filter((a: any) => a.category?.name?.includes("Asset"))
    .reduce((acc: number, a: any) => acc + a.balance, 0);

  const totalLiabilities = accounts
    .filter((a: any) => a.category?.name?.includes("Liability"))
    .reduce((acc: number, a: any) => acc + a.balance, 0);

  const totalEquity = accounts
    .filter((a: any) => a.category?.name?.includes("Equity"))
    .reduce((acc: number, a: any) => acc + a.balance, 0);

  // Journal Entry Dialog Handlers
  const handleOpenNewEntry = () => {
    setEntryReference(`JE-${Date.now().toString().slice(-6)}`);
    setEntryDescription("");
    setEntryDate(new Date().toISOString().split("T")[0]);
    const firstAcc = accounts[0]?.id || "";
    const secondAcc = accounts[1]?.id || firstAcc;
    setEntryLines([
      { accountId: firstAcc, debit: "", credit: "", description: "" },
      { accountId: secondAcc, debit: "", credit: "", description: "" },
    ]);
    setIsEntryDialogOpen(true);
  };

  const handleAddLine = () => {
    const defaultAcc = accounts[0]?.id || "";
    setEntryLines([...entryLines, { accountId: defaultAcc, debit: "", credit: "", description: "" }]);
  };

  const handleRemoveLine = (index: number) => {
    if (entryLines.length <= 2) {
      toast.error("A journal entry requires at least two lines");
      return;
    }
    setEntryLines(entryLines.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: string, value: string) => {
    const updated = [...entryLines];
    updated[index] = { ...updated[index], [field]: value };
    setEntryLines(updated);
  };

  const totalDebits = entryLines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
  const totalCredits = entryLines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01 && totalDebits > 0;

  const handleSubmitEntry = async () => {
    if (!entryDescription.trim()) {
      toast.error("Please enter a description for the transaction");
      return;
    }

    if (!isBalanced) {
      toast.error(`Transaction is not balanced. Debits (₦${totalDebits.toFixed(2)}) must equal Credits (₦${totalCredits.toFixed(2)})`);
      return;
    }

    setSubmitting(true);
    try {
      await createJournalEntry({
        description: entryDescription,
        reference: entryReference,
        date: entryDate,
        lines: entryLines.map((l) => ({
          accountId: l.accountId,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
          description: l.description.trim() || undefined,
        })),
      });

      toast.success("Journal entry posted to General Ledger!");
      setIsEntryDialogOpen(false);
      loadLedgerData();
    } catch (e: any) {
      toast.error(e.message || "Failed to post journal entry");
    } finally {
      setSubmitting(false);
    }
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    if (flatEntries.length === 0) {
      toast.error("No entries available to export");
      return;
    }

    const headers = ["Date", "Reference", "Account Code", "Account Name", "Description", "Debit", "Credit", "Status"];
    const rows = flatEntries.map((e) => [
      `"${e.date}"`,
      `"${e.id}"`,
      `"${e.accountCode}"`,
      `"${e.accountName.replace(/"/g, '""')}"`,
      `"${e.description.replace(/"/g, '""')}"`,
      e.debit,
      e.credit,
      `"${e.status}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `General_Ledger_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("General Ledger CSV exported successfully");
  };

  return (
    <div className="w-full space-y-5">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">General Ledger</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Double-entry bookkeeping, trial balance, and audited journal logs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            size="sm"
            className="gap-2 h-9 text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
          <Button
            onClick={handleOpenNewEntry}
            size="sm"
            className="gap-2 h-9 text-xs font-semibold"
          >
            <Plus className="h-3.5 w-3.5" />
            New Journal Entry
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border shadow-sm bg-card text-card-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Assets
            </CardTitle>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-foreground">{formatCurrency(totalAssets)}</div>
            <p className="text-xs text-muted-foreground mt-1">Bank, Cash & Receivables</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm bg-card text-card-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Liabilities
            </CardTitle>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
              <ArrowDownRight className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-foreground">{formatCurrency(totalLiabilities)}</div>
            <p className="text-xs text-muted-foreground mt-1">Payables & Advances</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm bg-card text-card-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Equity
            </CardTitle>
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <BookOpen className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-foreground">{formatCurrency(totalEquity)}</div>
            <p className="text-xs text-muted-foreground mt-1">Retained Reserves & Capital</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm bg-card text-card-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Journal Entries
            </CardTitle>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
              <BookCopy className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-foreground">{entries.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{flatEntries.length} individual ledger line(s)</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs View */}
      <Tabs defaultValue="journal" className="space-y-4">
        <TabsList className="bg-muted/60 p-1 border border-border">
          <TabsTrigger value="journal" className="text-xs data-[state=active]:bg-background">
            Journal Entries ({flatEntries.length})
          </TabsTrigger>
          <TabsTrigger value="balances" className="text-xs data-[state=active]:bg-background">
            Trial Balance Accounts ({accounts.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: JOURNAL ENTRIES */}
        <TabsContent value="journal" className="space-y-4 m-0">
          <Card className="border-border shadow-sm bg-card text-card-foreground">
            <CardHeader className="border-b border-border bg-muted/20 pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-semibold text-foreground">
                    Posted Journal Entries
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Audit trail of all recorded financial debits and credits.
                  </CardDescription>
                </div>
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search reference or account..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9 text-xs"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-12 text-center text-muted-foreground">Loading journal records...</div>
              ) : filteredEntries.length === 0 ? (
                <div className="p-12 text-center">
                  <BookOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-foreground font-medium">No journal entries recorded</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Click "New Journal Entry" above to post your first double-entry transaction.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                      <TableHead className="w-28">Date</TableHead>
                      <TableHead className="w-28">Ref #</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right w-32">Debit (₦)</TableHead>
                      <TableHead className="text-right w-32">Credit (₦)</TableHead>
                      <TableHead className="text-center w-24">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry, index) => (
                      <TableRow key={index} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="text-xs text-muted-foreground">{entry.date}</TableCell>
                        <TableCell className="font-mono text-xs font-semibold text-foreground">
                          {entry.id}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-foreground">{entry.account}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{entry.description}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                          {entry.debit > 0 ? formatCurrency(entry.debit) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-rose-600 dark:text-rose-400 font-semibold">
                          {entry.credit > 0 ? formatCurrency(entry.credit) : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]"
                          >
                            {entry.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: TRIAL BALANCE */}
        <TabsContent value="balances" className="space-y-4 m-0">
          <Card className="border-border shadow-sm bg-card text-card-foreground">
            <CardHeader className="border-b border-border bg-muted/20 pb-4">
              <CardTitle className="text-base font-semibold text-foreground">
                Trial Balance Snapshot
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Real-time balances across all configured Chart of Accounts codes.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {accounts.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">No accounts configured.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                      <TableHead className="w-28">Code</TableHead>
                      <TableHead>Account Name</TableHead>
                      <TableHead>Head Category</TableHead>
                      <TableHead className="text-right">Net Running Balance (₦)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((bal: any) => (
                      <TableRow key={bal.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-mono text-xs font-semibold text-foreground">
                          {bal.code}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-foreground">{bal.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-normal">
                            {bal.category?.name || "General"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold text-foreground">
                          {formatCurrency(bal.balance)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL: NEW JOURNAL ENTRY */}
      <Dialog open={isEntryDialogOpen} onOpenChange={setIsEntryDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookCopy className="h-4 w-4 text-primary" />
              Record Double-Entry Journal Transaction
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Reference #</label>
                <Input
                  value={entryReference}
                  onChange={(e) => setEntryReference(e.target.value)}
                  className="font-mono text-xs h-8"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Posting Date</label>
                <Input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Overall Description</label>
                <Input
                  placeholder="e.g. Bulk Textbook Purchase"
                  value={entryDescription}
                  onChange={(e) => setEntryDescription(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
            </div>

            {/* Entry Lines */}
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
                <span>Transaction Lines ({entryLines.length})</span>
                <Button variant="ghost" size="sm" onClick={handleAddLine} className="h-6 text-xs gap-1">
                  <Plus className="h-3 w-3" /> Add Row
                </Button>
              </div>

              <div className="p-3 space-y-2">
                {entryLines.map((line, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <select
                      className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={line.accountId}
                      onChange={(e) => handleLineChange(idx, "accountId", e.target.value)}
                    >
                      {accounts.map((acc: any) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.code} - {acc.name} ({acc.category?.name})
                        </option>
                      ))}
                    </select>

                    <Input
                      placeholder="Line memo (opt)"
                      value={line.description}
                      onChange={(e) => handleLineChange(idx, "description", e.target.value)}
                      className="w-36 h-8 text-xs"
                    />

                    <Input
                      type="number"
                      placeholder="Debit ₦"
                      value={line.debit}
                      onChange={(e) => handleLineChange(idx, "debit", e.target.value)}
                      className="w-24 h-8 text-xs text-right font-mono"
                    />

                    <Input
                      type="number"
                      placeholder="Credit ₦"
                      value={line.credit}
                      onChange={(e) => handleLineChange(idx, "credit", e.target.value)}
                      className="w-24 h-8 text-xs text-right font-mono"
                    />

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-rose-600"
                      onClick={() => handleRemoveLine(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Live Balancing Indicator */}
              <div className="bg-muted/20 border-t border-border px-4 py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {isBalanced ? (
                    <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                      <CheckCircle2 className="h-4 w-4" /> Balanced
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-rose-600 font-semibold">
                      <AlertCircle className="h-4 w-4" /> Difference: ₦{Math.abs(totalDebits - totalCredits).toFixed(2)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 font-mono font-bold">
                  <span>Debits: ₦{totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  <span>Credits: ₦{totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSubmitEntry}
              disabled={submitting || !isBalanced}
              className="w-full font-semibold"
            >
              {submitting ? "Posting Entry..." : "Post Transaction to General Ledger"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
