'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Check, Sparkles } from 'lucide-react';
import { getDemoPersonas, DemoPersona } from '@/actions/demo-auth-actions';
import { useRole } from '@/context/role-context';
import { useRouter } from 'next/navigation';

export function DemoRoleSwitcher() {
  const [personas, setPersonas] = useState<DemoPersona[]>([]);
  const { role } = useRole();
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const res = await getDemoPersonas();
      if (res.success && res.personas) {
        setPersonas(res.personas);
      }
    }
    load();
  }, []);

  const currentPersona = personas.find((p) => p.role === role) || {
    role: role || 'ADMIN',
    label: role || 'Administrator',
    badgeColor: 'bg-primary/10 text-primary border-primary/20',
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-2 sm:px-2.5 gap-1.5 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 text-xs font-medium shrink-0"
          title={`Switch Role (${currentPersona.label})`}
        >
          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="hidden lg:inline">Role Sandbox:</span>
          <span className="hidden sm:inline font-bold text-primary max-w-[100px] truncate">{currentPersona.label}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] sm:w-80 max-w-80 p-2 shadow-xl max-h-[75dvh] overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between text-xs pb-1">
          <span className="font-bold">Institutional Personas</span>
          <Badge variant="outline" className="text-[10px] font-mono">
            Demo Sandbox
          </Badge>
        </DropdownMenuLabel>
        <p className="text-[11px] text-muted-foreground px-2 pb-2">
          Switch institutional perspectives to test course registrations, Senate broadsheets, blind exam grading, and degree clearances.
        </p>

        <DropdownMenuSeparator />

        <div className="space-y-1 py-1">
          {personas.map((p) => {
            const isCurrent = p.role === role;
            return (
              <DropdownMenuItem
                key={p.role}
                onClick={() => {
                  router.push(`/login?email=${encodeURIComponent(p.email)}&callbackUrl=/dashboard`);
                }}
                className={`p-2 rounded-lg cursor-pointer flex flex-col items-start gap-1 ${
                  isCurrent ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs text-foreground">{p.label}</span>
                    {isCurrent && <Check className="h-3.5 w-3.5 text-primary" />}
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${p.badgeColor}`}>
                    {p.role}
                  </Badge>
                </div>

                <p className="text-[10px] text-muted-foreground line-clamp-2">
                  {p.description}
                </p>

                <div className="text-[9px] font-mono text-slate-500 mt-0.5 truncate max-w-full">
                  Account: {p.email}
                </div>
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
