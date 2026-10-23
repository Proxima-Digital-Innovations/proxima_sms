'use client';

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  getTimsOfferings,
  getTimsCourses,
  createTimsOffering,
  getEligibleLecturersAction,
  assignLecturerToOfferingAction,
  removeLecturerFromOfferingAction,
} from '@/actions/tims-actions';
import { Calendar, Plus, Users, UserPlus, Trash2, GraduationCap } from 'lucide-react';

export default function TertiaryOfferingsPage() {
  const [offerings, setOfferings] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [assignModalOffering, setAssignModalOffering] = useState<any | null>(null);
  const [selectedLecturerId, setSelectedLecturerId] = useState<string>('');
  const [selectedLecturerRole, setSelectedLecturerRole] = useState<string>('PRIMARY_LECTURER');
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const [form, setForm] = useState({
    courseId: '',
    academicSession: '2025/2026',
    semester: 1,
    maxCapacity: 100,
    lecturerStaffProfileId: 'NONE',
  });

  const loadData = async () => {
    setIsLoading(true);
    const [oRes, cRes, lRes] = await Promise.all([
      getTimsOfferings(),
      getTimsCourses(),
      getEligibleLecturersAction(),
    ]);
    if (oRes.success && oRes.data) setOfferings(oRes.data);
    if (cRes.success && cRes.data) setCourses(cRes.data);
    if (lRes.success && lRes.data) setLecturers(lRes.data);
    setIsLoading(false);
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
        setForm({ courseId: '', academicSession: '2025/2026', semester: 1, maxCapacity: 100, lecturerStaffProfileId: 'NONE' });
        loadData();
      } else {
        toast({ title: 'Creation Failed', description: res.error, variant: 'destructive' });
      }
    });
  };

  const handleAssignLecturer = () => {
    if (!assignModalOffering || !selectedLecturerId) return;
    startTransition(async () => {
      const res = await assignLecturerToOfferingAction({
        courseOfferingId: assignModalOffering.id,
        staffProfileId: selectedLecturerId,
        role: selectedLecturerRole,
      });
      if (res.success) {
        toast({ title: 'Lecturer Assigned', description: 'Course lecturer linked to offering & Lecturer Studio.' });
        setSelectedLecturerId('');
        setAssignModalOffering(null);
        loadData();
      } else {
        toast({ title: 'Assignment Failed', description: res.error, variant: 'destructive' });
      }
    });
  };

  const handleRemoveLecturer = (courseLecturerId: string) => {
    startTransition(async () => {
      const res = await removeLecturerFromOfferingAction(courseLecturerId);
      if (res.success) {
        toast({ title: 'Lecturer Unassigned', description: 'Removed lecturer from course offering.' });
        loadData();
      } else {
        toast({ title: 'Error', description: res.error, variant: 'destructive' });
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
            Open semester course sections, assign primary/co-lecturers, and manage seat capacity ceilings.
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
                Schedule a course for student enrollment and optionally assign a primary lecturer.
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

              <div className="space-y-1.5">
                <Label>Assign Primary Lecturer (Optional)</Label>
                <Select
                  value={form.lecturerStaffProfileId}
                  onValueChange={(val) => setForm({ ...form, lecturerStaffProfileId: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Lecturer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Assign Later</SelectItem>
                    {lecturers.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.user?.firstName} {l.user?.lastName} ({l.staffCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            const assignedLecturers = off.lecturers || [];
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
                    {off.academicSession} &bull; Semester {off.semester} &bull; {off.course?.creditUnits} Credit Units
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-3 pb-3 text-xs space-y-2.5 border-t border-border/50">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Enrolled Students:</span>
                    <span className="font-semibold text-foreground">{off.enrolledCount}</span>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <GraduationCap className="h-3.5 w-3.5" /> Assigned Lecturers:
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[11px] text-primary"
                        onClick={() => {
                          setAssignModalOffering(off);
                          setSelectedLecturerId('');
                        }}
                      >
                        <UserPlus className="h-3 w-3 mr-1" /> Assign
                      </Button>
                    </div>
                    {assignedLecturers.length === 0 ? (
                      <div className="text-[11px] italic text-muted-foreground">No lecturer assigned yet</div>
                    ) : (
                      <div className="space-y-1">
                        {assignedLecturers.map((cl: any) => (
                          <div key={cl.id} className="flex items-center justify-between bg-muted/40 px-2.5 py-1 rounded-lg">
                            <span className="font-medium text-foreground truncate">
                              {cl.staff?.user?.firstName} {cl.staff?.user?.lastName}
                              <span className="text-[10px] text-muted-foreground ml-1">({cl.role.replace('_', ' ')})</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveLecturer(cl.id)}
                              className="text-muted-foreground hover:text-destructive ml-2"
                              title="Unassign lecturer"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Assign Lecturer Dialog */}
      <Dialog open={!!assignModalOffering} onOpenChange={(open) => !open && setAssignModalOffering(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              Assign Lecturer &mdash; {assignModalOffering?.course?.code}
            </DialogTitle>
            <DialogDescription>
              Assigned lecturers gain access to this course in their Lecturer Teaching Studio and CBT Console.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Select Academic Staff / Lecturer</Label>
              <Select value={selectedLecturerId} onValueChange={setSelectedLecturerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a lecturer" />
                </SelectTrigger>
                <SelectContent>
                  {lecturers.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.user?.firstName} {l.user?.lastName} ({l.user?.role}) &mdash; {l.department?.name || 'General'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Teaching Role</Label>
              <Select value={selectedLecturerRole} onValueChange={setSelectedLecturerRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRIMARY_LECTURER">Primary Course Lecturer</SelectItem>
                  <SelectItem value="CO_LECTURER">Co-Lecturer</SelectItem>
                  <SelectItem value="TEACHING_ASSISTANT">Teaching Assistant / Lab Coordinator</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignModalOffering(null)}>
              Cancel
            </Button>
            <Button onClick={handleAssignLecturer} disabled={isPending || !selectedLecturerId}>
              {isPending ? 'Assigning...' : 'Assign Lecturer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
