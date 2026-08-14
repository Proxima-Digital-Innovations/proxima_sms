'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { checkLicenseStatus } from '@/actions/license-actions';
import { Shield, ShieldAlert, Key, CheckCircle, RefreshCcw } from 'lucide-react';
import { LicenseStatus } from '@/lib/license-utils';

export default function LicenseManagementPage() {
  const [licenseKey, setLicenseKey] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [details, setDetails] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const res = await checkLicenseStatus();
      setStatus(res.status);
      setDetails(res.payload);
      setMessage(res.message);
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
          <p className="text-muted-foreground mt-1">Manage your software entitlement and activation status</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-md overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-blue-500"></div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Shield className="w-5 h-5 text-indigo-500" />
              Subscription Status
            </CardTitle>
            <CardDescription>Current cryptographic entitlement state</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCcw className="w-6 h-6 animate-spin text-indigo-300" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Status</p>
                    <p className="text-xs text-slate-500 mt-1">{message}</p>
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
                    <div className="flex justify-between text-sm items-center p-2 rounded-md hover:bg-slate-50 transition-colors">
                      <span className="text-slate-500 font-medium">Organization</span>
                      <span className="font-semibold text-slate-800">{details.schoolName}</span>
                    </div>
                    <div className="flex justify-between text-sm items-center p-2 rounded-md hover:bg-slate-50 transition-colors">
                      <span className="text-slate-500 font-medium">Subscription Tier</span>
                      <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{details.tier}</span>
                    </div>
                    <div className="flex justify-between text-sm items-center p-2 rounded-md hover:bg-slate-50 transition-colors">
                      <span className="text-slate-500 font-medium">User Capacity</span>
                      <span className="font-semibold text-slate-800">{details.maxStudents} Students</span>
                    </div>
                    <div className="flex justify-between text-sm items-center p-2 rounded-md hover:bg-slate-50 transition-colors">
                      <span className="text-slate-500 font-medium">Validity Ends</span>
                      <span className="font-semibold text-slate-800">{new Date(details.expiresAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
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
            <CardDescription>Apply a new cryptographic key to upgrade or renew</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700">Activation Token</label>
              <Textarea 
                placeholder="Paste your base64 signature token here..." 
                className="font-mono text-xs min-h-[160px] bg-slate-50 border-slate-200 focus-visible:ring-indigo-500 rounded-xl resize-none"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
              />
              <p className="text-[10px] text-slate-400">Tokens are provided by Proxima Digital upon subscription renewal.</p>
            </div>
            <Button 
              className="w-full h-11 bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-colors font-medium text-sm" 
              onClick={handleApplyLicense} 
              disabled={isApplying || !licenseKey}
            >
              {isApplying ? (
                <><RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> Verifying Token...</>
              ) : (
                'Apply Activation Token'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
