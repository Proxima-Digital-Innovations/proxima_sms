'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle2, AlertCircle, Stamp, Calculator, Receipt, Loader2, ArrowRight } from 'lucide-react';
import { getMonthlyPayroll, generateMonthlyPayroll, markPayrollPaid, approvePayrollBatch } from '@/actions/payroll-actions';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function PayrollPage() {
  const [payroll, setPayroll] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);
  
  const currentMonth = 8;
  const currentYear = 2026;
  const { toast } = useToast();

  const fetchPayroll = async () => {
    setIsLoading(true);
    try {
      const res = await getMonthlyPayroll(currentMonth, currentYear);
      if (res.success && res.payrolls) {
        setPayroll(res.payrolls);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, []);

  const handleGenerate = async () => {
    if (!confirm('Generate payroll for all active staff? This will calculate BAS deductions and Subscriptions.')) return;
    setIsProcessing(true);
    try {
      const res = await generateMonthlyPayroll(currentMonth, currentYear, 1000); 
      if (res.success) {
        toast({ title: 'Success', description: res.message });
        fetchPayroll();
      } else {
        toast({ title: 'Notice', description: res.message, variant: 'default' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveBatch = async () => {
    if (!confirm('Approve all pending payrolls? This will lock the deductions.')) return;
    setIsApproving(true);
    try {
      const res = await approvePayrollBatch(currentMonth, currentYear);
      if (res.success) {
        toast({ title: 'Approved', description: 'Batch approved successfully.' });
        fetchPayroll();
      } else {
        toast({ title: 'Error', description: res.message, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsApproving(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      const res = await markPayrollPaid(id);
      if (res.success) {
        toast({ title: 'Marked Paid', description: 'Salary disbursement logged.' });
        fetchPayroll();
      } else {
        toast({ title: 'Error', description: res.message, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const hasPending = payroll.some(p => p.status === 'pending');

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
            <Calculator className="text-violet-400 w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Staff Payroll</h1>
            <p className="text-xs text-slate-400 font-medium">Automated salary disbursements with dynamic subscriptions & biometric deductions.</p>
          </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          {hasPending && (
             <Button 
               variant="outline"
               className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white h-9 flex-1 md:flex-none"
               onClick={handleApproveBatch}
               disabled={isApproving}
             >
               {isApproving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Stamp className="mr-2 h-4 w-4" />}
               {isApproving ? 'Approving...' : 'Approve Batch'}
             </Button>
          )}
          <Button 
            className="bg-violet-600 hover:bg-violet-700 text-white shadow-[0_0_15px_rgba(139,92,246,0.2)] h-9 flex-1 md:flex-none"
            onClick={handleGenerate}
            disabled={isProcessing}
          >
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            {isProcessing ? 'Processing Engine...' : 'Run Payroll Engine'}
          </Button>
        </div>
      </div>

      <div className="px-8 py-8 max-w-[1400px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card className="bg-slate-900/50 border-slate-800 shadow-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-800/50 bg-slate-900/40 pb-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                    Current Month Payroll
                    <Badge variant="outline" className="bg-violet-950/40 text-violet-400 border-violet-800/50 text-[10px] font-bold px-1.5 py-0 h-5">
                      Aug 2026
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-slate-400 mt-1">Salary breakdown after biometric and subscription deductions.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-900/80 border-b border-slate-800">
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="pl-6 text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Staff Member</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Base Pay</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Deductions</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Net Pay</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Status</TableHead>
                      <TableHead className="text-right pr-6 text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow className="hover:bg-transparent border-none">
                        <TableCell colSpan={6} className="h-48 text-center">
                          <div className="flex flex-col items-center justify-center space-y-3">
                            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                            <p className="text-sm font-medium text-slate-400">Loading payroll data...</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : payroll.length === 0 ? (
                      <TableRow className="hover:bg-transparent border-none">
                        <TableCell colSpan={6} className="h-48 text-center">
                          <div className="flex flex-col items-center justify-center space-y-3">
                            <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center">
                                <FileText className="h-6 w-6 text-slate-600" />
                            </div>
                            <p className="text-sm font-medium text-slate-400">No payroll generated. Click "Run Payroll Engine" to calculate salaries.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {payroll.map((record, index) => (
                          <motion.tr 
                            variants={itemVariants} 
                            initial="hidden" 
                            animate="show" 
                            custom={index} 
                            transition={{ delay: index * 0.05 }}
                            key={record.id} 
                            className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors group"
                          >
                            <TableCell className="font-semibold text-white pl-6">
                              {record.user?.firstName} {record.user?.lastName}
                            </TableCell>
                            <TableCell className="text-slate-400 font-mono">₦{record.baseAmount.toLocaleString()}</TableCell>
                            <TableCell className="text-red-400 font-medium font-mono">
                              -₦{record.deductions.toLocaleString()}
                            </TableCell>
                            <TableCell className="font-bold text-emerald-400 text-lg font-mono">
                              ₦{record.netAmount.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`
                                border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider
                                ${record.status === 'paid' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50' : ''}
                                ${record.status === 'approved' ? 'bg-violet-950/40 text-violet-400 border-violet-800/50' : ''}
                                ${record.status !== 'paid' && record.status !== 'approved' ? 'bg-amber-950/40 text-amber-400 border-amber-800/50' : ''}
                              `}>
                                {record.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right pr-6 space-x-2">
                              {record.status === 'approved' && (
                                <Button variant="outline" size="sm" className="border-emerald-800/50 text-emerald-400 hover:bg-emerald-900/30 hover:text-emerald-300" onClick={() => handleMarkPaid(record.id)}>
                                  Pay
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-all"
                                      onClick={() => setSelectedPayslip(record)}>
                                Payslip <ArrowRight className="w-4 h-4 ml-1.5" />
                              </Button>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Payslip Modal */}
      <Dialog open={!!selectedPayslip} onOpenChange={(open) => !open && setSelectedPayslip(null)}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-slate-200">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-violet-400" />
              Payslip & Deductions Receipt
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedPayslip?.user?.firstName} {selectedPayslip?.user?.lastName} - {selectedPayslip?.month}/{selectedPayslip?.year}
            </DialogDescription>
          </DialogHeader>
          
          {selectedPayslip && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-center">
                  <span className="block text-slate-500 mb-1 text-xs font-bold uppercase tracking-wider">Base Salary</span>
                  <span className="text-xl font-bold font-mono text-white">₦{selectedPayslip.baseAmount.toLocaleString()}</span>
                </div>
                <div className="p-4 bg-emerald-950/20 rounded-xl border border-emerald-900/50 flex flex-col justify-center">
                  <span className="block text-emerald-500 mb-1 text-xs font-bold uppercase tracking-wider">Net Pay</span>
                  <span className="text-xl font-bold font-mono text-emerald-400">₦{selectedPayslip.netAmount.toLocaleString()}</span>
                </div>
              </div>
              
              <div className="bg-red-950/20 p-5 rounded-xl border border-red-900/50 space-y-4">
                <div className="flex items-center text-red-400 font-semibold border-b border-red-900/50 pb-3">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  Total Deductions: ₦{selectedPayslip.deductions.toLocaleString()}
                </div>
                
                {/* Subscription Breakdowns */}
                {selectedPayslip.subscriptionsReport && (
                  (() => {
                    const subReport = JSON.parse(selectedPayslip.subscriptionsReport);
                    if (subReport.breakdown && subReport.breakdown.length > 0) {
                      return (
                        <div className="space-y-2 text-sm text-red-400/80 pb-3 border-b border-red-900/50">
                          <span className="font-semibold block mb-2 text-red-400">Staff Subscriptions:</span>
                          {subReport.breakdown.map((sub: any, idx: number) => (
                            <div key={idx} className="flex justify-between pl-2">
                              <span>{sub.name}</span>
                              <span className="font-mono">-₦{sub.amount.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  })()
                )}

                {/* BAS Breakdowns */}
                {selectedPayslip.basReport ? (
                  (() => {
                    const report = JSON.parse(selectedPayslip.basReport);
                    return (
                      <div className="space-y-2 text-sm text-red-400/80">
                        <span className="font-semibold block mb-2 text-red-400">Attendance Penalties:</span>
                        <div className="flex justify-between pl-2 mb-1.5">
                          <span>Absences ({report.absentDays} days)</span>
                          <span className="font-mono">-₦{report.absenceDeduction.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between pl-2">
                          <span>Lateness / Incomplete ({report.lateDays + (report.incompleteLogs || 0)} times)</span>
                          <span className="font-mono">-₦{report.latenessDeduction.toLocaleString()}</span>
                        </div>
                        
                        {report.logs && report.logs.length > 0 && (
                          <div className="pt-3 mt-3 border-t border-red-900/50">
                            <span className="font-semibold block mb-2 text-xs text-red-400 uppercase tracking-wider">Incident Log:</span>
                            <ul className="list-disc pl-4 space-y-1.5 text-xs text-red-400/60">
                              {report.logs.map((log: string, idx: number) => (
                                <li key={idx}>{log}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : null}

                {!selectedPayslip.basReport && !selectedPayslip.subscriptionsReport && (
                   <p className="text-sm text-red-400/60 text-center py-2">No deductions recorded.</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
