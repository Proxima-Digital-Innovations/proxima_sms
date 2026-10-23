'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/context/role-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getInstitutionalModulesAction, toggleModuleAction } from '@/actions/module-actions';
import { 
  GraduationCap, 
  School, 
  BookOpen, 
  Wallet, 
  Users, 
  Fingerprint, 
  FileText, 
  HelpCircle,
  Layers,
  CheckCircle2,
  RefreshCw,
  Loader2,
  ShieldCheck
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
};

export default function ModulesConfigPage() {
  const router = useRouter();
  const { setActiveModules: setGlobalActiveModules } = useRole();
  const [modules, setModules] = useState<any[]>([]);
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
            Activate or deactivate operational domains. Inactive modules are cleanly decoupled from the navigation, student portals, and grading pipelines.
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
