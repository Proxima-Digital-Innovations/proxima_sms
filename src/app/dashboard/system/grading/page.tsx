'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Save, Plus, Trash2, Globe, Sparkles, RotateCcw } from 'lucide-react';
import { getSystemSettings, updateGradingScale } from '@/actions/system-actions';

type Grade = {
  grade: string;
  minScore: number;
  maxScore: number;
  remark?: string;
};

const PRESETS: Record<string, { label: string; desc: string; scale: Grade[] }> = {
  WAEC: {
    label: 'WAEC / NECO 9-Point',
    desc: 'West African standard terminal assessment scale (A1 to F9).',
    scale: [
      { grade: 'A1', minScore: 75, maxScore: 100, remark: 'Excellent' },
      { grade: 'B2', minScore: 70, maxScore: 74, remark: 'Very Good' },
      { grade: 'B3', minScore: 65, maxScore: 69, remark: 'Good' },
      { grade: 'C4', minScore: 60, maxScore: 64, remark: 'Credit' },
      { grade: 'C5', minScore: 55, maxScore: 59, remark: 'Credit' },
      { grade: 'C6', minScore: 50, maxScore: 54, remark: 'Credit' },
      { grade: 'D7', minScore: 45, maxScore: 49, remark: 'Pass' },
      { grade: 'E8', minScore: 40, maxScore: 44, remark: 'Pass' },
      { grade: 'F9', minScore: 0, maxScore: 39, remark: 'Fail' },
    ],
  },
  US_GPA: {
    label: 'American GPA (A-F)',
    desc: 'Standard North American 5-tier letter grading scale with 4.0 GPA weighting.',
    scale: [
      { grade: 'A', minScore: 85, maxScore: 100, remark: 'Excellent (4.0 GPA)' },
      { grade: 'B', minScore: 70, maxScore: 84, remark: 'Good (3.0 GPA)' },
      { grade: 'C', minScore: 55, maxScore: 69, remark: 'Satisfactory (2.0 GPA)' },
      { grade: 'D', minScore: 40, maxScore: 54, remark: 'Passing (1.0 GPA)' },
      { grade: 'F', minScore: 0, maxScore: 39, remark: 'Failing (0.0 GPA)' },
    ],
  },
  CAMBRIDGE: {
    label: 'Cambridge IGCSE (A*-U)',
    desc: 'British Cambridge International examination scale (A* to U).',
    scale: [
      { grade: 'A*', minScore: 90, maxScore: 100, remark: 'Distinction' },
      { grade: 'A', minScore: 80, maxScore: 89, remark: 'Excellent' },
      { grade: 'B', minScore: 70, maxScore: 79, remark: 'Very Good' },
      { grade: 'C', minScore: 60, maxScore: 69, remark: 'Good' },
      { grade: 'D', minScore: 50, maxScore: 59, remark: 'Satisfactory' },
      { grade: 'E', minScore: 40, maxScore: 49, remark: 'Pass' },
      { grade: 'F', minScore: 30, maxScore: 39, remark: 'Basic Pass' },
      { grade: 'G', minScore: 20, maxScore: 29, remark: 'Minimum Pass' },
      { grade: 'U', minScore: 0, maxScore: 19, remark: 'Ungraded' },
    ],
  },
  IB: {
    label: 'International Baccalaureate (1-7)',
    desc: 'IB World School 7-point holistic achievement scale.',
    scale: [
      { grade: '7', minScore: 85, maxScore: 100, remark: 'Excellent' },
      { grade: '6', minScore: 70, maxScore: 84, remark: 'Very Good' },
      { grade: '5', minScore: 55, maxScore: 69, remark: 'Good' },
      { grade: '4', minScore: 45, maxScore: 54, remark: 'Satisfactory' },
      { grade: '3', minScore: 35, maxScore: 44, remark: 'Mediocre' },
      { grade: '2', minScore: 25, maxScore: 34, remark: 'Poor' },
      { grade: '1', minScore: 0, maxScore: 24, remark: 'Very Poor' },
    ],
  },
};

