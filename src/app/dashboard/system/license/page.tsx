'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { checkLicenseStatus, getLicenseCapacity } from '@/actions/license-actions';
import { Shield, ShieldAlert, Key, CheckCircle, RefreshCcw, Users, Calendar, Sparkles, AlertTriangle } from 'lucide-react';
import { LicenseStatus } from '@/lib/license-utils';
import { LicenseCapacityStatus } from '@/lib/services/license-capacity';

export default function LicenseManagementPage() {
  const [licenseKey, setLicenseKey] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [details, setDetails] = useState<any>(null);
  const [capacity, setCapacity] = useState<LicenseCapacityStatus | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const [res, capRes] = await Promise.all([
        checkLicenseStatus(),
        getLicenseCapacity()
      ]);
      setStatus(res.status);
      setDetails(res.payload);
      setMessage(res.message);
      setCapacity(capRes);
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: 'Failed to load subscription details' });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleApplyLicense = async () => {
    if (!licenseKey.trim()) {
      toast({ variant: "destructive", title: "Error", description: 'Please enter an activation key' });
      return;
    }
    
    setIsApplying(true);
    try {
      const res = await fetch('/api/license/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: licenseKey.trim() })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast({ title: "Success", description: 'Subscription activated successfully' });
        setLicenseKey('');
        await fetchStatus();
        window.location.reload();
      } else {
        toast({ variant: "destructive", title: 'Activation Failed', description: data.error });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: 'Failed to apply activation key' });
    }
    setIsApplying(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-800 to-slate-500 bg-clip-text text-transparent">Enterprise Subscription</h2>
          <p className="text-muted-foreground mt-1">Manage your software entitlement, payment frequency, and student capacity</p>
        </div>
      </div>

      {/* --- Student Capacity & Grace Buffer Card --- */}
      {capacity && (
        <Card className="border shadow-sm overflow-hidden bg-card">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <CardTitle className="text-lg">Active Student Capacity & Grace Leeway</CardTitle>
              </div>
              {capacity.zone === 'NORMAL' && (
                <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 border-emerald-300">
                  <CheckCircle className="w-3.5 h-3.5 mr-1" /> Within Regular Limit
                </Badge>
              )}
              {capacity.zone === 'GRACE_BUFFER' && (
                <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/20 border-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1" /> In Grace Buffer (+15% Leeway)
                </Badge>
              )}
              {capacity.zone === 'OVER_CAPACITY' && (
                <Badge className="bg-rose-500/15 text-rose-700 hover:bg-rose-500/20 border-rose-300">
                  <ShieldAlert className="w-3.5 h-3.5 mr-1" /> Over Capacity (Hard Stop)
                </Badge>
              )}
            </div>
            <CardDescription>
              Licensed for {capacity.licensedLimit} active students with a +15% soft buffer allowing up to {capacity.graceBufferLimit} students before admission freeze.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span>Active Enrollment: <strong className="text-foreground">{capacity.activeStudents}</strong> / {capacity.licensedLimit}</span>
                <span className="text-muted-foreground">Grace Ceiling: {capacity.graceBufferLimit} students</span>
              </div>
              <Progress 
                value={Math.min(100, Math.round((capacity.activeStudents / capacity.graceBufferLimit) * 100))} 
                className="h-3"
              />
            </div>

            {/* Explanatory callout based on zone */}
            {capacity.zone === 'NORMAL' && (
              <p className="text-xs text-muted-foreground bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>You have <strong>{capacity.availableRegularSlots}</strong> regular slots remaining before entering the grace buffer.</span>
              </p>
            )}

            {capacity.zone === 'GRACE_BUFFER' && (
              <div className="text-xs bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-900 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  Mid-Term Grace Policy Active
                </p>
                <p className="text-amber-800">
                  Your school currently has {capacity.activeStudents} active students ({capacity.activeStudents - capacity.licensedLimit} over licensed limit). 
                  Admissions continue without disruption. You have <strong>{capacity.availableGraceSlots}</strong> grace slots remaining. 
                  Your subscription will be reconciled at the next term renewal.
                </p>
              </div>
            )}

            {capacity.zone === 'OVER_CAPACITY' && (
              <div className="text-xs bg-rose-50 p-3 rounded-lg border border-rose-200 text-rose-900 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  Hard Grace Buffer Exceeded
                </p>
                <p className="text-rose-800">
                  Total active students ({capacity.activeStudents}) exceed both your licensed capacity ({capacity.licensedLimit}) and the +15% grace buffer ({capacity.graceBufferLimit}). 
                  New admissions are paused until the license is upgraded.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-md overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-blue-500"></div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Shield className="w-5 h-5 text-indigo-500" />
              Subscription & Frequency
            </CardTitle>
            <CardDescription>Current cryptographic entitlement & billing cycle</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCcw className="w-6 h-6 animate-spin text-indigo-300" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-4 bg-background rounded-xl border border-slate-100">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Status</p>
                    <p className="text-xs text-muted-foreground mt-1">{message}</p>
                  </div>
                  {status === 'ACTIVE' ? (
                    <div className="flex items-center text-emerald-700 bg-emerald-50 px-4 py-1.5 rounded-full text-sm font-bold shadow-sm border border-emerald-100">
                      <CheckCircle className="w-4 h-4 mr-2" /> ACTIVE
                    </div>
                  ) : (
                    <div className="flex items-center text-rose-700 bg-rose-50 px-4 py-1.5 rounded-full text-sm font-bold shadow-sm border border-rose-100">
                      <ShieldAlert className="w-4 h-4 mr-2" /> {status}
                    </div>
                  )}
                </div>

                {details && (
                  <div className="space-y-3 pt-4">
                    <div className="flex justify-between text-sm items-center p-2 rounded-md hover:bg-background transition-colors">
                      <span className="text-muted-foreground font-medium">Organization</span>
                      <span className="font-semibold text-foreground">{details.schoolName}</span>
                    </div>
                    <div className="flex justify-between text-sm items-center p-2 rounded-md hover:bg-background transition-colors">
                      <span className="text-muted-foreground font-medium">Subscription Tier</span>
                      <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{details.tier}</span>
                    </div>
                    <div className="flex justify-between text-sm items-center p-2 rounded-md hover:bg-background transition-colors">
                      <span className="text-muted-foreground font-medium">Payment Frequency</span>
                      <Badge variant="outline" className="font-semibold text-xs border-indigo-200 text-indigo-700 bg-indigo-50/50">
                        {details.billingFrequency === 'PER_SESSION' ? 'Per Session (Annual)' : 'Per Term (Termly)'}
                      </Badge>
                    </div>
                    {details.discountPercent > 0 && (
                      <div className="flex justify-between text-sm items-center p-2 rounded-md hover:bg-background transition-colors">
                        <span className="text-muted-foreground font-medium">Prepayment Incentive</span>
                        <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md text-xs flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> {details.discountPercent}% Upfront Discount
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm items-center p-2 rounded-md hover:bg-background transition-colors">
                      <span className="text-muted-foreground font-medium">User Capacity</span>
                      <span className="font-semibold text-foreground">{details.maxStudents} Students (+15% Buffer)</span>
                    </div>
                    <div className="flex justify-between text-sm items-center p-2 rounded-md hover:bg-background transition-colors">
                      <span className="text-muted-foreground font-medium">Validity Ends</span>
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        {new Date(details.expiresAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Key className="w-5 h-5 text-slate-600" />
              Activate or Renew
            </CardTitle>
            <CardDescription>Apply a new cryptographic token to upgrade tier or renew for next term</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700">Activation Token</label>
              <Textarea 
                placeholder="Paste your base64 signature token here..." 
                className="font-mono text-xs min-h-[160px] bg-background border-border focus-visible:ring-indigo-500 rounded-xl resize-none"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">Tokens are provided by Proxima Digital upon subscription renewal.</p>
            </div>
            <Button 
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm" 
              onClick={handleApplyLicense} 
              disabled={isApplying || !licenseKey}
            >
              {isApplying ? (
                <><RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> Verifying Token...</>
              ) : (
                'Apply Subscription Token'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
