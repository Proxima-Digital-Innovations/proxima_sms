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
import { getTimsCourses, getTimsPrograms, createTimsCourse } from '@/actions/tims-actions';
import { BookMarked, Plus, GitFork, CheckCircle2, Layers } from 'lucide-react';

export default function TertiaryCoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const [form, setForm] = useState({
    code: '',
    title: '',
    creditUnits: 3,
    level: 100,
    semester: 1,
    programId: '',
    prerequisiteCourseIds: [] as string[],
  });

  const loadData = async () => {
    setIsLoading(false);
    const [cRes, pRes] = await Promise.all([getTimsCourses(), getTimsPrograms()]);
    if (cRes.success && cRes.data) setCourses(cRes.data);
    if (pRes.success && pRes.data) setPrograms(pRes.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code || !form.title) return;

    startTransition(async () => {
      const res = await createTimsCourse(form);
      if (res.success) {
        toast({ title: 'Course Registered', description: `${form.code} added to catalog.` });
        setIsDialogOpen(false);
        setForm({ code: '', title: '', creditUnits: 3, level: 100, semester: 1, programId: '', prerequisiteCourseIds: [] });
        loadData();
      } else {
        toast({ title: 'Registration Failed', description: res.error, variant: 'destructive' });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <BookMarked className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Course Catalog & Curriculum</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Maintain departmental course definitions, credit load weighting, and prerequisite rules for enrollment validation.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl shadow-sm">
              <Plus className="h-4 w-4 mr-2" /> Add Course
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle>Add Course to Catalog</DialogTitle>
              <DialogDescription>
                Define code, title, credits, and any compulsory prerequisite courses.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="c-code">Course Code</Label>
                  <Input
                    id="c-code"
                    placeholder="e.g. CSC301"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-units">Credit Units</Label>
                  <Input
                    id="c-units"
                    type="number"
                    min={1}
                    max={6}
                    value={form.creditUnits}
                    onChange={(e) => setForm({ ...form, creditUnits: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="c-title">Course Title</Label>
                <Input
                  id="c-title"
                  placeholder="e.g. Data Structures & Algorithms"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="c-level">Level</Label>
                  <Select
                    value={String(form.level)}
                    onValueChange={(val) => setForm({ ...form, level: Number(val) })}
                  >
                    <SelectTrigger id="c-level">
                      <SelectValue placeholder="Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100">100 Level</SelectItem>
                      <SelectItem value="200">200 Level</SelectItem>
                      <SelectItem value="300">300 Level</SelectItem>
                      <SelectItem value="400">400 Level</SelectItem>
                      <SelectItem value="500">500 Level</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-sem">Semester</Label>
                  <Select
                    value={String(form.semester)}
                    onValueChange={(val) => setForm({ ...form, semester: Number(val) })}
                  >
                    <SelectTrigger id="c-sem">
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
                <Label htmlFor="c-prog">Associated Degree Program (Optional)</Label>
                <Select
                  value={form.programId || 'NONE'}
                  onValueChange={(val) => setForm({ ...form, programId: val === 'NONE' ? '' : val })}
                >
                  <SelectTrigger id="c-prog">
                    <SelectValue placeholder="Select Program" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">General / Inter-Departmental</SelectItem>
                    {programs.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.code} - {p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Saving...' : 'Save Course'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Courses List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.length === 0 ? (
          <Card className="col-span-full p-8 text-center border-dashed rounded-2xl bg-card">
            <BookMarked className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
            <h3 className="font-semibold text-foreground">No Courses in Catalog</h3>
            <p className="text-muted-foreground text-xs mt-1 max-w-sm mx-auto">
              Add curriculum units like CSC201, MTH101, or ENG102 with their corresponding credit values.
            </p>
          </Card>
        ) : (
          courses.map((c) => (
            <Card key={c.id} className="border border-border bg-card rounded-2xl shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="font-mono text-xs font-bold text-primary bg-primary/5">
                    {c.code}
                  </Badge>
                  <Badge className="bg-slate-800 text-slate-100 font-mono text-[11px]">
                    {c.creditUnits} Units
                  </Badge>
                </div>
                <CardTitle className="text-base font-bold text-foreground mt-2 line-clamp-1">
                  {c.title}
                </CardTitle>
                <CardDescription className="text-xs">
                  {c.level} Level • Semester {c.semester} {c.program ? `• ${c.program.code}` : ''}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0 pb-4 text-xs space-y-2 border-t border-border/50 pt-3">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5"><GitFork className="h-3.5 w-3.5" /> Prerequisites:</span>
                  <span className="font-semibold text-foreground">
                    {c.prerequisites?.length > 0 
                      ? c.prerequisites.map((p: any) => p.prerequisite.code).join(', ')
                      : 'None'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> Active Offerings:</span>
                  <span className="font-semibold text-foreground">{c._count?.offerings || 0}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
