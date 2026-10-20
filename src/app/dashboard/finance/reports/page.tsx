"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getFinancialSummary, getRevenueVsExpenseData, getRecentTransactions } from "@/actions/report-actions";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Printer,
  Calendar,
  BarChart3
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

export default function ReportsDashboard() {
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMargin: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sumData, cData, txData] = await Promise.all([
        getFinancialSummary(),
        getRevenueVsExpenseData(),
        getRecentTransactions(),
      ]);
      setSummary(sumData);
      setChartData(cData);
      setTransactions(txData);
    } catch (e) {
      toast.error("Failed to load financial reports");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return `₦${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Financial Reports</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Live profit & loss overview, cashflow trends, and transaction ledger.
          </p>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2 text-xs">
            <Printer className="h-3.5 w-3.5" /> Print Statement
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm">Aggregating real-time financial ledger data...</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Revenue */}
            <Card className="border-border shadow-sm bg-card text-card-foreground overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <TrendingUp className="h-16 w-16 text-emerald-500" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  YTD Revenue
                </CardTitle>
                <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-2xl font-bold font-mono text-foreground">
                  {formatCurrency(summary.totalRevenue)}
                </div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                  Tuition, levies & settlements
                </p>
              </CardContent>
            </Card>

            {/* Expenses */}
            <Card className="border-border shadow-sm bg-card text-card-foreground overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <TrendingDown className="h-16 w-16 text-rose-500" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  YTD Expenses
                </CardTitle>
                <div className="h-7 w-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <ArrowDownRight className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-2xl font-bold font-mono text-foreground">
                  {formatCurrency(summary.totalExpenses)}
                </div>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium mt-1">
                  Staff payroll & operations
                </p>
              </CardContent>
            </Card>

            {/* Net Profit */}
            <Card className="border-border shadow-sm bg-card text-card-foreground overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Wallet className="h-16 w-16 text-primary" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Net Operating Surplus
                </CardTitle>
                <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${summary.netProfit >= 0 ? "bg-primary/10 text-primary" : "bg-rose-500/10 text-rose-600"}`}>
                  <Wallet className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className={`text-2xl font-bold font-mono ${summary.netProfit >= 0 ? "text-primary" : "text-rose-600"}`}>
                  {formatCurrency(summary.netProfit)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Gross revenue minus expenses</p>
              </CardContent>
            </Card>

            {/* Margin */}
            <Card className="border-border shadow-sm bg-card text-card-foreground overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Activity className="h-16 w-16 text-amber-500" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Operating Margin
                </CardTitle>
                <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Activity className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-2xl font-bold font-mono text-foreground">
                  {summary.profitMargin.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">Financial efficiency ratio</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-12">
            {/* Main Cashflow Chart */}
            <Card className="md:col-span-7 border-border shadow-sm bg-card text-card-foreground">
              <CardHeader className="pb-2 border-b border-border bg-muted/20">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Revenue vs Expenses (Trailing 6 Months)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 pl-0 pr-4">
                <div className="h-[340px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                      <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `₦${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "8px",
                          color: "hsl(var(--card-foreground))",
                          fontSize: "12px",
                        }}
                        formatter={(value: number) => [formatCurrency(value), ""]}
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      <Area
                        type="monotone"
                        dataKey="Revenue"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorRev)"
                      />
                      <Area
                        type="monotone"
                        dataKey="Expenses"
                        stroke="#f43f5e"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorExp)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Recent Ledger / Activity */}
            <Card className="md:col-span-5 border-border shadow-sm bg-card text-card-foreground flex flex-col">
              <CardHeader className="bg-muted/20 border-b border-border pb-3">
                <CardTitle className="text-base font-semibold text-foreground">
                  Recent Activity Stream
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1">
                <div className="h-[340px] overflow-y-auto divide-y divide-border">
                  {transactions.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground text-xs">
                      No recent transactions recorded.
                    </div>
                  ) : (
                    transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-3 hover:bg-muted/30 transition-colors flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                              tx.type === "REVENUE"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {tx.type === "REVENUE" ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground line-clamp-1">{tx.title}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {tx.description} • {new Date(tx.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div
                          className={`font-mono font-bold whitespace-nowrap pl-2 ${
                            tx.type === "REVENUE"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-foreground"
                          }`}
                        >
                          {tx.type === "REVENUE" ? "+" : "-"}
                          {formatCurrency(tx.amount)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
