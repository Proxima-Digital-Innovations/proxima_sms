
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { dbService } from '@/lib/dbService';
import type { FeeStructure } from '@/lib/schema';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FeeStructureForm, CLASS_GROUPS } from '@/components/dashboard/fees/fee-structure-form';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { deleteFeeStructure } from '@/actions/fee-actions';
import { useToast } from '@/hooks/use-toast';
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
} from "@/components/ui/alert-dialog"
import usePersistentState from '@/hooks/use-persistent-state';

export default function FeeStructurePage() {
    const [feeStructures, setFeeStructures] = useState<Record<string, FeeStructure[]>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = usePersistentState('fees-form-open', false);
    const [editingStructure, setEditingStructure] = useState<FeeStructure | undefined>(undefined);
    const { toast } = useToast();

    const fetchFeeStructures = useCallback(async () => {
        setIsLoading(true);
        try {
            const structures = await dbService.getDocs<FeeStructure>('feeStructures');

            structures.sort((a, b) => {
                const dateA = a.createdAt?.seconds || 0;
                const dateB = b.createdAt?.seconds || 0;
                return dateB - dateA;
            });
            
            const groupedByClass = structures.reduce((acc, structure) => {
                const { className } = structure;
                if (!acc[className]) {
                    acc[className] = [];
                }
                acc[className].push(structure);
                return acc;
            }, {} as Record<string, FeeStructure[]>);

            setFeeStructures(groupedByClass);
        } catch (error) {
            console.error('Error fetching fee structures:', error);
            toast({
                variant: 'destructive',
                title: 'Error fetching data',
                description: 'Could not load fee structures. A database index might be required for this operation.',
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchFeeStructures();
    }, [fetchFeeStructures]);

    const handleFormClose = (success: boolean) => {
        setIsFormOpen(false);
        setEditingStructure(undefined);
        if (success) {
            fetchFeeStructures();
        }
    };
    
    const handleEdit = (structure: FeeStructure) => {
        setEditingStructure(structure);
        setIsFormOpen(true);
    };
    
    const handleDelete = async (id: string) => {
        try {
            const result = await deleteFeeStructure(id);
            if (result.error) throw new Error(result.error);
            toast({ title: 'Success', description: 'Fee structure deleted successfully.' });
            fetchFeeStructures();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="font-headline text-3xl font-bold">Fee Structures</h1>
                <p className="text-muted-foreground">
                    Define tuition fees, payment deadlines, and other charges for different class groups.
                </p>
            </div>
            
            <Dialog open={isFormOpen} onOpenChange={(open) => {
                setIsFormOpen(open);
                if (!open) setEditingStructure(undefined);
            }}>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Manage Fee Structures</CardTitle>
                            <CardDescription>View, create, and manage fee structures for all class groups.</CardDescription>
                        </div>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add New Structure
                            </Button>
                        </DialogTrigger>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-64 w-full" />
                        ) : Object.keys(feeStructures).length === 0 ? (
                            <div className="flex h-48 items-center justify-center rounded-md border border-dashed">
                                <p className="text-muted-foreground">No fee structures created yet.</p>
                            </div>
                        ) : (
                             <div className="space-y-6">
                                {CLASS_GROUPS.filter(group => feeStructures[group]).map((group) => (
                                    <div key={group}>
                                        <h3 className="text-lg font-semibold mb-2">{group} Section</h3>
                                        <div className="border rounded-md">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Session</TableHead>
                                                        <TableHead>Term</TableHead>
                                                        <TableHead>Total Amount (NGN)</TableHead>
                                                        <TableHead className="text-right">Actions</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {feeStructures[group]?.map((structure) => (
                                                        <TableRow key={structure.id}>
                                                            <TableCell><Badge variant="secondary">{structure.session}</Badge></TableCell>
                                                            <TableCell>{structure.term}</TableCell>
                                                            <TableCell className="font-medium">
                                                                {structure.totalAmount.toLocaleString()}
                                                            </TableCell>
                                                            <TableCell className="text-right space-x-2">
                                                                <Button variant="outline" size="icon" onClick={() => handleEdit(structure)}>
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
                                                                            This action cannot be undone. This will permanently delete the fee structure.
                                                                        </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                        <AlertDialogAction onClick={() => handleDelete(structure.id)}>Delete</AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        )}
                    </CardContent>
                </Card>

                 <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingStructure ? 'Edit' : 'Create'} Fee Structure</DialogTitle>
                    </DialogHeader>
                    <FeeStructureForm
                        initialData={editingStructure}
                        onFormSubmit={handleFormClose}
                    />
                 </DialogContent>
            </Dialog>
        </div>
    );
}
