import React from "react";
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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { getLedgerData } from "@/actions/ledger-actions";
import { format } from "date-fns";

export default async function GeneralLedgerPage() {
  const { data, success } = await getLedgerData();

  const formatCurrency = (amount: number) => {
    if (amount === 0) return "-";
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);
  };

  const accounts = data?.accounts || [];
  const entries = data?.entries || [];

  const flatEntries = entries.flatMap((entry: any) => 
    entry.lines.map((line: any) => ({
      id: entry.reference,
      date: format(new Date(entry.date), "MMM dd, yyyy"),
      description: line.description || entry.description,
      account: `${line.account.name} (${line.account.code})`,
      debit: line.debit,
      credit: line.credit,
      status: "Posted",
    }))
  );

  const totalAssets = accounts.filter((a: any) => a.category.name.includes("Asset")).reduce((acc: any, a: any) => acc + a.balance, 0);
  const totalLiabilities = accounts.filter((a: any) => a.category.name.includes("Liability")).reduce((acc: any, a: any) => acc + a.balance, 0);
  const totalEquity = accounts.filter((a: any) => a.category.name.includes("Equity")).reduce((acc: any, a: any) => acc + a.balance, 0);

  return (
    <div className="min-h-screen bg-slate-950 pb-12 -mt-6 -mx-6">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-8 py-5 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-20 shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-violet-600/20 border border-violet-500/30 rounded-xl shadow-[0_0_15px_rgba(139,92,246,0.15)]">
            <BookCopy className="text-violet-400 w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">General Ledger</h1>
            <p className="text-xs text-slate-400 font-medium">Comprehensive accounting view, journal entries, and trial balance.</p>
          </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white h-9 flex-1 md:flex-none">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button className="bg-violet-600 hover:bg-violet-700 text-white shadow-[0_0_15px_rgba(139,92,246,0.2)] h-9 flex-1 md:flex-none">
            <Plus className="mr-2 h-4 w-4" />
            New Entry
          </Button>
        </div>
      </div>

      <div className="px-8 py-8 max-w-[1400px] mx-auto space-y-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
          <Card className="bg-slate-900/50 border-slate-800 shadow-xl overflow-hidden group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">Total Assets</CardTitle>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white font-mono">{formatCurrency(totalAssets)}</div>
              <p className="text-xs text-emerald-400 mt-1 font-medium">+4.5% from last month</p>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900/50 border-slate-800 shadow-xl overflow-hidden group animate-in fade-in slide-in-from-bottom-4 duration-500 delay-75 fill-mode-both">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">Total Liabilities</CardTitle>
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 group-hover:scale-110 transition-transform">
                <ArrowDownRight className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white font-mono">{formatCurrency(totalLiabilities)}</div>
              <p className="text-xs text-rose-400 mt-1 font-medium">-1.2% from last month</p>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900/50 border-slate-800 shadow-xl overflow-hidden group animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 fill-mode-both">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">Total Equity</CardTitle>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                <BookOpen className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white font-mono">{formatCurrency(totalEquity)}</div>
              <p className="text-xs text-slate-500 mt-1 font-medium">Maintained steady</p>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900/50 border-slate-800 shadow-xl overflow-hidden group animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 fill-mode-both">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">Pending Entries</CardTitle>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
                <BookOpen className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white font-mono">0</div>
              <p className="text-xs text-slate-500 mt-1 font-medium">Needs approval</p>
            </CardContent>
          </Card>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 fill-mode-both">
          <Tabs defaultValue="journal" className="space-y-6">
            <TabsList className="bg-slate-900 border border-slate-800">
              <TabsTrigger value="journal" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">Journal Entries</TabsTrigger>
              <TabsTrigger value="balances" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">Trial Balance</TabsTrigger>
            </TabsList>
            
            <TabsContent value="journal" className="space-y-4 outline-none">
              <Card className="bg-slate-900/50 border-slate-800 shadow-xl overflow-hidden">
                <CardHeader className="border-b border-slate-800/50 bg-slate-900/40 pb-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg font-bold text-white">Recent Journal Entries</CardTitle>
                      <CardDescription className="text-slate-400 mt-1">
                        Review and manage double-entry bookkeeping records.
                      </CardDescription>
                    </div>
                    <div className="flex w-full md:w-auto items-center space-x-2">
                      <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                        <Input
                          type="search"
                          placeholder="Search entries..."
                          className="pl-8 bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-600 focus-visible:ring-violet-500 h-9"
                        />
                      </div>
                      <Button variant="outline" size="icon" className="border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white h-9 w-9">
                        <Filter className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-900/80 border-b border-slate-800">
                        <TableRow className="hover:bg-transparent border-none">
                          <TableHead className="pl-6 text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Date</TableHead>
                          <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Entry ID</TableHead>
                          <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Account</TableHead>
                          <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Description</TableHead>
                          <TableHead className="text-right text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Debit</TableHead>
                          <TableHead className="text-right text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Credit</TableHead>
                          <TableHead className="pr-6 text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {flatEntries.length === 0 ? (
                           <TableRow className="hover:bg-transparent border-none">
                             <TableCell colSpan={7} className="h-48 text-center">
                               <div className="flex flex-col items-center justify-center space-y-3">
                                 <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center">
                                     <BookOpen className="h-6 w-6 text-slate-600" />
                                 </div>
                                 <p className="text-sm font-medium text-slate-400">No journal entries found.</p>
                               </div>
                             </TableCell>
                           </TableRow>
                        ) : (
                          flatEntries.map((entry: any, index: number) => (
                            <TableRow key={index} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                              <TableCell className="text-slate-400 pl-6">{entry.date}</TableCell>
                              <TableCell className="font-mono text-white font-medium">{entry.id}</TableCell>
                              <TableCell className="text-slate-300">{entry.account}</TableCell>
                              <TableCell className="text-slate-400">{entry.description}</TableCell>
                              <TableCell className="text-right font-mono text-emerald-400">
                                {formatCurrency(entry.debit)}
                              </TableCell>
                              <TableCell className="text-right font-mono text-rose-400">
                                {formatCurrency(entry.credit)}
                              </TableCell>
                              <TableCell className="pr-6">
                                <Badge
                                  variant="outline"
                                  className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                    entry.status === "Posted"
                                      ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/50"
                                      : "bg-slate-800/50 text-slate-400 border-slate-700"
                                  }`}
                                >
                                  {entry.status}
                                </Badge>
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
            
            <TabsContent value="balances" className="space-y-4 outline-none">
              <Card className="bg-slate-900/50 border-slate-800 shadow-xl overflow-hidden">
                <CardHeader className="border-b border-slate-800/50 bg-slate-900/40 pb-5">
                  <CardTitle className="text-lg font-bold text-white">Account Balances</CardTitle>
                  <CardDescription className="text-slate-400 mt-1">Current balance snapshot by account.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-900/80 border-b border-slate-800">
                        <TableRow className="hover:bg-transparent border-none">
                          <TableHead className="pl-6 text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Account Code</TableHead>
                          <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Account Name</TableHead>
                          <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Type</TableHead>
                          <TableHead className="pr-6 text-right text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {accounts.length === 0 ? (
                           <TableRow className="hover:bg-transparent border-none">
                             <TableCell colSpan={4} className="h-48 text-center">
                               <div className="flex flex-col items-center justify-center space-y-3">
                                 <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center">
                                     <BookOpen className="h-6 w-6 text-slate-600" />
                                 </div>
                                 <p className="text-sm font-medium text-slate-400">No account balances found.</p>
                               </div>
                             </TableCell>
                           </TableRow>
                        ) : (
                          accounts.map((bal: any, index: number) => (
                            <TableRow key={index} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                              <TableCell className="font-mono text-white font-medium pl-6">{bal.code}</TableCell>
                              <TableCell className="text-slate-300 font-semibold">{bal.name}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-slate-900/50 text-slate-400 border-slate-800 font-normal">
                                  {bal.category.name}
                                </Badge>
                              </TableCell>
                              <TableCell className="pr-6 text-right font-mono font-bold text-white">
                                {formatCurrency(bal.balance)}
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
    </div>
  );
}
