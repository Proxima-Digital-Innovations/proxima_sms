'use client';

import * as React from "react"
import { useRouter } from "next/navigation"
import { Search, Settings, User, LayoutDashboard } from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"

import { allNavLinks, iconMap } from "@/lib/auth-guard"
import { useLanguage } from "@/context/language-context"

const ARABIC_LABELS: Record<string, string> = {
  'Dashboard': 'لوحة التحكم العامة',
  'Profile': 'الملف الشخصي',
  'Notifications': 'الإشعارات والتنبيهات',
  'Messaging': 'الرسائل والمحادثات',
  'Announcements': 'التعاميم والإعلانات',
  'Reports & Analytics': 'التقارير والإحصائيات',
  'System Config': 'إعدادات النظام',
  'School Info': 'بيانات المدرسة',
  'Grading': 'نظام الدرجات',
  'Academic Year': 'العام والفصول الدراسية',
  'AI Settings': 'إعدادات الذكاء الاصطناعي',
  'Roles': 'الأدوار والصلاحيات',
  'Classes & Subjects': 'الفصول والمواد',
  'Subscription': 'الاشتراك والترخيص',
  'Maintenance': 'الصيانة والنظام',
  'Manage Staff': 'إدارة الكادر التعليمي',
  'Manage Students': 'سجل ودليل الطلاب',
  'Departments': 'الأقسام الأكاديمية',
  'Database': 'قاعدة البيانات',
  'Logs & Security': 'سجلات الأمان',
  'Lesson Approvals': 'اعتماد خطط الدروس',
  'Lesson Plans': 'خطط الدروس',
  'Question Bank': 'بنك الأسئلة',
  'Bulk Upload': 'الرفع الجماعي للدرجات',
  'Enter Scores': 'رصد الدرجات',
  'Review Scores': 'تدقيق الدرجات',
  'Tahfeez Scores': 'حفظ القرآن الكريم',
  'Mid-Term Results': 'نتائج منتصف الفصل',
  'Behavioural Assessment': 'التقييم السلوكي',
  'My Students': 'قائمة طلابي',
  'Take Attendance': 'تسجيل الحضور',
  'Review Questions': 'مراجعة الأسئلة',
  'Generate Results': 'معالجة النتائج',
  'View Results': 'شهادات وبطاقات الدرجات',
  'Timetable': 'الجدول المدرسي',
  'Exam Registration': 'أرقام الجلوس',
  'Seating Plans': 'مخططات اللجان',
  'System Fee Structure': 'هيكل الرسوم',
  'Invoices': 'الرسوم والفواتير',
  'Payments': 'سندات وإيصالات القبض',
  'Expenses': 'المصروفات',
  'Payroll': 'مسير الرواتب',
  'Reconciliation': 'دفتر الأستاذ',
  'General Ledger': 'دفتر الأستاذ العام',
  'Chart of Accounts': 'شجرة الحسابات',
  'Financial Reports': 'التقارير المالية',
  'Results': 'النتائج والشهادات',
  'My Results': 'نتائجي الدراسية',
  'Biometrics (BAS)': 'حضور البصمة (BAS)',
};

export function GlobalSearch({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()
  const { language } = useLanguage()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])

  // Flat list of all links
  const links = Object.values(allNavLinks);

  const translateNav = (label: string) => {
    if (language === 'ar') {
      return ARABIC_LABELS[label] || label;
    }
    return label;
  };

  return (
    <>
      {compact ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center justify-center h-9 w-9 text-muted-foreground hover:text-foreground bg-muted hover:bg-accent border border-border rounded-full transition-colors cursor-pointer"
          title={language === 'ar' ? 'بحث في النظام (Ctrl + K)' : 'Search pages (Ctrl + K)'}
          aria-label="Search pages"
        >
          <Search className="w-4 h-4" />
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="w-full relative flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-muted hover:bg-muted/80 border border-border rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent group cursor-pointer"
        >
          <Search className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
          <span className="flex-1 text-start hidden sm:inline-flex text-xs">
            {language === 'ar' ? 'بحث سريع في الصفحات والقوائم...' : 'Search pages...'}
          </span>
          <span className="flex-1 text-start sm:hidden text-xs">
            {language === 'ar' ? 'بحث...' : 'Search...'}
          </span>
          <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex shrink-0">
            <span>Ctrl</span> <span>K</span>
          </kbd>
        </button>
      )}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder={language === 'ar' ? 'اكتب اسم صفحة أو أمر للانتقال السريع...' : 'Type a command or search pages...'} 
        />
        <CommandList>
          <CommandEmpty>
            {language === 'ar' ? 'لا توجد نتائج مطابقة لبحثك.' : 'No results found.'}
          </CommandEmpty>
          
          <CommandGroup heading={language === 'ar' ? 'التنقل السريع في النظام' : 'Navigation'}>
            {links.map((link, idx) => {
              const Icon = link.icon && iconMap[link.icon] ? iconMap[link.icon] : LayoutDashboard;
              return (
               <CommandItem key={idx} onSelect={() => runCommand(() => router.push(link.path))}>
                  <Icon className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0 text-muted-foreground shrink-0" />
                  <span>{translateNav(link.label)}</span>
               </CommandItem>
              );
            })}
          </CommandGroup>
          
          <CommandSeparator />
          
          <CommandGroup heading={language === 'ar' ? 'الحساب والملف' : 'Settings'}>
            <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/profile"))}>
              <User className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0 text-muted-foreground shrink-0" />
              <span>{language === 'ar' ? 'الملف الشخصي وإعدادات اللغة' : 'Profile & Language'}</span>
              <CommandShortcut>Ctrl+P</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/system/school-info"))}>
              <Settings className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0 text-muted-foreground shrink-0" />
              <span>{language === 'ar' ? 'إعدادات وهوية المدرسة' : 'School Settings'}</span>
              <CommandShortcut>Ctrl+S</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
