'use client';

import { useState, useEffect } from 'react';
import { PurchaseOrder, InventoryItem, Supplier } from '@/lib/schema';
import { getInventoryOrders, addInventoryOrder, updateInventoryOrder, getInventoryItems, updateInventoryItemQuantity, getSuppliers } from '@/actions/inventory-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, ShoppingCart, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function PurchaseOrdersPage() {
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        itemId: '',
        quantityOrdered: 0,
        pricePerUnit: 0,
        supplierId: ''
    });

    const [receiveData, setReceiveData] = useState({
        receivedQuantity: 0
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [ordersRes, itemsRes, suppliersRes] = await Promise.all([
                getInventoryOrders(),
                getInventoryItems(),
                getSuppliers()
            ]);

            setOrders((ordersRes.data as any) || []);
            setItems((itemsRes.data as any) || []);
            setSuppliers((suppliersRes.data as any) || []);
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

            const totalCost = formData.quantityOrdered * formData.pricePerUnit;

            const result = await addInventoryOrder({
                supplierId: formData.supplierId || null,
                items: [{ itemId: formData.itemId, quantity: formData.quantityOrdered, price: formData.pricePerUnit }],
                totalAmount: totalCost,
                status: 'PENDING'
            });

            if (result.success) {
                toast({ title: 'Success', description: 'Purchase order created successfully.' });
            } else {
                throw new Error(result.error);
            }
            setIsDialogOpen(false);
            resetForm();
            fetchData();
        } catch (error) {
            console.error('Error creating order:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to create order.' });
        }
    };

    const handleReceive = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOrder) return;

        try {
            const newReceivedQty = (selectedOrder as any).receivedQuantity ? (selectedOrder as any).receivedQuantity + receiveData.receivedQuantity : receiveData.receivedQuantity;
            const quantityOrdered = (() => {
                try {
                    const parsed = JSON.parse((selectedOrder as any).items || '[]');
                    return parsed[0]?.quantity || 0;
                } catch { return 0; }
            })();
            const newStatus = newReceivedQty >= quantityOrdered ? 'COMPLETED' : 'PENDING';

            // Update order
            const updateOrderRes = await updateInventoryOrder(selectedOrder.id, {
                status: newStatus,
            });
            if (!updateOrderRes.success) throw new Error(updateOrderRes.error);

            // Update inventory
            const itemId = (() => {
                try {
                    const parsed = JSON.parse((selectedOrder as any).items || '[]');
                    return parsed[0]?.itemId || '';
                } catch { return ''; }
            })();
            
            if (itemId) {
                await updateInventoryItemQuantity(itemId, receiveData.receivedQuantity);
            }

            toast({ title: 'Success', description: 'Stock received and inventory updated.' });
            setIsReceiveDialogOpen(false);
            setSelectedOrder(null);
            setReceiveData({ receivedQuantity: 0 });
            fetchData();
        } catch (error) {
            console.error('Error receiving stock:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to receive stock.' });
        }
    };

    const resetForm = () => {
        setFormData({
            itemId: '',
            quantityOrdered: 0,
            pricePerUnit: 0,
            supplierId: ''
        });
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '-';
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            'PENDING': 'secondary',
            'PARTIAL': 'outline',
            'COMPLETED': 'default'
        };
        return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Purchase Orders</h1>
                    <p className="text-muted-foreground">Manage inventory purchase orders</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4" />New Order</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Create Purchase Order</DialogTitle>
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
                                            <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="quantity">Quantity Ordered *</Label>
                                    <Input
                                        id="quantity"
                                        type="number"
                                        value={formData.quantityOrdered}
                                        onChange={(e) => setFormData({ ...formData, quantityOrdered: Number(e.target.value) })}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="price">Price Per Unit *</Label>
                                    <Input
                                        id="price"
                                        type="number"
                                        step="0.01"
                                        value={formData.pricePerUnit}
                                        onChange={(e) => setFormData({ ...formData, pricePerUnit: Number(e.target.value) })}
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="supplier">Supplier (Optional)</Label>
                                <Select value={formData.supplierId} onValueChange={(value) => setFormData({ ...formData, supplierId: value })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a supplier" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {suppliers.map(supplier => (
                                            <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="p-3 bg-muted rounded">
                                <p className="text-sm font-medium">Total Cost: ₦{(formData.quantityOrdered * formData.pricePerUnit).toLocaleString()}</p>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                <Button type="submit">Create Order</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Purchase Orders</CardTitle>
                    <CardDescription>Track and receive orders</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order Date</TableHead>
                                <TableHead>Item</TableHead>
                                <TableHead className="text-center">Ordered</TableHead>
                                <TableHead className="text-center">Received</TableHead>
                                <TableHead>Total Cost</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : orders.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8">
                                        <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                                        <p className="text-muted-foreground">No orders found. Create your first purchase order.</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                orders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell>{formatDate((order as any).createdAt)}</TableCell>
                                        <TableCell className="font-medium">
                                            {(() => {
                                                try {
                                                    const parsed = JSON.parse((order as any).items || '[]');
                                                    const item = items.find(i => i.id === parsed[0]?.itemId);
                                                    return item?.name || 'Unknown';
                                                } catch { return 'Unknown'; }
                                            })()}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {(() => {
                                                try {
                                                    const parsed = JSON.parse((order as any).items || '[]');
                                                    return parsed[0]?.quantity || 0;
                                                } catch { return 0; }
                                            })()}
                                        </TableCell>
                                        <TableCell className="text-center">{(order as any).receivedQuantity || 0}</TableCell>
                                        <TableCell>₦{(order as any).totalAmount?.toLocaleString() || 0}</TableCell>
                                        <TableCell>{getStatusBadge((order as any).status)}</TableCell>
                                        <TableCell className="text-right">
                                            {(order as any).status !== 'COMPLETED' && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedOrder(order);
                                                        setIsReceiveDialogOpen(true);
                                                    }}
                                                >
                                                    <CheckCircle className="h-4 w-4 mr-1" />
                                                    Receive
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Receive Stock Dialog */}
            <Dialog open={isReceiveDialogOpen} onOpenChange={setIsReceiveDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Receive Stock</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleReceive} className="space-y-4">
                        <div className="space-y-2">
                            <p className="text-sm"><strong>Item:</strong> {(() => {
                                try {
                                    const parsed = JSON.parse((selectedOrder as any)?.items || '[]');
                                    const item = items.find(i => i.id === parsed[0]?.itemId);
                                    return item?.name || 'Unknown';
                                } catch { return 'Unknown'; }
                            })()}</p>
                            <p className="text-sm"><strong>Ordered:</strong> {(() => {
                                try {
                                    const parsed = JSON.parse((selectedOrder as any)?.items || '[]');
                                    return parsed[0]?.quantity || 0;
                                } catch { return 0; }
                            })()}</p>
                            <p className="text-sm"><strong>Already Received:</strong> {(selectedOrder as any)?.receivedQuantity || 0}</p>
                            <p className="text-sm"><strong>Remaining:</strong> {(() => {
                                try {
                                    const parsed = JSON.parse((selectedOrder as any)?.items || '[]');
                                    const ordered = parsed[0]?.quantity || 0;
                                    return ordered - ((selectedOrder as any)?.receivedQuantity || 0);
                                } catch { return 0; }
                            })()}</p>
                        </div>
                        <div>
                            <Label htmlFor="received">Quantity Received *</Label>
                            <Input
                                id="received"
                                type="number"
                                value={receiveData.receivedQuantity}
                                onChange={(e) => setReceiveData({ receivedQuantity: Number(e.target.value) })}
                                max={(() => {
                                    try {
                                        const parsed = JSON.parse((selectedOrder as any)?.items || '[]');
                                        const ordered = parsed[0]?.quantity || 0;
                                        return ordered - ((selectedOrder as any)?.receivedQuantity || 0);
                                    } catch { return 0; }
                                })()}
                                required
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsReceiveDialogOpen(false)}>Cancel</Button>
                            <Button type="submit">Confirm Receipt</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
