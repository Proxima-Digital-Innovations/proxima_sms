"use client";

import React, { useState, useEffect } from "react";
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
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Banknote,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  Plus,
  Search,
  Wallet,
  ArrowRight,
  Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { getLoansData } from "@/actions/payroll-pro-actions";
import { motion } from "framer-motion";

export default function LoansAdvancesPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getLoansData();
        if (res.success) {
          setData(res.data);
        }
      } catch (error) {
        console.error("Failed to load loans data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const loans = data?.loans || [];

  const mappedLoans = loans.map((loan: any) => ({
    id: loan.id,
    employee: `${loan.user.firstName} ${loan.user.lastName}`,
    role: loan.user.role,
    type: loan.reason || "Salary Advance",
    amount: loan.amount,
    paid: loan.amount - loan.remainingBalance,
    status: loan.status === "COMPLETED" ? "Completed" : loan.status === "ACTIVE" ? "Active" : loan.status === "APPROVED" ? "Active" : "Pending",
    nextDeduction: `₦${loan.monthlyDeduction}`,
  }));

  const activeLoans = mappedLoans.filter((l: any) => l.status === "Active");
  const pendingLoans = mappedLoans.filter((l: any) => l.status === "Pending");
  const completedLoans = mappedLoans.filter((l: any) => l.status === "Completed");

  const totalOutstanding = activeLoans.reduce((acc: any, l: any) => acc + (l.amount - l.paid), 0);
  const totalApproved = mappedLoans.reduce((acc: any, l: any) => acc + l.amount, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-12 -mt-6 -mx-6">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-8 py-5 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-20 shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-violet-600/20 border border-violet-500/30 rounded-xl shadow-[0_0_15px_rgba(139,92,246,0.15)]">
            <Wallet className="text-violet-400 w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Staff Loans & Advances</h1>
            <p className="text-xs text-slate-400 font-medium">Manage employee loans, salary advances, and monthly deductions.</p>
          </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white h-9 flex-1 md:flex-none">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button className="bg-violet-600 hover:bg-violet-700 text-white shadow-[0_0_15px_rgba(139,92,246,0.2)] h-9 flex-1 md:flex-none">
            <Plus className="mr-2 h-4 w-4" />
            New Application
          </Button>
        </div>
      </div>

      <div className="px-8 py-8 max-w-[1400px] mx-auto space-y-8">
        
        <motion.div 
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={itemVariants}>
            <Card className="bg-slate-900/50 border-slate-800 shadow-xl overflow-hidden group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                  Total Outstanding
                </CardTitle>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                  <Banknote className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white font-mono">{formatCurrency(totalOutstanding)}</div>
                <p className="text-xs text-slate-500 mt-1">
                  From <span className="text-emerald-400 font-semibold">{activeLoans.length}</span> active loans
                </p>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <Card className="bg-slate-900/50 border-slate-800 shadow-xl overflow-hidden group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">Active Loans</CardTitle>
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                  <Clock className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{activeLoans.length}</div>
                <p className="text-xs text-slate-500 mt-1">Currently in repayment</p>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <Card className="bg-slate-900/50 border-slate-800 shadow-xl overflow-hidden group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">Pending Approvals</CardTitle>
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
                  <Clock className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{pendingLoans.length}</div>
                <p className="text-xs text-slate-500 mt-1">Awaiting HR/Finance review</p>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <Card className="bg-slate-900/50 border-slate-800 shadow-xl overflow-hidden group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">Total Approved</CardTitle>
                <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400 group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white font-mono">{formatCurrency(totalApproved)}</div>
                <p className="text-xs text-slate-500 mt-1">All time approved</p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          <Tabs defaultValue="active" className="space-y-6">
            <TabsList className="bg-slate-900 border border-slate-800">
              <TabsTrigger value="active" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">Active & Pending</TabsTrigger>
              <TabsTrigger value="completed" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">Completed</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4 outline-none">
              <Card className="bg-slate-900/50 border-slate-800 shadow-xl overflow-hidden">
                <CardHeader className="border-b border-slate-800/50 bg-slate-900/40 pb-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg font-bold text-white">Current Loans & Advances</CardTitle>
                      <CardDescription className="text-slate-400 mt-1">
                        Track repayment progress for active employee loans.
                      </CardDescription>
                    </div>
                    <div className="flex w-full md:w-auto items-center space-x-2">
                      <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                        <Input
                          type="search"
                          placeholder="Search by employee..."
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
                          <TableHead className="pl-6 text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Ref ID</TableHead>
                          <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Employee</TableHead>
                          <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Type</TableHead>
                          <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Amount</TableHead>
                          <TableHead className="w-[200px] text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Repayment Progress</TableHead>
                          <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Next Deduction</TableHead>
                          <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10 pr-6">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                           <TableRow className="hover:bg-transparent border-none">
                             <TableCell colSpan={7} className="h-48 text-center">
                               <div className="flex flex-col items-center justify-center space-y-3">
                                 <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                                 <p className="text-sm font-medium text-slate-400">Loading loans data...</p>
                               </div>
                             </TableCell>
                           </TableRow>
                        ) : mappedLoans.filter((l: any) => l.status !== "Completed").length === 0 ? (
                           <TableRow className="hover:bg-transparent border-none">
                             <TableCell colSpan={7} className="h-48 text-center">
                               <div className="flex flex-col items-center justify-center space-y-3">
                                 <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center">
                                     <Wallet className="h-6 w-6 text-slate-600" />
                                 </div>
                                 <p className="text-sm font-medium text-slate-400">No active or pending loans found.</p>
                               </div>
                             </TableCell>
                           </TableRow>
                        ) : (
                           <React.Fragment>
                        {mappedLoans.filter((l: any) => l.status !== "Completed").map((loan: any, index: number) => {
                          const progress = loan.amount === 0 ? 0 : (loan.paid / loan.amount) * 100;
                          return (
                            <motion.tr 
                              variants={itemVariants} 
                              initial="hidden" 
                              animate="show" 
                              key={loan.id} 
                              className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors group"
                            >
                                    <TableCell className="font-mono text-slate-400 pl-6">
                                      #{loan.id.slice(0, 6).toUpperCase()}
                                    </TableCell>
                                    <TableCell>
                                      <div>
                                        <div className="font-semibold text-white">{loan.employee}</div>
                                        <div className="text-xs text-slate-500">
                                          {loan.role}
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className="bg-slate-900/50 text-slate-300 border-slate-700 font-normal">
                                        {loan.type}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="font-mono font-medium text-slate-200">{formatCurrency(loan.amount)}</TableCell>
                                    <TableCell>
                                      <div className="flex flex-col gap-1.5 w-full pr-4">
                                        <div className="flex justify-between items-end mb-1">
                                            <span className="text-[10px] font-medium text-slate-400">
                                              {formatCurrency(loan.paid)} paid
                                            </span>
                                            <span className="text-[10px] font-bold text-violet-400">
                                              {Math.round(progress)}%
                                            </span>
                                        </div>
                                          <Progress value={progress} className="h-1.5" />
                                      </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-emerald-400">{loan.nextDeduction}</TableCell>
                                    <TableCell className="pr-6">
                                      <Badge
                                        variant="outline"
                                        className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                          loan.status === "Active"
                                            ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/50"
                                            : "bg-amber-950/40 text-amber-400 border-amber-800/50"
                                        }`}
                                      >
                                        {loan.status}
                                      </Badge>
                                    </TableCell>
                                  </motion.tr>
                                );
                              })}
                      </React.Fragment>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="completed" className="space-y-4 outline-none">
              <Card className="bg-slate-900/50 border-slate-800 shadow-xl overflow-hidden">
                <CardHeader className="border-b border-slate-800/50 bg-slate-900/40 pb-5">
                  <CardTitle className="text-lg font-bold text-white">Completed Loans</CardTitle>
                  <CardDescription className="text-slate-400 mt-1">
                    History of fully repaid employee loans and advances.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-900/80 border-b border-slate-800">
                        <TableRow className="hover:bg-transparent border-none">
                          <TableHead className="pl-6 text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Ref ID</TableHead>
                          <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Employee</TableHead>
                          <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Type</TableHead>
                          <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Total Paid</TableHead>
                          <TableHead className="pr-6 text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                           <TableRow className="hover:bg-transparent border-none">
                             <TableCell colSpan={5} className="h-48 text-center">
                               <div className="flex flex-col items-center justify-center space-y-3">
                                 <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                                 <p className="text-sm font-medium text-slate-400">Loading loans data...</p>
                               </div>
                             </TableCell>
                           </TableRow>
                        ) : mappedLoans.filter((l: any) => l.status === "Completed").length === 0 ? (
                           <TableRow className="hover:bg-transparent border-none">
                             <TableCell colSpan={5} className="h-48 text-center">
                               <div className="flex flex-col items-center justify-center space-y-3">
                                 <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center">
                                     <CheckCircle2 className="h-6 w-6 text-slate-600" />
                                 </div>
                                 <p className="text-sm font-medium text-slate-400">No completed loans found.</p>
                               </div>
                             </TableCell>
                           </TableRow>
                        ) : (
                           <React.Fragment>
                            {mappedLoans.filter((l: any) => l.status === "Completed").map(
                              (loan: any, index: number) => (
                                <motion.tr variants={itemVariants} key={index} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                                  <TableCell className="font-mono text-slate-400 pl-6">
                                    #{loan.id.slice(0, 6).toUpperCase()}
                                  </TableCell>
                                  <TableCell>
                                    <div>
                                      <div className="font-semibold text-white">{loan.employee}</div>
                                      <div className="text-xs text-slate-500">
                                        {loan.role}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="bg-slate-900/50 text-slate-300 border-slate-700 font-normal">
                                      {loan.type}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="font-mono font-medium text-slate-200">{formatCurrency(loan.amount)}</TableCell>
                                  <TableCell className="pr-6">
                                    <Badge
                                      variant="outline"
                                      className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-slate-800/50 text-slate-400 border-slate-700"
                                    >
                                      {loan.status}
                                    </Badge>
                                  </TableCell>
                                </motion.tr>
                              )
                            )}
                          </React.Fragment>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
