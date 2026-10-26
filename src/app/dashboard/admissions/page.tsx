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
  ArrowRight,
  UploadCloud,
  CheckCheck,
  Send,
  HelpCircle,
  AlertTriangle,
  FileText,
  BadgeCheck
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
  getJambCapsReconciliationData,
  updateApplicantCapsStatusAction,
  bulkUpdateCapsStatusAction,
  reconcileWithJambCapsAction,
  applyCapsReconciliationAction,
  getApprovalTrackingPipelineAction
} from '@/actions/admission-actions';

export default function AdmissionsDashboardPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<any>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [rankings, setRankings] = useState<any>(null);
  const [rankingsLoading, setRankingsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('quota-engine');

  // Approval Pipeline State
  const [pipelineData, setPipelineData] = useState<any>(null);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [pipelineSearch, setPipelineSearch] = useState<string>('');
  const [updatingCapsId, setUpdatingCapsId] = useState<string | null>(null);

  // CAPS Reconciliation State
  const [reconciliationResult, setReconciliationResult] = useState<any>(null);
  const [reconciling, setReconciling] = useState(false);
  const [applyingReconciliation, setApplyingReconciliation] = useState(false);

  // Cut-off mark edits
  const [cutOffForm, setCutOffForm] = useState({
    minJamb: 180,
    minComposite: 50.0,
    meritQuota: 45,
    catchmentQuota: 35,
    eldsQuota: 20,
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
      loadPipeline(res.data.id);
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

  const loadPipeline = async (campaignId: string) => {
    setPipelineLoading(true);
    const res = await getApprovalTrackingPipelineAction(campaignId);
    if (res.success && res.data) {
      setPipelineData(res.data);
    }
    setPipelineLoading(false);
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
      if (res.success) {
        toast({
          title: 'Departmental Cut-Off Updated',
          description: 'Rankings and statutory quotas have been recomputed.',
        });
        if (campaign?.id && selectedProgramId) {
          loadRankings(campaign.id, selectedProgramId);
          loadPipeline(campaign.id);
        }
      } else {
        toast({ title: 'Update Failed', description: res.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update cut-off policy', variant: 'destructive' });
    }
  };

  // 1-Click Batch Publishing
  const handlePublishBatch = async () => {
    if (!campaign?.id || !rankings || !selectedProgramId) return;

    const admissionsToPublish: { applicantId: string; programId: string; quota: 'MERIT' | 'CATCHMENT' | 'ELDS' | 'DISCRETIONARY' }[] = [];

    rankings.meritList?.forEach((a: any) => {
      if (a.status !== 'PROVISIONALLY_ADMITTED' && a.status !== 'OFFER_ACCEPTED' && a.status !== 'MATRICULATED') {
        admissionsToPublish.push({ applicantId: a.id, programId: selectedProgramId, quota: 'MERIT' });
      }
    });

    rankings.catchmentList?.forEach((a: any) => {
      if (a.status !== 'PROVISIONALLY_ADMITTED' && a.status !== 'OFFER_ACCEPTED' && a.status !== 'MATRICULATED') {
        admissionsToPublish.push({ applicantId: a.id, programId: selectedProgramId, quota: 'CATCHMENT' });
      }
    });

    rankings.eldsList?.forEach((a: any) => {
      if (a.status !== 'PROVISIONALLY_ADMITTED' && a.status !== 'OFFER_ACCEPTED' && a.status !== 'MATRICULATED') {
        admissionsToPublish.push({ applicantId: a.id, programId: selectedProgramId, quota: 'ELDS' });
      }
    });

    if (admissionsToPublish.length === 0) {
      toast({
        title: 'No Pending Candidates',
        description: 'All qualified candidates in this program have already been provisionally admitted.',
      });
      return;
    }

    setPublishingBatch(true);
    try {
      const batchNumber = (campaign.batches?.length || 0) + 1;
      const batchName = `Batch ${batchNumber} - ${rankings.cutOff?.program?.code || 'Admissions'}`;
      const res = await publishAdmissionBatchAction(campaign.id, batchName, batchNumber, admissionsToPublish);

      if (res.success) {
        toast({
          title: 'Batch Published Successfully!',
          description: `Generated ${res.data.offersCount} official provisional letters with cryptographic seal.`,
        });
        loadRankings(campaign.id, selectedProgramId);
        loadPipeline(campaign.id);
      } else {
        toast({ title: 'Batch Publication Failed', description: res.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Could not publish admission batch.', variant: 'destructive' });
    } finally {
      setPublishingBatch(false);
    }
  };

  // Save individual Post-UTME score
  const handleSaveScore = async (applicantId: string) => {
    const score = cbtScores[applicantId];
    if (score === undefined || score < 0 || score > 100) {
      toast({ title: 'Invalid Score', description: 'Post-UTME score must be between 0 and 100.', variant: 'destructive' });
      return;
    }
    setSavingScoreId(applicantId);
    try {
      const res = await recordPostUtmeScoreAction(applicantId, score);
      if (res.success) {
        toast({ title: 'Score Recorded', description: 'Composite aggregate has been recomputed automatically.' });
        if (campaign?.id && selectedProgramId) {
          loadRankings(campaign.id, selectedProgramId);
          loadPipeline(campaign.id);
        }
      } else {
        toast({ title: 'Save Failed', description: res.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to record CBT score', variant: 'destructive' });
    } finally {
      setSavingScoreId(null);
    }
  };

  // Advance CAPS Status
  const handleUpdateApplicantCaps = async (
    applicantId: string,
    newStatus: 'PROPOSED' | 'RECOMMENDED_TO_JAMB' | 'APPROVED_BY_JAMB' | 'ACCEPTED_BY_CANDIDATE' | 'REJECTED_ON_CAPS'
  ) => {
    setUpdatingCapsId(applicantId);
    try {
      const res = await updateApplicantCapsStatusAction(applicantId, newStatus);
      if (res.success) {
        toast({
          title: 'CAPS Status Updated',
          description: `Candidate transitioned to ${newStatus.replace(/_/g, ' ')}.`,
        });
        if (campaign?.id) {
          loadPipeline(campaign.id);
          if (selectedProgramId) loadRankings(campaign.id, selectedProgramId);
        }
      } else {
        toast({ title: 'Update Failed', description: res.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update CAPS status', variant: 'destructive' });
    } finally {
      setUpdatingCapsId(null);
    }
  };

  // Run Mock/Live CAPS Reconciliation Sync
  const handleRunCapsSync = async () => {
    if (!campaign?.id) return;
    setReconciling(true);
    try {
      const reconcData = await getJambCapsReconciliationData(campaign.id);
      if (!reconcData.success || !reconcData.data) {
        toast({ title: 'Reconciliation Error', description: reconcData.error, variant: 'destructive' });
        setReconciling(false);
        return;
      }

      // Generate incoming CAPS rows from candidate pool to simulate sync with JAMB CAPS National Server
      const simulatedCapsFeed = reconcData.data.map((a: any, idx: number) => {
        let capsStatus = a.jambCapsStatus || 'RECOMMENDED_TO_JAMB';
        // Simulate a few approvals and candidate acceptances from CAPS
        if (idx % 3 === 0 && capsStatus === 'RECOMMENDED_TO_JAMB') {
          capsStatus = 'APPROVED_BY_JAMB';
        } else if (idx % 4 === 0 && (capsStatus === 'APPROVED_BY_JAMB' || capsStatus === 'RECOMMENDED_TO_JAMB')) {
          capsStatus = 'ACCEPTED_BY_CANDIDATE';
        }
        return {
          jambRegNumber: a.jambRegNumber,
          candidateName: `${a.firstName} ${a.lastName}`,
          jambStatus: capsStatus,
          programOffered: a.admittedProgram?.name || a.firstChoice?.name,
          jambScore: a.jambScore,
        };
      });

      const res = await reconcileWithJambCapsAction(campaign.id, simulatedCapsFeed);
      if (res.success && res.data) {
        setReconciliationResult(res.data);
        toast({
          title: 'CAPS Reconciliation Synchronized',
          description: `Matched ${res.data.matched.length} candidates. ${res.data.matched.filter((m: any) => m.hasDiscrepancy).length} status discrepancies found.`,
        });
      } else {
        toast({ title: 'Reconciliation Failed', description: res.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to execute JAMB CAPS reconciliation', variant: 'destructive' });
    } finally {
      setReconciling(false);
    }
  };

  // Apply Batch Reconciliation Updates
  const handleApplyReconciliation = async () => {
    if (!reconciliationResult || !reconciliationResult.matched) return;
    const discrepancies = reconciliationResult.matched.filter((m: any) => m.hasDiscrepancy);
    if (discrepancies.length === 0) {
      toast({ title: 'No Discrepancies', description: 'All records are already 100% in sync with CAPS.' });
      return;
    }

    setApplyingReconciliation(true);
    try {
      const updates = discrepancies.map((d: any) => ({
        applicantId: d.applicantId,
        status: d.incomingCapsStatus,
      }));

      const res = await applyCapsReconciliationAction(updates);
      if (res.success) {
        toast({
          title: 'Reconciliation Applied',
          description: `Successfully updated ${updates.length} candidate statuses in atomic transaction.`,
        });
        setReconciliationResult(null);
        if (campaign?.id) {
          loadPipeline(campaign.id);
          if (selectedProgramId) loadRankings(campaign.id, selectedProgramId);
        }
      } else {
        toast({ title: 'Application Failed', description: res.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to apply reconciliation updates', variant: 'destructive' });
    } finally {
      setApplyingReconciliation(false);
    }
  };

  // 1-Click Matriculate
  const handleMatriculate = async (applicantId: string) => {
    setMatriculatingId(applicantId);
    try {
      const res = await matriculateApplicantAction(applicantId);
      if (res.success) {
        toast({
          title: 'Student Matriculated!',
          description: `Assigned Matric Number: ${res.data.matricNumber}. Portal user created.`,
        });
        if (campaign?.id && selectedProgramId) {
          loadRankings(campaign.id, selectedProgramId);
          loadPipeline(campaign.id);
        }
      } else {
        toast({ title: 'Matriculation Failed', description: res.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to matriculate candidate', variant: 'destructive' });
    } finally {
      setMatriculatingId(null);
    }
  };

  // Download official JAMB CAPS format CSV
  const handleExportJambCaps = async () => {
    if (!campaign?.id) return;
    const res = await getJambCapsReconciliationData(campaign.id);
    if (!res.success || !res.data) {
      toast({ title: 'Export Failed', description: 'Could not fetch applicant records for CAPS export.', variant: 'destructive' });
      return;
    }

    const headers = [
      'JAMB_REG_NUMBER',
      'CANDIDATE_NAME',
      'MODE_OF_ENTRY',
      'FIRST_CHOICE_PROGRAM',
      'OFFERED_PROGRAM',
      'UTME_SCORE',
      'POST_UTME_SCORE',
      'OLEVEL_POINTS',
      'COMPOSITE_AGGREGATE',
      'STATUTORY_QUOTA',
      'INSTITUTION_STATUS',
      'CAPS_STATUS',
      'OFFER_LETTER_CODE'
    ];

    const rows = res.data.map((a: any) => [
      a.jambRegNumber,
      `"${a.firstName} ${a.lastName}"`,
      a.mode,
      `"${a.firstChoice?.name || ''}"`,
      `"${a.admittedProgram?.name || a.firstChoice?.name || ''}"`,
      a.jambScore,
      a.postUtmeScore ?? 'N/A',
      a.oLevelAggregate,
      a.compositeScore,
      a.quotaCategory || 'PENDING',
      a.status,
      a.jambCapsStatus || 'PROPOSED',
      a.offerLetter?.provisionalLetterCode || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e: any[]) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `JAMB_CAPS_RECONCILIATION_${campaign.academicSession?.name.replace(/\//g, '_') || 'SESSION'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'CAPS Format Exported', description: 'CSV file ready for submission to JAMB CAPS portal.' });
  };

  // Filtered applicants for approval pipeline
  const filteredPipelineApplicants = (pipelineData?.applicants || []).filter((a: any) => {
    const matchesStage = stageFilter === 'ALL' || a.jambCapsStatus === stageFilter || (stageFilter === 'MATRICULATED' && a.status === 'MATRICULATED');
    const matchesSearch =
      !pipelineSearch ||
      a.jambRegNumber.toLowerCase().includes(pipelineSearch.toLowerCase()) ||
      a.firstName.toLowerCase().includes(pipelineSearch.toLowerCase()) ||
      a.lastName.toLowerCase().includes(pipelineSearch.toLowerCase());
    return matchesStage && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              <GraduationCap className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                University Admissions &amp; JAMB CAPS
              </h1>
              <p className="text-xs text-muted-foreground">
                Unified Admission Management, Merit Engine, JAMB CAPS Workflow &amp; Candidate Verification
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Tools */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadCampaign}
            disabled={loading}
            className="h-9 text-xs font-semibold gap-1.5 border-border"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Live Records</span>
          </Button>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 text-xs font-semibold gap-1.5 border-indigo-500/30 text-indigo-400 hover:text-indigo-300 bg-indigo-500/5 hover:bg-indigo-500/10"
          >
            <Link href="/admissions/status" target="_blank">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Candidate Portal</span>
            </Link>
          </Button>

          <Button
            size="sm"
            onClick={handleExportJambCaps}
            className="h-9 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Download CAPS CSV</span>
          </Button>
        </div>
      </div>

      {/* Campaign Overview Banner */}
      {campaign && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="border-border/60 bg-card/60">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                <Building className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block truncate">Campaign Session</span>
                <span className="text-xs font-extrabold text-foreground truncate block">
                  {campaign.academicSession?.name || '2025/2026'}
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold">{campaign.screeningMethod.replace(/_/g, ' ')}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block truncate">Total Applicants</span>
                <span className="text-sm font-extrabold text-foreground block">
                  {pipelineData?.stats?.totalApplied || rankings?.totalApplicants || 0}
                </span>
                <span className="text-[10px] text-blue-400 font-semibold">Processed Pool</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
                <Send className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block truncate">JAMB Recommended</span>
                <span className="text-sm font-extrabold text-amber-400 block">
                  {pipelineData?.stats?.recommendedCount || 0}
                </span>
                <span className="text-[10px] text-muted-foreground">On CAPS Queue</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block truncate">JAMB Approved</span>
                <span className="text-sm font-extrabold text-emerald-400 block">
                  {pipelineData?.stats?.jambApprovedCount || 0}
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold">National Cleared</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 col-span-2 md:col-span-1">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400 shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block truncate">Matriculated</span>
                <span className="text-sm font-extrabold text-teal-400 block">
                  {pipelineData?.stats?.matriculatedCount || 0}
                </span>
                <span className="text-[10px] text-teal-400 font-semibold">Full Students</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Control Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        {/* Tab Navigation & Department Picker */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/30 p-2 rounded-2xl border border-border/60">
          <div className="w-full sm:w-auto overflow-x-auto scrollbar-none">
            <TabsList className="bg-background/80 border border-border/60 inline-flex w-max">
              <TabsTrigger value="quota-engine" className="text-xs font-bold gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                <span>Merit &amp; Quota Engine</span>
              </TabsTrigger>
              <TabsTrigger value="approval-tracking" className="text-xs font-bold gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Approval Tracking</span>
              </TabsTrigger>
              <TabsTrigger value="caps-desk" className="text-xs font-bold gap-1.5">
                <Send className="w-3.5 h-3.5 text-emerald-400" />
                <span>JAMB CAPS Integration</span>
              </TabsTrigger>
              <TabsTrigger value="scoring-desk" className="text-xs font-bold gap-1.5">
                <Award className="w-3.5 h-3.5 text-blue-400" />
                <span>Post-UTME Scoring</span>
              </TabsTrigger>
              <TabsTrigger value="matriculation" className="text-xs font-bold gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-teal-400" />
                <span>1-Click Matriculation</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Department Picker for Tab 1 & Tab 4 */}
          {(activeTab === 'quota-engine' || activeTab === 'scoring-desk') && (
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
          )}
        </div>

        {/* ============================================================== */}
        {/* TAB 1: SENATE QUOTA & MERIT ENGINE                             */}
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
                    Configure minimum JAMB score, composite threshold, and Federal Character quota weights (Merit 45%, Catchment 35%, ELDS 20%).
                  </CardDescription>
                </div>
                <Button size="sm" onClick={handleSaveCutOff} className="h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-500">
                  Save Cut-Off Policy
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground uppercase font-bold">Min UTME Score</Label>
                  <Input
                    type="number"
                    value={cutOffForm.minJamb}
                    onChange={(e) => setCutOffForm({ ...cutOffForm, minJamb: parseInt(e.target.value) || 0 })}
                    className="h-8 text-xs bg-background border-border font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground uppercase font-bold">Min Composite (%)</Label>
                  <Input
                    type="number"
                    value={cutOffForm.minComposite}
                    onChange={(e) => setCutOffForm({ ...cutOffForm, minComposite: parseFloat(e.target.value) || 0 })}
                    className="h-8 text-xs bg-background border-border font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground uppercase font-bold">Merit Quota (45%)</Label>
                  <Input
                    type="number"
                    value={cutOffForm.meritQuota}
                    onChange={(e) => setCutOffForm({ ...cutOffForm, meritQuota: parseInt(e.target.value) || 0 })}
                    className="h-8 text-xs bg-background border-border font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground uppercase font-bold">Catchment (35%)</Label>
                  <Input
                    type="number"
                    value={cutOffForm.catchmentQuota}
                    onChange={(e) => setCutOffForm({ ...cutOffForm, catchmentQuota: parseInt(e.target.value) || 0 })}
                    className="h-8 text-xs bg-background border-border font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground uppercase font-bold">ELDS Quota (20%)</Label>
                  <Input
                    type="number"
                    value={cutOffForm.eldsQuota}
                    onChange={(e) => setCutOffForm({ ...cutOffForm, eldsQuota: parseInt(e.target.value) || 0 })}
                    className="h-8 text-xs bg-background border-border font-mono font-bold"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Qualified Candidates & Batch Publishing */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Ranked Candidates for {rankings?.cutOff?.program?.name || 'Selected Program'}
              </h3>
              <p className="text-xs text-muted-foreground">
                Total Pool: {rankings?.totalApplicants || 0} candidates &bull; Qualified: {rankings?.qualifiedCount || 0} candidates
              </p>
            </div>
            <Button
              size="sm"
              onClick={handlePublishBatch}
              disabled={publishingBatch || !rankings?.qualifiedCount}
              className="h-9 text-xs font-bold gap-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-md"
            >
              <Award className="w-3.5 h-3.5" />
              <span>{publishingBatch ? 'Publishing Batch...' : 'Publish Admission Batch (1-Click)'}</span>
            </Button>
          </div>

          {/* Statutory Quotas Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* MERIT LIST */}
            <Card className="border-border/60 bg-card/60">
              <CardHeader className="p-3.5 border-b border-border/60 bg-indigo-500/5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5" />
                    <span>Merit List (Top 45%)</span>
                  </CardTitle>
                  <Badge className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                    {rankings?.meritList?.length || 0} Candidates
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-border/60 max-h-80 overflow-y-auto">
                {rankings?.meritList?.length === 0 ? (
                  <p className="p-4 text-xs text-muted-foreground text-center">No qualified merit candidates.</p>
                ) : (
                  rankings?.meritList?.map((a: any, idx: number) => (
                    <div key={a.id} className="p-3 text-xs flex items-center justify-between hover:bg-muted/30">
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-foreground">
                          <span className="text-[10px] font-mono text-muted-foreground">#{idx + 1}</span>
                          <span>{a.firstName} {a.lastName}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">{a.jambRegNumber} &bull; {a.stateOfOrigin}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-indigo-400 block">{a.compositeScore}%</span>
                        <span className="text-[10px] text-muted-foreground font-mono">UTME: {a.jambScore}</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* CATCHMENT LIST */}
            <Card className="border-border/60 bg-card/60">
              <CardHeader className="p-3.5 border-b border-border/60 bg-blue-500/5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-extrabold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5" />
                    <span>Catchment List (35%)</span>
                  </CardTitle>
                  <Badge className="bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                    {rankings?.catchmentList?.length || 0} Candidates
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-border/60 max-h-80 overflow-y-auto">
                {rankings?.catchmentList?.length === 0 ? (
                  <p className="p-4 text-xs text-muted-foreground text-center">No qualified catchment candidates.</p>
                ) : (
                  rankings?.catchmentList?.map((a: any, idx: number) => (
                    <div key={a.id} className="p-3 text-xs flex items-center justify-between hover:bg-muted/30">
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-foreground">
                          <span className="text-[10px] font-mono text-muted-foreground">#{idx + 1}</span>
                          <span>{a.firstName} {a.lastName}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">{a.jambRegNumber} &bull; {a.stateOfOrigin}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-blue-400 block">{a.compositeScore}%</span>
                        <span className="text-[10px] text-muted-foreground font-mono">UTME: {a.jambScore}</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* ELDS LIST */}
            <Card className="border-border/60 bg-card/60">
              <CardHeader className="p-3.5 border-b border-border/60 bg-amber-500/5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>ELDS List (20%)</span>
                  </CardTitle>
                  <Badge className="bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                    {rankings?.eldsList?.length || 0} Candidates
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-border/60 max-h-80 overflow-y-auto">
                {rankings?.eldsList?.length === 0 ? (
                  <p className="p-4 text-xs text-muted-foreground text-center">No qualified ELDS candidates.</p>
                ) : (
                  rankings?.eldsList?.map((a: any, idx: number) => (
                    <div key={a.id} className="p-3 text-xs flex items-center justify-between hover:bg-muted/30">
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-foreground">
                          <span className="text-[10px] font-mono text-muted-foreground">#{idx + 1}</span>
                          <span>{a.firstName} {a.lastName}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">{a.jambRegNumber} &bull; {a.stateOfOrigin}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-amber-400 block">{a.compositeScore}%</span>
                        <span className="text-[10px] text-muted-foreground font-mono">UTME: {a.jambScore}</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============================================================== */}
        {/* TAB 2: APPROVAL TRACKING PIPELINE (FUNNEL)                     */}
        {/* ============================================================== */}
        <TabsContent value="approval-tracking" className="space-y-4">
          {/* Visual Funnel Card */}
          <Card className="border-border/60 bg-card/60">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">
                    National Admission Approval Funnel
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    End-to-end tracking: Departmental Proposal &rarr; Institutional Recommendation &rarr; JAMB Desk Approval &rarr; Candidate Acceptance &rarr; Matriculation.
                  </CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => campaign?.id && loadPipeline(campaign.id)} className="h-8 text-xs font-semibold gap-1.5 border-border">
                  <RefreshCw className={`w-3.5 h-3.5 ${pipelineLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh Pipeline</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Funnel Progress Steps */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={() => setStageFilter(stageFilter === 'PROPOSED' ? 'ALL' : 'PROPOSED')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    stageFilter === 'PROPOSED' ? 'bg-indigo-500/20 border-indigo-500' : 'bg-muted/20 border-border/60 hover:bg-muted/40'
                  }`}
                >
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">1. Proposed</span>
                  <span className="text-lg font-black text-indigo-400">{pipelineData?.stats?.proposedCount || 0}</span>
                  <span className="text-[10px] text-muted-foreground block">Faculty Selection</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStageFilter(stageFilter === 'RECOMMENDED_TO_JAMB' ? 'ALL' : 'RECOMMENDED_TO_JAMB')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    stageFilter === 'RECOMMENDED_TO_JAMB' ? 'bg-blue-500/20 border-blue-500' : 'bg-muted/20 border-border/60 hover:bg-muted/40'
                  }`}
                >
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">2. Recommended</span>
                  <span className="text-lg font-black text-blue-400">{pipelineData?.stats?.recommendedCount || 0}</span>
                  <span className="text-[10px] text-muted-foreground block">To JAMB Desk</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStageFilter(stageFilter === 'APPROVED_BY_JAMB' ? 'ALL' : 'APPROVED_BY_JAMB')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    stageFilter === 'APPROVED_BY_JAMB' ? 'bg-emerald-500/20 border-emerald-500' : 'bg-muted/20 border-border/60 hover:bg-muted/40'
                  }`}
                >
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">3. Approved JAMB</span>
                  <span className="text-lg font-black text-emerald-400">{pipelineData?.stats?.jambApprovedCount || 0}</span>
                  <span className="text-[10px] text-muted-foreground block">CAPS Clearance</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStageFilter(stageFilter === 'ACCEPTED_BY_CANDIDATE' ? 'ALL' : 'ACCEPTED_BY_CANDIDATE')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    stageFilter === 'ACCEPTED_BY_CANDIDATE' ? 'bg-amber-500/20 border-amber-500' : 'bg-muted/20 border-border/60 hover:bg-muted/40'
                  }`}
                >
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">4. Candidate Accepted</span>
                  <span className="text-lg font-black text-amber-400">{pipelineData?.stats?.candidateAcceptedCount || 0}</span>
                  <span className="text-[10px] text-muted-foreground block">Offer Accepted</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStageFilter(stageFilter === 'MATRICULATED' ? 'ALL' : 'MATRICULATED')}
                  className={`p-3 rounded-xl border text-left transition-all col-span-2 sm:col-span-1 ${
                    stageFilter === 'MATRICULATED' ? 'bg-teal-500/20 border-teal-500' : 'bg-muted/20 border-border/60 hover:bg-muted/40'
                  }`}
                >
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">5. Matriculated</span>
                  <span className="text-lg font-black text-teal-400">{pipelineData?.stats?.matriculatedCount || 0}</span>
                  <span className="text-[10px] text-muted-foreground block">Enrolled Student</span>
                </button>
              </div>

              {/* Stage Filter Tools */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative w-full sm:w-72">
                    <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5 pointer-events-none" />
                    <Input
                      placeholder="Search Candidate or JAMB Reg..."
                      value={pipelineSearch}
                      onChange={(e) => setPipelineSearch(e.target.value)}
                      className="pl-9 h-8 text-xs bg-background border-border"
                    />
                  </div>
                  {stageFilter !== 'ALL' && (
                    <Button size="sm" variant="ghost" onClick={() => setStageFilter('ALL')} className="h-8 text-xs text-muted-foreground">
                      Reset Filter
                    </Button>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  Showing <strong>{filteredPipelineApplicants.length}</strong> candidates in pipeline
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Candidates Pipeline Table */}
          <Card className="border-border/60 bg-card/60">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-xs text-left">
                  <thead className="bg-muted/40 text-muted-foreground border-b border-border/60 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">JAMB Reg No</th>
                      <th className="p-3">Candidate</th>
                      <th className="p-3">Program Offered</th>
                      <th className="p-3">Quota</th>
                      <th className="p-3">Composite</th>
                      <th className="p-3">Current CAPS Status</th>
                      <th className="p-3 text-right">Advance Approval</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredPipelineApplicants.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-xs text-muted-foreground">
                          No candidates found matching filter "{stageFilter}".
                        </td>
                      </tr>
                    ) : (
                      filteredPipelineApplicants.map((a: any) => (
                        <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-3 font-mono font-bold text-foreground">{a.jambRegNumber}</td>
                          <td className="p-3">
                            <span className="font-semibold text-foreground block">{a.firstName} {a.lastName}</span>
                            <span className="text-[10px] text-muted-foreground">{a.email}</span>
                          </td>
                          <td className="p-3 font-medium text-foreground">
                            {a.admittedProgram?.name || a.firstChoice?.name}
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-bold">
                              {a.quotaCategory || 'MERIT'}
                            </Badge>
                          </td>
                          <td className="p-3 font-mono font-bold text-indigo-400">
                            {a.compositeScore}%
                          </td>
                          <td className="p-3">
                            <Badge
                              className={`text-[10px] font-bold ${
                                a.jambCapsStatus === 'ACCEPTED_BY_CANDIDATE' || a.status === 'OFFER_ACCEPTED'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : a.jambCapsStatus === 'APPROVED_BY_JAMB'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : a.jambCapsStatus === 'RECOMMENDED_TO_JAMB'
                                  ? 'bg-blue-500/20 text-blue-300'
                                  : a.status === 'MATRICULATED'
                                  ? 'bg-teal-500/20 text-teal-300'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {a.jambCapsStatus || a.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            {a.status === 'MATRICULATED' ? (
                              <Badge className="bg-teal-500/20 text-teal-300 text-[10px] font-bold">Matriculated</Badge>
                            ) : a.jambCapsStatus === 'PROPOSED' ? (
                              <Button
                                size="sm"
                                onClick={() => handleUpdateApplicantCaps(a.id, 'RECOMMENDED_TO_JAMB')}
                                disabled={updatingCapsId === a.id}
                                className="h-7 text-[10px] font-bold bg-blue-600 hover:bg-blue-500 text-white"
                              >
                                Recommend to JAMB
                              </Button>
                            ) : a.jambCapsStatus === 'RECOMMENDED_TO_JAMB' ? (
                              <Button
                                size="sm"
                                onClick={() => handleUpdateApplicantCaps(a.id, 'APPROVED_BY_JAMB')}
                                disabled={updatingCapsId === a.id}
                                className="h-7 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
                              >
                                Confirm JAMB Approval
                              </Button>
                            ) : a.jambCapsStatus === 'APPROVED_BY_JAMB' ? (
                              <Button
                                size="sm"
                                onClick={() => handleUpdateApplicantCaps(a.id, 'ACCEPTED_BY_CANDIDATE')}
                                disabled={updatingCapsId === a.id}
                                className="h-7 text-[10px] font-bold bg-amber-600 hover:bg-amber-500 text-white"
                              >
                                Mark Candidate Accepted
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleMatriculate(a.id)}
                                disabled={matriculatingId === a.id}
                                className="h-7 text-[10px] font-bold bg-teal-600 hover:bg-teal-500 text-white"
                              >
                                Matriculate
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================== */}
        {/* TAB 3: JAMB CAPS INTEGRATION & RECONCILIATION WORKFLOW         */}
        {/* ============================================================== */}
        <TabsContent value="caps-desk" className="space-y-4">
          {/* CAPS Workflow Steps Documentation Card */}
          <Card className="border-border/60 bg-card/60">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Statutory JAMB Central Admissions Processing System (CAPS) Workflow</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Authorised desk protocol for institutional admissions reconciliation and national JAMB compliance.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-1">
                  <span className="font-extrabold text-foreground block">Step 1: Quota Verification</span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Verify statutory Senate cut-offs and Federal Character quotas (45% Merit, 35% Catchment, 20% ELDS).
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-1">
                  <span className="font-extrabold text-foreground block">Step 2: Propose &amp; Recommend</span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Export verified candidate roster in JAMB CAPS standard format and forward recommendations to Desk Officer.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-1">
                  <span className="font-extrabold text-foreground block">Step 3: JAMB Desk Clearance</span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    JAMB National Desk reviews proposed lists on CAPS portal. Approvals are reconciled via live sync.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-1">
                  <span className="font-extrabold text-foreground block">Step 4: Candidate Acceptance</span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Candidates accept offer on JAMB CAPS &amp; Proxima portal, unlocking matriculation and fee payments.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CAPS Live Reconciliation Desk */}
          <Card className="border-border/60 bg-card/60">
            <CardHeader className="pb-3 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold text-foreground">
                  Automated Candidate Record Reconciler
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Compare institutional recommendation queue with JAMB CAPS National Portal feedback.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleRunCapsSync}
                  disabled={reconciling}
                  className="h-8 text-xs font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${reconciling ? 'animate-spin' : ''}`} />
                  <span>{reconciling ? 'Checking CAPS...' : 'Run CAPS Sync Engine'}</span>
                </Button>
                {reconciliationResult && (
                  <Button
                    size="sm"
                    onClick={handleApplyReconciliation}
                    disabled={applyingReconciliation}
                    className="h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>{applyingReconciliation ? 'Applying Updates...' : 'Apply Discrepancy Updates'}</span>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {reconciliationResult ? (
                <div className="space-y-4">
                  {/* Reconciliation Metrics */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Total Matched</span>
                      <p className="text-lg font-bold text-indigo-400">{reconciliationResult.matched.length}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Status Discrepancies</span>
                      <p className="text-lg font-bold text-amber-400">
                        {reconciliationResult.matched.filter((m: any) => m.hasDiscrepancy).length}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">100% In Sync</span>
                      <p className="text-lg font-bold text-emerald-400">
                        {reconciliationResult.matched.filter((m: any) => !m.hasDiscrepancy).length}
                      </p>
                    </div>
                  </div>

                  {/* Reconciled Table */}
                  <div className="overflow-x-auto rounded-xl border border-border/60">
                    <table className="w-full min-w-[700px] text-xs text-left">
                      <thead className="bg-muted/40 text-muted-foreground border-b border-border/60 font-semibold uppercase text-[10px]">
                        <tr>
                          <th className="p-3">JAMB Reg No</th>
                          <th className="p-3">Candidate</th>
                          <th className="p-3">Institutional Program</th>
                          <th className="p-3">Local Status</th>
                          <th className="p-3">JAMB CAPS Status</th>
                          <th className="p-3 text-right">Reconciliation Flag</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {reconciliationResult.matched.map((m: any) => (
                          <tr key={m.applicantId} className="hover:bg-muted/20">
                            <td className="p-3 font-mono font-bold text-foreground">{m.jambRegNumber}</td>
                            <td className="p-3 font-medium text-foreground">{m.name}</td>
                            <td className="p-3">{m.localProgram}</td>
                            <td className="p-3 font-mono text-[11px] text-muted-foreground">{m.currentCapsStatus}</td>
                            <td className="p-3 font-mono font-bold text-indigo-400">{m.incomingCapsStatus}</td>
                            <td className="p-3 text-right">
                              {m.hasDiscrepancy ? (
                                <Badge className="bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                                  Update Available
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                                  Synchronized
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center border border-dashed border-border/60 rounded-2xl bg-muted/10 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">JAMB CAPS Synchronizer Ready</h4>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                      Click "Run CAPS Sync Engine" to simulate and reconcile candidates against national clearance statuses or download the official CSV format.
                    </p>
                  </div>
                  <Button size="sm" onClick={handleRunCapsSync} className="h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-500">
                    Trigger Reconciliation Sync
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================== */}
        {/* TAB 4: POST-UTME SCORING DESK                                 */}
        {/* ============================================================== */}
        <TabsContent value="scoring-desk" className="space-y-4">
          <Card className="border-border/60 bg-card/60">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-bold text-foreground">
                Post-UTME CBT Score Entry &amp; Aggregate Moderation
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Enter screening scores (0-100%). Proxima automatically computes Composite: (UTME/400)*50 + (Post-UTME/100)*30 + (O'Level/40)*20.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-xs text-left">
                  <thead className="bg-muted/40 text-muted-foreground border-b border-border/60 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Candidate</th>
                      <th className="p-3">JAMB Reg No</th>
                      <th className="p-3">UTME Score</th>
                      <th className="p-3">O'Level Points</th>
                      <th className="p-3">Post-UTME CBT Score</th>
                      <th className="p-3">Composite Aggregate</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {rankings?.allApplicants?.map((a: any) => (
                      <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3 font-semibold text-foreground">
                          {a.firstName} {a.lastName}
                        </td>
                        <td className="p-3 font-mono text-muted-foreground">{a.jambRegNumber}</td>
                        <td className="p-3 font-mono font-bold text-foreground">{a.jambScore} / 400</td>
                        <td className="p-3 font-mono text-emerald-400 font-bold">{a.oLevelAggregate} / 40</td>
                        <td className="p-3">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            placeholder={a.postUtmeScore?.toString() || '0'}
                            defaultValue={a.postUtmeScore ?? ''}
                            onChange={(e) =>
                              setCbtScores({ ...cbtScores, [a.id]: parseFloat(e.target.value) || 0 })
                            }
                            className="h-7 w-20 text-xs font-mono font-bold bg-background border-border text-foreground"
                          />
                        </td>
                        <td className="p-3 font-mono font-extrabold text-indigo-400">
                          {a.compositeScore}%
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSaveScore(a.id)}
                            disabled={savingScoreId === a.id}
                            className="h-7 text-[10px] font-bold border-border"
                          >
                            {savingScoreId === a.id ? 'Saving...' : 'Update'}
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
        {/* TAB 5: 1-CLICK MATRICULATION DESK                             */}
        {/* ============================================================== */}
        <TabsContent value="matriculation" className="space-y-4">
          <Card className="border-border/60 bg-card/60">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-bold text-foreground">
                Matriculation Desk &amp; Student Profile Conversion
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Candidates who have accepted provisional offers and paid acceptance fees can be transitioned into matriculated students.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-xs text-left">
                  <thead className="bg-muted/40 text-muted-foreground border-b border-border/60 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Candidate</th>
                      <th className="p-3">JAMB Reg No</th>
                      <th className="p-3">Program Admitted</th>
                      <th className="p-3">Offer Letter Token</th>
                      <th className="p-3">Offer Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {rankings?.allApplicants
                      ?.filter((a: any) => a.status === 'PROVISIONALLY_ADMITTED' || a.status === 'OFFER_ACCEPTED' || a.status === 'MATRICULATED')
                      .map((a: any) => (
                        <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-3 font-semibold text-foreground">
                            {a.firstName} {a.lastName}
                          </td>
                          <td className="p-3 font-mono text-muted-foreground">{a.jambRegNumber}</td>
                          <td className="p-3 font-medium text-foreground">
                            {a.admittedProgram?.name || a.firstChoice?.name}
                          </td>
                          <td className="p-3 font-mono text-[11px] text-indigo-400 select-all">
                            {a.offerLetter?.provisionalLetterCode || 'PENDING'}
                          </td>
                          <td className="p-3">
                            <Badge
                              className={`text-[10px] font-bold ${
                                a.status === 'MATRICULATED'
                                  ? 'bg-teal-500/20 text-teal-300'
                                  : a.status === 'OFFER_ACCEPTED'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}
                            >
                              {a.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            {a.status === 'MATRICULATED' ? (
                              <Badge className="bg-teal-500/20 text-teal-300 text-[10px]">Matriculated</Badge>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleMatriculate(a.id)}
                                disabled={matriculatingId === a.id}
                                className="h-7 text-[10px] font-bold bg-teal-600 hover:bg-teal-500 text-white"
                              >
                                {matriculatingId === a.id ? 'Enrolling...' : 'Matriculate (1-Click)'}
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
