'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Clock, PlusCircle, Trash2, Edit } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { getShifts, deleteShift, createShift, updateShift } from '@/actions/bas-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('14:00');
  const [gracePeriod, setGracePeriod] = useState(15);

  const { toast } = useToast();

  const fetchShifts = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getShifts();
      if (result.success) {
        setShifts(result.data || []);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error fetching shifts:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not fetch shifts.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const resetForm = () => {
    setName('');
    setStartTime('08:00');
    setEndTime('14:00');
    setGracePeriod(15);
    setEditingShiftId(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (shift: any) => {
    setEditingShiftId(shift.id);
    setName(shift.name);
    setStartTime(shift.startTime);
    setEndTime(shift.endTime);
    setGracePeriod(shift.gracePeriod);
    setIsEditModalOpen(true);
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let result;
      if (editingShiftId) {
        result = await updateShift(editingShiftId, {
          name,
          startTime,
          endTime,
          gracePeriod: Number(gracePeriod)
        });
      } else {
        result = await createShift({
          name,
          startTime,
          endTime,
          gracePeriod: Number(gracePeriod)
        });
      }

      if (result.success) {
        toast({
          title: editingShiftId ? 'Shift Updated' : 'Shift Created',
          description: editingShiftId ? 'The shift times have been updated.' : 'The shift has been successfully created.',
        });
        setIsModalOpen(false);
        setIsEditModalOpen(false);
        fetchShifts();
        resetForm();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save shift.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeShift = async (shiftId: string) => {
    if (!confirm('Are you sure you want to delete this shift? Staff members on this shift will revert to default times.')) return;
    try {
      const result = await deleteShift(shiftId);
      if (result.success) {
        toast({
          title: 'Shift Deleted',
          description: 'The shift was removed successfully.',
        });
        fetchShifts();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete shift.',
      });
    }
  };

  const ShiftForm = () => (
    <form onSubmit={handleSaveShift} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label htmlFor="name">Shift Name</Label>
        <Input id="name" required placeholder="e.g. Afternoon Session" value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startTime">Start Time (24h)</Label>
          <Input id="startTime" type="time" required value={startTime} onChange={e => setStartTime(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">End Time (24h)</Label>
          <Input id="endTime" type="time" required value={endTime} onChange={e => setEndTime(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="gracePeriod">Grace Period (Minutes)</Label>
        <Input id="gracePeriod" type="number" required value={gracePeriod} onChange={e => setGracePeriod(Number(e.target.value))} />
      </div>
      <div className="flex justify-end pt-4 gap-2">
        <Button type="button" variant="outline" onClick={() => { setIsModalOpen(false); setIsEditModalOpen(false); }}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting} className="bg-indigo-600">
          {isSubmitting ? 'Saving...' : 'Save Shift'}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Academic Shifts</h1>
          <p className="text-slate-500 mt-1">
            Manage Morning and Afternoon sessions for staff.
          </p>
        </div>
        
        {/* Create Dialog */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleOpenCreate}>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Shift
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Academic Shift</DialogTitle>
              <DialogDescription>
                Define a new session schedule for your school.
              </DialogDescription>
            </DialogHeader>
            <ShiftForm />
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Academic Shift</DialogTitle>
              <DialogDescription>
                Adjust the timings for this session. Changes will apply to all assigned staff immediately.
              </DialogDescription>
            </DialogHeader>
            <ShiftForm />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-500" />
            Active Shifts
          </CardTitle>
          <CardDescription>All configured sessions in the system.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Shift Name</TableHead>
                <TableHead>Expected Clock-In</TableHead>
                <TableHead>Expected Clock-Out</TableHead>
                <TableHead>Grace Period</TableHead>
                <TableHead>Assigned Staff</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : shifts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    No shifts configured. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                shifts.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell className="font-medium">{shift.name}</TableCell>
                    <TableCell>{shift.startTime}</TableCell>
                    <TableCell>{shift.endTime}</TableCell>
                    <TableCell>{shift.gracePeriod} mins</TableCell>
                    <TableCell>{shift._count?.users || 0} Staff</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 mr-2"
                        onClick={() => handleOpenEdit(shift)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removeShift(shift.id)}
                      >
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
