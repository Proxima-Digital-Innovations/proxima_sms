'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { DynamicTitle } from '@/components/dashboard/dynamic-title';
import { getAcademicData } from '@/actions/academic-data';
import { getBehaviouralScores, saveBehaviouralScores } from '@/actions/behavioural-actions';
import { Save, Loader2, Users, Heart } from 'lucide-react';

export default function BehaviouralPage() {
  const { toast } = useToast();
  
  const [classes, setClasses] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');

  const [students, setStudents] = useState<any[]>([]);
  const [traits, setTraits] = useState<any[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const acadRes = await getAcademicData();
      setClasses(acadRes.classes || []);
      setTerms(acadRes.terms || []);
    })();
  }, []);

  const loadData = async () => {
    if (!selectedClass || !selectedTerm) {
      toast({ variant: 'destructive', title: 'Missing Filters', description: 'Please select class and term.' });
      return;
    }
    setIsLoading(true);
    try {
      const res = await getBehaviouralScores(selectedClass, selectedTerm);
      if (res.success) {
        setStudents(res.students || []);
        setTraits(res.traits || []);
        
        const scoreMap: Record<string, number> = {};
        for (const s of (res.scores || [])) {
          scoreMap[`${s.studentId}__${s.traitId}`] = s.score;
        }
        setScores(scoreMap);
        setDirty(new Set());
        setIsLoaded(true);
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const updateScore = (studentId: string, traitId: string, value: number) => {
    const key = `${studentId}__${traitId}`;
    setScores(prev => ({ ...prev, [key]: value }));
    setDirty(prev => new Set(prev).add(key));
  };

  const handleSave = async () => {
    if (dirty.size === 0) return;
    setIsSaving(true);
    try {
      const toSave = Array.from(dirty).map(key => {
        const [studentId, traitId] = key.split('__');
        return {
          studentId,
          traitId,
          termId: selectedTerm,
          score: scores[key],
        };
      });

      const res = await saveBehaviouralScores(toSave);
      if (res.success) {
        toast({ title: 'Saved', description: 'Behavioural scores successfully saved.' });
        setDirty(new Set());
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const affectiveTraits = traits.filter(t => t.category === 'AFFECTIVE');
  const psychomotorTraits = traits.filter(t => t.category === 'PSYCHOMOTOR');

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <DynamicTitle breadcrumbs={[{ label: 'Behavioural Assessment', href: '/dashboard/behavioural' }]} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
            Behavioural Assessment
          </h2>
          <p className="text-muted-foreground mt-1">Rate students on affective and psychomotor domains (1-5 scale).</p>
        </div>
        {isLoaded && dirty.size > 0 && (
          <Button onClick={handleSave} disabled={isSaving} className="bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save {dirty.size} Changes
          </Button>
        )}
      </div>

      <Card className="border-none shadow-md bg-white/80 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label>Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <Label>Term</Label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
                <SelectContent>{terms.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={loadData} disabled={isLoading} className="bg-pink-600 hover:bg-pink-700 w-full md:w-auto">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Users className="h-4 w-4 mr-2" />}
              Load Students
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoaded && (
        <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm">
          <CardHeader className="border-b">
            <CardTitle className="text-lg">Assessment Grid</CardTitle>
            <CardDescription>Click a number (1-5) to rate. 5 is highest.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {students.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Heart className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                <p className="font-medium">No students found</p>
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="p-3 sticky left-0 bg-slate-100 z-10 min-w-[200px] border-b border-r">Student</th>
                    {affectiveTraits.length > 0 && (
                      <th colSpan={affectiveTraits.length} className="p-2 text-center border-b border-r text-pink-700 bg-pink-50">
                        Affective Domain
                      </th>
                    )}
                    {psychomotorTraits.length > 0 && (
                      <th colSpan={psychomotorTraits.length} className="p-2 text-center border-b border-r text-purple-700 bg-purple-50">
                        Psychomotor Domain
                      </th>
                    )}
                  </tr>
                  <tr className="bg-white border-b">
                    <th className="p-2 sticky left-0 bg-white z-10 border-r" />
                    {affectiveTraits.map(t => (
                      <th key={t.id} className="p-2 text-center border-r min-w-[60px] max-w-[80px]">
                        <div className="text-xs text-muted-foreground font-normal truncate" title={t.name}>{t.name}</div>
                      </th>
                    ))}
                    {psychomotorTraits.map(t => (
                      <th key={t.id} className="p-2 text-center border-r min-w-[60px] max-w-[80px]">
                        <div className="text-xs text-muted-foreground font-normal truncate" title={t.name}>{t.name}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, idx) => (
                    <tr key={student.id} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-pink-50/30 transition-colors`}>
                      <td className="p-2 sticky left-0 z-10 font-medium text-sm border-r" style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                        {student.lastName}, {student.firstName}
                      </td>
                      {affectiveTraits.map(t => {
                        const key = `${student.id}__${t.id}`;
                        const val = scores[key];
                        return (
                          <td key={t.id} className="p-1 border-r text-center">
                            <select 
                              className={`w-full h-8 text-center bg-transparent focus:ring-2 focus:ring-pink-300 rounded outline-none cursor-pointer ${val ? 'font-bold text-pink-700' : 'text-slate-400'}`}
                              value={val || ''}
                              onChange={e => updateScore(student.id, t.id, parseInt(e.target.value))}
                            >
                              <option value="" disabled>-</option>
                              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                          </td>
                        );
                      })}
                      {psychomotorTraits.map(t => {
                        const key = `${student.id}__${t.id}`;
                        const val = scores[key];
                        return (
                          <td key={t.id} className="p-1 border-r text-center">
                            <select 
                              className={`w-full h-8 text-center bg-transparent focus:ring-2 focus:ring-purple-300 rounded outline-none cursor-pointer ${val ? 'font-bold text-purple-700' : 'text-slate-400'}`}
                              value={val || ''}
                              onChange={e => updateScore(student.id, t.id, parseInt(e.target.value))}
                            >
                              <option value="" disabled>-</option>
                              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
