'use client';

import { useState, useEffect } from 'react';
import { getKiosks, activateKiosk, deactivateKiosk, deleteKiosk, updateKioskName, updateKioskMode } from '@/actions/kiosk-actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Server, Activity, Power, Settings2, Trash2, Clock, Edit3, Fingerprint, StopCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 }
  }
};

export default function KioskManagementPage() {
    const [kiosks, setKiosks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Dialog state
    const [renameDialog, setRenameDialog] = useState<{open: boolean, id: string, currentName: string}>({open: false, id: '', currentName: ''});
    const [newName, setNewName] = useState('');

    useEffect(() => {
        fetchKiosks();
    }, []);

    const fetchKiosks = async () => {
        setLoading(true);
        const res = await getKiosks();
        if (res.success && res.data) {
            setKiosks(res.data);
        }
        setLoading(false);
    };

    const handleRename = async () => {
        if (!newName) return;
        await updateKioskName(renameDialog.id, newName);
        setRenameDialog({open: false, id: '', currentName: ''});
        setNewName('');
        fetchKiosks();
    };

    const handleModeChange = async (id: string, mode: string) => {
        await updateKioskMode(id, mode);
        fetchKiosks();
    };

    const handleActivate = async (id: string, currentName: string) => {
        await activateKiosk(id, currentName);
        fetchKiosks();
    };

    const handleDeactivate = async (id: string) => {
        if(confirm("Are you sure you want to deactivate this terminal?")) {
            await deactivateKiosk(id);
            fetchKiosks();
        }
    };

    const handleDelete = async (id: string) => {
        if(confirm("Are you sure you want to completely delete this terminal? This action cannot be undone.")) {
            await deleteKiosk(id);
            fetchKiosks();
        }
    };

    const getStatusColor = (kiosk: any) => {
        if (kiosk.maintenanceMode) return "bg-orange-950/40 text-orange-400 border-orange-800/50";
        if (!kiosk.isActive) return "bg-slate-800/50 text-slate-400 border-slate-700";
        
        // Check if offline (no heartbeat in 5 minutes)
        const lastSeen = new Date(kiosk.lastSeenAt);
        const minutesAgo = (new Date().getTime() - lastSeen.getTime()) / 1000 / 60;
        
        if (minutesAgo > 5) return "bg-rose-950/40 text-rose-400 border-rose-800/50";
        return "bg-emerald-950/40 text-emerald-400 border-emerald-800/50";
    };

    const getStatusLabel = (kiosk: any) => {
        if (kiosk.maintenanceMode) return "Maintenance";
        if (!kiosk.isActive) return "Pending Activation";
        
        const lastSeen = new Date(kiosk.lastSeenAt);
        const minutesAgo = (new Date().getTime() - lastSeen.getTime()) / 1000 / 60;
        
        if (minutesAgo > 5) return "Offline";
        return "Active";
    };

    return (
        <div className="min-h-screen bg-slate-950 pb-12 -mt-6 -mx-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-8 py-5 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-20 shadow-sm gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-blue-600/20 border border-blue-500/30 rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                        <Server className="text-blue-400 w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-tight">Kiosk Management</h1>
                        <p className="text-xs text-slate-400 font-medium">Manage biometric attendance terminals across your institution.</p>
                    </div>
                </div>
            </div>

            <div className="px-8 py-8 max-w-[1400px] mx-auto space-y-8">
                {loading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-r-transparent"></div>
                    </div>
                ) : kiosks.length === 0 ? (
                    <motion.div variants={itemVariants} initial="hidden" animate="visible">
                        <Card className="flex flex-col items-center justify-center py-20 text-center bg-slate-900/50 border-slate-800">
                            <div className="rounded-full bg-slate-900 p-5 mb-4 border border-slate-800">
                                <Server className="h-8 w-8 text-slate-500" />
                            </div>
                            <h3 className="text-lg font-bold text-white">No Terminals Found</h3>
                            <p className="text-sm text-slate-400 mt-2 max-w-sm font-medium">
                                Connect a new biometric terminal to your local network to begin. It will automatically appear here pending activation.
                            </p>
                        </Card>
                    </motion.div>
                ) : (
                    <motion.div 
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {kiosks.map((kiosk) => (
                            <motion.div key={kiosk.id} variants={itemVariants}>
                                <Card className="relative overflow-hidden group bg-slate-900/50 border-slate-800 shadow-xl transition-all hover:bg-slate-900/80">
                                    <div className={`absolute top-0 left-0 w-1 h-full ${kiosk.isActive ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                                    <CardHeader className="pb-3 border-b border-slate-800/50 bg-slate-900/40">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="truncate">
                                                <CardTitle className="text-lg font-bold flex items-center gap-2 text-white truncate">
                                                    <Server className="h-5 w-5 text-slate-500 shrink-0" />
                                                    <span className="truncate">{kiosk.name}</span>
                                                </CardTitle>
                                                <CardDescription className="font-mono mt-1 text-[10px] text-slate-500 tracking-wider uppercase truncate">{kiosk.terminalId}</CardDescription>
                                            </div>
                                            <Badge variant="outline" className={`${getStatusColor(kiosk)} shrink-0 px-2 py-0.5 font-bold uppercase tracking-wider text-[9px]`}>
                                                {getStatusLabel(kiosk)}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-5">
                                        <div className="space-y-4 mb-6">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-slate-500 font-medium flex items-center">
                                                    <Clock className="w-4 h-4 mr-2" /> Last seen
                                                </span>
                                                <span className="text-slate-300 font-medium">
                                                    {formatDistanceToNow(new Date(kiosk.lastSeenAt), { addSuffix: true })}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-slate-500 font-medium flex items-center">
                                                    <Settings2 className="w-4 h-4 mr-2" /> Mode
                                                </span>
                                                <span className="uppercase text-slate-300 font-bold text-xs tracking-wider">
                                                    {kiosk.operatingMode}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            {!kiosk.isActive ? (
                                                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold" onClick={() => handleActivate(kiosk.id, kiosk.name)}>
                                                    <Power className="w-4 h-4 mr-2" />
                                                    Activate
                                                </Button>
                                            ) : (
                                                <Button variant="outline" className="w-full bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border-blue-500/30 hover:text-blue-300 font-bold transition-colors" asChild>
                                                    <Link href={`/dashboard/bas/kiosks/${kiosk.terminalId}/logs`}>
                                                        <Activity className="w-4 h-4 mr-2" />
                                                        View Logs
                                                    </Link>
                                                </Button>
                                            )}

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="outline" size="icon" className="bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white shrink-0">
                                                        <Settings2 className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 bg-slate-900 border-slate-800 text-slate-200">
                                                    <DropdownMenuLabel className="text-slate-400 text-xs font-bold uppercase tracking-wider">Terminal Options</DropdownMenuLabel>
                                                    <DropdownMenuSeparator className="bg-slate-800" />
                                                    
                                                    <DropdownMenuItem className="focus:bg-slate-800 focus:text-white cursor-pointer" onClick={() => {
                                                        setNewName(kiosk.name);
                                                        setRenameDialog({open: true, id: kiosk.id, currentName: kiosk.name});
                                                    }}>
                                                        <Edit3 className="w-4 h-4 mr-2 text-blue-400" /> Rename
                                                    </DropdownMenuItem>

                                                    {kiosk.isActive && (
                                                        <>
                                                            <DropdownMenuItem className="focus:bg-slate-800 focus:text-white cursor-pointer" onClick={() => handleModeChange(kiosk.id, 'auto')}>
                                                                <Activity className="w-4 h-4 mr-2 text-emerald-400" /> Set Auto Mode
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="focus:bg-slate-800 focus:text-white cursor-pointer" onClick={() => handleModeChange(kiosk.id, 'enrollment')}>
                                                                <Fingerprint className="w-4 h-4 mr-2 text-purple-400" /> Set Enroll Mode
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator className="bg-slate-800" />
                                                            <DropdownMenuItem className="text-orange-400 focus:bg-orange-500/10 focus:text-orange-400 cursor-pointer" onClick={() => handleDeactivate(kiosk.id)}>
                                                                <StopCircle className="w-4 h-4 mr-2" /> Deactivate
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}

                                                    <DropdownMenuItem className="text-rose-400 focus:bg-rose-500/10 focus:text-rose-400 cursor-pointer" onClick={() => handleDelete(kiosk.id)}>
                                                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>

            <Dialog open={renameDialog.open} onOpenChange={(open) => !open && setRenameDialog({open: false, id: '', currentName: ''})}>
                <DialogContent className="bg-slate-950 border-slate-800 text-white">
                    <DialogHeader>
                        <DialogTitle>Rename Terminal</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Assign a clear custom name to easily identify this kiosk terminal.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input 
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="e.g. Main Entrance Gate"
                            className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" className="bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800" onClick={() => setRenameDialog({open: false, id: '', currentName: ''})}>Cancel</Button>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleRename}>Save Name</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
