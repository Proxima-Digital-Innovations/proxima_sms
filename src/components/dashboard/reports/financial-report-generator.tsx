
'use client';

import { useState, useEffect, useTransition } from 'react';
import { DateRange } from 'react-day-picker';
import { addDays, format, startOfMonth } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useToast } from '@/hooks/use-toast';
import { getFinancialReportData } from '@/actions/finance-actions';
import { getSystemSettings } from '@/actions/system-actions';
import type { Payment, Expense } from '@/lib/schema';
import { ArrowDown, ArrowUp, BarChart, FileText, Loader2, Minus, Plus, Printer, Bot, School } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { aiEngine } from '@/ai';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type ReportData = {
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    payments: any[];
    expenses: any[];
    expenseByCategory: { name: string; total: number }[];
}

export function FinancialReportGenerator() {
    const [date, setDate] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: new Date(),
    });
    const [isLoading, setIsLoading] = useState(false);
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const { toast } = useToast();
    const [isGeneratingAiSummary, startAiTransition] = useTransition();
    const [aiSummary, setAiSummary] = useState<string | null>(null);
    const [schoolInfo, setSchoolInfo] = useState({
      name: "Proxima SMS Academy",
      address: "12 Education Avenue, Knowledge District",
      phone: "+234 (0) 800 123 4567",
      email: "finance@proximaschools.edu",
      logo: null as string | null,
    });

    useEffect(() => {
      async function loadSettings() {
        try {
          const res = await getSystemSettings();
          if (res.success && res.data) {
            setSchoolInfo({
              name: res.data.schoolName || "Proxima SMS Academy",
              address: res.data.schoolAddress || "12 Education Avenue, Knowledge District",
              phone: res.data.schoolPhone || "+234 (0) 800 123 4567",
              email: res.data.schoolEmail || "finance@proximaschools.edu",
              logo: res.data.schoolLogo || null,
            });
          }
        } catch {
          // fallback
        }
      }
      loadSettings();
    }, []);
    
    const chartConfig = {
      total: { label: 'Expenses', color: 'hsl(var(--chart-1))' },
    };

    const handleGenerateReport = async () => {
        if (!date?.from || !date?.to) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a valid date range.' });
            return;
        }

        setIsLoading(true);
        setReportData(null);
        setAiSummary(null);

        try {
            const fromDate = date.from;
            const toDate = addDays(date.to, 1); // Include the whole end day

            const reportRes = await getFinancialReportData(fromDate, toDate);

            if (!reportRes.success) throw new Error(reportRes.message);

            const payments = reportRes.payments || [];
            const expenses = reportRes.expenses || [];

            const totalRevenue = payments.reduce((sum: any, p: any) => sum + p.amountPaid, 0);
            const totalExpenses = expenses.reduce((sum: any, e: any) => sum + e.amount, 0);
            
            const expenseByCategory = expenses.reduce((acc: any, expense: any) => {
                const category = acc.find((item: any) => item.name === expense.category);
                if (category) {
                    category.total += expense.amount;
                } else {
                    acc.push({ name: expense.category, total: expense.amount });
                }
                return acc;
            }, [] as { name: string; total: number }[]);

            setReportData({
                totalRevenue,
                totalExpenses,
                netIncome: totalRevenue - totalExpenses,
                payments,
                expenses,
                expenseByCategory
            });

            toast({ title: 'Report Generated', description: 'Financial report for the selected period is ready.' });

        } catch (error: any) {
            console.error("Error generating report:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not generate the report.' });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGenerateAiSummary = () => {
      if (!reportData) return;
      startAiTransition(async () => {
        setAiSummary('');
        try {
          const { summary } = await aiEngine.financial.analyze({
            totalRevenue: reportData.totalRevenue,
            totalExpenses: reportData.totalExpenses,
            netIncome: reportData.netIncome,
            currency: 'NGN',
          });
          setAiSummary(summary);
        } catch (e) {
          console.error(e);
          setAiSummary('Failed to generate AI summary.');
        }
      });
    };

    const handlePrintReport = () => {
        window.print();
    };

    const netIncomeColor = reportData && reportData.netIncome >= 0 ? 'text-green-600' : 'text-red-600';
    const reportTitle = `Financial Report: ${date?.from ? format(date.from, 'PPP') : ''} - ${date?.to ? format(date.to, 'PPP') : ''}`;


    return (
        <div className="space-y-6 print:space-y-0">
            <Card className="print:hidden">
                <CardHeader>
                    <CardTitle>Generate Financial Report</CardTitle>
                    <CardDescription>Select a date range to generate an income statement and expense report.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row items-center gap-4">
                    <DateRangePicker date={date} setDate={setDate} />
                    <Button onClick={handleGenerateReport} disabled={isLoading} className="w-full sm:w-auto">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                        Generate Report
                    </Button>
                    {reportData && (
                        <Button onClick={handlePrintReport} variant="outline" className="w-full sm:w-auto">
                            <Printer className="mr-2 h-4 w-4" />
                            Print Report
                        </Button>
                    )}
                </CardContent>
            </Card>

            {isLoading && <Skeleton className="h-96 w-full" />}

            {reportData && (
                <div id="print-area" className="space-y-6">
                    <div className="max-w-4xl mx-auto">
                         <div className="hidden print:flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-6">
                            <div className="flex items-center gap-3">
                              {schoolInfo.logo ? (
                                <img src={schoolInfo.logo} alt="Logo" className="w-14 h-14 object-contain" />
                              ) : (
                                <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center">
                                  <School className="w-8 h-8 text-slate-700" />
                                </div>
                              )}
                              <div className="text-left">
                                <h1 className="text-xl font-black uppercase tracking-wider text-slate-900">{schoolInfo.name}</h1>
                                <p className="text-xs text-slate-600 uppercase">{schoolInfo.address}</p>
                                <p className="text-[11px] text-slate-500 font-mono">Tel: {schoolInfo.phone} • Email: {schoolInfo.email}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">Financial Audit Statement</span>
                              <span className="text-sm font-black text-slate-900">{reportTitle}</span>
                            </div>
                        </div>
                         <Card>
                            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                                <div>
                                    <CardTitle>Income Statement</CardTitle>
                                    <CardDescription className="print:hidden">
                                        Financial summary for the period from {format(date?.from!, 'PPP')} to {format(date?.to!, 'PPP')}.
                                    </CardDescription>
                                </div>
                                <div className="print:hidden">
                                     <Button onClick={handleGenerateAiSummary} disabled={isGeneratingAiSummary} variant="outline" size="sm">
                                        {isGeneratingAiSummary ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                                        AI Summary
                                     </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {aiSummary && (
                                  <Alert>
                                    <Bot className="h-4 w-4" />
                                    <AlertTitle>AI-Powered Summary</AlertTitle>
                                    <AlertDescription>{aiSummary}</AlertDescription>
                                  </Alert>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="flex items-center gap-4 rounded-lg border p-4 bg-green-50 dark:bg-green-900/30">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
                                            <ArrowUp className="h-6 w-6 text-green-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Total Revenue</p>
                                            <p className="text-2xl font-bold">₦{reportData.totalRevenue.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 rounded-lg border p-4 bg-red-50 dark:bg-red-900/30">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
                                            <ArrowDown className="h-6 w-6 text-red-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Total Expenses</p>
                                            <p className="text-2xl font-bold">₦{reportData.totalExpenses.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-4 rounded-lg border p-4 ${reportData.netIncome >= 0 ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-orange-50 dark:bg-orange-900/30'}`}>
                                        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${reportData.netIncome >= 0 ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-orange-100 dark:bg-orange-900/50'}`}>
                                            {reportData.netIncome >= 0 ? <Plus className="h-6 w-6 text-blue-500" /> : <Minus className="h-6 w-6 text-orange-500" />}
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Net Income</p>
                                            <p className={`text-2xl font-bold ${netIncomeColor}`}>₦{reportData.netIncome.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                         </Card>

                         <Card className="print:hidden">
                            <CardHeader>
                                <CardTitle>Expense Breakdown</CardTitle>
                                <CardDescription>Visual breakdown of expenses by category.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                 <ChartContainer config={chartConfig} className="w-full h-[300px]">
                                    <RechartsBarChart data={reportData.expenseByCategory} accessibilityLayer>
                                        <CartesianGrid vertical={false} />
                                        <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} angle={-45} textAnchor="end" height={60} />
                                        <YAxis />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <Bar dataKey="total" fill="var(--color-total)" radius={4} />
                                    </RechartsBarChart>
                                 </ChartContainer>
                            </CardContent>
                         </Card>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2">
                            <Card>
                                <CardHeader><CardTitle>Income Transactions</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Amount</TableHead><TableHead className="hidden sm:table-cell">Date</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {reportData.payments.map(p => (
                                                <TableRow key={p.id}>
                                                    <TableCell>{p.studentName}</TableCell>
                                                    <TableCell className="font-mono font-medium">₦{p.amountPaid.toLocaleString()}</TableCell>
                                                    <TableCell className="hidden sm:table-cell font-mono text-xs">
                                                        {p.paymentDate?.seconds ? format(new Date(p.paymentDate.seconds * 1000), 'PPP') : (p.paymentDate ? format(new Date(p.paymentDate), 'PPP') : '-')}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {reportData.payments.length === 0 && <TableRow><TableCell colSpan={3} className="text-center h-24">No income recorded in this period.</TableCell></TableRow>}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle>Expense Transactions</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Description</TableHead><TableHead>Amount</TableHead><TableHead className="hidden sm:table-cell">Date</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {reportData.expenses.map(e => (
                                                <TableRow key={e.id}>
                                                    <TableCell>{e.description}</TableCell>
                                                    <TableCell className="font-mono font-medium">₦{e.amount.toLocaleString()}</TableCell>
                                                    <TableCell className="hidden sm:table-cell font-mono text-xs">
                                                        {e.date?.seconds ? format(new Date(e.date.seconds * 1000), 'PPP') : (e.date ? format(new Date(e.date), 'PPP') : '-')}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                             {reportData.expenses.length === 0 && <TableRow><TableCell colSpan={3} className="text-center h-24">No expenses recorded in this period.</TableCell></TableRow>}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            )}
            <style jsx global>{`
                @media print {
                  body * {
                    visibility: hidden;
                  }
                  #print-area, #print-area * {
                    visibility: visible;
                  }
                  #print-area {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100vw !important;
                    margin: 0 !important;
                    padding: 24px !important;
                    background: white !important;
                    color: black !important;
                    z-index: 999999 !important;
                    display: block !important;
                  }
                  @page {
                    size: A4 portrait;
                    margin: 10mm;
                  }
                }
            `}</style>
        </div>
    )
}
