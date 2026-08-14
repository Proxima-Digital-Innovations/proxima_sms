'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Search, Layers, CheckCircle2 } from 'lucide-react';
import { DynamicTitle } from '@/components/dashboard/dynamic-title';
import { getPayrollSubscriptionTypes, createPayrollSubscriptionType } from '@/actions/payroll-actions';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

export default function SubscriptionsPage() {
  const [types, setTypes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [isPercentage, setIsPercentage] = useState(false);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();

  const fetchTypes = async () => {
    setIsLoading(true);
    try {
      const res = await getPayrollSubscriptionTypes();
      if (res.success && res.types) {
        setTypes(res.types);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await createPayrollSubscriptionType({
        name,
        amount: parseFloat(amount),
        isPercentage,
        description
      });
      if (res.success) {
        toast({ title: 'Success', description: 'Subscription created.' });
        setIsDialogOpen(false);
        fetchTypes();
        // Reset
        setName(''); setAmount(''); setIsPercentage(false); setDescription('');
      } else {
        toast({ title: 'Error', description: res.message, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <DynamicTitle breadcrumbs={[
        { label: 'Finance', href: '/dashboard/finance' }, 
        { label: 'Payroll', href: '/dashboard/finance/payroll' },
        { label: 'Subscriptions', href: '/dashboard/finance/payroll/subscriptions' }
      ]} />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">Subscription Engine</h2>
          <p className="text-muted-foreground mt-1">Configure automated deductions (e.g., Staff Bus, Health Insurance).</p>
        </div>
        <div className="flex gap-2">
          <Button 
            className="shadow-md bg-violet-600 hover:bg-violet-700 text-white"
            onClick={() => setIsDialogOpen(true)}
          >
            <PlusCircle className="mr-2 h-4 w-4" /> New Offering
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm">
        <CardHeader className="border-b bg-slate-50/50 pb-4">
          <CardTitle className="text-xl">Active Offerings</CardTitle>
          <CardDescription>Available subscriptions that staff can opt-in to.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="pl-6">Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Deduction</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mb-2"></div>
                      Loading...
                    </div>
                  </TableCell>
                </TableRow>
              ) : types.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    <Layers className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    No subscription offerings configured yet.
                  </TableCell>
                </TableRow>
              ) : (
                types.map((t) => (
                  <TableRow key={t.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-medium pl-6">{t.name}</TableCell>
                    <TableCell className="text-slate-500">{t.description}</TableCell>
                    <TableCell className="font-semibold text-violet-700">
                      {t.isPercentage ? `${t.amount}% of Base Pay` : `₦${t.amount.toLocaleString()}`}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-emerald-500 text-emerald-700 bg-emerald-50">Active</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Subscription Offering</DialogTitle>
            <DialogDescription>
              Configure a new service that staff can subscribe to.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Subscription Name</label>
              <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Staff Health Insurance" />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional details..." />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Deduction Value</label>
              <Input required type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g., 5000" />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox id="isPercentage" checked={isPercentage} onCheckedChange={(c) => setIsPercentage(c as boolean)} />
              <label htmlFor="isPercentage" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                This is a Percentage of Base Pay (instead of fixed Naira)
              </label>
            </div>

            <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 mt-4" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Launch Offering'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
