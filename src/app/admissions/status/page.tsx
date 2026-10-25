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
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { checkAdmissionStatusAction, acceptOfferAction } from '@/actions/admission-actions';

const DEMO_JAMB_NUMBERS = [
  { label: 'Aisha Bello (Admitted - Merit)', jamb: '202510849301AB' },
  { label: 'Zainab Aliyu (Offer Accepted)', jamb: '202510778822KL' },
  { label: 'Ibrahim Danladi (Under Review - ELDS)', jamb: '202510294821EF' },
  { label: 'Babatunde Adeleke (Direct Entry)', jamb: '202510667799IJ' },
];

export default function CandidateAdmissionStatusPage() {
  const { toast } = useToast();
  const [jambQuery, setJambQuery] = useState('202510849301AB');
  const [loading, setLoading] = useState(false);
  const [applicant, setApplicant] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [acceptingOffer, setAcceptingOffer] = useState(false);

  const handleSearch = async (targetJamb?: string) => {
    const q = (targetJamb || jambQuery).trim();
    if (!q) return;
    setError(null);
    setLoading(true);
    try {
      const res = await checkAdmissionStatusAction(q);
      if (!res.success) {
        throw new Error(res.error || 'Applicant record not found.');
      }
      setApplicant(res.data);
    } catch (err: any) {
      setApplicant(null);
      setError(err.message || 'Failed to retrieve admission record.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOffer = async () => {
    if (!applicant?.offerLetter?.provisionalLetterCode) return;
    setAcceptingOffer(true);
    try {
      const res = await acceptOfferAction(applicant.offerLetter.provisionalLetterCode);
      if (!res.success) {
        throw new Error(res.error || 'Failed to accept admission offer.');
      }
      toast({
        title: 'Admission Offer Accepted!',
        description: 'Acceptance fee posted to Bursary ledger. Provisional clearance granted.',
      });
      // Refresh record
      await handleSearch(applicant.jambRegNumber);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error Accepting Offer',
        description: err.message,
      });
    } finally {
      setAcceptingOffer(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 p-0.5 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <span className="font-extrabold text-sm sm:text-base tracking-wider text-white uppercase">
                Proxima Admissions Portal
              </span>
              <p className="text-[11px] text-slate-400">Undergraduate Candidate Clearance &amp; Offer Verification</p>
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
            Enter your 10-digit JAMB Registration Number or Direct Entry application code to view your screening results and admission offer.
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
                    {applicant.status === 'APPLIED' && 'APPLICATION RECEIVED'}
                  </h3>
                </div>
                <p className="text-xs text-slate-300">
                  {applicant.admittedProgram
                    ? `Admitted into: ${applicant.admittedProgram.name} (${applicant.admittedProgram.code})`
                    : `First Choice: ${applicant.firstChoice?.name}`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-indigo-600/30 text-indigo-200 border-indigo-500/40 text-xs">
                  JAMB CAPS: {applicant.jambCapsStatus}
                </Badge>
                {applicant.quotaCategory && (
                  <Badge className="bg-emerald-600/30 text-emerald-200 border-emerald-500/40 text-xs">
                    QUOTA: {applicant.quotaCategory}
                  </Badge>
                )}
              </div>
            </div>

            {/* Candidate Card */}
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
                        JAMB Reg: {applicant.jambRegNumber} &bull; App No: {applicant.applicationNumber}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-slate-700 text-slate-300 text-xs">
                    {applicant.mode} Entry
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                
                {/* Scoring Metrics */}
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
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">O'Level Points</span>
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

                {/* Direct Entry Prior Credential */}
                {applicant.deInstitution && (
                  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700 text-xs space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Prior Institution &amp; Qualification</span>
                    <p className="text-white font-medium">
                      {applicant.deInstitution} &bull; {applicant.deQualification} ({applicant.deGradeOrCgpa})
                    </p>
                  </div>
                )}

              </CardContent>
            </Card>

            {/* Provisional Offer Letter (If Admitted) */}
            {applicant.offerLetter && (
              <div className="p-6 rounded-2xl bg-slate-900 border border-indigo-500/40 shadow-2xl space-y-6 relative overflow-hidden">
                
                {/* Background Watermark */}
                <div className="absolute right-4 bottom-4 opacity-5 pointer-events-none">
                  <GraduationCap className="w-64 h-64 text-indigo-400" />
                </div>

                {/* Letter Masthead */}
                <div className="text-center space-y-1 border-b border-slate-800 pb-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-300 mb-2">
                    <Building className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider">
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
                <div className="text-xs text-slate-300 leading-relaxed space-y-3">
                  <p>
                    Dear <strong className="text-white">{applicant.firstName} {applicant.lastName}</strong>,
                  </p>
                  <p>
                    I am pleased to inform you that you have been offered <strong className="text-emerald-400">PROVISIONAL ADMISSION</strong> into Proxima University to pursue a full-time degree program in:
                  </p>
                  <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 text-center">
                    <p className="text-sm font-extrabold text-white uppercase">
                      {applicant.admittedProgram?.name}
                    </p>
                    <p className="text-[11px] text-indigo-300 font-mono mt-0.5">
                      Degree Code: {applicant.admittedProgram?.code} &bull; Entry Level: {applicant.mode === 'DIRECT_ENTRY' ? '200 Level' : '100 Level'}
                    </p>
                  </div>
                  <p>
                    This provisional offer is subject to the validation of your O'Level certificate credentials and compliance with NUC and JAMB Central Admissions Processing System (CAPS) requirements.
                  </p>
                </div>

                {/* Letter Security Metadata */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Cryptographic Verification Token</span>
                    <span className="font-mono font-bold text-indigo-300 select-all">
                      {applicant.offerLetter.provisionalLetterCode}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Acceptance Deadline</span>
                    <span className="font-mono text-amber-300">
                      {new Date(applicant.offerLetter.acceptanceDeadline).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Offer Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
                  <Button
                    variant="outline"
                    onClick={() => window.print()}
                    className="w-full sm:w-auto border-slate-700 text-slate-300 text-xs gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Provisional Letter</span>
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
                      <span>Offer Accepted on {new Date(applicant.offerLetter.acceptedAt || Date.now()).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>
        )}

      </main>
    </div>
  );
}
