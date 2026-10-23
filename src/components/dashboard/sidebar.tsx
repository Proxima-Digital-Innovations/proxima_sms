'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useRole } from '@/context/role-context';
import { useLanguage } from '@/context/language-context';
import { Menu, ChevronDown, Rocket, X, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { getFilteredNavConfig, allNavLinks, iconMap } from '@/lib/auth-guard';
import { getSchoolInfo } from '@/actions/school-actions';
import { useSidebar } from '@/components/ui/sidebar';

export default function Sidebar() {
    const pathname = usePathname();
    const { user, role, rbacPermissions, activeModules } = useRole();
    const { isRtl } = useLanguage();
    const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
    const [schoolName, setSchoolName] = useState<string>('Proxima SMS');
    const [schoolLogo, setSchoolLogo] = useState<string | null>(null);

    const { openMobile, setOpenMobile, state, setOpen } = useSidebar();
    
    // Never render collapsed icon-only view inside the mobile slide-over drawer
    const collapsed = state === "collapsed" && !openMobile;

    // Auto-close mobile drawer when route changes
    useEffect(() => {
        setOpenMobile(false);
    }, [pathname, setOpenMobile]);

    useEffect(() => {
        async function fetchSchool() {
            const res = await getSchoolInfo();
            if (res.success && res.data) {
                if (res.data.name) setSchoolName(res.data.name);
                if (res.data.logoUrl) setSchoolLogo(res.data.logoUrl);
            }
        }
        fetchSchool();
    }, []);

    const baseNavConfig = getFilteredNavConfig(role as string, activeModules || [], (user as any)?.institutionTier);
    
    // Compute dynamic nav config from RBAC permissions
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

    const currentNavConfig = dynamicNavConfig;

    useEffect(() => {
        if (currentNavConfig.length > 0 && expandedGroups.length === 0) {
            setExpandedGroups(currentNavConfig.map(g => g.group));
        }
    }, [currentNavConfig, expandedGroups.length]);

    const toggleGroup = (group: string) => {
        setExpandedGroups(prev => 
            prev.includes(group) 
                ? prev.filter(g => g !== group)
                : [...prev, group]
        );
    };

    return (
        <>
            {/* Mobile Backdrop */}
            {openMobile && (
                <div 
                    className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden" 
                    onClick={() => setOpenMobile(false)} 
                />
            )}
            <aside 
                className={cn(
                    "fixed top-0 z-50 h-[100dvh] transition-transform duration-300 ease-in-out flex flex-col",
                    "bg-[#0F172A] text-slate-200 shadow-2xl border-slate-800/90",
                    isRtl ? "right-0 border-l" : "left-0 border-r",
                    collapsed ? "lg:w-[80px] w-[270px] max-w-[85vw]" : "w-[270px] max-w-[85vw]",
                    openMobile
                        ? "translate-x-0"
                        : isRtl
                            ? "translate-x-full"
                            : "-translate-x-full",
                    "lg:translate-x-0"
                )}
            >
                {/* Corporate Institutional Branding Header */}
                <div className={cn("flex items-center h-16 px-4 border-b border-slate-800/90 bg-slate-950/40 shrink-0", collapsed ? "justify-center" : "justify-between")}>
                    <Link 
                        href="/dashboard" 
                        onClick={() => setOpenMobile(false)}
                        className="flex items-center gap-3 overflow-hidden"
                    >
                        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-900 border border-slate-700/80 p-0.5 shrink-0 overflow-hidden shadow-inner">
                            {schoolLogo ? (
                                <Image
                                    src={schoolLogo}
                                    alt={schoolName}
                                    width={36}
                                    height={36}
                                    className="w-full h-full object-contain"
                                    unoptimized
                                />
                            ) : (
                                <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-indigo-500 to-blue-600 rounded-md text-white shadow-sm">
                                    <Rocket className="w-4 h-4" />
                                </div>
                            )}
                        </div>
                        {!collapsed && (
                            <div className="flex flex-col min-w-0">
                                <span className="text-sm font-bold tracking-tight text-white line-clamp-1">{schoolName}</span>
                                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Enterprise ERP</span>
                            </div>
                        )}
                    </Link>
                    {/* Desktop collapse button */}
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="shrink-0 hidden lg:flex h-8 w-8 text-slate-400 hover:bg-slate-800 hover:text-white"
                        onClick={() => setOpen(collapsed)}
                    >
                        <Menu className="w-4 h-4" />
                    </Button>
                    {/* Mobile close drawer button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 lg:hidden h-9 w-9 text-slate-400 hover:bg-slate-800 hover:text-white"
                        onClick={() => setOpenMobile(false)}
                        aria-label="Close navigation"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Navigation Groups */}
                <div className="flex-1 overflow-y-auto py-4 px-3 space-y-4 no-scrollbar">
                    {currentNavConfig.map((group) => {
                        const isExpanded = expandedGroups.includes(group.group);
                        
                        return (
                            <div key={group.group} className="space-y-1">
                                {!collapsed && (
                                    <button
                                        onClick={() => toggleGroup(group.group)}
                                        className="w-full flex items-center justify-between px-2.5 py-1.5 group-btn rounded-md hover:bg-slate-800/50 transition-colors cursor-pointer"
                                    >
                                        <span className="text-[10px] font-bold text-slate-400/90 uppercase tracking-[0.12em]">
                                            {group.group}
                                        </span>
                                        <ChevronDown className={cn(
                                            "w-3.5 h-3.5 text-slate-500 transition-transform duration-200",
                                            isExpanded ? "rotate-180" : ""
                                        )} />
                                    </button>
                                )}
                                
                                <AnimatePresence initial={false}>
                                    {(isExpanded || collapsed) && (
                                        <motion.div 
                                            initial={!collapsed ? { height: 0, opacity: 0 } : undefined}
                                            animate={!collapsed ? { height: "auto", opacity: 1 } : undefined}
                                            exit={!collapsed ? { height: 0, opacity: 0 } : undefined}
                                            className="space-y-0.5 overflow-hidden"
                                        >
                                            {group.links.map((linkKey) => {
                                                const link = allNavLinks[linkKey as string];
                                                if (!link) return null;
                                                const IconComponent = iconMap[link.icon];
                                                
                                                // Handle parent links with subLinks
                                                if (link.subLinks && link.subLinks.length > 0) {
                                                    const hasActiveChild = link.subLinks.some(child => pathname === child.path);
                                                    const isItemExpanded = expandedGroups.includes(link.label) || hasActiveChild;
                                                    
                                                    return (
                                                        <div key={linkKey} className="space-y-0.5">
                                                            <button
                                                                onClick={() => toggleGroup(link.label)}
                                                                className={cn(
                                                                    "w-full flex items-center gap-3 px-3 py-2 min-h-[40px] rounded-lg transition-all group cursor-pointer",
                                                                    hasActiveChild
                                                                        ? "bg-slate-800/90 text-white font-semibold"
                                                                        : "text-slate-300 hover:bg-slate-800/60 hover:text-white",
                                                                    collapsed && "justify-center px-2"
                                                                )}
                                                                title={collapsed ? link.label : undefined}
                                                            >
                                                                {IconComponent && (
                                                                    <IconComponent className={cn(
                                                                        "w-4 h-4 shrink-0 transition-colors",
                                                                        hasActiveChild ? "text-indigo-400" : "text-slate-400 group-hover:text-slate-200"
                                                                    )} />
                                                                )}
                                                                {!collapsed && (
                                                                    <>
                                                                        <span className="text-[13px] font-medium flex-1 text-left rtl:text-right truncate">{link.label}</span>
                                                                        <ChevronDown className={cn(
                                                                            "w-3.5 h-3.5 text-slate-400 transition-transform duration-200",
                                                                            isItemExpanded ? "rotate-180 text-slate-200" : ""
                                                                        )} />
                                                                    </>
                                                                )}
                                                            </button>
                                                            
                                                            <AnimatePresence>
                                                                {!collapsed && isItemExpanded && (
                                                                    <motion.div 
                                                                        initial={{ height: 0, opacity: 0 }}
                                                                        animate={{ height: "auto", opacity: 1 }}
                                                                        exit={{ height: 0, opacity: 0 }}
                                                                        className="ms-4 ps-3 border-s border-slate-800 space-y-0.5 my-1 overflow-hidden"
                                                                    >
                                                                        {link.subLinks.filter(subLink => !subLink.requiredModule || activeModules?.includes(subLink.requiredModule)).map(subLink => {
                                                                            const isChildActive = pathname === subLink.path;
                                                                            return (
                                                                                <Link 
                                                                                    key={subLink.path} 
                                                                                    href={subLink.path}
                                                                                    onClick={() => setOpenMobile(false)}
                                                                                    className={cn(
                                                                                        "flex items-center gap-2 px-2.5 py-1.5 min-h-[34px] rounded-md transition-all text-[12.5px]",
                                                                                        isChildActive 
                                                                                            ? "text-white font-semibold bg-indigo-600/20 border border-indigo-500/30" 
                                                                                            : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
                                                                                    )}
                                                                                >
                                                                                    <span className={cn(
                                                                                        "w-1.5 h-1.5 rounded-full shrink-0",
                                                                                        isChildActive ? "bg-indigo-400" : "bg-slate-600"
                                                                                    )} />
                                                                                    <span className="truncate">{subLink.label}</span>
                                                                                </Link>
                                                                            );
                                                                        })}
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    );
                                                }
     
                                                // Standard single link
                                                const isActiveExact = pathname === link.path;
                                                return (
                                                    <Link 
                                                        key={linkKey} 
                                                        href={link.path}
                                                        onClick={() => setOpenMobile(false)}
                                                        className={cn(
                                                            "flex items-center gap-3 px-3 py-2 min-h-[40px] rounded-lg transition-all group relative",
                                                            isActiveExact
                                                                ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold shadow-sm shadow-indigo-950/50"
                                                                : "text-slate-300 hover:bg-slate-800/60 hover:text-white",
                                                            collapsed && "justify-center px-2"
                                                        )}
                                                        title={collapsed ? link.label : undefined}
                                                    >
                                                        {IconComponent && (
                                                            <IconComponent className={cn(
                                                                "w-4 h-4 shrink-0 transition-colors",
                                                                isActiveExact ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                                                            )} />
                                                        )}
                                                        {!collapsed && <span className="text-[13px] font-medium truncate">{link.label}</span>}
                                                    </Link>
                                                );
                                            })}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
                
                {/* Corporate Footer in Sidebar */}
                <div className={cn("border-t border-slate-800/90 bg-slate-950/40 shrink-0", collapsed ? "p-2.5" : "px-4 py-3")}>
                    {collapsed ? (
                        <div className="flex items-center justify-center w-full" title="Powered by Proxima Digital">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        </div>
                    ) : (
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span className="flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span>Powered by <strong className="text-slate-200 font-semibold">Proxima</strong></span>
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">v2.5</span>
                        </div>
                    )}
                </div>

            </aside>
        </>
    );
}
