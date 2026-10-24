'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { verifyExamDocketQRAction } from '@/actions/tims-docket-actions';
import { ShieldCheck, ShieldAlert, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import Link from 'next/link';

function ExamDocketVerificationContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function verify() {
      if (!token) {
        setResult({ valid: false, error: 'No verification token provided in query parameters.' });
        setIsLoading(false);
        return;
      }

      const res = await verifyExamDocketQRAction(token);
      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setResult({ valid: false, error: res.error || 'Verification server error.' });
      }
      setIsLoading(false);
    }

    verify();
  }, [token]);

  return (
    <div className="w-full max-w-lg space-y-4">
      {/* Verification Status Card */}
      <Card className="border border-slate-800 bg-slate-900 shadow-2xl rounded-3xl overflow-hidden">
        <CardHeader className="text-center pb-4 pt-6 border-b border-slate-800">
          {isLoading ? (
            <div className="py-8 flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
              <p className="text-sm font-medium text-slate-300">Validating HMAC Digital Signature...</p>
            </div>
          ) : result?.valid ? (
            <div className="space-y-3">
              <div className="w-16 h-16 bg-emerald-500/10 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/10">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <div>
                <Badge className="bg-emerald-500 text-slate-950 font-bold uppercase tracking-wider text-xs px-3 py-1">
                  CLEARED FOR EXAMINATION ENTRY
                </Badge>
                <CardTitle className="text-2xl font-black text-white mt-2">
                  {result.student?.fullName}
                </CardTitle>
                <CardDescription className="font-mono text-indigo-300 text-sm mt-0.5">
                  {result.student?.matricNumber}
                </CardDescription>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-16 h-16 bg-rose-500/10 border-2 border-rose-500 rounded-full flex items-center justify-center mx-auto text-rose-400">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <div>
                <Badge className="bg-rose-500 text-white font-bold uppercase tracking-wider text-xs px-3 py-1">
                  ENTRY RESTRICTED
                </Badge>
                <CardTitle className="text-xl font-bold text-white mt-2">Verification Failed</CardTitle>
                <CardDescription className="text-rose-300 text-xs mt-1">
                  {result?.error || 'Tampered or counterfeit digital token.'}
                </CardDescription>
              </div>
            </div>
          )}
        </CardHeader>

        {result?.valid && (
          <CardContent className="space-y-4 pt-5 text-sm">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-800/50 border border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Program</span>
                <span className="font-bold text-slate-200">{result.student?.program}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Level</span>
                <span className="font-bold text-slate-200">{result.student?.level} Level</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Session &amp; Sem</span>
                <span className="font-bold text-slate-200">{result.registration?.session} (Sem {result.registration?.semester})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Status</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approved
                </span>
              </div>
            </div>

            {/* Cleared Courses List */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-300 block uppercase tracking-wider">
                Cleared Course Offerings ({result.courses?.length})
              </span>
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {result.courses?.map((course: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-800/30 border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-indigo-400">{course.code}</span>
                      <span className="text-slate-300 truncate max-w-[200px]">{course.title}</span>
                    </div>
                    <Badge variant="outline" className="font-mono text-[10px] text-slate-400">
                      {course.credits} Units
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        )}

        <CardFooter className="bg-slate-900 border-t border-slate-800 p-4 flex justify-between items-center text-xs text-slate-400">
          <span className="flex items-center gap-1 font-mono text-[10px]">
            <Clock className="h-3.5 w-3.5" /> Cryptographic Invigilator Scanner
          </span>
          <Button variant="ghost" size="sm" asChild className="text-xs text-indigo-400 hover:text-indigo-300">
            <Link href="/dashboard">Return to Portal</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function ExamDocketVerificationPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <Suspense fallback={
        <div className="py-12 flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
          <p className="text-sm font-medium text-slate-400">Loading verification session...</p>
        </div>
      }>
        <ExamDocketVerificationContent />
      </Suspense>
    </div>
  );
}
