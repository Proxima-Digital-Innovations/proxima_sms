'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createMemo, getStaffList } from '@/actions/memo-actions';
import { useToast } from '@/hooks/use-toast';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function ComposeMemoPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [type, setType] = useState('MESSAGE');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [handlerId, setHandlerId] = useState('');
  const [staffList, setStaffList] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Leave Specific
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Voucher Specific
  const [amount, setAmount] = useState('');
  const [expenseType, setExpenseType] = useState('SCHOOL_EXPENSE');

  useEffect(() => {
    async function loadStaff() {
      const res = await getStaffList();
      if (res.success) setStaffList(res.staff);
    }
    loadStaff();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;
    
    setIsSubmitting(true);
    try {
      let metadata: any = null;
      if (type === 'LEAVE_REQUEST') {
        metadata = { startDate, endDate };
      } else if (type === 'CASH_VOUCHER') {
        metadata = { amount: parseFloat(amount), expenseType };
      }

      const res = await createMemo({
        senderId: session.user.id,
        type,
        title,
        content,
        currentHandlerId: handlerId || undefined,
        metadata
      });

      if (res.success) {
        toast({ title: 'Success', description: 'Memo routed successfully.' });
        router.push('/dashboard/communication');
      } else {
        toast({ title: 'Error', description: res.message, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Compose Memo</h2>
        <p className="text-muted-foreground mt-1">Submit a formal request or internal message.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Memo Type</label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MESSAGE">General Message</SelectItem>
                    <SelectItem value="LEAVE_REQUEST">Leave Request (BAS)</SelectItem>
                    <SelectItem value="CASH_VOUCHER">Cash Advance / Voucher</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Route To (Handler)</label>
                <Select value={handlerId} onValueChange={setHandlerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Department Head / Admin" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffList.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">The person responsible for approving or reading this.</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Subject / Title</label>
              <Input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Request for Sick Leave" />
            </div>

            {type === 'LEAVE_REQUEST' && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-orange-50 border border-orange-100 rounded-md">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <Input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
                <p className="col-span-2 text-xs text-orange-700">If approved, you will not be penalized for absence during these dates.</p>
              </div>
            )}

            {type === 'CASH_VOUCHER' && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-emerald-50 border border-emerald-100 rounded-md">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount Required (₦)</label>
                  <Input type="number" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="5000" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Expense Type</label>
                  <Select value={expenseType} onValueChange={setExpenseType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SCHOOL_EXPENSE">School Expense (e.g. Markers)</SelectItem>
                      <SelectItem value="PAYROLL_LOAN">Payroll Loan (Deducted from salary)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="col-span-2 text-xs text-emerald-700">This voucher will be routed for financial approval.</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Details / Justification</label>
              <Textarea 
                required 
                value={content} 
                onChange={e => setContent(e.target.value)} 
                rows={6}
                placeholder="Explain the reason for this memo..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || !handlerId} className="bg-blue-600 hover:bg-blue-700">
                {isSubmitting ? 'Routing...' : 'Submit Memo'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
