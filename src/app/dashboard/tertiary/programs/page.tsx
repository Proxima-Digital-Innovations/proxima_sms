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
import { getTimsPrograms, createTimsProgram } from '@/actions/tims-actions';
import { GraduationCap, Plus, BookOpen, Users, ShieldCheck, Award } from 'lucide-react';

export default function TertiaryProgramsPage() {
  const [programs, setPrograms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const [form, setForm] = useState({
    code: '',
    name: '',
    gradingStandard: 'NIGERIA_NUC_5_0' as 'NIGERIA_NUC_5_0' | 'US_4_0' | 'UK_HONOURS',
    totalCreditsRequired: 120,
  });

  const loadData = async () => {
    setIsLoading(false);
    const res = await getTimsPrograms();
    if (res.success && res.data) {
      setPrograms(res.data);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code || !form.name) return;

    startTransition(async () => {
      const res = await createTimsProgram(form);
      if (res.success) {
        toast({ title: 'Academic Program Created', description: `${form.code} added to institutional registry.` });
        setIsDialogOpen(false);
        setForm({ code: '', name: '', gradingStandard: 'NIGERIA_NUC_5_0', totalCreditsRequired: 120 });
        loadData();
      } else {
        toast({ title: 'Creation Failed', description: res.error, variant: 'destructive' });
      }
    });
  };

  const getStandardBadge = (standard: string) => {
    switch (standard) {
      case 'US_4_0':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">US 4.00 (Latin Honours)</Badge>;
      case 'UK_HONOURS':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">UK Honours Framework</Badge>;
      case 'NIGERIA_NUC_5_0':
      default:
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">NUC CCMAS 5.00 Scale</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Academic Degree Programs</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Configure tertiary degree curricula, required graduation units, and multi-accreditation grading frameworks.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl shadow-sm">
              <Plus className="h-4 w-4 mr-2" /> Add Degree Program
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>New Academic Program</DialogTitle>
              <DialogDescription>
                Define an undergraduate or postgraduate program with its statutory grading scale.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="prog-code">Program Code (e.g. B.SC-CSC)</Label>
                <Input
                  id="prog-code"
                  placeholder="e.g. CSC-BSC"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prog-name">Program Title</Label>
                <Input
                  id="prog-name"
                  placeholder="e.g. B.Sc. Computer Science"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prog-standard">Accreditation Grading Standard</Label>
                <Select
                  value={form.gradingStandard}
                  onValueChange={(val: any) => setForm({ ...form, gradingStandard: val })}
                >
                  <SelectTrigger id="prog-standard">
                    <SelectValue placeholder="Select scale" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NIGERIA_NUC_5_0">Nigerian NUC BMAS / CCMAS 5.00 Scale</SelectItem>
                    <SelectItem value="US_4_0">US Standard 4.00 Scale (Latin Honours)</SelectItem>
                    <SelectItem value="UK_HONOURS">UK Honours Framework (Levels 5/6 Weighted)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prog-credits">Total Credits Required for Graduation</Label>
                <Input
                  id="prog-credits"
                  type="number"
                  min={60}
                  max={240}
                  value={form.totalCreditsRequired}
                  onChange={(e) => setForm({ ...form, totalCreditsRequired: Number(e.target.value) })}
                  required
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Saving...' : 'Create Program'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Grid of Programs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {programs.length === 0 ? (
          <Card className="col-span-full p-8 text-center border-dashed rounded-2xl bg-card">
            <GraduationCap className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
            <h3 className="font-semibold text-foreground">No Degree Programs Configured</h3>
            <p className="text-muted-foreground text-xs mt-1 max-w-sm mx-auto">
              Click &quot;Add Degree Program&quot; above to establish programs such as B.Sc. Computer Science or B.Eng. Software Engineering.
            </p>
          </Card>
        ) : (
          programs.map((prog) => (
            <Card key={prog.id} className="border border-border bg-card rounded-2xl shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="font-mono text-xs px-2.5 py-0.5 font-bold text-primary bg-primary/5">
                    {prog.code}
                  </Badge>
                  {getStandardBadge(prog.gradingStandard)}
                </div>
                <CardTitle className="text-lg font-bold text-foreground mt-2 line-clamp-1">
                  {prog.name}
                </CardTitle>
                <CardDescription className="text-xs">
                  Graduation requirement: <span className="font-semibold text-foreground">{prog.totalCreditsRequired} Credit Units</span>
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0 pb-4 text-xs space-y-2 border-t border-border/50 pt-3">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span className="flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Enrolled Courses:</span>
                  <span className="font-semibold text-foreground">{prog._count?.courses || 0}</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Enrolled Undergraduates:</span>
                  <span className="font-semibold text-foreground">{prog._count?.students || 0}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
