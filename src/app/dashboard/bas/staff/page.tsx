'use client';

import { useState, useEffect } from 'react';
import { getEnrolledStaff } from '@/actions/bas-actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Search, Fingerprint, Lock, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
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

export default function EnrolledStaffPage() {
    const [staff, setStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchStaff = async () => {
            const res = await getEnrolledStaff();
            if (res.success && res.data) {
                setStaff(res.data);
            }
            setLoading(false);
        };
        fetchStaff();
    }, []);

    const filteredStaff = staff.filter(s => 
        s.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.staffId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-950 pb-12 -mt-6 -mx-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-8 py-5 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-20 shadow-sm gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-purple-600/20 border border-purple-500/30 rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.15)]">
                        <Users className="text-purple-400 w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-tight">Enrolled Staff</h1>
                        <p className="text-xs text-slate-400 font-medium">View staff members who are registered in the biometric system.</p>
                    </div>
                </div>
            </div>

            <div className="px-8 py-8 max-w-[1200px] mx-auto space-y-8">
                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    <motion.div variants={itemVariants}>
                        <Card className="bg-slate-900/50 border-slate-800 shadow-xl overflow-hidden">
                            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800/50 bg-slate-900/40 pb-5 gap-4">
                                <div>
                                    <CardTitle className="text-lg font-bold text-white">Biometric Roster</CardTitle>
                                    <CardDescription className="text-slate-400 mt-1">Staff with active fingerprint or PIN enrollments.</CardDescription>
                                </div>
                                <div className="relative w-full md:w-72">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <Input
                                        placeholder="Search staff by name or ID..."
                                        className="pl-9 bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-600 focus-visible:ring-purple-500 h-9"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {loading ? (
                                    <div className="flex h-64 items-center justify-center">
                                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-r-transparent"></div>
                                    </div>
                                ) : filteredStaff.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500">
                                        <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4">
                                           <Fingerprint className="h-8 w-8 text-slate-600" />
                                        </div>
                                        <p className="font-medium text-slate-400">No enrolled staff found.</p>
                                        <p className="text-xs mt-1 text-slate-500">Set a kiosk to "Enrollment" mode to begin registering staff.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader className="bg-slate-900/80 border-b border-slate-800">
                                                <TableRow className="hover:bg-transparent border-none">
                                                    <TableHead className="pl-6 text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Name</TableHead>
                                                    <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Staff ID</TableHead>
                                                    <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Department</TableHead>
                                                    <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Auth Methods</TableHead>
                                                    <TableHead className="pr-6 text-slate-400 font-bold uppercase tracking-wider text-[10px] h-10">Role</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredStaff.map((s) => (
                                                    <TableRow key={s.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                                                        <TableCell className="pl-6 py-4">
                                                            <div className="font-medium text-white">{s.firstName} {s.lastName}</div>
                                                            <div className="text-[10px] font-medium text-slate-500 mt-0.5">{s.email}</div>
                                                        </TableCell>
                                                        <TableCell className="font-mono text-slate-400 text-xs">{s.staffId || 'N/A'}</TableCell>
                                                        <TableCell className="text-slate-300 font-medium">{s.department?.name || 'N/A'}</TableCell>
                                                        <TableCell>
                                                            <div className="flex gap-2">
                                                                <Badge variant="outline" className="bg-blue-950/40 text-blue-400 border-blue-800/50 gap-1.5 px-2 py-0.5 font-medium text-[10px] uppercase tracking-wider">
                                                                    <Fingerprint className="w-3 h-3" /> Fingerprint
                                                                </Badge>
                                                                {s.kioskPin && (
                                                                    <Badge variant="outline" className="bg-purple-950/40 text-purple-400 border-purple-800/50 gap-1.5 px-2 py-0.5 font-medium text-[10px] uppercase tracking-wider">
                                                                        <Lock className="w-3 h-3" /> PIN Code
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="pr-6">
                                                            <Badge variant="outline" className="bg-slate-800/50 text-slate-300 border-slate-700 font-normal">
                                                                {s.role}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
}
