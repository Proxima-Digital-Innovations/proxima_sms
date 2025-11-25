'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { 
    Home, Users, GraduationCap, FileText, DollarSign, Package, Settings, 
    ChevronDown, ChevronRight, Menu, X, LogOut, User, BookOpen, 
    ClipboardList, Calendar, MessageSquare, LayoutGrid, UserPlus,
    ArrowUpCircle, FileSpreadsheet, TrendingUp, TrendingDown, Receipt, CreditCard,
    Upload, Key,
    Box, Truck, ArrowRightLeft, ShoppingCart, Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navigation = [
    {
        title: 'Dashboard',
        icon: Home,
        href: '/dashboard',
    },
    {
        title: 'Academic',
        icon: GraduationCap,
        children: [
            { title: 'Students', href: '/dashboard/students', icon: Users },
            { title: 'Admissions', href: '/dashboard/students/admissions', icon: UserPlus },
            { title: 'Promote Students', href: '/dashboard/students/promote', icon: ArrowUpCircle },
            { title: 'Classes & Subjects', href: '/dashboard/system/classes-subjects', icon: BookOpen },
            { title: 'Lesson Notes', href: '/dashboard/lesson-notes', icon: FileText },
            { title: 'Exam Questions', href: '/dashboard/exam-questions', icon: FileText },
        ]
    },
    {
        title: 'Results',
        icon: ClipboardList,
        children: [
            { title: 'Enter Scores', href: '/dashboard/scores/enter', icon: FileText },
            { title: 'Midterm Entry', href: '/dashboard/midterm/enter', icon: FileText },
            { title: 'View Midterm', href: '/dashboard/midterm/view', icon: FileSpreadsheet },
            { title: 'Generate Results', href: '/dashboard/results/generate', icon: FileSpreadsheet },
            { title: 'Class Results', href: '/dashboard/results/class', icon: FileSpreadsheet },
            { title: 'Tahfeez Results', href: '/dashboard/results/tahfeez', icon: BookOpen },
            { title: 'Broadsheet', href: '/dashboard/results/broadsheet', icon: FileSpreadsheet },
            { title: 'Behavioural', href: '/dashboard/behavioural/enter', icon: ClipboardList },
            { title: 'Tahfeez Entry', href: '/dashboard/tahfeez/enter', icon: BookOpen },
            { title: 'Upload Scores', href: '/dashboard/upload/scores', icon: Upload },
            { title: 'Upload Midterm', href: '/dashboard/upload/midterm', icon: Upload },
            { title: 'Generate Tokens', href: '/dashboard/results/tokens', icon: Key },
        ]
    },
    {
        title: 'Finance',
        icon: DollarSign,
        children: [
            { title: 'Fee Structures', href: '/dashboard/finance/fee-structures', icon: FileText },
            { title: 'Invoices', href: '/dashboard/finance/invoices', icon: Receipt },
            { title: 'Payments', href: '/dashboard/finance/payments', icon: CreditCard },
            { title: 'Expenses', href: '/dashboard/finance/expenses', icon: TrendingDown },
        ]
    },
    {
        title: 'Inventory',
        icon: Package,
        children: [
            { title: 'Items', href: '/dashboard/inventory/items', icon: Box },
            { title: 'Suppliers', href: '/dashboard/inventory/suppliers', icon: Building2 },
            { title: 'Transactions', href: '/dashboard/inventory/transactions', icon: ArrowRightLeft },
            { title: 'Purchase Orders', href: '/dashboard/inventory/orders', icon: ShoppingCart },
        ]
    },
    {
        title: 'Communication',
        icon: MessageSquare,
        children: [
            { title: 'Messaging', href: '/dashboard/messaging', icon: MessageSquare },
            { title: 'Announcements', href: '/dashboard/announcements', icon: FileText },
            { title: 'Notifications', href: '/dashboard/notifications', icon: FileText },
        ]
    },
    {
        title: 'Reports & Analytics',
        icon: TrendingUp,
        children: [
            { title: 'Reports', href: '/dashboard/reports', icon: FileSpreadsheet },
            { title: 'Performance', href: '/dashboard/performance', icon: TrendingUp },
            { title: 'Staff Directory', href: '/dashboard/reports/staff-directory', icon: Users },
            { title: 'Student Demographics', href: '/dashboard/reports/student-demographics', icon: Users },
        ]
    },
    {
        title: 'System',
        icon: Settings,
        children: [
            { title: 'Staff', href: '/dashboard/staff', icon: Users },
            { title: 'Departments', href: '/dashboard/system/departments', icon: Building2 },
            { title: 'Academic Calendar', href: '/dashboard/system/academic-year', icon: Calendar },
            { title: 'School Info', href: '/dashboard/system/school-info', icon: Settings },
            { title: 'Grading System', href: '/dashboard/system/grading', icon: TrendingUp },
            { title: 'Fee Settings', href: '/dashboard/system/fees', icon: DollarSign },
            { title: 'User Roles', href: '/dashboard/system/roles', icon: Users },
            { title: 'Maintenance', href: '/dashboard/system/maintenance', icon: Settings },
            { title: 'AI Settings', href: '/dashboard/system/ai-settings', icon: Settings },
            { title: 'Seating Plan', href: '/dashboard/seating-plan', icon: LayoutGrid },
            { title: 'System Logs', href: '/dashboard/logs', icon: FileText },
        ]
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const [expandedSections, setExpandedSections] = useState<string[]>(['Academic', 'Results']);

    const toggleSection = (title: string) => {
        setExpandedSections(prev =>
            prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
        );
    };

    return (
        <>
            {/* Mobile Toggle */}
            <Button
                variant="ghost"
                size="icon"
                className="fixed top-4 left-4 z-50 lg:hidden"
                onClick={() => setCollapsed(!collapsed)}
            >
                {collapsed ? <X /> : <Menu />}
            </Button>

            {/* Sidebar */}
            <aside
                className={cn(
                    'fixed left-0 top-0 z-40 h-screen transition-all duration-300 ease-in-out',
                    'bg-[#003366]',
                    'border-r border-white/10',
                    collapsed ? 'w-20' : 'w-72',
                    'lg:translate-x-0',
                    collapsed ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'
                )}
            >
                <div className="flex h-full flex-col">
                    {/* Logo */}
                    <div className="flex h-20 items-center justify-between px-4 border-b border-white/10">
                        {!collapsed && (
                            <img 
                                src="/school-logo.png" 
                                alt="School Logo" 
                                className="h-16 w-auto object-contain"
                            />
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCollapsed(!collapsed)}
                            className="hidden lg:flex text-slate-400 hover:text-white"
                        >
                            {collapsed ? <ChevronRight /> : <Menu />}
                        </Button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                        {navigation.map((item) => (
                            <div key={item.title}>
                                {item.children ? (
                                    <div>
                                        <button
                                            onClick={() => toggleSection(item.title)}
                                            className={cn(
                                                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                                                'text-white/90 hover:text-white hover:bg-white/10',
                                                'group relative overflow-hidden'
                                            )}
                                        >
                                            <div className="absolute inset-0 bg-[#D4AF37]/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <item.icon className="h-5 w-5 shrink-0 relative z-10" />
                                            {!collapsed && (
                                                <>
                                                    <span className="flex-1 text-left text-sm font-medium relative z-10">
                                                        {item.title}
                                                    </span>
                                                    {expandedSections.includes(item.title) ? (
                                                        <ChevronDown className="h-4 w-4 relative z-10" />
                                                    ) : (
                                                        <ChevronRight className="h-4 w-4 relative z-10" />
                                                    )}
                                                </>
                                            )}
                                        </button>
                                        {!collapsed && expandedSections.includes(item.title) && (
                                            <div className="ml-4 mt-1 space-y-1 border-l-2 border-white/20 pl-4">
                                                {item.children.map((child) => (
                                                    <Link
                                                        key={child.href}
                                                        href={child.href}
                                                        className={cn(
                                                            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                                                            'relative overflow-hidden group',
                                                            pathname === child.href
                                                                ? 'bg-[#D4AF37]/20 text-white font-medium'
                                                                : 'text-white/80 hover:text-white hover:bg-white/10'
                                                        )}
                                                    >
                                                        {pathname === child.href && (
                                                            <div className="absolute left-0 top-0 h-full w-1 bg-[#D4AF37]" />
                                                        )}
                                                        {child.icon && <child.icon className="h-4 w-4 shrink-0" />}
                                                        <span>{child.title}</span>
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <Link
                                        href={item.href}
                                        className={cn(
                                            'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                                            'relative overflow-hidden group',
                                            pathname === item.href
                                                ? 'bg-[#D4AF37]/20 text-white font-medium'
                                                : 'text-white/90 hover:text-white hover:bg-white/10'
                                        )}
                                    >
                                        <div className="absolute inset-0 bg-[#D4AF37]/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        {pathname === item.href && (
                                            <div className="absolute left-0 top-0 h-full w-1 bg-[#D4AF37]" />
                                        )}
                                        <item.icon className="h-5 w-5 shrink-0 relative z-10" />
                                        {!collapsed && <span className="text-sm font-medium relative z-10">{item.title}</span>}
                                    </Link>
                                )}
                            </div>
                        ))}
                    </nav>

                    {/* User Profile */}
                    {!collapsed && (
                        <div className="border-t border-white/10 p-4">
                            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5">
                                <div className="h-10 w-10 rounded-full bg-[#D4AF37] flex items-center justify-center">
                                    <User className="h-5 w-5 text-[#003366]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">Admin User</p>
                                    <p className="text-xs text-white/60 truncate">admin@giia.com</p>
                                </div>
                                <Button variant="ghost" size="icon" className="text-white/80 hover:text-white">
                                    <LogOut className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* Overlay for mobile */}
            {!collapsed && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 lg:hidden"
                    onClick={() => setCollapsed(true)}
                />
            )}
        </>
    );
}