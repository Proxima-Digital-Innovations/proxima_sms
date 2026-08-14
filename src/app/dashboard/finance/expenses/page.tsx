'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Search, Trash2, Wallet, ArrowDownToLine, Loader2 } from 'lucide-react';
import { getExpenses, deleteExpense } from '@/actions/expense-actions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const fetchExpensesData = async () => {
    setIsLoading(true);
    try {
      const res = await getExpenses();
      if (res.success && res.expenses) {
        setExpenses(res.expenses);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpensesData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    
    try {
      const res = await deleteExpense(id);
      if (res.success) {
        toast({ title: 'Success', description: 'Expense deleted.' });
        fetchExpensesData();
      } else {
        toast({ title: 'Error', description: 'Failed to delete.', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const filteredExpenses = expenses.filter(exp => 
    exp.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
    exp.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <div className="p-2.5 bg-rose-600/20 border border-rose-500/30 rounded-xl shadow-[0_0_15px_rgba(225,29,72,0.15)]">
            <ArrowDownToLine className="text-rose-400 w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Operating Expenses</h1>
            <p className="text-xs text-slate-400 font-medium">Record and track day-to-day school expenditures.</p>
          </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Button className="bg-rose-600 hover:bg-rose-700 text-white shadow-[0_0_15px_rgba(225,29,72,0.2)] h-9 flex-1 md:flex-none">
            <PlusCircle className="mr-2 h-4 w-4" /> Record Expense
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
                    Expense Ledger
                  </CardTitle>
                  <CardDescription className="text-slate-400 mt-1">Recent expenses logged by authorized staff.</CardDescription>
                </div>
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    placeholder="Search by category or desc..."
                    className="pl-9 bg-slate-950 border-slate-800 text-white focus-visible:ring-rose-500 placeholder:text-slate-600 h-9"
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
                      <TableHead className="pl-6 text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Date</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Category</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Description</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Logged By</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Amount</TableHead>
                      <TableHead className="text-right pr-6 text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow className="hover:bg-transparent border-none">
                        <TableCell colSpan={6} className="h-48 text-center">
                          <div className="flex flex-col items-center justify-center space-y-3">
                            <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
                            <p className="text-sm font-medium text-slate-400">Loading expenses...</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredExpenses.length === 0 ? (
                      <TableRow className="hover:bg-transparent border-none">
                        <TableCell colSpan={6} className="h-48 text-center">
                          <div className="flex flex-col items-center justify-center space-y-3">
                            <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center">
                                <Wallet className="h-6 w-6 text-slate-600" />
                            </div>
                            <p className="text-sm font-medium text-slate-400">No expenses found.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <motion.Fragment variants={containerVariants} initial="hidden" animate="show">
                        {filteredExpenses.map((exp) => (
                          <motion.tr variants={itemVariants} key={exp.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors group">
                            <TableCell className="pl-6 text-slate-300 font-medium">{format(new Date(exp.date), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-slate-900 text-slate-300 border-slate-700 text-[10px] font-bold uppercase tracking-wider">{exp.category}</Badge>
                            </TableCell>
                            <TableCell className="font-semibold text-white">
                              {exp.description}
                              {exp.memo && (
                                <div className="mt-1.5">
                                  <Badge variant="outline" className="text-[9px] bg-indigo-950/30 text-indigo-400 border-indigo-900/50">
                                    Via Memo: {exp.memo.reference}
                                  </Badge>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-slate-400 text-sm">{exp.recordedByU?.firstName || exp.recordedByU?.name || 'Unknown'}</TableCell>
                            <TableCell className="font-mono font-bold text-rose-400">₦{exp.amount.toLocaleString()}</TableCell>
                            <TableCell className="text-right pr-6">
                              <Button variant="ghost" size="icon" className="text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 opacity-0 group-hover:opacity-100 transition-all" onClick={() => handleDelete(exp.id)}>
                                <Trash2 className="h-4 w-4" />
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
