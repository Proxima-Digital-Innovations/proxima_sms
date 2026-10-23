'use client';

import { useState, useEffect } from 'react';
import { getHolidays, createHoliday, deleteHoliday } from '@/actions/bas-actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalendarDays, Plus, Trash2, Loader2, PartyPopper } from 'lucide-react';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 }
  }
};

export default function HolidaysPage() {
    const [holidays, setHolidays] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState({ name: '', startDate: '', endDate: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchHolidays(); }, []);

    const fetchHolidays = async () => {
        const res = await getHolidays();
        if (res.success) setHolidays(res.data || []);
        setLoading(false);
    };

    const handleCreate = async () => {
        if (!form.name || !form.startDate || !form.endDate) return;
        setSaving(true);
        await createHoliday(form);
        setDialogOpen(false);
        setForm({ name: '', startDate: '', endDate: '' });
        setSaving(false);
        fetchHolidays();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this holiday?')) return;
        await deleteHoliday(id);
        fetchHolidays();
    };

    return (
        <div className="min-h-screen bg-background pb-12 -mt-6 -mx-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-8 py-5 bg-background backdrop-blur-md border-b border-border sticky top-0 z-20 shadow-sm gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-blue-600/20 border border-blue-500/30 rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                        <PartyPopper className="text-blue-400 w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-foreground tracking-tight">Public Holidays</h1>
                        <p className="text-xs text-muted-foreground font-medium">Manage public holidays that affect attendance calculations.</p>
                    </div>
                </div>
                
                <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-[0_0_15px_rgba(37,99,235,0.2)]">
                    <Plus className="w-4 h-4 mr-2" /> Add Holiday
                </Button>
            </div>

            <div className="w-full space-y-6">
                <motion.div variants={containerVariants} initial="hidden" animate="visible">
                    <motion.div variants={itemVariants}>
                        <Card className="bg-background border-border shadow-xl overflow-hidden">
                            <CardHeader className="border-b border-border bg-background pb-5">
                                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <CalendarDays className="h-5 w-5 text-blue-400" />
                                    Holiday Calendar
                                </CardTitle>
                                <CardDescription className="text-muted-foreground mt-1">
                                    Staff who clock in on these dates will appear in the Off-Day report. Absent counts are zeroed for general holidays.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                {loading ? (
                                    <div className="flex h-48 items-center justify-center">
                                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-r-transparent" />
                                    </div>
                                ) : holidays.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                                        <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mb-4">
                                            <CalendarDays className="h-8 w-8 text-slate-600" />
                                        </div>
                                        <p className="text-sm font-medium text-muted-foreground">No holidays configured yet.</p>
                                        <p className="text-xs mt-1">Add public holidays to improve attendance accuracy.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader className="bg-background border-b border-border">
                                                <TableRow className="hover:bg-transparent border-none">
                                                    <TableHead className="pl-6 text-muted-foreground font-bold uppercase tracking-wider text-[10px] h-10">Holiday Name</TableHead>
                                                    <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[10px] h-10">Start Date</TableHead>
                                                    <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[10px] h-10">End Date</TableHead>
                                                    <TableHead className="w-20 pr-6"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                <AnimatePresence>
                                                    {holidays.map((h) => (
                                                        <motion.tr 
                                                            key={h.id}
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            exit={{ opacity: 0 }}
                                                            className="border-b border-border hover:bg-muted transition-colors"
                                                        >
                                                            <TableCell className="pl-6 font-medium text-foreground">{h.name}</TableCell>
                                                            <TableCell className="text-foreground font-medium">{format(new Date(h.startDate), 'MMM d, yyyy')}</TableCell>
                                                            <TableCell className="text-foreground font-medium">{format(new Date(h.endDate), 'MMM d, yyyy')}</TableCell>
                                                            <TableCell className="pr-6 text-right">
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-400 hover:bg-rose-950/30 rounded-full" onClick={() => handleDelete(h.id)}>
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </TableCell>
                                                        </motion.tr>
                                                    ))}
                                                </AnimatePresence>
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="bg-background border-border text-foreground">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">Add Public Holiday</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Define a public holiday period. Staff attendance on these days will be flagged.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-5 py-4">
                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Holiday Name</label>
                            <Input placeholder="e.g. Christmas Break" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-background border-border text-foreground focus-visible:ring-blue-500" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Start Date</label>
                                <Input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} className="bg-background border-border text-foreground focus-visible:ring-blue-500 [color-scheme:dark]" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">End Date</label>
                                <Input type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} className="bg-background border-border text-foreground focus-visible:ring-blue-500 [color-scheme:dark]" />
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="border-t border-border pt-4 mt-2">
                        <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-muted-foreground hover:text-foreground hover:bg-muted">Cancel</Button>
                        <Button onClick={handleCreate} disabled={saving || !form.name || !form.startDate || !form.endDate} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                            {saving ? 'Saving...' : 'Add Holiday'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
