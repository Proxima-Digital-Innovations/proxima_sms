

'use client';
import { Bell, ChevronDown, User as UserIcon, LogOut, Moon, Sun } from 'lucide-react';
import {
  SidebarTrigger,
} from '@/components/ui/sidebar';
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
import Link from 'next/link';
import { NotificationBell } from './notifications/notification-bell';

const PAGE_TITLES: { [key: string]: string } = {
    '/dashboard': 'Dashboard',
    '/dashboard/users': 'Manage Staff',
    '/dashboard/students': 'Manage Students',
    '/dashboard/departments': 'Manage Departments',
    '/dashboard/system': 'System Configuration',
    '/dashboard/db': 'Database Management',
    '/dashboard/logs': 'Logs & Security',
    '/dashboard/reports': 'Reports & Analytics',
    '/dashboard/lesson-notes': 'Lesson Plans',
    '/dashboard/exam-questions': 'Question Bank',
    '/dashboard/scores': 'Enter Scores',
    '/dashboard/performance': 'Student Performance',
    '/dashboard/accountant/fees': 'Fee Structures',
    '/dashboard/accountant/invoices': 'Invoices',
    '/dashboard/accountant/payments': 'Payments',
    '/dashboard/accountant/expenses': 'Expenses & Budgeting',
    '/dashboard/accountant/payroll': 'Payroll',
    '/dashboard/accountant/reconciliation': 'Bank Reconciliation',
    '/dashboard/accountant/reports': 'Financial Reports',
    '/dashboard/exam-officer': 'Exam Officer Dashboard',
    '/dashboard/timetable': 'Exam Timetable',
    '/dashboard/exam-registration': 'Exam Registration',
    '/dashboard/seating-plan': 'Seating Plan Generator',
    '/dashboard/system/roles': 'Roles & Permissions',
    '/dashboard/system/school-info': 'School Information',
    '/dashboard/system/grading': 'Grading System',
    '/dashboard/system/academic-year': 'Academic Year',
    '/dashboard/system/fees': 'System Fee Structure',
    '/dashboard/system/classes-subjects': 'Classes & Subjects',
    '/profile': 'My Profile',
    '/dashboard/notifications': 'Notifications',
    '/dashboard/settings': 'Settings',
};

export function DashboardHeader() {
  const { user, role, logout } = useRole();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();

  const getPageTitle = () => {
    if (PAGE_TITLES[pathname]) {
        return PAGE_TITLES[pathname];
    }
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length > 2) {
        // For dynamic routes like /dashboard/users/[id]
        const base = segments.slice(0, 2).join('/');
        const pageKey = `/${base}`;
        if (PAGE_TITLES[pageKey]) {
            return PAGE_TITLES[pageKey].replace('Manage', 'View');
        }
    }
    const title = segments[segments.length - 1]?.replace(/-/g, ' ') || 'Dashboard';
    return title.charAt(0).toUpperCase() + title.slice(1);
  };

  const userInitials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : role?.substring(0, 2).toUpperCase() || '..';

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      <SidebarTrigger />
      <h1 className="hidden font-headline text-xl font-semibold md:block">{getPageTitle()}</h1>
      <div className="ml-auto flex items-center gap-2">
        <NotificationBell />
         <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 rounded-full px-2 py-1"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.personalInfo?.profilePicture || undefined} alt={user?.name || role || ''} data-ai-hint="person portrait" />
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
              <span className="hidden md:inline">{user?.name || role}</span>
              <ChevronDown className="hidden h-4 w-4 md:inline" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
             <Link href="/profile" passHref>
                <DropdownMenuItem>
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                </DropdownMenuItem>
             </Link>
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
