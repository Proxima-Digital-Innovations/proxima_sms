
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Upload } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { dbService } from '@/lib/dbService';
import type { Expense } from '@/lib/schema';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ExpenseForm } from '@/components/dashboard/expenses/expense-form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteExpense } from '@/actions/expense-actions';
import usePersistentState from '@/hooks/use-persistent-state';
import { BulkExpenseUploadDialog } from '@/components/dashboard/expenses/bulk-expense-upload-dialog';

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = usePersistentState('expenses-form-open', false);
    const [isBulkOpen, setIsBulkOpen] = usePersistentState('expenses-bulk-open', false);
    const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);
    const { toast } = useToast();

    const fetchExpenses = useCallback(async () => {
        setIsLoading(true);
        try {
            const fetchedExpenses = await dbService.getDocs<Expense>('expenses', [
                { type: 'orderBy', fieldPath: 'date', direction: 'desc' }
            ]);
            setExpenses(fetchedExpenses);
        } catch (error) {
            console.error('Error fetching expenses:', error);
            toast({
                variant: 'destructive',
                title: 'Error fetching data',
                description: 'Could not load expense records.',
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchExpenses();
    }, [fetchExpenses]);

    const handleFormClose = (success: boolean) => {
        setIsFormOpen(false);
        setEditingExpense(undefined);
        if (success) {
            fetchExpenses();
        }
    };
    
    const handleBulkClose = () => {
      setIsBulkOpen(false);
      fetchExpenses();
    }
    
    const handleEdit = (expense: Expense) => {
        setEditingExpense(expense);
        setIsFormOpen(true);
    };
    
    const handleDelete = async (id: string) => {
        try {
            const result = await deleteExpense(id);
            if (result.error) throw new Error(result.error);
            toast({ title: 'Success', description: 'Expense record deleted successfully.' });
            fetchExpenses();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="font-headline text-3xl font-bold">Expenses & Budgeting</h1>
                <p className="text-muted-foreground">
                    Log school expenditures and manage departmental budgets.
                </p>
            </div>
            
            <Dialog open={isFormOpen} onOpenChange={(open) => {
                setIsFormOpen(open);
                if (!open) setEditingExpense(undefined);
            }}>
                <Card>
                    <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle>Recent Expenses</CardTitle>
                            <CardDescription>A log of all recorded school expenditures.</CardDescription>
                        </div>
                        <div className="flex gap-2">
                           <BulkExpenseUploadDialog open={isBulkOpen} onOpenChange={setIsBulkOpen} onUploadComplete={handleBulkClose}>
                              <Button variant="outline">
                                <Upload className="mr-2 h-4 w-4" /> Bulk Upload
                              </Button>
                           </BulkExpenseUploadDialog>
                            <DialogTrigger asChild>
                                <Button>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Expense
                                </Button>
                            </DialogTrigger>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex items-center space-x-4 p-4">
                                    <Skeleton className="h-10 w-full" />
                                </div>
                            ))
                        ) : expenses.length === 0 ? (
                            <div className="flex h-48 items-center justify-center rounded-md border border-dashed">
                                <p className="text-muted-foreground">No expenses recorded yet.</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-right">Amount (NGN)</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {expenses.map((expense) => (
                                        <TableRow key={expense.id}>
                                            <TableCell>{format(expense.date.seconds * 1000, 'PPP')}</TableCell>
                                            <TableCell><Badge variant="secondary">{expense.category}</Badge></TableCell>
                                            <TableCell>{expense.description}</TableCell>
                                            <TableCell className="text-right font-medium">{expense.amount.toLocaleString()}</TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button variant="outline" size="icon" onClick={() => handleEdit(expense)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="destructive" size="icon">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This action cannot be undone. This will permanently delete the expense record.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(expense.id)}>Delete</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                 <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingExpense ? 'Edit' : 'Log New'} Expense</DialogTitle>
                    </DialogHeader>
                    <ExpenseForm
                        initialData={editingExpense}
                        onFormSubmit={handleFormClose}
                    />
                 </DialogContent>
            </Dialog>
        </div>
    );
}
