'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Search, Mail, Send, Inbox, MessageSquare, Briefcase, Banknote } from 'lucide-react';
import { getMyMemos, getStaffList } from '@/actions/memo-actions';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from 'date-fns';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

export default function CommunicationHubPage() {
  const { data: session } = useSession();
  const [memos, setMemos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'INBOX' | 'SENT' | 'ACTION'>('INBOX');

  const { toast } = useToast();

  const fetchMemos = async () => {
    if (!session?.user?.id) return;
    setIsLoading(true);
    try {
      const res = await getMyMemos(session.user.id);
      if (res.success && res.memos) {
        setMemos(res.memos);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMemos();
  }, [session?.user?.id]);

  const filteredMemos = memos.filter(m => {
    if (activeTab === 'INBOX') return m.senderId !== session?.user?.id && m.currentHandlerId === session?.user?.id;
    if (activeTab === 'SENT') return m.senderId === session?.user?.id;
    if (activeTab === 'ACTION') return m.currentHandlerId === session?.user?.id && m.status === 'PENDING';
    return true;
  });

  const getIconForType = (type: string) => {
    switch (type) {
      case 'LEAVE_REQUEST': return <Briefcase className="h-4 w-4 text-orange-500" />;
      case 'CASH_VOUCHER': return <Banknote className="h-4 w-4 text-emerald-500" />;
      default: return <MessageSquare className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Communication Hub</h2>
          <p className="text-muted-foreground mt-1">Memos, Leave Requests, and Expense Vouchers.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/communication/compose">
            <Button className="shadow-md bg-blue-600 hover:bg-blue-700 text-white">
              <PlusCircle className="mr-2 h-4 w-4" /> New Memo
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-2">
          <Button 
            variant={activeTab === 'INBOX' ? 'secondary' : 'ghost'} 
            className="w-full justify-start"
            onClick={() => setActiveTab('INBOX')}
          >
            <Inbox className="mr-2 h-4 w-4" /> Inbox
          </Button>
          <Button 
            variant={activeTab === 'SENT' ? 'secondary' : 'ghost'} 
            className="w-full justify-start"
            onClick={() => setActiveTab('SENT')}
          >
            <Send className="mr-2 h-4 w-4" /> Sent Memos
          </Button>
          <Button 
            variant={activeTab === 'ACTION' ? 'secondary' : 'ghost'} 
            className="w-full justify-start text-amber-700 hover:text-amber-800 hover:bg-amber-50"
            onClick={() => setActiveTab('ACTION')}
          >
            <Mail className="mr-2 h-4 w-4" /> Action Required
          </Button>
        </div>

        <Card className="md:col-span-3 border-none shadow-xl bg-white/50 backdrop-blur-sm">
          <CardHeader className="border-b bg-background pb-4">
            <CardTitle className="text-xl">
              {activeTab === 'INBOX' && 'My Inbox'}
              {activeTab === 'SENT' && 'Sent Memos'}
              {activeTab === 'ACTION' && 'Pending Approvals'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-background">
                <TableRow>
                  <TableHead className="pl-6 w-[50px]"></TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>From / To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                        Loading...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredMemos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No memos found in this folder.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMemos.map((m) => (
                    <TableRow key={m.id} className="hover:bg-background transition-colors cursor-pointer" onClick={() => window.location.href = `/dashboard/communication/${m.id}`}>
                      <TableCell className="pl-6">
                        {getIconForType(m.type)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{m.reference}</TableCell>
                      <TableCell className="font-medium">{m.title}</TableCell>
                      <TableCell className="text-sm">
                        {activeTab === 'SENT' 
                          ? (m.currentHandler ? `To: ${m.currentHandler.firstName}` : 'Routing...')
                          : `From: ${m.sender?.firstName} ${m.sender?.lastName}`}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          m.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          m.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' :
                          m.status === 'KIV' ? 'bg-slate-100 text-slate-700' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }>
                          {m.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(m.createdAt), 'MMM d, yyyy')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
