'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { verifyDegreeCertificateAction } from '@/actions/graduation-clearance-actions';
import { ShieldCheck, AlertTriangle, Search, Award, CheckCircle2, Building2, Calendar, FileBadge, Loader2 } from 'lucide-react';
import Link from 'next/link';

function VerifyDegreeContent() {
  const searchParams = useSearchParams();
  const certParam = searchParams.get('cert');

  const [certNumber, setCertNumber] = useState(certParam || '');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const performVerification = async (numberToVerify: string) => {
    if (!numberToVerify.trim()) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    const res = await verifyDegreeCertificateAction(numberToVerify);
    if (res.success && res.data) {
      setResult(res.data);
    } else {
      setError(res.error || 'No authentic degree credential found matching this reference.');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (certParam) {
      performVerification(certParam);
    }
  }, [certParam]);

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <Card className="border shadow-md">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto bg-primary/10 text-primary h-14 w-14 rounded-2xl flex items-center justify-center mb-2">
            <FileBadge className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl font-bold">Public Degree Credential Verification</CardTitle>
          <CardDescription className="max-w-md mx-auto text-xs">
            Authenticate university degree certificates, conferral dates, and academic classifications via the tamper-evident cryptographic ledger.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4 max-w-lg mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              performVerification(certNumber);
            }}
            className="flex gap-2"
          >
            <Input
              placeholder="e.g. CERT-CSC-BSC-2026-0042"
              value={certNumber}
              onChange={(e) => setCertNumber(e.target.value)}
              className="font-mono text-sm uppercase"
            />
            <Button type="submit" disabled={isLoading} className="shrink-0 flex items-center gap-1">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Verify
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Result Display */}
      {result && (
        <Card className="border-2 border-emerald-500/80 shadow-xl max-w-2xl mx-auto overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm">
                <ShieldCheck className="h-8 w-8 text-white" />
              </div>
              <div>
                <Badge className="bg-white text-emerald-800 font-bold text-xs mb-1">
                  OFFICIALLY AUTHENTICATED
                </Badge>
                <h3 className="text-lg font-bold">Degree Credential Verified</h3>
              </div>
            </div>
            <Award className="h-10 w-10 text-white/30 hidden sm:block" />
          </div>

          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="bg-muted/40 p-3.5 rounded-xl border">
                <span className="text-xs text-muted-foreground uppercase font-semibold">Candidate Name</span>
                <p className="text-base font-bold text-foreground mt-0.5">{result.candidateName}</p>
              </div>

              <div className="bg-muted/40 p-3.5 rounded-xl border">
                <span className="text-xs text-muted-foreground uppercase font-semibold">Matriculation Identifier</span>
                <p className="text-base font-bold font-mono text-foreground mt-0.5">{result.matricNumber}</p>
              </div>

              <div className="bg-muted/40 p-3.5 rounded-xl border sm:col-span-2">
                <span className="text-xs text-muted-foreground uppercase font-semibold">Degree Program Conferred</span>
                <p className="text-base font-bold text-primary mt-0.5">{result.programName}</p>
              </div>

              <div className="bg-muted/40 p-3.5 rounded-xl border">
                <span className="text-xs text-muted-foreground uppercase font-semibold">Honours Classification</span>
                <p className="text-base font-bold text-emerald-700 mt-0.5">{result.degreeClassification}</p>
              </div>

              <div className="bg-muted/40 p-3.5 rounded-xl border">
                <span className="text-xs text-muted-foreground uppercase font-semibold">Academic Session</span>
                <p className="text-base font-bold text-foreground mt-0.5">{result.academicSession}</p>
              </div>
            </div>

            {/* Cryptographic Ledger Proof */}
            <div className="bg-slate-900 text-slate-200 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400 font-medium">
                <span>Cryptographic Audit Proof</span>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-emerald-400">HMAC-SHA256</span>
              </div>
              <div className="font-mono break-all text-[11px] text-slate-300">
                {result.certificateHash}
              </div>
              <div className="text-[10px] text-slate-500">
                Issued At: {result.issuedAt ? new Date(result.issuedAt).toLocaleString() : 'Senate Record'}
              </div>
            </div>
          </CardContent>

          <CardFooter className="bg-muted/20 border-t p-4 flex justify-between items-center text-xs text-muted-foreground">
            <span>Verified against University Senate Central Database</span>
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-xs">
                Staff Login
              </Button>
            </Link>
          </CardFooter>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-red-300 bg-red-50/50 max-w-lg mx-auto p-6 text-center space-y-3">
          <AlertTriangle className="h-10 w-10 text-red-600 mx-auto" />
          <h3 className="font-bold text-red-900">Verification Failed</h3>
          <p className="text-xs text-red-700">{error}</p>
        </Card>
      )}
    </div>
  );
}

export default function VerifyDegreePage() {
  return (
    <div className="min-h-screen bg-muted/20 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Suspense fallback={<div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>}>
          <VerifyDegreeContent />
        </Suspense>
      </div>
    </div>
  );
}
