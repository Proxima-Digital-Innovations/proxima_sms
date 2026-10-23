"use client";

import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, Wallet, Activity, CheckCircle2, ArrowUpRight, BarChart3, PieChart as PieIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4", "#f43f5e"];

interface ExecutiveChartsProps {
  hasFinance?: boolean;
  tierTitle?: string;
  monthlyFinancials: {
    month: string;
    revenue: number;
    expense: number;
    net: number;
  }[];
  classEnrollment: {
    name: string;
    students: number;
  }[];
  collectionStats: {
    totalInvoiced: number;
    totalCollected: number;
    pendingBalance: number;
    collectionRate: number;
  };
  departmentSpending: {
    name: string;
    amount: number;
  }[];
}

export function ExecutiveCharts({
  hasFinance = true,
  tierTitle = "Class",
  monthlyFinancials,
  classEnrollment,
  collectionStats,
  departmentSpending,
}: ExecutiveChartsProps) {
  return (
    <div className="space-y-6">
      {/* Primary Analytics Row */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Chart 1: Revenue vs Expense Velocity (Only when FINANCE is enabled) */}
        {hasFinance && (
          <div className="lg:col-span-7">
            <Card className="border-border shadow-sm bg-card text-card-foreground rounded-2xl overflow-hidden h-full flex flex-col">
              <CardHeader className="p-5 border-b border-border/80 bg-muted/20">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                      <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Fiscal Flow: Collections vs. Outflows
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                      Monthly fee collections compared against operating expenditures (in ₦).
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold text-xs">
                    Live Audit
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-5 flex-1 min-h-[340px]">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={monthlyFinancials} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                    <XAxis 
                      dataKey="month" 
                      className="text-[11px] font-medium" 
                      tick={{ fill: "currentColor" }} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <YAxis 
                      className="text-[11px] font-mono" 
                      tick={{ fill: "currentColor" }} 
                      axisLine={false} 
                      tickLine={false} 
                      tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        borderColor: "hsl(var(--border))",
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        fontSize: "12px",
                        color: "hsl(var(--foreground))"
                      }} 
                      formatter={(value: any) => [`₦${Number(value).toLocaleString()}`, ""]}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: "14px", fontSize: "12px" }} 
                    />
                    <Bar dataKey="revenue" name="Fee Collections" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={36} />
                    <Bar dataKey="expense" name="Disbursements" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Chart 2: Enrollment by Academic Tier */}
        <div className={hasFinance ? "lg:col-span-5" : "lg:col-span-7"}>
          <Card className="border-border shadow-sm bg-card text-card-foreground rounded-2xl overflow-hidden h-full flex flex-col">
            <CardHeader className="p-5 border-b border-border/80 bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                    <Users className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    Student Density by {tierTitle}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Active student distribution across current {tierTitle.toLowerCase()}s.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 flex-1 min-h-[340px]">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart 
                  layout="vertical" 
                  data={classEnrollment} 
                  margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" horizontal={false} />
                  <XAxis 
                    type="number" 
                    className="text-[11px] font-mono" 
                    tick={{ fill: "currentColor" }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    className="text-xs font-semibold" 
                    tick={{ fill: "currentColor" }} 
                    axisLine={false} 
                    tickLine={false} 
                    width={60}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      borderColor: "hsl(var(--border))",
                      borderRadius: "12px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      fontSize: "12px" 
                    }} 
                    formatter={(v: any) => [`${v} Students`, "Enrolled"]}
                  />
                  <Bar 
                    dataKey="students" 
                    name="Enrolled Students" 
                    fill="#8b5cf6" 
                    radius={[0, 6, 6, 0]} 
                    maxBarSize={24} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Secondary Row: Fee Realization & Department Spending */}
      {hasFinance ? (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Fee Collection Progress Breakdown */}
          <div className="lg:col-span-6">
            <Card className="border-border shadow-sm bg-card text-card-foreground rounded-2xl p-6">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div>
                  <h3 className="text-base font-bold text-foreground">Fee Collection Health & Realization</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Overall collection efficiency across all terms.</p>
                </div>
                <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {collectionStats.collectionRate}%
                </span>
              </div>

              <div className="space-y-4 mt-5">
                {/* Progress Bar Track */}
                <div>
                  <div className="flex justify-between text-xs font-medium text-muted-foreground mb-1.5">
                    <span>Collected ({collectionStats.collectionRate}%)</span>
                    <span>Pending Receivables ({Math.round(100 - collectionStats.collectionRate)}%)</span>
                  </div>
                  <div className="w-full h-3 bg-muted rounded-full overflow-hidden flex">
                    <div 
                      className="h-full bg-emerald-500 rounded-l-full transition-all" 
                      style={{ width: `${collectionStats.collectionRate}%` }} 
                    />
                    <div 
                      className="h-full bg-amber-500 rounded-r-full transition-all" 
                      style={{ width: `${100 - collectionStats.collectionRate}%` }} 
                    />
                  </div>
                </div>

                {/* Details Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 bg-muted/40 rounded-xl border border-border/80">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Total Invoiced</span>
                    <span className="text-sm font-black font-mono text-foreground mt-0.5 block">
                      ₦{collectionStats.totalInvoiced.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 block">Total Realized</span>
                    <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                      ₦{collectionStats.totalCollected.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                    <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-300 block">Uncollected</span>
                    <span className="text-sm font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5 block">
                      ₦{collectionStats.pendingBalance.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Cost Allocation by Department */}
          <div className="lg:col-span-6">
            <Card className="border-border shadow-sm bg-card text-card-foreground rounded-2xl p-6">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div>
                  <h3 className="text-base font-bold text-foreground">Cost Distribution by Department</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Top operational cost centers.</p>
                </div>
                <Badge variant="outline" className="text-xs font-semibold">
                  {departmentSpending.length} Centers
                </Badge>
              </div>

              <div className="space-y-3 mt-5">
                {departmentSpending.slice(0, 4).map((dept, i) => {
                  const totalDept = departmentSpending.reduce((s, d) => s + d.amount, 0);
                  const pct = totalDept > 0 ? Math.round((dept.amount / totalDept) * 100) : 0;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-foreground">{dept.name}</span>
                        <span className="font-mono text-muted-foreground">
                          ₦{dept.amount.toLocaleString(undefined, { minimumFractionDigits: 0 })} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full",
                            i === 0 ? "bg-rose-500" : i === 1 ? "bg-amber-500" : i === 2 ? "bg-blue-500" : "bg-emerald-500"
                          )} 
                          style={{ width: `${pct}%` }} 
                        />
                      </div>
                    </div>
                  );
                })}
                {departmentSpending.length === 0 && (
                  <p className="text-xs text-muted-foreground italic py-4 text-center">No department spending recorded yet.</p>
                )}
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Non-financial summary when finance module is disabled */}
          <div className="lg:col-span-12">
            <Card className="border-border shadow-sm bg-card text-card-foreground rounded-2xl p-6">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div>
                  <h3 className="text-base font-bold text-foreground">Departmental Infrastructure & Allocation</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Operational units active within the system.</p>
                </div>
                <Badge variant="outline" className="text-xs font-semibold">
                  {departmentSpending.length} Departments
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
                {departmentSpending.map((dept, i) => (
                  <div key={i} className="p-4 bg-muted/30 rounded-xl border border-border/70 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm text-foreground">{dept.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Active Unit</p>
                    </div>
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                ))}
                {departmentSpending.length === 0 && (
                  <p className="text-xs text-muted-foreground italic py-4 col-span-3 text-center">Institutional departments synchronized.</p>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
