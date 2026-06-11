
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { 
    Home, Users, GraduationCap, FileText, DollarSign, Package, Settings, 
    ChevronDown, ChevronRight, Menu, LogOut, User, BookOpen, 
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
            { title: 'Classes & Subjects', href: '/dashboard/system/classes-subjects', icon: BookOpen },
            { title: 'Lesson Notes', href: '/dashboard/lesson-notes', icon: FileText },
        ]
    },
    {
        title: 'Finance',
        icon: DollarSign,
        children: [
            { title: 'Fee Structures', href: '/dashboard/finance/fee-structures', icon: FileText },
            { title: 'Invoices', href: '/dashboard/finance/invoices', icon: Receipt },
            { title: 'Payments', href: '/dashboard/finance/payments', icon: CreditCard },
        ]
    },
    {
        title: 'System',
        icon: Settings,
        children: [
            { title: 'Staff', href: '/dashboard/staff', icon: Users },
            { title: 'Departments', href: '/dashboard/system/departments', icon: Building2 },
            { title: 'Settings', href: '/dashboard/settings', icon: Settings },
        ]
    }
];

export default function Sidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const [expandedSections, setExpandedSections] = useState<string[]>(['Dashboard', 'Academic']);

    const toggleSection = (title: string) => {
        setExpandedSections(prev => 
            prev.includes(title) 
                ? prev.filter(t => t !== title)
                : [...prev, title]
        );
    };

    return (
        <>
            <aside 
                className={cn(
                    "fixed left-0 top-0 h-screen bg-sidebar-background border-r border-sidebar-border transition-all duration-300 z-40",
                    collapsed ? "w-20" : "w-64"
                )}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
                        {!collapsed && (
                            <span className="text-lg font-bold tracking-tight text-sidebar-foreground">
                                Proxima Hub
                            </span>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCollapsed(!collapsed)}
                            className="text-sidebar-foreground/60 hover:text-sidebar-foreground"
                        >
                            {collapsed ? <ChevronRight size={20} /> : <Menu size={20} />}
                        </Button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                        {navigation.map((item) => (
                            <div key={item.title}>
                                {item.children ? (
                                    <div>
                                        <button
                                            onClick={() => toggleSection(item.title)}
                                            className={cn(
                                                'w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                                                'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                                            )}
                                        >
                                            <item.icon className="h-4 w-4 shrink-0" />
                                            {!collapsed && (
                                                <>
                                                    <span className="flex-1 text-left text-sm font-medium">
                                                        {item.title}
                                                    </span>
                                                    {expandedSections.includes(item.title) ? (
                                                        <ChevronDown className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronRight className="h-4 w-4" />
                                                    )}
                                                </>
                                            )}
                                        </button>
                                        {!collapsed && expandedSections.includes(item.title) && (
                                            <div className="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-4">
                                                {item.children.map((child) => (
                                                    <Link
                                                        key={child.href}
                                                        href={child.href}
                                                        className={cn(
                                                            'flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-colors',
                                                            pathname === child.href
                                                                ? 'bg-sidebar-primary/10 text-sidebar-primary font-semibold'
                                                                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                                                        )}
                                                    >
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
                                            'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                                            pathname === item.href
                                                ? 'bg-sidebar-primary/10 text-sidebar-primary font-semibold'
                                                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                                        )}
                                    >
                                        <item.icon className="h-4 w-4 shrink-0" />
                                        {!collapsed && <span className="text-sm font-medium">{item.title}</span>}
                                    </Link>
                                )}
                            </div>
                        ))}
                    </nav>

                    {/* Footer / User */}
                    <div className="p-4 border-t border-sidebar-border">
                        <div className="flex items-center gap-3 px-2 py-2">
                            <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                                <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                            {!collapsed && (
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold truncate">Admin User</p>
                                    <button className="text-[10px] text-muted-foreground hover:text-primary transition-colors">
                                        Sign Out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}