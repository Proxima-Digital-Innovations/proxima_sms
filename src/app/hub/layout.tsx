import { Inter } from 'next/font/google';
import Link from 'next/link';
import { Shield, Building2, Users, Activity, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
    title: 'Proxima SMS | Super Admin',
    description: 'Central management console for Proxima SMS',
};

export default function HubLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className={`min-h-screen bg-background flex ${inter.className}`}>
            {/* Super Admin Sidebar */}
            <aside className="w-64 bg-background text-foreground flex flex-col border-r border-border">
                <div className="h-16 flex items-center px-6 border-b border-border bg-background">
                    <Shield className="h-6 w-6 text-primary mr-2" />
                    <span className="font-bold text-lg tracking-tight text-foreground">Proxima SMS</span>
                </div>
                
                <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
                    <Link href="/hub" className="flex items-center px-3 py-2.5 rounded-md text-sm font-medium hover:bg-muted hover:text-foreground transition-colors">
                        <Activity className="h-5 w-5 mr-3 text-muted-foreground" />
                        Dashboard
                    </Link>
                    <Link href="/hub/schools" className="flex items-center px-3 py-2.5 rounded-md text-sm font-medium hover:bg-muted hover:text-foreground transition-colors">
                        <Building2 className="h-5 w-5 mr-3 text-muted-foreground" />
                        Schools & Tenants
                    </Link>
                    <Link href="/hub/users" className="flex items-center px-3 py-2.5 rounded-md text-sm font-medium hover:bg-muted hover:text-foreground transition-colors">
                        <Users className="h-5 w-5 mr-3 text-muted-foreground" />
                        Global Users
                    </Link>
                    <Link href="/hub/settings" className="flex items-center px-3 py-2.5 rounded-md text-sm font-medium hover:bg-muted hover:text-foreground transition-colors">
                        <Settings className="h-5 w-5 mr-3 text-muted-foreground" />
                        System Settings
                    </Link>
                </nav>

                <div className="p-4 border-t border-border">
                    <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted" asChild>
                        <Link href="/">
                            <LogOut className="h-4 w-4 mr-2" />
                            Exit to Home
                        </Link>
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="h-16 flex items-center justify-between px-8 bg-card border-b border-border">
                    <div className="flex items-center text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">System Status:</span>
                        <span className="ml-2 flex items-center text-emerald-600 dark:text-emerald-400">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 mr-1.5"></span>
                            All Systems Operational
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-foreground">Super Administrator</span>
                        <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold">
                            SA
                        </div>
                    </div>
                </header>
                <div className="flex-1 overflow-auto p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
