'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Mail,
  MessageSquare,
  Server,
  ShieldCheck,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Users,
  Terminal,
  ExternalLink,
  Info,
  Radio
} from 'lucide-react';
import {
  getCommSettings,
  saveCommSettings,
  testEmailConfig,
  testWhatsAppConfig,
  getCommunicationsOverview
} from '@/actions/system-comm-actions';
import { CommConfig, SmtpSettings, WhatsAppSettings } from '@/lib/services/comm-engine';

export default function CommunicationsSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Stats
  const [overview, setOverview] = useState<{
    parentsCount: number;
    staffCount: number;
    blastsCount: number;
    activeStudents: number;
  }>({ parentsCount: 0, staffCount: 0, blastsCount: 0, activeStudents: 0 });

  // Form State
  const [emailProvider, setEmailProvider] = useState<'SMTP' | 'RESEND'>('SMTP');

  const [smtp, setSmtp] = useState<SmtpSettings>({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    user: '',
    pass: '',
    fromName: 'Proxima SMS Academy',
    fromEmail: '',
  });

  const [resendApiKey, setResendApiKey] = useState('');
  const [resendFromEmail, setResendFromEmail] = useState('onboarding@resend.dev');

  const [whatsapp, setWhatsapp] = useState<WhatsAppSettings>({
    enabled: false,
    gatewayType: 'EVOLUTION_API',
    apiUrl: 'http://localhost:8080',
    apiKey: '',
    instanceName: 'school-alerts',
  });

  // Diagnostics State
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [emailTestStatus, setEmailTestStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [testingWhatsApp, setTestingWhatsApp] = useState(false);
  const [whatsappTestStatus, setWhatsappTestStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [settingsRes, overviewRes] = await Promise.all([
          getCommSettings(),
          getCommunicationsOverview(),
        ]);

        if (settingsRes.success && settingsRes.config) {
          const cfg = settingsRes.config;
          setEmailProvider(cfg.emailProvider || 'SMTP');

          if (cfg.smtp) {
            setSmtp(cfg.smtp);
            if (cfg.smtp.fromEmail) {
              setTestEmailAddress(cfg.smtp.fromEmail);
            }
          }

          if (cfg.resend) {
            setResendApiKey(cfg.resend.apiKey || '');
            setResendFromEmail(cfg.resend.fromEmail || 'onboarding@resend.dev');
          }

          if (cfg.whatsapp) {
            setWhatsapp(cfg.whatsapp);
          }
        }

        if (overviewRes.success) {
          setOverview({
            parentsCount: overviewRes.parentsCount,
            staffCount: overviewRes.staffCount,
            blastsCount: overviewRes.blastsCount,
            activeStudents: overviewRes.activeStudents,
          });
        }
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Initialization Error',
          description: err.message || 'Failed to load communications configuration.',
        });
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [toast]);

  // Quick Preset Handlers
  const applyGmailPreset = () => {
    setSmtp(prev => ({
      ...prev,
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
    }));
    toast({
      title: 'Gmail Preset Loaded',
      description: 'Configured for smtp.gmail.com on Port 465 (SSL/TLS). Note: Use a 16-character Google App Password.',
    });
  };

  const applyCpanelPreset = () => {
    setSmtp(prev => ({
      ...prev,
      host: 'mail.yourdomain.com',
      port: 465,
      secure: true,
    }));
    toast({
      title: 'cPanel Preset Loaded',
      description: 'Configured standard SSL port 465. Replace host with your webmail server hostname.',
    });
  };

  const applyPostalPreset = () => {
    setSmtp(prev => ({
      ...prev,
      host: 'postal.yourserver.com',
      port: 587,
      secure: false,
    }));
    toast({
      title: 'Postal / Mailcow Preset Loaded',
      description: 'Configured standard submission port 587 with STARTTLS.',
    });
  };

  // Save Settings
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: CommConfig = {
        emailProvider,
        smtp,
        resend: {
          apiKey: resendApiKey,
          fromEmail: resendFromEmail,
        },
        whatsapp,
      };

      const res = await saveCommSettings(payload);
      if (res.success) {
        toast({
          title: 'Configuration Saved',
          description: 'Communication engine settings and gateway credentials have been updated.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Save Failed',
          description: res.error || 'Could not save configuration.',
        });
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'An unexpected error occurred.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Test SMTP
  const handleTestEmail = async () => {
    if (!testEmailAddress || !testEmailAddress.includes('@')) {
      toast({
        variant: 'destructive',
        title: 'Invalid Email',
        description: 'Please input a valid destination email address for testing.',
      });
      return;
    }

    setTestingEmail(true);
    setEmailTestStatus(null);
    try {
      const res = await testEmailConfig(smtp, testEmailAddress);
      setEmailTestStatus(res);
      if (res.success) {
        toast({
          title: 'Verification Successful',
          description: res.message,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Handshake Failed',
          description: res.message,
        });
      }
    } catch (err: any) {
      setEmailTestStatus({ success: false, message: err.message || 'Handshake failed.' });
    } finally {
      setTestingEmail(false);
    }
  };

  // Test WhatsApp
  const handleTestWhatsApp = async () => {
    if (!testPhoneNumber) {
      toast({
        variant: 'destructive',
        title: 'Phone Required',
        description: 'Please provide a test recipient phone number.',
      });
      return;
    }

    setTestingWhatsApp(true);
    setWhatsappTestStatus(null);
    try {
      const res = await testWhatsAppConfig(whatsapp, testPhoneNumber);
      setWhatsappTestStatus(res);
      if (res.success) {
        toast({
          title: 'WhatsApp Dispatched',
          description: res.message,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Dispatch Failed',
          description: res.message,
        });
      }
    } catch (err: any) {
      setWhatsappTestStatus({ success: false, message: err.message || 'WhatsApp diagnostic failed.' });
    } finally {
      setTestingWhatsApp(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading communication engine configurations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Communications & Gateway Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure open-source SMTP, Resend fallback, and self-hosted WhatsApp gateways for broadcasts and transactional receipts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            Save All Configurations
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Guardian Directory</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.parentsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Active parent contacts on file</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Faculty & Staff</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.staffCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Active staff members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Broadcasts</CardTitle>
            <Radio className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.blastsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Historical message blasts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Active Engine Mode</CardTitle>
            <Server className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={emailProvider === 'SMTP' ? 'default' : 'secondary'} className="font-semibold">
                {emailProvider}
              </Badge>
              {whatsapp.enabled && (
                <Badge variant="outline" className="border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold">
                  WA Active
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {emailProvider === 'SMTP' ? 'Zero-Cost Free SMTP Relay' : 'Cloud API Gateway'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="email" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email (SMTP / Resend)
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            WhatsApp Gateway
          </TabsTrigger>
        </TabsList>

        {/* --- TAB 1: EMAIL CONFIGURATION --- */}
        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Email Delivery Strategy</CardTitle>
                  <CardDescription>
                    Select whether the institution dispatches emails through native open-source SMTP (Nodemailer) or Resend API.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${emailProvider === 'SMTP' ? 'text-primary' : 'text-muted-foreground'}`}>
                    Open-Source SMTP
                  </span>
                  <Switch
                    checked={emailProvider === 'RESEND'}
                    onCheckedChange={(checked) => setEmailProvider(checked ? 'RESEND' : 'SMTP')}
                  />
                  <span className={`text-sm font-medium ${emailProvider === 'RESEND' ? 'text-primary' : 'text-muted-foreground'}`}>
                    Resend API
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {emailProvider === 'SMTP' ? (
                <div className="space-y-6">
                  {/* Preset Buttons */}
                  <div className="bg-muted/40 p-4 rounded-lg border border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Quick Connection Presets
                      </Label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={applyGmailPreset}
                        className="text-xs"
                      >
                        Google Workspace / Gmail (SSL 465)
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={applyCpanelPreset}
                        className="text-xs"
                      >
                        cPanel / Webmail (SSL 465)
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={applyPostalPreset}
                        className="text-xs"
                      >
                        Postal / Mailcow (TLS 587)
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Pro Tip: Free Gmail works with any standard Google account. Simply enable 2-Step Verification in Google Account Settings, generate a 16-character App Password, and paste it below. No credit card or paid SaaS subscription required.
                    </p>
                  </div>

                  {/* SMTP Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="smtp-host">SMTP Host</Label>
                      <Input
                        id="smtp-host"
                        placeholder="e.g. smtp.gmail.com or mail.school.edu"
                        value={smtp.host}
                        onChange={(e) => setSmtp({ ...smtp, host: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="smtp-port">Port</Label>
                        <Input
                          id="smtp-port"
                          type="number"
                          placeholder="465"
                          value={smtp.port}
                          onChange={(e) => setSmtp({ ...smtp, port: parseInt(e.target.value) || 465 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="smtp-secure">Encryption</Label>
                        <Select
                          value={smtp.secure ? 'SSL' : 'STARTTLS'}
                          onValueChange={(v) => setSmtp({ ...smtp, secure: v === 'SSL' })}
                        >
                          <SelectTrigger id="smtp-secure">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SSL">SSL/TLS (Port 465)</SelectItem>
                            <SelectItem value="STARTTLS">STARTTLS (Port 587)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="smtp-user">Username / Email Address</Label>
                      <Input
                        id="smtp-user"
                        placeholder="bursary@school.edu or user@gmail.com"
                        value={smtp.user}
                        onChange={(e) => setSmtp({ ...smtp, user: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="smtp-pass">Password / App Password</Label>
                      <Input
                        id="smtp-pass"
                        type="password"
                        placeholder="App Password or SMTP password"
                        value={smtp.pass}
                        onChange={(e) => setSmtp({ ...smtp, pass: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="from-name">Sender Display Name</Label>
                      <Input
                        id="from-name"
                        placeholder="e.g. Proxima SMS Academy"
                        value={smtp.fromName}
                        onChange={(e) => setSmtp({ ...smtp, fromName: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="from-email">Sender Email Address (From)</Label>
                      <Input
                        id="from-email"
                        placeholder="bursary@school.edu"
                        value={smtp.fromEmail}
                        onChange={(e) => setSmtp({ ...smtp, fromEmail: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Diagnostic Test Box */}
                  <div className="border border-border rounded-lg p-5 bg-card space-y-4">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-primary" />
                      <h4 className="font-semibold text-sm">SMTP Handshake Diagnostic</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Verify authentication credentials and test round-trip delivery without altering production state.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Input
                        placeholder="Recipient test email (e.g. your email)"
                        value={testEmailAddress}
                        onChange={(e) => setTestEmailAddress(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleTestEmail}
                        disabled={testingEmail}
                        className="flex items-center gap-2 whitespace-nowrap"
                      >
                        {testingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Send Verification Email
                      </Button>
                    </div>

                    {emailTestStatus && (
                      <div
                        className={`p-3 rounded-md text-xs flex items-start gap-2 ${
                          emailTestStatus.success
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                            : 'bg-destructive/10 border border-destructive/20 text-destructive'
                        }`}
                      >
                        {emailTestStatus.success ? (
                          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        )}
                        <span>{emailTestStatus.message}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Resend Configuration */
                <div className="space-y-5">
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-300 text-xs leading-relaxed space-y-1">
                    <div className="font-semibold flex items-center gap-1.5">
                      <Info className="w-4 h-4" />
                      Resend Sandbox Notice
                    </div>
                    <p>
                      Using `onboarding@resend.dev` restricts message dispatch to the verified account owner email address. To send broadcasts to the 80 guardians in the database via Resend, verify your custom domain in the Resend console or use the open-source SMTP option above.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="resend-api-key">Resend API Key</Label>
                      <Input
                        id="resend-api-key"
                        type="password"
                        placeholder="re_xxxxxxxxxxxx"
                        value={resendApiKey}
                        onChange={(e) => setResendApiKey(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="resend-from-email">Sender Email (From)</Label>
                      <Input
                        id="resend-from-email"
                        placeholder="onboarding@resend.dev or alerts@yourdomain.com"
                        value={resendFromEmail}
                        onChange={(e) => setResendFromEmail(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- TAB 2: WHATSAPP GATEWAY (OPEN-SOURCE) --- */}
        <TabsContent value="whatsapp" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Open-Source WhatsApp Gateway</CardTitle>
                  <CardDescription>
                    Connect self-hosted open-source gateways like Evolution API or WAHA to transmit automated fee receipts and school alerts via WhatsApp without per-message Twilio fees.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Label htmlFor="wa-toggle" className="text-sm font-medium">
                    {whatsapp.enabled ? 'Enabled' : 'Disabled'}
                  </Label>
                  <Switch
                    id="wa-toggle"
                    checked={whatsapp.enabled}
                    onCheckedChange={(checked) => setWhatsapp({ ...whatsapp, enabled: checked })}
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Architecture Info Callout */}
              <div className="bg-muted/40 p-4 rounded-lg border border-border space-y-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Zero-Cost Deployment (Docker 1-Command Setup)
                  </h4>
                </div>
                <div className="font-mono text-xs bg-black/90 text-green-400 p-3 rounded overflow-x-auto">
                  docker run -d --name evolution-api -p 8080:8080 -e AUTHENTICATION_API_KEY=my_secure_key atendai/evolution-api:v1.8.2
                </div>
                <p className="text-xs text-muted-foreground">
                  Evolution API and WAHA (WhatsApp HTTP API) run directly on your school server or any 5 dollar VPS. Scan your school phone WhatsApp QR code once, and all system broadcasts and transactional receipts deliver instantly with 0 charges.
                </p>
              </div>

              {/* Gateway Settings Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gateway-type">Gateway Technology</Label>
                  <Select
                    value={whatsapp.gatewayType}
                    onValueChange={(val: any) => setWhatsapp({ ...whatsapp, gatewayType: val })}
                  >
                    <SelectTrigger id="gateway-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EVOLUTION_API">Evolution API (Recommended)</SelectItem>
                      <SelectItem value="WAHA">WAHA (WhatsApp HTTP API)</SelectItem>
                      <SelectItem value="GENERIC_WEBHOOK">Custom Webhook (n8n / Node-RED)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wa-url">API Endpoint URL</Label>
                  <Input
                    id="wa-url"
                    placeholder="e.g. http://localhost:8080 or https://wa.school.edu"
                    value={whatsapp.apiUrl}
                    onChange={(e) => setWhatsapp({ ...whatsapp, apiUrl: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wa-key">API Key / Access Token</Label>
                  <Input
                    id="wa-key"
                    type="password"
                    placeholder="API authentication token"
                    value={whatsapp.apiKey || ''}
                    onChange={(e) => setWhatsapp({ ...whatsapp, apiKey: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wa-instance">Instance / Session Identifier</Label>
                  <Input
                    id="wa-instance"
                    placeholder="e.g. school-alerts or default"
                    value={whatsapp.instanceName || ''}
                    onChange={(e) => setWhatsapp({ ...whatsapp, instanceName: e.target.value })}
                  />
                </div>
              </div>

              {/* Diagnostic Test Box */}
              <div className="border border-border rounded-lg p-5 bg-card space-y-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h4 className="font-semibold text-sm">WhatsApp Gateway Diagnostic</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  Send a test ping to verify socket connectivity with your WhatsApp device instance.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    placeholder="Recipient phone (e.g. 08012345678 or 2348012345678)"
                    value={testPhoneNumber}
                    onChange={(e) => setTestPhoneNumber(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleTestWhatsApp}
                    disabled={testingWhatsApp}
                    className="flex items-center gap-2 whitespace-nowrap"
                  >
                    {testingWhatsApp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send Test Message
                  </Button>
                </div>

                {whatsappTestStatus && (
                  <div
                    className={`p-3 rounded-md text-xs flex items-start gap-2 ${
                      whatsappTestStatus.success
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                        : 'bg-destructive/10 border border-destructive/20 text-destructive'
                    }`}
                  >
                    {whatsappTestStatus.success ? (
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    )}
                    <span>{whatsappTestStatus.message}</span>
                  </div>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex justify-between border-t border-border p-6 bg-muted/10">
              <span className="text-xs text-muted-foreground">
                Phone numbers are automatically converted to international E.164 standard (e.g. Nigerian numbers 080... to 23480...).
              </span>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Settings'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
