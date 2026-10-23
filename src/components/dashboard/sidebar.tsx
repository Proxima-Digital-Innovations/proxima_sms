'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useRole } from '@/context/role-context';
import { Menu, ChevronDown, Rocket, Lock, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { getFilteredNavConfig, allNavLinks, iconMap } from '@/lib/auth-guard';
import { getSchoolInfo } from '@/actions/school-actions';
import { useSidebar } from '@/components/ui/sidebar';

export default function Sidebar() {
    const pathname = usePathname();
    const { role, rbacPermissions, activeModules } = useRole();
    const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
    const [schoolName, setSchoolName] = useState<string>('Proxima SMS');
    const [schoolLogo, setSchoolLogo] = useState<string | null>(null);
    const [pendingPath, setPendingPath] = useState<string | null>(null);

    // Reset pending path on route completion
    useEffect(() => {
        setPendingPath(null);
    }, [pathname]);
    const { openMobile, setOpenMobile, state, setOpen } = useSidebar();
    
    const collapsed = state === "collapsed";

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

    const baseNavConfig = getFilteredNavConfig(role as string, activeModules || []);
    
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
            // Deduplicate links already in baseNavConfig
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
        // Expand all groups by default
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
                    className="fixed inset-0 z-30 bg-black/50 lg:hidden" 
                    onClick={() => setOpenMobile(false)} 
                />
            )}
            <aside 
                className={cn(
                    "fixed left-0 top-0 z-40 h-screen transition-transform duration-300 ease-in-out flex flex-col",
                    "bg-muted text-foreground shadow-xl border-r border-border",
                    collapsed ? "w-[80px]" : "w-72",
                    openMobile ? "translate-x-0" : "-translate-x-full",
                    "lg:translate-x-0"
                )}
            >
                {/* Proxima SMS Branding */}
            <div className={cn("flex items-center h-16 px-4 border-b border-border shrink-0", collapsed ? "justify-center" : "justify-between")}>
                <Link 
                    href="/dashboard" 
                    onClick={() => setOpenMobile(false)}
                    className="flex items-center gap-3 overflow-hidden"
                >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-card border border-border/80 p-0.5 shrink-0 overflow-hidden">
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
                        <div className="flex flex-col">
                            <span className="text-sm font-bold tracking-tight text-foreground line-clamp-1">{schoolName}</span>
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Education Portal</span>
                        </div>
                    )}
                </Link>
                {/* Desktop collapse button */}
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="shrink-0 hidden lg:flex hover:bg-primary/10 hover:text-primary"
                    onClick={() => setOpen(collapsed)}
                >
                    <Menu className="w-4 h-4" />
                </Button>
                {/* Mobile close drawer button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 lg:hidden hover:bg-muted text-muted-foreground hover:text-foreground"
                    onClick={() => setOpenMobile(false)}
                    aria-label="Close navigation"
                >
                    <X className="w-5 h-5" />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-3 no-scrollbar">
                {currentNavConfig.map((group) => {
                    const isExpanded = expandedGroups.includes(group.group);
                    
                    return (
                        <div key={group.group} className="mb-2">
                            {!collapsed && (
                                <button
                                    onClick={() => toggleGroup(group.group)}
                                    className="w-full flex items-center justify-between px-2 py-1.5 mb-1 group-btn rounded-md hover:bg-accent/50 transition-colors"
                                >
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        {group.group}
                                    </span>
                                    <ChevronDown className={cn(
                                        "w-4 h-4 text-muted-foreground transition-transform duration-200",
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
                                        className="space-y-1 overflow-hidden"
                                    >
                                        {group.links.map((linkKey) => {
                                             const link = allNavLinks[linkKey as string];
                                             if (!link) return null;
                                             const IconComponent = iconMap[link.icon];
                                             
                                             // Handle sublinks
                                             if (link.subLinks && link.subLinks.length > 0) {
                                                 const hasActiveChild = link.subLinks.some(child => pathname === child.path);
                                                 const isItemExpanded = expandedGroups.includes(link.label) || hasActiveChild;
                                                 
                                                 return (
                                                     <div key={linkKey} className="space-y-1">
                                                         <button
                                                             onClick={() => toggleGroup(link.label)}
                                                             className={cn(
                                                                 "w-full flex items-center gap-3 p-2 rounded-lg transition-colors group mb-1",
                                                                 hasActiveChild ? "bg-accent text-accent-foreground font-semibold" : "text-foreground hover:bg-accent hover:text-accent-foreground",
                                                                 collapsed && "justify-center"
                                                             )}
                                                             title={collapsed ? link.label : undefined}
                                                         >
                                                             {IconComponent && <IconComponent className={cn("w-5 h-5 shrink-0", hasActiveChild ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />}
                                                             {!collapsed && (
                                                                 <>
                                                                     <span className="text-sm font-medium flex-1 text-left">{link.label}</span>
                                                                     <ChevronDown className={cn(
                                                                         "w-4 h-4 transition-transform duration-200",
                                                                         isItemExpanded ? "rotate-180" : ""
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
                                                                     className="ml-6 space-y-1 overflow-hidden"
                                                                 >
                                                                     {link.subLinks.filter(subLink => !subLink.requiredModule || activeModules?.includes(subLink.requiredModule)).map(subLink => {
                                                                         const isChildActive = pathname === subLink.path;
                                                                         return (
                                                                             <Link 
                                                                                 key={subLink.path} 
                                                                                 href={subLink.path}
                                                                                 onClick={() => setOpenMobile(false)}
                                                                                 className={cn(
                                                                                     "flex items-center p-2 rounded-md transition-all text-sm",
                                                                                     isChildActive 
                                                                                         ? "text-primary font-semibold bg-primary/10" 
                                                                                         : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                                                                 )}
                                                                             >
                                                                                 {subLink.label}
                                                                             </Link>
                                                                         );
                                                                     })}
                                                                 </motion.div>
                                                             )}
                                                         </AnimatePresence>
                                                     </div>
                                                 );
                                             }
 
                                             // Normal link
                                             const isActiveExact = pathname === link.path;
                                             return (
                                                     <Link 
                                                     key={linkKey} 
                                                     href={link.path}
                                                     onClick={() => setOpenMobile(false)}
                                                     className={cn(
                                                         "flex items-center gap-3 p-2 rounded-lg transition-colors group mb-1",
                                                         isActiveExact ? "bg-primary text-primary-foreground font-semibold shadow-sm" : "text-foreground hover:bg-accent hover:text-accent-foreground",
                                                         collapsed && "justify-center"
                                                     )}
                                                     title={collapsed ? link.label : undefined}
                                                 >
                                                     {IconComponent && <IconComponent className={cn("w-5 h-5 shrink-0", isActiveExact ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary")} />}
                                                     {!collapsed && <span className="text-sm font-medium">{link.label}</span>}
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
                    <div className="flex items-center justify-center w-full">
                        <span className="text-[10px] font-bold text-muted-foreground">PD</span>
                    </div>
                ) : (
                    <p className="text-xs text-muted-foreground text-center">
                        Powered by <span className="font-semibold text-foreground">Proxima Digital</span>
                    </p>
                )}
            </div>

        </aside>
        </>
    );
}
