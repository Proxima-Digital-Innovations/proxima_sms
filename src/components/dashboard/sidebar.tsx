'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useRole } from '@/context/role-context';
import { useLanguage } from '@/context/language-context';
import { 
    Menu, 
    ChevronDown, 
    ChevronRight,
    Rocket, 
    X,
    LogOut,
    UserCircle,
    Globe,
    Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { getFilteredNavConfig, allNavLinks, iconMap } from '@/lib/auth-guard';
import { getSchoolInfo } from '@/actions/school-actions';
import { useSidebar } from '@/components/ui/sidebar';

// Navigation translation key mapper
const ARABIC_NAV_DICT: Record<string, string> = {
    // Navigation Groups
    'Main': 'الرئيسية',
    'Management': 'الإدارة والتشغيل',
    'Finance': 'المالية والحسابات',
    'Academics': 'الشؤون الأكاديمية',
    'Infrastructure': 'النظام والبنية التحتية',
    'Communication': 'التواصل والمراسلات',
    'Oversight': 'الإشراف والمتابعة',
    'Department': 'إدارة القسم',
    'Examinations': 'الامتحانات والتقييم',
    'My Work': 'مهامي اليومية',
    'My Child': 'سجل أبنائي',
    'Additional Access': 'صلاحيات مخصصة',

    // Main Navigation Links & Sublinks
    'Dashboard': 'لوحة التحكم العامة',
    'Profile': 'الملف الشخصي',
    'Notifications': 'الإشعارات والتنبيهات',
    'Messaging': 'الرسائل والمحادثات',
    'Announcements': 'التعاميم والإعلانات',
    'Reports & Analytics': 'التقارير والإحصائيات',
    'System Config': 'إعدادات النظام',
    'School Info': 'بيانات وهوية المدرسة',
    'Grading': 'نظام الدرجات والتقييم',
    'Academic Year': 'العام والفصول الدراسية',
    'AI Settings': 'إعدادات الذكاء الاصطناعي',
    'Roles': 'الأدوار والصلاحيات',
    'Classes & Subjects': 'الفصول والمواد الدراسية',
    'Subscription': 'الاشتراك وسعة الطلاب',
    'Maintenance': 'الصيانة والنسخ الاحتياطي',
    'Manage Staff': 'سجل وإدارة الكادر',
    'Manage Students': 'سجل ودليل الطلاب',
    'Departments': 'الأقسام الأكاديمية',
    'Database': 'المحرك وقاعدة البيانات',
    'Logs & Security': 'سجلات الأمان والتدقيق',
    'Lesson Approvals': 'اعتماد خطط الدروس',
    'Dept. Analytics': 'إحصائيات القسم',
    'Academic Oversight': 'الرقابة الأكاديمية',
    'Lesson Plans': 'خطط الدروس والتحضير',
    'Question Bank': 'بنك أسئلة الامتحانات',
    'Bulk Upload': 'الرفع الجماعي للدرجات',
    'Enter Scores': 'رصد درجات الاختبارات',
    'Review Scores': 'تدقيق ومراجعة الدرجات',
    'Tahfeez Scores': 'متابعة حفظ القرآن الكريم',
    'Mid-Term Results': 'نتائج منتصف الفصل (الميدتيرم)',
    'Behavioural Assessment': 'التقييم السلوكي والمواظبة',
    'My Students': 'قائمة طلابي',
    'Take Attendance': 'تسجيل الحضور اليومي',
    'Review Questions': 'مراجعة نماذج الأسئلة',
    'Generate Results': 'معالجة وترتيب النتائج',
    'View Results': 'شهادات وبطاقات الدرجات',
    'Timetable': 'الجدول المدرسي الحصص',
    'Exam Registration': 'أرقام جلوس الامتحانات',
    'Seating Plans': 'مخططات توزيع اللجان',
    'System Fee Structure': 'هيكل الرسوم الدراسية',
    'Invoices': 'الرسوم والفواتير المدرسية',
    'Payments': 'إيصالات وسندات القبض',
    'Expenses': 'المصروفات المدرسية',
    'Payroll': 'مسير رواتب الموظفين',
    'Reconciliation': 'دفتر الأستاذ والتسوية',
    'General Ledger': 'دفتر الأستاذ العام',
    'Chart of Accounts': 'شجرة ودليل الحسابات',
    'Financial Reports': 'القوائم والتقارير المالية',
    'Results': 'النتائج والشهادات',
    'My Results': 'نتائجي الدراسية',
    'Assignments': 'الواجبات المدرسية',
    'Quizzes': 'الاختبارات القصيرة',
    'Grading System': 'نظام احتساب التقديرات',
    'Biometrics (BAS)': 'نظام البصمة والحضور (BAS)',
    'My Attendance': 'سجل حضوري الشخصي',
    'Enrolled Staff': 'الموظفون المسجلون بالبصمة',
    'Shifts & Rules': 'ورديات ومواعيد الدوام',
    'Reports': 'تقارير الحضور والانصراف',
    'Kiosks': 'أجهزة البصمة الذكية',
    'Holidays': 'العطل المدرسية الرسمية',
};

const ROLE_DISPLAY_NAMES: Record<string, { en: string; ar: string }> = {
    'SUPER_ADMIN': { en: 'Super Admin', ar: 'المشرف العام' },
    'ADMIN': { en: 'Administrator', ar: 'مدير النظام' },
    'TEACHER': { en: 'Teacher', ar: 'معلم' },
    'PARENT': { en: 'Parent', ar: 'ولي أمر' },
    'STUDENT': { en: 'Student', ar: 'طالب' },
    'ACCOUNTANT': { en: 'Accountant', ar: 'المحاسب المالي' },
    'EXAM_OFFICER': { en: 'Exam Officer', ar: 'مسؤول الامتحانات' },
    'HOD': { en: 'Head of Department', ar: 'رئيس القسم' },
    'SLT': { en: 'School Leadership', ar: 'إدارة المدرسة' },
    'STAFF': { en: 'Staff Member', ar: 'كادر وظيفي' },
};

export default function DashboardSidebar() {
    const pathname = usePathname();
    const { role, rbacPermissions, activeModules, user, logout } = useRole();
    const { t, language, isRtl, setLanguage } = useLanguage();
    const [openGroup, setOpenGroup] = useState<string | null>(null);
    const [schoolName, setSchoolName] = useState<string>('Proxima SMS');
    const [schoolLogo, setSchoolLogo] = useState<string | null>(null);
    const { openMobile, setOpenMobile, state, setOpen } = useSidebar();
    
    const collapsed = state === 'collapsed';

    // Auto-close mobile drawer on route change
    useEffect(() => {
        setOpenMobile(false);
    }, [pathname, setOpenMobile]);

    useEffect(() => {
        async function fetchSchool() {
            try {
                const res = await getSchoolInfo();
                if (res.success && res.data) {
                    if (res.data.name) setSchoolName(res.data.name);
                    if (res.data.logoUrl) setSchoolLogo(res.data.logoUrl);
                }
            } catch (e) {
                // Keep default
            }
        }
        fetchSchool();
    }, []);

    const baseNavConfig = getFilteredNavConfig(role as string, activeModules || []);
    
    // Add dynamic links based on granular RBAC
    const dynamicNavConfig = [...baseNavConfig];
    if (rbacPermissions && rbacPermissions.length > 0) {
        const additionalLinks: (keyof typeof allNavLinks)[] = [];
        if (rbacPermissions.some(p => p.startsWith('manage:roles'))) additionalLinks.push('roles');
        if (rbacPermissions.some(p => p.includes(':attendance') || p.includes(':kiosk'))) additionalLinks.push('bas');
        if (rbacPermissions.some(p => p.includes(':staff'))) additionalLinks.push('manageStaff');
        if (rbacPermissions.some(p => p.includes(':students'))) additionalLinks.push('manageStudents');
        if (rbacPermissions.some(p => p.includes(':academics'))) additionalLinks.push('classesAndSubjects', 'gradingSystem');
        
        if (additionalLinks.length > 0) {
            const existingLinks = new Set(baseNavConfig.flatMap(g => g.links));
            const newLinks = additionalLinks.filter(l => !existingLinks.has(l));
            if (newLinks.length > 0) {
                dynamicNavConfig.push({
                    group: 'Additional Access',
                    links: newLinks
                });
            }
        }
    }

    // Auto-expand group containing current route
    useEffect(() => {
        for (const g of dynamicNavConfig) {
            const match = g.links.some(linkKey => {
                const link = allNavLinks[linkKey as string];
                if (!link) return false;
                if (pathname === link.path) return true;
                if (link.subLinks?.some(sub => pathname === sub.path)) return true;
                return false;
            });
            if (match) {
                setOpenGroup(g.group);
                break;
            }
        }
    }, [pathname]);

    const toggleGroup = (groupName: string) => {
        setOpenGroup(prev => prev === groupName ? null : groupName);
    };

    const translateLabel = (text: string) => {
        if (language === 'ar') {
            return ARABIC_NAV_DICT[text] || text;
        }
        return text;
    };

    return (
        <>
            {/* Mobile Backdrop Overlay matching health_med */}
            <div 
                className={cn(
                    "fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300",
                    openMobile ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                onClick={() => setOpenMobile(false)}
                aria-hidden="true"
            />

            {/* Aside Drawer with health_med dark slate aesthetic */}
            <aside 
                className={cn(
                    "fixed top-0 z-50 h-screen flex flex-col font-sans transition-all duration-300 ease-in-out shadow-2xl lg:shadow-none",
                    "bg-slate-950 text-white",
                    isRtl 
                        ? "right-0 border-l border-slate-800/80" 
                        : "left-0 border-r border-slate-800/80",
                    collapsed ? "w-[80px]" : "w-[270px]",
                    openMobile 
                        ? "translate-x-0" 
                        : (isRtl ? "translate-x-full lg:translate-x-0" : "-translate-x-full lg:translate-x-0")
                )}
            >
                {/* Brand Header matching health_med h-[72px] */}
                <div className={cn(
                    "h-[72px] px-5 border-b border-slate-800/60 flex items-center justify-between bg-slate-900/40 flex-shrink-0",
                    collapsed && "justify-center px-2"
                )}>
                    <Link 
                        href="/dashboard" 
                        onClick={() => setOpenMobile(false)}
                        className="flex items-center gap-3 overflow-hidden"
                    >
                        <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 rounded-lg bg-slate-900 border border-slate-800/80 p-1">
                            {schoolLogo ? (
                                <Image
                                    src={schoolLogo}
                                    alt={schoolName}
                                    width={36}
                                    height={36}
                                    className="w-full h-full object-contain rounded-md"
                                    unoptimized
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    <Rocket className="w-5 h-5 text-emerald-400" />
                                </div>
                            )}
                        </div>
                        {!collapsed && (
                            <div className="flex flex-col overflow-hidden">
                                <h2 className="text-sm font-bold text-slate-100 truncate w-36 tracking-tight">
                                    {schoolName}
                                </h2>
                                <p className="text-[9px] font-bold tracking-[0.2em] text-emerald-500/80 uppercase">
                                    {language === 'ar' ? 'نظام بروكسيما' : 'Proxima SMS'}
                                </p>
                            </div>
                        )}
                    </Link>

                    {/* Desktop Collapse Toggle */}
                    <button 
                        type="button"
                        onClick={() => setOpen(collapsed)}
                        className="hidden lg:flex p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 rounded-lg transition-colors focus:outline-none"
                        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        <Menu className="w-4 h-4" />
                    </button>

                    {/* Mobile Close Button */}
                    <button
                        type="button"
                        onClick={() => setOpenMobile(false)}
                        className="lg:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors focus:outline-none"
                        aria-label="Close navigation"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation Menu List with Custom Slim Scrollbar */}
                <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto custom-scrollbar">
                    {dynamicNavConfig.map((group) => {
                        const isGroupActive = openGroup === group.group;
                        const translatedGroupTitle = translateLabel(group.group);

                        return (
                            <div key={group.group} className="space-y-1">
                                {!collapsed && (
                                    <div className="text-[10px] font-bold tracking-widest text-slate-500 px-2 py-1 uppercase flex items-center justify-between">
                                        <span>{translatedGroupTitle}</span>
                                        {group.group === 'Academics' && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                        )}
                                    </div>
                                )}

                                <div className="space-y-1">
                                    {group.links.map((linkKey) => {
                                        const link = allNavLinks[linkKey as string];
                                        if (!link) return null;
                                        const IconComponent = iconMap[link.icon] || Rocket;
                                        const translatedLinkLabel = translateLabel(link.label);

                                        // Sublinks (e.g. BAS / Attendance)
                                        if (link.subLinks && link.subLinks.length > 0) {
                                            const hasActiveChild = link.subLinks.some(sub => pathname === sub.path);
                                            const isSubMenuOpen = openGroup === link.label || hasActiveChild;

                                            return (
                                                <div key={linkKey} className="space-y-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleGroup(link.label)}
                                                        className={cn(
                                                            "group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 w-full",
                                                            hasActiveChild 
                                                                ? "bg-emerald-500/10 text-emerald-400 shadow-sm border border-emerald-500/20" 
                                                                : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100",
                                                            collapsed && "justify-center px-2"
                                                        )}
                                                        title={collapsed ? translatedLinkLabel : undefined}
                                                    >
                                                        <span className="flex items-center gap-3 min-w-0">
                                                            <IconComponent className={cn(
                                                                "h-5 w-5 shrink-0 transition-colors",
                                                                hasActiveChild ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-200"
                                                            )} />
                                                            {!collapsed && (
                                                                <span className="truncate">{translatedLinkLabel}</span>
                                                            )}
                                                        </span>
                                                        {!collapsed && (
                                                            <ChevronDown className={cn(
                                                                "h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200",
                                                                isSubMenuOpen && "rotate-180 text-emerald-400"
                                                            )} />
                                                        )}
                                                    </button>

                                                    <AnimatePresence>
                                                        {!collapsed && isSubMenuOpen && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: "auto", opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                className={cn(
                                                                    "space-y-1 overflow-hidden",
                                                                    isRtl ? "mr-4 pr-2 border-r border-slate-800" : "ml-4 pl-2 border-l border-slate-800"
                                                                )}
                                                            >
                                                                {link.subLinks.map(sub => {
                                                                    const isChildActive = pathname === sub.path;
                                                                    return (
                                                                        <Link
                                                                            key={sub.path}
                                                                            href={sub.path}
                                                                            onClick={() => setOpenMobile(false)}
                                                                            className={cn(
                                                                                "group flex items-center px-3 py-2 text-xs font-medium transition-all duration-200 w-full rounded-md",
                                                                                isChildActive
                                                                                    ? "text-emerald-400 bg-slate-900 font-semibold"
                                                                                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-900/40"
                                                                            )}
                                                                        >
                                                                            <span className="truncate">{translateLabel(sub.label)}</span>
                                                                        </Link>
                                                                    );
                                                                })}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            );
                                        }

                                        // Standard Link
                                        const isExactActive = pathname === link.path;
                                        return (
                                            <Link
                                                key={linkKey}
                                                href={link.path}
                                                onClick={() => setOpenMobile(false)}
                                                className={cn(
                                                    "group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 w-full",
                                                    isExactActive
                                                        ? "bg-emerald-500/10 text-emerald-400 shadow-sm border border-emerald-500/20 font-semibold"
                                                        : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100",
                                                    collapsed && "justify-center px-2"
                                                )}
                                                title={collapsed ? translatedLinkLabel : undefined}
                                            >
                                                <span className="flex items-center gap-3 min-w-0">
                                                    <IconComponent className={cn(
                                                        "h-5 w-5 shrink-0 transition-colors",
                                                        isExactActive ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-200"
                                                    )} />
                                                    {!collapsed && (
                                                        <span className="truncate">{translatedLinkLabel}</span>
                                                    )}
                                                </span>
                                                {!collapsed && isExactActive && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </nav>

                {/* User & Language Footer Card matching health_med sleek footer */}
                <div className={cn(
                    "p-3 border-t border-slate-800/80 bg-slate-900/50 shrink-0",
                    collapsed && "p-2"
                )}>
                    {collapsed ? (
                        <div className="flex flex-col items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
                                className="w-8 h-8 rounded-lg bg-slate-800/80 flex items-center justify-center text-xs font-bold text-emerald-400 hover:bg-slate-800"
                                title={language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
                            >
                                {language === 'en' ? 'ع' : 'EN'}
                            </button>
                            <button
                                type="button"
                                onClick={logout}
                                className="w-8 h-8 rounded-lg text-rose-400 hover:bg-rose-500/10 flex items-center justify-center"
                                title="Sign Out"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {/* User Profile Mini Bar */}
                            <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                                <div className="flex items-center gap-2.5 overflow-hidden">
                                    <div className="relative w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0">
                                        {user?.name ? user.name.slice(0, 2).toUpperCase() : 'PR'}
                                        <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <p className="text-xs font-semibold text-slate-200 truncate">
                                            {user?.name || (language === 'ar' ? 'مدير النظام' : 'Administrator')}
                                        </p>
                                        <span className="text-[10px] font-mono text-emerald-400/90 truncate">
                                            {ROLE_DISPLAY_NAMES[role as string]?.[language] || role || 'STAFF'}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={logout}
                                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
                                    title={t('signOut')}
                                >
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Language Switcher Pill */}
                            <button
                                type="button"
                                onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
                                className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-emerald-400 bg-slate-950/40 hover:bg-emerald-500/10 border border-slate-800/60 hover:border-emerald-500/30 transition-all"
                            >
                                <span className="flex items-center gap-2">
                                    <Globe className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>{language === 'en' ? 'العربية (Arabic)' : 'English'}</span>
                                </span>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400">
                                    {language.toUpperCase()}
                                </span>
                            </button>
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
}
