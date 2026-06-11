
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, FileText, Landmark, Wallet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState, useCallback } from "react";
import { dbService } from "@/lib/dbService";
import type { Invoice, Payment, Expense } from "@/lib/schema";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";


type FinancialStats = {
    revenueThisTerm: number;
    outstandingReceivables: number;
    pendingInvoices: number;
    nextPayroll: number;
    expensesThisTerm: number;
};

export default function AccountantPage() {
    const [stats, setStats] = useState<FinancialStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const allInvoices = await dbService.getDocs<Invoice>('invoices');
            const outstandingReceivables = allInvoices
                .filter(inv => inv.status === 'Unpaid' || inv.status === 'Partially Paid')
                .reduce((sum, inv) => sum + inv.balance, 0);
            const pendingInvoices = allInvoices.filter(inv => inv.status === 'Unpaid').length;

            const allPayments = await dbService.getDocs<Payment>('payments');
            const revenueThisTerm = allPayments.reduce((sum, p) => sum + p.amountPaid, 0);

            const allExpenses = await dbService.getDocs<Expense>('expenses');
            const expensesThisTerm = allExpenses.reduce((sum, e) => sum + e.amount, 0);

            const staffWithSalary = await dbService.getDocs<{salary: {amount:number}}>('users', [
                { type: 'where', fieldPath: 'salary.amount', opStr: '>', value: 0 }
            ]);
            const nextPayroll = staffWithSalary.reduce((sum, staff) => sum + (staff.salary?.amount || 0), 0);
            
            setStats({
                revenueThisTerm,
                outstandingReceivables,
                pendingInvoices,
                nextPayroll,
                expensesThisTerm
            });

        } catch (error) {
            console.error("Failed to fetch accountant dashboard data:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load financial data.' });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);


    const renderStat = (value: number, isCurrency = true) => {
        if (isLoading) return <Skeleton className="h-8 w-24" />;
        if (isCurrency) return `NGN ${value.toLocaleString()}`;
        return value.toLocaleString();
    };

    const financialChartData = [
        { name: 'Revenue', value: stats?.revenueThisTerm ?? 0, fill: 'var(--color-revenue)' },
        { name: 'Expenses', value: stats?.expensesThisTerm ?? 0, fill: 'var(--color-expenses)' },
    ];
    
    const chartConfig = {
      value: {
        label: "Amount (NGN)",
      },
      revenue: {
        label: "Revenue",
        color: "hsl(var(--chart-2))",
      },
      expenses: {
        label: "Expenses",
        color: "hsl(var(--chart-5))",
      },
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="font-headline text-3xl font-bold">Accountant Dashboard</h1>
                <p className="text-muted-foreground">
                    A high-level overview of the school's financial health.
                </p>
            </div>
             <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                        Total Revenue (All Time)
                        </CardTitle>
                        <DollarSign className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{renderStat(stats?.revenueThisTerm ?? 0)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                        Outstanding Receivables
                        </CardTitle>
                        <Wallet className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{renderStat(stats?.outstandingReceivables ?? 0)}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                        Unpaid Invoices
                        </CardTitle>
                        <FileText className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{renderStat(stats?.pendingInvoices ?? 0, false)}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                        Next Payroll Estimate
                        </CardTitle>
                        <Landmark className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{renderStat(stats?.nextPayroll ?? 0)}</div>
                    </CardContent>
                </Card>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle>Financial Summary</CardTitle>
                    <CardDescription>
                        A comparison of total revenue against total expenses over all time.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-[300px] w-full" /> : (
                         <ChartContainer config={chartConfig} className="w-full h-[300px]">
                            <ResponsiveContainer>
                                <BarChart data={financialChartData}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                    />
                                    <YAxis tickFormatter={(value) => `NGN ${Number(value).toLocaleString()}`} />
                                    <ChartTooltip
                                        cursor={false}
                                        content={<ChartTooltipContent formatter={(value) => `NGN ${Number(value).toLocaleString()}`} />}
                                    />
                                    <Bar dataKey="value" radius={8} />
                                </BarChart>
                            </ResponsiveContainer>
                         </ChartContainer>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
