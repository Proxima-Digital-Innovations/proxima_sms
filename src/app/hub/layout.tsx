import { Inter } from 'next/font/google';
import Link from 'next/link';
import { Shield, Building2, Users, Activity, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
    title: 'Proxima Hub | Super Admin',
    description: 'Central management console for Proxima ERP',
};

export default function HubLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className={`min-h-screen bg-slate-50 flex ${inter.className}`}>
            {/* Super Admin Sidebar */}
            <aside className="w-64 bg-slate-950 text-slate-300 flex flex-col border-r border-slate-800">
                <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950">
                    <Shield className="h-6 w-6 text-blue-500 mr-2" />
                    <span className="font-bold text-lg tracking-tight text-white">Proxima Hub</span>
                </div>
                
                <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
                    <Link href="/hub" className="flex items-center px-3 py-2.5 rounded-md text-sm font-medium hover:bg-slate-800 hover:text-white transition-colors">
                        <Activity className="h-5 w-5 mr-3 text-slate-400" />
                        Dashboard
                    </Link>
                    <Link href="/hub/schools" className="flex items-center px-3 py-2.5 rounded-md text-sm font-medium hover:bg-slate-800 hover:text-white transition-colors">
                        <Building2 className="h-5 w-5 mr-3 text-slate-400" />
                        Schools & Tenants
                    </Link>
                    <Link href="/hub/users" className="flex items-center px-3 py-2.5 rounded-md text-sm font-medium hover:bg-slate-800 hover:text-white transition-colors">
                        <Users className="h-5 w-5 mr-3 text-slate-400" />
                        Global Users
                    </Link>
                    <Link href="/hub/settings" className="flex items-center px-3 py-2.5 rounded-md text-sm font-medium hover:bg-slate-800 hover:text-white transition-colors">
                        <Settings className="h-5 w-5 mr-3 text-slate-400" />
                        System Settings
                    </Link>
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <Button variant="ghost" className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800" asChild>
                        <Link href="/">
                            <LogOut className="h-4 w-4 mr-2" />
                            Exit to Home
                        </Link>
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="h-16 flex items-center justify-between px-8 bg-white border-b border-slate-200">
                    <div className="flex items-center text-sm text-slate-500">
                        <span className="font-medium text-slate-900">System Status:</span>
                        <span className="ml-2 flex items-center text-emerald-600">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 mr-1.5"></span>
                            All Systems Operational
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium">Super Administrator</span>
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
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
