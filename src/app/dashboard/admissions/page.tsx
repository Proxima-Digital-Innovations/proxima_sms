'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  Users,
  ShieldCheck,
  Award,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Building,
  Settings,
  RefreshCw,
  ArrowUpRight,
  UserCheck,
  ChevronRight,
  BookOpen,
  DollarSign,
  Landmark,
  Layers,
  Clock,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  getActiveCampaignAction,
  getProgramRankingsAction,
  updateDepartmentalCutOffAction,
  publishAdmissionBatchAction,
  recordPostUtmeScoreAction,
  matriculateApplicantAction,
  getJambCapsReconciliationData
} from '@/actions/admission-actions';

export default function AdmissionsDashboardPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<any>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [rankings, setRankings] = useState<any>(null);
  const [rankingsLoading, setRankingsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('quota-engine');

  // Cut-off mark edits
  const [cutOffForm, setCutOffForm] = useState({
    minJamb: 180,
    minComposite: 50.0,
    meritQuota: 50,
    catchmentQuota: 35,
    eldsQuota: 15,
  });

  // Post-UTME scoring state
  const [cbtScores, setCbtScores] = useState<Record<string, number>>({});
  const [savingScoreId, setSavingScoreId] = useState<string | null>(null);

  // Matriculating state
  const [matriculatingId, setMatriculatingId] = useState<string | null>(null);
  const [publishingBatch, setPublishingBatch] = useState(false);

  // Load campaign and initial data
  const loadCampaign = async () => {
    setLoading(true);
    const res = await getActiveCampaignAction();
    if (res.success && res.data) {
      setCampaign(res.data);
      if (res.data.cutOffs && res.data.cutOffs.length > 0) {
        const firstProgId = res.data.cutOffs[0].programId;
        setSelectedProgramId(firstProgId);
        loadRankings(res.data.id, firstProgId);
      }
    }
    setLoading(false);
  };

  const loadRankings = async (campaignId: string, programId: string) => {
    setRankingsLoading(true);
    const res = await getProgramRankingsAction(campaignId, programId);
    if (res.success && res.data) {
      setRankings(res.data);
      if (res.data.cutOff) {
        setCutOffForm({
          minJamb: res.data.cutOff.minJambScore,
          minComposite: Number(res.data.cutOff.minCompositeScore),
          meritQuota: res.data.cutOff.meritQuota,
          catchmentQuota: res.data.cutOff.catchmentQuota,
          eldsQuota: res.data.cutOff.eldsQuota,
        });
      }
    }
    setRankingsLoading(false);
  };

  useEffect(() => {
    loadCampaign();
  }, []);

  const handleProgramChange = (progId: string) => {
    setSelectedProgramId(progId);
    if (campaign?.id) {
      loadRankings(campaign.id, progId);
    }
  };

  // Save Cut-Off marks
  const handleSaveCutOff = async () => {
    if (!rankings?.cutOff?.id) return;
    try {
      const res = await updateDepartmentalCutOffAction(
        rankings.cutOff.id,
        cutOffForm.minJamb,
        cutOffForm.minComposite,
        cutOffForm.meritQuota,
        cutOffForm.catchmentQuota,
        cutOffForm.eldsQuota
      );
      if (!res.success) throw new Error(res.error);
      toast({
        title: 'Departmental Cut-Off Updated',
        description: 'New baseline criteria applied to live rankings.',
      });
      loadRankings(campaign.id, selectedProgramId);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  };

  // Save Post-UTME CBT score
  const handleSaveCbtScore = async (applicantId: string) => {
    const score = cbtScores[applicantId];
    if (score === undefined || score < 0 || score > 100) {
      toast({ variant: 'destructive', title: 'Invalid Score', description: 'Enter a valid CBT score (0 - 100).' });
      return;
    }
    setSavingScoreId(applicantId);
    try {
      const res = await recordPostUtmeScoreAction(applicantId, score);
      if (!res.success) throw new Error(res.error);
      toast({
        title: 'Post-UTME Score Recorded',
        description: `Score: ${score}% • Composite updated to ${res.data.compositeScore}%`,
      });
      loadRankings(campaign.id, selectedProgramId);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setSavingScoreId(null);
    }
  };

  // Publish Admission Batch
  const handlePublishBatch = async () => {
    if (!campaign?.id || !rankings) return;
    setPublishingBatch(true);
    try {
      const admissionsToPublish: {
        applicantId: string;
        programId: string;
        quota: 'MERIT' | 'CATCHMENT' | 'ELDS' | 'DISCRETIONARY';
      }[] = [];

      // Add from merit list
      rankings.meritList.forEach((a: any) => {
        if (a.status !== 'PROVISIONALLY_ADMITTED' && a.status !== 'OFFER_ACCEPTED' && a.status !== 'MATRICULATED') {
          admissionsToPublish.push({ applicantId: a.id, programId: selectedProgramId, quota: 'MERIT' });
        }
      });

      // Add from catchment list
      rankings.catchmentList.forEach((a: any) => {
        if (a.status !== 'PROVISIONALLY_ADMITTED' && a.status !== 'OFFER_ACCEPTED' && a.status !== 'MATRICULATED') {
          admissionsToPublish.push({ applicantId: a.id, programId: selectedProgramId, quota: 'CATCHMENT' });
        }
      });

      // Add from ELDS list
      rankings.eldsList.forEach((a: any) => {
        if (a.status !== 'PROVISIONALLY_ADMITTED' && a.status !== 'OFFER_ACCEPTED' && a.status !== 'MATRICULATED') {
          admissionsToPublish.push({ applicantId: a.id, programId: selectedProgramId, quota: 'ELDS' });
        }
      });

      if (admissionsToPublish.length === 0) {
        toast({
          title: 'All Eligible Candidates Already Admitted',
          description: 'No new unadmitted candidates qualify for this batch.',
        });
        setPublishingBatch(false);
        return;
      }

      const res = await publishAdmissionBatchAction(
        campaign.id,
        `Senate Batch (${new Date().toLocaleDateString()})`,
        (campaign.batches?.length || 0) + 1,
        admissionsToPublish
      );

      if (!res.success) throw new Error(res.error);

      toast({
        title: 'Batch Successfully Published!',
        description: `Dispatched ${res.data.offersCount} provisional offers with cryptographic codes.`,
      });
      loadRankings(campaign.id, selectedProgramId);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setPublishingBatch(false);
    }
  };

  // 1-Click Matriculate
  const handleMatriculate = async (applicantId: string) => {
    setMatriculatingId(applicantId);
    try {
      const res = await matriculateApplicantAction(applicantId);
      if (!res.success) throw new Error(res.error);
      toast({
        title: 'Candidate Successfully Matriculated!',
        description: `Generated Matric Number: ${res.data.matricNumber} & StudentProfile provisioned.`,
      });
      loadRankings(campaign.id, selectedProgramId);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Matriculation Error', description: err.message });
    } finally {
      setMatriculatingId(null);
    }
  };

  // Export JAMB CAPS CSV
  const handleExportJambCaps = () => {
    if (!rankings?.allApplicants) return;
    const headers = 'JAMB_REG_NO,CANDIDATE_NAME,GENDER,STATE,PROGRAM_CODE,JAMB_SCORE,POST_UTME,COMPOSITE,QUOTA,CAPS_STATUS\n';
    const rows = rankings.allApplicants.map((a: any) =>
      `"${a.jambRegNumber}","${a.firstName} ${a.lastName}","${a.gender}","${a.stateOfOrigin}","${a.firstChoice?.code}",${a.jambScore},${a.postUtmeScore || ''},${a.compositeScore || ''},"${a.quotaCategory || ''}","${a.jambCapsStatus || ''}"`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `JAMB_CAPS_EXPORT_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast({ title: 'Export Generated', description: 'JAMB CAPS CSV specification exported successfully.' });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Masthead */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                  Admissions &amp; Post-UTME Control Hub
                </h1>
                <Badge variant="outline" className="border-indigo-500/40 text-indigo-400 font-mono text-[10px]">
                  NUC CCMAS 5.0
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Centralized Admissions Committee, Quota Balancer &amp; JAMB CAPS Clearinghouse
              </p>
            </div>
          </div>
        </div>

        {/* Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/admissions/apply" target="_blank">
            <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 border-border">
              <span>Public Apply Portal</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
          <Link href="/admissions/status" target="_blank">
            <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 border-border">
              <span>Candidate Status Desk</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={handleExportJambCaps}
            className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export JAMB CAPS</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <Card className="bg-card/60 border-border/60">
          <CardContent className="p-4 space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total Applicants</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-foreground">
                {rankings?.totalApplicants ?? 6}
              </span>
              <span className="text-[10px] text-muted-foreground">Registered</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 border-border/60">
          <CardContent className="p-4 space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Screened / Post-UTME</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-indigo-400">
                {rankings?.allApplicants?.filter((a: any) => a.postUtmeScore !== null).length ?? 5}
              </span>
              <span className="text-[10px] text-muted-foreground">Scored</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 border-border/60">
          <CardContent className="p-4 space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Provisional Offers</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-400">
                {rankings?.allApplicants?.filter((a: any) => a.status.includes('ADMITTED') || a.status.includes('ACCEPTED')).length ?? 3}
              </span>
              <span className="text-[10px] text-muted-foreground">Released</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 border-border/60">
          <CardContent className="p-4 space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Offers Accepted</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-teal-400">
                {rankings?.allApplicants?.filter((a: any) => a.status === 'OFFER_ACCEPTED' || a.status === 'MATRICULATED').length ?? 1}
              </span>
              <span className="text-[10px] text-muted-foreground">Cleared</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 border-border/60 col-span-2 lg:col-span-1">
          <CardContent className="p-4 space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Acceptance Revenue</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-emerald-400 font-mono">
                ₦50,000
              </span>
              <span className="text-[10px] text-muted-foreground">Posted</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Control Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        
        {/* Tab Header & Department Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/30 p-2 rounded-2xl border border-border/60">
          <div className="w-full sm:w-auto overflow-x-auto scrollbar-none">
            <TabsList className="bg-background/80 border border-border/60 inline-flex w-max">
            <TabsTrigger value="quota-engine" className="text-xs font-bold gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
              <span>Quota &amp; Ranking Engine</span>
            </TabsTrigger>
            <TabsTrigger value="scoring-desk" className="text-xs font-bold gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Post-UTME Scoring Desk</span>
            </TabsTrigger>
            <TabsTrigger value="caps-desk" className="text-xs font-bold gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>JAMB CAPS Reconciliation</span>
            </TabsTrigger>
            <TabsTrigger value="matriculation" className="text-xs font-bold gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>1-Click Matriculation</span>
            </TabsTrigger>
          </TabsList>
          </div>

          {/* Department Picker */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-muted-foreground whitespace-nowrap hidden md:inline">
              Department:
            </span>
            <Select value={selectedProgramId} onValueChange={handleProgramChange}>
              <SelectTrigger className="h-9 text-xs w-full sm:w-64 bg-background border-border">
                <SelectValue placeholder="Select Academic Program" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {campaign?.cutOffs?.map((c: any) => (
                  <SelectItem key={c.programId} value={c.programId}>
                    {c.program.name} ({c.program.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: SENATE QUOTA & RANKING ENGINE                           */}
        {/* ============================================================== */}
        <TabsContent value="quota-engine" className="space-y-5">
          
          {/* Departmental Cut-off Card */}
          <Card className="border-border/60 bg-card/60">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">
                    Senate Departmental Cut-Off &amp; Statutory Quota Policy
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Configure minimum JAMB score, composite threshold, and Federal Character quota weights.
                  </CardDescription>
                </div>
                <Button size="sm" onClick={handleSaveCutOff} className="h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-500">
                  Save Cut-Off Criteria
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Min JAMB Score</Label>
                  <Input
                    type="number"
                    value={cutOffForm.minJamb}
                    onChange={(e) => setCutOffForm({ ...cutOffForm, minJamb: Number(e.target.value) })}
                    className="h-8 text-xs bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Min Composite (%)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={cutOffForm.minComposite}
                    onChange={(e) => setCutOffForm({ ...cutOffForm, minComposite: Number(e.target.value) })}
                    className="h-8 text-xs bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">National Merit Quota (45%)</Label>
                  <Input
                    type="number"
                    value={cutOffForm.meritQuota}
                    onChange={(e) => setCutOffForm({ ...cutOffForm, meritQuota: Number(e.target.value) })}
                    className="h-8 text-xs bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Catchment Quota (35%)</Label>
                  <Input
                    type="number"
                    value={cutOffForm.catchmentQuota}
                    onChange={(e) => setCutOffForm({ ...cutOffForm, catchmentQuota: Number(e.target.value) })}
                    className="h-8 text-xs bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">ELDS Quota (20%)</Label>
                  <Input
                    type="number"
                    value={cutOffForm.eldsQuota}
                    onChange={(e) => setCutOffForm({ ...cutOffForm, eldsQuota: Number(e.target.value) })}
                    className="h-8 text-xs bg-background"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Bar for Batch Publishing */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30">
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-indigo-300">
                Live Senate Quota Allocations Ready for Endorsement
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Candidates ranked above cut-off in Merit, Catchment, and ELDS bands can be provisionally admitted in one click.
              </p>
            </div>
            <Button
              onClick={handlePublishBatch}
              disabled={publishingBatch}
              className="h-9 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{publishingBatch ? 'Publishing Batch...' : 'Publish Batch 1 Provisional Offers'}</span>
            </Button>
          </div>

          {/* 3 Quota Breakdown Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* List 1: National Merit */}
            <Card className="border-indigo-500/30 bg-card/60">
              <CardHeader className="p-3.5 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-400 uppercase tracking-wider">
                    1. National Merit (45%)
                  </span>
                  <Badge className="bg-indigo-500/20 text-indigo-300 text-[10px]">
                    {rankings?.meritList?.length ?? 0} Qualified
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                {rankings?.meritList?.map((a: any) => (
                  <div key={a.id} className="p-2.5 rounded-lg bg-background/60 border border-border/60 space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-foreground truncate">{a.firstName} {a.lastName}</span>
                      <span className="text-indigo-400 font-mono">{a.compositeScore}%</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                      <span>JAMB: {a.jambScore} | O'L: {a.oLevelAggregate}p</span>
                      <Badge variant="outline" className="text-[9px] py-0 px-1">{a.stateOfOrigin}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* List 2: Catchment Area */}
            <Card className="border-emerald-500/30 bg-card/60">
              <CardHeader className="p-3.5 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                    2. Catchment Area (35%)
                  </span>
                  <Badge className="bg-emerald-500/20 text-emerald-300 text-[10px]">
                    {rankings?.catchmentList?.length ?? 0} Qualified
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                {rankings?.catchmentList?.map((a: any) => (
                  <div key={a.id} className="p-2.5 rounded-lg bg-background/60 border border-border/60 space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-foreground truncate">{a.firstName} {a.lastName}</span>
                      <span className="text-emerald-400 font-mono">{a.compositeScore}%</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                      <span>JAMB: {a.jambScore} | O'L: {a.oLevelAggregate}p</span>
                      <Badge variant="outline" className="text-[9px] py-0 px-1 border-emerald-500/30 text-emerald-300">
                        {a.stateOfOrigin}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* List 3: ELDS */}
            <Card className="border-amber-500/30 bg-card/60">
              <CardHeader className="p-3.5 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                    3. ELDS Quota (20%)
                  </span>
                  <Badge className="bg-amber-500/20 text-amber-300 text-[10px]">
                    {rankings?.eldsList?.length ?? 0} Qualified
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                {rankings?.eldsList?.map((a: any) => (
                  <div key={a.id} className="p-2.5 rounded-lg bg-background/60 border border-border/60 space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-foreground truncate">{a.firstName} {a.lastName}</span>
                      <span className="text-amber-400 font-mono">{a.compositeScore}%</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                      <span>JAMB: {a.jambScore} | O'L: {a.oLevelAggregate}p</span>
                      <Badge variant="outline" className="text-[9px] py-0 px-1 border-amber-500/30 text-amber-300">
                        {a.stateOfOrigin}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

          </div>

        </TabsContent>

        {/* ============================================================== */}
        {/* TAB 2: POST-UTME CBT & SCORING DESK                            */}
        {/* ============================================================== */}
        <TabsContent value="scoring-desk" className="space-y-4">
          <Card className="border-border/60 bg-card/60">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-bold text-foreground">
                Post-UTME Examination Grading &amp; Score Recalibration
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Enter or moderate CBT test scores (out of 100). The composite aggregate recomputes instantly.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-xs text-left">
                  <thead className="bg-muted/40 text-muted-foreground border-b border-border/60 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">JAMB Reg No</th>
                      <th className="p-3">Candidate</th>
                      <th className="p-3">Entry Mode</th>
                      <th className="p-3">JAMB Score</th>
                      <th className="p-3">O'Level Pts</th>
                      <th className="p-3 w-40">Post-UTME CBT (%)</th>
                      <th className="p-3">Composite</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {rankings?.allApplicants?.map((a: any) => (
                      <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3 font-mono font-bold text-foreground">{a.jambRegNumber}</td>
                        <td className="p-3 font-medium text-foreground">{a.firstName} {a.lastName}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5">{a.mode}</Badge>
                        </td>
                        <td className="p-3 font-mono">{a.jambScore} / 400</td>
                        <td className="p-3 font-mono text-emerald-400 font-bold">{a.oLevelAggregate} pts</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              placeholder={a.postUtmeScore?.toString() || 'Score'}
                              value={cbtScores[a.id] !== undefined ? cbtScores[a.id] : (a.postUtmeScore ?? '')}
                              onChange={(e) => setCbtScores({ ...cbtScores, [a.id]: Number(e.target.value) })}
                              className="h-8 w-20 text-right font-mono text-xs bg-background"
                            />
                            <span className="text-[11px] text-muted-foreground">%</span>
                          </div>
                        </td>
                        <td className="p-3 font-mono font-bold text-indigo-400">
                          {a.compositeScore ? `${a.compositeScore}%` : '-'}
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleSaveCbtScore(a.id)}
                            disabled={savingScoreId === a.id}
                            className="h-7 text-[11px] px-2.5 font-bold"
                          >
                            {savingScoreId === a.id ? 'Saving...' : 'Update Score'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================== */}
        {/* TAB 3: JAMB CAPS RECONCILIATION DESK                           */}
        {/* ============================================================== */}
        <TabsContent value="caps-desk" className="space-y-4">
          <Card className="border-border/60 bg-card/60">
            <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-foreground">
                  JAMB Central Admissions Processing System (CAPS) Tracker
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Synchronize institutional recommendations with national JAMB matriculation lists.
                </CardDescription>
              </div>
              <Button size="sm" onClick={handleExportJambCaps} className="h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-500">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Download CAPS Format</span>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-xs text-left">
                  <thead className="bg-muted/40 text-muted-foreground border-b border-border/60 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">JAMB Reg No</th>
                      <th className="p-3">Candidate</th>
                      <th className="p-3">Program Recommended</th>
                      <th className="p-3">Statutory Quota</th>
                      <th className="p-3">CAPS Status</th>
                      <th className="p-3">Admission Letter Seal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {rankings?.allApplicants?.map((a: any) => (
                      <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3 font-mono font-bold text-foreground">{a.jambRegNumber}</td>
                        <td className="p-3 font-medium text-foreground">{a.firstName} {a.lastName}</td>
                        <td className="p-3">{a.admittedProgram?.name || a.firstChoice?.name}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5">{a.quotaCategory || 'PENDING'}</Badge>
                        </td>
                        <td className="p-3">
                          <Badge
                            className={`text-[10px] ${
                              a.jambCapsStatus === 'ACCEPTED_BY_CANDIDATE'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : a.jambCapsStatus === 'RECOMMENDED_TO_JAMB'
                                ? 'bg-indigo-500/20 text-indigo-300'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {a.jambCapsStatus || 'PENDING'}
                          </Badge>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-muted-foreground">
                          {a.offerLetter?.provisionalLetterCode || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================== */}
        {/* TAB 4: 1-CLICK MATRICULATION DESK                             */}
        {/* ============================================================== */}
        <TabsContent value="matriculation" className="space-y-4">
          <Card className="border-border/60 bg-card/60">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-bold text-foreground">
                Matriculation Roster &amp; Student Profile Provisioning
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Candidates who have accepted provisional admission and settled acceptance fees can be matriculated with official matric numbers.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-xs text-left">
                  <thead className="bg-muted/40 text-muted-foreground border-b border-border/60 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Candidate</th>
                      <th className="p-3">JAMB Reg No</th>
                      <th className="p-3">Admitted Degree</th>
                      <th className="p-3">Acceptance Fee</th>
                      <th className="p-3">Assigned Matric No</th>
                      <th className="p-3 text-right">Matriculation Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {rankings?.allApplicants
                      ?.filter((a: any) => a.status === 'OFFER_ACCEPTED' || a.status === 'MATRICULATED' || a.status === 'PROVISIONALLY_ADMITTED')
                      .map((a: any) => (
                        <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-3 font-medium text-foreground">{a.firstName} {a.lastName}</td>
                          <td className="p-3 font-mono text-muted-foreground">{a.jambRegNumber}</td>
                          <td className="p-3">{a.admittedProgram?.name || a.firstChoice?.name}</td>
                          <td className="p-3">
                            <Badge className={a.acceptanceFeePaid ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}>
                              {a.acceptanceFeePaid ? 'PAID • ₦50,000' : 'Awaiting Payment'}
                            </Badge>
                          </td>
                          <td className="p-3 font-mono font-bold text-indigo-400">
                            {a.offerLetter?.matricNumberAssigned || (a.status === 'MATRICULATED' ? 'PROVISIONED' : 'Pending')}
                          </td>
                          <td className="p-3 text-right">
                            {a.status === 'MATRICULATED' ? (
                              <Badge className="bg-teal-500/20 text-teal-300">Active Student</Badge>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleMatriculate(a.id)}
                                disabled={matriculatingId === a.id}
                                className="h-7 text-[11px] font-bold bg-teal-600 hover:bg-teal-500 text-white gap-1"
                              >
                                {matriculatingId === a.id ? 'Provisioning...' : 'Matriculate Student'}
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
