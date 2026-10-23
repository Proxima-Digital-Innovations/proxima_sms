'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRole } from '@/context/role-context';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Wallet,
  Award,
  BookOpen,
  Calendar,
  Menu,
  FileSpreadsheet,
  GraduationCap,
  Building2,
  Presentation,
  CheckSquare,
} from 'lucide-react';

interface NavShortcut {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user, role, activeModules } = useRole();
  const { openMobile, setOpenMobile } = useSidebar();

  const hasTertiary =
    (user as any)?.isTertiaryStudent !== undefined
      ? Boolean((user as any).isTertiaryStudent)
      : !activeModules || activeModules.includes('TERTIARY_INSTITUTION');

  const getShortcutsForRole = (r: string | null): NavShortcut[] => {
    switch (r) {
      case 'STUDENT':
        return hasTertiary
          ? [
              { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
              { label: 'Courses', href: '/dashboard/tertiary/registration', icon: BookOpen },
              { label: 'Fees', href: '/dashboard/tertiary/payments', icon: Wallet },
              { label: 'Hostel', href: '/dashboard/hostels/booking', icon: Building2 },
            ]
          : [
              { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
              { label: 'Results', href: '/dashboard/performance', icon: Award },
              { label: 'Schedule', href: '/dashboard/timetable', icon: Calendar },
              { label: 'e-Library', href: '/dashboard/elibrary', icon: BookOpen },
            ];
      case 'PARENT':
        return [
          { label: 'Portal', href: '/dashboard', icon: LayoutDashboard },
          { label: 'Invoices', href: '/dashboard/parent/invoices', icon: Wallet },
          { label: 'Wallet', href: '/dashboard/parent/wallet', icon: FileSpreadsheet },
          { label: 'Results', href: '/dashboard/parent/results', icon: Award },
        ];
      case 'ACCOUNTANT':
        return [
          { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
          { label: 'Invoices', href: '/dashboard/finance/invoices', icon: FileSpreadsheet },
          { label: 'Payments', href: '/dashboard/finance/payments', icon: Wallet },
          { label: 'Fees', href: '/dashboard/finance/fee-structures', icon: GraduationCap },
        ];
      case 'LECTURER':
        return [
          { label: 'Studio', href: '/dashboard', icon: Presentation },
          { label: 'Offerings', href: '/dashboard/tertiary/offerings', icon: BookOpen },
          { label: 'CBT', href: '/dashboard/tertiary/cbt', icon: CheckSquare },
          { label: 'Grading', href: '/dashboard/tertiary/exams', icon: Award },
        ];
      case 'TEACHER':
      case 'EXAM_OFFICER':
      case 'HOD':
        return [
          { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
          { label: 'Scores', href: '/dashboard/scores/enter', icon: FileSpreadsheet },
          { label: 'Results', href: '/dashboard/results/view', icon: Award },
          { label: 'Students', href: '/dashboard/students', icon: Users },
        ];
      default:
        // ADMIN, SUPER_ADMIN, SLT, STAFF
        return [
          { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
          { label: 'Students', href: '/dashboard/students', icon: Users },
          { label: 'Finance', href: '/dashboard/finance/invoices', icon: Wallet },
          { label: 'Results', href: '/dashboard/results/view', icon: Award },
        ];
    }
  };

  const shortcuts = getShortcutsForRole(role);

  return (
    <nav
      aria-label="Mobile Primary Navigation"
      className="lg:hidden print-hidden fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur-md border-t border-border safe-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
    >
      <div className="grid grid-cols-5 h-16 max-w-lg mx-auto px-1">
        {shortcuts.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpenMobile(false)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 min-h-[44px] min-w-[44px] rounded-xl my-1 transition-colors relative',
                isActive
                  ? 'text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {isActive && (
                <span className="absolute top-0.5 w-6 h-0.5 rounded-full bg-primary" />
              )}
              <Icon className={cn('w-5 h-5 shrink-0', isActive && 'text-primary')} />
              <span className="text-[10px] leading-tight truncate max-w-[64px]">
                {item.label}
              </span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setOpenMobile(!openMobile)}
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 min-h-[44px] min-w-[44px] rounded-xl my-1 transition-colors cursor-pointer',
            openMobile
              ? 'text-primary font-semibold bg-primary/10'
              : 'text-muted-foreground hover:text-foreground'
          )}
          aria-label="Toggle Navigation Drawer"
        >
          <Menu className="w-5 h-5 shrink-0" />
          <span className="text-[10px] leading-tight">Menu</span>
        </button>
      </div>
    </nav>
  );
}
