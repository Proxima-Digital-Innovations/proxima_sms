import { getPayrollHistory, runPayroll } from "@/actions/payroll-actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { formatCurrency } from "@/lib/utils";

export default async function PayrollManagementPage() {
  const { success, history, message } = await getPayrollHistory();

  if (!success) {
    return <div className="p-6 text-red-500">Error: {message}</div>;
  }

  // Find the latest payroll run month/year
  let latestRunStr = "None";
  if (history && history.length > 0) {
    const latest = history[0];
    const date = new Date(latest.year, latest.month - 1);
    latestRunStr = date.toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payroll Processing</h1>
          <p className="text-muted-foreground mt-2">Latest Payroll Run: {latestRunStr}</p>
        </div>
        
        {/* In a real app, this form would submit to a Server Action to run payroll for the current month */}
        <form action={async () => {
          "use server";
          const today = new Date();
          await runPayroll(today.getMonth() + 1, today.getFullYear());
        }}>
          <Button size="lg" className="bg-primary hover:bg-primary/90">
            Run Current Month Payroll
          </Button>
        </form>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Staff Paid</CardTitle>
            <CardDescription>Current academic year</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{history?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payroll History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Staff Name</TableHead>
                <TableHead>Gross Pay</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net Pay</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history?.map((record: any) => {
                const date = new Date(record.year, record.month - 1);
                
                return (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {date.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </TableCell>
                    <TableCell>{record.user?.firstName} {record.user?.lastName}</TableCell>
                    <TableCell>{formatCurrency(record.grossPay || 0)}</TableCell>
                    <TableCell className="text-red-500">{formatCurrency(record.deductions || 0)}</TableCell>
                    <TableCell className="font-bold text-emerald-600">
                      {formatCurrency(record.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={record.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : ''}>
                        {record.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Payslip</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {history?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                    No payroll records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
