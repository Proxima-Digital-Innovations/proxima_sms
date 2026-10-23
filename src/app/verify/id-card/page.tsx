'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { verifyIdCardAction } from '@/actions/id-card-actions';
import { ShieldCheck, AlertTriangle, Search, CheckCircle2, Building, Calendar, CreditCard, Loader2, User, UserCheck } from 'lucide-react';
import Link from 'next/link';

function VerifyIdCardContent() {
  const searchParams = useSearchParams();
  const codeParam = searchParams.get('code');
  const typeParam = searchParams.get('type') || 'STUDENT';

  const [idCode, setIdCode] = useState(codeParam || '');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const performVerification = async (targetCode: string) => {
    if (!targetCode.trim()) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    const res = await verifyIdCardAction(targetCode, typeParam);
    if (res.success && res.data) {
      setResult(res.data);
    } else {
      setError(res.error || 'No registered student or staff credential found matching this ID code.');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (codeParam) {
      performVerification(codeParam);
    }
  }, [codeParam]);

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <Card className="border shadow-md">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto bg-indigo-50 text-indigo-700 h-14 w-14 rounded-2xl flex items-center justify-center mb-2">
            <CreditCard className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl font-bold">Official Credential &amp; ID Card Verification</CardTitle>
          <CardDescription className="max-w-md mx-auto text-xs text-gray-500">
            Real-time public portal for verifying student matriculation cards, faculty staff badges, and visitor clearance tokens.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4 max-w-lg mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              performVerification(idCode);
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Enter Matric Number or Staff Code (e.g. U2025/CSC/001 or LEC-CSC-001)"
                value={idCode}
                onChange={(e) => setIdCode(e.target.value)}
                className="pl-9 font-mono text-sm"
              />
            </div>
            <Button type="submit" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Loading state */}
      {isLoading && (
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
          <p className="text-sm text-gray-500 font-medium animate-pulse">Querying Institutional Identity Registry...</p>
        </div>
      )}

      {/* Error / Not Found */}
      {error && !isLoading && (
        <Card className="border-red-200 bg-red-50/50 max-w-lg mx-auto">
          <CardContent className="pt-6 text-center space-y-3">
            <div className="mx-auto bg-red-100 text-red-600 h-12 w-12 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-red-950 text-base">Invalid or Unverified Credential</h3>
              <p className="text-xs text-red-700 mt-1">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success / Authentic Card */}
      {result && !isLoading && (
        <Card className="border-emerald-200 bg-gradient-to-b from-emerald-50/30 to-white shadow-xl max-w-xl mx-auto overflow-hidden">
          <div className="bg-emerald-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-200" />
              <span className="font-bold text-xs uppercase tracking-wider">Officially Verified Credential</span>
            </div>
            <Badge className="bg-white text-emerald-800 font-bold hover:bg-white text-xs">
              AUTHENTIC RECORD
            </Badge>
          </div>

          <CardContent className="pt-6 space-y-6">
            <div className="flex items-center gap-4 border-b pb-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-200 flex items-center justify-center font-bold text-indigo-700 text-2xl">
                {result.fullName?.charAt(0) || 'U'}
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-gray-900">{result.fullName}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-xs font-bold px-2.5 py-0.5 bg-gray-100 rounded text-gray-700">
                    {result.code}
                  </span>
                  <Badge variant="outline" className="text-xs font-semibold">
                    {result.type}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-gray-400 font-medium">Institution</span>
                <p className="font-bold text-gray-900">{result.institution}</p>
              </div>
              <div className="space-y-1">
                <span className="text-gray-400 font-medium">Faculty / Division</span>
                <p className="font-bold text-gray-900">{result.faculty}</p>
              </div>
              <div className="space-y-1">
                <span className="text-gray-400 font-medium">Department</span>
                <p className="font-bold text-gray-900">{result.department}</p>
              </div>
              <div className="space-y-1">
                <span className="text-gray-400 font-medium">Academic Program / Role</span>
                <p className="font-bold text-gray-900">{result.program}</p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-emerald-700 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{result.status}</span>
              </div>
              <span className="text-gray-400 text-[11px]">
                Verified: {new Date(result.verifiedAt).toLocaleDateString()}
              </span>
            </div>
          </CardContent>

          <CardFooter className="bg-gray-50 border-t py-3 text-center flex justify-center text-xs text-gray-500">
            Proxima Institutional Trust Network &bull; Cryptographically Verified
          </CardFooter>
        </Card>
      )}
    </div>
  );
}

export default function VerifyIdCardPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full mx-auto">
        <Suspense fallback={
          <div className="py-20 text-center text-gray-500 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-sm font-medium">Loading Identity Verification Portal...</p>
          </div>
        }>
          <VerifyIdCardContent />
        </Suspense>
      </div>

      <div className="mt-12 text-center text-xs text-gray-400">
        &copy; {new Date().getFullYear()} Proxima SMS &bull; Central Security &amp; Registrar Registry
      </div>
    </div>
  );
}
