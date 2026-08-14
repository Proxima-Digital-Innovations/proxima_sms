'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/context/role-context';
import { DynamicTitle } from '@/components/dashboard/dynamic-title';
import { getAcademicData } from '@/actions/academic-data';
import { generateTermResults, getBroadsheetData } from '@/actions/results-actions';
import { Loader2, PlayCircle, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function GenerateResultsPage() {
  const { toast } = useToast();
  const { role } = useRole();
  const normalizedRole = (role || '').toUpperCase();
  const isAuthorized = ['SUPER_ADMIN', 'ADMIN', 'SLT', 'EXAM_OFFICER'].includes(normalizedRole);
  
  const [classes, setClasses] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  
  if (role && !isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">Only Exam Officers and Administrators can generate results.</p>
      </div>
    );
  }
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const acadRes = await getAcademicData();
      setClasses(acadRes.classes || []);
      setTerms(acadRes.terms || []);
    })();
  }, []);

  const handleGenerate = async () => {
    if (!selectedClass || !selectedTerm) {
      toast({ variant: 'destructive', title: 'Missing Filters', description: 'Please select class and term.' });
      return;
    }
    setIsGenerating(true);
    setResult(null);
    try {
      const res = await generateTermResults(selectedClass, selectedTerm);
      if (res.success) {
        toast({ title: 'Success', description: 'Results generated successfully.' });
        
        // Load broadsheet to show summary stats
        const termObj = terms.find(t => t.id === selectedTerm);
        // Assuming session is current one, we might need a better way to pass sessionName if getBroadsheetData requires it.
        // For simplicity, we just show the success message.
        setResult(res);
      } else {
        throw new Error(res.message || 'Generation failed');
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
      setResult({ success: false, message: err.message });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <DynamicTitle breadcrumbs={[
        { label: 'Results', href: '/dashboard/results/view' },
        { label: 'Generate Results', href: '/dashboard/results/generate' },
      ]} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Generate Term Results
          </h2>
          <p className="text-muted-foreground mt-1">Compute totals, averages, and class positions for all students.</p>
        </div>
      </div>

      <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Class to Process</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Term</Label>
                <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                  <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
                  <SelectContent>{terms.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="pt-4">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      size="lg" 
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg text-lg h-14"
                      disabled={!selectedClass || !selectedTerm || isGenerating}
                    >
                      {isGenerating ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <PlayCircle className="h-5 w-5 mr-2" />}
                      Generate Results
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirm Generation</DialogTitle>
                      <DialogDescription>
                        This will calculate totals, assign grades, and rank all students in this class based on their scores. 
                        It will overwrite any previously generated results for this term.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="bg-amber-50 text-amber-800 p-4 rounded-lg flex items-start gap-3 mt-4">
                      <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        Ensure all teachers have finished entering scores before running this process.
                      </div>
                    </div>
                    <DialogFooter className="mt-4">
                      <Button variant="outline" className="mr-auto">Cancel</Button>
                      <Button onClick={handleGenerate} className="bg-blue-600 hover:bg-blue-700">
                        Proceed
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-xl border flex flex-col justify-center">
              {!result && !isGenerating && (
                <div className="text-center text-muted-foreground space-y-3">
                  <TrendingUp className="h-12 w-12 mx-auto text-slate-300" />
                  <p>Select a class and term, then click Generate to process the termly results.</p>
                </div>
              )}
              {isGenerating && (
                <div className="text-center space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600" />
                  <p className="text-lg font-medium text-slate-700">Crunching the numbers...</p>
                  <p className="text-sm text-muted-foreground">Calculating category weights and determining ranks.</p>
                </div>
              )}
              {result && result.success && (
                <div className="text-center space-y-4 animate-in fade-in zoom-in duration-300">
                  <div className="mx-auto bg-green-100 text-green-600 rounded-full p-3 w-16 h-16 flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">Processing Complete!</h3>
                  <p className="text-slate-600">
                    Processed {result.processedCount || 'all'} students. Ranks and totals have been updated.
                  </p>
                  <div className="pt-4">
                    <Link href="/dashboard/results/view">
                      <Button variant="outline" className="w-full">
                        View Generated Results →
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
              {result && !result.success && (
                <div className="text-center space-y-4">
                  <AlertTriangle className="h-12 w-12 mx-auto text-red-500" />
                  <h3 className="text-xl font-bold text-slate-800">Generation Failed</h3>
                  <p className="text-red-600 bg-red-50 p-3 rounded-lg text-sm">{result.message}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
