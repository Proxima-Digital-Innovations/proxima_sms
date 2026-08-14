'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, CreditCard, Banknote, Landmark, CheckCircle2, Wallet, HandCoins, Loader2 } from 'lucide-react';
import { logPayment } from '@/actions/finance-actions';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function PaymentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [studentInvoices, setStudentInvoices] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  
  // Payment Form State
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CASH');
  const [reference, setReference] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    // Placeholder for searching a student's invoices.
    // In V1, you would call a new server action like getStudentInvoices(query)
    setTimeout(() => {
      setStudentInvoices([
        { id: 'inv_123', description: 'Tuition Fee - First Term', amount: 150000, balance: 150000, status: 'UNPAID', dueDate: new Date().toISOString() },
        { id: 'inv_456', description: 'School Bus Fee', amount: 50000, balance: 25000, status: 'PARTIAL', dueDate: new Date().toISOString() }
      ]);
      setIsSearching(false);
    }, 1000);
  };

  const processPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    
    setIsProcessing(true);
    try {
      const res = await logPayment(selectedInvoice.id, parseFloat(amount), method, reference);
      if (res.success) {
        toast({ title: 'Payment Successful', description: 'Receipt has been generated.' });
        setSelectedInvoice(null);
        setAmount('');
        // Refresh the student invoices list here...
      } else {
        toast({ title: 'Payment Failed', description: res.message, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
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
          <div className="p-2.5 bg-emerald-600/20 border border-emerald-500/30 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <Wallet className="text-emerald-400 w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Receive Payments (POS)</h1>
            <p className="text-xs text-slate-400 font-medium">Search for a student to log manual cash, transfer, or card payments.</p>
          </div>
        </div>
      </div>

      <div className="px-8 py-8 max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Search & Invoices */}
          <div className="lg:col-span-2 space-y-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <Card className="bg-slate-900/50 border-slate-800 shadow-xl overflow-hidden">
                <CardHeader className="border-b border-slate-800/50 bg-slate-900/40 pb-5">
                  <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                    Student Lookup
                  </CardTitle>
                  <CardDescription className="text-slate-400">Enter student ID or name to view pending invoices.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleSearch} className="flex gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
                      <Input 
                        placeholder="e.g., STD-2026-001 or John Doe" 
                        className="pl-12 h-12 bg-slate-950 border-slate-800 text-white focus-visible:ring-emerald-500 placeholder:text-slate-600 text-lg"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="h-12 px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)] text-base" disabled={isSearching || !searchQuery}>
                      {isSearching ? 'Searching...' : 'Find Student'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            <AnimatePresence>
              {studentInvoices.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                >
                  <Card className="bg-slate-900/50 border-slate-800 shadow-xl overflow-hidden">
                    <CardHeader className="border-b border-slate-800/50 bg-slate-900/40 pb-5">
                      <CardTitle className="text-lg font-bold text-white">Pending Invoices</CardTitle>
                      <CardDescription className="text-slate-400">Select an invoice to log a payment against.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader className="bg-slate-900/80 border-b border-slate-800">
                          <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="pl-6 text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Description</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Balance</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Status</TableHead>
                            <TableHead className="text-right pr-6 text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {studentInvoices.map((inv) => (
                            <TableRow key={inv.id} className={`border-b border-slate-800/50 transition-colors group ${selectedInvoice?.id === inv.id ? 'bg-emerald-900/20' : 'hover:bg-slate-800/20'}`}>
                              <TableCell className="pl-6 font-medium text-slate-300">{inv.description}</TableCell>
                              <TableCell className="font-mono font-bold text-white text-lg">₦{inv.balance.toLocaleString()}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`
                                  border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider
                                  ${inv.status === 'PARTIAL' ? 'bg-amber-950/40 text-amber-400 border-amber-800/50' : 'bg-red-950/40 text-red-400 border-red-800/50'}
                                `}>
                                  {inv.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right pr-6">
                                <Button 
                                  variant={selectedInvoice?.id === inv.id ? "default" : "outline"} 
                                  size="sm"
                                  className={selectedInvoice?.id === inv.id ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "border-slate-700 text-slate-300 hover:bg-emerald-900/30 hover:text-emerald-400 hover:border-emerald-800"}
                                  onClick={() => {
                                    setSelectedInvoice(inv);
                                    setAmount(inv.balance.toString());
                                  }}
                                >
                                  {selectedInvoice?.id === inv.id ? 'Selected' : 'Pay This'}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column: Payment Form */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
            <Card className={`bg-slate-900/80 border-slate-800 shadow-2xl relative overflow-hidden transition-all duration-500 ${!selectedInvoice ? 'opacity-50 grayscale pointer-events-none' : 'ring-1 ring-emerald-500/30'}`}>
              
              {selectedInvoice && (
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-50" />
              )}
              
              <CardHeader className="border-b border-slate-800/50 bg-slate-900/40 pb-5 relative z-10">
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <HandCoins className="w-5 h-5 text-emerald-400" />
                  Log Payment
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {selectedInvoice ? selectedInvoice.description : 'Select an invoice first'}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-6 space-y-6 relative z-10">
                {selectedInvoice && (
                  <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 shadow-inner flex flex-col items-center justify-center text-center space-y-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Outstanding Balance</span>
                    <span className="text-4xl font-black text-white font-mono tracking-tight">₦{selectedInvoice.balance.toLocaleString()}</span>
                  </div>
                )}

                <form onSubmit={processPayment} className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Payment Amount (₦)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-3 text-slate-500 font-mono text-xl">₦</span>
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        className="h-14 pl-10 text-2xl font-black font-mono bg-slate-950 border-slate-800 text-white focus-visible:ring-emerald-500 placeholder:text-slate-700"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        max={selectedInvoice?.balance}
                        required
                      />
                    </div>
                    {selectedInvoice && parseFloat(amount) > selectedInvoice.balance && (
                      <p className="text-xs font-medium text-red-500 flex items-center mt-1">
                        Amount cannot exceed outstanding balance.
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Payment Method</label>
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        type="button" 
                        variant="outline"
                        className={`h-14 transition-all ${method === 'CASH' ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-300'}`}
                        onClick={() => setMethod('CASH')}
                      >
                        <Banknote className="mr-2 h-5 w-5" /> <span className="font-bold tracking-wide">CASH</span>
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline"
                        className={`h-14 transition-all ${method === 'TRANSFER' ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-300'}`}
                        onClick={() => setMethod('TRANSFER')}
                      >
                        <Landmark className="mr-2 h-5 w-5" /> <span className="font-bold tracking-wide">TRANSFER</span>
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline"
                        className={`h-14 transition-all col-span-2 ${method === 'CARD' ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-300'}`}
                        onClick={() => setMethod('CARD')}
                      >
                        <CreditCard className="mr-2 h-5 w-5" /> <span className="font-bold tracking-wide">POS / CARD</span>
                      </Button>
                    </div>
                  </div>

                  {method !== 'CASH' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 overflow-hidden">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Reference Number (Optional)</label>
                      <Input 
                        placeholder="e.g., TXN-987654321" 
                        className="bg-slate-950 border-slate-800 text-white focus-visible:ring-emerald-500 h-12"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                      />
                    </motion.div>
                  )}

                  <div className="pt-4 border-t border-slate-800/50">
                    <Button 
                      type="submit" 
                      className="w-full h-14 text-lg font-black bg-emerald-600 hover:bg-emerald-700 shadow-[0_0_20px_rgba(16,185,129,0.25)] text-white tracking-wide transition-all active:scale-[0.98]"
                      disabled={isProcessing || !amount || (selectedInvoice && parseFloat(amount) > selectedInvoice.balance)}
                    >
                      {isProcessing ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : (
                        <>
                          <CheckCircle2 className="mr-2 h-6 w-6" />
                          CONFIRM PAYMENT
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
