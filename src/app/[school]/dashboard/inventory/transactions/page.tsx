'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, Timestamp, query, orderBy } from '@/lib/firebase-stubs';
import { db, auth, storage } from "@/lib/firebase";
import { InventoryItem } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { updateDoc, doc } from '@/lib/firebase-stubs';

type Transaction = {
    id: string;
    itemId: string;
    itemName: string;
    transactionType: 'addition' | 'removal' | 'adjustment';
    quantity: number;
    date: any;
    description?: string;
};

export default function TransactionsPage() {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        itemId: '',
        transactionType: 'addition' as 'addition' | 'removal' | 'adjustment',
        quantity: 0,
        description: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [itemsSnap, transSnap] = await Promise.all([
                getDocs(collection(db, 'inventory')),
                getDocs(query(collection(db, 'inventory_transactions'), orderBy('date', 'desc')))
            ]);

            const itemsData = itemsSnap.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data()
            })) as InventoryItem[];

            const transData = transSnap.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data()
            })) as Transaction[];

            setItems(itemsData);
            setTransactions(transData);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load data.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const selectedItem = items.find(i => i.id === formData.itemId);
            if (!selectedItem) return;

            // Calculate new quantity
            let newQuantity = selectedItem.quantityInStock;
            if (formData.transactionType === 'addition') {
                newQuantity += formData.quantity;
            } else if (formData.transactionType === 'removal') {
                newQuantity -= formData.quantity;
            } else {
                newQuantity = formData.quantity;
            }

            if (newQuantity < 0) {
                toast({ variant: 'destructive', title: 'Error', description: 'Quantity cannot be negative.' });
                return;
            }

            // Add transaction
            await addDoc(collection(db, 'inventory_transactions'), {
                itemId: formData.itemId,
                itemName: selectedItem.name,
                transactionType: formData.transactionType,
                quantity: formData.quantity,
                date: Timestamp.now(),
                description: formData.description
            });

            // Update item quantity
            await updateDoc(doc(db, 'inventory', formData.itemId), {
                quantityInStock: newQuantity
            });

            toast({ title: 'Success', description: 'Transaction recorded successfully.' });
            setIsDialogOpen(false);
            resetForm();
            fetchData();
        } catch (error) {
            console.error('Error recording transaction:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to record transaction.' });
        }
    };

    const resetForm = () => {
        setFormData({
            itemId: '',
            transactionType: 'addition',
            quantity: 0,
            description: ''
        });
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Stock Transactions</h1>
                    <p className="text-muted-foreground">Record stock movements and adjustments</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4" />New Transaction</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Record Stock Transaction</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="item">Item *</Label>
                                <Select value={formData.itemId} onValueChange={(value) => setFormData({ ...formData, itemId: value })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select an item" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {items.map(item => (
                                            <SelectItem key={item.id} value={item.id}>
                                                {item.name} (Current: {item.quantityInStock})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="type">Transaction Type *</Label>
                                    <Select value={formData.transactionType} onValueChange={(value: any) => setFormData({ ...formData, transactionType: value })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="addition">Stock In (Addition)</SelectItem>
                                            <SelectItem value="removal">Stock Out (Removal)</SelectItem>
                                            <SelectItem value="adjustment">Adjustment</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="quantity">Quantity *</Label>
                                    <Input
                                        id="quantity"
                                        type="number"
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Optional notes about this transaction"
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                <Button type="submit">Record Transaction</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                    <CardDescription>View all stock movements</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Item</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-center">Quantity</TableHead>
                                <TableHead>Description</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                    </TableRow>
                                ))
                            ) : transactions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">
                                        <p className="text-muted-foreground">No transactions recorded yet.</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                transactions.map((trans) => (
                                    <TableRow key={trans.id}>
                                        <TableCell>{formatDate(trans.date)}</TableCell>
                                        <TableCell className="font-medium">{trans.itemName}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                {trans.transactionType === 'addition' && <ArrowUpCircle className="h-4 w-4 text-green-600" />}
                                                {trans.transactionType === 'removal' && <ArrowDownCircle className="h-4 w-4 text-red-600" />}
                                                <span className="capitalize">{trans.transactionType}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-semibold">{trans.quantity}</TableCell>
                                        <TableCell className="max-w-xs truncate">{trans.description || '-'}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
