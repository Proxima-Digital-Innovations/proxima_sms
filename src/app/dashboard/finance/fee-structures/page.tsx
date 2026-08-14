'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { getFeeStructures, saveFeeStructure, deleteFeeStructure } from '@/actions/fee-actions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Loader2, WalletCards, GraduationCap, Calendar as CalendarIcon, Coins, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';

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
        setIsLoading(true);
        try {
            const result = await getFeeStructures();
            if (result.success) {
                setFeeStructures(result.fees || []);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.message || 'Failed to load fee structures' });
            }
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
            const payload = {
                id: editingId || undefined,
                className: formData.classLevel,
                session: formData.session,
                term: formData.term,
                items: [{ name: formData.name, amount: formData.amount }]
            };

            const result = await saveFeeStructure(payload);
            
            if (result.error) {
                throw new Error('Failed to save fee structure');
            }

            toast({ title: 'Success', description: editingId ? 'Fee structure updated' : 'Fee structure created' });
            setIsDialogOpen(false);
            resetForm();
            fetchFeeStructures();
        } catch (error: any) {
            console.error('Error:', error);
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to save fee structure' });
        }
    };

    const handleEdit = (fee: any) => {
        setEditingId(fee.id);
        setFormData({
            name: fee.items?.[0]?.name || 'Consolidated Fee',
            classLevel: fee.className,
            amount: fee.totalAmount,
            term: fee.term,
            session: fee.session,
            description: ''
        });
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this fee structure?')) return;

        try {
            const result = await deleteFeeStructure(id);
            if (result.error) throw new Error(result.error);
            
            toast({ title: 'Success', description: 'Fee structure deleted' });
            fetchFeeStructures();
        } catch (error: any) {
            console.error('Error:', error);
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to delete fee structure' });
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

    const uniqueClasses = ['Nursery 1', 'Nursery 2', 'KG 1', 'KG 2', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6', 'JSS 1', 'JSS 2', 'JSS 3', 'SSS 1', 'SSS 2', 'SSS 3'];

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
    };

    return (
        <div className="min-h-screen bg-slate-950 pb-12 -mt-6 -mx-6">
            
            {/* Header */}
            <div className="flex justify-between items-center px-8 py-5 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-violet-600/20 border border-violet-500/30 rounded-xl shadow-[0_0_15px_rgba(139,92,246,0.15)]">
                        <WalletCards className="text-violet-400 w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-tight">Fee Structures</h1>
                        <p className="text-xs text-slate-400 font-medium">Manage school fee definitions by class and term</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={fetchFeeStructures} className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white h-9">
                        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Dialog open={isDialogOpen} onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (!open) resetForm();
                    }}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white shadow-[0_0_15px_rgba(139,92,246,0.2)] h-9">
                                <Plus className="mr-2 h-4 w-4" />
                                Add Structure
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-900 border-slate-800 text-white shadow-2xl sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold">{editingId ? 'Edit' : 'Create'} Fee Structure</DialogTitle>
                                <DialogDescription className="text-slate-400">Define billing templates applied to students</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-5 pt-4">
                                <div>
                                    <Label className="text-slate-300 text-xs uppercase tracking-wider font-bold mb-1.5 block">Fee Name / Title</Label>
                                    <Input 
                                        placeholder="e.g., General Tuition"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="bg-slate-950 border-slate-800 text-white focus-visible:ring-violet-500"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-slate-300 text-xs uppercase tracking-wider font-bold mb-1.5 block">Target Class</Label>
                                        <select 
                                            className="w-full bg-slate-950 border-slate-800 rounded-md p-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                                            value={formData.classLevel}
                                            onChange={(e) => setFormData({ ...formData, classLevel: e.target.value })}
                                        >
                                            <option value="">Select class...</option>
                                            {uniqueClasses.map(cls => (
                                                <option key={cls} value={cls}>{cls}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <Label className="text-slate-300 text-xs uppercase tracking-wider font-bold mb-1.5 block">Total Amount (₦)</Label>
                                        <Input 
                                            type="number"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                                            className="bg-slate-950 border-slate-800 text-white focus-visible:ring-violet-500 font-mono"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-slate-300 text-xs uppercase tracking-wider font-bold mb-1.5 block">Term</Label>
                                        <select 
                                            className="w-full bg-slate-950 border-slate-800 rounded-md p-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                                            value={formData.term}
                                            onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                                        >
                                            <option value="First Term">First Term</option>
                                            <option value="Second Term">Second Term</option>
                                            <option value="Third Term">Third Term</option>
                                        </select>
                                    </div>
                                    <div>
                                        <Label className="text-slate-300 text-xs uppercase tracking-wider font-bold mb-1.5 block">Session</Label>
                                        <select 
                                            className="w-full bg-slate-950 border-slate-800 rounded-md p-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                                            value={formData.session}
                                            onChange={(e) => setFormData({ ...formData, session: e.target.value })}
                                        >
                                            <option value="2024/2025">2024/2025</option>
                                            <option value="2025/2026">2025/2026</option>
                                            <option value="2026/2027">2026/2027</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-slate-300 text-xs uppercase tracking-wider font-bold mb-1.5 block">Optional Details</Label>
                                    <Input 
                                        placeholder="Internal notes..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="bg-slate-950 border-slate-800 text-white focus-visible:ring-violet-500"
                                    />
                                </div>
                                <div className="pt-2">
                                    <Button onClick={handleSubmit} className="w-full bg-violet-600 hover:bg-violet-700 text-white h-11 text-base font-semibold shadow-[0_0_15px_rgba(139,92,246,0.2)]">
                                        {editingId ? 'Save Changes' : 'Create Fee Structure'}
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Main Content */}
            <div className="p-8 max-w-7xl mx-auto">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
                        <Loader2 className="w-10 h-10 animate-spin text-violet-500" />
                        <p className="text-slate-400 font-medium">Loading structures...</p>
                    </div>
                ) : feeStructures.length === 0 ? (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        className="flex flex-col items-center justify-center h-[50vh] text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/20"
                    >
                        <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-4">
                            <WalletCards className="w-10 h-10 text-slate-600" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No Fee Structures</h3>
                        <p className="text-slate-400 max-w-md">You haven't defined any fee structures yet. Create one to start billing students.</p>
                        <Button className="mt-6 bg-violet-600 hover:bg-violet-700 text-white" onClick={() => setIsDialogOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" /> Create First Structure
                        </Button>
                    </motion.div>
                ) : (
                    <motion.div 
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    >
                        <AnimatePresence>
                            {feeStructures.map(fee => (
                                <motion.div key={fee.id} variants={itemVariants} layoutId={fee.id}>
                                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden hover:bg-slate-900 transition-colors group shadow-lg">
                                        <div className="p-5">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                                                    <Coins className="w-5 h-5 text-emerald-400" />
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800" onClick={() => handleEdit(fee)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-950/50" onClick={() => handleDelete(fee.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            
                                            <h3 className="text-lg font-bold text-white mb-1 tracking-tight truncate">
                                                {fee.items?.[0]?.name || 'Multiple Fees'}
                                            </h3>
                                            
                                            <div className="text-3xl font-black text-white mb-4 tracking-tight font-mono">
                                                <span className="text-emerald-500 font-sans mr-1">₦</span>
                                                {fee.totalAmount.toLocaleString()}
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <div className="flex items-center text-sm text-slate-400">
                                                    <GraduationCap className="w-4 h-4 mr-2.5 text-slate-500" />
                                                    <span className="font-medium text-slate-300">{fee.className}</span>
                                                </div>
                                                <div className="flex items-center text-sm text-slate-400">
                                                    <CalendarIcon className="w-4 h-4 mr-2.5 text-slate-500" />
                                                    <span className="font-medium">{fee.term} • {fee.session}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
