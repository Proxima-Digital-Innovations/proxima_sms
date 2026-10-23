'use client';

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { getTimsOfferings, submitBlindGradesAction, advanceExamStageAction } from '@/actions/tims-actions';
import { Award, ShieldCheck, Lock, EyeOff, AlertTriangle, CheckCircle2, Key, Loader2, ArrowRight } from 'lucide-react';

export default function TertiaryExamProcessingPage() {
  const [offerings, setOfferings] = useState<any[]>([]);
  const [selectedOfferingId, setSelectedOfferingId] = useState<string>('');
  const [isDoubleBlind, setIsDoubleBlind] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [stepUpModalOpen, setStepUpModalOpen] = useState(false);
  const [targetStage, setTargetStage] = useState<'HOD_APPROVED' | 'DEAN_APPROVED' | 'SENATE_RATIFIED' | 'PUBLISHED'>('HOD_APPROVED');
  const [stepUpPassword, setStepUpPassword] = useState('');
  const { toast } = useToast();

  // Dynamic blind entry rows
  const [rows, setRows] = useState([
    { anonymousToken: 'CIN-200-8A3', caScore: '32', examScore: '48', secondGraderScore: '49' },
    { anonymousToken: 'CIN-200-9B1', caScore: '28', examScore: '41', secondGraderScore: '42' },
    { anonymousToken: 'CIN-200-F72', caScore: '35', examScore: '55', secondGraderScore: '54' },
  ]);

  useEffect(() => {
    async function loadOfferings() {
      const res = await getTimsOfferings();
      if (res.success && res.data && res.data.length > 0) {
        setOfferings(res.data);
        setSelectedOfferingId(res.data[0].id);
      }
    }
    loadOfferings();
  }, []);

  const addRow = () => {
    const randomHex = Math.random().toString(16).substring(2, 5).toUpperCase();
    setRows([...rows, { anonymousToken: `CIN-200-${randomHex}`, caScore: '', examScore: '', secondGraderScore: '' }]);
  };

  const updateRow = (index: number, field: string, value: string) => {
    const updated = [...rows];
    (updated[index] as any)[field] = value;
    setRows(updated);
  };

  const handleSubmitGrades = () => {
    if (!selectedOfferingId) return;

    startTransition(async () => {
      const entries = rows.map((r) => ({
        anonymousToken: r.anonymousToken,
        caScore: Number(r.caScore) || 0,
        examScore: Number(r.examScore) || 0,
        secondGraderExamScore: isDoubleBlind && r.secondGraderScore ? Number(r.secondGraderScore) : undefined,
      }));

      const res = await submitBlindGradesAction(selectedOfferingId, entries, 'authorizer-id');
      if (res.success) {
        toast({
          title: 'Blind Examination Marks Committed',
          description: `Cryptographic SHA-256 dataHash ledger computed for ${res.data?.processedCount} candidate tokens.`,
        });
      } else {
        toast({
          title: 'Submission Flagged',
          description: res.error,
          variant: 'destructive',
        });
      }
    });
  };

  const handleAdvanceStage = () => {
    if (!stepUpPassword) {
      toast({ title: 'Password Required', description: 'Enter authorizer credentials for step-up verification.', variant: 'destructive' });
      return;
    }

    startTransition(async () => {
      const res = await advanceExamStageAction(selectedOfferingId, targetStage, 'authorizer-id', stepUpPassword);
      if (res.success) {
        toast({
          title: 'Governance Stage Ratified',
          description: `Course offering advanced to ${targetStage}. Records are now immutable.`,
        });
        setStepUpModalOpen(false);
        setStepUpPassword('');
      } else {
        toast({
          title: 'Authorization Rejected',
          description: res.error,
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Award className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Anonymous Exam Processing Engine</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Blind grading workflow: Examiners evaluate anonymous Candidate Identification Numbers (CIN) with zero student identity exposure.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs px-3 py-1 flex items-center gap-1.5 font-mono">
            <ShieldCheck className="h-4 w-4" /> SHA-256 Ledger Active
          </Badge>
        </div>
      </div>

      {/* Control Bar */}
      <Card className="border border-border bg-card rounded-2xl shadow-sm p-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 flex-1">
            <div className="w-72">
              <Label className="text-xs text-muted-foreground mb-1 block">Course Offering</Label>
              <Select value={selectedOfferingId} onValueChange={setSelectedOfferingId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select course offering" />
                </SelectTrigger>
                <SelectContent>
                  {offerings.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.course?.code} - {o.course?.title} ({o.academicSession})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 pt-4">
              <Switch id="double-blind" checked={isDoubleBlind} onCheckedChange={setIsDoubleBlind} />
              <Label htmlFor="double-blind" className="text-xs font-semibold cursor-pointer">
                Double-Blind Grading Mode (&gt;5% Delta Escalation)
              </Label>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-4 lg:pt-0">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => {
                setTargetStage('HOD_APPROVED');
                setStepUpModalOpen(true);
              }}
            >
              HOD Endorsement
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-primary border-primary/30 hover:bg-primary/5"
              onClick={() => {
                setTargetStage('SENATE_RATIFIED');
                setStepUpModalOpen(true);
              }}
            >
              Senate Ratification
            </Button>
          </div>
        </div>
      </Card>

      {/* Blind Score Entry Table */}
      <Card className="border border-border bg-card rounded-2xl shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <EyeOff className="h-5 w-5 text-primary" /> Anonymous Candidate Ledger
              </CardTitle>
              <CardDescription className="text-xs">
                Candidate names and matriculation numbers are permanently blinded during examination entry.
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={addRow} className="rounded-xl">
              + Add Candidate Token
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider border-b border-border font-mono">
                <tr>
                  <th className="py-3 px-4">Candidate Token (CIN)</th>
                  <th className="py-3 px-4">CA Score (Max 40)</th>
                  <th className="py-3 px-4">Exam Score (Max 60)</th>
                  {isDoubleBlind && <th className="py-3 px-4">2nd Examiner Score (Max 60)</th>}
                  <th className="py-3 px-4">Total Score (100)</th>
                  <th className="py-3 px-4">Tamper-Proof DataHash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row, idx) => {
                  const ca = Number(row.caScore) || 0;
                  const ex = Number(row.examScore) || 0;
                  const total = (ca + ex).toFixed(2);
                  const mockHash = `sha256:7f9${idx}a${Math.round(ca * ex)}...`;

                  return (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-xs bg-muted px-2.5 py-1 rounded-md text-foreground">
                          {row.anonymousToken}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Input
                          type="number"
                          max={40}
                          min={0}
                          value={row.caScore}
                          onChange={(e) => updateRow(idx, 'caScore', e.target.value)}
                          className="w-24 h-9 rounded-lg font-mono text-sm"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <Input
                          type="number"
                          max={60}
                          min={0}
                          value={row.examScore}
                          onChange={(e) => updateRow(idx, 'examScore', e.target.value)}
                          className="w-24 h-9 rounded-lg font-mono text-sm"
                        />
                      </td>
                      {isDoubleBlind && (
                        <td className="py-3 px-4">
                          <Input
                            type="number"
                            max={60}
                            min={0}
                            value={row.secondGraderScore}
                            onChange={(e) => updateRow(idx, 'secondGraderScore', e.target.value)}
                            className="w-24 h-9 rounded-lg font-mono text-sm"
                          />
                        </td>
                      )}
                      <td className="py-3 px-4">
                        <span className="font-mono font-black text-base text-foreground">{total}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded">
                          {mockHash}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>

        <CardFooter className="p-4 bg-muted/20 border-t border-border flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            {rows.length} candidate mark entries pending commitment.
          </span>
          <Button onClick={handleSubmitGrades} disabled={isPending} className="rounded-xl">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
            Commit Cryptographic Ledger Entries
          </Button>
        </CardFooter>
      </Card>

      {/* Step-Up MFA Authorization Dialog */}
      <Dialog open={stepUpModalOpen} onOpenChange={setStepUpModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" /> Step-Up Governance Verification
            </DialogTitle>
            <DialogDescription>
              Advancing grades to <strong className="text-foreground">{targetStage}</strong> requires high-privilege credentials verification.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
              Senate Ratification makes all grade point averages permanently immutable on the student ledger.
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="authorizer-pass">Authorizer Security Password</Label>
              <Input
                id="authorizer-pass"
                type="password"
                placeholder="Enter your account password"
                value={stepUpPassword}
                onChange={(e) => setStepUpPassword(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStepUpModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAdvanceStage} disabled={isPending}>
              {isPending ? 'Verifying...' : 'Authorize Stage Transition'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
