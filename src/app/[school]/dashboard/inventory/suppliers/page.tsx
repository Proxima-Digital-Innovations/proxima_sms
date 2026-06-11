'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from '@/lib/firebase-stubs';
import { db, auth, storage } from "@/lib/firebase";
import { Supplier } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Building2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        name: '',
        contactEmail: '',
        contactPhone: '',
        address: ''
    });

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        setIsLoading(true);
        try {
            const snapshot = await getDocs(collection(db, 'suppliers'));
            const suppliersData = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data()
            })) as Supplier[];
            setSuppliers(suppliersData);
        } catch (error) {
            console.error('Error fetching suppliers:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load suppliers.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingSupplier) {
                await updateDoc(doc(db, 'suppliers', editingSupplier.id), formData);
                toast({ title: 'Success', description: 'Supplier updated successfully.' });
            } else {
                await addDoc(collection(db, 'suppliers'), formData);
                toast({ title: 'Success', description: 'Supplier added successfully.' });
            }

            setIsDialogOpen(false);
            resetForm();
            fetchSuppliers();
        } catch (error) {
            console.error('Error saving supplier:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save supplier.' });
        }
    };

    const handleEdit = (supplier: Supplier) => {
        setEditingSupplier(supplier);
        setFormData({
            name: supplier.name,
            contactEmail: supplier.contactEmail || '',
            contactPhone: supplier.contactPhone || '',
            address: supplier.address || ''
        });
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete supplier "${name}"?`)) return;
        try {
            await deleteDoc(doc(db, 'suppliers', id));
            toast({ title: 'Success', description: 'Supplier deleted successfully.' });
            fetchSuppliers();
        } catch (error) {
            console.error('Error deleting supplier:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete supplier.' });
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            contactEmail: '',
            contactPhone: '',
            address: ''
        });
        setEditingSupplier(null);
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Suppliers</h1>
                    <p className="text-muted-foreground">Manage your inventory suppliers</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4" />Add Supplier</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="name">Supplier Name *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="email">Contact Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.contactEmail}
                                        onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="phone">Contact Phone</Label>
                                    <Input
                                        id="phone"
                                        value={formData.contactPhone}
                                        onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="address">Address</Label>
                                <Textarea
                                    id="address"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                <Button type="submit">{editingSupplier ? 'Update' : 'Add'} Supplier</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Suppliers</CardTitle>
                    <CardDescription>View and manage all suppliers</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Address</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                        <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : suppliers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">
                                        <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                                        <p className="text-muted-foreground">No suppliers found. Add your first supplier to get started.</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                suppliers.map((supplier) => (
                                    <TableRow key={supplier.id}>
                                        <TableCell className="font-medium">{supplier.name}</TableCell>
                                        <TableCell>{supplier.contactEmail || '-'}</TableCell>
                                        <TableCell>{supplier.contactPhone || '-'}</TableCell>
                                        <TableCell className="max-w-xs truncate">{supplier.address || '-'}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="outline" size="sm" onClick={() => handleEdit(supplier)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="destructive" size="sm" onClick={() => handleDelete(supplier.id, supplier.name)}>
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
