'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Award,
  Download,
  Printer,
  ArrowRight,
  Lock,
  Loader2,
  Building,
  QrCode,
  FileText,
  FileCheck2,
  ListChecks,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { checkAdmissionStatusAction, acceptOfferAction } from '@/actions/admission-actions';

const DEMO_JAMB_NUMBERS = [
  { label: 'Aisha Bello (Admitted - Merit)', jamb: '202510849301AB' },
  { label: 'Zainab Aliyu (Offer Accepted)', jamb: '202510778822KL' },
  { label: 'Ibrahim Danladi (Under Review - ELDS)', jamb: '202510993344EF' },
];

export default function CandidateAdmissionStatusPage() {
  const { toast } = useToast();
  const [jambQuery, setJambQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [applicant, setApplicant] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [acceptingOffer, setAcceptingOffer] = useState(false);
  const [portalTab, setPortalTab] = useState('offer');

  const handleSearch = async (overrideJamb?: string) => {
    const q = (overrideJamb || jambQuery).trim();
    if (!q) {
      setError('Please provide your 10-digit JAMB Registration Number.');
      return;
    }

    setLoading(true);
    setError(null);
    setApplicant(null);

    try {
      const res = await checkAdmissionStatusAction(q);
      if (res.success && res.data) {
        setApplicant(res.data);
      } else {
        setError(res.error || 'No application record found for this JAMB Registration Number.');
      }
    } catch {
      setError('A system error occurred while verifying your status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOffer = async () => {
    if (!applicant?.offerLetter?.provisionalLetterCode) return;

    setAcceptingOffer(true);
    try {
      const res = await acceptOfferAction(applicant.offerLetter.provisionalLetterCode);
      if (res.success) {
        toast({
          title: 'Admission Offer Accepted!',
          description: 'Your acceptance has been synchronized with the University Bursary and CAPS.',
        });
        handleSearch(applicant.jambRegNumber);
      } else {
        toast({
          title: 'Acceptance Error',
          description: res.error,
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to accept admission offer.',
        variant: 'destructive',
      });
    } finally {
      setAcceptingOffer(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white pb-16">
      {/* Top Banner Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-sm sm:text-base tracking-wider text-white uppercase">
                Proxima Admissions Portal
              </span>
              <p className="text-[11px] text-slate-400">Undergraduate Screening, Offer Verification &amp; Clearance</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admissions/apply"
              className="px-3 py-1.5 rounded-xl border border-slate-700 hover:border-indigo-500/60 text-xs font-semibold text-slate-300 hover:text-white transition-all bg-slate-900/60"
            >
              New Application Form
            </Link>
            <Link
              href="/dashboard/admissions"
              className="hidden sm:inline-flex px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all"
            >
              Senate Desk
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Search Header */}
        <div className="text-center space-y-2">
          <Badge className="bg-indigo-500/15 border-indigo-500/30 text-indigo-300 text-xs">
            JAMB CAPS &amp; Post-UTME Clearinghouse
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Check Provisional Admission Status
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            Enter your 10-digit JAMB Registration Number or Direct Entry application code to view your screening aggregate, admission offer, and clearance requirements.
          </p>
        </div>

        {/* Search Input Box */}
        <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl">
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <Input
                  placeholder="Enter JAMB Reg Number (e.g. 202510849301AB)"
                  value={jambQuery}
                  onChange={(e) => setJambQuery(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10 h-11 bg-slate-800/80 border-slate-700 font-mono text-sm uppercase text-white placeholder:text-slate-500"
                />
              </div>
              <Button
                onClick={() => handleSearch()}
                disabled={loading}
                className="h-11 px-6 bg-indigo-600 hover:bg-indigo-500 font-bold text-xs gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>Check Status</span>
              </Button>
            </div>

            {/* Quick Demo Candidate Pills */}
            <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
                Quick Evaluation Presets (Click to Inspect Candidate):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {DEMO_JAMB_NUMBERS.map((d) => (
                  <button
                    key={d.jamb}
                    type="button"
                    onClick={() => {
                      setJambQuery(d.jamb);
                      handleSearch(d.jamb);
                    }}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                      jambQuery === d.jamb
                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200 font-bold'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="bg-red-950/70 border-red-500/50 text-red-200 rounded-xl">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-xs font-semibold ml-2">{error}</AlertDescription>
          </Alert>
        )}

        {/* Result Details */}
        {applicant && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Status Summary Banner */}
            <div
              className={`p-6 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                applicant.status === 'PROVISIONALLY_ADMITTED' || applicant.status === 'OFFER_ACCEPTED' || applicant.status === 'MATRICULATED'
                  ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/50'
                  : 'bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 border-indigo-500/40'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  {applicant.status === 'PROVISIONALLY_ADMITTED' || applicant.status === 'OFFER_ACCEPTED' || applicant.status === 'MATRICULATED' ? (
                    <Award className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Clock className="w-5 h-5 text-indigo-400" />
                  )}
                  <h3 className="text-lg font-black text-white">
                    {applicant.status === 'PROVISIONALLY_ADMITTED' && 'PROVISIONAL ADMISSION OFFERED!'}
                    {applicant.status === 'OFFER_ACCEPTED' && 'OFFER ACCEPTED & CLEARED!'}
                    {applicant.status === 'MATRICULATED' && 'OFFICIALLY MATRICULATED!'}
                    {applicant.status === 'RECOMMENDED' && 'RECOMMENDED BY FACULTY (SENATE REVIEW)'}
                    {applicant.status === 'SCREENED' && 'POST-UTME SCREENING COMPLETED'}
                    {applicant.status === 'APPLIED' && 'APPLICATION RECEIVED (PENDING SCREENING)'}
                  </h3>
                </div>
                <p className="text-xs text-slate-300">
                  {applicant.admittedProgram
                    ? `Admitted Program: ${applicant.admittedProgram.name} (${applicant.admittedProgram.code})`
                    : `First Choice Program: ${applicant.firstChoice?.name}`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-indigo-600/30 text-indigo-200 border-indigo-500/40 text-xs">
                  JAMB CAPS: {applicant.jambCapsStatus}
                </Badge>
                {applicant.quotaCategory && (
                  <Badge className="bg-emerald-600/30 text-emerald-200 border-emerald-500/40 text-xs font-bold">
                    QUOTA: {applicant.quotaCategory}
                  </Badge>
                )}
                {applicant.batch && (
                  <Badge variant="outline" className="border-slate-700 text-slate-300 text-xs">
                    {applicant.batch.batchName}
                  </Badge>
                )}
              </div>
            </div>

            {/* Candidate Identity Card */}
            <Card className="bg-slate-900/80 border-slate-800">
              <CardHeader className="pb-3 border-b border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-white font-extrabold text-base border border-slate-700">
                      {applicant.firstName[0]}{applicant.lastName[0]}
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold text-white">
                        {applicant.firstName} {applicant.otherNames ? `${applicant.otherNames} ` : ''}{applicant.lastName}
                      </h4>
                      <p className="text-xs text-slate-400 font-mono">
                        JAMB Reg: {applicant.jambRegNumber} &bull; App No: {applicant.applicationNumber} &bull; State: {applicant.stateOfOrigin}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-slate-700 text-slate-300 text-xs">
                    {applicant.mode} Entry
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {/* Scoring Metrics Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">UTME Score</span>
                    <p className="text-lg font-bold text-white mt-0.5">{applicant.jambScore} / 400</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Post-UTME CBT</span>
                    <p className="text-lg font-bold text-white mt-0.5">
                      {applicant.postUtmeScore ? `${applicant.postUtmeScore}%` : 'Waived'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">O'Level Aggregate</span>
                    <p className="text-lg font-bold text-emerald-400 mt-0.5">
                      {applicant.oLevelAggregate} / 40 pts
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Composite Score</span>
                    <p className="text-lg font-bold text-indigo-300 mt-0.5">
                      {applicant.compositeScore}%
                    </p>
                  </div>
                </div>

                {/* O'Level Grade Breakdown */}
                {applicant.oLevelResults && applicant.oLevelResults.length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/60 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300">Verified O'Level Subjects &amp; Grades:</span>
                      <span className="text-[10px] text-slate-400 uppercase font-mono">
                        Sitting 1 &bull; {applicant.oLevelResults[0]?.examBody || 'WAEC'} ({applicant.oLevelResults[0]?.examYear || '2024'})
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {Array.isArray(applicant.oLevelResults[0]?.subjects) &&
                        applicant.oLevelResults[0].subjects.map((sub: any, i: number) => (
                          <div key={i} className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] flex justify-between items-center">
                            <span className="text-slate-400 truncate">{sub.subject}</span>
                            <span className="font-bold font-mono text-emerald-400">{sub.grade}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Candidate Portal Tabs: Provisional Offer vs Registration Requirements */}
            <Tabs value={portalTab} onValueChange={setPortalTab} className="space-y-4">
              <TabsList className="bg-slate-900 border border-slate-800 w-full sm:w-auto">
                <TabsTrigger value="offer" className="text-xs font-bold gap-1.5 data-[state=active]:bg-indigo-600">
                  <Award className="w-3.5 h-3.5" />
                  <span>Provisional Admission Letter</span>
                </TabsTrigger>
                <TabsTrigger value="clearance" className="text-xs font-bold gap-1.5 data-[state=active]:bg-indigo-600">
                  <ListChecks className="w-3.5 h-3.5" />
                  <span>Registration &amp; Clearance Requirements</span>
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: PROVISIONAL OFFER LETTER */}
              <TabsContent value="offer" className="space-y-4">
                {applicant.offerLetter ? (
                  <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-indigo-500/40 shadow-2xl space-y-6 relative overflow-hidden">
                    {/* Watermark */}
                    <div className="absolute right-4 bottom-4 opacity-5 pointer-events-none">
                      <GraduationCap className="w-72 h-72 text-indigo-400" />
                    </div>

                    {/* Letter Masthead */}
                    <div className="text-center space-y-1 border-b border-slate-800 pb-5">
                      <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-300 mb-2">
                        <Building className="w-6 h-6" />
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                        PROXIMA UNIVERSITY OF TECHNOLOGY &amp; MANAGEMENT SCIENCES
                      </h3>
                      <p className="text-xs text-indigo-400 font-semibold uppercase tracking-widest">
                        Office of the Registrar &bull; Central Admissions Directorate
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Provisional Offer of Undergraduate Admission &bull; 2025/2026 Academic Session
                      </p>
                    </div>

                    {/* Letter Body */}
                    <div className="text-xs sm:text-sm text-slate-300 leading-relaxed space-y-3">
                      <p>
                        Dear <strong className="text-white">{applicant.firstName} {applicant.lastName}</strong>,
                      </p>
                      <p>
                        I am pleased to inform you that you have been offered{' '}
                        <strong className="text-emerald-400">PROVISIONAL ADMISSION</strong> into Proxima University to
                        pursue a full-time degree program in:
                      </p>
                      <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 text-center space-y-1">
                        <p className="text-base font-extrabold text-white uppercase tracking-tight">
                          {applicant.admittedProgram?.name}
                        </p>
                        <p className="text-xs text-indigo-300 font-mono">
                          Degree Code: {applicant.admittedProgram?.code} &bull; Entry Level:{' '}
                          {applicant.mode === 'DIRECT_ENTRY' ? '200 Level' : '100 Level'} &bull; Quota:{' '}
                          {applicant.quotaCategory || 'MERIT'}
                        </p>
                      </div>
                      <p className="text-xs text-slate-400">
                        This provisional offer is strictly subject to physical verification of your authentic O'Level credentials, local government identification, and formal confirmation on the JAMB Central Admissions Processing System (CAPS).
                      </p>
                    </div>

                    {/* Security Seal & Token */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">Cryptographic Verification Token</span>
                        <span className="font-mono font-bold text-indigo-300 select-all">
                          {applicant.offerLetter.provisionalLetterCode}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">Acceptance Deadline</span>
                        <span className="font-mono font-bold text-amber-300">
                          {new Date(applicant.offerLetter.acceptanceDeadline).toLocaleDateString(undefined, {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Letter Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
                      <Button
                        variant="outline"
                        onClick={() => window.print()}
                        className="w-full sm:w-auto border-slate-700 text-slate-300 text-xs gap-1.5"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Print Official Letter</span>
                      </Button>

                      {!applicant.offerLetter.isAccepted ? (
                        <Button
                          onClick={handleAcceptOffer}
                          disabled={acceptingOffer}
                          className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs gap-2 shadow-lg shadow-emerald-600/30 px-6 h-10"
                        >
                          {acceptingOffer ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Confirming Acceptance &amp; Bursary Ledger...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Accept Offer &amp; Confirm Clearance</span>
                            </>
                          )}
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            Offer Accepted on {new Date(applicant.offerLetter.acceptedAt || Date.now()).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                    <Clock className="w-8 h-8 text-indigo-400 mx-auto" />
                    <h4 className="text-sm font-bold text-white">Application Under Faculty Consideration</h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Your screening composite score ({applicant.compositeScore}%) has been received and is being ranked against departmental cut-off quotas. Check back once Batch Admissions are officially published.
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* TAB 2: REGISTRATION & CLEARANCE REQUIREMENTS */}
              <TabsContent value="clearance" className="space-y-4">
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader className="pb-3 border-b border-slate-800">
                    <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                      <FileCheck2 className="w-4 h-4 text-emerald-400" />
                      <span>Physical Clearance &amp; Fresh Student Registration Checklist</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      All admitted candidates must present original copies and 3 sets of photocopies of the following credentials during physical verification:
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    <div className="space-y-2 text-xs">
                      {[
                        { title: "JAMB Original Result Slip", desc: "Color printout with clear passport photograph showing full UTME subject scores." },
                        { title: "JAMB Official Provisional Admission Letter", desc: "Printed directly from candidate's profile on JAMB CAPS portal." },
                        { title: "Proxima University Provisional Offer Letter", desc: "Official letter generated from this portal bearing cryptographic verification token." },
                        { title: "O'Level Result Statement or Certificate", desc: "WAEC, NECO, or NABTEB statement showing minimum of 5 credit passes including English and Mathematics." },
                        { title: "Local Government / State of Origin Identification", desc: "Official certificate signed by Chairman/Secretary of candidate's Local Government Area." },
                        { title: "Birth Certificate or Statutory Declaration of Age", desc: "National Population Commission (NPC) certificate or valid Court declaration of age." },
                        { title: "University Health Centre Medical Fitness Certificate", desc: "Endorsed certificate following medical tests conducted at Proxima University Clinic." },
                        { title: "Recent Passport Photographs (8 Copies)", desc: "Identical color passport photos with candidate's full name and program written on the reverse." },
                        { title: "Acceptance Fee Payment Receipt", desc: "Bursary e-receipt verifying payment of the non-refundable institutional acceptance fee." },
                      ].map((req, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-start gap-3">
                          <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="font-bold text-white block">{req.title}</span>
                            <span className="text-[11px] text-slate-400 leading-relaxed block">{req.desc}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1 mt-4">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span>Crucial JAMB CAPS Instruction:</span>
                      </div>
                      <p className="text-[11px] text-amber-300 leading-relaxed">
                        To validate your admission nationally, you MUST log in to your JAMB CAPS profile (caps.jamb.gov.ng), navigate to <strong>Admission Status</strong>, and click <strong>ACCEPT</strong>. Failure to accept your offer on CAPS before the statutory deadline will result in automated forfeiture of your slot.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  );
}
