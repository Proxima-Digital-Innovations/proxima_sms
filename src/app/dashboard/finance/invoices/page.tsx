'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Search, FileText, Download, Receipt, ArrowRight, Loader2 } from 'lucide-react';
import { getTermInvoices } from '@/actions/finance-actions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    // For V1, we fetch all invoices globally or for a hardcoded current term.
    // In a real scenario, this would be filtered by a Term selector.
    const fetchInvoices = async () => {
      try {
        const res = await getTermInvoices('current_term_placeholder'); // Needs a real term ID
        if (res.success && res.invoices) {
          setInvoices(res.invoices);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-12 -mt-6 -mx-6">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-8 py-5 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-20 shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-violet-600/20 border border-violet-500/30 rounded-xl shadow-[0_0_15px_rgba(139,92,246,0.15)]">
            <Receipt className="text-violet-400 w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Invoices & Billing</h1>
            <p className="text-xs text-slate-400 font-medium">Manage student tuition, generate bills, and track outstanding balances.</p>
          </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white h-9 flex-1 md:flex-none">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <Button className="bg-violet-600 hover:bg-violet-700 text-white shadow-[0_0_15px_rgba(139,92,246,0.2)] h-9 flex-1 md:flex-none">
            <PlusCircle className="mr-2 h-4 w-4" /> Generate Invoices
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
                    All Invoices
                    <Badge variant="outline" className="bg-slate-800 text-slate-300 border-slate-700 text-[10px] font-bold px-1.5 py-0 h-5">
                      Current Term
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-slate-400 mt-1">A complete ledger of generated invoices for the current term.</CardDescription>
                </div>
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    placeholder="Search by student name or ID..."
                    className="pl-9 bg-slate-950 border-slate-800 text-white focus-visible:ring-violet-500 placeholder:text-slate-600 h-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-900/80 border-b border-slate-800">
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="pl-6 text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Student</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Description</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Amount</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Balance</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Due Date</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Status</TableHead>
                      <TableHead className="text-right pr-6 text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow className="hover:bg-transparent border-none">
                        <TableCell colSpan={7} className="h-48 text-center">
                          <div className="flex flex-col items-center justify-center space-y-3">
                            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                            <p className="text-sm font-medium text-slate-400">Loading invoices...</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : invoices.length === 0 ? (
                      <TableRow className="hover:bg-transparent border-none">
                        <TableCell colSpan={7} className="h-48 text-center">
                          <div className="flex flex-col items-center justify-center space-y-3">
                            <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center">
                                <FileText className="h-6 w-6 text-slate-600" />
                            </div>
                            <p className="text-sm font-medium text-slate-400">No invoices found. Generate invoices to get started.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <motion.Fragment variants={containerVariants} initial="hidden" animate="show">
                        {invoices.filter((inv) => inv.student?.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || inv.description?.toLowerCase().includes(searchQuery.toLowerCase())).map((inv) => (
                          <motion.tr variants={itemVariants} key={inv.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors group">
                            <TableCell className="font-semibold text-white pl-6">{inv.student?.user?.name || 'Unknown Student'}</TableCell>
                            <TableCell className="text-slate-300 font-medium">{inv.description}</TableCell>
                            <TableCell className="font-mono text-slate-300">₦{inv.amount.toLocaleString()}</TableCell>
                            <TableCell className="font-mono font-bold text-white">₦{inv.balance.toLocaleString()}</TableCell>
                            <TableCell className="text-slate-400 text-sm font-medium">{format(new Date(inv.dueDate), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`
                                border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider
                                ${inv.status === 'PAID' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50' : ''}
                                ${inv.status === 'PARTIAL' ? 'bg-amber-950/40 text-amber-400 border-amber-800/50' : ''}
                                ${inv.status !== 'PAID' && inv.status !== 'PARTIAL' ? 'bg-red-950/40 text-red-400 border-red-800/50' : ''}
                              `}>
                                {inv.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-all">
                                View <ArrowRight className="w-4 h-4 ml-1.5" />
                              </Button>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </motion.Fragment>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
