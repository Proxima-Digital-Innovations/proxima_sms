'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { checkLicenseStatus, getLicenseCapacity, activateEnterpriseLicense } from '@/actions/license-actions';
import { 
  Shield, 
  ShieldAlert, 
  Key, 
  CheckCircle, 
  RefreshCcw, 
  Users, 
  Calendar, 
  Tag, 
  AlertTriangle, 
  Clock, 
  Building2,
  Check,
  Copy
} from 'lucide-react';
import { LicenseValidationResult } from '@/lib/license-utils';
import { LicenseCapacityStatus } from '@/lib/services/license-capacity';

export default function LicenseManagementPage() {
  const [licenseKey, setLicenseKey] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [isActivatingEnterprise, setIsActivatingEnterprise] = useState(false);
  const [hasCopiedKey, setHasCopiedKey] = useState(false);
  
  const [licenseData, setLicenseData] = useState<LicenseValidationResult | null>(null);
  const [capacity, setCapacity] = useState<LicenseCapacityStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const [res, capRes] = await Promise.all([
        checkLicenseStatus(),
        getLicenseCapacity()
      ]);
      setLicenseData(res);
      setCapacity(capRes);
    } catch {
      toast({ variant: "destructive", title: "Error", description: 'Failed to load subscription details.' });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleApplyLicense = async () => {
    if (!licenseKey.trim()) {
      toast({ variant: "destructive", title: "Error", description: 'Please enter an activation key.' });
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
        toast({ title: "Success", description: 'Subscription activated successfully.' });
        setLicenseKey('');
        await fetchStatus();
        window.location.reload();
      } else {
        toast({ variant: "destructive", title: 'Activation Failed', description: data.error || 'Failed to verify key.' });
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: 'Failed to apply activation key.' });
    }
    setIsApplying(false);
  };

  const handleQuickActivate = async () => {
    setIsActivatingEnterprise(true);
    try {
      const res = await activateEnterpriseLicense({
        schoolName: 'Proxima International Academy',
        maxStudents: 3000,
        tier: 'ENTERPRISE',
        billingFrequency: 'PER_SESSION'
      });

      if (res.success) {
        toast({ title: "Enterprise License Active", description: 'License renewed for 1 year with 3,000 student capacity.' });
        await fetchStatus();
        window.location.reload();
      } else {
        toast({ variant: "destructive", title: "Activation Error", description: res.message });
      }
    } catch {
      toast({ variant: "destructive", title: "Activation Error", description: 'Failed to trigger enterprise activation.' });
    }
    setIsActivatingEnterprise(false);
  };

  const copyExistingKey = () => {
    if (licenseKey) {
      navigator.clipboard.writeText(licenseKey);
      setHasCopiedKey(true);
      setTimeout(() => setHasCopiedKey(false), 2000);
      toast({ title: "Copied", description: "Activation token copied to clipboard." });
    }
  };

  const status = licenseData?.status || 'UNACTIVATED';
  const details = licenseData?.payload;
  const isExpiringSoon = licenseData?.isExpiringSoon || false;
  const daysUntilExpiry = licenseData?.daysUntilExpiry;
  const formattedExpiryDate = licenseData?.formattedExpiryDate;

  // Calculate validity cycle percentage
  let validityProgress = 100;
  if (details?.issuedAt && details?.expiresAt) {
    const start = new Date(details.issuedAt).getTime();
    const end = new Date(details.expiresAt).getTime();
    const now = Date.now();
    const total = end - start;
    const elapsed = now - start;
    if (total > 0) {
      validityProgress = Math.max(0, Math.min(100, Math.round(((total - elapsed) / total) * 100)));
    }
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Enterprise Subscription</h2>
          <p className="text-muted-foreground mt-1 text-sm">Manage software entitlement, validity timeline, and student capacity</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchStatus} 
            disabled={isLoading}
            className="text-xs"
          >
            <RefreshCcw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Status
          </Button>
          <Button 
            size="sm" 
            onClick={handleQuickActivate} 
            disabled={isActivatingEnterprise}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isActivatingEnterprise ? (
              <RefreshCcw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Key className="w-3.5 h-3.5 mr-1.5" />
            )}
            Re-Issue Enterprise Key
          </Button>
        </div>
      </div>

      {/* --- Pre-Expiry Warning Banner (When 30 or fewer days remain) --- */}
      {status === 'ACTIVE' && isExpiringSoon && (
        <Card className="border-amber-500/40 bg-amber-500/10 shadow-sm overflow-hidden">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  Subscription Expiring Soon
                  <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-300 bg-amber-500/15 text-xs">
                    {daysUntilExpiry} {daysUntilExpiry === 1 ? 'day' : 'days'} left
                  </Badge>
                </h3>
                <p className="text-xs sm:text-sm text-amber-700/90 dark:text-amber-300/80 leading-relaxed">
                  Your enterprise entitlement expires on <strong className="font-semibold text-amber-900 dark:text-amber-100">{formattedExpiryDate}</strong>. 
                  To prevent the portal from entering read-only mode, renew early or generate an updated session key.
                </p>
              </div>
            </div>
            <Button 
              size="sm" 
              onClick={handleQuickActivate}
              disabled={isActivatingEnterprise}
              className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 text-xs shadow-sm"
            >
              Renew Early (1-Year Extension)
            </Button>
          </CardContent>
        </Card>
      )}

      {/* --- Expired Alert Banner --- */}
      {status === 'EXPIRED' && (
        <Card className="border-destructive/40 bg-destructive/10 shadow-sm overflow-hidden">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-destructive/20 text-destructive shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-destructive flex items-center gap-2">
                  Subscription Expired
                  <Badge variant="destructive" className="text-xs">Read-Only Mode Active</Badge>
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Your enterprise license expired on <strong className="text-foreground">{formattedExpiryDate || 'the designated renewal date'}</strong>. 
                  Write mutations, grade submissions, and new admissions are locked. Please renew below to restore full operational access.
                </p>
              </div>
            </div>
            <Button 
              size="sm" 
              onClick={handleQuickActivate}
              disabled={isActivatingEnterprise}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground shrink-0 text-xs shadow-sm"
            >
              Re-Activate Subscription
            </Button>
          </CardContent>
        </Card>
      )}

      {/* --- Unactivated Guidance Banner --- */}
      {status === 'UNACTIVATED' && (
        <Card className="border-amber-500/40 bg-amber-500/10 shadow-sm overflow-hidden">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  System Not Activated
                  <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-300 text-xs">Unregistered</Badge>
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  The local database currently contains no activation key (common after fresh database migrations). 
                  Click below to activate an official Enterprise token with 3,000 student capacity and full write access.
                </p>
              </div>
            </div>
            <Button 
              size="sm" 
              onClick={handleQuickActivate}
              disabled={isActivatingEnterprise}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 text-xs shadow-sm"
            >
              Activate Enterprise License
            </Button>
          </CardContent>
        </Card>
      )}

      {/* --- Student Capacity & Grace Buffer Card --- */}
      {capacity && (
        <Card className="border shadow-sm overflow-hidden bg-card">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <CardTitle className="text-lg">Active Student Capacity & Grace Leeway</CardTitle>
              </div>
              {capacity.zone === 'NORMAL' && (
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-300 w-fit">
                  <CheckCircle className="w-3.5 h-3.5 mr-1" /> Within Regular Limit
                </Badge>
              )}
              {capacity.zone === 'GRACE_BUFFER' && (
                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border-amber-300 w-fit">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1" /> In Grace Buffer (+15% Leeway)
                </Badge>
              )}
              {capacity.zone === 'OVER_CAPACITY' && (
                <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 border-rose-300 w-fit">
                  <ShieldAlert className="w-3.5 h-3.5 mr-1" /> Over Capacity (Hard Stop)
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              Licensed for {capacity.licensedLimit} active students with a +15% soft buffer allowing up to {capacity.graceBufferLimit} students before admission freeze.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs sm:text-sm font-medium">
                <span>Active Enrollment: <strong className="text-foreground">{capacity.activeStudents}</strong> / {capacity.licensedLimit}</span>
                <span className="text-muted-foreground">Grace Ceiling: {capacity.graceBufferLimit} students</span>
              </div>
              <Progress 
                value={Math.min(100, Math.round((capacity.activeStudents / capacity.graceBufferLimit) * 100))} 
                className="h-2.5"
              />
            </div>

            {capacity.zone === 'NORMAL' && (
              <p className="text-xs text-muted-foreground bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>You have <strong>{capacity.availableRegularSlots}</strong> regular slots remaining before entering the grace buffer.</span>
              </p>
            )}

            {capacity.zone === 'GRACE_BUFFER' && (
              <div className="text-xs bg-amber-500/10 p-3 rounded-lg border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  Mid-Term Grace Policy Active
                </p>
                <p className="text-amber-800 dark:text-amber-300">
                  Your school currently has {capacity.activeStudents} active students ({capacity.activeStudents - capacity.licensedLimit} over licensed limit). 
                  Admissions continue without disruption. You have <strong>{capacity.availableGraceSlots}</strong> grace slots remaining. 
                  Your subscription will be reconciled at the next term renewal.
                </p>
              </div>
            )}

            {capacity.zone === 'OVER_CAPACITY' && (
              <div className="text-xs bg-rose-500/10 p-3 rounded-lg border border-rose-500/30 text-rose-900 dark:text-rose-200 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  Hard Grace Buffer Exceeded
                </p>
                <p className="text-rose-800 dark:text-rose-300">
                  Total active students ({capacity.activeStudents}) exceed both your licensed capacity ({capacity.licensedLimit}) and the +15% grace buffer ({capacity.graceBufferLimit}). 
                  New admissions are paused until the license is upgraded.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* --- Main 2-Column Grid: Details & Activation Form --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Subscription & Frequency */}
        <Card className="border shadow-sm overflow-hidden bg-card relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-600"></div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Shield className="w-5 h-5 text-indigo-500" />
              Subscription Entitlement & Timeline
            </CardTitle>
            <CardDescription className="text-xs">Cryptographic verification, billing cycle, and expiration timeline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCcw className="w-6 h-6 animate-spin text-indigo-500" />
              </div>
            ) : (
              <>
                {/* Health & Status Badge Row */}
                <div className="flex items-center justify-between p-3.5 bg-muted/40 rounded-xl border border-border">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">System State</p>
                    <p className="text-sm font-medium text-foreground">{licenseData?.message || 'Ready'}</p>
                  </div>
                  {status === 'ACTIVE' && !isExpiringSoon && (
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300 hover:bg-emerald-500/20">
                      <CheckCircle className="w-3.5 h-3.5 mr-1" /> ACTIVE
                    </Badge>
                  )}
                  {status === 'ACTIVE' && isExpiringSoon && (
                    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300 hover:bg-amber-500/20">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1" /> EXPIRING SOON
                    </Badge>
                  )}
                  {status === 'EXPIRED' && (
                    <Badge variant="destructive">
                      <ShieldAlert className="w-3.5 h-3.5 mr-1" /> EXPIRED
                    </Badge>
                  )}
                  {status === 'UNACTIVATED' && (
                    <Badge variant="outline" className="border-amber-500 text-amber-600">
                      <ShieldAlert className="w-3.5 h-3.5 mr-1" /> UNACTIVATED
                    </Badge>
                  )}
                  {status === 'INVALID' && (
                    <Badge variant="destructive">
                      <ShieldAlert className="w-3.5 h-3.5 mr-1" /> INVALID
                    </Badge>
                  )}
                </div>

                {/* Expiration Timeline Countdown Progress */}
                {details && (
                  <div className="p-3.5 bg-muted/20 rounded-xl border border-border space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground flex items-center gap-1 font-medium">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" /> Subscription Countdown
                      </span>
                      <span className={`font-semibold ${daysUntilExpiry && daysUntilExpiry <= 30 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                        {daysUntilExpiry !== null && daysUntilExpiry !== undefined
                          ? daysUntilExpiry > 0 
                            ? `${daysUntilExpiry} days remaining` 
                            : 'Expired'
                          : 'Indefinite'}
                      </span>
                    </div>
                    <Progress value={validityProgress} className="h-2" />
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>Issued: {new Date(details.issuedAt).toLocaleDateString()}</span>
                      <span>Expires: {formattedExpiryDate || new Date(details.expiresAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                )}

                {/* Detailed Key Value Entitlements */}
                {details ? (
                  <div className="divide-y divide-border text-xs sm:text-sm">
                    <div className="flex justify-between items-center py-2.5">
                      <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" /> Organization
                      </span>
                      <span className="font-semibold text-foreground">{details.schoolName}</span>
                    </div>
                    <div className="flex justify-between items-center py-2.5">
                      <span className="text-muted-foreground font-medium">Subscription Tier</span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md text-xs">
                        {details.tier}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2.5">
                      <span className="text-muted-foreground font-medium">Payment Frequency</span>
                      <Badge variant="outline" className="font-medium text-xs border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
                        {details.billingFrequency === 'PER_SESSION' ? 'Per Session (Annual)' : 'Per Term (Termly)'}
                      </Badge>
                    </div>
                    {(details.discountPercent ?? 0) > 0 && (
                      <div className="flex justify-between items-center py-2.5">
                        <span className="text-muted-foreground font-medium">Prepayment Discount</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md text-xs flex items-center gap-1">
                          <Tag className="w-3 h-3" /> {details.discountPercent}% Upfront Incentive
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-2.5">
                      <span className="text-muted-foreground font-medium">Licensed Student Limit</span>
                      <span className="font-semibold text-foreground">{details.maxStudents} Students (+15% Buffer)</span>
                    </div>
                    <div className="flex justify-between items-center py-2.5">
                      <span className="text-muted-foreground font-medium">Validity Ends</span>
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        {formattedExpiryDate || new Date(details.expiresAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center space-y-3 bg-muted/10 rounded-xl border border-dashed border-border">
                    <p className="text-xs text-muted-foreground">
                      No entitlement payload decoded yet. Please paste a cryptographic token or click Re-Issue Enterprise Key to activate.
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Activate or Renew */}
        <Card className="border shadow-sm bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Key className="w-5 h-5 text-indigo-500" />
              Apply Activation Token
            </CardTitle>
            <CardDescription className="text-xs">Apply a new cryptographic token to upgrade tier, extend validity, or renew subscription</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">Activation Token</label>
                {licenseKey && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={copyExistingKey} 
                    className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    {hasCopiedKey ? <Check className="w-3 h-3 mr-1 text-emerald-500" /> : <Copy className="w-3 h-3 mr-1" />}
                    Copy
                  </Button>
                )}
              </div>
              <Textarea 
                placeholder="Paste your base64 cryptographic license signature token here..." 
                className="font-mono text-xs min-h-[140px] bg-background border-border focus-visible:ring-indigo-500 rounded-xl resize-none"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Tokens are cryptographically signed with RSA-2048 and contain school name, capacity, and valid expiration date.
              </p>
            </div>

            <Button 
              className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium text-xs shadow-sm" 
              onClick={handleApplyLicense} 
              disabled={isApplying || !licenseKey.trim()}
            >
              {isApplying ? (
                <>
                  <RefreshCcw className="w-4 h-4 mr-2 animate-spin" />
                  Verifying Cryptographic Signature...
                </>
              ) : (
                'Apply Subscription Token'
              )}
            </Button>

            <div className="pt-3 border-t border-border">
              <p className="text-xs font-semibold text-foreground mb-2">Automated Enterprise Provisioning</p>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                For administrative setups and development verification, you can generate and apply a full 1-year Enterprise key with 3,000 student capacity in one click.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleQuickActivate}
                disabled={isActivatingEnterprise}
                className="w-full text-xs border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10"
              >
                {isActivatingEnterprise ? (
                  <>
                    <RefreshCcw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Generating Key...
                  </>
                ) : (
                  <>
                    <Key className="w-3.5 h-3.5 mr-1.5" />
                    Generate & Apply 1-Year Enterprise Key
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
