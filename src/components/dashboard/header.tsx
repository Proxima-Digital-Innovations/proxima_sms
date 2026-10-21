'use client';

import { Bell, ChevronDown, User as UserIcon, LogOut, Moon, Sun, Search, Menu, Globe, Check } from 'lucide-react';
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
import { useLanguage } from '@/context/language-context';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/context/theme-context';
import { useSidebar } from '@/components/ui/sidebar';
import Link from 'next/link';
import { NotificationBell } from './notifications/notification-bell';
import { GlobalSearch } from './global-search';

const PAGE_TITLE_KEYS: { [key: string]: string } = {
    '/dashboard': 'dashboard',
    '/dashboard/students': 'studentDirectory',
    '/dashboard/students/admissions': 'studentAdmissions',
    '/dashboard/students/promote': 'studentPromotions',
    '/dashboard/scores': 'reviewScores',
    '/dashboard/scores/enter': 'enterScores',
    '/dashboard/scores/gradebook': 'gradebook',
    '/dashboard/midterm': 'midtermResults',
    '/dashboard/midterm/enter': 'midtermResults',
    '/dashboard/tahfeez': 'tahfeezTracker',
    '/dashboard/results/view': 'viewResults',
    '/dashboard/results/generate': 'generateResults',
    '/dashboard/results/broadsheet': 'resultsBroadsheet',
    '/dashboard/lesson-notes': 'lessonPlans',
    '/dashboard/exam-questions': 'examQuestions',
    '/dashboard/finance': 'finance',
    '/dashboard/finance/invoices': 'invoices',
    '/dashboard/finance/payments': 'payments',
    '/dashboard/finance/fee-structures': 'feeStructures',
    '/dashboard/finance/payroll': 'payroll',
    '/dashboard/finance/ledger': 'generalLedger',
    '/dashboard/finance/chart-of-accounts': 'chartOfAccounts',
    '/dashboard/finance/reports': 'financialReports',
    '/dashboard/bas/dashboard': 'attendance',
    '/dashboard/bas/attendance': 'dailyAttendance',
    '/dashboard/bas/kiosks': 'kiosks',
    '/dashboard/system': 'administration',
    '/dashboard/system/classes-subjects': 'classesAndSubjects',
    '/dashboard/system/academic-year': 'academicYear',
    '/dashboard/system/roles': 'rolesPermissions',
    '/dashboard/system/school-info': 'schoolInfo',
    '/dashboard/system/license': 'licenseCapacity',
    '/dashboard/profile': 'profile',
};

export function DashboardHeader() {
  const { user, role, logout } = useRole();
  const { language, setLanguage, t, isRtl } = useLanguage();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  const formatSegment = (s: string) => {
    if ((s.length >= 24 && s.length <= 36 && !s.includes('-') && !s.includes(' ')) || 
        (s.length === 36 && s.split('-').length === 5)) {
        return language === 'ar' ? 'التفاصيل' : 'Details';
    }
    return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ');
  };

  const getPageTitle = () => {
    const key = PAGE_TITLE_KEYS[pathname];
    if (key) {
        return t(key as any);
    }
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length > 2) {
        const base = segments.slice(0, 2).join('/');
        const pageKey = `/${base}`;
        if (PAGE_TITLE_KEYS[pageKey]) {
            return t(PAGE_TITLE_KEYS[pageKey] as any);
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
      {/* Mobile Sidebar Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden shrink-0 h-9 w-9 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
        onClick={() => setOpenMobile(true)}
        aria-label="Open Navigation Menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Page Title & Breadcrumbs */}
      <div className="flex flex-col min-w-0 flex-1 md:flex-initial">
        <h1 className="font-headline text-sm sm:text-base md:text-xl font-bold tracking-tight text-foreground truncate">
          {getPageTitle()}
        </h1>
        <span className="hidden md:block text-xs text-muted-foreground font-medium truncate">
          {pathname.split('/').filter(Boolean).map(formatSegment).join(isRtl ? ' \\ ' : ' / ')}
        </span>
      </div>

      {/* Global Search Bar - Desktop */}
      <div className="ml-auto hidden md:flex items-center relative max-w-md w-full mx-4">
        <GlobalSearch />
      </div>

      {/* Header Actions: Language Switcher, Term Badge, Notifications, User Menu */}
      <div className="ml-auto md:ml-0 flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Mobile Search Button */}
        <div className="md:hidden">
          <GlobalSearch compact />
        </div>

        {/* Quick Language Toggle Pill (health_med inspired) */}
        <button
          type="button"
          onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all cursor-pointer"
          title={language === 'en' ? 'التحويل إلى العربية (Switch to Arabic)' : 'Switch to English'}
        >
          <Globe className="w-3.5 h-3.5 text-emerald-500" />
          <span>{language === 'en' ? 'العربية' : 'EN'}</span>
        </button>

        <NotificationBell />

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 rounded-full pl-2 pr-3 py-1 bg-background hover:bg-accent border border-border h-9 transition-colors"
            >
              <Avatar className="h-6 w-6 border border-border">
                <AvatarImage src={user?.personalInfo?.profilePicture || undefined} alt={user?.name || role || ''} />
                <AvatarFallback className="text-[10px] font-bold bg-emerald-600 text-white">{userInitials}</AvatarFallback>
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
                <UserIcon className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                <span>{t('accountSettings')}</span>
              </DropdownMenuItem>
            </Link>

            {/* Language Selector Inside Dropdown */}
            <DropdownMenuSeparator />
            <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground">
              {t('languagePreference')}
            </div>
            <DropdownMenuItem 
              onClick={() => setLanguage('en')} 
              className="cursor-pointer flex items-center justify-between"
            >
              <span>English</span>
              {language === 'en' && <Check className="w-3.5 h-3.5 text-emerald-500" />}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setLanguage('ar')} 
              className="cursor-pointer flex items-center justify-between font-arabic"
            >
              <span>العربية (Arabic)</span>
              {language === 'ar' && <Check className="w-3.5 h-3.5 text-emerald-500" />}
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="cursor-pointer text-rose-500 focus:bg-rose-50 focus:text-rose-600 dark:focus:bg-rose-950/50">
              <LogOut className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
              <span>{t('signOut')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