export default function GradingSystemPage() {
  const [gradingScale, setGradingScale] = useState<Grade[]>(PRESETS.WAEC.scale);
  const [selectedPreset, setSelectedPreset] = useState<string>('WAEC');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const fetchGradingScale = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getSystemSettings();
      if (res.success && res.data?.gradingScale) {
        const parsed = JSON.parse(res.data.gradingScale);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setGradingScale(parsed);
          // Detect preset
          if (parsed[0]?.grade === 'A1') setSelectedPreset('WAEC');
          else if (parsed[0]?.grade === 'A*') setSelectedPreset('CAMBRIDGE');
          else if (parsed[0]?.grade === '7') setSelectedPreset('IB');
          else if (parsed[0]?.grade === 'A') setSelectedPreset('US_GPA');
          else setSelectedPreset('CUSTOM');
        }
      }
    } catch (error) {
      console.error("Error fetching grading scale:", error);
      toast({ variant: 'destructive', title: "Error", description: "Could not load grading scale." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchGradingScale();
  }, [fetchGradingScale]);

  const applyPreset = (key: string) => {
    if (PRESETS[key]) {
      setGradingScale(PRESETS[key].scale);
      setSelectedPreset(key);
      toast({
        title: "Preset Applied",
        description: `Loaded ${PRESETS[key].label} template. Click "Save Changes" to apply.`,
      });
    }
  };

  const handleScaleChange = (index: number, field: keyof Grade, value: string | number) => {
    const newScale = [...gradingScale];
    if (field === 'minScore' || field === 'maxScore') {
      newScale[index] = { ...newScale[index], [field]: Number(value) };
    } else {
      newScale[index] = { ...newScale[index], [field]: value };
    }
    setGradingScale(newScale);
    setSelectedPreset('CUSTOM');
  };

  const addGradeTier = () => {
    const last = gradingScale[gradingScale.length - 1];
    const newTier: Grade = {
      grade: 'New',
      minScore: 0,
      maxScore: last ? Math.max(0, last.minScore - 1) : 100,
      remark: 'Pass',
    };
    setGradingScale([...gradingScale, newTier]);
    setSelectedPreset('CUSTOM');
  };

  const removeGradeTier = (index: number) => {
    if (gradingScale.length <= 1) {
      toast({ title: "Cannot Remove", description: "At least one grade tier must remain.", variant: 'destructive' });
      return;
    }
    const newScale = gradingScale.filter((_, i) => i !== index);
    setGradingScale(newScale);
    setSelectedPreset('CUSTOM');
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      // Basic validation: ensure ranges are logical
      for (let i = 0; i < gradingScale.length; i++) {
        const item = gradingScale[i];
        if (item.minScore > item.maxScore) {
          toast({
            variant: 'destructive',
            title: "Validation Error",
            description: `Tier ${item.grade}: Minimum score (${item.minScore}) cannot exceed maximum score (${item.maxScore}).`
          });
          setIsSaving(false);
          return;
        }
      }

      await updateGradingScale(gradingScale);
      toast({ 
        title: "Grading Scale Updated", 
        description: "Curriculum grading standards have been saved and applied across report cards." 
      });
    } catch (error: any) {
      console.error("Error saving grading scale:", error);
      toast({ variant: 'destructive', title: "Error", description: error.message || "Could not save the grading scale." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-6xl mx-auto">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-headline text-3xl font-bold tracking-tight">Curriculum Grading System</h1>
          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
            Multi-Curriculum Standard
          </Badge>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          Configure institutional grade thresholds, remarks, and international curriculum conversion templates.
        </p>
      </div>

      {/* Preset Selector */}
      <Card className="rounded-2xl border-border bg-card shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">International Curriculum Presets</CardTitle>
          </div>
          <CardDescription>
            Select a standard international curriculum framework to automatically populate grade boundaries.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(PRESETS).map(([key, item]) => {
              const isSelected = selectedPreset === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key)}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm'
                      : 'border-border bg-muted/20 hover:border-border hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">{item.label}</span>
                    {isSelected && <Badge className="text-[10px] h-4 px-1.5 bg-primary">Active</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {item.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Grade Table */}
      <Card className="rounded-2xl border-border bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-lg">Active Grade Thresholds</CardTitle>
            <CardDescription>
              Scores achieved within these score boundaries will be automatically mapped to these letter grades and remarks.
            </CardDescription>
          </div>
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={addGradeTier}
            className="rounded-xl text-xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Add Tier
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Letter Grade</TableHead>
                    <TableHead className="w-[140px]">Min Score (%)</TableHead>
                    <TableHead className="w-[140px]">Max Score (%)</TableHead>
                    <TableHead>Official Remark / Descriptor</TableHead>
                    <TableHead className="w-[60px] text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gradingScale.map((grade, index) => (
                    <TableRow key={index} className="hover:bg-muted/20">
                      <TableCell>
                        <Input 
                          value={grade.grade} 
                          onChange={(e) => handleScaleChange(index, 'grade', e.target.value)}
                          className="h-9 w-20 font-bold font-mono rounded-lg"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          value={grade.minScore} 
                          onChange={(e) => handleScaleChange(index, 'minScore', e.target.value)}
                          className="h-9 w-24 font-mono rounded-lg"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          value={grade.maxScore} 
                          onChange={(e) => handleScaleChange(index, 'maxScore', e.target.value)}
                          className="h-9 w-24 font-mono rounded-lg"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          value={grade.remark || ''} 
                          onChange={(e) => handleScaleChange(index, 'remark', e.target.value)}
                          placeholder="e.g. Excellent, Credit"
                          className="h-9 rounded-lg"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeGradeTier(index)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Changes apply dynamically to all terminal results, broadsheets, and student report card calculations.
            </p>
            <Button 
              onClick={handleSaveChanges} 
              disabled={isSaving || isLoading}
              className="rounded-xl px-6 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
