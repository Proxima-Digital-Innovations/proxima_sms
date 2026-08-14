import { prisma } from '@/lib/prisma';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TrendingUp, Users, DollarSign, Activity } from 'lucide-react';

export default async function AnalyticsDashboardPage({ params }: { params: Promise<{ school: string }> }) {
  
  
  const school = await prisma.systemProfile.findFirst();

  if (!school) return null;

  // Simple aggregations for SLT Dashboard
  const activeStudents = await prisma.student.count({
    where: { status: 'ACTIVE' }
  });

  const totalStaff = await prisma.user.count({
    where: { role: { in: ['TEACHER', 'ADMIN', 'HOD'] } }
  });

  // Financial aggregates (Mock logic - in reality, we'd sum Transaction amounts)
  const revenueResult = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { }
  });

  const expenseResult = await prisma.expense.aggregate({
    _sum: { amount: true },
    where: { }
  });

  const totalRevenue = revenueResult._sum.amount || 0;
  const totalExpense = expenseResult._sum.amount || 0;
  const netIncome = totalRevenue - totalExpense;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics & Leadership</h2>
          <p className="text-muted-foreground mt-1">High-level metrics and system health overview.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeStudents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStaff}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Income</CardTitle>
            <TrendingUp className={`h-4 w-4 ${netIncome >= 0 ? 'text-green-500' : 'text-rose-500'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netIncome >= 0 ? 'text-green-500' : 'text-rose-500'}`}>
              ${netIncome.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Recent Financial Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-10 text-muted-foreground">
              <p>Detailed charts will appear here.</p>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Enrollment Trends</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="text-center py-10 text-muted-foreground">
              <p>Historical enrollment data visualization.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
