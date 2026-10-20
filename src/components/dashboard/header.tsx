'use client';

import { Bell, ChevronDown, User as UserIcon, LogOut, Moon, Sun, Search, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRole } from '@/context/role-context';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/context/theme-context';
import { useSidebar } from '@/components/ui/sidebar';
import Link from 'next/link';
import { NotificationBell } from './notifications/notification-bell';
import { Input } from '@/components/ui/input';
import { GlobalSearch } from './global-search';

const PAGE_TITLES: { [key: string]: string } = {
    '/dashboard': 'Dashboard Overview',
    '/dashboard/staff': 'Staff Management',
    '/dashboard/students': 'Student Directory',
    '/dashboard/system/departments': 'Departments',
    '/dashboard/system/subjects': 'Subjects',
    '/dashboard/system/classes': 'Classes',
    '/dashboard/system/academic-years': 'Academic Years',
    '/dashboard/system': 'System Configuration',
    '/dashboard/analytics': 'Analytics & Reports',
    '/dashboard/lesson-notes': 'Lesson Notes',
    '/dashboard/behavioural': 'Behavioural Tracking',
    '/dashboard/messaging': 'Communications Hub',
    '/dashboard/inventory': 'Asset & Inventory',
    '/dashboard/finance/fee-structures': 'Fee Structures',
    '/dashboard/finance/invoices': 'Invoices',
    '/dashboard/finance/payments': 'Payments',
    '/dashboard/finance/payroll': 'Payroll',
    '/dashboard/finance/expenses': 'Expenses',
    '/dashboard/finance/loans': 'Staff Loans',
    '/dashboard/finance/ledger': 'General Ledger',
    '/dashboard/finance': 'Finance',
    '/dashboard/bas/dashboard': 'Attendance Dashboard',
    '/dashboard/bas/attendance': 'My Attendance',
    '/dashboard/bas/staff': 'Biometric Enrollment',
    '/dashboard/bas/kiosks': 'Kiosks',
    '/dashboard/bas/reports': 'Attendance Reports',
    '/dashboard/bas/holidays': 'Holidays',
    '/dashboard/transport': 'Transport',
    '/dashboard/hostels': 'Hostels',
    '/dashboard/results': 'Results Management',
    '/dashboard/exam-questions': 'Exam Questions',
    '/dashboard/profile': 'My Profile',
    '/dashboard/settings': 'Settings',
};

export function DashboardHeader() {
  const { user, role, logout } = useRole();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  const formatSegment = (s: string) => {
    // If it looks like a CUID (25 chars), UUID (36 chars), or MongoID (24 chars), replace with "Details"
    if ((s.length >= 24 && s.length <= 36 && !s.includes('-') && !s.includes(' ')) || 
        (s.length === 36 && s.split('-').length === 5)) {
        return 'Details';
    }
    return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ');
  };

  const getPageTitle = () => {
    if (PAGE_TITLES[pathname]) {
        return PAGE_TITLES[pathname];
    }
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length > 2) {
        const base = segments.slice(0, 2).join('/');
        const pageKey = `/${base}`;
        if (PAGE_TITLES[pageKey]) {
            return PAGE_TITLES[pageKey];
        }
    }
    const title = segments[segments.length - 1] || 'Dashboard';
    return formatSegment(title);
  };

  const userInitials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : role?.substring(0, 2).toUpperCase() || '..';

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-2 sm:gap-4 border-b border-border bg-background/80 backdrop-blur-md px-3 sm:px-4 md:px-8">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden shrink-0 h-9 w-9"
        onClick={() => setOpenMobile(true)}
        aria-label="Open Navigation Menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <div className="flex flex-col min-w-0 flex-1 md:flex-initial">
        <h1 className="font-headline text-sm sm:text-base md:text-xl font-bold tracking-tight text-foreground truncate">
          {getPageTitle()}
        </h1>
        {/* Simple breadcrumb */}
        <span className="hidden md:block text-xs text-muted-foreground font-medium truncate">
          {pathname.split('/').filter(Boolean).map(formatSegment).join(' / ')}
        </span>
      </div>

      {/* Global Search Bar - Desktop */}
      <div className="ml-auto hidden md:flex items-center relative max-w-md w-full mx-4">
        <GlobalSearch />
      </div>

      <div className="ml-auto md:ml-0 flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Mobile Search Button */}
        <div className="md:hidden">
          <GlobalSearch compact />
        </div>

        <NotificationBell />


        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 rounded-full pl-2 pr-3 py-1 bg-background hover:bg-accent border border-border h-9 transition-colors"
            >
              <Avatar className="h-6 w-6 border border-border">
                <AvatarImage src={user?.personalInfo?.profilePicture || undefined} alt={user?.name || role || ''} />
                <AvatarFallback className="text-[10px] font-bold bg-primary text-primary-foreground">{userInitials}</AvatarFallback>
              </Avatar>
              <span className="hidden lg:inline text-sm font-medium text-foreground">{user?.name || role}</span>
              <ChevronDown className="hidden h-3 w-3 lg:inline text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-lg border-border bg-popover text-popover-foreground">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name || role}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email || 'admin@proximahub.com'}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
             <Link href="/dashboard/profile" passHref>
                <DropdownMenuItem className="cursor-pointer">
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Account Settings</span>
                </DropdownMenuItem>
             </Link>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="cursor-pointer text-rose-500 focus:bg-rose-50 focus:text-rose-600 dark:focus:bg-rose-950/50">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
