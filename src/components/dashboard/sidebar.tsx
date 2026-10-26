'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useRole } from '@/context/role-context';
import { useLanguage } from '@/context/language-context';
import { Menu, ChevronDown, Rocket, X, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { getFilteredNavConfig, allNavLinks, iconMap } from '@/lib/auth-guard';
import { getSchoolInfo } from '@/actions/school-actions';
import { useSidebar } from '@/components/ui/sidebar';
import { useNavigationLoader } from '@/context/navigation-loader-context';

export default function Sidebar() {
    const pathname = usePathname();
    const { user, role, rbacPermissions, activeModules } = useRole();
    const { isRtl } = useLanguage();
    const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
    const [expandedSubItems, setExpandedSubItems] = useState<string[]>([]);
    const [schoolName, setSchoolName] = useState<string>('Proxima SMS');
    const [schoolLogo, setSchoolLogo] = useState<string | null>(null);
    const [pendingPath, setPendingPath] = useState<string | null>(null);

    const { openMobile, setOpenMobile, state, setOpen } = useSidebar();
    const { startNavigation, isNavigating, navigatingPath } = useNavigationLoader();
    
    // Never render collapsed icon-only view inside the mobile slide-over drawer
    const collapsed = state === "collapsed" && !openMobile;

    // Auto-close mobile drawer when route changes
    useEffect(() => {
        setOpenMobile(false);
        setPendingPath(null);
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

    const userEmail = ((user as any)?.email || '').toLowerCase();
    const effectiveInstitutionTier =
        userEmail === 'student@proximahub.com' || userEmail.endsWith('@tims.edu.ng')
            ? 'TERTIARY'
            : userEmail === 'student1@school.edu'
              ? 'SECONDARY'
              : (user as any)?.institutionTier;

    const baseNavConfig = getFilteredNavConfig(role as string, activeModules || [], effectiveInstitutionTier);
    
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

    const toggleGroup = (group: string) => {
        setCollapsedGroups(prev => 
            prev.includes(group) 
                ? prev.filter(g => g !== group)
                : [...prev, group]
        );
    };

    const toggleSubItem = (label: string) => {
        setExpandedSubItems(prev =>
            prev.includes(label)
                ? prev.filter(l => l !== label)
                : [...prev, label]
        );
    };

    return (
        <>
            {/* Mobile Backdrop */}
            {openMobile && (
                <div 
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden" 
                    onClick={() => setOpenMobile(false)} 
                />
            )}
            <aside 
                className={cn(
                    "fixed top-0 z-50 h-[100dvh] transition-transform duration-300 ease-in-out flex flex-col",
                    "bg-card text-card-foreground shadow-xl border-border",
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
                {/* Proxima SMS Branding Header */}
                <div className={cn("flex items-center h-16 px-4 border-b border-border shrink-0", collapsed ? "justify-center" : "justify-between")}>
                    <Link 
                        href="/dashboard" 
                        onClick={() => setOpenMobile(false)}
                        className="flex items-center gap-3 overflow-hidden"
                    >
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-card border border-border/80 p-0.5 shrink-0 overflow-hidden shadow-xs">
                            {schoolLogo ? (
                                <Image
                                    src={schoolLogo}
                                    alt={schoolName}
                                    width={32}
                                    height={32}
                                    className="w-full h-full object-contain"
                                    unoptimized
                                />
                            ) : (
                                <div className="flex items-center justify-center w-full h-full bg-primary rounded-md text-primary-foreground">
                                    <Rocket className="w-4 h-4" />
                                </div>
                            )}
                        </div>
                        {!collapsed && (
                            <div className="flex flex-col min-w-0">
                                <span className="text-sm font-bold tracking-tight text-foreground truncate">{schoolName}</span>
                                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Education Portal</span>
                            </div>
                        )}
                    </Link>
                    {/* Desktop collapse button */}
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="shrink-0 hidden lg:flex h-8 w-8 text-muted-foreground hover:bg-accent hover:text-foreground"
                        onClick={() => setOpen(collapsed)}
                    >
                        <Menu className="w-4 h-4" />
                    </Button>
                    {/* Mobile close drawer button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 lg:hidden h-9 w-9 text-muted-foreground hover:bg-accent hover:text-foreground"
                        onClick={() => setOpenMobile(false)}
                        aria-label="Close navigation"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Navigation Groups */}
                <div className="flex-1 overflow-y-auto py-4 px-3 space-y-4 no-scrollbar">
                    {currentNavConfig.map((group) => {
                        const isExpanded = !collapsedGroups.includes(group.group);
                        
                        return (
                            <div key={group.group} className="space-y-1">
                                {!collapsed && (
                                    <button
                                        onClick={() => toggleGroup(group.group)}
                                        className="w-full flex items-center justify-between px-2.5 py-1.5 group-btn rounded-md hover:bg-accent/60 transition-colors cursor-pointer"
                                    >
                                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                            {group.group}
                                        </span>
                                        <ChevronDown className={cn(
                                            "w-3.5 h-3.5 text-muted-foreground transition-transform duration-200",
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
                                                    const isItemExpanded = expandedSubItems.includes(link.label) || hasActiveChild;
                                                    
                                                    return (
                                                        <div key={linkKey} className="space-y-0.5">
                                                            <button
                                                                onClick={() => toggleSubItem(link.label)}
                                                                className={cn(
                                                                    "w-full flex items-center gap-3 p-2.5 min-h-[42px] rounded-lg transition-colors group cursor-pointer",
                                                                    hasActiveChild
                                                                        ? "bg-accent text-accent-foreground font-semibold"
                                                                        : "text-foreground hover:bg-accent hover:text-accent-foreground",
                                                                    collapsed && "justify-center"
                                                                )}
                                                                title={collapsed ? link.label : undefined}
                                                            >
                                                                {IconComponent && (
                                                                    <IconComponent className={cn(
                                                                        "w-5 h-5 shrink-0 transition-colors",
                                                                        hasActiveChild ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                                                                    )} />
                                                                )}
                                                                {!collapsed && (
                                                                    <>
                                                                        <span className="text-sm font-medium flex-1 text-left rtl:text-right truncate">{link.label}</span>
                                                                        <ChevronDown className={cn(
                                                                            "w-4 h-4 text-muted-foreground transition-transform duration-200",
                                                                            isItemExpanded ? "rotate-180 text-foreground" : ""
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
                                                                        className="ms-4 ps-3 border-s border-border space-y-0.5 my-1 overflow-hidden"
                                                                    >
                                                                        {link.subLinks.filter(subLink => !subLink.requiredModule || activeModules?.includes(subLink.requiredModule)).map(subLink => {
                                                                            const isChildActive = pathname === subLink.path;
                                                                            const isChildPending = (pendingPath === subLink.path || (navigatingPath === subLink.path && isNavigating)) && !isChildActive;
                                                                            return (
                                                                                <Link 
                                                                                    key={subLink.path} 
                                                                                    href={subLink.path}
                                                                                    onClick={() => {
                                                                                        setOpenMobile(false);
                                                                                        if (pathname !== subLink.path) {
                                                                                            setPendingPath(subLink.path);
                                                                                            startNavigation(subLink.path, subLink.label);
                                                                                        }
                                                                                    }}
                                                                                    className={cn(
                                                                                        "flex items-center justify-between p-2 min-h-[38px] rounded-md transition-all text-sm",
                                                                                        isChildActive 
                                                                                            ? "text-primary font-semibold bg-primary/10" 
                                                                                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                                                                    )}
                                                                                >
                                                                                    <span className="truncate">{subLink.label}</span>
                                                                                    {isChildPending && (
                                                                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0 ms-2" />
                                                                                    )}
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
                                                const isLinkPending = (pendingPath === link.path || (navigatingPath === link.path && isNavigating)) && !isActiveExact;
                                                return (
                                                    <Link 
                                                        key={linkKey} 
                                                        href={link.path}
                                                        onClick={() => {
                                                            setOpenMobile(false);
                                                            if (pathname !== link.path) {
                                                                setPendingPath(link.path);
                                                                startNavigation(link.path, link.label);
                                                            }
                                                        }}
                                                        className={cn(
                                                            "flex items-center gap-3 p-2.5 min-h-[42px] rounded-lg transition-colors group mb-1",
                                                            isActiveExact
                                                                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                                                                : "text-foreground hover:bg-accent hover:text-accent-foreground",
                                                            collapsed && "justify-center"
                                                        )}
                                                        title={collapsed ? link.label : undefined}
                                                    >
                                                        {isLinkPending ? (
                                                            <Loader2 className="w-5 h-5 shrink-0 animate-spin text-primary" />
                                                        ) : IconComponent && (
                                                            <IconComponent className={cn(
                                                                "w-5 h-5 shrink-0 transition-colors",
                                                                isActiveExact ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                                                            )} />
                                                        )}
                                                        {!collapsed && <span className="text-sm font-medium truncate flex-1">{link.label}</span>}
                                                        {!collapsed && isLinkPending && (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0 ms-auto" />
                                                        )}
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
                
                {/* Powered By Footer in Sidebar */}
                <div className={cn("p-4 border-t border-border shrink-0", collapsed ? "p-2" : "p-4")}>
                    {collapsed ? (
                        <div className="flex items-center justify-center w-full" title="Powered by Proxima Digital">
                            <ShieldCheck className="w-4 h-4 text-primary" />
                        </div>
                    ) : (
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                                <span>Powered by <strong className="font-semibold text-foreground">Proxima Digital</strong></span>
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">v2.5</span>
                        </div>
                    )}
                </div>

            </aside>
        </>
    );
}
