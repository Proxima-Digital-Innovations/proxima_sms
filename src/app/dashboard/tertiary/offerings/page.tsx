'use client';

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getTimsOfferings, getTimsCourses, createTimsOffering } from '@/actions/tims-actions';
import { Calendar, Plus, Users, Lock, CheckCircle2 } from 'lucide-react';

export default function TertiaryOfferingsPage() {
  const [offerings, setOfferings] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const [form, setForm] = useState({
    courseId: '',
    academicSession: '2025/2026',
    semester: 1,
    maxCapacity: 100,
  });

  const loadData = async () => {
    setIsLoading(false);
    const [oRes, cRes] = await Promise.all([getTimsOfferings(), getTimsCourses()]);
    if (oRes.success && oRes.data) setOfferings(oRes.data);
    if (cRes.success && cRes.data) setCourses(cRes.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.courseId) return;

    startTransition(async () => {
      const res = await createTimsOffering(form);
      if (res.success) {
        toast({ title: 'Course Offering Published', description: 'Students can now register for this section.' });
        setIsDialogOpen(false);
        setForm({ courseId: '', academicSession: '2025/2026', semester: 1, maxCapacity: 100 });
        loadData();
      } else {
        toast({ title: 'Creation Failed', description: res.error, variant: 'destructive' });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Semester Course Offerings</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Open semester course sections with seat quotas and real-time concurrency reservation controls.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl shadow-sm">
              <Plus className="h-4 w-4 mr-2" /> Open Course Offering
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>Open Course Offering</DialogTitle>
              <DialogDescription>
                Schedule a course for student enrollment with a seat capacity ceiling.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="off-course">Select Course</Label>
                <Select
                  value={form.courseId}
                  onValueChange={(val) => setForm({ ...form, courseId: val })}
                >
                  <SelectTrigger id="off-course">
                    <SelectValue placeholder="Choose a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.code} - {c.title} ({c.creditUnits} Units)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="off-session">Academic Session</Label>
                  <Input
                    id="off-session"
                    placeholder="e.g. 2025/2026"
                    value={form.academicSession}
                    onChange={(e) => setForm({ ...form, academicSession: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="off-sem">Semester</Label>
                  <Select
                    value={String(form.semester)}
                    onValueChange={(val) => setForm({ ...form, semester: Number(val) })}
                  >
                    <SelectTrigger id="off-sem">
                      <SelectValue placeholder="Semester" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1st Semester</SelectItem>
                      <SelectItem value="2">2nd Semester</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="off-cap">Maximum Seat Capacity (Concurrency Quota)</Label>
                <Input
                  id="off-cap"
                  type="number"
                  min={10}
                  max={1000}
                  value={form.maxCapacity}
                  onChange={(e) => setForm({ ...form, maxCapacity: Number(e.target.value) })}
                  required
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Publishing...' : 'Open Offering'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Offerings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {offerings.length === 0 ? (
          <Card className="col-span-full p-8 text-center border-dashed rounded-2xl bg-card">
            <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
            <h3 className="font-semibold text-foreground">No Active Offerings</h3>
            <p className="text-muted-foreground text-xs mt-1 max-w-sm mx-auto">
              Open offerings for the current session to permit student course registration.
            </p>
          </Card>
        ) : (
          offerings.map((off) => {
            const isFull = off.enrolledCount >= off.maxCapacity;
            return (
              <Card key={off.id} className="border border-border bg-card rounded-2xl shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="font-mono text-xs font-bold text-primary bg-primary/5">
                      {off.course?.code}
                    </Badge>
                    <Badge className={isFull ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'}>
                      {isFull ? 'Capacity Full' : `${off.enrolledCount}/${off.maxCapacity} Seats`}
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-bold text-foreground mt-2 line-clamp-1">
                    {off.course?.title}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {off.academicSession} • Semester {off.semester} • {off.course?.creditUnits} Credit Units
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0 pb-4 text-xs space-y-2 border-t border-border/50 pt-3">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Enrolled Students:</span>
                    <span className="font-semibold text-foreground">{off.enrolledCount}</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Registration Status:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Open & Active</span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
