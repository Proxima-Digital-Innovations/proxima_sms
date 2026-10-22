'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getMemoDetails, processMemo, getStaffList } from '@/actions/memo-actions';
import { useToast } from '@/hooks/use-toast';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { CheckCircle2, XCircle, Forward, Clock, ArrowLeft } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export default function MemoDetailsPage() {
  const router = useRouter();
  const routeParams = useParams();
  const memoId = routeParams?.id as string;
  const { data: session } = useSession();
  const { toast } = useToast();

  const [memo, setMemo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [staffList, setStaffList] = useState<any[]>([]);
  
  // Action State
  const [actionNotes, setActionNotes] = useState('');
  const [forwardToId, setForwardToId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!memoId) return;
      setIsLoading(true);
      const res = await getMemoDetails(memoId);
      if (res.success) setMemo(res.memo);
      
      const staffRes = await getStaffList();
      if (staffRes.success) setStaffList(staffRes.staff);
      
      setIsLoading(false);
    }
    loadData();
  }, [memoId]);

  const handleAction = async (action: 'APPROVED' | 'REJECTED' | 'KIV' | 'FORWARDED') => {
    const userId = (session?.user as any)?.id;
    if (!userId) return;
    if (action === 'FORWARDED' && !forwardToId) {
      toast({ title: 'Validation', description: 'Select a staff member to forward to.', variant: 'destructive' });
      return;
    }
    
    setIsProcessing(true);
    try {
      const res = await processMemo({
        memoId,
        actorId: userId,
        action,
        notes: actionNotes || `Memo marked as ${action}`,
        nextHandlerId: action === 'FORWARDED' ? forwardToId : undefined
      });

      if (res.success) {
        toast({ title: 'Success', description: `Memo ${action.toLowerCase()} successfully.` });
        router.push('/dashboard/communication');
      } else {
        toast({ title: 'Error', description: res.message, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) return <div className="p-10 text-center">Loading memo...</div>;
  if (!memo) return <div className="p-10 text-center">Memo not found.</div>;

  const isCurrentHandler = memo.currentHandlerId === session?.user?.id && memo.status === 'PENDING';
  let metadata: any = null;
  if (memo.metadata) {
    try { metadata = JSON.parse(memo.metadata); } catch(e){}
  }

  return (
    <div className="w-full space-y-6">
      <Button variant="ghost" onClick={() => router.back()} className="mb-2">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Hub
      </Button>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="border-b bg-background">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">{memo.type.replace('_', ' ')}</Badge>
                    <Badge variant={
                      memo.status === 'APPROVED' ? 'default' :
                      memo.status === 'REJECTED' ? 'destructive' : 'secondary'
                    } className={memo.status === 'APPROVED' ? 'bg-emerald-500' : ''}>
                      {memo.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl">{memo.title}</CardTitle>
                  <CardDescription className="mt-1 font-mono text-xs">{memo.reference}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              
              {/* Specialized Metadata UI */}
              {metadata && memo.type === 'LEAVE_REQUEST' && (
                <div className="bg-orange-50 p-4 rounded-md border border-orange-200">
                  <h4 className="font-semibold text-orange-800 mb-2">Leave Request Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm text-orange-900">
                    <div><span className="opacity-70">Start Date:</span> {format(new Date(metadata.startDate), 'PPP')}</div>
                    <div><span className="opacity-70">End Date:</span> {format(new Date(metadata.endDate), 'PPP')}</div>
                  </div>
                </div>
              )}

              {metadata && memo.type === 'CASH_VOUCHER' && (
                <div className="bg-emerald-50 p-4 rounded-md border border-emerald-200">
                  <h4 className="font-semibold text-emerald-800 mb-2">Cash Voucher Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm text-emerald-900">
                    <div><span className="opacity-70">Requested Amount:</span> ₦{metadata.amount?.toLocaleString()}</div>
                    <div><span className="opacity-70">Expense Type:</span> {metadata.expenseType?.replace('_', ' ')}</div>
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">Memo Content</h4>
                <div className="bg-white border rounded-md p-4 min-h-[200px] whitespace-pre-wrap text-sm">
                  {memo.content}
                </div>
              </div>

            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Audit Trail</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {memo.history.map((h: any) => (
                  <div key={h.id} className="flex gap-4 text-sm border-l-2 border-border pl-4 py-1">
                    <div className="text-muted-foreground whitespace-nowrap">{format(new Date(h.createdAt), 'MMM d, h:mm a')}</div>
                    <div>
                      <span className="font-medium">{h.actor.firstName} {h.actor.lastName}</span> 
                      <span className="mx-2 text-muted-foreground">→</span>
                      <Badge variant="outline">{h.action}</Badge>
                      {h.notes && <p className="text-slate-600 mt-1 italic">"{h.notes}"</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <span className="block text-muted-foreground">Sender</span>
                <span className="font-medium">{memo.sender.firstName} {memo.sender.lastName}</span>
              </div>
              <div>
                <span className="block text-muted-foreground">Current Handler</span>
                {memo.currentHandler ? (
                   <span className="font-medium">{memo.currentHandler.firstName} {memo.currentHandler.lastName}</span>
                ) : <span className="italic text-muted-foreground">None</span>}
              </div>
              <div>
                <span className="block text-muted-foreground">Date Raised</span>
                <span>{format(new Date(memo.createdAt), 'PPP')}</span>
              </div>
            </CardContent>
          </Card>

          {isCurrentHandler && (
            <Card className="border-blue-200 shadow-md">
              <CardHeader className="bg-blue-50/50 pb-4">
                <CardTitle className="text-lg text-blue-900">Required Actions</CardTitle>
                <CardDescription>You are the current handler of this memo.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Action Notes / Remarks</label>
                  <Textarea 
                    value={actionNotes} 
                    onChange={e => setActionNotes(e.target.value)} 
                    placeholder="Add approval justification or rejection reasons..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => handleAction('APPROVED')}
                    disabled={isProcessing}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-red-200 text-red-700 hover:bg-red-50"
                    onClick={() => handleAction('REJECTED')}
                    disabled={isProcessing}
                  >
                    <XCircle className="w-4 h-4 mr-2" /> Reject
                  </Button>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => handleAction('KIV')}
                  disabled={isProcessing}
                >
                  <Clock className="w-4 h-4 mr-2" /> Keep in View (KIV)
                </Button>

                <div className="pt-4 border-t space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Or Forward to another Handler</label>
                  <div className="flex gap-2">
                    <Select value={forwardToId} onValueChange={setForwardToId}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select Staff" /></SelectTrigger>
                      <SelectContent>
                        {staffList.filter(s => s.id !== session?.user?.id).map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.firstName} ({s.role})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="secondary" 
                      onClick={() => handleAction('FORWARDED')}
                      disabled={isProcessing || !forwardToId}
                    >
                      <Forward className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
