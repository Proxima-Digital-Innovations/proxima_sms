"use client";

import React, { useState } from "react";
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
import { BookMarked, Download, Filter, Plus, Search, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createAccountCode, updateAccountCode, deleteAccountCode } from "@/actions/coa-actions";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface AccountCode {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  balance: number;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  totalBalance: number;
  accounts: AccountCode[];
}

export function CoaClient({ initialCategories }: { initialCategories: Category[] }) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState(categories[0]?.id || "");
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    categoryId: categories[0]?.id || "",
    code: "",
    name: "",
    balance: "0",
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);
  };

  const handleOpenNew = () => {
    setFormData({
      id: "",
      categoryId: activeTab || categories[0]?.id || "",
      code: "",
      name: "",
      balance: "0",
    });
    setIsEditing(false);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (account: AccountCode) => {
    setFormData({
      id: account.id,
      categoryId: account.categoryId,
      code: account.code,
      name: account.name,
      balance: account.balance.toString(),
    });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this account?")) return;
    
    setIsLoading(true);
    try {
      const res = await deleteAccountCode(id);
      if (res.success) {
        toast({ title: "Success", description: "Account deleted successfully." });
        router.refresh();
      } else {
        toast({ variant: "destructive", title: "Error", description: res.error });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const payload = {
        code: formData.code,
        name: formData.name,
        categoryId: formData.categoryId,
        balance: parseFloat(formData.balance) || 0,
      };

      let res;
      if (isEditing) {
        res = await updateAccountCode(formData.id, payload);
      } else {
        res = await createAccountCode(payload);
      }

      if (res.success) {
        toast({ title: "Success", description: `Account ${isEditing ? 'updated' : 'created'} successfully.` });
        setIsDialogOpen(false);
        router.refresh();
      } else {
        toast({ variant: "destructive", title: "Error", description: res.error });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const activeCategory = categories.find(c => c.id === activeTab);
  const filteredAccounts = activeCategory?.accounts.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.code.includes(searchTerm)
  ) || [];

  const handleExportCSV = () => {
    const allAccounts = categories.flatMap(c => 
      c.accounts.map(a => ({
        category: c.name,
        code: a.code,
        name: a.name,
        balance: a.balance,
      }))
    );

    if (allAccounts.length === 0) {
      toast({ title: "No Accounts", description: "No account codes available to export." });
      return;
    }

    const headers = ["Category", "Account Code", "Account Name", "Current Balance (NGN)"];
    const rows = allAccounts.map(a => [
      `"${a.category}"`,
      `"${a.code}"`,
      `"${a.name.replace(/"/g, '""')}"`,
      a.balance
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Chart_of_Accounts_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Complete", description: "Chart of Accounts CSV downloaded successfully." });
  };

  return (
    <>
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-8 py-5 bg-background backdrop-blur-md border-b border-border sticky top-0 z-20 shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-blue-600/20 border border-blue-500/30 rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.15)]">
            <BookMarked className="text-blue-400 w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Chart of Accounts</h1>
            <p className="text-xs text-muted-foreground font-medium">Manage financial structure, accounts, and categories.</p>
          </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Button variant="outline" onClick={handleExportCSV} className="border-border text-foreground hover:bg-muted hover:text-foreground h-9 flex-1 md:flex-none">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={handleOpenNew} className="bg-blue-600 hover:bg-blue-700 text-white shadow-[0_0_15px_rgba(59,130,246,0.2)] h-9 flex-1 md:flex-none">
            <Plus className="mr-2 h-4 w-4" />
            New Account
          </Button>
        </div>
      </div>

      <div className="px-8 py-8 max-w-[1400px] mx-auto space-y-8">
        
        {/* Categories Overview Cards */}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
          {categories.map((category, idx) => (
            <Card key={category.id} className="bg-background border-border shadow-xl overflow-hidden group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{category.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground font-mono">{formatCurrency(category.totalBalance)}</div>
                <p className="text-xs text-muted-foreground mt-1 font-medium">{category.accounts.length} Accounts</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 fill-mode-both">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-background border border-border h-auto flex-wrap justify-start">
              {categories.map(category => (
                <TabsTrigger key={category.id} value={category.id} className="data-[state=active]:bg-muted data-[state=active]:text-foreground text-muted-foreground px-6 py-2.5">
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>
            
            <TabsContent value={activeTab} className="space-y-4 outline-none">
              <Card className="bg-background border-border shadow-xl overflow-hidden">
                <CardHeader className="border-b border-border bg-background pb-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg font-bold text-foreground">{activeCategory?.name} Accounts</CardTitle>
                      <CardDescription className="text-muted-foreground mt-1">
                        {activeCategory?.description || `Manage all ${activeCategory?.name?.toLowerCase()} accounts in your ledger.`}
                      </CardDescription>
                    </div>
                    <div className="flex w-full md:w-auto items-center space-x-2">
                      <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="search"
                          placeholder="Search accounts..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-8 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary h-9"
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-background border-b border-border">
                        <TableRow className="hover:bg-transparent border-none">
                          <TableHead className="pl-6 text-muted-foreground font-bold uppercase tracking-wider text-[10px] h-10 w-[120px]">Code</TableHead>
                          <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[10px] h-10">Account Name</TableHead>
                          <TableHead className="text-right text-muted-foreground font-bold uppercase tracking-wider text-[10px] h-10">Current Balance</TableHead>
                          <TableHead className="pr-6 text-right text-muted-foreground font-bold uppercase tracking-wider text-[10px] h-10 w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAccounts.length === 0 ? (
                           <TableRow className="hover:bg-transparent border-none">
                             <TableCell colSpan={4} className="h-48 text-center">
                               <div className="flex flex-col items-center justify-center space-y-3">
                                 <div className="w-12 h-12 bg-background rounded-full flex items-center justify-center">
                                     <BookMarked className="h-6 w-6 text-muted-foreground" />
                                 </div>
                                 <p className="text-sm font-medium text-muted-foreground">No accounts found in this category.</p>
                                 <Button variant="outline" onClick={handleOpenNew} className="mt-2 border-border text-foreground hover:bg-muted">
                                    Add your first account
                                 </Button>
                               </div>
                             </TableCell>
                           </TableRow>
                        ) : (
                          filteredAccounts.map((account) => (
                            <TableRow key={account.id} className="border-b border-border hover:bg-muted transition-colors group">
                              <TableCell className="font-mono text-foreground font-medium pl-6">{account.code}</TableCell>
                              <TableCell className="text-foreground font-semibold">{account.name}</TableCell>
                              <TableCell className="text-right font-mono font-bold text-foreground">
                                {formatCurrency(account.balance)}
                              </TableCell>
                              <TableCell className="pr-6 text-right">
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(account)} className="h-8 w-8 text-muted-foreground hover:text-blue-400">
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDelete(account.id)} className="h-8 w-8 text-muted-foreground hover:text-rose-400" disabled={isLoading}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">{isEditing ? 'Edit Account' : 'New Account'}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {isEditing ? 'Modify the account details below.' : 'Create a new ledger account code.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Category</label>
              <Select 
                value={formData.categoryId} 
                onValueChange={(val) => setFormData({...formData, categoryId: val})}
                disabled={isEditing}
              >
                <SelectTrigger className="bg-background border-border text-foreground focus:ring-blue-500">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id} className="text-foreground focus:bg-muted focus:text-foreground">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-1 space-y-2">
                <label className="text-sm font-medium text-foreground">Code</label>
                <Input 
                  required 
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                  className="bg-background border-border text-foreground focus-visible:ring-blue-500 font-mono" 
                  placeholder="1000"
                />
              </div>
              <div className="col-span-3 space-y-2">
                <label className="text-sm font-medium text-foreground">Account Name</label>
                <Input 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="bg-background border-border text-foreground focus-visible:ring-blue-500" 
                  placeholder="e.g. Cash at Bank"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Opening Balance (NGN)</label>
              <Input 
                type="number"
                step="0.01"
                required
                value={formData.balance}
                onChange={(e) => setFormData({...formData, balance: e.target.value})}
                className="bg-background border-border text-foreground focus-visible:ring-blue-500 font-mono" 
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="border-border text-foreground hover:bg-muted hover:text-foreground" disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
