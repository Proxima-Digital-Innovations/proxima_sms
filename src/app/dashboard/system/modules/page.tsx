'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/context/role-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  getInstitutionalModulesAction,
  toggleModuleAction,
  applyModulePresetAction,
} from '@/actions/module-actions';
import { 
  GraduationCap, 
  School, 
  BookOpen, 
  Wallet, 
  Users, 
  Fingerprint, 
  FileText, 
  HelpCircle,
  Building,
  Layers,
  CheckCircle2,
  RefreshCw,
  Loader2,
  ShieldCheck,
  Sparkles,
  Check
} from 'lucide-react';

const iconComponents: Record<string, any> = {
  GraduationCap,
  School,
  BookOpen,
  Wallet,
  Users,
  Fingerprint,
  FileText,
  HelpCircle,
  Building,
};

export default function ModulesConfigPage() {
  const router = useRouter();
  const { setActiveModules: setGlobalActiveModules } = useRole();
  const [modules, setModules] = useState<any[]>([]);
  const [presets, setPresets] = useState<Record<string, any>>({});
  const [activeModules, setActiveModules] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadModules = async () => {
    setIsLoading(true);
    const res = await getInstitutionalModulesAction();
    if (res.success) {
      setModules(res.available);
      setActiveModules(res.activeModules);
      if (res.presets) setPresets(res.presets);
      setGlobalActiveModules?.(res.activeModules);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadModules();
  }, []);

  const handleToggle = (moduleId: string, currentState: boolean) => {
    const nextState = !currentState;
    setTogglingId(moduleId);

    startTransition(async () => {
      const res = await toggleModuleAction(moduleId, nextState);
      if (res.success && res.activeModules) {
        setActiveModules(res.activeModules);
        setGlobalActiveModules?.(res.activeModules);
        router.refresh();
        toast({
          title: nextState ? 'Module Enabled' : 'Module Disabled',
          description: `Institutional navigation and permissions updated.`,
        });
      } else {
        toast({
          title: 'Update Failed',
          description: res.error || 'Failed to update module state',
          variant: 'destructive',
        });
      }
      setTogglingId(null);
    });
  };

  const handleApplyPreset = (presetKey: 'PRIMARY_SECONDARY' | 'TERTIARY' | 'ALL_INCLUSIVE') => {
    startTransition(async () => {
      const res = await applyModulePresetAction(presetKey);
      if (res.success && res.activeModules) {
        setActiveModules(res.activeModules);
        setGlobalActiveModules?.(res.activeModules);
        router.refresh();
        toast({
          title: 'Preset Configuration Applied',
          description: `Switched operational configuration to ${presets[presetKey]?.name || presetKey}.`,
        });
      } else {
        toast({
          title: 'Failed to Apply Preset',
          description: res.error || 'Could not update modules',
          variant: 'destructive',
        });
      }
    });
  };

  const isPrimarySecondaryActive =
    activeModules.includes('SECONDARY_SCHOOL') && !activeModules.includes('TERTIARY_INSTITUTION');
  const isTertiaryActive =
    activeModules.includes('TERTIARY_INSTITUTION') && !activeModules.includes('SECONDARY_SCHOOL');
  const isMultiTierActive =
    activeModules.includes('SECONDARY_SCHOOL') && activeModules.includes('TERTIARY_INSTITUTION');

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Modular Architecture Engine</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Activate or deactivate operational domains. When running only Primary & Secondary Schools, TIMS university modules are cleanly decoupled.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={loadModules} disabled={isLoading} className="rounded-xl">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Sync State
          </Button>
          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs px-3 py-1 font-mono">
            {activeModules.length} Active / {modules.length} Total
          </Badge>
        </div>
      </div>

      {/* Instant Institutional Presets */}
      <Card className="border border-border/80 bg-muted/20 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <h2 className="text-base font-bold text-foreground">Institutional Operation Presets (1-Click Setup)</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Select your institutional tier to automatically configure the recommended academic, attendance, and assessment engines.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Preset 1: Primary & Secondary */}
          <div
            onClick={() => !isPending && handleApplyPreset('PRIMARY_SECONDARY')}
            className={`cursor-pointer p-4 rounded-xl border transition-all text-left flex flex-col justify-between ${
              isPrimarySecondaryActive
                ? 'border-emerald-500 bg-emerald-500/10 shadow-sm'
                : 'border-border/80 bg-card hover:border-primary/50'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                  <School className="h-4 w-4 text-emerald-600" />
                  Primary & Secondary School (K-12)
                </div>
                {isPrimarySecondaryActive && (
                  <Badge className="bg-emerald-600 text-white text-[10px] gap-1 px-2 py-0.5">
                    <Check className="h-3 w-3" /> Active Mode
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                Nursery, Primary, and Junior/Senior Secondary classes, Continuous Assessment (CA 1/2), terminal broadsheets, report cards, and student attendance.
              </p>
            </div>
            <Button
              size="sm"
              variant={isPrimarySecondaryActive ? 'default' : 'outline'}
              className="w-full text-xs rounded-lg mt-2"
              disabled={isPending || isPrimarySecondaryActive}
            >
              {isPrimarySecondaryActive ? 'Currently Active' : 'Switch to Primary & Secondary'}
            </Button>
          </div>

          {/* Preset 2: Tertiary TIMS */}
          <div
            onClick={() => !isPending && handleApplyPreset('TERTIARY')}
            className={`cursor-pointer p-4 rounded-xl border transition-all text-left flex flex-col justify-between ${
              isTertiaryActive
                ? 'border-indigo-500 bg-indigo-500/10 shadow-sm'
                : 'border-border/80 bg-card hover:border-primary/50'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                  <GraduationCap className="h-4 w-4 text-indigo-600" />
                  Tertiary Institution (TIMS)
                </div>
                {isTertiaryActive && (
                  <Badge className="bg-indigo-600 text-white text-[10px] gap-1 px-2 py-0.5">
                    <Check className="h-3 w-3" /> Active Mode
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                Universities, Polytechnics & Colleges: Degree programs, course registration, JAMB CAPS admissions, Senate broadsheets, and GPA/CGPA grading.
              </p>
            </div>
            <Button
              size="sm"
              variant={isTertiaryActive ? 'default' : 'outline'}
              className="w-full text-xs rounded-lg mt-2"
              disabled={isPending || isTertiaryActive}
            >
              {isTertiaryActive ? 'Currently Active' : 'Switch to Tertiary TIMS'}
            </Button>
          </div>

          {/* Preset 3: Multi-Tier Campus */}
          <div
            onClick={() => !isPending && handleApplyPreset('ALL_INCLUSIVE')}
            className={`cursor-pointer p-4 rounded-xl border transition-all text-left flex flex-col justify-between ${
              isMultiTierActive
                ? 'border-blue-500 bg-blue-500/10 shadow-sm'
                : 'border-border/80 bg-card hover:border-primary/50'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                  <Layers className="h-4 w-4 text-blue-600" />
                  Dual / Multi-Tier Campus
                </div>
                {isMultiTierActive && (
                  <Badge className="bg-blue-600 text-white text-[10px] gap-1 px-2 py-0.5">
                    <Check className="h-3 w-3" /> Active Mode
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                Enables both Basic Education (K-12) and Higher Education (TIMS) on a single unified multi-campus deployment.
              </p>
            </div>
            <Button
              size="sm"
              variant={isMultiTierActive ? 'default' : 'outline'}
              className="w-full text-xs rounded-lg mt-2"
              disabled={isPending || isMultiTierActive}
            >
              {isMultiTierActive ? 'Currently Active' : 'Enable All Modules'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Granular Module Switches */}
      {isLoading ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((mod) => {
            const Icon = iconComponents[mod.icon] || Layers;
            const isEnabled = activeModules.includes(mod.id);
            const isCurrentlyToggling = togglingId === mod.id && isPending;

            return (
              <Card 
                key={mod.id} 
                className={`transition-all duration-200 border rounded-2xl flex flex-col justify-between ${
                  isEnabled 
                    ? 'border-primary/40 bg-card shadow-sm' 
                    : 'border-border/60 bg-muted/30 opacity-75'
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className={`p-3 rounded-xl ${isEnabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <Switch
                      checked={isEnabled}
                      disabled={isCurrentlyToggling}
                      onCheckedChange={() => handleToggle(mod.id, isEnabled)}
                      aria-label={`Toggle ${mod.name}`}
                    />
                  </div>
                  <CardTitle className="text-lg font-bold text-foreground mt-3 flex items-center gap-2">
                    {mod.name}
                  </CardTitle>
                  <CardDescription className="text-xs line-clamp-3 mt-1">
                    {mod.description}
                  </CardDescription>
                </CardHeader>

                <CardFooter className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-mono uppercase tracking-wider text-[10px]">
                    {mod.category}
                  </span>
                  <div className="flex items-center gap-1.5 font-medium">
                    {isEnabled ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Enabled & Live
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Disabled</span>
                    )}
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Governance & Compliance Alert */}
      <div className="p-4 rounded-xl border border-border bg-muted/40 flex items-center gap-3 text-xs text-muted-foreground">
        <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
        <span>
          Enabling or disabling modules takes effect instantly across all user sessions and active sub-navigation trees without requiring system restarts.
        </span>
      </div>
    </div>
  );
}
