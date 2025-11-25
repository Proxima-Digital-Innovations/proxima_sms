'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { InventoryItem } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Package } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function InventoryItemsPage() {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        name: '',
        category: '',
        description: '',
        quantityInStock: 0,
        reorderLevel: 0,
        expiryDate: ''
    });

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        setIsLoading(true);
        try {
            const snapshot = await getDocs(collection(db, 'inventory'));
            const itemsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as InventoryItem[];
            setItems(itemsData);
        } catch (error) {
            console.error('Error fetching items:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load inventory items.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const itemData = {
                ...formData,
                quantityInStock: Number(formData.quantityInStock),
                reorderLevel: Number(formData.reorderLevel),
                expiryDate: formData.expiryDate ? Timestamp.fromDate(new Date(formData.expiryDate)) : null,
                createdAt: editingItem ? editingItem.createdAt : Timestamp.now()
            };

            if (editingItem) {
                await updateDoc(doc(db, 'inventory', editingItem.id), itemData);
                toast({ title: 'Success', description: 'Item updated successfully.' });
            } else {
                await addDoc(collection(db, 'inventory'), itemData);
                toast({ title: 'Success', description: 'Item added successfully.' });
            }

            setIsDialogOpen(false);
            resetForm();
            fetchItems();
        } catch (error) {
            console.error('Error saving item:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save item.' });
        }
    };

    const handleEdit = (item: InventoryItem) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            category: item.category,
            description: item.description || '',
            quantityInStock: item.quantityInStock,
            reorderLevel: item.reorderLevel,
            expiryDate: item.expiryDate ? new Date(item.expiryDate.seconds * 1000).toISOString().split('T')[0] : ''
        });
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
        try {
            await deleteDoc(doc(db, 'inventory', id));
            toast({ title: 'Success', description: 'Item deleted successfully.' });
            fetchItems();
        } catch (error) {
            console.error('Error deleting item:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete item.' });
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            category: '',
            description: '',
            quantityInStock: 0,
            reorderLevel: 0,
            expiryDate: ''
        });
        setEditingItem(null);
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Inventory Items</h1>
                    <p className="text-muted-foreground">Manage your school's inventory stock</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4" />Add Item</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="name">Item Name *</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="category">Category *</Label>
                                    <Input
                                        id="category"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
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
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="quantity">Quantity in Stock *</Label>
                                    <Input
                                        id="quantity"
                                        type="number"
                                        value={formData.quantityInStock}
                                        onChange={(e) => setFormData({ ...formData, quantityInStock: Number(e.target.value) })}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="reorder">Reorder Level *</Label>
                                    <Input
                                        id="reorder"
                                        type="number"
                                        value={formData.reorderLevel}
                                        onChange={(e) => setFormData({ ...formData, reorderLevel: Number(e.target.value) })}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="expiry">Expiry Date</Label>
                                    <Input
                                        id="expiry"
                                        type="date"
                                        value={formData.expiryDate}
                                        onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                <Button type="submit">{editingItem ? 'Update' : 'Add'} Item</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Items</CardTitle>
                    <CardDescription>View and manage all inventory items</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-center">In Stock</TableHead>
                                <TableHead className="text-center">Reorder Level</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : items.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">
                                        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                                        <p className="text-muted-foreground">No items found. Add your first item to get started.</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                items.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell>{item.category}</TableCell>
                                        <TableCell className="text-center">{item.quantityInStock}</TableCell>
                                        <TableCell className="text-center">{item.reorderLevel}</TableCell>
                                        <TableCell>
                                            {item.quantityInStock <= item.reorderLevel ? (
                                                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Low Stock</span>
                                            ) : (
                                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">In Stock</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id, item.name)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
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
