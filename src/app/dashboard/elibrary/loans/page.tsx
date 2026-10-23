'use client';

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getELibraryLoans, returnELibraryBook } from '@/actions/elibrary-actions';
import { BookCopy, CheckCircle2, Clock, AlertTriangle, Search, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function ELibraryLoansPage() {
  const [loans, setLoans] = useState<any[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'BORROWED' | 'RETURNED' | 'OVERDUE'>('ALL');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const loadLoans = async () => {
    setIsLoading(true);
    const filterParam = filter === 'ALL' ? undefined : filter;
    const res = await getELibraryLoans(filterParam);
    if (res.success && res.data) {
      setLoans(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadLoans();
  }, [filter]);

  const handleReturn = (loanId: string, bookTitle: string) => {
    startTransition(async () => {
      const res = await returnELibraryBook(loanId);
      if (res.success) {
        toast({
          title: 'Book Returned',
          description: `"${bookTitle}" has been checked back in. Inventory updated.`,
        });
        loadLoans();
      } else {
        toast({
          variant: 'destructive',
          title: 'Return Failed',
          description: res.error || 'Failed to process return.',
        });
      }
    });
  };

  const filteredLoans = loans.filter((l) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const title = l.book?.title?.toLowerCase() || '';
    const author = l.book?.author?.toLowerCase() || '';
    const userName = `${l.user?.firstName || ''} ${l.user?.lastName || ''}`.toLowerCase();
    const matric = l.user?.studentProfile?.matricNumber?.toLowerCase() || '';
    const staffCode = l.user?.staffProfile?.staffCode?.toLowerCase() || '';
    return title.includes(term) || author.includes(term) || userName.includes(term) || matric.includes(term) || staffCode.includes(term);
  });

  const activeCount = loans.filter((l) => l.status === 'BORROWED').length;
  const returnedCount = loans.filter((l) => l.status === 'RETURNED').length;
  const overdueCount = loans.filter((l) => l.status === 'BORROWED' && new Date(l.dueDate) < new Date()).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/elibrary">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">Borrowing & Loan Ledger</h1>
          </div>
          <p className="text-muted-foreground text-sm pl-10">
            Track circulation, physical textbook borrowings, loan durations, and overdue fines.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-blue-600 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Currently Checked Out</CardTitle>
            <BookCopy className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-muted-foreground text-xs">Active student & staff book loans</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overdue Returns</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{overdueCount}</div>
            <p className="text-muted-foreground text-xs">Past scheduled due dates</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-600 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed Returns</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{returnedCount}</div>
            <p className="text-muted-foreground text-xs">Returned safely to shelf circulation</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
              <Input
                placeholder="Search by book title, borrower name, matric number..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant={filter === 'ALL' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('ALL')}
              >
                All Records
              </Button>
              <Button
                variant={filter === 'BORROWED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('BORROWED')}
              >
                Active Loans
              </Button>
              <Button
                variant={filter === 'OVERDUE' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('OVERDUE')}
              >
                Overdue
              </Button>
              <Button
                variant={filter === 'RETURNED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('RETURNED')}
              >
                Returned
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Circulation Ledger Table */}
      <Card>
        <CardHeader>
          <CardTitle>Circulation History</CardTitle>
          <CardDescription>
            Showing {filteredLoans.length} circulation records.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="text-primary h-8 w-8 animate-spin" />
            </div>
          ) : filteredLoans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BookCopy className="text-muted-foreground/50 h-12 w-12 mb-3" />
              <p className="text-muted-foreground font-medium">No loan records found.</p>
              <p className="text-muted-foreground text-xs mt-1">
                Books borrowed by students or faculty will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Book Title</th>
                    <th className="px-4 py-3">Borrower</th>
                    <th className="px-4 py-3">Borrowed On</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLoans.map((loan) => {
                    const isOverdue = loan.status === 'BORROWED' && new Date(loan.dueDate) < new Date();
                    return (
                      <tr key={loan.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{loan.book?.title}</div>
                          <div className="text-muted-foreground text-xs">By {loan.book?.author} ({loan.book?.category})</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">
                            {loan.user?.firstName} {loan.user?.lastName}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {loan.user?.studentProfile?.matricNumber || loan.user?.staffProfile?.staffCode || loan.user?.email}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {format(new Date(loan.borrowDate), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className={isOverdue ? 'font-bold text-red-600' : 'text-muted-foreground'}>
                            {format(new Date(loan.dueDate), 'MMM dd, yyyy')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {loan.status === 'RETURNED' ? (
                            <Badge variant="outline" className="border-emerald-500 bg-emerald-50 text-emerald-700">
                              Returned
                            </Badge>
                          ) : isOverdue ? (
                            <Badge variant="destructive" className="flex w-fit items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Overdue
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="flex w-fit items-center gap-1">
                              <Clock className="h-3 w-3" /> Active Loan
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {loan.status === 'BORROWED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              disabled={isPending}
                              onClick={() => handleReturn(loan.id, loan.book?.title)}
                            >
                              Check In (Return)
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
