'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from '@/lib/firebase-stubs';
import { db, auth, storage } from "@/lib/firebase";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function FeeStructuresPage() {
    const [feeStructures, setFeeStructures] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        classLevel: '',
        amount: 0,
        term: 'First Term',
        session: '2024/2025',
        description: ''
    });
    const { toast } = useToast();

    useEffect(() => {
        fetchFeeStructures();
    }, []);

    const fetchFeeStructures = async () => {
        try {
            const snapshot = await getDocs(collection(db, 'fee_structures'));
            setFeeStructures(snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error('Error:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load fee structures' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.classLevel || formData.amount <= 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please fill all required fields' });
            return;
        }

        try {
            if (editingId) {
                await updateDoc(doc(db, 'fee_structures', editingId), {
                    ...formData,
                    updatedAt: Timestamp.now()
                });
                toast({ title: 'Success', description: 'Fee structure updated' });
            } else {
                await addDoc(collection(db, 'fee_structures'), {
                    ...formData,
                    createdAt: Timestamp.now()
                });
                toast({ title: 'Success', description: 'Fee structure created' });
            }

            setIsDialogOpen(false);
            resetForm();
            fetchFeeStructures();
        } catch (error) {
            console.error('Error:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save fee structure' });
        }
    };

    const handleEdit = (fee: any) => {
        setEditingId(fee.id);
        setFormData({
            name: fee.name,
            classLevel: fee.classLevel,
            amount: fee.amount,
            term: fee.term,
            session: fee.session,
            description: fee.description || ''
        });
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this fee structure?')) return;

        try {
            await deleteDoc(doc(db, 'fee_structures', id));
            toast({ title: 'Success', description: 'Fee structure deleted' });
            fetchFeeStructures();
        } catch (error) {
            console.error('Error:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete fee structure' });
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({
            name: '',
            classLevel: '',
            amount: 0,
            term: 'First Term',
            session: '2024/2025',
            description: ''
        });
    };

    const uniqueClasses = ['Nursery 1', 'Nursery 2', 'KG 1', 'KG 2', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'];

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Fee Structures</h1>
                    <p className="text-muted-foreground">Manage school fee structures by class and term</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Fee Structure
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingId ? 'Edit' : 'Add'} Fee Structure</DialogTitle>
                            <DialogDescription>Define fee amounts for different classes and terms</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label>Fee Name *</Label>
                                <Input 
                                    placeholder="e.g., Tuition Fee"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Class Level *</Label>
                                    <select 
                                        className="w-full border rounded p-2"
                                        value={formData.classLevel}
                                        onChange={(e) => setFormData({ ...formData, classLevel: e.target.value })}
                                    >
                                        <option value="">Select class</option>
                                        {uniqueClasses.map(cls => (
                                            <option key={cls} value={cls}>{cls}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <Label>Amount (₦) *</Label>
                                    <Input 
                                        type="number"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Term</Label>
                                    <select 
                                        className="w-full border rounded p-2"
                                        value={formData.term}
                                        onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                                    >
                                        <option value="First Term">First Term</option>
                                        <option value="Second Term">Second Term</option>
                                        <option value="Third Term">Third Term</option>
                                    </select>
                                </div>
                                <div>
                                    <Label>Session</Label>
                                    <select 
                                        className="w-full border rounded p-2"
                                        value={formData.session}
                                        onChange={(e) => setFormData({ ...formData, session: e.target.value })}
                                    >
                                        <option value="2024/2025">2024/2025</option>
                                        <option value="2025/2026">2025/2026</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <Label>Description</Label>
                                <Input 
                                    placeholder="Optional description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <Button onClick={handleSubmit} className="w-full">
                                {editingId ? 'Update' : 'Create'} Fee Structure
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Fee Structures</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : feeStructures.length === 0 ? (
                        <p className="text-center text-muted-foreground p-8">No fee structures found. Create one to get started.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fee Name</TableHead>
                                    <TableHead>Class</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Term</TableHead>
                                    <TableHead>Session</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {feeStructures.map(fee => (
                                    <TableRow key={fee.id}>
                                        <TableCell className="font-medium">{fee.name}</TableCell>
                                        <TableCell>{fee.classLevel}</TableCell>
                                        <TableCell>₦{fee.amount.toLocaleString()}</TableCell>
                                        <TableCell>{fee.term}</TableCell>
                                        <TableCell>{fee.session}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="ghost" onClick={() => handleEdit(fee)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => handleDelete(fee.id)}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
